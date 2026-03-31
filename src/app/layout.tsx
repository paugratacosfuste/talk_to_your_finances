import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Talk to Your Finances',
  description: 'Your AI-powered personal finance assistant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
