/** Calls to the backend through the `/api` proxy. A non-2xx response throws an Error carrying the API's `detail` message. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new Error("Could not reach the server. Is the backend running?");
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {}
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export interface FeedbackResponse {
  guess: string;
  answer: string;
  marks: string;
  code: number;
}

export interface CandidatesResponse {
  count: number;
  words: string[];
}

export const getFeedback = (guess: string, answer: string, signal?: AbortSignal) =>
  api<FeedbackResponse>(`/api/feedback?guess=${guess}&answer=${answer}`, { signal });

export const postCandidates = (state: { guess: string; feedback: string }[], signal?: AbortSignal) =>
  api<CandidatesResponse>("/api/candidates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
    signal,
  });

/** One Guess's statistics, as the API's `stats_json` returns them. */
export interface WordStats {
  word: string;
  bits: number;
  expected_candidates: number;
  groups: number;
  largest_group: number;
  is_candidate: boolean;
  win_chance: number;
}

export interface SplitGroup {
  marks: string;
  code: number;
  count: number;
  words: string[];
}

export interface SplitResponse extends WordStats {
  candidates: number;
  /** Biggest group first. */
  split: SplitGroup[];
}

export interface SolveStep {
  number: number;
  guess: string;
  marks: string;
  code: number;
  candidates_before: number;
  candidates_after: number;
  /** The top Suggestions at this step; the first is the Guess played. */
  alternatives: WordStats[];
}

export interface SolveResponse {
  answer: string;
  solved: boolean;
  guesses: number;
  steps: SolveStep[];
}

export type Pool = "answers" | "guesses";
export type Scope = "candidates" | "global";
export type Rank = "bits" | "expected";

export const postSplit = (guess: string, state: { guess: string; feedback: string }[], signal?: AbortSignal) =>
  api<SplitResponse>("/api/split", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guess, state }),
    signal,
  });

export const getSolve = (answer: string, pool: Pool, scope: Scope, by: Rank, signal?: AbortSignal) =>
  api<SolveResponse>(`/api/solve?answer=${answer}&pool=${pool}&scope=${scope}&by=${by}`, { signal });
