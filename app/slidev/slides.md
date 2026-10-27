---
# The Thai YouTube video of the Solving Wordle Series: about 28 minutes in 14 scenes that follow the eleven Articles.
# The slides are in English; the lines to say (in Thai) and what to click are in each slide's presenter notes (press P, or open /presenter).
# Every number here is from the Thai Articles (app/frontend/content/th/articles/).
theme: default
title: Solving Wordle
info: Slides and Thai script for the YouTube video of the Solving Wordle Series
colorSchema: light
aspectRatio: 16/9
canvasWidth: 980
transition: fade
fonts:
  sans: Noto Sans Thai Looped
  mono: IBM Plex Mono
  weights: '400,700'
layout: center
class: text-center
---

# Solving Wordle

with counting and logarithms

<div class="mt-10 flex flex-col items-center gap-2">
  <Tiles word="tarse" marks="00000" size="lg" />
</div>

<!--
**ก่อนอัด** (สไลด์นี้ไม่อยู่ในคลิป)

1. รัน `just web` (backend + frontend) ถ้า Opener Distribution ว่าง ให้รัน `just cache restore` ก่อน
2. ตั้ง theme เว็บเป็น Rosé Pine Dawn ภาษาไทย ซูมเบราว์เซอร์ 125% ซ่อน bookmarks bar
3. เปิดสไลด์ด้วย `just slides` แล้วกด P เข้าโหมดผู้นำเสนอ (บทพูดอยู่ตรงนี้ เวลาอยู่มุมบน)
4. ลิงก์ ↗ บนสไลด์เปิดหน้าเว็บในแท็บใหม่ ตรงสถานะ Widget ที่ต้องใช้ เปิดล่วงหน้าเรียงตามฉากได้
5. เปิด terminal รอไว้ที่โฟลเดอร์ repo สำหรับฉาก 4 (`just wordle`)
6. ทางเลือก: ฉาก 2 ใช้แอนิเมชัน `just animate present what_is_wordle` (ราว 60 วินาที) แทนหน้า Article ได้

บทพูดไม่ได้ใส่ ครับ/ค่ะ เติมเองตามสไตล์ตอนอ่าน
-->

---
layout: two-cols
---

# The Solver that lost by always picking the best

<span class="muted">Answer: <Word>watch</Word> · Answer List · Candidates only</span>

<div class="board mt-6">
  <Tiles word="raise" marks="02000" size="sm" />
  <Tiles word="tangy" marks="12000" size="sm" />
  <Tiles word="caput" marks="12001" size="sm" />
  <Tiles word="batch" marks="02222" size="sm" />
  <Tiles word="hatch" marks="02222" size="sm" />
  <Tiles word="latch" marks="02222" size="sm" />
  <Tiles word="match" marks="02222" size="sm" />
  <Tiles word="watch" marks="22222" size="sm" />
</div>

<p class="mt-3" style="color: var(--love, #b4637a)">Guess 8 · Wordle allows only 6</p>

::right::

<div v-click class="mt-24 flex flex-col items-center gap-4">
  <span class="muted">Allowed to guess any word</span>
  <Tiles word="abamp" size="lg" />
  <span>Wins in <b>5</b> Guesses</span>
</div>

<div class="mt-16 flex justify-center">
  <Open href="/th/articles/greedy-strategy#widget-trap">Article 08: the _atch trap</Open>
</div>

<!--
⏱ ฉาก 0 · 0:00 – 1:15 · Hook

**บนจอ**
- เปิดลิงก์ Article 08 ที่ Widget แรก (Answer watch, Answer List, Candidates only) ซึ่งเริ่มที่ Guess 4
- กด Prev กลับไป Guess 1 แล้วกด Next ช้า ๆ จนถึง Guess 8 ค้างไว้ที่เส้น Guess Limit
- ตัดไป Widget ที่สองข้างล่าง (All words) กด Next จนเห็น abamp และ Win (หรือคลิกสไลด์ให้ abamp ขึ้น)

**พูด**

นี่คือโปรแกรมที่เล่น Wordle ด้วยคณิตศาสตร์ คำตอบคือ watch

มันเปิดด้วย raise ตามด้วย tangy และ caput เหลือคำที่เป็นไปได้ห้าคำ: batch, hatch, latch, match, watch

แล้วมันก็ไล่ทายทีละคำ batch ไม่ใช่ hatch ไม่ใช่ latch ไม่ใช่ match ไม่ใช่... กว่าจะถึง watch ก็ Guess ที่แปด แต่ Wordle ให้แค่หก แพ้

ที่แปลกคือ ทุกตามันเลือก Guess ที่ดีที่สุดเท่าที่มันเห็นแล้ว

[click] ทางแก้ก็แปลกไม่แพ้กัน คือให้มันทายคำที่ *ไม่มีทาง* เป็นคำตอบ อย่าง abamp แล้วมันชนะใน 5 Guess

คลิปนี้จะเริ่มจากกติกา สร้างเกม แล้วค่อย ๆ สร้าง Solver ที่เล่นห่างจากแบบสมบูรณ์ไม่ถึงหนึ่งในสี่ของหนึ่งเปอร์เซ็นต์ ทุกอย่างในคลิปเปิดเล่นเองได้บนเว็บ ลิงก์อยู่ใต้คลิป
-->

---

# Roadmap

<div class="grid grid-cols-2 gap-10 mt-10">
<div>

### Part 1 · Wordle

- The rules and two word lists
- Feedback and repeated letters
- Building the Game in Python

</div>
<div>

### Part 2 · Solving Wordle

- Candidate Set
- Two ways to score a Guess
- Feedback Split and Openers
- Greedy Strategy and Benchmark
- Greedy vs optimal
- Opener Distribution

</div>
</div>

<p class="mt-10 muted text-center">The maths: counting and logarithms</p>

<div class="flex justify-center"><Open href="/th">Home: the Solving Wordle Series</Open></div>

<!--
⏱ ฉาก 1 · 1:15 – 2:15 · แผนที่ของคลิป

**บนจอ**
- เปิดหน้าแรกของเว็บ เลื่อนช้า ๆ ผ่าน Part 1 และ Part 2 แล้วหยุดที่หัวข้อ Explore
- ชี้ sidebar ด้านซ้ายแวบหนึ่ง

**พูด**

เว็บนี้มีสองส่วน

ส่วนแรกคือ Wordle เราจะดูกติกา ดูว่าเกมให้สีตัวอักษรแต่ละตัวยังไง โดยเฉพาะตอนตัวอักษรซ้ำ แล้วเขียนเกมที่เล่นได้จริงใน Python

