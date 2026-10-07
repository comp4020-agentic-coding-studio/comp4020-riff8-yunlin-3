import { expect, it } from "vitest";
import { entryIds, marker, newVisitor, openStream, page, post } from "./helpers.ts";

// The crit 9 spec: a confirmed colophon reaches every other open page within
// about a second, with no reload, and a page that drops its connection gets
// exactly what it missed when it comes back.

it("a second open page receives a confirmed colophon within 1000 ms, and two quick writes arrive in order", async () => {
  const watcher = await newVisitor();
  const writer = await newVisitor();
  const stream = openStream("/events", { Cookie: watcher });
  await stream.ready;

  const first = marker("live-first");
  const second = marker("live-second");
  const started = Date.now();
  expect((await post("/colophons", { body: first }, writer)).status).toBe(303);
  expect((await post("/colophons", { body: second }, writer)).status).toBe(303);

  const mine = () => stream.events.filter((e) => e.data.html.includes(first) || e.data.html.includes(second));
  const arrived = await stream.waitFor(() => mine().length === 2, 1000);
  stream.close();

  expect(arrived, "both colophons should arrive live").toBe(true);
  expect(Date.now() - started).toBeLessThan(1000);
  const [a, b] = mine();
  expect(a!.data.html).toContain(first);
  expect(b!.data.html).toContain(second);
  expect(a!.id).toBeLessThan(b!.id);
});

it("an unconfirmed (rejected) line is never sent to anyone", async () => {
  const stream = openStream("/events");
  await stream.ready;
  const tooLong = marker("rejected") + "y".repeat(400);
  await post("/colophons", { body: tooLong });
  await new Promise((r) => setTimeout(r, 300));
  stream.close();
  expect(stream.events.some((e) => e.data.html.includes(tooLong.slice(0, 30)))).toBe(false);
});

it("reconnecting with Last-Event-ID delivers exactly the missed colophons, in order, no duplicates or gaps", async () => {
  const writer = await newVisitor();
  const before = marker("before-drop");
  await post("/colophons", { body: before }, writer);
  const lastSeen = Math.max(...entryIds(await page("/")));

  const missed = [marker("missed-1"), marker("missed-2"), marker("missed-3")];
  for (const body of missed) await post("/colophons", { body }, writer);

  const stream = openStream("/events", { "Last-Event-ID": String(lastSeen) });
  await stream.ready;
  await new Promise((r) => setTimeout(r, 300));
  const onPage = entryIds(await page("/")).filter((id) => id > lastSeen);
  await new Promise((r) => setTimeout(r, 200));
  stream.close();

  const ids = stream.events.map((e) => e.id);
  expect(new Set(ids).size, "no duplicates").toBe(ids.length);
  expect([...ids].sort((x, y) => x - y), "in order").toEqual(ids);
  expect(ids.every((id) => id > lastSeen), "nothing already seen").toBe(true);
  for (const id of onPage) expect(ids, `no gap: missing ${id}`).toContain(id);

  const ours = stream.events.filter((e) => missed.some((m) => e.data.html.includes(m)));
  expect(ours.map((e) => missed.findIndex((m) => e.data.html.includes(m)))).toEqual([0, 1, 2]);
  expect(stream.events.some((e) => e.data.html.includes(before))).toBe(false);
});

it("markup in a colophon body is escaped on the page and in the live event", async () => {
  const tag = marker("xss");
  const body = `<img src=x onerror=alert(1)> ${tag}`;
  const stream = openStream("/events");
  await stream.ready;
  await post("/colophons", { body });
  await stream.waitFor((evs) => evs.some((e) => e.data.html.includes(tag)), 1000);
  stream.close();

  const live = stream.events.find((e) => e.data.html.includes(tag))!;
  expect(live.data.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  expect(live.data.html).not.toContain("<img");

  const html = await page("/");
  const at = html.indexOf(tag);
  const entry = html.slice(html.lastIndexOf("<li", at), html.indexOf("</li>", at));
  expect(entry).toContain("&lt;img src=x onerror=alert(1)&gt;");
  expect(entry).not.toContain("<img");
});

it("the live entry is marked yours only on the writer's own stream", async () => {
  const writer = await newVisitor();
  const other = await newVisitor();
  const mine = openStream("/events", { Cookie: writer });
  const theirs = openStream("/events", { Cookie: other });
  await Promise.all([mine.ready, theirs.ready]);
  const body = marker("live-yours");
  await post("/colophons", { body }, writer);
  const has = (evs: { data: { html: string } }[]) => evs.some((e) => e.data.html.includes(body));
  await Promise.all([mine.waitFor(has, 1000), theirs.waitFor(has, 1000)]);
  mine.close();
  theirs.close();
  expect(mine.events.find((e) => e.data.html.includes(body))!.data.html).toContain("colophon--mine");
  expect(theirs.events.find((e) => e.data.html.includes(body))!.data.html).not.toContain("colophon--mine");
});
