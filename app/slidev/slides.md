---
# The Thai YouTube video of the Solving Wordle Series: about 28 minutes in 14 scenes that follow the eleven Articles.
# The lines to say and what to click are in each slide's presenter notes (press P, or open /presenter).
# Every number here is from the Thai Articles (app/frontend/content/th/articles/).
theme: default
title: การแก้ Wordle
info: สไลด์และบทพูดของคลิป YouTube Series การแก้ Wordle
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

# การแก้ Wordle

ด้วยการนับกับลอการิทึม

<div class="mt-10 flex flex-col items-center gap-2">
  <Tiles word="tarse" marks="00000" size="lg" />
</div>

<!--
**ก่อนอัด** (สไลด์นี้ไม่ได้อยู่ในคลิป)

1. รัน `just web` (backend + frontend) และถ้า Opener Distribution ว่าง ให้รัน `just cache restore` ก่อน
2. ตั้ง theme ของเว็บเป็น Rosé Pine Dawn และภาษาเป็น ไทย, ซูมเบราว์เซอร์ 125%, ซ่อน bookmarks bar
3. เปิดสไลด์ด้วย `just slides` แล้วกด P เพื่อเปิดโหมดผู้นำเสนอ (บทพูดอยู่ตรงนี้ เวลาอยู่มุมบน)
4. ลิงก์ ↗ บนสไลด์เปิดหน้าเว็บในแท็บใหม่ ตรงสถานะของ Widget ที่ต้องใช้ เปิดล่วงหน้าเรียงตามฉากได้
5. เตรียม terminal ไว้ที่โฟลเดอร์ repo สำหรับฉาก 4 (`just wordle`)
6. ทางเลือก: ฉาก 2 ใช้แอนิเมชัน `just animate present what_is_wordle` (ประมาณ 60 วินาที) แทนหน้า Article ได้

บทพูดไม่ได้ใส่ ครับ/ค่ะ ไว้ เติมตามสไตล์ตัวเองตอนอ่าน
-->

---
layout: two-cols
---

# Solver ที่แพ้ทั้งที่เลือกดีที่สุดทุกตา

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

<p class="mt-3" style="color: var(--love, #b4637a)">Guess 8 · Wordle ให้แค่ 6</p>

::right::

<div v-click class="mt-24 flex flex-col items-center gap-4">
  <span class="muted">ให้ทายคำไหนก็ได้</span>
  <Tiles word="abamp" size="lg" />
  <span>ชนะใน <b>5</b> Guess</span>
</div>

<div class="mt-16 flex justify-center">
  <Open href="/th/articles/greedy-strategy#widget-trap">Article 08: กับดัก _atch</Open>
</div>

<!--
⏱ ฉาก 0 · 0:00 – 1:15 · Hook

**บนจอ**
- เปิดลิงก์ Article 08 ที่ Widget ตัวแรก (Answer watch, Answer List, Candidates only) ซึ่งเริ่มที่ Guess 4
- กด Prev กลับไป Guess 1 แล้วกด Next ช้า ๆ จนถึง Guess 8 หยุดค้างที่เส้น Guess Limit
- ตัดไปที่ Widget ตัวที่สองข้างล่าง (All words) กด Next จนเห็น abamp และ Win (หรือคลิกสไลด์ให้ abamp ขึ้น)

**พูด**

นี่คือโปรแกรมที่เล่น Wordle ด้วยคณิตศาสตร์ คำตอบคือ watch

มันเปิดด้วย raise ต่อด้วย tangy แล้วก็ caput เหลือคำที่เป็นไปได้แค่ห้าคำ: batch, hatch, latch, match, watch

จากนั้นมันก็ทายไล่ทีละคำ batch ไม่ใช่ hatch ไม่ใช่ latch ไม่ใช่ match ไม่ใช่... กว่าจะเจอ watch ก็ Guess ที่แปด Wordle ให้แค่หก แปลว่าแพ้

ที่แปลกคือ ทุกตาที่ผ่านมา มันเลือก Guess ที่ดีที่สุดเท่าที่มันมองเห็นแล้ว

[click] ทางแก้ก็แปลกพอกัน คือให้มันทายคำที่ *ไม่มีทาง* เป็นคำตอบ อย่าง abamp แล้วมันชนะใน 5 Guess

คลิปนี้เราจะไล่ตั้งแต่กติกา สร้างเกม แล้วค่อย ๆ สร้าง Solver ที่เล่น Wordle ห่างจากการเล่นที่สมบูรณ์แบบไม่ถึงหนึ่งในสี่ของหนึ่งเปอร์เซ็นต์ และทุกอย่างที่เห็นในคลิป คุณเปิดเล่นเองได้บนเว็บ ลิงก์อยู่ใต้คลิป
-->

---

# แผนที่ของคลิป

<div class="grid grid-cols-2 gap-10 mt-10">
<div>

### Part 1 · Wordle

- กติกาและสองรายการคำ
- Feedback และตัวอักษรซ้ำ
- สร้าง Game ใน Python

</div>
<div>

### Part 2 · การแก้ Wordle

- Candidate Set
- สองวิธีให้คะแนน Guess
- Feedback Split และ Opener
- Greedy Strategy และ Benchmark
- เทียบกับ Optimal
- Opener Distribution

</div>
</div>

<p class="mt-10 muted text-center">คณิตศาสตร์ที่ใช้: การนับ กับ ลอการิทึม</p>

<div class="flex justify-center"><Open href="/th">หน้าแรก: Series การแก้ Wordle</Open></div>

<!--
⏱ ฉาก 1 · 1:15 – 2:15 · แผนที่ของคลิป

**บนจอ**
- เปิดหน้าแรกของเว็บ เลื่อนช้า ๆ ผ่าน Part 1 และ Part 2 แล้วหยุดที่หัวข้อ Explore
- ชี้ sidebar ด้านซ้ายแวบเดียว

**พูด**

เว็บนี้แบ่งเป็นสองส่วน

ส่วนแรกชื่อ Wordle เราจะเรียนกติกา เรียนว่าเกมให้สีกับตัวอักษรแต่ละตัวยังไง โดยเฉพาะตอนที่ตัวอักษรซ้ำ แล้วเขียนเกมเล่นได้จริงใน Python

ส่วนที่สองคือการแก้ Wordle เราจะถามว่า Guess หนึ่งครั้งบอกอะไรเรา วัดมันได้สองวิธี สร้าง Solver ที่เล่นจนจบ เอาไปแข่งกับการเล่นที่ดีที่สุดเท่าที่เป็นไปได้ และสุดท้ายลองทุกคำแรกที่เป็นไปได้ หนึ่งหมื่นสี่พันกว่าคำ ว่าคำไหนเปิดเกมได้ดีจริง

คณิตศาสตร์ที่ใช้มีแค่การนับกับลอการิทึม ไม่ต้องกลัว
-->

---

# กติกา

