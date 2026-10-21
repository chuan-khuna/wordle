import { Noto_Sans_Thai_Looped } from "next/font/google";

// Only the Thai layout imports this file, so English pages neither load nor preload the font. tokens.css lists
// --font-noto-thai-looped after the Latin family in the serif and sans stacks, so Thai letters use it and Latin letters keep Newsreader or Inter.
const thai = Noto_Sans_Thai_Looped({ subsets: ["thai"], variable: "--font-noto-thai-looped", display: "swap" });

/** The class that defines the Thai font variable on `<html>`, on Thai pages only. */
export const thaiFonts = thai.variable;
