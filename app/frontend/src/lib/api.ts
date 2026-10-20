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
