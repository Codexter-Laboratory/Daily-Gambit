import type { CreateJobInput, CreateJobResponse, JobEvent, StoredAnalysisResponse } from '@daily-gambit/contracts';
import { API_URL, ApiRequestError, apiRequest } from '../../lib/api';

export const createJob = (input: CreateJobInput) =>
  apiRequest<CreateJobResponse>('/v1/analysis/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });

export const cancelJob = (jobId: string) => apiRequest<{ ok: true }>(`/v1/analysis/jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE' });

export const fetchStored = (username: string, signal?: AbortSignal) =>
  apiRequest<StoredAnalysisResponse>(`/v1/players/${encodeURIComponent(username)}/analysis`, { signal });

/**
 * Follows a job's live events. Returns a function that stops listening. The stream ends by itself
 * when the job does, and the browser reconnects on its own after a dropped connection.
 */
export function openJobEvents(jobId: string, onEvent: (event: JobEvent) => void): () => void {
  if (!API_URL) throw new ApiRequestError(0, 'The server address is not configured (NEXT_PUBLIC_API_URL).');
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
