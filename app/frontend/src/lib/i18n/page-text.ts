import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";

/** The words the pages and the sidebar add around the content, by name. Every language's table must have every key. */
export type PageText = {
  /** The home page's eyebrow. */
  series: string;
  /** "Part 2": a Part's number. */
  part: (number: number) => string;
  prerequisites: string;
  /** The Article footer: the heading over the related Articles, the tag on each saying how it is related, and the previous / next cards (their nav's accessible name and the small label over each title). */
  relatedArticles: string;
  relationPrerequisite: string;
  relationBuildsOn: string;
  prevNext: string;
  previousArticle: string;
  nextArticle: string;
  /** The summary of a closed <WordList>: "Show all 2,315 words on the Answer List". */
  showWordList: (count: string) => string;
  /** The heading of an Article's Table of contents. */
  onThisPage: string;
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
  /** The Blocks / Bars switch of the Opener Split page: its label and its two options. */
  splitViewLabel: string;
  blocksView: string;
  barsView: string;
  /** The Bars view's chart and word list (the Feedback Split explorer's, in the page's language). `left` and `bits` are already formatted. */
  chartTitle: (left: string, bits: string) => string;
  chartSummary: (groups: number, candidates: number) => string;
  chartListLabel: (guess: string) => string;
  chartHint: string;
  chartPick: string;
  /** "word" / "words" beside a bar, "127 words left" over the word list, and "5.5% chance of this Feedback, leaving 127 words". */
  wordUnit: (count: number) => string;
  chartLeft: (count: number) => string;
  chartChance: (percent: string, count: number) => string;
  /** The stats card of a block's head: its rows (Words, Chance, Information). */
  headWords: string;
  headChance: string;
  headInformation: string;
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
  /** The Feedback Matrix page's Play button, and its label while playing. */
  play: string;
  pause: string;
  /** "Guess 2 of 4" under the strip, and a row's heading: the Guess over the Candidate Set before it, or the Win. */
  guessOf: (number: number, total: number) => string;
  rowHeading: (number: number, guess: string, candidates: number) => string;
  winHeading: (number: number, guess: string) => string;
  /** The Solver's Game did not end in a Win within the Guess Limit of the API. */
  notSolved: string;
  /** What a Follow an Answer row says while its split loads. */
  splittingCandidates: string;
  /** The Full split / Answer's path switch, the path (its accessible name), its first node, a node (a button) and its "+N more". */
  viewLabel: string;
  viewSplit: string;
  viewPath: string;
  pathLabel: (answer: string) => string;
  pathStart: (total: number) => string;
  pathNode: (number: number, guess: string, count: number) => string;
  pathMore: (count: number) => string;
  /** The Guess number above a node, the Win node's head label (the glossary term) and its accessible name. */
  pathGuess: (number: number) => string;
  winLabel: string;
  pathWin: (number: number, guess: string) => string;
  /** The Feedback Matrix page: its link under Explore, title, intro and help text. */
  matrix: string;
  matrixIntro: string;
  matrixHelp: string;
  /** The grid's figure title, the line naming its axes (first and last Answer List word, how many), the canvas's accessible name, and what it says while loading or when the bytes do not fit the Answer List. */
  matrixFigure: string;
  matrixAxes: (first: string, last: string, count: string) => string;
  matrixLabel: (count: string) => string;
  matrixLoading: string;
  matrixWrongSize: string;
  /** The legend's caption (its Tiles are Feedbacks). */
  matrixLegend: string;
  /** The zoom buttons' label and the name of the level that fits the whole grid (the others are "2×", "4×", "8×"). */
  matrixZoom: string;
  matrixZoomFit: string;
  /** The zoomed frame's accessible name (it scrolls, and takes the focus so the arrow keys scroll it). */
  matrixScroll: string;
  /** The hover card: the Guess row's label (the Answer's is `answerLabel`) and the card's accessible name. */
  matrixGuess: string;
  matrixCell: (guess: string, answer: string, marks: string) => string;
  /** The Game on the grid: the strip's status before Guess 1, the Candidate Set sizes' label and the sizes as text (live), the note for a Guess with no row, the Answer's column marker, and the message while a step's Candidate Set loads. */
  matrixStart: string;
  matrixSizesLabel: string;
  matrixSizes: (sizes: string, step: number) => string;
  matrixNoRow: (guess: string) => string;
  matrixAnswerColumn: (answer: string) => string;
  matrixCandidatesLoading: string;
  /** The link on the Opener Distribution page to its Article. */
  howItWorks: string;
  /** The home page's Explore section: its intro, "Builds on" label, and for each Explore page its purpose and three points (see `lib/explore.ts`). */
  exploreIntro: string;
  exploreBuildsOn: string;
  exploreOpenersPurpose: string;
  exploreOpenersPoint1: string;
  exploreOpenersPoint2: string;
  exploreOpenersPoint3: string;
  exploreOpenerSplitPurpose: string;
  exploreOpenerSplitPoint1: string;
  exploreOpenerSplitPoint2: string;
  exploreOpenerSplitPoint3: string;
  exploreFollowPurpose: string;
  exploreFollowPoint1: string;
  exploreFollowPoint2: string;
  exploreFollowPoint3: string;
  exploreMatrixPurpose: string;
  exploreMatrixPoint1: string;
  exploreMatrixPoint2: string;
  exploreMatrixPoint3: string;
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
  relatedArticles: "Related Articles",
  relationPrerequisite: "Prerequisite",
  relationBuildsOn: "Builds on this",
  prevNext: "Previous and next Article",
  previousArticle: "Previous",
  nextArticle: "Next",
  showWordList: (count) => `Show all ${count} words on the Answer List`,
  onThisPage: "On this page",
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
  splitViewLabel: "View",
  blocksView: "Blocks",
  barsView: "Bars",
  chartTitle: (left, bits) => `Expected ${left} words left · ${bits} bits`,
  chartSummary: (g, c) => `${g} Feedbacks over ${c} Candidates`,
  chartListLabel: (g) => `Feedback Split of ${g}: words left per Feedback`,
  chartHint: "Each bar is a Feedback (0 Absent, 1 Present, 2 Correct), as long as the words that would remain. Select one to see them.",
  chartPick: "Select a bar to see the words that would remain.",
  wordUnit: (n) => (n === 1 ? "word" : "words"),
  chartLeft: (n) => `${n} word${n === 1 ? "" : "s"} left`,
  chartChance: (p, n) => `${p} chance of this Feedback, leaving ${n} word${n === 1 ? "" : "s"}`,
  headWords: "Words",
  headChance: "Chance",
  headInformation: "Information",
  follow: "Follow an Answer",
  followIntro: "Pick an Answer and watch the Solver home in on it. Each Guess splits the words still possible after the Guesses before it; the Answer's block is outlined.",
  followHelp: "Choose a Strategy, and an Opener if you do not want the Strategy's best. Step through the Guesses with Prev and Next, or click a Guess in the strip. Switch to Answer's path to see the Answer's group after every Guess as one chain.",
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
  play: "Play",
  pause: "Pause",
  guessOf: (n, total) => `Guess ${n} of ${total}`,
  rowHeading: (n, g, c) => `Guess ${n}: ${g.toUpperCase()} over ${c} ${c === 1 ? "Candidate" : "Candidates"}`,
  winHeading: (n, g) => `Guess ${n}: ${g.toUpperCase()} is the Win`,
  notSolved: "The Solver did not find the Answer.",
  splittingCandidates: "Splitting the Candidates…",
  viewLabel: "View",
  viewSplit: "Full split",
  viewPath: "Answer's path",
  pathLabel: (a) => `The Game for ${a.toUpperCase()}, from the Answer List to the Answer`,
  pathStart: (t) => `Answer List · ${t} words`,
  pathNode: (n, g, c) => `Guess ${n}: ${g.toUpperCase()}, ${c} ${c === 1 ? "Candidate" : "Candidates"} left`,
  pathMore: (c) => `+${c} more`,
  pathGuess: (n) => `Guess ${n}`,
  winLabel: "Win",
  pathWin: (n, g) => `Guess ${n}: ${g.toUpperCase()}, Win`,
  matrix: "Feedback Matrix",
  matrixIntro: "The Solver never works a Feedback out during a Game: it looks it up in a Feedback Matrix. This is the Answer List one, every Guess against every Answer, as one picture.",
  matrixHelp: "Each row is a Guess and each column an Answer, both in Answer List order (alphabetical), so the Wins form the diagonal. A cell's colour is its Feedback Code: the more Correct and Present letters, the brighter. Pick an Answer and a Strategy, then step through the Solver's Game with Prev and Next, or press Play to watch it play out: after each Guess, the columns of the Answers that are no longer Candidates go dark, the rows of the Guesses played are outlined, and the marker above the grid follows the Answer's column.",
  matrixFigure: "Answer × Answer Feedback Matrix",
  matrixAxes: (first, last, count) => `Columns: the Answer. Rows: the Guess. Both run through the ${count} Answer List words, ${first.toUpperCase()} to ${last.toUpperCase()}.`,
  matrixLabel: (count) => `The Feedback Matrix: ${count} Guesses (rows) by ${count} Answers (columns), each cell coloured by its Feedback Code`,
  matrixLoading: "Loading the Feedback Matrix…",
  matrixWrongSize: "The Feedback Matrix does not match the Answer List. Run `just precompute feedback` again.",
  matrixLegend: "Feedback Code, from all Absent (0) to the Win (242)",
  matrixZoom: "Zoom",
  matrixZoomFit: "Fit",
  matrixScroll: "The Feedback Matrix, zoomed in: scroll to move around it",
  matrixGuess: "Guess",
  matrixCell: (g, a, m) => `Guess ${g.toUpperCase()}, Answer ${a.toUpperCase()}, Feedback ${m}`,
  matrixStart: "Before Guess 1",
  matrixSizesLabel: "Candidates",
  matrixSizes: (sizes, step) => `Candidates after each Guess: ${sizes}. Now ${step === 0 ? "before Guess 1" : `after Guess ${step}`}.`,
  matrixNoRow: (g) => `${g.toUpperCase()} is not on the Answer List, so it has no row here.`,
  matrixAnswerColumn: (a) => `The Answer's column, ${a.toUpperCase()}`,
  matrixCandidatesLoading: "Finding the Candidates…",
  howItWorks: "How it works",
  exploreIntro: "Interactive pages that go beyond the Articles.",
  exploreBuildsOn: "Builds on",
  exploreOpenersPurpose: "See how the Solver does with every word on the Guess List as its Opener, not only the famous ones.",
  exploreOpenersPoint1: "Every Opener placed by Average Guess Count: hover a block for its stats, click a bar to list the Openers in it.",
  exploreOpenersPoint2: "Highlight tabs for the best Openers, the myths and the bad ones, or highlight words you type.",
  exploreOpenersPoint3: "Switch the Strategy, or show only Answer List words.",
  exploreOpenerSplitPurpose: "See how one Opener sorts the Answer List by the Feedback it can get.",
  exploreOpenerSplitPoint1: "Every Answer List word placed in its Feedback group under the Opener you pick, biggest group first.",
  exploreOpenerSplitPoint2: "Five figures for the split, and Compare to put a second Opener beside it.",
  exploreOpenerSplitPoint3: "Full screen for a wider view, and Follow this Answer on any word to see how the Solver finds it.",
  exploreFollowPurpose: "Watch the Solver find one Answer, Guess by Guess.",
  exploreFollowPoint1: "Pick any Answer, a Strategy, and an Opener (the Strategy's best unless you choose another).",
  exploreFollowPoint2: "Step through the Guesses with Prev and Next; each shows the words still possible, with the Answer's group outlined.",
  exploreFollowPoint3: "Switch to Answer's path to see the Answer's group after every Guess as one chain.",
  exploreMatrixPurpose: "See the whole Answer × Answer Feedback Matrix the Solver looks Feedback up in, as one picture.",
  exploreMatrixPoint1: "One cell per Guess and Answer, both in Answer List order, so the Wins run down the diagonal.",
  exploreMatrixPoint2: "Each cell's colour is its Feedback Code, from all Absent to the Win.",
  exploreMatrixPoint3: "Bright squares along the diagonal are words that start with the same letter.",
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
  relatedArticles: "Article ที่เกี่ยวข้อง",
  relationPrerequisite: "ควรอ่านก่อน",
  relationBuildsOn: "ต่อยอดจากบทนี้",
  prevNext: "Article ก่อนหน้าและถัดไป",
  previousArticle: "ก่อนหน้า",
  nextArticle: "ถัดไป",
  showWordList: (count) => `แสดงคำทั้ง ${count} คำใน Answer List`,
  onThisPage: "ในหน้านี้",
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
  splitViewLabel: "มุมมอง",
  blocksView: "บล็อก",
  barsView: "แท่ง",
  chartTitle: (left, bits) => `คาดว่าจะเหลือ ${left} คำ · ${bits} bits`,
  chartSummary: (g, c) => `${g} Feedback จาก ${c} Candidates`,
  chartListLabel: (g) => `Feedback Split ของ ${g}: จำนวนคำที่เหลือต่อ Feedback`,
  chartHint: "แต่ละแท่งคือ Feedback (0 Absent, 1 Present, 2 Correct) ยาวตามจำนวนคำที่จะเหลือ เลือกแท่งเพื่อดูคำเหล่านั้น",
  chartPick: "เลือกแท่งเพื่อดูคำที่จะเหลือ",
  wordUnit: () => "คำ",
  chartLeft: (n) => `เหลือ ${n} คำ`,
  chartChance: (p, n) => `โอกาส ${p} ที่จะได้ Feedback นี้ เหลือ ${n} คำ`,
  headWords: "จำนวนคำ",
  headChance: "โอกาส",
  headInformation: "ข้อมูล",
  follow: "Follow an Answer",
  followIntro: "เลือก Answer แล้วดู Solver ค่อย ๆ จำกัดวงเข้าหาคำนั้น แต่ละ Guess แบ่งคำที่ยังเป็นไปได้หลัง Guess ก่อนหน้า และบล็อกของ Answer จะมีกรอบ",
  followHelp: "เลือก Strategy และเลือก Opener เองได้ถ้าไม่ต้องการ Opener ที่ดีที่สุดของ Strategy นั้น กด Prev และ Next เพื่อไล่ดู Guess หรือคลิก Guess ในแถบด้านบน หรือเลือกเส้นทางของ Answer เพื่อดูกลุ่มของ Answer หลังทุก Guess เป็นสายเดียว",
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
  play: "เล่น",
  pause: "หยุดชั่วคราว",
  guessOf: (n, total) => `Guess ที่ ${n} จาก ${total}`,
  rowHeading: (n, g, c) => `Guess ที่ ${n}: ${g.toUpperCase()} บน ${c} Candidate`,
  winHeading: (n, g) => `Guess ที่ ${n}: ${g.toUpperCase()} คือ Win`,
  notSolved: "Solver หา Answer ไม่เจอ",
  splittingCandidates: "กำลังแบ่ง Candidates…",
  viewLabel: "มุมมอง",
  viewSplit: "Split ทั้งหมด",
  viewPath: "เส้นทางของ Answer",
  pathLabel: (a) => `Game ของ ${a.toUpperCase()} ตั้งแต่ Answer List ถึง Answer`,
  pathStart: (t) => `Answer List · ${t} คำ`,
  pathNode: (n, g, c) => `Guess ที่ ${n}: ${g.toUpperCase()} เหลือ ${c} Candidate`,
  pathMore: (c) => `+อีก ${c}`,
  pathGuess: (n) => `Guess ที่ ${n}`,
  winLabel: "Win",
  pathWin: (n, g) => `Guess ที่ ${n}: ${g.toUpperCase()} Win`,
  matrix: "Feedback Matrix",
  matrixIntro: "ระหว่าง Game นั้น Solver ไม่คำนวณ Feedback เลย แต่เปิดหาใน Feedback Matrix นี่คือตารางของ Answer List คือทุก Guess เทียบกับทุก Answer แสดงเป็นภาพเดียว",
  matrixHelp: "แต่ละแถวคือ Guess และแต่ละคอลัมน์คือ Answer ทั้งสองแกนเรียงตาม Answer List (ตามตัวอักษร) ช่องที่เป็น Win จึงเรียงเป็นเส้นทแยง สีของช่องคือ Feedback Code ยิ่งมีตัวอักษร Correct และ Present มาก สียิ่งสว่าง เลือก Answer และ Strategy แล้วกด Prev และ Next เพื่อไล่ดูเกมของ Solver หรือกดปุ่มเล่นเพื่อดูเกมเล่นไปเอง หลังแต่ละ Guess คอลัมน์ของ Answer ที่ไม่ใช่ Candidate แล้วจะมืดลง แถวของ Guess ที่เล่นไปแล้วจะมีกรอบ และเครื่องหมายเหนือภาพจะชี้คอลัมน์ของ Answer",
  matrixFigure: "Feedback Matrix แบบ Answer × Answer",
  matrixAxes: (first, last, count) => `คอลัมน์คือ Answer แถวคือ Guess ทั้งสองแกนไล่ตามคำใน Answer List ทั้ง ${count} คำ ตั้งแต่ ${first.toUpperCase()} ถึง ${last.toUpperCase()}`,
  matrixLabel: (count) => `Feedback Matrix: Guess ${count} แถว คูณ Answer ${count} คอลัมน์ แต่ละช่องมีสีตาม Feedback Code`,
  matrixLoading: "กำลังโหลด Feedback Matrix…",
  matrixWrongSize: "Feedback Matrix ไม่ตรงกับ Answer List ให้รัน `just precompute feedback` อีกครั้ง",
  matrixLegend: "Feedback Code ตั้งแต่ Absent ทั้งหมด (0) ถึง Win (242)",
  matrixZoom: "ซูม",
  matrixZoomFit: "พอดีกรอบ",
  matrixScroll: "Feedback Matrix แบบซูมเข้า เลื่อนเพื่อดูส่วนอื่น",
  matrixGuess: "Guess",
  matrixCell: (g, a, m) => `Guess ${g.toUpperCase()} กับ Answer ${a.toUpperCase()} ได้ Feedback ${m}`,
  matrixStart: "ก่อน Guess แรก",
  matrixSizesLabel: "Candidate ที่เหลือ",
  matrixSizes: (sizes, step) => `จำนวน Candidate หลังแต่ละ Guess: ${sizes} ตอนนี้${step === 0 ? "ก่อน Guess แรก" : `หลัง Guess ที่ ${step}`}`,
  matrixNoRow: (g) => `${g.toUpperCase()} ไม่อยู่ใน Answer List จึงไม่มีแถวในภาพนี้`,
  matrixAnswerColumn: (a) => `คอลัมน์ของ Answer คือ ${a.toUpperCase()}`,
  matrixCandidatesLoading: "กำลังหา Candidate…",
  howItWorks: "ดูว่าทำงานอย่างไร",
  exploreIntro: "หน้าแบบโต้ตอบที่ไปไกลกว่า Article",
  exploreBuildsOn: "ต่อยอดจาก",
  exploreOpenersPurpose: "ดูว่า Solver ทำได้ดีแค่ไหนเมื่อใช้ทุกคำใน Guess List เป็น Opener ไม่ใช่แค่คำที่คนรู้จัก",
  exploreOpenersPoint1: "Opener ทุกคำจัดตาม Average Guess Count เลื่อนเมาส์เหนือบล็อกเพื่อดูสถิติ หรือคลิกแท่งเพื่อดูรายชื่อ Opener ในแท่งนั้น",
  exploreOpenersPoint2: "แท็บไฮไลต์ Opener ที่ดีที่สุด คำที่เชื่อกันผิด ๆ และ Opener ที่แย่ หรือไฮไลต์คำที่คุณพิมพ์เอง",
  exploreOpenersPoint3: "เปลี่ยน Strategy หรือแสดงเฉพาะคำใน Answer List",
  exploreOpenerSplitPurpose: "ดูว่า Opener หนึ่งคำแบ่ง Answer List ตาม Feedback ที่เป็นไปได้อย่างไร",
  exploreOpenerSplitPoint1: "ทุกคำใน Answer List อยู่ในกลุ่ม Feedback ของตัวเองภายใต้ Opener ที่คุณเลือก กลุ่มใหญ่ที่สุดมาก่อน",
  exploreOpenerSplitPoint2: "ตัวเลขห้าค่าของการแบ่ง และ Compare เพื่อวาง Opener ที่สองไว้ข้างกัน",
  exploreOpenerSplitPoint3: "Full screen เพื่อดูให้กว้างขึ้น และ Follow this Answer ที่คำใดก็ได้เพื่อดูว่า Solver หาคำนั้นเจออย่างไร",
  exploreFollowPurpose: "ดู Solver ค่อย ๆ หา Answer หนึ่งคำ ทีละ Guess",
  exploreFollowPoint1: "เลือก Answer ใดก็ได้ พร้อม Strategy และ Opener (Opener ที่ดีที่สุดของ Strategy นั้น ถ้าไม่เลือกเอง)",
  exploreFollowPoint2: "ไล่ดู Guess ด้วย Prev และ Next แต่ละ Guess แสดงคำที่ยังเป็นไปได้ และกลุ่มของ Answer จะมีกรอบ",
  exploreFollowPoint3: "เลือกเส้นทางของ Answer เพื่อดูกลุ่มของ Answer หลังทุก Guess เป็นสายเดียว",
  exploreMatrixPurpose: "ดู Feedback Matrix แบบ Answer × Answer ทั้งตารางที่ Solver ใช้เปิดหา Feedback เป็นภาพเดียว",
  exploreMatrixPoint1: "หนึ่งช่องต่อหนึ่งคู่ Guess กับ Answer ทั้งสองแกนเรียงตาม Answer List ช่องที่เป็น Win จึงเรียงเป็นเส้นทแยง",
  exploreMatrixPoint2: "สีของแต่ละช่องคือ Feedback Code ของช่องนั้น ตั้งแต่ Absent ทั้งหมดไปจนถึง Win",
  exploreMatrixPoint3: "บล็อกตามแนวทแยงคือคำที่ขึ้นต้นด้วยตัวอักษรเดียวกัน",
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
