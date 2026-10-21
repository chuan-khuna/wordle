import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";

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
  /** The sidebar's heading above the Explore links. */
  explore: string;
  openerDistribution: string;
  /** The Opener Split page: its link under Explore, title, intro and help text. */
  openerSplit: string;
  openerSplitIntro: string;
  openerSplitHelp: string;
  /** The label of the Opener input, and what the page says before a full word is typed and while it splits. */
  openerLabel: string;
  typeOpener: string;
  splitting: string;
  /** The "Full screen" toggle on the Opener Split page (shown from the `lg` breakpoint). */
  fullScreen: string;
  closeFullScreen: string;
  /** The link in the card of a word on the Opener Split page, to the Follow an Answer page. */
  followThisAnswer: string;
  /** Compare: the button that adds a second Opener, the second input's label, and the control that removes it. */
  compare: string;
  comparedOpenerLabel: string;
  removeCompare: string;
  /** The five figures of a split: number of groups, largest group, single-word groups, Expected Information and Expected Candidates. */
  figuresLabel: (guess: string) => string;
  groupsFigure: string;
  largestGroupFigure: string;
  singleWordGroupsFigure: string;
  expectedInformationFigure: string;
  expectedCandidatesFigure: string;
  bits: string;
  betterFigure: string;
  /** The accessible name of the list of blocks (the Guess's name), of one block's Feedback, and a group's size in its head. */
  splitGroupsLabel: (guess: string) => string;
  feedbackLabel: string;
  words: (count: number) => string;
  /** The Follow an Answer page: its link under Explore, title, intro and help text. */
  follow: string;
  followIntro: string;
  followHelp: string;
  /** The Answer input's label, and what the page says before a full Answer is typed and while the Solver plays. */
  answerLabel: string;
  typeAnswer: string;
  solverPlaying: string;
  /** Quiet help under the Opener input while it holds the Strategy's best Opener, and the button that goes back to it. */
  bestOpenerHint: string;
  useBestOpener: string;
  /** The strip of Guesses (its accessible name), one Guess in it (a button that jumps to its row), the current row, and the Prev / Next buttons. */
  guessStripLabel: (answer: string) => string;
  jumpToGuess: (number: number, guess: string) => string;
  prev: string;
  next: string;
  prevGuess: string;
  nextGuess: string;
  /** "Guess 2 of 4" under the strip, and a row's heading: the Guess over the Candidate Set before it, or the Win. */
  guessOf: (number: number, total: number) => string;
  rowHeading: (number: number, guess: string, candidates: number) => string;
  winHeading: (number: number, guess: string) => string;
  /** The Solver's Game did not end in a Win within the Guess Limit of the API. */
  notSolved: string;
  /** What a Follow an Answer row says while its split loads. */
  splittingCandidates: string;
  /** The Rows / Graph switch, the graph (its accessible name), its first node, a node (a button) and its "+N more". */
  viewLabel: string;
  viewRows: string;
  viewGraph: string;
  graphLabel: (answer: string) => string;
  graphStart: (total: number) => string;
  graphNode: (number: number, guess: string, count: number) => string;
  graphMore: (count: number) => string;
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
  /** The Strategy picker: its rows' labels, the "Strategy:" label, and the accessible name of a row's info button ("About Guess Pool"). */
  guessPoolLabel: string;
  searchScopeLabel: string;
  rankingLabel: string;
  strategyLabel: string;
  aboutChoice: (label: string) => string;
  /** The info card of each row: one line on what the choice decides, then one line for each option in the order the row shows them. */
  guessPoolTip: string;
  guessPoolAnswers: string;
  guessPoolGuesses: string;
  searchScopeTip: string;
  searchScopeCandidates: string;
  searchScopeAll: string;
  rankingTip: string;
  rankingBits: string;
  rankingExpected: string;
};

