import { expect, inject } from "vitest";

// Shared by the spec files that act as visitors. Every request manages its
// own seal cookie by hand (fetch carries no cookie jar), so each call is a
// fresh visitor unless it passes a cookie on.
export const baseUrl = inject("baseUrl");

export const marker = (label: string): string =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}x`;

export function cookieFrom(res: Response): string {
  const raw = res.headers.get("set-cookie");
  expect(raw, "expected a seal cookie to be set").toBeTruthy();
  return raw!.split(";")[0]!;
}

export async function newVisitor(): Promise<string> {
  return cookieFrom(await fetch(new URL("/", baseUrl)));
}

export async function page(path: string, cookie?: string): Promise<string> {
  const res = await fetch(new URL(path, baseUrl), { headers: cookie ? { Cookie: cookie } : {} });
  expect(res.status).toBe(200);
  return res.text();
}

export async function post(
  path: string,
  fields: Record<string, string>,
  cookie?: string,
  accept?: string,
): Promise<Response> {
  return fetch(new URL(path, baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(accept ? { Accept: accept } : {}),
    },
    body: new URLSearchParams(fields).toString(),
  });
}

export interface LiveEvent {
  id: number;
  type: string;
  data: { id: number; html: string; legend: string };
}

// A minimal EventSource over fetch: it can send Last-Event-ID and a cookie,
// which the browser's own EventSource can't be told to do from a test.
export function openStream(
  path: string,
  headers: Record<string, string> = {},
): { events: LiveEvent[]; ready: Promise<void>; close: () => void; waitFor: (pred: (e: LiveEvent[]) => boolean, ms: number) => Promise<boolean> } {
  const controller = new AbortController();
  const events: LiveEvent[] = [];
  let markReady: () => void = () => {};
  const ready = new Promise<void>((resolve) => (markReady = resolve));

  void (async () => {
    try {
      const res = await fetch(new URL(path, baseUrl), { headers, signal: controller.signal });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let first = true;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let at: number;
        while ((at = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, at);
          buffer = buffer.slice(at + 2);
          const fields: Record<string, string> = {};
          for (const line of block.split("\n")) {
            if (line.startsWith(":")) continue;
            const colon = line.indexOf(":");
            if (colon === -1) continue;
            fields[line.slice(0, colon)] = line.slice(colon + 1).replace(/^ /, "");
          }
          if (fields.event && fields.data) {
            events.push({ id: Number(fields.id), type: fields.event, data: JSON.parse(fields.data) });
          }
          if (first) {
            first = false;
            markReady();
          }
        }
      }
    } catch {
      // aborted
    }
  })();

  const waitFor = async (pred: (e: LiveEvent[]) => boolean, ms: number): Promise<boolean> => {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (pred(events)) return true;
      await new Promise((r) => setTimeout(r, 10));
    }
    return pred(events);
  };

  return { events, ready, close: () => controller.abort(), waitFor };
}

// The ids of every entry on the page, in page order.
export function entryIds(html: string): number[] {
  return [...html.matchAll(/data-id="(\d+)"/g)].map((m) => Number(m[1]));
}