<div class="grid grid-cols-4 gap-6 mt-8 text-center">
  <div class="stat"><b>1</b><span>Answer ห้าตัวอักษร</span></div>
  <div class="stat"><b>6</b><span>Guess</span></div>
  <div class="stat"><b>5</b><span>Feedback ทีละตัวอักษร</span></div>
  <div class="stat"><b>W / L</b><span>Win หรือ Loss</span></div>
</div>

<div v-click class="grid grid-cols-2 gap-10 mt-14 text-center">
  <div class="stat"><b>2,315</b><span>Answer List · คำที่เป็นคำตอบได้</span></div>
  <div class="stat"><b>14,855</b><span>Guess List · คำที่ทายได้ (รวม Answer List)</span></div>
</div>

<p v-click class="mt-8 text-center">ทาย <Word>tarse</Word> ได้ แต่มันไม่มีวันเป็นคำตอบ</p>

<div class="flex justify-center mt-4"><Open href="/th/articles/rules">Article 01: กติกา</Open></div>

<!--
⏱ ฉาก 2 · 2:15 – 4:00 · กติกาและสองรายการคำ

**บนจอ**
- เปิด Article 01 เลื่อนผ่านย่อหน้าแรกถึงหัวข้อ "สองรายการคำ"
- ไฮไลต์บรรทัด `(2315, 14855)` ในโค้ด
- เลื่อนลงให้เห็นรายการคำ Answer List ท้ายบท

**พูด**

กติกาของ Wordle มีน้อยมาก

มีคำลับห้าตัวอักษรหนึ่งคำ เราเรียกว่า Answer เราทายได้หกครั้ง แต่ละครั้งเรียกว่า Guess หลังทายแต่ละครั้ง เกมจะบอกผลกลับมาทีละตัวอักษร ซึ่งเราเรียกว่า Feedback ทายถูกภายในหกครั้งคือ Win ไม่ถูกคือ Loss

[click] แต่มีรายละเอียดหนึ่งที่คนส่วนใหญ่ไม่รู้ เกมเก็บคำไว้ *สอง* รายการ

รายการแรกคือ Answer List คำที่เป็นคำตอบได้ มี 2,315 คำ เป็นคำธรรมดาที่คนใช้กัน อย่าง crane, abide, watch

รายการที่สองคือ Guess List คำทุกคำที่เกมยอมให้ทาย มีถึง 14,855 คำ และรวม Answer List ไว้ทั้งหมด

[click] ดังนั้นคุณทายคำแปลก ๆ อย่าง tarse ได้ เกมรับ แต่มันจะไม่มีวันเป็นคำตอบ

จำความต่างนี้ไว้ เพราะอีกครึ่งชั่วโมงข้างหน้า มันจะกลายเป็นเรื่องใหญ่

ถ้ามองแบบนักคณิตศาสตร์ ปริศนานี้คือ คำตอบเป็นหนึ่งใน 2,315 คำ และเราถามได้หกคำถาม ที่เหลือของคลิปนี้คือการเรียนวิธีถามคำถามให้ดีขึ้น
-->

---

# Feedback: สามแบบ ห้าตัวอักษร

<div class="grid grid-cols-3 gap-6 mt-8 text-center">
  <div class="flex flex-col items-center gap-2"><Tiles word="a" marks="2" size="lg" /><span>Correct · ตรงตำแหน่ง</span></div>
  <div class="flex flex-col items-center gap-2"><Tiles word="a" marks="1" size="lg" /><span>Present · อยู่ที่อื่น</span></div>
  <div class="flex flex-col items-center gap-2"><Tiles word="a" marks="0" size="lg" /><span>Absent · ไม่มีในคำตอบ</span></div>
</div>

<div v-click class="mt-14 text-center">

$3^5 = 243$ Feedback ที่เป็นไปได้

</div>

<!--
⏱ ฉาก 3 · 4:00 – 6:30 · Feedback และกฎตัวอักษรซ้ำ (ครึ่งแรก)

**พูด**

Feedback ให้ตัวอักษรแต่ละตัวหนึ่งในสามแบบ Correct คืออยู่ในคำตอบและอยู่ตรงตำแหน่งนี้ Present คืออยู่ในคำตอบแต่อยู่ที่อื่น และ Absent คือคำตอบไม่ต้องการตัวนี้

[click] สามแบบ ห้าตัวอักษร ได้ Feedback ที่เป็นไปได้ 3 ยกกำลัง 5 เท่ากับ 243 แบบ จำเลขนี้ไว้ มันคือจำนวนคำตอบที่หลากหลายที่สุดที่ Guess เดียวจะได้กลับมา
-->

---

# ตัวอักษรซ้ำ: คิดเป็นสองรอบ

<div class="grid grid-cols-2 gap-10 mt-8">
<div class="flex flex-col items-center gap-3">
  <span class="muted">Guess <Word>speed</Word> · Answer <Word>abide</Word></span>
  <Tiles word="speed" marks="00101" size="lg" />
  <span class="text-sm">E ตัวที่สองเป็น Absent: E ตัวเดียวของคำตอบถูกใช้ไปแล้ว</span>
  <Open href="/th/articles/feedback?fb.guess=speed&fb.answer=abide#widget-fb">Article 02: speed กับ abide</Open>
</div>
<div v-click class="flex flex-col items-center gap-3">
  <span class="muted">Guess <Word>eerie</Word> · Answer <Word>crane</Word></span>
  <Tiles word="eerie" marks="00102" size="lg" />
  <span class="text-sm">รอบแรกยก E ให้ตัวท้ายไปก่อน</span>
  <Open href="/th/articles/feedback?fb.guess=eerie&fb.answer=crane#widget-fb">Article 02: eerie กับ crane</Open>
</div>
</div>

<ol class="mt-10">
  <li><b>รอบแรก</b> ทุกตัวที่ตรงตำแหน่งได้ Correct</li>
  <li><b>รอบสอง</b> ซ้ายไปขวา ถ้าคำตอบยังมีตัวนั้นเหลือ ได้ Present ไม่งั้น Absent</li>
</ol>

<!--
⏱ ฉาก 3 · 4:00 – 6:30 · Feedback และกฎตัวอักษรซ้ำ (ครึ่งหลัง)

**บนจอ**
- ลิงก์แรก: ชี้กระเบื้องทีละตัว แล้วชี้คำอธิบายสองรอบใต้ Widget
- ลิงก์ที่สอง (หรือพิมพ์ใน Widget เองสด ๆ): eerie กับ crane ชี้ E ตัวสุดท้ายที่เป็น Correct
- ถ้ามีเวลา ให้ผู้ชมเห็นการพิมพ์คำที่ไม่อยู่ใน Guess List เช่น `zzzzz` แล้วแถวสั่น

**พูด**

ส่วนที่ยากคือตัวอักษรซ้ำ ลองดู Guess คือ speed และคำตอบคือ abide

speed มี E สองตัว แต่ abide มี E ตัวเดียว E ตัวแรกเป็น Present แต่ E ตัวที่สองกลับเป็น Absent ทั้งที่ E อยู่ในคำตอบจริง ๆ เพราะ E ตัวเดียวของคำตอบถูกใช้ไปแล้ว