ส่วนที่สองคือการแก้ Wordle เราจะถามว่า Guess หนึ่งครั้งบอกอะไรเรา วัดมันได้สองวิธี สร้าง Solver ที่เล่นจนจบ เทียบกับการเล่นที่ดีที่สุดเท่าที่เป็นไปได้ แล้วปิดด้วยการลองคำแรกทั้งหมดหนึ่งหมื่นสี่พันกว่าคำ ว่าคำไหนเปิดเกมได้ดีจริง

คณิตศาสตร์ที่ใช้มีแค่การนับกับลอการิทึม ไม่ต้องกลัว
-->

---

# The rules

<div class="grid grid-cols-4 gap-6 mt-8 text-center">
  <div class="stat"><b>1</b><span>five-letter Answer</span></div>
  <div class="stat"><b>6</b><span>Guesses</span></div>
  <div class="stat"><b>5</b><span>Feedback, one per letter</span></div>
  <div class="stat"><b>W / L</b><span>Win or Loss</span></div>
</div>

<div v-click class="grid grid-cols-2 gap-10 mt-14 text-center">
  <div class="stat"><b>2,315</b><span>Answer List · words that can be the Answer</span></div>
  <div class="stat"><b>14,855</b><span>Guess List · words you can guess (includes the Answer List)</span></div>
</div>

<p v-click class="mt-8 text-center">You can guess <Word>tarse</Word>, but it is never the Answer</p>

<div class="flex justify-center mt-4"><Open href="/th/articles/rules">Article 01: The rules</Open></div>

<!--
⏱ ฉาก 2 · 2:15 – 4:00 · กติกาและสองรายการคำ

**บนจอ**
- เปิด Article 01 เลื่อนผ่านย่อหน้าแรกถึงหัวข้อ "สองรายการคำ"
- ไฮไลต์บรรทัด `(2315, 14855)` ในโค้ด
- เลื่อนลงให้เห็นรายการคำ Answer List ท้ายบท

**พูด**

กติกาของ Wordle มีน้อยมาก

มีคำลับห้าตัวอักษรหนึ่งคำ เรียกว่า Answer เราทายได้หกครั้ง แต่ละครั้งเรียกว่า Guess ทายแล้วเกมจะบอกผลทีละตัวอักษร เรียกว่า Feedback ทายถูกภายในหกครั้งคือ Win ไม่ถูกคือ Loss

[click] แต่มีรายละเอียดหนึ่งที่คนส่วนใหญ่ไม่รู้ เกมมีรายการคำ *สอง* ชุด

ชุดแรกคือ Answer List คำที่เป็นคำตอบได้ 2,315 คำ เป็นคำธรรมดาอย่าง crane, abide, watch

ชุดที่สองคือ Guess List คำทั้งหมดที่เกมยอมให้ทาย 14,855 คำ และรวม Answer List ไว้ด้วย

[click] คุณจึงทายคำแปลก ๆ อย่าง tarse ได้ เกมรับ แต่มันไม่มีวันเป็นคำตอบ

จำความต่างนี้ไว้ อีกไม่นานมันจะกลายเป็นเรื่องใหญ่

มองแบบนักคณิตศาสตร์ ปริศนานี้คือ คำตอบเป็นหนึ่งใน 2,315 คำ และเราถามได้หกคำถาม ที่เหลือของคลิปคือการเรียนวิธีถามให้ดีขึ้น
-->

---
clicks: 4
---

# Feedback: three marks, five letters

<div class="grid grid-cols-3 gap-6 mt-6 text-center">
  <div class="flex flex-col items-center gap-2"><Tiles word="a" marks="2" size="lg" /><span>Correct · right spot</span></div>
  <div class="flex flex-col items-center gap-2"><Tiles word="a" marks="1" size="lg" /><span>Present · elsewhere</span></div>
  <div class="flex flex-col items-center gap-2"><Tiles word="a" marks="0" size="lg" /><span>Absent · not in the Answer</span></div>
</div>

<div class="mt-8">
  <FeedbackGrowth :letters="1 + $clicks" />
</div>

<!--
⏱ ฉาก 3 · 4:00 – 6:30 · Feedback และกฎตัวอักษรซ้ำ (ครึ่งแรก)

**พูด**

Feedback ให้ตัวอักษรแต่ละตัวหนึ่งในสามแบบ Correct คืออยู่ในคำตอบและตรงตำแหน่ง Present คืออยู่ในคำตอบแต่อยู่ที่อื่น Absent คือคำตอบไม่ต้องการตัวนี้

ถ้าดูแค่ตัวอักษรตัวแรก Feedback เป็นได้สามแบบ

[click] เพิ่มตัวที่สอง แต่ละแบบแตกเป็นสาม ได้เก้า

[click] ตัวที่สาม ยี่สิบเจ็ด

[click] ตัวที่สี่ แปดสิบเอ็ด

[click] ครบห้าตัว 243 แบบ หรือ 3 ยกกำลัง 5 จำเลขนี้ไว้ มันคือจำนวนผลลัพธ์มากที่สุดที่ Guess หนึ่งครั้งจะให้ได้
-->

---

# Repeated letters: two passes

<div class="grid grid-cols-2 gap-10 mt-8">
<div class="flex flex-col items-center gap-3">
  <span class="muted">Guess <Word>speed</Word> · Answer <Word>abide</Word></span>
  <Tiles word="speed" marks="00101" size="lg" />
  <span class="text-sm">The second E is Absent: the Answer's only E is used up</span>
  <Open href="/th/articles/feedback?fb.guess=speed&fb.answer=abide#widget-fb">Article 02: speed and abide</Open>
</div>
<div v-click class="flex flex-col items-center gap-3">
  <span class="muted">Guess <Word>eerie</Word> · Answer <Word>crane</Word></span>
  <Tiles word="eerie" marks="00102" size="lg" />
  <span class="text-sm">Pass 1 gives the E to the last letter first</span>
  <Open href="/th/articles/feedback?fb.guess=eerie&fb.answer=crane#widget-fb">Article 02: eerie and crane</Open>
</div>
</div>

<ol class="mt-10">
  <li><b>Pass 1</b> Every letter in the right spot is Correct</li>
  <li><b>Pass 2</b> Left to right: Present if the Answer has that letter left, otherwise Absent</li>
</ol>

<!--
⏱ ฉาก 3 · 4:00 – 6:30 · Feedback และกฎตัวอักษรซ้ำ (ครึ่งหลัง)

