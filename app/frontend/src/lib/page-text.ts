import { DEFAULT_LANGUAGE, type Language } from "@/lib/language";

/** The words the pages and the sidebar add around the content, by name. Every language's table must have every key. */
export type PageText = {
  /** The home page's eyebrow. */
  series: string;
  /** "Part 2": a Part's number. */
  part: (number: number) => string;
  prerequisites: string;
  buildsOnThis: string;
  /** Accessible name of the previous / next Article nav. */
  prevNext: string;
  /** The sidebar's heading above the Opener Distribution link. */
  explore: string;
  openerDistribution: string;
  /** The link on the Opener Distribution page to its Article. */
  howItWorks: string;
  /** "Watch from 4:10": a link into the Series video. */
  watchFrom: (timestamp: string) => string;
  /** The Opener Distribution page's intro, then its help text (which ends before the "How it works" link and `sentenceEnd`). */
  openersIntro: string;
  openersHelp: string;
  /** What follows the "How it works" link at the end of the help text. */
  sentenceEnd: string;
  /** The small tag beside an untranslated Article's title, and its accessible name. */
  enTag: string;
  englishOnly: string;
  /** The site's meta description. */
  siteDescription: string;
  /** Accessible name of the sidebar's nav. */
  siteNav: string;
  menu: string;
  close: string;
  /** Accessible name of the language toggle, then of each of its two options. */
  language: string;
  englishName: string;
  thaiName: string;
  /** The short note beside the toggle when the page has no Thai version yet. */
  notInThai: string;
};

export const EN: PageText = {
  series: "Series",
  part: (n) => `Part ${n}`,
  prerequisites: "Prerequisites",
  buildsOnThis: "Builds on this Article",
  prevNext: "Previous and next Article",
  explore: "Explore",
  openerDistribution: "Opener Distribution",
  howItWorks: "How it works",
  watchFrom: (t) => `Watch from ${t}`,
  openersIntro: "Play every word on the Guess List as the Opener, let the Solver finish each Game, and count how many Openers land at each Average Guess Count.",
  openersHelp:
    "Each block is one Opener. Hover a block to see its stats, or click a bar to list the Openers in it. Pick a Strategy, show only Answer List words, or highlight a few words by name.",
  sentenceEnd: ".",
  enTag: "EN",
  englishOnly: "English only",
  siteDescription: "Articles on solving Wordle, with Widgets that run a live Solver.",
  siteNav: "Site",
  menu: "Menu",
  close: "Close",
  language: "Language",
  englishName: "English",
  thaiName: "Thai (ไทย)",
  notInThai: "Not in Thai yet",
};

/** Glossary terms (Series, Part, Opener, ...) stay in English inside the Thai sentences. */
export const TH: PageText = {
  series: "Series",
  part: (n) => `Part ${n}`,
  prerequisites: "ควรอ่านก่อน (Prerequisites)",
  buildsOnThis: "Article ที่ต่อยอดจากบทนี้",
  prevNext: "Article ก่อนหน้าและถัดไป",
  explore: "สำรวจ",
  openerDistribution: "Opener Distribution",
  howItWorks: "ดูว่าทำงานอย่างไร",
  watchFrom: (t) => `ดูตั้งแต่ ${t}`,
  openersIntro: "ลองใช้ทุกคำใน Guess List เป็น Opener ให้ Solver เล่นแต่ละ Game จนจบ แล้วนับว่ามี Opener กี่คำที่ได้ Average Guess Count ในแต่ละช่วง",
  openersHelp:
    "แต่ละบล็อกคือ Opener หนึ่งคำ วางเมาส์บนบล็อกเพื่อดูสถิติ หรือคลิกแท่งกราฟเพื่อดูรายการ Opener ในแท่งนั้น คุณเลือก Strategy ได้ จะแสดงเฉพาะคำใน Answer List ก็ได้ หรือจะไฮไลต์ไม่กี่คำตามชื่อก็ได้",
  sentenceEnd: "",
  enTag: "EN",
  englishOnly: "มีเฉพาะภาษาอังกฤษ",
  siteDescription: "Article เกี่ยวกับการแก้ Wordle พร้อม Widget ที่รัน Solver จริง",
  siteNav: "เมนูเว็บไซต์",
  menu: "เมนู",
  close: "ปิด",
  language: "ภาษา",
  englishName: "อังกฤษ (English)",
  thaiName: "ไทย",
  notInThai: "หน้านี้ยังไม่มีภาษาไทย",
};

const TABLES: Record<Language, PageText> = { en: EN, th: TH };

/** The page text for a language. The `Record` type makes a language without a table a type error. */
export function pageText(lang: Language = DEFAULT_LANGUAGE): PageText {
  return TABLES[lang];
}