กฎคือ ตัวอักษรหนึ่งได้สีไม่เกินจำนวนครั้งที่มันอยู่ในคำตอบ และเพื่อให้ยุติธรรม เกมคิดเป็นสองรอบ

รอบแรก ให้ Correct กับทุกตัวที่ตรงตำแหน่งก่อน รอบสอง ไล่จากซ้ายไปขวาในตัวที่เหลือ ถ้าคำตอบยังมีตัวนั้นเหลือ ก็ให้ Present ถ้าไม่มีแล้ว ก็ Absent

[click] ลำดับนี้สำคัญ ลอง eerie กับ crane E ตัวเดียวของ crane อยู่ท้ายคำ และ eerie ก็ลงท้ายด้วย E เหมือนกัน รอบแรกยก E นั้นให้ตัวท้ายเป็น Correct ไปแล้ว E สองตัวข้างหน้าจึงเป็น Absent ทั้งคู่ ถ้าเราไล่จากซ้ายตั้งแต่แรก E ตัวแรกจะได้ Present ไป และผลจะผิด

ฟังก์ชันนี้สั้นนิดเดียว แต่ทุกอย่างที่เหลือในคลิปนี้สร้างอยู่บนมัน
-->

---

# สร้าง Game ใน Python

<div class="grid grid-cols-3 gap-6 mt-8">
<div>

### Guess

คำหนึ่งคำ กับ Feedback ของมัน

</div>
<div>

### State

Guess ทั้งหมดที่ทายมาแล้ว: ทุกอย่างที่ผู้เล่นมองเห็น

</div>
<div>

### Game

ถือ Answer และ Guess Limit ตัดสินว่าจบหรือยัง

</div>
</div>

```python {2}
@dataclass(frozen=True)
class State:
    guesses: tuple[Guess, ...] = ()
```

<p class="muted">ทายแล้วได้ State ใหม่ ไม่แก้ State เดิม</p>

<div class="flex gap-4 items-center">
  <Open href="/th/articles/building-the-game">Article 03: การสร้าง Game</Open>
  <code>just wordle</code>
</div>

<!--
⏱ ฉาก 4 · 6:30 – 7:45 · สร้าง Game ใน Python

**บนจอ**
- เปิด Article 03 เลื่อนผ่านโค้ด Guess / State แล้วหยุดที่ `frozen=True`
- ตัดไป terminal: `just wordle` เลือกเล่นเกม พิมพ์ `zzzzz` ให้เห็นข้อความปฏิเสธ แล้วเล่นต่ออีกสองสามตา

**พูด**

มีกติกากับฟังก์ชัน Feedback แล้ว ที่เหลือแทบไม่มีอะไร เกมต้องการแค่สามชิ้น

Guess คือคำหนึ่งคำพร้อม Feedback ของมัน State คือ Guess ทั้งหมดที่ทายมาแล้ว ซึ่งเป็นทุกอย่างที่ผู้เล่นหรือ Solver มองเห็น และ Game ที่ถือคำตอบ ถือขีดจำกัดหกครั้ง และตัดสินว่าเกมจบหรือยัง

สังเกตว่า State เป็น frozen การทายไม่ได้แก้ State เดิม แต่สร้าง State ใหม่ ประโยชน์จะเห็นตอนสร้าง Solver เพราะมันต้องลองหลายทางจาก State เดียวกัน

ลองเล่นดู ถ้าพิมพ์ zzzzz เกมบอกว่าไม่อยู่ใน Guess List และไม่นับเป็นหนึ่งในหกครั้ง

นี่คือเกมทั้งหมดแล้ว จากนี้ไป ทุกอย่างเป็นเรื่องของผู้เล่น
-->

---

# Candidate Set: คำที่ยังเป็นคำตอบได้

<span class="muted">Answer: <Word>abide</Word></span>

<div class="grid grid-cols-[auto_1fr] gap-x-8 gap-y-4 items-center mt-8">
  <span></span><div class="stat items-start"><b>2,315</b></div>
  <Tiles word="crane" marks="00102" />
  <div v-click class="stat items-start"><b>49</b></div>
  <Tiles word="pilot" marks="01000" />
  <div v-click class="stat items-start"><b>4</b><span>abide · aside · maize · waive</span></div>
</div>

<p class="mt-8">สมมติว่าคำนี้ <i>เป็น</i> คำตอบ: Feedback ของทุก Guess ตรงกันไหม?</p>

<Open href="/th/articles/candidate-set?cs.state=crane:00102,pilot:01000#widget-cs">Article 05: State crane, pilot</Open>

<!--
⏱ ฉาก 5 · 7:45 – 10:00 · Candidate Set

**บนจอ**
- เปิดลิงก์ Article 05 ชี้ตัวเลขทางขวาของแต่ละแถว: 2,315 → 49 → 4
- ชี้ 4 คำที่เหลือ: abide, aside, maize, waive
- คลิกกระเบื้อง I ของ pilot ให้เปลี่ยนสี แล้วชี้ตัวเลขที่เปลี่ยน จากนั้นคลิกกลับ

**พูด**

ทุกครั้งที่ได้ Feedback คำบางคำก็ตกรอบ คำที่ยังเป็นคำตอบได้ เราเรียกว่า Candidate และทั้งหมดรวมกันคือ Candidate Set

วิธีทดสอบง่ายมาก สมมติว่าคำนี้ *เป็น* คำตอบ แล้วคิด Feedback ของทุก Guess ที่ทายไปแล้ว ถ้าตรงกับที่เกมบอกทุกอัน คำนี้รอด ผิดแม้แต่อันเดียว ตกรอบ

[click] ลองดูตัวอย่าง คำตอบคือ abide ทายแรก crane ได้ C, R, N เป็น Absent, A เป็น Present, E เป็น Correct จาก 2,315 คำเหลือ 49 คำ

[click] ทายที่สอง pilot มีแค่ I ที่เป็น Present เหลือ 4 คำ: abide, aside, maize, waive

2,315 เป็น 49 เป็น 4 นี่คือแนวคิดทั้งหมดของการแก้ Wordle Guess ที่ดีคือ Guess ที่ทำให้ตัวเลขนี้ลดลงเยอะ

ลองคลิกเปลี่ยนสีดู ตัวเลขจะเปลี่ยนทันที เพราะ Widget นี้ถามเซิร์ฟเวอร์ที่รันโค้ด Python ตัวเดียวกับที่เราเขียน
-->

---

# อะไรทำให้ Guess แรกดี?

<p class="muted">Guess ไม่ได้เลือก Feedback คำตอบเป็นคนเลือก Guess เลือกได้แค่วิธี <b>แบ่ง</b> คำทั้งหมดเป็นกลุ่ม: Feedback Split</p>