**บนจอ**
- ลิงก์แรก: ชี้กระเบื้องทีละตัว แล้วชี้คำอธิบายสองรอบใต้ Widget
- ลิงก์ที่สอง (หรือพิมพ์ใน Widget สด ๆ): eerie กับ crane ชี้ E ตัวท้ายที่เป็น Correct
- ถ้ามีเวลา พิมพ์คำที่ไม่อยู่ใน Guess List เช่น `zzzzz` ให้เห็นแถวสั่น

**พูด**

ส่วนที่ยากคือตัวอักษรซ้ำ ดูตัวอย่างนี้ Guess คือ speed คำตอบคือ abide

speed มี E สองตัว แต่ abide มีตัวเดียว E ตัวแรกเป็น Present แต่ตัวที่สองเป็น Absent ทั้งที่คำตอบมี E เพราะ E ตัวเดียวของคำตอบถูกใช้ไปแล้ว

กฎคือ ตัวอักษรหนึ่งได้สีไม่เกินจำนวนครั้งที่มันอยู่ในคำตอบ และเพื่อความยุติธรรม เกมคิดเป็นสองรอบ

รอบแรก ให้ Correct กับทุกตัวที่ตรงตำแหน่ง รอบสอง ไล่ซ้ายไปขวาในตัวที่เหลือ ถ้าคำตอบยังมีตัวนั้นเหลือ ได้ Present ถ้าไม่เหลือ ได้ Absent

[click] ลำดับนี้สำคัญ ลอง eerie กับ crane E ตัวเดียวของ crane อยู่ท้ายคำ และ eerie ก็ลงท้ายด้วย E รอบแรกยก E ให้ตัวท้ายเป็น Correct ไปแล้ว E สองตัวข้างหน้าจึงเป็น Absent ถ้าไล่จากซ้ายตั้งแต่แรก E ตัวแรกจะได้ Present ไป และผลจะผิด

ฟังก์ชันนี้สั้นนิดเดียว แต่ทุกอย่างที่เหลือในคลิปสร้างอยู่บนมัน
-->

---

# Building the Game in Python

<div class="grid grid-cols-3 gap-6 mt-8">
<div>

### Guess

A word and its Feedback

</div>
<div>

### State

Every Guess so far: all the player can see

</div>
<div>

### Game

Holds the Answer and the Guess Limit, decides when it is over

</div>
</div>

```python {2}
@dataclass(frozen=True)
class State:
    guesses: tuple[Guess, ...] = ()
```

<p class="muted">A Guess makes a new State; the old one never changes</p>

<div class="flex gap-4 items-center">
  <Open href="/th/articles/building-the-game">Article 03: Building the Game</Open>
  <code>just wordle</code>
</div>

<!--
⏱ ฉาก 4 · 6:30 – 7:45 · สร้าง Game ใน Python

**บนจอ**
- เปิด Article 03 เลื่อนผ่านโค้ด Guess / State แล้วหยุดที่ `frozen=True`
- ตัดไป terminal: `just wordle` เลือกเล่นเกม พิมพ์ `zzzzz` ให้เห็นข้อความปฏิเสธ แล้วเล่นต่ออีกสองสามตา

**พูด**

มีกติกากับฟังก์ชัน Feedback แล้ว ที่เหลือแทบไม่มีอะไร เกมต้องการแค่สามชิ้น

Guess คือคำหนึ่งคำกับ Feedback ของมัน State คือ Guess ทั้งหมดที่ทายมาแล้ว ซึ่งเป็นทุกอย่างที่ผู้เล่นหรือ Solver มองเห็น และ Game ถือคำตอบ ถือขีดจำกัดหกครั้ง และตัดสินว่าเกมจบหรือยัง

สังเกตว่า State เป็น frozen การทายไม่แก้ State เดิม แต่สร้าง State ใหม่ ข้อดีจะเห็นตอนสร้าง Solver เพราะมันต้องลองหลายทางจาก State เดียวกัน

ลองเล่นดู พิมพ์ zzzzz เกมบอกว่าไม่อยู่ใน Guess List และไม่นับเป็นหนึ่งในหกครั้ง

นี่คือเกมทั้งหมด จากนี้ไปเป็นเรื่องของผู้เล่น
-->

---

# Candidate Set: words that can still be the Answer

<span class="muted">Answer: <Word>abide</Word></span>

<div class="grid grid-cols-[auto_1fr] gap-x-8 gap-y-4 items-center mt-8">
  <span></span><div class="stat items-start"><b>2,315</b></div>
  <Tiles word="crane" marks="00102" />
  <div v-click class="stat items-start"><b>49</b></div>
  <Tiles word="pilot" marks="01000" />
  <div v-click class="stat items-start"><b>4</b><span>abide · aside · maize · waive</span></div>
</div>

<p class="mt-8">Suppose this word <i>is</i> the Answer: does every Guess get the same Feedback?</p>

<Open href="/th/articles/candidate-set?cs.state=crane:00102,pilot:01000#widget-cs">Article 05: State crane, pilot</Open>

<!--
⏱ ฉาก 5 · 7:45 – 10:00 · Candidate Set

**บนจอ**
- เปิดลิงก์ Article 05 ชี้ตัวเลขทางขวาของแต่ละแถว: 2,315 → 49 → 4
- ชี้ 4 คำที่เหลือ: abide, aside, maize, waive
- คลิกกระเบื้อง I ของ pilot ให้เปลี่ยนสี ชี้ตัวเลขที่เปลี่ยน แล้วคลิกกลับ

**พูด**

ได้ Feedback แต่ละครั้ง คำบางคำก็ตกรอบ คำที่ยังเป็นคำตอบได้เรียกว่า Candidate รวมกันทั้งหมดคือ Candidate Set

วิธีทดสอบง่ายมาก สมมติว่าคำนี้ *เป็น* คำตอบ แล้วคิด Feedback ของทุก Guess ที่ทายไป ถ้าตรงกับที่เกมบอกทุกอัน คำนี้รอด ผิดแม้แต่อันเดียว ตกรอบ

[click] ตัวอย่าง คำตอบคือ abide ทายแรก crane ได้ C R N เป็น Absent, A เป็น Present, E เป็น Correct จาก 2,315 คำเหลือ 49

[click] ทายที่สอง pilot มีแค่ I ที่เป็น Present เหลือ 4 คำ: abide, aside, maize, waive

2,315 เป็น 49 เป็น 4 นี่คือหัวใจของการแก้ Wordle Guess ที่ดีคือ Guess ที่ทำให้ตัวเลขนี้ลดลงมาก

ลองคลิกเปลี่ยนสีดู ตัวเลขเปลี่ยนทันที เพราะ Widget นี้ถามเซิร์ฟเวอร์ที่รันโค้ด Python ชุดเดียวกับที่เราเขียน
-->

