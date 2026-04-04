// ============================================================
// Tests for LLM Output Validation Utilities
// Run with: npx --yes tsx --test src/app/api/__tests__/llmValidation.test.ts
// ============================================================

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  extractJSON,
  parseLLMResponse,
  callClaudeWithValidation,
  buildRetrySuffix,
} from "../../../utils/llmValidation";

// --------------- extractJSON ---------------

describe("extractJSON", () => {
  it("extracts clean JSON object", () => {
    const raw = '{"analysis": "hello world"}';
    assert.equal(extractJSON(raw), '{"analysis": "hello world"}');
  });

  it("extracts JSON from markdown code fences", () => {
    const raw = '```json\n{"key": "value"}\n```';
    assert.equal(extractJSON(raw), '{"key": "value"}');
  });

  it("extracts JSON from fences without json label", () => {
    const raw = '```\n{"key": "value"}\n```';
    assert.equal(extractJSON(raw), '{"key": "value"}');
  });

  it("extracts JSON with leading prose", () => {
    const raw = 'Here is the response:\n{"key": "value"}';
    assert.equal(extractJSON(raw), '{"key": "value"}');
  });

  it("extracts JSON with trailing prose", () => {
    const raw = '{"key": "value"}\nHope this helps!';
    assert.equal(extractJSON(raw), '{"key": "value"}');
  });

  it("handles nested objects", () => {
    const raw = '{"outer": {"inner": "val"}, "arr": [1, 2]}';
    assert.equal(extractJSON(raw), raw);
  });

  it("handles braces inside string values", () => {
    const raw = '{"text": "a {b} c"}';
    assert.equal(extractJSON(raw), '{"text": "a {b} c"}');
  });

  it("handles escaped quotes inside strings", () => {
    const raw = '{"text": "he said \\"hello\\""}';
    assert.equal(extractJSON(raw), '{"text": "he said \\"hello\\""}');
  });

  it("throws on empty string", () => {
    assert.throws(() => extractJSON(""), /No JSON object found/);
  });

  it("throws on string with no JSON", () => {
    assert.throws(
      () => extractJSON("just some plain text"),
      /No JSON object found/
    );
  });

  it("throws on unmatched braces", () => {
    assert.throws(() => extractJSON("{unclosed"), /Unmatched braces/);
  });
});

// --------------- parseLLMResponse ---------------

describe("parseLLMResponse", () => {
  const testSchema = z.object({
    analysis: z.string().min(10).max(5000),
  });

  it("parses valid JSON matching schema", () => {
    const raw = '{"analysis": "This is a valid analysis text for testing."}';
    const result = parseLLMResponse(raw, testSchema);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(
        result.data.analysis,
        "This is a valid analysis text for testing."
      );
    }
  });

  it("fails on malformed JSON", () => {
    const raw = "{analysis: broken}";
    const result = parseLLMResponse(raw, testSchema);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.match(result.error, /JSON parse failed/);
    }
  });

  it("fails when required field is missing", () => {
    const raw = '{"other": "field"}';
    const result = parseLLMResponse(raw, testSchema);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.match(result.error, /Schema validation failed/);
    }
  });

  it("fails when string is too short", () => {
    const raw = '{"analysis": "short"}';
    const result = parseLLMResponse(raw, testSchema);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.match(result.error, /Schema validation failed/);
    }
  });

  it("fails when field has wrong type", () => {
    const raw = '{"analysis": 12345}';
    const result = parseLLMResponse(raw, testSchema);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.match(result.error, /Schema validation failed/);
    }
  });

  it("parses JSON wrapped in markdown fences", () => {
    const raw =
      '```json\n{"analysis": "This is wrapped in code fences for testing."}\n```';
    const result = parseLLMResponse(raw, testSchema);
    assert.equal(result.success, true);
  });
});

// --------------- Simulate schema tests ---------------

describe("simulate schema business rules", () => {
  const simulateSchema = z.object({
    analysis: z.string().min(50).max(5000),
  });

  it("accepts valid analysis", () => {
    const raw = JSON.stringify({
      analysis:
        "Based on the Monte Carlo simulation of 500 scenarios, your projected balance remains healthy across all percentiles.",
    });
    const result = parseLLMResponse(raw, simulateSchema);
    assert.equal(result.success, true);
  });

  it("rejects analysis shorter than 50 chars", () => {
    const raw = JSON.stringify({ analysis: "Too short." });
    const result = parseLLMResponse(raw, simulateSchema);
    assert.equal(result.success, false);
  });
});

// --------------- Roast schema tests ---------------

