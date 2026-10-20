import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import "katex/dist/katex.min.css";
import { Sidebar } from "@/components/Sidebar";
import { content } from "@/lib/content";
import { themeScript } from "@/lib/theme-script";
import "./globals.css";

// Self-hosted at build; each sets a CSS variable that tokens.css maps to font-serif, font-sans, font-mono.
const serif = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-newsreader", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Solving Wordle", template: "%s | Solving Wordle" },
  description: "Articles on solving Wordle, with Widgets that run a live Solver.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { series } = content();
  return (
    <html lang="en" suppressHydrationWarning className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background font-serif text-text">
        <div className="lg:grid lg:grid-cols-[var(--container-nav)_minmax(0,1fr)]">
          <Sidebar
            title={series.title}
            parts={series.parts.map(({ id, number, title, articles }) => ({
              id,
              number,
              title,
              articles: articles.map(({ slug, title, number }) => ({ slug, title, number })),
            }))}
          />
          <main className="mx-auto w-full min-w-0 max-w-page px-gutter py-12 sm:px-gutter-wide sm:py-16">{children}</main>
        </div>
      </body>
    </html>
  );
}
