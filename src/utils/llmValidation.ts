// ============================================================
// LLM Output Validation Utilities for P3 API Routes
// Provides JSON extraction, Zod-based validation, retry logic,
// and typed fallback responses for Claude API calls.
// ============================================================

import { z } from "zod";

// --------------- Types ---------------

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  error: string;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export interface ValidatedResponse<T> {
  data: T;
  source: "llm" | "retry" | "fallback";
  attempts: number;
}

// --------------- extractJSON ---------------

/**
 * Extracts the first JSON object from a raw LLM response string.
 * Handles markdown code fences, leading/trailing prose, and
 * correctly tracks string boundaries so braces inside JSON
 * string values do not break the extraction.
 */
export function extractJSON(raw: string): string {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Find the first '{' and match its closing '}'
  const startIdx = cleaned.indexOf("{");
  if (startIdx === -1) {
    throw new Error("No JSON object found in response");
  }

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIdx; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\") {
      if (inString) escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        return cleaned.slice(startIdx, i + 1);
      }
    }
  }

  throw new Error("Unmatched braces in JSON object");
}

// --------------- parseLLMResponse ---------------

/**
 * Parses a raw LLM response string against a Zod schema.
 * Returns a discriminated union: success with validated data,
 * or failure with a human-readable error message.
 */
export function parseLLMResponse<T>(
  raw: string,
  schema: z.ZodType<T>
): ValidationResult<T> {
  let jsonStr: string;
  try {
    jsonStr = extractJSON(raw);
  } catch (e) {
    return {
      success: false,
      error: `JSON extraction failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    return {
      success: false,
      error: `JSON parse failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((iss) => `${iss.path.join(".")}: ${iss.message}`)
      .join("; ");
    return {
      success: false,
      error: `Schema validation failed: ${issues}`,
    };
  }

  return { success: true, data: result.data };
}

// --------------- callClaudeWithValidation ---------------

/**
 * Calls Claude via the provided callFn, validates the response
 * against a Zod schema, retries once with a stricter prompt on
 * failure, and falls back to a typed default if both attempts fail.
 *
 * The callFn and retryCallFn closures allow each route to pass
 * callClaude() without this utility importing it directly.
 */
export async function callClaudeWithValidation<T>(opts: {
  callFn: () => Promise<string>;
  schema: z.ZodType<T>;
  fallback: T;
  retryCallFn: (errorDetail: string) => Promise<string>;
  maxRetries?: number;
}): Promise<ValidatedResponse<T>> {
  const { callFn, schema, fallback, retryCallFn, maxRetries = 1 } = opts;
  let attempts = 0;

  // First attempt
  attempts++;
  try {
    const raw = await callFn();
    const result = parseLLMResponse(raw, schema);
    if (result.success) {
      return { data: result.data, source: "llm", attempts };
    }

    // Retry loop
    let lastError = result.error;
    for (let retry = 0; retry < maxRetries; retry++) {
      attempts++;
      try {
        const retryRaw = await retryCallFn(lastError);
        const retryResult = parseLLMResponse(retryRaw, schema);
        if (retryResult.success) {
          return { data: retryResult.data, source: "retry", attempts };
        }
        lastError = retryResult.error;
      } catch {
        // Retry call itself failed, continue to fallback
      }
    }

    console.warn(
      `[llmValidation] Validation failed after ${attempts} attempts. Last error: ${lastError}. Using fallback.`
    );
    return { data: fallback, source: "fallback", attempts };
  } catch {
    // First call threw an exception (network error, etc.)
    for (let retry = 0; retry < maxRetries; retry++) {
      attempts++;
      try {
        const retryRaw = await retryCallFn("Initial call threw an exception");
        const retryResult = parseLLMResponse(retryRaw, schema);
        if (retryResult.success) {
          return { data: retryResult.data, source: "retry", attempts };
        }
      } catch {
        // Retry also failed, continue loop
      }
    }

    console.warn(
      `[llmValidation] All attempts failed (exception path). Using fallback.`
    );
    return { data: fallback, source: "fallback", attempts };
  }
}

// --------------- buildRetrySuffix ---------------

/**
 * Returns a prompt suffix to append to the system prompt when
 * retrying after a validation failure. Includes the specific
 * error so Claude can correct its output.
 */
export function buildRetrySuffix(errorDetail: string): string {
  return `\n\nCRITICAL: Your previous response was not valid JSON. The validation error was: ${errorDetail}. Return ONLY a raw JSON object. No markdown, no explanation, no code fences. Start with { and end with }.`;
}