<div class="grid grid-cols-2 gap-10 mt-8 text-center">
<div class="flex flex-col items-center gap-3">
  <Tiles word="crane" />
  <div class="stat"><b>142</b><span>กลุ่ม</span></div>
  <div class="stat"><b>263</b><span>คำ ในกลุ่มใหญ่สุด</span></div>
</div>
<div class="flex flex-col items-center gap-3">
  <Tiles word="fuzzy" />
  <div class="stat"><b>34</b><span>กลุ่ม</span></div>
  <div class="stat"><b>1,352</b><span>คำ ในกลุ่มใหญ่สุด</span></div>
</div>
</div>

<div class="flex justify-center mt-6"><Open href="/th/articles/solving-introduction">Article 04: อะไรทำให้ Guess แรกดี?</Open></div>

<!--
⏱ ฉาก 6 · 10:00 – 12:45 · อะไรทำให้ Guess แรกดี? (ครึ่งแรก)

**บนจอ**
- เปิด Article 04 เลื่อนถึงหัวข้อ "สองวิธีนับ"

**พูด**

ก่อนทายครั้งแรก คำตอบเป็นได้ทั้ง 2,315 คำ หลังทาย เราได้ Feedback หนึ่งในไม่เกิน 243 แบบ

ประเด็นสำคัญคือ Guess ไม่ได้เลือกว่าเราจะได้ Feedback อะไร คำตอบเป็นคนเลือก สิ่งที่ Guess เลือกได้คือวิธีแบ่งคำทั้งหมดเป็นกลุ่ม หนึ่งกลุ่มต่อหนึ่ง Feedback เราเรียกการแบ่งนี้ว่า Feedback Split

เทียบสองคำ crane แบ่ง 2,315 คำได้ 142 กลุ่ม กลุ่มใหญ่สุดคือคำที่ไม่มี C R A N E เลย 263 คำ ส่วน fuzzy แบ่งได้แค่ 34 กลุ่ม และกลุ่มใหญ่สุดมีถึง 1,352 คำ ทายแล้วส่วนใหญ่ก็แทบไม่ได้อะไร

Guess ที่ดีจึงแบ่งได้หลายกลุ่ม และแต่ละกลุ่มเล็ก ๆ เท่า ๆ กัน คำถามคือ จะให้คะแนนการแบ่งยังไง
-->

---

# สองวิธีนับ

<div class="grid grid-cols-2 gap-10 mt-6">
<div>

### Expected Candidates

$$\sum_i \frac{n_i}{N}\cdot n_i = \frac{\sum_i n_i^2}{N}$$

เฉลี่ยเหลือกี่คำ · ยิ่งน้อยยิ่งดี

</div>
<div v-click>

### Expected Information

$$\sum_i \frac{n_i}{N}\log_2\frac{N}{n_i}$$

หารครึ่งได้กี่ครั้ง (บิต) · ยิ่งมากยิ่งดี

</div>
</div>

<p v-click class="mt-6 text-center">10 คำ แบ่งเป็น 5, 3, 1, 1 → เหลือ <b>3.6</b> คำ · <b>1.685</b> บิต</p>

<div v-click class="grid grid-cols-2 gap-10 mt-6 text-center">
  <div>วัดด้วยบิต: <Word>tarse</Word> <b>5.947</b> บิต</div>
  <div>วัดด้วยจำนวนที่เหลือ: <Word>roate</Word> <b>60.4</b> คำ <span class="muted">(tarse 66.0)</span></div>
</div>

<!--
⏱ ฉาก 6 · 10:00 – 12:45 · อะไรทำให้ Guess แรกดี? (ครึ่งหลัง)

**บนจอ**
- ใน Article 04 ค้างที่สูตร Expected Candidates แล้วสูตร Expected Information
- ไฮไลต์บรรทัด `expected_left([5, 3, 1, 1])` และ `expected_bits(...)`
- จบที่หัวข้อ "สองวิธีอาจไม่ตรงกัน"

**พูด**

วิธีแรก ถามว่าเฉลี่ยแล้วจะเหลือกี่คำ กลุ่มที่มี n คำ มีโอกาสเกิด n หาร N และถ้าเกิดก็เหลือ n คำ เฉลี่ยออกมาเป็นผลรวมของ n กำลังสอง หารด้วย N เราเรียกว่า Expected Candidates ยิ่งน้อยยิ่งดี

[click] วิธีที่สอง ถามว่ากลุ่มนี้หารครึ่งคำทั้งหมดได้กี่ครั้ง กลุ่มที่เหลือครึ่งหนึ่งคือหนึ่งบิต เหลือหนึ่งในสี่คือสองบิต เฉลี่ยออกมาเป็น Expected Information หน่วยเป็นบิต ยิ่งมากยิ่งดี

[click] ตัวอย่างเล็ก ๆ: 10 คำแบ่งเป็นกลุ่ม 5, 3, 1, 1 เฉลี่ยเหลือ 3.6 คำ และได้ 1.685 บิต

สองวิธีวัดสิ่งเดียวกัน แต่ลงโทษกลุ่มใหญ่ไม่เท่ากัน วิธีแรกยกกำลังสอง กลุ่มใหญ่จึงโดนหนัก วิธีที่สองใช้ลอการิทึม โดนเบากว่า ผลคือมันเลือกคำต่างกันจริง ๆ

[click] ถ้าวัดด้วยบิต คำที่ดีที่สุดคือ tarse 5.947 บิต แต่ถ้าวัดด้วยจำนวนที่เหลือ คำที่ดีที่สุดคือ roate เหลือเฉลี่ย 60.4 คำ ส่วน tarse เหลือ 66.0 ไม่มีวิธีไหนผิด เราจะเก็บไว้ทั้งสองแบบ แล้วดูว่าตอนเล่นจริงแบบไหนชนะ
-->

---

# Feedback Split ของ crane

<div class="grid grid-cols-3 gap-6 mt-8 text-center">
  <div class="stat"><b>263</b><span>คำ ใน <Tiles word="crane" marks="00000" size="sm" /></span></div>
  <div class="stat"><b>29</b><span>Feedback ที่เหลือคำเดียว</span></div>
  <div class="stat"><b>1</b><span><Tiles word="crane" marks="22222" size="sm" /></span></div>
</div>

<div class="grid grid-cols-3 gap-6 mt-12 text-center">
  <div v-click class="stat"><b>78.7</b><span>คำ เหลือเฉลี่ย</span></div>
  <div v-click class="stat"><b>5.74</b><span>บิต</span></div>
  <div v-click class="stat"><b>11.18</b><span>บิต = log₂ 2,315 · เลือกหนึ่งคำ</span></div>
</div>

<p v-click class="mt-10 text-center">ถ้าทุกกลุ่มเท่ากัน 5.74 บิตเหลือ ~43 คำ แต่ของจริงเหลือ 79 · <Word>fuzzy</Word> เหลือ 855.7</p>

<div class="flex justify-center gap-4 mt-4">
  <Open href="/th/articles/feedback-split?fs.guess=crane#widget-fs">Article 06: Split ของ crane</Open>
  <Open href="/th/opener-split?opener=crane&compare=fuzzy">Opener Split: crane เทียบ fuzzy</Open>