---

# What makes a good first Guess?

<p class="muted">A Guess doesn't choose its Feedback; the Answer does. A Guess only chooses how to <b>split</b> the words into groups: its Feedback Split</p>

<div class="grid grid-cols-2 gap-10 mt-8 text-center">
<div class="flex flex-col items-center gap-3">
  <Tiles word="crane" />
  <div class="stat"><b>142</b><span>groups</span></div>
  <div class="stat"><b>263</b><span>words in the largest group</span></div>
</div>
<div class="flex flex-col items-center gap-3">
  <Tiles word="fuzzy" />
  <div class="stat"><b>34</b><span>groups</span></div>
  <div class="stat"><b>1,352</b><span>words in the largest group</span></div>
</div>
</div>

<div class="flex justify-center mt-6"><Open href="/th/articles/solving-introduction">Article 04: What makes a good first Guess?</Open></div>

<!--
⏱ ฉาก 6 · 10:00 – 12:45 · อะไรทำให้ Guess แรกดี? (ครึ่งแรก)

**บนจอ**
- เปิด Article 04 เลื่อนถึงหัวข้อ "สองวิธีนับ"

**พูด**

ก่อนทายครั้งแรก คำตอบเป็นได้ทั้ง 2,315 คำ ทายแล้วเราได้ Feedback หนึ่งในไม่เกิน 243 แบบ

ประเด็นคือ Guess ไม่ได้เลือกว่าจะได้ Feedback อะไร คำตอบเป็นคนเลือก สิ่งที่ Guess เลือกได้คือวิธีแบ่งคำทั้งหมดเป็นกลุ่ม หนึ่งกลุ่มต่อหนึ่ง Feedback เราเรียกการแบ่งนี้ว่า Feedback Split

เทียบสองคำ crane แบ่ง 2,315 คำได้ 142 กลุ่ม กลุ่มใหญ่สุดคือคำที่ไม่มี C R A N E เลย 263 คำ ส่วน fuzzy แบ่งได้แค่ 34 กลุ่ม กลุ่มใหญ่สุดมีถึง 1,352 คำ ทายไปส่วนใหญ่ก็แทบไม่ได้อะไร

Guess ที่ดีจึงแบ่งได้หลายกลุ่ม และแต่ละกลุ่มเล็กพอ ๆ กัน คำถามคือ จะให้คะแนนการแบ่งยังไง
-->

---

# Two ways to count

<div class="grid grid-cols-2 gap-10 mt-6">
<div>

### Expected Candidates

$$\sum_i \frac{n_i}{N}\cdot n_i = \frac{\sum_i n_i^2}{N}$$

Words left on average · lower is better

</div>
<div v-click>

### Expected Information

$$\sum_i \frac{n_i}{N}\log_2\frac{N}{n_i}$$

Halvings, in bits · higher is better

</div>
</div>

<p v-click class="mt-6 text-center">10 words split 5, 3, 1, 1 → <b>3.6</b> words left · <b>1.685</b> bits</p>

<div v-click class="grid grid-cols-2 gap-10 mt-6 text-center">
  <div>By bits: <Word>tarse</Word> <b>5.947</b> bits</div>
  <div>By words left: <Word>roate</Word> <b>60.4</b> words <span class="muted">(tarse 66.0)</span></div>
</div>

<!--
⏱ ฉาก 6 · 10:00 – 12:45 · อะไรทำให้ Guess แรกดี? (ครึ่งหลัง)

**บนจอ**
- ใน Article 04 ค้างที่สูตร Expected Candidates แล้วสูตร Expected Information
- ไฮไลต์บรรทัด `expected_left([5, 3, 1, 1])` และ `expected_bits(...)`
- จบที่หัวข้อ "สองวิธีอาจไม่ตรงกัน"

**พูด**

วิธีแรก ถามว่าเฉลี่ยแล้วเหลือกี่คำ กลุ่มที่มี n คำมีโอกาสเกิด n ส่วน N และถ้าเกิดก็เหลือ n คำ เฉลี่ยออกมาเป็นผลรวมของ n กำลังสองหารด้วย N เรียกว่า Expected Candidates ยิ่งน้อยยิ่งดี

[click] วิธีที่สอง ถามว่ากลุ่มนี้หารครึ่งคำทั้งหมดได้กี่ครั้ง เหลือครึ่งหนึ่งคือหนึ่งบิต เหลือหนึ่งในสี่คือสองบิต เฉลี่ยออกมาเป็น Expected Information หน่วยเป็นบิต ยิ่งมากยิ่งดี

[click] ตัวอย่างเล็ก ๆ 10 คำแบ่งเป็นกลุ่ม 5, 3, 1, 1 เฉลี่ยเหลือ 3.6 คำ ได้ 1.685 บิต

สองวิธีวัดสิ่งเดียวกัน แต่ลงโทษกลุ่มใหญ่ไม่เท่ากัน วิธีแรกยกกำลังสอง กลุ่มใหญ่จึงโดนหนัก วิธีที่สองใช้ลอการิทึม โดนเบากว่า ผลคือมันเลือกคำต่างกันจริง ๆ

[click] วัดด้วยบิต คำที่ดีที่สุดคือ tarse 5.947 บิต วัดด้วยจำนวนที่เหลือ คำที่ดีที่สุดคือ roate เฉลี่ยเหลือ 60.4 คำ ส่วน tarse เหลือ 66.0 ไม่มีวิธีไหนผิด เราเก็บไว้ทั้งคู่ แล้วไปดูว่าตอนเล่นจริงแบบไหนชนะ
-->

---

# The Feedback Split of crane

<div class="grid grid-cols-3 gap-6 mt-8 text-center">
  <div class="stat"><b>263</b><span>words in <Tiles word="crane" marks="00000" size="sm" /></span></div>
  <div class="stat"><b>29</b><span>Feedbacks with one word left</span></div>
  <div class="stat"><b>1</b><span><Tiles word="crane" marks="22222" size="sm" /></span></div>
</div>

<div class="grid grid-cols-3 gap-6 mt-12 text-center">
  <div v-click class="stat"><b>78.7</b><span>words left on average</span></div>
  <div v-click class="stat"><b>5.74</b><span>bits</span></div>
  <div v-click class="stat"><b>11.18</b><span>bits = log₂ 2,315 · to pick one word</span></div>
</div>

<p v-click class="mt-10 text-center">With equal groups, 5.74 bits leaves ~43 words; the real split leaves 79 · <Word>fuzzy</Word> leaves 855.7</p>

