export function fetchJsonWithRetry(
  url: string | URL,
  init: RequestInit,
  options?: { attempts?: number; timeoutMs?: number },
): Promise<{ response: Response; body: unknown }>;
