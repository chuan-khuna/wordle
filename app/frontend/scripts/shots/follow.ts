/** The Follow an Answer page (`/follow`): a full split row, the Answer's path, a node's head card, and a Loss. */
import { around, hover, POPPER, type Shot } from "./lib";

const PATH = "ol[aria-label^='The Game for']";
/** A Strategy WATCH is a Loss under (eight Guesses), for the red border past Guess 6. */
const LOSS = "answer=watch&pool=answers&scope=candidates&by=bits";

export default [
  { name: "split-row", path: "/follow?answer=watch&step=2", crop: around(["ol[aria-label^='Guesses for']", "section[aria-label^='Guess ']"], 900) },
  { name: "answers-path", path: "/follow?answer=watch&view=path", crop: around([PATH]) },
  { name: "path-head-card", path: "/follow?answer=watch&view=path", act: (p) => hover(p, `${PATH} [data-head]`), crop: around([`${PATH} li:nth-child(2)`, POPPER]) },
  { name: "loss-path", path: `/follow?${LOSS}&view=path`, crop: around([PATH]) },
] satisfies Shot[];
