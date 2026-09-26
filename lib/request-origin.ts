// Next.js may construct request.url with the server's bind hostname, rather
// than the hostname the customer opened. Host is the browser-facing authority.
export function isSameOriginRequest(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const source = new URL(origin);
    const internal = new URL(request.url);
    const host = request.headers.get("host") ?? internal.host;
    // Vercel supplies the external protocol; local HTTP uses the URL protocol.
    const protocol = request.headers.get("x-forwarded-proto") ?? internal.protocol.slice(0, -1);
    if (protocol !== "http" && protocol !== "https") return false;
    const expected = new URL(`${protocol}://${host}`).origin;
    return source.origin === origin && source.origin === expected;
  } catch { return false; }
}
