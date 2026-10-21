import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";

// Self-hosted at build; each sets a CSS variable that tokens.css maps to font-serif, font-sans, font-mono.
const serif = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], variable: "--font-newsreader", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" });

/** The class that defines the Latin font variables on `<html>`, on every page. */
export const latinFonts = `${serif.variable} ${sans.variable} ${mono.variable}`;
