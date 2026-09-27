/** Client helper: attach `x-demo-key` when calling state-changing demo APIs (T18a). */
export function demoKeyHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  const key = process.env.NEXT_PUBLIC_DEMO_KEY;
  if (key) headers.set("x-demo-key", key);
  return headers;
}
