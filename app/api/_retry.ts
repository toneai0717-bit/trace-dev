export async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      const retryable = e?.status === 429 || (e?.status >= 500 && e?.status < 600);
      if (!retryable || attempt === maxAttempts - 1) throw e;
      await new Promise(r => setTimeout(r, (attempt + 1) * 1500));
    }
  }
  throw lastError;
}