<div class="flex justify-center gap-4 mt-4">
  <Open href="/th/articles/feedback-split?fs.guess=crane#widget-fs">Article 06: the Split of crane</Open>
  <Open href="/th/opener-split?opener=crane&compare=fuzzy">Opener Split: crane vs fuzzy</Open>
</div>

<!--
⏱ ฉาก 7 · 12:45 – 15:30 · Feedback Split

**บนจอ**
- ลิงก์แรก: ชี้ชื่อแผนภูมิ "Expected 79 words left · 5.74 bits" แล้วคลิกแท่งบนสุด (ห้า Absent) ชี้ biddy, blood
- เลื่อนลงท้ายรายการให้เห็นกลุ่มคำเดียว แล้วพิมพ์ fuzzy ในแถว Guess สด ๆ
- ลิงก์ที่สอง: กด Full screen ค้างภาพ crane กับ fuzzy คู่กันสัก 3 วินาทีโดยไม่พูด

**พูด**

มาดู crane ให้ครบ แต่ละแท่งคือหนึ่ง Feedback วาดเป็นกระเบื้องห้าอัน ความยาวแท่งคือจำนวนคำในกลุ่ม

แท่งบนสุดคือ Absent ทั้งห้าตัว 263 คำที่ไม่มีตัวอักษรของ crane เลย อย่าง biddy, blood ลงไปข้างล่าง มี 29 Feedback ที่เหลือคำเดียว และมีคำเดียวที่ได้ Correct ครบห้าตัว คือ crane เอง

[click] ตัวเลขบนหัวแผนภูมิคือสองคะแนนที่เพิ่งคุยกัน crane เฉลี่ยเหลือ 78.7 คำ [click] และได้ 5.74 บิต

[click] 5.74 บิตแปลว่าอะไร การเลือกหนึ่งคำจาก 2,315 ต้องใช้ log ฐานสองของ 2,315 คือ 11.18 บิต Guess แรกครั้งเดียวจึงพาเรามาได้ราวครึ่งทางแล้ว

[click] ถ้าทุกกลุ่มเท่ากัน 5.74 บิตจะเหลือราว 43 คำ แต่ของจริงเหลือ 79 เพราะกลุ่มใหญ่ดึงค่าเฉลี่ยขึ้น ช่องว่างนี้แหละที่ทำให้สองคะแนนไม่ตรงกัน

ลองพิมพ์ fuzzy ได้ 34 กลุ่ม 1,352 คำกองอยู่กลุ่มเดียว เฉลี่ยเหลือ 855.7 คำ

ภาพนี้คือคำทั้ง 2,315 คำบนจอเดียว ซ้ายคือ crane ขวาคือ fuzzy คงไม่ต้องบอกว่าอันไหนดีกว่า
-->

---

# Openers: ranking all 14,855 first words

<p class="muted">14,855 × 2,315 = over 34 million Feedbacks · looked up in the Feedback Matrix</p>

| Rank (bits) | Opener | | |
| --: | :-- | :-- | :-- |
| 1 | <Word>tarse</Word> | 5.947 bits | not on the Answer List |
| 5 | <Word>raise</Word> | | largest group 168 words |
| 8 | <Word>slate</Word> | | |
| 35 | <Word>crane</Word> | 5.743 bits | largest group 263 words |

<p v-click class="mt-6">Sorted by Expected Candidates, the top spot goes to <Word>roate</Word></p>

<Open href="/th/articles/openers#widget-op">Article 07: the Opener table</Open>

<!--
⏱ ฉาก 8 · 15:30 – 17:00 · Opener

**บนจอ**
- เปิด Article 07 ชี้แถว tarse, raise (อันดับ 5), slate (อันดับ 8) และแถว crane ที่เน้นไว้ใต้ตาราง
- คลิกหัวคอลัมน์ Expected Candidates ให้ roate ขึ้นบน แล้วคลิกหัวคอลัมน์ bits กลับ

**พูด**

Guess แรกของเกมเรียกว่า Opener ทุก Opener เริ่มจากจุดเดียวกัน คือคำตอบที่เป็นไปได้ 2,315 คำ จึงวัดครั้งเดียวแล้วเก็บเป็นตารางได้

14,855 คำ คูณ 2,315 คำตอบ คือ Feedback กว่า 34 ล้านครั้ง ฟังดูเยอะ แต่เร็วมาก เพราะเราคำนวณ Feedback ทุกคู่ไว้ล่วงหน้าในตารางที่เรียกว่า Feedback Matrix แล้วแค่เปิดดู

ที่หนึ่งคือ tarse 5.947 บิต เป็นคำจริง แต่ไม่อยู่ใน Answer List มันจึงไม่มีวันชนะตั้งแต่ตาแรก แต่ก็ยังเป็นวิธีเริ่มที่ดีที่สุด

Opener ที่ดีที่สุดที่เป็นคำตอบได้ด้วยคือ raise อันดับห้า และ slate อันดับแปด

แล้ว crane ล่ะ คำที่ใคร ๆ ก็รู้สึกว่าเป็นตัวเลือกที่ชัดที่สุด อยู่อันดับสามสิบห้า 5.743 บิต ไม่แย่ แต่กลุ่มใหญ่สุดมี 263 คำ ขณะที่ raise มีแค่ 168

[click] ถ้าเรียงด้วย Expected Candidates ที่หนึ่งเปลี่ยนเป็น roate ทันที อันดับขึ้นกับว่าเราวัดด้วยอะไร
-->

---

# Greedy Strategy

<p>Every turn: score every Guess in bits and play the best one · no planning ahead</p>

<div class="grid grid-cols-2 gap-10 mt-6">
<div>

### Candidates only

Guess only words that can still be the Answer

<div class="board mt-4">
  <Tiles word="batch" size="sm" />
  <Tiles word="hatch" size="sm" />
  <Tiles word="latch" size="sm" />
  <Tiles word="match" size="sm" />
  <Tiles word="watch" size="sm" />
</div>

<p class="mt-3">Guess <Word>batch</Word>: <b>0.72</b> bits · the _atch trap</p>

</div>
<div v-click>

### All words

Guess any word on the Guess List

<div class="mt-4 flex flex-col gap-3">
  <div><Word>abamp</Word> has B, M, A: several questions at once → wins in 5</div>
  <div><Word>ablow</Word> <b>1.92</b> bits · no group larger than two words</div>
</div>

</div>
</div>

<div class="flex gap-3 mt-6">
  <Open href="/th/articles/greedy-strategy#widget-trap">Article 08: Candidates only (the trap)</Open>
  <Open href="/th/follow?answer=watch&pool=guesses&scope=global&by=bits&view=path">Follow an Answer: watch</Open>
</div>

