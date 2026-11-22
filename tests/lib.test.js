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

/* ---------- review round (H1 recovery, M3 import caps, misc) ---------- */
function u16(n) { return [n & 255, (n >> 8) & 255]; }
function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
/** minimal stored-zip writer: entries [{name, data?:Uint8Array, declared?:number}] (declared overrides the uncompressed size in the directory) */
function makeZip(entries) {
  const parts = [], cd = [];
  let off = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name), data = e.data || Buffer.alloc(0);
    const lh = Buffer.from([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)]);
    parts.push(lh, name, data);
    const usz = e.declared != null ? e.declared : data.length;
    cd.push(Buffer.from([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(data.length), ...u32(usz), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), name);
    off += lh.length + name.length + data.length;
  }
  const cdBuf = Buffer.concat(cd);
  const eocd = Buffer.from([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(entries.length), ...u16(entries.length), ...u32(cdBuf.length), ...u32(off), ...u16(0)]);
  return new Uint8Array(Buffer.concat([...parts, cdBuf, eocd]));
}

test("recovery: contiguous prefix from seq 0, gaps dropped, order fixed", () => {
  const recs = [
    { seq: 2, size: 30, elapsed: 12 }, { seq: 0, size: 10, elapsed: 4 }, { seq: 1, size: 20, elapsed: 8 },
    { seq: 4, size: 50, elapsed: 20 }, // hole at 3 -> unusable (stream broken)
  ];
  const p = L.planRecovery(recs);
  assert.deepEqual(p.used.map((r) => r.seq), [0, 1, 2]);
  assert.equal(p.bytes, 60); assert.equal(p.dropped, 1); assert.equal(p.elapsed, 12); assert.equal(p.empty, false);
});
test("recovery: missing first chunk or empty chunks -> empty, duplicates ignored", () => {
  assert.equal(L.planRecovery([{ seq: 1, size: 9, elapsed: 4 }]).empty, true);
  assert.equal(L.planRecovery([]).empty, true);
  assert.equal(L.planRecovery([{ seq: 0, size: 0, elapsed: 1 }]).empty, true);
  const p = L.planRecovery([{ seq: 0, size: 5, elapsed: 4 }, { seq: 0, size: 99, elapsed: 5 }]);
  assert.equal(p.bytes, 5);
});
test("recovery: a recording held by a live tab is not offered", () => {
  const m = { rid: "r1", updatedAt: 1000 };
  assert.equal(L.isLiveRecording(m, ["crit-rec-r1"], 5e6), true);
  assert.equal(L.isLiveRecording(m, [], 5e6), false); // lock gone -> tab died -> recoverable
  assert.equal(L.isLiveRecording(m, null, 1000 + 5000), true); // no Web Locks: fresh heartbeat
  assert.equal(L.isLiveRecording(m, null, 1000 + 60000), false);
});
test(".crit scan: normal file passes, entries listed", () => {
  const z = makeZip([{ name: "session.json", data: Buffer.from("{}") }, { name: "pages/p1.jpg", data: Buffer.from("abc") }]);
  const e = L.scanZipDirectory(z);
  assert.deepEqual(e.map((x) => [x.name, x.originalSize]), [["session.json", 2], ["pages/p1.jpg", 3]]);
});
test(".crit scan: more than 500 entries is refused", () => {
  const many = Array.from({ length: 501 }, (_, i) => ({ name: "pages/p" + (i + 1) + ".jpg", data: Buffer.from("x") }));
  assert.throws(() => L.scanZipDirectory(makeZip(many)), /critmany/);
  const ok = Array.from({ length: 500 }, (_, i) => ({ name: "pages/p" + (i + 1) + ".jpg", data: Buffer.from("x") }));
  assert.equal(L.scanZipDirectory(makeZip(ok)).length, 500);
});
test(".crit scan: declared size over 1.5 GB total is refused (zip bomb)", () => {
  const bomb = makeZip([{ name: "audio.webm", data: Buffer.from("x"), declared: 1.6e9 }]);
  assert.throws(() => L.scanZipDirectory(bomb), /critbig/);
  const split = makeZip([{ name: "a", data: Buffer.from("x"), declared: 0.8e9 }, { name: "b", data: Buffer.from("x"), declared: 0.8e9 }]);
  assert.throws(() => L.scanZipDirectory(split), /critbig/);
  const edge = makeZip([{ name: "a", data: Buffer.from("x"), declared: 1.5e9 }]);
  assert.equal(L.scanZipDirectory(edge).length, 1);
});
test(".crit scan: garbage is a format error, only whitelisted names are readable", () => {
  assert.throws(() => L.scanZipDirectory(new Uint8Array(100)), /format/);
  assert.throws(() => L.scanZipDirectory(new Uint8Array(5)), /format/);
  assert.equal(L.isCritEntryName("session.json"), true);
  assert.equal(L.isCritEntryName("pages/p12.png"), true);
  assert.equal(L.isCritEntryName("audio.m4a"), true);
  assert.equal(L.isCritEntryName("__proto__"), false);
  assert.equal(L.isCritEntryName("../pages/p1.jpg"), false);
  assert.equal(L.isCritEntryName("pages/p1.exe"), false);
});
test("session meta: caps, duplicate ids, untimed", () => {
  const pins = Array.from({ length: 2100 }, (_, i) => ({ id: 1, page: 0, x: 0, y: 0, t: i, note: "n".repeat(900) }));
  const b = L.parseSessionMeta({ format: "atelier-crit", version: 1, pages: [{}], pins });
  assert.equal(b.pins.length, 2000);
  assert.equal(b.pins[0].note.length, 500);
  assert.equal(new Set(b.pins.map((p) => p.id)).size, 2000); // duplicate ids re-issued
  const u = L.parseSessionMeta({ format: "atelier-crit", version: 1, pages: [{}], pins: [{ id: 3, t: 0, untimed: true }, { id: 4, t: 5 }] });
  assert.equal(u.pins[0].untimed, true); assert.equal(u.pins[1].untimed, false);
});
test("untimed pins: kept after re-record, hidden from bar/current, retimable", () => {
  let p = L.addPin(L.addPin([], { page: 0, x: 0.1, y: 0.2, t: 30, note: "a" }), { page: 1, x: 0.5, y: 0.5, t: 60, note: "b" });
  p = L.untimeAll(p);
  assert.deepEqual(p.map((x) => [x.note, x.untimed, x.t]), [["a", true, 0], ["b", true, 0]]);
  assert.deepEqual(L.barPositions(p, 100), []);
  assert.equal(L.currentPin(p, 50), null);
  assert.equal(L.noteRows(p)[0].time, "—");
  p = L.setPinTime(p, p[1].id, 12);
  assert.equal(L.barPositions(p, 100).length, 1); assert.equal(p.find((x) => x.note === "b").untimed, false);
});
test("removePage drops its pins and shifts later ones", () => {
  let p = [];
  for (const [pg, t] of [[0, 1], [1, 2], [2, 3], [1, 4]]) p = L.addPin(p, { page: pg, x: 0, y: 0, t });
  const r = L.removePage(p, 1);
  assert.deepEqual(r.map((x) => [x.t, x.page, x.n]), [[1, 0, 1], [3, 1, 2]]);
});
test("fitSize caps height too", () => {
  assert.deepEqual(L.fitSize(2000, 8000, 2400, 3600), { w: 900, h: 3600 });
  assert.deepEqual(L.fitSize(3000, 1000, 2400, 3600), { w: 2400, h: 800 });
});