</div>

<!--
⏱ ฉาก 7 · 12:45 – 15:30 · Feedback Split

**บนจอ**
- ลิงก์แรก: ชี้ชื่อแผนภูมิ "Expected 79 words left · 5.74 bits" แล้วคลิกแท่งบนสุด (ห้า Absent) ชี้ biddy, blood
- เลื่อนลงท้ายรายการให้เห็นกลุ่มคำเดียว แล้วพิมพ์ fuzzy ในแถว Guess สด ๆ
- ลิงก์ที่สอง: กด Full screen ค้างภาพ crane กับ fuzzy คู่กันสัก 3 วินาทีโดยไม่พูด

**พูด**

มาดู crane ให้เห็นทั้งหมด แต่ละแท่งคือหนึ่ง Feedback วาดเป็นกระเบื้องห้าอัน แท่งยาวเท่ากับจำนวนคำในกลุ่ม

แท่งบนสุดคือห้ากระเบื้อง Absent 263 คำที่ไม่มีตัวอักษรของ crane เลย อย่าง biddy, blood ลงไปข้างล่าง มี 29 Feedback ที่เหลือคำเดียว และมีคำเดียวที่ได้ Correct ทั้งห้าตัว ก็คือ crane เอง

[click] ตัวเลขบนหัวแผนภูมิคือสองคะแนนที่เพิ่งพูดถึง crane เหลือเฉลี่ย 78.7 คำ [click] และได้ 5.74 บิต

[click] 5.74 บิตแปลว่าอะไร การเลือกหนึ่งคำจาก 2,315 คำต้องใช้ log ฐานสองของ 2,315 คือ 11.18 บิต แปลว่า Guess แรกครั้งเดียวพาเราไปได้ราวครึ่งทางแล้ว

[click] ถ้าทุกกลุ่มเท่ากันหมด 5.74 บิตจะเหลือประมาณ 43 คำ แต่ของจริงคาดว่าเหลือ 79 เพราะกลุ่มใหญ่ดึงค่าเฉลี่ยขึ้น ช่องว่างนี้แหละคือเหตุผลที่สองคะแนนไม่ตรงกัน

ลองพิมพ์ fuzzy ได้ 34 กลุ่ม 1,352 คำอยู่ในกลุ่มเดียว เฉลี่ยเหลือ 855.7 คำ

ภาพนี้คือคำทั้ง 2,315 คำบนจอเดียว ซ้ายคือ crane ขวาคือ fuzzy ดูแล้วคงไม่ต้องอธิบายว่าอันไหนดีกว่า
-->

---

# Opener: จัดอันดับคำแรกทั้ง 14,855 คำ

<p class="muted">14,855 × 2,315 = Feedback กว่า 34 ล้านครั้ง · เปิดดูจาก Feedback Matrix</p>

| อันดับ (บิต) | Opener | | |
| --: | :-- | :-- | :-- |
| 1 | <Word>tarse</Word> | 5.947 บิต | ไม่อยู่ใน Answer List |
| 5 | <Word>raise</Word> | | กลุ่มใหญ่สุด 168 คำ |
| 8 | <Word>slate</Word> | | |
| 35 | <Word>crane</Word> | 5.743 บิต | กลุ่มใหญ่สุด 263 คำ |

<p v-click class="mt-6">เรียงด้วย Expected Candidates: ที่หนึ่งเปลี่ยนเป็น <Word>roate</Word></p>

<Open href="/th/articles/openers#widget-op">Article 07: ตาราง Opener</Open>

<!--
⏱ ฉาก 8 · 15:30 – 17:00 · Opener

**บนจอ**
- เปิด Article 07 ชี้แถว tarse, raise (อันดับ 5), slate (อันดับ 8) และแถว crane ที่ถูกเน้นไว้ใต้ตาราง
- คลิกหัวคอลัมน์ Expected Candidates ให้ roate ขึ้นบน แล้วคลิกหัวคอลัมน์ bits กลับ

**พูด**

Guess แรกของเกมเราเรียกว่า Opener ทุก Opener เริ่มจากจุดเดียวกัน คือคำตอบที่เป็นไปได้ 2,315 คำ ดังนั้นเราวัดได้ครั้งเดียวแล้วเก็บเป็นตาราง

14,855 คำ คูณ 2,315 คำตอบ เท่ากับ Feedback กว่า 34 ล้านครั้ง ฟังดูเยอะ แต่เร็วมาก เพราะเราคำนวณ Feedback ทุกคู่ไว้ล่วงหน้าในตารางเดียวที่เรียกว่า Feedback Matrix แล้วแค่เปิดดู

ที่หนึ่งคือ tarse 5.947 บิต เป็นคำจริงแต่ไม่อยู่ใน Answer List แปลว่ามันไม่มีวันชนะตั้งแต่ตาแรก แต่ก็ยังเป็นวิธีเริ่มที่ดีที่สุด

Opener ที่ดีที่สุดที่เป็นคำตอบได้ด้วยคือ raise อันดับห้า slate อันดับแปด

แล้ว crane ล่ะ คำที่รู้สึกว่าเป็นตัวเลือกที่ชัดที่สุด อันดับที่สามสิบห้า 5.743 บิต ไม่แย่ แต่กลุ่มใหญ่สุดของมันมี 263 คำ ขณะที่ของ raise มีแค่ 168

[click] ถ้าเปลี่ยนไปเรียงด้วย Expected Candidates ที่หนึ่งจะเปลี่ยนเป็น roate ทันที อันดับขึ้นกับว่าเราวัดด้วยอะไร
-->

---

# Greedy Strategy

<p>ทุกตา: ให้คะแนนทุก Guess ด้วยบิต แล้วเล่นคำที่ดีที่สุด · ไม่วางแผนล่วงหน้า</p>

<div class="grid grid-cols-2 gap-10 mt-6">
<div>

### Candidates only

ทายได้เฉพาะคำที่ยังเป็นคำตอบได้

<div class="board mt-4">
  <Tiles word="batch" size="sm" />
  <Tiles word="hatch" size="sm" />
  <Tiles word="latch" size="sm" />
  <Tiles word="match" size="sm" />
  <Tiles word="watch" size="sm" />
</div>

<p class="mt-3">ทาย <Word>batch</Word>: <b>0.72</b> บิต · กับดัก _atch</p>

</div>
<div v-click>

### All words

ทายคำไหนก็ได้ใน Guess List

<div class="mt-4 flex flex-col gap-3">
  <div><Word>abamp</Word> มี B, M, A: ถามหลายคำถามพร้อมกัน → ชนะใน 5</div>
  <div><Word>ablow</Word> <b>1.92</b> บิต · ไม่มีกลุ่มไหนเกินสองคำ</div>
</div>

</div>
</div>