<!--
⏱ ฉาก 9 · 17:00 – 20:30 · Greedy Strategy (ครึ่งแรก)

**บนจอ**
- ลิงก์แรก: อยู่ที่ Guess 4 ชี้ 5 Candidate และตาราง Suggestion (0.72 บิต)
- ลิงก์ที่สอง: มุมมอง Answer's path ชี้โหนด abamp แล้วกด Full screen

**พูด**

ตอนนี้เรามีของครบสำหรับสร้าง Solver แล้ว Strategy แรกง่ายที่สุด: ทุกตา ดู Candidate ที่เหลือ ให้คะแนนทุก Guess ด้วยบิต แล้วเล่นคำที่ดีที่สุด เรียกว่า greedy เพราะมันดีที่สุดแค่ตอนนี้ ไม่วางแผนล่วงหน้าเลย

แต่มีการตั้งค่าหนึ่งที่สำคัญมาก คือ Solver หาคำจากไหน แบบแคบคือทายเฉพาะ Candidate คำที่ยังเป็นคำตอบได้ แบบกว้างคือทายคำไหนก็ได้ใน Guess List เราเรียกว่า All words

กลับไปที่ watch ตอนต้นคลิป Solver แบบแคบเหลือ batch, hatch, latch, match, watch ห้าคำที่ลงท้ายด้วย atch เหมือนกันหมด

ปัญหาคือทุกคำในนั้นเป็นคำถามที่แย่ ทาย batch ถ้าไม่ใช่ ก็รู้แค่ว่าตัวแรกไม่ใช่ B ได้แค่ 0.72 บิต นี่คือกับดัก atch กลุ่มคำที่ต่างกันตัวเดียวเป็นกับดักของทุก Strategy ที่ทายแต่ Candidate เพราะแต่ละคำตัดได้แค่ตัวมันเอง

[click] ทีนี้ปล่อยให้ Solver ทายคำไหนก็ได้ มันเปิดด้วย tarse พอเหลือห้าคำ มันเล่น abamp คำแปลก ๆ ที่เป็นคำตอบไม่ได้ แต่มี B, M และ A อยู่ด้วยกัน มันจึงถามหลายคำถามในทีเดียว Feedback ที่ได้แยกห้าคำออกจากกัน แล้วชนะใน 5 Guess

หน้า Follow an Answer แสดงเส้นทางทั้งหมด แต่ละกล่องคือคำที่เหลือหลังแต่ละ Guess

อีกตัวเลขหนึ่ง จากห้าคำเดิม ทาย batch ได้ 0.72 บิต แต่คำที่ดีที่สุดในรายการทั้งหมดคือ ablow ได้ 1.92 บิต และไม่มีกลุ่มไหนเกินสองคำ มันชนะตานี้ไม่ได้ แต่แทบการันตีว่าชนะตาหน้า
-->

---
layout: center
class: text-center
---

# A Guess that can't win can still be the best Guess

<p class="muted mt-6">One exception: with two words left, guess one of them</p>

<div class="mt-10"><Open href="/th/articles/greedy-strategy#widget-race">Article 08: Side-by-side Game</Open></div>

<!--
⏱ ฉาก 9 · 17:00 – 20:30 · Greedy Strategy (ครึ่งหลัง)

**บนจอ**
- ลิงก์ Side-by-side Game: ปล่อยให้เล่นเองครบหนึ่งรอบ (ราว 20 วินาที) แล้วพูดทับตอนท้าย

**พูด**

นี่คือสาม Strategy เล่นคำตอบชุดเดียวกันพร้อมกัน มีแค่กระดาน All words ที่กล้าเล่นคำที่ชนะไม่ได้

บทเรียนของ Article นี้สั้น ๆ: Guess ที่ชนะไม่ได้ ก็ยังเป็น Guess ที่ดีที่สุดได้ ข้อยกเว้นเดียวคือตอนเหลือสองคำ ทายหนึ่งในนั้นไปเลยไม่มีวันแย่กว่า Solver ของเราจึงกลับมาทายแต่ Candidate ตรงนั้น
-->

---

# Benchmark: 2,315 Games per Strategy

<p class="muted">Guess Pool (Answer List / Guess List) × Search Scope (Candidates only / All words) × Ranking (bits / words left) = 8 Strategies</p>

| Strategy | Opener | Average | Losses | |
| :-- | :-- | --: | --: | :-- |
| bits · Guess List · All words | <Word>tarse</Word> | **3.43** | 0 | 3 Guesses 1,256 · 4 Guesses 943 · 6 Guesses 2 |
| words left · Guess List · All words | <Word>roate</Word> | 3.48 | 0 | no Game reaches 6 |
| bits · Answer List · Candidates only | <Word>raise</Word> | 3.60 | **11** | atch · o_er · gra_e · aste |

<p v-click class="mt-6">From the same State, All words plays <Word>ablow</Word> or <Word>bafta</Word> and wins all 11</p>

<p v-click><b>Losses 11 → 0</b> by allowing Guesses that can't win · bits and words left differ by at most 0.05 Guesses</p>

<div class="flex gap-3">
  <Open href="/th/articles/benchmark#widget-bm">Article 09: all eight Benchmarks</Open>
  <Open href="/th/articles/benchmark?bm.strategies=bits-answers-candidates,bits-guesses-all#widget-bm">Article 09: narrow vs wide</Open>
</div>

<!--
⏱ ฉาก 10 · 20:30 – 23:00 · Benchmark

**บนจอ**
- ลิงก์แรก: ชี้แท่ง 3 Guess ที่สูงที่สุด แล้วชี้กลุ่ม "Lost" ทางขวา
- คลิกแท็บเปรียบเทียบทีละอัน (Expected Information / Expected Candidates, Candidates only / All words)
- ลิงก์ที่สอง: เหลือสอง Strategy เลื่อนลงไปที่กระดาน 11 Loss และ "Same State, two searches"

**พูด**

เกมเดียวเล่าได้เรื่องเดียว จะเทียบ Strategy ต้องเล่นให้ครบ Benchmark คือการเล่นทุกคำตอบใน Answer List ด้วย Strategy เดียว 2,315 เกม แล้วนับว่าแต่ละเกมใช้กี่ Guess

Strategy ของเรามีสามตัวเลือก เลือกคำจาก Answer List หรือ Guess List ค้นแค่ Candidate หรือ All words และวัดด้วยบิตหรือจำนวนที่เหลือ สองคูณสองคูณสอง ได้แปด Strategy

ตัวที่ดีที่สุดคือ บิต, Guess List, All words เปิดด้วย tarse ไม่แพ้สักเกม เฉลี่ย 3.43 Guess ชนะใน 3 ตา 1,256 เกม ใน 4 ตา 943 เกม และใช้ถึง 6 ตาแค่ 2 เกม

