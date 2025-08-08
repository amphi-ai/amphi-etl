/* utils/requestScheduler.ts
 * Helper for making requests to the pipeline-scheduler endpoint
 * – Supports JSON requests with optional SSE streaming.
 */
import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';

export async function requestScheduler<T = any>(
  endpoint: string,
  {
    method = 'GET',
    body,
    stream = false,
    signal,
    init = {}
  }: { 
    method?: string;
    body?: unknown;
    stream?: boolean; 
    signal?: AbortSignal; 
    init?: RequestInit 
  } = {}
): Promise<T | ReadableStreamDefaultReader<Uint8Array>> {
  const settings = ServerConnection.makeSettings();
  const url = URLExt.join(settings.baseUrl, 'pipeline-scheduler', endpoint);

  const requestInit = {
    method,
    headers: { 
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}) 
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal,
    ...init
  };

  const response = await ServerConnection.makeRequest(url, requestInit, settings);

  if (!response.ok) {
    throw new ServerConnection.ResponseError(response, await response.text());
  }

  /* stream mode → return reader, caller parses SSE */
  if (stream) return response.body!.getReader();

  /* plain JSON reply */
  return (await response.json()) as T;
}
