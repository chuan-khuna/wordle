import type { Metadata } from "next";
import Link from "next/link";
import "katex/dist/katex.min.css";
import { ThemePicker } from "@/components/ThemePicker";
import { themeScript } from "@/lib/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Solving Wordle", template: "%s | Solving Wordle" },
  description: "Articles on solving Wordle, with Widgets that run a live Solver.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-text">
        <header className="border-b border-highlight-med bg-surface">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
            <Link href="/" className="text-lg font-bold text-heading hover:text-accent">
              Solving Wordle
            </Link>
            <ThemePicker />
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
