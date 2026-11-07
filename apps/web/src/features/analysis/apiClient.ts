import type { CreateJobInput, CreateJobResponse, JobEvent, StoredAnalysisResponse } from '@daily-gambit/contracts';

/** Where the analysis API lives. Unset means: analyse in this browser instead. */
export const API_URL: string | null = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || null;

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) throw new ApiError('The analysis service is not configured.');
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError('Could not reach the analysis service. Check your connection and try again.');
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(body.error ?? `The analysis service answered ${res.status}.`);
  return body as T;
}

export const createJob = (input: CreateJobInput) =>
  request<CreateJobResponse>('/v1/analysis/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });

export const cancelJob = (jobId: string) => request<{ ok: true }>(`/v1/analysis/jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE' });

export const fetchStored = (username: string, signal?: AbortSignal) =>
  request<StoredAnalysisResponse>(`/v1/players/${encodeURIComponent(username)}/analysis`, { signal });

/**
 * Follows a job's live events. Returns a function that stops listening. The stream ends by itself
 * when the job does, and the browser reconnects on its own after a dropped connection.
 */
export function openJobEvents(jobId: string, onEvent: (event: JobEvent) => void): () => void {
  if (!API_URL) throw new ApiError('The analysis service is not configured.');
  const source = new EventSource(`${API_URL}/v1/analysis/jobs/${encodeURIComponent(jobId)}/events`);
  source.onmessage = (message) => {
    try {
      onEvent(JSON.parse(message.data) as JobEvent);
    } catch {
      // A malformed event is ignored; the next one carries the state again.
    }
  };
  return () => source.close();
}
