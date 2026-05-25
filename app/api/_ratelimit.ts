// シンプルなインメモリレート制限（Vercel サーバーレス環境対応）
// 本番で複数インスタンスが起動した場合も「1インスタンスあたり」の制限として機能する

interface RateEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateEntry>();

// 古いエントリを定期的にクリア（メモリリーク防止）
function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}

export function checkRateLimit(
  ip: string,
  limit = 15,
  windowMs = 60_000
): { allowed: boolean; remaining: number } {
  cleanup();
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

