export class FetchError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'FetchError';
    this.code = code;
    this.status = status;
  }
}

export async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  if (!res.ok) {
    let errorMsg = 'An error occurred while fetching the data.';
    let code;
    try {
      const data = await res.json();
      errorMsg = data.error || errorMsg;
      code = data.code;
    } catch {
      // Ignore JSON parse errors for non-JSON responses
    }
    throw new FetchError(errorMsg, code, res.status);
  }

  return res.json() as Promise<T>;
}