ถ้าวัดด้วยจำนวนที่เหลือ เปิดด้วย roate ก็ไม่แพ้เหมือนกัน เฉลี่ย 3.48 ช้ากว่านิดเดียว แต่นิ่งกว่า ไม่มีเกมไหนถึงหกตา

แล้วตัวแคบล่ะ ทายแต่คำใน Answer List และแต่ Candidate เปิดด้วย raise เฉลี่ย 3.60 และแพ้ 11 เกม ดูกระดานพวกนี้ ทุกเกมที่แพ้คือกับดักแบบเดียวกัน atch, o_er, gra_e, aste กลุ่มคำหน้าตาคล้ายกันที่ Solver ไล่ทายทีละคำจนหมดตา

[click] ส่วนตัวกว้าง จาก State เดียวกันเป๊ะ มันเล่น ablow หรือ bafta คำที่ชนะไม่ได้แต่แยกกลุ่มออก แล้วชนะครบทั้ง 11 เกม ส่วนใหญ่ใน 4 หรือ 5 ตา

[click] สรุป Benchmark: สิ่งเดียวที่เปลี่ยนผลมากที่สุด คือยอมให้ Solver ทายคำที่ชนะไม่ได้ Loss ลดจาก 11 เหลือ 0 ส่วนจะวัดด้วยบิตหรือจำนวนที่เหลือ สำคัญน้อยกว่ามาก ห่างกันไม่เกิน 0.05 Guess
-->

---

# Greedy vs optimal

<div class="grid grid-cols-2 gap-10 mt-10 text-center">
<div class="flex flex-col items-center gap-3">
  <span class="muted">Optimal · Alex Selby, Jan 2022</span>
  <Tiles word="salet" />
  <div class="stat"><b>7,920</b><span>total Guesses · average 3.4212 · never more than 5</span></div>
</div>
<div class="flex flex-col items-center gap-3">
  <span class="muted">Our Greedy Strategy</span>
  <Tiles word="tarse" />
  <div class="stat"><b>7,939</b><span>total Guesses · average 3.4294</span></div>
</div>
</div>

<p v-click class="mt-10 text-center"><b>19</b> Guesses apart = <b>0.008</b> per Game ≈ ¼ of 1% · one extra Guess every four months</p>

<p class="muted text-sm text-center">Selby's Guess List has 12,972 words, ours 14,855: close, but not exact</p>

<div class="flex justify-center"><Open href="/th/articles/greedy-vs-optimal">Article 10: Greedy vs optimal</Open></div>

<!--
⏱ ฉาก 11 · 23:00 – 24:45 · Greedy เทียบกับ Optimal

**บนจอ**
- เปิด Article 10 ค้างที่รายการตัวเลขของ salet แล้วตัวเลขของ tarse ใต้กัน
- ชี้ margin note เรื่อง Guess List 12,972 คำ (ถ้าจอแคบจะอยู่ในเนื้อความ)
- B-roll ทางเลือก: หน้าเว็บของ Alex Selby และ paper ใน Operations Research (ลิงก์อยู่ในบทความ)

**พูด**

Solver ของเราเป็น greedy ไม่เคยวางแผน คำถามที่ตามมาคือ มันห่างจากการเล่นที่สมบูรณ์แบบแค่ไหน

เราไม่ได้คำนวณ Strategy ที่สมบูรณ์แบบเอง เพราะต้องค้นทุกทางของทุกเกม แต่มีคนทำไว้แล้ว มกราคม 2022 Alex Selby พบว่า Strategy ที่ดีที่สุดเปิดด้วย salet ใช้รวม 7,920 Guess กับคำตอบทั้ง 2,315 คำ เฉลี่ย 3.4212 และไม่เคยเกินห้าตา ต่อมา Bertsimas กับ Paskov พิสูจน์ผลเดียวกันอย่างแน่นอน ตีพิมพ์ใน Operations Research

ของเรา tarse ใช้ 7,939 Guess เฉลี่ย 3.4294

[click] ห่างกันรวม 19 Guess หรือ 0.008 ต่อเกม ราวหนึ่งในสี่ของหนึ่งเปอร์เซ็นต์ ถ้าเล่น Wordle ทุกวัน Solver ของเราจะเสีย Guess เกินมาหนึ่งครั้งทุกสี่เดือน

ขอบอกตามตรง Guess List ของ Selby มี 12,972 คำ ของเรามี 14,855 คำตอบชุดเดียวกัน แต่คำทายไม่เหมือนกัน การเทียบนี้จึงใกล้เคียง แต่ไม่ตรงเป๊ะ

ที่น่าสนใจคือ salet อยู่แค่อันดับสิบในตารางบิตของเรา Strategy ที่ดีที่สุดยอมเสียข้อมูลนิดหน่อยในตาแรก เพื่อปูทางให้ตาสองดีขึ้น แต่การวัดแบบมองขั้นเดียวก็มาได้ใกล้ขนาดนี้ Guess ที่ตัดคำได้ดีตอนนี้ มักตัดได้ดีตอนหลังด้วย
-->

---

# Opener Distribution: every first word, played to the end

<p class="muted">14,855 Openers × 2,315 Games · Strategy: bits · Guess List · All words</p>

<div class="grid grid-cols-2 gap-10 mt-6 text-center">
  <div class="stat"><b>3.429</b><span>best: <Word>tarse</Word></span></div>
  <div class="stat"><b>4.117</b><span>worst: <Word>qajaq</Word> (still never loses)</span></div>
</div>

<div class="grid grid-cols-2 gap-10 mt-8">
<div v-click>

**Common letters**

<Word>salet</Word> 3 · <Word>crate</Word> 4 · <Word>trace</Word> 5 · <Word>slate</Word> 6 · <Word>crane</Word> 7 <span class="muted">(bits: 35)</span> · <Word>raise</Word> 95 <span class="muted">(bits: 5)</span>

</div>
<div v-click>

**Vowel-heavy**

<Word>adieu</Word> 7,062 · <Word>audio</Word> 8,241 · <Word>ouija</Word> 14,197

</div>
</div>

<div class="flex gap-3 mt-8">
  <Open href="/th/articles/opener-distribution#widget-od">Article 11: Opener Distribution</Open>
  <Open href="/th/openers?highlight=tarse,salet,crane,slate,raise,adieu,audio,ouija,qajaq">Opener Distribution: famous words</Open>
</div>

<!--
⏱ ฉาก 12 · 24:45 – 27:45 · Opener Distribution