describe("roast schema business rules", () => {
  const roastSchema = z.object({
    roastText: z.string().min(20).max(5000),
    savingsPotential: z.number().int().nonnegative().max(1_000_000),
  });

  it("accepts valid roast response", () => {
    const raw = JSON.stringify({
      roastText:
        "Your dining budget looks like you have a personal subscription to every restaurant in town.",
      savingsPotential: 500,
    });
    const result = parseLLMResponse(raw, roastSchema);
    assert.equal(result.success, true);
  });

  it("rejects negative savingsPotential", () => {
    const raw = JSON.stringify({
      roastText:
        "Your dining budget looks like you have a personal subscription to every restaurant in town.",
      savingsPotential: -100,
    });
    const result = parseLLMResponse(raw, roastSchema);
    assert.equal(result.success, false);
  });

  it("rejects non-integer savingsPotential", () => {
    const raw = JSON.stringify({
      roastText:
        "Your dining budget looks like you have a personal subscription to every restaurant in town.",
      savingsPotential: 123.45,
    });
    const result = parseLLMResponse(raw, roastSchema);
    assert.equal(result.success, false);
  });

  it("rejects roastText shorter than 20 chars", () => {
    const raw = JSON.stringify({
      roastText: "Short roast.",
      savingsPotential: 100,
    });
    const result = parseLLMResponse(raw, roastSchema);
    assert.equal(result.success, false);
  });
});

// --------------- Diary schema tests ---------------

describe("diary schema business rules", () => {
  const diarySchema = z.object({
    narrative: z.string().min(100).max(8000),
    highlights: z.array(z.string().min(5).max(200)).min(1).max(6),
  });

  it("accepts valid diary response", () => {
    const raw = JSON.stringify({
      narrative:
        "I woke up at the start of October feeling optimistic. The balance was healthy, the salary had just come in, and for a brief moment, everything felt secure. But then the spending began in earnest.",
      highlights: [
        "Salary arrived on time",
        "Record restaurant spending",
        "Subscriptions renewed",
      ],
    });
    const result = parseLLMResponse(raw, diarySchema);
    assert.equal(result.success, true);
  });

  it("rejects empty highlights array", () => {
    const raw = JSON.stringify({
      narrative:
        "I woke up at the start of October feeling optimistic. The balance was healthy, the salary had just come in, and everything felt secure for now.",
      highlights: [],
    });
    const result = parseLLMResponse(raw, diarySchema);
    assert.equal(result.success, false);
  });

  it("rejects highlights with too-short entries", () => {
    const raw = JSON.stringify({
      narrative:
        "I woke up at the start of October feeling optimistic. The balance was healthy, the salary had just come in, and everything felt secure for now.",
      highlights: ["Hi"],
    });
    const result = parseLLMResponse(raw, diarySchema);
    assert.equal(result.success, false);
  });

  it("rejects narrative shorter than 100 chars", () => {
    const raw = JSON.stringify({
      narrative: "Too short narrative.",
      highlights: ["Valid highlight text"],
    });
    const result = parseLLMResponse(raw, diarySchema);
    assert.equal(result.success, false);
  });
});

// --------------- callClaudeWithValidation ---------------

describe("callClaudeWithValidation", () => {
  const schema = z.object({
    analysis: z.string().min(10),
  });
  const fallback = { analysis: "Fallback analysis text." };

  it("returns validated data on first successful call", async () => {
    const result = await callClaudeWithValidation({
      callFn: async () => '{"analysis": "A valid analysis response."}',
      schema,
      fallback,
      retryCallFn: async () => '{"analysis": "Retry response."}',
    });
    assert.equal(result.source, "llm");
    assert.equal(result.data.analysis, "A valid analysis response.");
    assert.equal(result.attempts, 1);
  });

  it("retries and succeeds on second attempt", async () => {
    let callCount = 0;
    const result = await callClaudeWithValidation({
      callFn: async () => {
        callCount++;
        return "not json at all";
      },
      schema,
      fallback,
      retryCallFn: async () => {
        callCount++;
        return '{"analysis": "Retry worked this time."}';
      },
    });
    assert.equal(result.source, "retry");
    assert.equal(result.data.analysis, "Retry worked this time.");
    assert.equal(result.attempts, 2);
  });

  it("falls back when both attempts fail", async () => {
    const result = await callClaudeWithValidation({
      callFn: async () => "garbage",
      schema,
      fallback,
      retryCallFn: async () => "more garbage",
    });
    assert.equal(result.source, "fallback");
    assert.deepEqual(result.data, fallback);
    assert.equal(result.attempts, 2);
  });

  it("falls back when first call throws an exception", async () => {
    const result = await callClaudeWithValidation({
      callFn: async () => {
        throw new Error("Network error");
      },
      schema,
      fallback,
      retryCallFn: async () => "still garbage",
    });
    assert.equal(result.source, "fallback");
    assert.deepEqual(result.data, fallback);
  });

  it("recovers via retry when first call throws", async () => {
    const result = await callClaudeWithValidation({
      callFn: async () => {
        throw new Error("Network error");
      },
      schema,
      fallback,
      retryCallFn: async () => '{"analysis": "Recovered from exception."}',
    });
    assert.equal(result.source, "retry");
    assert.equal(result.data.analysis, "Recovered from exception.");
  });
});

// --------------- buildRetrySuffix ---------------

describe("buildRetrySuffix", () => {
  it("includes the error detail in the suffix", () => {
    const suffix = buildRetrySuffix("missing field: analysis");
    assert.match(suffix, /missing field: analysis/);
    assert.match(suffix, /CRITICAL/);
    assert.match(suffix, /valid JSON/);
  });
});
