# Wordle

An English, five-letter Wordle game and a solver that plays it, suggests guesses and explains them. This glossary is the shared language for the code, the docs, and the articles and videos made with the app.

## Game

**Game**:
One attempt to find a single Answer, within its Guess Limit.
_Avoid_: puzzle, session, match

**Guess Limit**:
The most Guesses a Game allows: six, as in Wordle, or none, so the Game only ends with a Win.
_Avoid_: max tries, lives, unlimited mode

**Answer**:
The hidden word the player is trying to find.
_Avoid_: target, solution, secret word

**Guess**:
A five-letter word submitted during a Game. It must be on the Guess List.
_Avoid_: attempt, try, turn, round

**Feedback**:
The five Marks the game shows for a Guess, one per letter. A letter repeated in a Guess is marked Correct or Present only as many times as it appears in the Answer, with Correct Marks given out first.
_Avoid_: pattern, hint, clue, score, result

**Mark**:
The verdict on one letter of a Guess: **Correct** (in the Answer at this position), **Present** (in the Answer at a different position) or **Absent** (not in the Answer, or already accounted for).
_Avoid_: green, yellow, grey, tile colour

**State**:
The Guesses made so far in a Game, each with its Feedback.
_Avoid_: board, grid, history, progress

**Win**:
The end of a Game in which a Guess matched the Answer.

**Loss**:
The end of a Game that reaches its Guess Limit without a Win. A Game with no Guess Limit can't be lost.
_Avoid_: fail

**Hard Mode**:
A rule that every Guess must reuse all the Correct and Present letters revealed so far, keeping Correct letters in place.

**Seed**:
A number that picks the Answer of a random Game. The same Seed always picks the same Answer, so a Game can be replayed.
_Avoid_: game ID, puzzle number

**Answer List**:
The words that can be an Answer.
_Avoid_: solutions list, dictionary, corpus

**Guess List**:
Every word accepted as a Guess. It contains the whole Answer List.
_Avoid_: allowed words, valid words, dictionary, vocabulary

## Solving

**Solver**:
The player that picks Guesses automatically from the State.
_Avoid_: bot, AI, engine

**Candidate**:
An Answer List word that would have produced every Feedback in the State so far, so it could still be the Answer.
_Avoid_: remaining word, possible answer, option

**Candidate Set**:
All Candidates for a State. At the start of a Game it is the whole Answer List.
_Avoid_: solution space, search space, pool

**Suggestion**:
The Guess the Solver recommends for the current State.
_Avoid_: recommendation, best word, next move

**Opener**:
The first Guess of a Game.
_Avoid_: starter, starting word, seed word

**Feedback Split**:
How a possible Guess would divide the Candidate Set into groups, one group for each Feedback it could produce.
_Avoid_: buckets, partition, distribution

**Feedback Matrix**:
A table of the Feedback of every Guess against every Answer, scored once before any Game so the Solver can look a Feedback up instead of working it out. There are two: one with the Answer List as its rows and one with the Guess List as its rows. Each cell is a Feedback Code.
_Avoid_: score matrix, pattern matrix, lookup table

**Feedback Code**:
One Feedback packed into a single number from 0 to 242, by reading its five Marks as base-3 digits (Absent 0, Present 1, Correct 2), first letter first. 242 is a Win.
_Avoid_: score, pattern, hash

**Expected Information**:
How much a Guess is expected to shrink the Candidate Set, averaged over its Feedback Split and counted in bits.
_Avoid_: entropy, entropy score, info gain (an Article may name "entropy" once, to link the formula to its standard name)

**Expected Candidates**:
How many Candidates a Guess is expected to leave, averaged over its Feedback Split: the fewer, the better.
_Avoid_: expected vocabulary size, expected words left, average group size

**Strategy**:
The rule the Solver uses to pick a Suggestion, such as highest Expected Information.
_Avoid_: algorithm, heuristic, policy

## Using the app

**Play**:
Using the app to play a Game: the app holds the Answer and you make the Guesses.

**Assist**:
Using the Solver while you play Wordle somewhere else: you enter each Guess and its Feedback, and the app shows Suggestions and the Candidate Set.
_Avoid_: help mode, solve mode, cheat

**Benchmark**:
A run in which the Solver plays a Game for every word on the Answer List with one Strategy.
_Avoid_: simulation, evaluation, test run

**Guess Count**:
The number of Guesses the Solver needed to Win a Game.
_Avoid_: score, steps, tries

**Guess Distribution**:
How many Games in a Benchmark ended at each Guess Count, plus the number of Losses.
_Avoid_: histogram, stats

**Average Guess Count**:
The mean Guess Count across the won Games of a Benchmark.
_Avoid_: average score, mean tries

## Publishing

**Article**:
A short piece on the website that explains one idea, such as Feedback Split or Expected Information. It may build on other Articles, its Prerequisites.
_Avoid_: post, page, chapter, lesson

**Prerequisite**:
An Article that another Article builds on and links back to.
_Avoid_: dependency, parent

**Series**:
An ordered path through several Articles that tells one story, such as "Solving Wordle". A video follows a Series.
_Avoid_: course, collection, playlist

**Part**:
A group of consecutive Articles in a Series that share one core idea, such as learning and building Wordle, or solving it. Each Article belongs to exactly one Part.
_Avoid_: chapter, section, module, unit

**Widget**:
An interactive figure inside an Article that lets the reader try the idea, such as scoring a Guess or exploring a Feedback Split.
_Avoid_: demo, playground, component