<div class="flex gap-3 mt-6">
  <Open href="/th/articles/greedy-strategy#widget-trap">Article 08: Candidates only (กับดัก)</Open>
  <Open href="/th/follow?answer=watch&pool=guesses&scope=global&by=bits&view=path">Follow an Answer: watch</Open>
</div>

<!--
⏱ ฉาก 9 · 17:00 – 20:30 · Greedy Strategy (ครึ่งแรก)

**บนจอ**
- ลิงก์แรก: อยู่ที่ Guess 4 ชี้ 5 Candidate และตาราง Suggestion (0.72 บิต)
- ลิงก์ที่สอง: มุมมอง Answer's path ชี้โหนด abamp แล้วกด Full screen

**พูด**

ตอนนี้เรามีครบที่จะสร้าง Solver แล้ว และ Strategy แรกง่ายที่สุดเท่าที่เป็นไปได้: ทุกตา ดู Candidate ที่เหลือ ให้คะแนนทุก Guess ด้วยบิต แล้วเล่นคำที่ดีที่สุด เราเรียกว่า greedy เพราะมันดีที่สุดเฉพาะตอนนี้ ไม่วางแผนล่วงหน้าเลย

แต่มีการตั้งค่าหนึ่งที่สำคัญมาก คือ Solver ค้นหาคำจากที่ไหน แบบแคบคือทายเฉพาะ Candidate คำที่ยังเป็นคำตอบได้ แบบกว้างคือทายคำไหนก็ได้ใน Guess List เราเรียกว่า All words

กลับมาที่ watch ตอนต้นคลิป Solver แบบแคบลดเหลือ batch, hatch, latch, match, watch ห้าคำที่ลงท้ายด้วย atch เหมือนกันหมด

ปัญหาคือ ทุกคำในนั้นเป็นคำถามที่แย่ ทาย batch ถ้าไม่ใช่ เราได้รู้แค่ว่าตัวแรกไม่ใช่ B ได้แค่ 0.72 บิต นี่คือกับดัก atch กลุ่มคำที่ต่างกันตัวเดียวเป็นกับดักของทุก Strategy ที่ทายแต่ Candidate เพราะแต่ละคำตัดออกได้แค่ตัวมันเอง

[click] ทีนี้ปล่อยให้ Solver ทายคำไหนก็ได้ มันเปิดด้วย tarse และพอเหลือห้าคำ มันเล่น abamp คำแปลก ๆ ที่เป็นคำตอบไม่ได้ แต่มันมี B, M และ A อยู่ด้วยกัน มันจึงถามหลายคำถามพร้อมกัน Feedback ที่ได้แยกห้าคำนั้นออกจากกัน และมันชนะใน 5 Guess

ในหน้า Follow an Answer เราเห็นเส้นทางทั้งหมด แต่ละกล่องคือคำที่ยังเหลือหลังแต่ละ Guess

ลองดูอีกตัวเลขหนึ่ง จากห้าคำเดิม ถ้าทาย batch ได้ 0.72 บิต แต่คำที่ดีที่สุดในรายการทั้งหมดคือ ablow ได้ 1.92 บิต และไม่มีกลุ่มไหนเหลือเกินสองคำ มันชนะตอนนี้ไม่ได้ แต่แทบรับประกันว่าชนะตาหน้า
-->

---
layout: center
class: text-center
---

# Guess ที่ชนะไม่ได้ ก็ยังเป็น Guess ที่ดีที่สุดได้

<p class="muted mt-6">ข้อยกเว้นเดียว: เหลือสองคำ ทายหนึ่งในนั้นไปเลย</p>

<div class="mt-10"><Open href="/th/articles/greedy-strategy#widget-race">Article 08: Side-by-side Game</Open></div>

<!--
⏱ ฉาก 9 · 17:00 – 20:30 · Greedy Strategy (ครึ่งหลัง)

**บนจอ**
- ลิงก์ Side-by-side Game: ปล่อยเล่นเองครบหนึ่งรอบ (ประมาณ 20 วินาที) แล้วพูดทับตอนท้าย

**พูด**

นี่คือสาม Strategy เล่นคำตอบชุดเดียวกันพร้อมกัน มีแต่กระดาน All words ที่เล่นคำที่ชนะไม่ได้อย่างอิสระ

บทเรียนของ Article นี้สั้น ๆ: Guess ที่ชนะไม่ได้ ก็ยังเป็น Guess ที่ดีที่สุดได้ มีข้อยกเว้นเดียว พอเหลือแค่สองคำ ทายหนึ่งในนั้นไปเลยไม่มีวันแย่กว่า Solver ของเราจึงกลับมาทายแต่ Candidate ตรงนั้น
-->

---

# Benchmark: 2,315 Game ต่อ Strategy

<p class="muted">Guess Pool (Answer List / Guess List) × Search Scope (Candidates only / All words) × Ranking (บิต / จำนวนที่เหลือ) = 8 Strategy</p>

| Strategy | Opener | เฉลี่ย | Loss | |
| :-- | :-- | --: | --: | :-- |
| บิต · Guess List · All words | <Word>tarse</Word> | **3.43** | 0 | 3 ตา 1,256 · 4 ตา 943 · 6 ตา 2 |
| จำนวนที่เหลือ · Guess List · All words | <Word>roate</Word> | 3.48 | 0 | ไม่มีเกมถึง 6 ตา |
| บิต · Answer List · Candidates only | <Word>raise</Word> | 3.60 | **11** | atch · o_er · gra_e · aste |

<p v-click class="mt-6">จาก State เดียวกัน All words เล่น <Word>ablow</Word> หรือ <Word>bafta</Word> แล้วชนะทั้ง 11 เกม</p>

<p v-click><b>Loss 11 → 0</b> จากการยอมทายคำที่ชนะไม่ได้ · บิตกับจำนวนที่เหลือห่างกันไม่เกิน 0.05 Guess</p>

<div class="flex gap-3">
  <Open href="/th/articles/benchmark#widget-bm">Article 09: Benchmark ทั้งแปด</Open>
  <Open href="/th/articles/benchmark?bm.strategies=bits-answers-candidates,bits-guesses-all#widget-bm">Article 09: แคบ เทียบ กว้าง</Open>
</div>

<!--
⏱ ฉาก 10 · 20:30 – 23:00 · Benchmark

**บนจอ**
- ลิงก์แรก: ชี้แท่ง 3 Guess ที่สูงที่สุด แล้วชี้กลุ่ม "Lost" ทางขวา
- คลิกแท็บเปรียบเทียบทีละอัน (Expected Information / Expected Candidates, Candidates only / All words)
- ลิงก์ที่สอง: เหลือสอง Strategy เลื่อนลงไปที่กระดาน 11 Loss และ "Same State, two searches"

**พูด**

เกมเดียวเล่าได้เรื่องเดียว ถ้าจะเทียบ Strategy ต้องเล่นให้ครบ Benchmark คือการเล่นทุกคำตอบใน Answer List ด้วย Strategy เดียว 2,315 เกม แล้วนับว่าแต่ละเกมใช้กี่ Guess