**บนจอ**
- ลิงก์แรก: คลิกแท็บทีละอัน ชี้ tarse ล่างสุดซ้าย และ qajaq ปลายขวา
- ลิงก์ที่สอง: ชี้ทีละคำตามบทพูด (adieu, audio, ouija ฝั่งขวา; crane, slate, salet ฝั่งซ้าย)
- ทางเลือก: ติ๊ก Only Openers on the Answer List แล้วชี้ jazzy

**พูด**

Benchmark เล่นแค่ Opener เดียวต่อ Strategy แต่คำแรกเป็นคำไหนก็ได้ใน 14,855 คำ งั้นเล่นให้ครบทุกคำ

ทุกคำใน Guess List เป็น Opener ของ 2,315 เกม Solver เล่นแต่ละเกมจนจบ รวม 14,855 คูณ 2,315 เกม เก็บตัวเลขเดียวต่อเกม คือใช้กี่ Guess แล้วเฉลี่ยต่อคำ

ในกราฟ แต่ละบล็อกคือหนึ่ง Opener ซ้อนเป็นแท่งกว้าง 0.01 Guess ตัวที่ดีที่สุดอยู่ล่างสุด

ที่หนึ่งคือ tarse เฉลี่ย 3.429 ที่โหล่คือ qajaq 4.117 คำแรกที่ดีที่สุดกับแย่ที่สุดต่างกันไม่ถึงหนึ่ง Guess คำแรกสำคัญ แต่ไม่เท่าการเล่นตาที่เหลือให้ดี และแม้แต่ qajaq ก็ไม่เคยแพ้

[click] crane ที่เคยอยู่อันดับ 35 ในตารางบิต พอเล่นจริงขึ้นมาอันดับ 7 ห่าง tarse ไม่ถึงหนึ่งในร้อย Guess ส่วน raise ที่เคยอยู่อันดับ 5 ตกไปอันดับ 95 สองอันดับไม่ตรงกัน เพราะบิตวัดแค่ตาแรก แต่เกมมีหลายตา

[click] แล้วคำยอดนิยมล่ะ ทีมสระเยอะอ่อนที่สุด adieu อันดับ 7,062 ครึ่งหนึ่งของ Guess List เปิดได้ดีกว่ามัน audio อันดับ 8,241 และ ouija เกือบท้ายตาราง อันดับ 14,197 สระสี่ตัวบอกเรื่องสระได้เยอะ แต่เรื่องอื่นแทบไม่บอกเลย

ทีมตัวอักษรยอดฮิตสมชื่อ crate อันดับ 4, trace 5, slate 6, crane 7

สุดท้าย ศึก salet กับ slate ใน Strategy นี้ salet อันดับ 3 slate อันดับ 6 รวม 2,315 เกมต่างกันแค่ 13 Guess ถือว่าเสมอ แต่ slate ได้เปรียบอยู่ข้อหนึ่ง มันเป็นคำตอบได้ หนึ่งในสองพันกว่าเกม มันชนะตั้งแต่ตาแรก ซึ่ง salet ทำไม่ได้เลย
-->

---
layout: center
class: text-center
---

# Takeaways

<div class="flex flex-col gap-4 mt-8 text-left">
  <p>A good Guess isn't the one likely to be right; it's the one that splits the remaining words smallest</p>
  <p v-click>Sometimes the best word is one that can never be the Answer</p>
  <p v-click>A Solver that looks one turn ahead is within ¼ of 1% of perfect</p>
</div>

<div v-click class="mt-10 flex justify-center gap-8 items-center">
  <span>Best average <Word>tarse</Word> <Word>salet</Word></span>
  <span>A shot at turn one <Word>slate</Word></span>
  <span class="muted">Drop <Word>adieu</Word></span>
</div>

<div class="mt-10"><Open href="/th/openers">Try your first word: Opener Distribution</Open></div>

<!--
⏱ ฉาก 13 · 27:45 – 28:45 · ปิดท้าย

**บนจอ**
- กลับหน้าแรกของเว็บ เลื่อนช้า ๆ ผ่านรายการ Article ทั้ง 11 บท
- จบที่หัวข้อ Explore ค้างไว้ระหว่างพูดประโยคสุดท้าย

**พูด**

สรุปทั้งหมดในหนึ่งนาที

Wordle ดูเหมือนเกมคำศัพท์ แต่ถ้าจะเล่นให้เก่ง มันคือเกมของการนับ Guess ที่ดีไม่ใช่ Guess ที่มีโอกาสถูก แต่เป็น Guess ที่แบ่งคำที่เหลือให้เล็กที่สุด [click] บางครั้งคำที่ดีที่สุดคือคำที่ไม่มีวันเป็นคำตอบ [click] และ Solver ง่าย ๆ ที่มองแค่ตาเดียว ก็เล่นห่างจากสมบูรณ์แบบไม่ถึงหนึ่งในสี่ของหนึ่งเปอร์เซ็นต์

[click] อยากได้ค่าเฉลี่ยดีที่สุด เปิดด้วย tarse หรือ salet อยากมีลุ้นชนะตั้งแต่ตาแรกด้วย เปิดด้วย slate และถ้าคุณเปิดด้วย adieu อยู่ ตอนนี้รู้แล้วว่าควรเปลี่ยน

ทุก Widget ในคลิปเปิดเล่นได้บนเว็บ ลองพิมพ์คำแรกที่คุณชอบในหน้า Opener Distribution แล้วคอมเมนต์บอกหน่อยว่าได้อันดับเท่าไร

ขอบคุณที่ดูจนจบ
-->

---
layout: center
---

# Chapters for the video description

```text
0:00 Solver ที่แพ้ทั้งที่เลือกดีที่สุดทุกตา
1:15 แผนที่ของคลิป
2:15 กติกาและสองรายการคำ
4:00 Feedback และกฎตัวอักษรซ้ำ
6:30 สร้าง Game ใน Python
7:45 Candidate Set
10:00 อะไรทำให้ Guess แรกดี?
12:45 Feedback Split
15:30 จัดอันดับ Opener
17:00 Greedy Strategy และกับดัก _atch
20:30 Benchmark ทั้งแปด Strategy
23:00 Greedy เทียบกับ Optimal
24:45 Opener Distribution
27:45 ปิดท้าย
```

<!--
ไม่อยู่ในคลิป คัดลอกรายการไปวางในคำอธิบาย YouTube (ภาษาไทย ตามคลิป) แล้วแก้เวลาให้ตรงกับคลิปที่ตัดเสร็จ เวลาชุดเดียวกันใส่ใน frontmatter `video` ของแต่ละ Article ได้ด้วย
-->
