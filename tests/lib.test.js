const assert = require("node:assert/strict");
const test = require("node:test");
const L = require("../lib.js");

test("formatTime", () => {
  assert.equal(L.formatTime(0), "0:00");
  assert.equal(L.formatTime(65.9), "1:05");
  assert.equal(L.formatTime(3725), "1:02:05");
  assert.equal(L.formatTime(-4), "0:00");
  assert.equal(L.formatTime(NaN), "0:00");
});
test("clock excludes paused time", () => {
  let c = L.clockNew();
  c = L.clockStart(c, 1000);
  assert.equal(L.clockElapsed(c, 4000), 3);
  c = L.clockPause(c, 4000);
  assert.equal(L.clockElapsed(c, 99000), 3);
  c = L.clockStart(c, 100000);
  assert.equal(L.clockElapsed(c, 102000), 5);
  assert.equal(L.clockStart(c, 5), c); // already running
});
test("talkState", () => {
  assert.equal(L.talkState(0, 10).enabled, false);
  let s = L.talkState(10, 0);
  assert.equal(s.remaining, 600); assert.equal(s.warn, false);
  s = L.talkState(10, 541); assert.equal(s.warn, true); assert.equal(s.remaining, 59);
  s = L.talkState(10, 600); assert.equal(s.remaining, 0); assert.equal(s.warn, true); assert.equal(s.over, false);
  s = L.talkState(10, 601); assert.equal(s.over, true); assert.equal(s.warn, false); assert.equal(s.remaining, -1);
});
test("addPin numbers by time, clamps", () => {
  let p = [];
  p = L.addPin(p, { page: 0, x: 0.2, y: 0.3, t: 30 });
  p = L.addPin(p, { page: 1, x: 1.7, y: -2, t: 10 });
  assert.deepEqual(p.map((x) => [x.n, x.t]), [[1, 10], [2, 30]]);
  assert.equal(p[0].x, 1); assert.equal(p[0].y, 0);
  assert.equal(new Set(p.map((x) => x.id)).size, 2);
});
test("delete renumbers, ids stay unique after delete", () => {
  let p = [];
  for (const t of [5, 15, 25]) p = L.addPin(p, { page: 0, x: 0.5, y: 0.5, t });
  const mid = p[1].id;
  p = L.deletePin(p, mid);
  assert.deepEqual(p.map((x) => x.n), [1, 2]);
  p = L.addPin(p, { page: 0, x: 0.1, y: 0.1, t: 20 });
  assert.equal(new Set(p.map((x) => x.id)).size, 3);
  assert.deepEqual(p.map((x) => x.t), [5, 20, 25]);
});
test("move, note update, star", () => {
  let p = L.addPin([], { page: 0, x: 0.5, y: 0.5, t: 8 });
  const id = p[0].id;
  p = L.movePin(p, id, 2, 0.25);
  assert.equal(p[0].x, 1); assert.equal(p[0].y, 0.25); assert.equal(p[0].t, 8);
  p = L.updatePin(p, id, { note: "축 정리" });
  assert.equal(p[0].note, "축 정리");
  p = L.toggleStar(p, id); assert.equal(p[0].star, true);
  p = L.toggleStar(p, id); assert.equal(p[0].star, false);
});
test("pinSeek is 3s before, never negative", () => {
  assert.equal(L.pinSeek(10), 7);
  assert.equal(L.pinSeek(2), 0);
  assert.equal(L.pinSeek(10, 5), 5);
});
test("barPositions", () => {
  const p = L.addPin(L.addPin([], { page: 0, x: 0, y: 0, t: 30 }), { page: 0, x: 0, y: 0, t: 90 });
  const b = L.barPositions(p, 60);
  assert.deepEqual(b.map((x) => x.frac), [0.5, 1]);
  assert.deepEqual(L.barPositions(p, 0), []);
  assert.deepEqual(L.barPositions(p, Infinity).length, 2); // Infinity>0 -> fracs 0
});
test("currentPin", () => {
  let p = [];
  for (const t of [5, 15]) p = L.addPin(p, { page: 0, x: 0, y: 0, t });
  assert.equal(L.currentPin(p, 4), null);
  assert.equal(L.currentPin(p, 5).n, 1);
  assert.equal(L.currentPin(p, 99).n, 2);
});
test("pinsOnPage / pinPixel", () => {
  let p = L.addPin([], { page: 0, x: 0.5, y: 0.25, t: 1 });
  p = L.addPin(p, { page: 2, x: 0, y: 0, t: 2 });
  assert.equal(L.pinsOnPage(p, 2).length, 1);
  assert.deepEqual(L.pinPixel(p[0], 400, 200), { x: 200, y: 50 });
});
test("paginateRows", () => {
  const rows = Array.from({ length: 11 }, (_, i) => i);
  const s = L.paginateRows(rows, 3, 5);
  assert.deepEqual(s.map((x) => x.length), [3, 5, 3]);
  assert.equal(L.paginateRows([], 3, 5).length, 1);
});
test("wrapText breaks long CJK and keeps newlines", () => {
  const measure = (s) => s.length * 10;
  const out = L.wrapText("가나다라마바사아자차", 50, measure);
  assert.deepEqual(out, ["가나다라마", "바사아자차"]);
  assert.deepEqual(L.wrapText("a\nb", 50, measure), ["a", "b"]);
  assert.deepEqual(L.wrapText("one two three", 80, measure), ["one two", "three"]);
});
test("noteRows", () => {
  let p = L.addPin([], { page: 0, x: 0, y: 0, t: 65, note: "n", star: true });
  p = L.addPin(p, { page: 0, x: 0, y: 0, t: 5 });
  assert.equal(L.noteRows(p)[1].time, "1:05");
  assert.equal(L.noteRows(p, true).length, 1);
});
test("file helpers", () => {
  assert.equal(L.extForMime("audio/webm;codecs=opus"), "webm");
  assert.equal(L.extForMime("audio/mp4"), "m4a");
  assert.equal(L.safeName('a/b:c*"?', "x"), "a b c");
  assert.equal(L.safeName("", "x"), "x");
  assert.equal(L.stamp(new Date(2026, 10, 22)), "20261122");
  assert.deepEqual(L.fitSize(4000, 2000, 1000), { w: 1000, h: 500 });
  assert.deepEqual(L.fitSize(500, 200, 1000), { w: 500, h: 200 });
});
test("session meta round trip + validation", () => {
  let pins = L.addPin([], { page: 1, x: 0.4, y: 0.6, t: 12.5, note: "빛", star: true });
  const s = { title: "중간 크리틱", createdAt: 1, presentMin: 10, pages: [{ w: 10, h: 20 }, { w: 30, h: 40, name: "p2" }], pins, audio: { mime: "audio/webm", duration: 99 } };
  const meta = L.buildSessionMeta(s, "audio.webm", ["pages/p1.jpg", "pages/p2.jpg"]);
  const back = L.parseSessionMeta(JSON.stringify(meta));
  assert.equal(back.pins[0].note, "빛"); assert.equal(back.pins[0].n, 1);
  assert.equal(back.pages[1].file, "pages/p2.jpg"); assert.equal(back.audio.duration, 99);
  assert.throws(() => L.parseSessionMeta("{bad"), /json/);
  assert.throws(() => L.parseSessionMeta({ format: "x", version: 1 }), /format/);
  const clamped = L.parseSessionMeta({ format: "atelier-crit", version: 1, pages: [{}], pins: [{ page: 9, x: 5, y: -1, t: -4 }] });
  assert.equal(clamped.pins[0].page, 0); assert.equal(clamped.pins[0].x, 1); assert.equal(clamped.pins[0].t, 0);
  assert.equal(clamped.audio, null);
});
test("paginateByHeight", () => {
  assert.deepEqual(L.paginateByHeight([50, 50, 50, 50, 50], 120, 100), [[0, 1], [2, 3], [4]]);
  assert.deepEqual(L.paginateByHeight([], 100, 100), [[]]);
  assert.deepEqual(L.paginateByHeight([500], 100, 100), [[0]]);
});