Strategy ของเรามีสามตัวเลือก จะเลือกคำจาก Answer List หรือ Guess List ค้นแค่ Candidate หรือ All words และวัดด้วยบิต หรือด้วยจำนวนที่เหลือ สองคูณสองคูณสอง ได้แปด Strategy

ตัวที่ดีที่สุดคือ บิต, Guess List, All words เปิดด้วย tarse ไม่แพ้เลยสักเกม เฉลี่ย 3.43 Guess ชนะใน 3 ตา 1,256 เกม ใน 4 ตา 943 เกม และใช้ถึง 6 ตาแค่ 2 เกม

ถ้าวัดด้วยจำนวนที่เหลือแทน เปิดด้วย roate ก็ไม่แพ้เหมือนกัน เฉลี่ย 3.48 ช้ากว่านิดเดียว แต่นิ่งกว่า ไม่มีเกมไหนถึงหกตาเลย

แล้วตัวแคบล่ะ ทายแต่คำใน Answer List และแต่ Candidate เปิดด้วย raise เฉลี่ย 3.60 และแพ้ 11 เกม ดูกระดานพวกนี้ ทุกเกมที่แพ้คือกับดักแบบเดียวกันหมด atch, o_er, gra_e, aste ทุกอันคือกลุ่มคำหน้าตาคล้ายกันที่ Solver ไล่ทายทีละคำจนหมดตา

[click] ส่วนตัวกว้าง จาก State เดียวกันเป๊ะ มันเล่น ablow หรือ bafta คำที่ชนะไม่ได้แต่แยกกลุ่มออก แล้วชนะทั้ง 11 เกมนั้น ส่วนใหญ่ใน 4 หรือ 5 ตา

[click] สรุป Benchmark: การเปลี่ยนอย่างเดียวที่ได้ผลมากที่สุด คือยอมให้ Solver ทายคำที่ชนะไม่ได้ Loss ลดจาก 11 เหลือ 0 ส่วนจะวัดด้วยบิตหรือด้วยจำนวนที่เหลือ สำคัญน้อยกว่ามาก ห่างกันไม่เกิน 0.05 Guess
-->

---

# Greedy เทียบกับ Optimal

<div class="grid grid-cols-2 gap-10 mt-10 text-center">
<div class="flex flex-col items-center gap-3">
  <span class="muted">Optimal · Alex Selby, ม.ค. 2022</span>
  <Tiles word="salet" />
  <div class="stat"><b>7,920</b><span>Guess รวม · เฉลี่ย 3.4212 · ไม่เกิน 5 ตา</span></div>
</div>
<div class="flex flex-col items-center gap-3">
  <span class="muted">Greedy ของเรา</span>
  <Tiles word="tarse" />
  <div class="stat"><b>7,939</b><span>Guess รวม · เฉลี่ย 3.4294</span></div>
</div>
</div>

<p v-click class="mt-10 text-center">ห่างกัน <b>19</b> Guess = <b>0.008</b> ต่อเกม ≈ ¼ ของ 1% · เสียเกินหนึ่ง Guess ทุกสี่เดือน</p>

<p class="muted text-sm text-center">Guess List ของ Selby มี 12,972 คำ ของเรา 14,855 คำ: ใกล้เคียง แต่ไม่ตรงเป๊ะ</p>

<div class="flex justify-center"><Open href="/th/articles/greedy-vs-optimal">Article 10: Greedy เทียบกับ Optimal</Open></div>

<!--
⏱ ฉาก 11 · 23:00 – 24:45 · Greedy เทียบกับ Optimal

**บนจอ**
- เปิด Article 10 ค้างที่รายการตัวเลขของ salet แล้วตัวเลขของ tarse ใต้กัน
- ชี้ margin note เรื่อง Guess List 12,972 คำ (ถ้าจอแคบจะอยู่ในเนื้อความ)
- B-roll ทางเลือก: หน้าเว็บของ Alex Selby และ paper ใน Operations Research (ลิงก์อยู่ในบทความ)

**พูด**

Solver ของเรา greedy มันไม่เคยวางแผน คำถามที่ตามมาคือ มันห่างจากการเล่นที่สมบูรณ์แบบแค่ไหน

เราไม่ได้คำนวณ Strategy ที่สมบูรณ์แบบเอง มันต้องค้นทุกทางของทุกเกม มีคนทำไว้แล้ว เดือนมกราคม 2022 Alex Selby หาได้ว่า Strategy ที่ดีที่สุดเท่าที่เป็นไปได้เปิดด้วย salet ใช้รวม 7,920 Guess กับคำตอบทั้ง 2,315 คำ เฉลี่ย 3.4212 และไม่เคยเกินห้าตา ต่อมา Bertsimas กับ Paskov พิสูจน์ผลเดียวกันเป็นคำตอบที่แน่นอน ตีพิมพ์ใน Operations Research

ของเรา tarse ใช้ 7,939 Guess เฉลี่ย 3.4294

[click] ห่างกันรวม 19 Guess หรือ 0.008 Guess ต่อเกม ราวหนึ่งในสี่ของหนึ่งเปอร์เซ็นต์ ถ้าเล่น Wordle ทุกวัน Solver ของเราจะเสีย Guess เกินมาหนึ่งครั้งทุกสี่เดือน

ขอบอกตามตรงนิดหนึ่ง Guess List ของ Selby มี 12,972 คำ ของเรามี 14,855 คำตอบชุดเดียวกัน แต่รายการคำทายไม่เหมือนกัน การเทียบนี้จึงใกล้เคียง แต่ไม่ตรงเป๊ะ

ที่น่าสนใจคือ salet อยู่แค่อันดับสิบในตารางบิตของเรา optimum ยอมเสียข้อมูลนิดหน่อยในตาแรก เพื่อวางทางให้ตาที่สองดีกว่า แต่การวัดแบบมองแค่ขั้นเดียวก็มาได้ใกล้ขนาดนี้ Guess ที่ตัดคำได้ดีตอนนี้ มักตัดได้ดีตอนหลังด้วย
-->

---

# Opener Distribution: ทุกคำแรก เล่นจนจบ

<p class="muted">14,855 Opener × 2,315 Game · Strategy บิต · Guess List · All words</p>

<div class="grid grid-cols-2 gap-10 mt-6 text-center">
  <div class="stat"><b>3.429</b><span>ที่หนึ่ง <Word>tarse</Word></span></div>
  <div class="stat"><b>4.117</b><span>ที่โหล่ <Word>qajaq</Word> (ก็ไม่เคยแพ้)</span></div>
</div>

<div class="grid grid-cols-2 gap-10 mt-8">
<div v-click>

**ตัวอักษรยอดฮิต**

<Word>salet</Word> 3 · <Word>crate</Word> 4 · <Word>trace</Word> 5 · <Word>slate</Word> 6 · <Word>crane</Word> 7 <span class="muted">(บิต: 35)</span> · <Word>raise</Word> 95 <span class="muted">(บิต: 5)</span>