export const EN: PageText = {
  series: "Series",
  part: (n) => `Part ${n}`,
  prerequisites: "Prerequisites",
  buildsOnThis: "Builds on this Article",
  prevNext: "Previous and next Article",
  explore: "Explore",
  openerDistribution: "Opener Distribution",
  openerSplit: "Opener Split",
  openerSplitIntro: "Pick an Opener and see the whole Answer List fall apart into one block for each Feedback it can get, the biggest block first.",
  openerSplitHelp: "Each block is headed by the Opener with that Feedback's Marks and the number of words left. Type any Guess List word as the Opener.",
  openerLabel: "Opener",
  typeOpener: "Type a five-letter Opener.",
  splitting: "Splitting the Answer List…",
  splitGroupsLabel: (g) => `Feedback Split of ${g} over the Answer List`,
  fullScreen: "Full screen",
  closeFullScreen: "Close",
  followThisAnswer: "Follow this Answer",
  compare: "Compare",
  comparedOpenerLabel: "Compared Opener",
  removeCompare: "Remove",
  figuresLabel: (g) => `Figures for ${g}`,
  groupsFigure: "Groups",
  largestGroupFigure: "Largest group",
  singleWordGroupsFigure: "Single-word groups",
  expectedInformationFigure: "Expected Information",
  expectedCandidatesFigure: "Expected Candidates",
  bits: "bits",
  betterFigure: "better",
  feedbackLabel: "Feedback",
  words: (n) => `${n} word${n === 1 ? "" : "s"}`,
  follow: "Follow an Answer",
  followIntro: "Pick an Answer and watch the Solver home in on it. Each row splits the words still possible after the Guesses before it; the Answer's block is outlined.",
  followHelp: "Choose a Strategy, and an Opener if you do not want the Strategy's best. Step through the Guesses with Prev and Next, or click a Guess in the strip.",
  answerLabel: "Answer",
  typeAnswer: "Type a five-letter Answer.",
  solverPlaying: "The Solver is playing…",
  bestOpenerHint: "The Strategy's best Opener. Type another word to change it.",
  useBestOpener: "Best Opener",
  guessStripLabel: (a) => `Guesses for ${a}`,
  jumpToGuess: (n, g) => `Guess ${n}: ${g}`,
  prev: "Prev",
  next: "Next",
  prevGuess: "Previous Guess",
  nextGuess: "Next Guess",
  guessOf: (n, total) => `Guess ${n} of ${total}`,
  rowHeading: (n, g, c) => `Guess ${n}: ${g.toUpperCase()} over ${c} ${c === 1 ? "Candidate" : "Candidates"}`,
  winHeading: (n, g) => `Guess ${n}: ${g.toUpperCase()} is the Win`,
  notSolved: "The Solver did not find the Answer.",
  splittingCandidates: "Splitting the Candidates…",
  viewLabel: "View",
  viewRows: "Rows",
  viewGraph: "Graph",
  graphLabel: (a) => `The Game for ${a.toUpperCase()}, from the Answer List to the Answer`,
  graphStart: (t) => `Answer List · ${t} words`,
  graphNode: (n, g, c) => `Guess ${n}: ${g.toUpperCase()}, ${c} ${c === 1 ? "Candidate" : "Candidates"} left`,
  graphMore: (c) => `+${c} more`,
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
  guessPoolLabel: "Guess Pool",
  searchScopeLabel: "Search Scope",
  rankingLabel: "Ranking",
  strategyLabel: "Strategy",
  aboutChoice: (label) => `About ${label}`,
  guessPoolTip: "Which words the Solver may guess from, the Opener included.",
  guessPoolAnswers: "Answer List: only words that can be the Answer.",
  guessPoolGuesses: "Guess List: every word Wordle accepts.",
  searchScopeTip: "Which of those words the Solver considers for each Guess after the Opener.",
  searchScopeCandidates: "Candidates only: words that can still be the Answer.",
  searchScopeAll: "All words: any word in the Guess Pool, even one that can't be the Answer, if it splits the Candidates best.",
  rankingTip: "How the Solver picks the best Guess among those it considers.",
  rankingBits: "Expected Information: the highest wins.",
  rankingExpected: "Expected Candidates: the lowest wins.",
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
  openerSplit: "Opener Split",
  openerSplitIntro: "เลือก Opener แล้วดู Answer List ทั้งหมดแตกออกเป็นบล็อกตาม Feedback ที่เป็นไปได้ โดยบล็อกที่ใหญ่ที่สุดมาก่อน",
  openerSplitHelp: "หัวของแต่ละบล็อกคือ Opener พร้อม Marks ของ Feedback นั้นและจำนวนคำที่เหลือ พิมพ์คำใดก็ได้ใน Guess List เป็น Opener",
  openerLabel: "Opener",
  typeOpener: "พิมพ์ Opener ห้าตัวอักษร",
  splitting: "กำลังแบ่ง Answer List…",
  splitGroupsLabel: (g) => `Feedback Split ของ ${g} บน Answer List`,
  fullScreen: "เต็มจอ",
  closeFullScreen: "ปิด",
  followThisAnswer: "ติดตาม Answer นี้",
  compare: "เปรียบเทียบ",
  comparedOpenerLabel: "Opener ที่เปรียบเทียบ",
  removeCompare: "ลบ",
  figuresLabel: (g) => `ตัวเลขของ ${g}`,
  groupsFigure: "จำนวนกลุ่ม",
  largestGroupFigure: "กลุ่มที่ใหญ่ที่สุด",
  singleWordGroupsFigure: "กลุ่มที่มีคำเดียว",
  expectedInformationFigure: "Expected Information",
  expectedCandidatesFigure: "Expected Candidates",
  bits: "bits",
  betterFigure: "ดีกว่า",
  feedbackLabel: "Feedback",
  words: (n) => `${n} คำ`,
  follow: "Follow an Answer",
  followIntro: "เลือก Answer แล้วดู Solver ค่อย ๆ จำกัดวงเข้าหาคำนั้น แต่ละแถวแบ่งคำที่ยังเป็นไปได้หลัง Guess ก่อนหน้า และบล็อกของ Answer จะมีกรอบ",
  followHelp: "เลือก Strategy และเลือก Opener เองได้ถ้าไม่ต้องการ Opener ที่ดีที่สุดของ Strategy นั้น กด Prev และ Next เพื่อไล่ดู Guess หรือคลิก Guess ในแถบด้านบน",
  answerLabel: "Answer",
  typeAnswer: "พิมพ์ Answer ห้าตัวอักษร",
  solverPlaying: "Solver กำลังเล่น…",
  bestOpenerHint: "Opener ที่ดีที่สุดของ Strategy นี้ พิมพ์คำอื่นเพื่อเปลี่ยน",
  useBestOpener: "Opener ที่ดีที่สุด",
  guessStripLabel: (a) => `Guess สำหรับ ${a}`,
  jumpToGuess: (n, g) => `Guess ที่ ${n}: ${g}`,
  prev: "ก่อนหน้า",
  next: "ถัดไป",
  prevGuess: "Guess ก่อนหน้า",
  nextGuess: "Guess ถัดไป",
  guessOf: (n, total) => `Guess ที่ ${n} จาก ${total}`,
  rowHeading: (n, g, c) => `Guess ที่ ${n}: ${g.toUpperCase()} บน ${c} Candidate`,
  winHeading: (n, g) => `Guess ที่ ${n}: ${g.toUpperCase()} คือ Win`,
  notSolved: "Solver หา Answer ไม่เจอ",
  splittingCandidates: "กำลังแบ่ง Candidates…",
  viewLabel: "มุมมอง",
  viewRows: "Rows",
  viewGraph: "Graph",
  graphLabel: (a) => `Game ของ ${a.toUpperCase()} ตั้งแต่ Answer List ถึง Answer`,
  graphStart: (t) => `Answer List · ${t} คำ`,
  graphNode: (n, g, c) => `Guess ที่ ${n}: ${g.toUpperCase()} เหลือ ${c} Candidate`,
  graphMore: (c) => `+อีก ${c}`,
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
  guessPoolLabel: "Guess Pool",
  searchScopeLabel: "Search Scope",
  rankingLabel: "Ranking",
  strategyLabel: "Strategy",
  aboutChoice: (label) => `เกี่ยวกับ ${label}`,
  guessPoolTip: "คำที่ Solver เลือกทายได้ รวมถึง Opener",
  guessPoolAnswers: "Answer List: เฉพาะคำที่เป็น Answer ได้",
  guessPoolGuesses: "Guess List: ทุกคำที่ Wordle รับ",
  searchScopeTip: "คำใน Guess Pool ที่ Solver พิจารณาในแต่ละ Guess หลัง Opener",
  searchScopeCandidates: "Candidates only: เฉพาะคำที่ยังเป็น Answer ได้",
  searchScopeAll: "All words: คำใดก็ได้ใน Guess Pool แม้เป็น Answer ไม่ได้ ถ้าแบ่ง Candidates ได้ดีที่สุด",
  rankingTip: "วิธีที่ Solver เลือก Guess ที่ดีที่สุดจากคำที่พิจารณา",
  rankingBits: "Expected Information: ค่าสูงสุดชนะ",
  rankingExpected: "Expected Candidates: ค่าต่ำสุดชนะ",
};

const TABLES: Record<Language, PageText> = { en: EN, th: TH };

/** The page text for a language. The `Record` type makes a language without a table a type error. */
export function pageText(lang: Language = DEFAULT_LANGUAGE): PageText {
  return TABLES[lang];
}