</div>
<div v-click>

**สระเยอะ**

<Word>adieu</Word> 7,062 · <Word>audio</Word> 8,241 · <Word>ouija</Word> 14,197

</div>
</div>

<div class="flex gap-3 mt-8">
  <Open href="/th/articles/opener-distribution#widget-od">Article 11: Opener Distribution</Open>
  <Open href="/th/openers?highlight=tarse,salet,crane,slate,raise,adieu,audio,ouija,qajaq">หน้า Opener Distribution: คำดัง ๆ</Open>
</div>

<!--
⏱ ฉาก 12 · 24:45 – 27:45 · Opener Distribution

**บนจอ**
- ลิงก์แรก: คลิกแท็บทีละอัน ชี้ tarse ล่างสุดซ้าย และ qajaq ปลายขวา
- ลิงก์ที่สอง: ชี้ทีละคำตามบทพูด (adieu, audio, ouija ฝั่งขวา; crane, slate, salet ฝั่งซ้าย)
- ทางเลือก: ติ๊ก Only Openers on the Answer List แล้วชี้ jazzy

**พูด**

Benchmark เล่นแค่ Opener เดียวต่อ Strategy แต่คำแรกจะเป็นคำไหนก็ได้ใน 14,855 คำ งั้นเล่นให้ครบทุกคำเลย

ทุกคำใน Guess List เป็น Opener ของ 2,315 เกม Solver เล่นแต่ละเกมจนจบ รวม 14,855 คูณ 2,315 เกม เราเก็บแค่ตัวเลขเดียวต่อเกม คือใช้กี่ Guess แล้วเฉลี่ยต่อคำ

กราฟนี้แต่ละบล็อกคือหนึ่ง Opener เรียงซ้อนเป็นแท่งกว้าง 0.01 Guess ตัวที่ดีที่สุดอยู่ล่างสุด

ที่หนึ่งคือ tarse เฉลี่ย 3.429 ที่โหล่คือ qajaq 4.117 คำแรกที่ดีที่สุดกับแย่ที่สุด ต่างกันไม่ถึงหนึ่ง Guess คำแรกสำคัญ แต่ไม่สำคัญเท่าการเล่นส่วนที่เหลือให้ดี และแม้แต่ qajaq ก็ไม่เคยแพ้เลย

[click] crane ที่เคยอยู่อันดับ 35 ในตารางบิต พอเล่นจริงขึ้นมาอันดับ 7 ห่าง tarse ไม่ถึงหนึ่งในร้อย Guess ส่วน raise ที่เคยอยู่อันดับ 5 ตกไปอันดับ 95 สองอันดับนี้ไม่ตรงกัน เพราะบิตวัดแค่ตาแรก แต่เกมมีหลายตา

[click] แล้วคำยอดนิยมล่ะ ทีมสระเยอะอ่อนที่สุด adieu อันดับ 7,062 ครึ่งหนึ่งของ Guess List เปิดได้ดีกว่ามัน audio อันดับ 8,241 และ ouija เกือบท้ายตาราง อันดับ 14,197 สระสี่ตัวบอกเรื่องสระได้เยอะ แต่บอกเรื่องอื่นน้อยมาก

ทีมตัวอักษรยอดฮิตสมชื่อ crate อันดับ 4, trace 5, slate 6, crane 7

สุดท้าย ศึก salet กับ slate ภายใต้ Strategy นี้ salet อันดับ 3 slate อันดับ 6 รวม 2,315 เกมต่างกันแค่ 13 Guess ถือว่าเสมอ แต่ slate มีข้อได้เปรียบหนึ่ง มันเป็นคำตอบได้ หนึ่งในสองพันกว่าเกม มันชนะตั้งแต่ตาแรก ซึ่ง salet ทำไม่ได้เลย
-->

---
layout: center
class: text-center
---

# สรุป

<div class="flex flex-col gap-4 mt-8 text-left">
  <p>Guess ที่ดีไม่ใช่ Guess ที่มีโอกาสถูก แต่เป็น Guess ที่แบ่งคำที่เหลือให้เล็กที่สุด</p>
  <p v-click>บางครั้งคำที่ดีที่สุดคือคำที่ไม่มีวันเป็นคำตอบ</p>
  <p v-click>Solver ที่มองแค่ตาเดียว ห่างจากสมบูรณ์แบบไม่ถึง ¼ ของ 1%</p>
</div>

<div v-click class="mt-10 flex justify-center gap-8 items-center">
  <span>เฉลี่ยดีสุด <Word>tarse</Word> <Word>salet</Word></span>
  <span>มีลุ้นตาแรก <Word>slate</Word></span>
  <span class="muted">เลิก <Word>adieu</Word></span>
</div>

<div class="mt-10"><Open href="/th/openers">ลองคำแรกของคุณ: Opener Distribution</Open></div>

<!--
⏱ ฉาก 13 · 27:45 – 28:45 · ปิดท้าย

**บนจอ**
- กลับหน้าแรกของเว็บ เลื่อนช้า ๆ ผ่านรายการ Article ทั้ง 11 บท
- จบที่หัวข้อ Explore ค้างไว้ระหว่างพูดประโยคสุดท้าย

**พูด**

สรุปทั้งหมดในหนึ่งนาที

Wordle ดูเหมือนเกมคำศัพท์ แต่ถ้าเล่นให้เก่ง มันคือเกมของการนับ Guess ที่ดีไม่ใช่ Guess ที่มีโอกาสถูก แต่เป็น Guess ที่แบ่งคำที่เหลือให้เล็กที่สุด [click] บางครั้งคำที่ดีที่สุดคือคำที่ไม่มีวันเป็นคำตอบ [click] และ Solver ง่าย ๆ ที่มองแค่ตาเดียว ก็เล่นห่างจากสมบูรณ์แบบไม่ถึงหนึ่งในสี่ของหนึ่งเปอร์เซ็นต์

[click] ถ้าอยากชนะเฉลี่ยดีที่สุด เปิดด้วย tarse หรือ salet ถ้าอยากมีลุ้นชนะตั้งแต่ตาแรกด้วย เปิดด้วย slate และถ้าคุณเปิดด้วย adieu อยู่ ตอนนี้คุณรู้แล้วว่าควรเปลี่ยน

ทุก Widget ในคลิปนี้เปิดเล่นได้บนเว็บ ลองพิมพ์คำแรกที่คุณชอบในหน้า Opener Distribution แล้วคอมเมนต์มาบอกว่ามันได้อันดับเท่าไร

ขอบคุณที่ดูจนจบ
-->

---
layout: center
---

# Chapters สำหรับคำอธิบายคลิป

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
ไม่ได้อยู่ในคลิป คัดลอกไปวางในคำอธิบาย YouTube แล้วแก้เวลาให้ตรงกับคลิปที่ตัดเสร็จ (เวลาเดียวกันใส่ใน frontmatter `video` ของแต่ละ Article ได้ด้วย)
-->
