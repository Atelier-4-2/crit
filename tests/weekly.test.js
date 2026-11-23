const assert = require("node:assert/strict");
const test = require("node:test");
const L = require("../lib.js");

const P = (text, o) => L.parseTranscript(text, o);
const times = (r) => r.paras.map((p) => p.t);
const texts = (r) => r.paras.map((p) => p.text);

/* ---------------- time tokens ---------------- */
test("parseTimeToken", () => {
  assert.equal(L.parseTimeToken("12:34"), 754);
  assert.equal(L.parseTimeToken("00:12:34"), 754);
  assert.equal(L.parseTimeToken("1:02:03"), 3723);
  assert.equal(L.parseTimeToken("00:01,500"), 1.5);
  assert.equal(L.parseTimeToken("01:02:03.250"), 3723.25);
  assert.equal(L.parseTimeToken("125:03"), 125 * 60 + 3);
  assert.equal(L.parseTimeToken("12:75"), null);
  assert.equal(L.parseTimeToken("abc"), null);
});

/* ---------------- timestamp formats ---------------- */
test("bracketed [hh:mm:ss] lines with text on the same line", () => {
  const r = P("[00:00:05] 안녕하세요 오늘 크리틱 시작하겠습니다.\n[00:00:42] 네, 평면부터 보겠습니다.\n[00:01:30] 계단 위치가 문제네요.");
  assert.equal(r.format, "lines");
  assert.deepEqual(times(r), [5, 42, 90]);
  assert.equal(r.paras[0].text, "안녕하세요 오늘 크리틱 시작하겠습니다.");
  assert.equal(r.timed, 3);
});
test("plain hh:mm:ss, mm:ss and (mm:ss) headers", () => {
  assert.deepEqual(times(P("00:12:34 첫 문장\n00:13:10 둘째 문장")), [754, 790]);
  assert.deepEqual(times(P("12:34 첫 문장\n13:10 둘째 문장")), [754, 790]);
  assert.deepEqual(times(P("(12:34) 첫 문장\n(13:10) 둘째 문장")), [754, 790]);
  assert.deepEqual(times(P("12:34 - 첫 문장\n13:10 - 둘째 문장")), [754, 790]);
});
test("Clova / ALT style: speaker + time on one line, text on the lines below", () => {
  const r = P("화자 1 00:03\n안녕하세요 도면 봤습니다.\n계단이 좀 좁아 보이네요.\n\n화자 2 00:21\n네 그 부분은 수정하겠습니다.\n\n참석자 1 01:05\n좋습니다.");
  assert.equal(r.format, "lines");
  assert.deepEqual(times(r), [3, 21, 65]);
  assert.deepEqual(r.paras.map((p) => p.speaker), ["화자 1", "화자 2", "참석자 1"]);
  assert.equal(r.paras[0].text, "안녕하세요 도면 봤습니다. 계단이 좀 좁아 보이네요.");
});
test("time then speaker, and speaker colon + text after the time", () => {
  const r = P("00:03 화자 1\n안녕하세요\n00:21 화자 2\n네\n00:40 화자 1: 다음 쪽 보죠");
  assert.deepEqual(times(r), [3, 21, 40]);
  assert.deepEqual(r.paras.map((p) => p.speaker), ["화자 1", "화자 2", "화자 1"]);
  assert.equal(r.paras[2].text, "다음 쪽 보죠");
});
test("speaker on its own line, then the time line, then text", () => {
  const r = P("화자 1\n00:03\n안녕하세요\n화자 2\n00:30\n네 안녕하세요");
  assert.deepEqual(times(r), [3, 30]);
  assert.deepEqual(r.paras.map((p) => p.speaker), ["화자 1", "화자 2"]);
});
test("free speaker name before a time: 홍길동 [00:12:00] text / Name 12:00", () => {
  const r = P("김교수 [00:12:00] 이 부분은 다시 생각해 보세요.\n이학생 [00:12:40] 알겠습니다.");
  assert.deepEqual(times(r), [720, 760]);
  assert.deepEqual(r.paras.map((p) => p.speaker), ["김교수", "이학생"]);
  const r2 = P("김교수 12:00\n다시 생각해 보세요\n이학생 12:40\n알겠습니다");
  assert.deepEqual(r2.paras.map((p) => p.speaker), ["김교수", "이학생"]);
  assert.deepEqual(times(r2), [720, 760]);
});
test("French / English speaker labels", () => {
  const r = P("Intervenant 1 00:05\nBonjour à tous.\nSpeaker 2 00:20\nThank you.");
  assert.deepEqual(r.paras.map((p) => p.speaker), ["Intervenant 1", "Speaker 2"]);
});
test("SRT: cues become paragraphs, neighbouring cues of one speaker are merged", () => {
  const srt = "1\n00:00:01,000 --> 00:00:03,500\n안녕하세요.\n\n2\n00:00:03,600 --> 00:00:06,000\n크리틱을 시작합니다.\n\n3\n00:00:20,000 --> 00:00:23,000\n<i>계단</i> 위치를 봅시다.\n";
  const r = P(srt);
  assert.equal(r.format, "srt");
  assert.deepEqual(times(r), [1, 20]);
  assert.equal(r.paras[0].text, "안녕하세요. 크리틱을 시작합니다.");
  assert.equal(r.paras[1].text, "계단 위치를 봅시다.");
});
test("WebVTT: header, notes, mm:ss.mmm cues and <v Speaker> tags", () => {
  const vtt = "WEBVTT\n\nNOTE made by tool\n\n00:01.000 --> 00:03.000\n<v 김교수>첫 문장입니다.</v>\n\n00:30.000 --> 00:33.000\n<v 이학생>답변입니다.</v>\n";
  const r = P(vtt);
  assert.equal(r.format, "vtt");
  assert.deepEqual(times(r), [1, 30]);
  assert.deepEqual(r.paras.map((p) => p.speaker), ["김교수", "이학생"]);
  assert.deepEqual(texts(r), ["첫 문장입니다.", "답변입니다."]);
});
test("CRLF, BOM and non-breaking spaces", () => {
  const r = P("﻿[00:00:05] 첫째\r\n[00:00:10] 둘째\r\n");
  assert.deepEqual(times(r), [5, 10]);
});
test("a single time-looking line is not enough to call it timed", () => {
  const r = P("회의는 10:30 에 시작합니다.\n그리고 끝났습니다.");
  assert.equal(r.timed, 0);
  assert.equal(r.paras.length, 2);
});
test("noTimes keeps the raw text and no times", () => {
  const r = P("[00:00:05] 첫째\n[00:00:10] 둘째", { noTimes: true });
  assert.equal(r.timed, 0);
  assert.equal(r.paras[0].text, "[00:00:05] 첫째");
});
test("non-monotonic times are counted, not rejected", () => {
  const r = P("[00:10] a\n[00:05] b\n[00:20] c");
  assert.equal(r.nonMonotonic, 1);
});

/* ---------------- no timestamps ---------------- */
test("no times: blank lines separate paragraphs, wrapped lines join", () => {
  const r = P("첫 문단의 첫 줄\n첫 문단의 둘째 줄\n\n둘째 문단");
  assert.equal(r.format, "plain");
  assert.deepEqual(texts(r), ["첫 문단의 첫 줄 첫 문단의 둘째 줄", "둘째 문단"]);
  assert.deepEqual(times(r), [null, null]);
});
test("no times and no blank lines: one paragraph per line", () => {
  assert.deepEqual(texts(P("가\n나\n다")), ["가", "나", "다"]);
});
test("no times: speaker labels with colon, and free names only when repeated", () => {
  const r = P("화자 1: 안녕하세요\n화자 2: 네\n김교수: 좋습니다\n김교수: 다음으로 갑시다\n메모: 한 번만");
  assert.deepEqual(r.paras.map((p) => p.speaker), ["화자 1", "화자 2", "김교수", "김교수", ""]);
  assert.equal(r.paras[2].text, "좋습니다");
  assert.equal(r.paras[4].text, "메모: 한 번만");
});
test("empty input", () => {
  assert.equal(P("").paras.length, 0);
  assert.equal(P("  \n \n").paras.length, 0);
});
test("preview rows", () => {
  const rows = L.previewTranscript(P("[00:01] a\n[00:02] b\n[00:03] c"), 2);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { i: 1, time: "0:01", speaker: "", text: "a" });
});

/* ---------------- two anchors -> estimate ---------------- */
test("fillEstimates: straight line between two fixed paragraphs, outside stays empty", () => {
  let paras = P("a\nb\nc\nd\ne").paras;
  paras = L.setAnchor(paras, "p2", 10);
  assert.equal(paras.every((p) => p.t == null || p.id === "p2"), true); // one anchor: nothing to interpolate
  paras = L.setAnchor(paras, "p5", 40);
  assert.deepEqual(paras.map((p) => p.t), [null, 10, 20, 30, 40]);
  assert.deepEqual(paras.map((p) => p.est), [false, false, true, true, false]);
  assert.equal(L.fixedCount(paras), 2);
});
test("anchors can be changed and cleared, estimates are recomputed", () => {
  let paras = P("a\nb\nc\nd").paras;
  paras = L.setAnchor(L.setAnchor(paras, "p1", 10), "p4", 40);
  assert.deepEqual(paras.map((p) => Math.round(p.t)), [10, 20, 30, 40]);
  paras = L.setAnchor(paras, "p3", 15);
  assert.deepEqual(paras.map((p) => Math.round(p.t * 10) / 10), [10, 12.5, 15, 40]);
  assert.equal(paras[2].est, false);
  paras = L.clearAnchor(paras, "p3");
  assert.deepEqual(paras.map((p) => Math.round(p.t)), [10, 20, 30, 40]);
  assert.equal(paras[2].anchor, false);
  // a parsed time that was overridden comes back when the anchor is cleared
  const parsed = L.fillEstimates(P("[00:10] a\n[00:20] b\n[00:30] c").paras);
  const moved = L.setAnchor(parsed, "p2", 25);
  assert.equal(moved[1].t, 25);
  assert.equal(L.clearAnchor(moved, "p2")[1].t, 20);
});
test("reversed anchors do not interpolate", () => {
  let paras = P("a\nb\nc\nd").paras;
  paras = L.setAnchor(L.setAnchor(paras, "p1", 50), "p4", 10);
  assert.deepEqual(paras.map((p) => p.t), [50, null, null, 10]);
});
test("activePara follows playback time", () => {
  const paras = P("[00:10] a\n[00:20] b\n[00:30] c").paras;
  assert.equal(L.activePara(paras, 5), -1);
  assert.equal(L.activePara(paras, 10), 0);
  assert.equal(L.activePara(paras, 25), 1);
  assert.equal(L.activePara(paras, 999), 2);
});

/* ---------------- pin <-> paragraph ---------------- */
test("linkPinsToParas: +-20 s window, nearest first, fallback to the paragraph being spoken", () => {
  const paras = P("[00:10] a\n[00:40] b\n[01:00] c\n[05:00] d").paras;
  const pins = [
    { id: 1, t: 45, untimed: false }, // b (5 s), c (15 s) -> primary b
    { id: 2, t: 200, untimed: false }, // nothing within 20 s; c started 140 s ago > 90 s -> unlinked
    { id: 3, t: 120, untimed: false }, // c started 60 s ago -> fallback
    { id: 4, t: 0, untimed: true }, // untimed pins are skipped
    { id: 5, t: 25, untimed: false }, // a(15), b(15) tie -> earlier
  ];
  const l = L.linkPinsToParas(pins, paras);
  assert.deepEqual(l[1].paraIds, ["p2", "p3"]);
  assert.equal(l[1].primary, "p2");
  assert.equal(l[1].fallback, false);
  assert.equal(l[2], undefined);
  assert.equal(l[3].primary, "p3"); assert.equal(l[3].fallback, true);
  assert.equal(l[4], undefined);
  assert.equal(l[5].primary, "p1");
  assert.equal(L.pinForPara(l, "p2"), 1);
  assert.equal(L.pinForPara(l, "p4"), null);
});
test("linkPinsToParas with no timed paragraphs", () => {
  assert.deepEqual(L.linkPinsToParas([{ id: 1, t: 5 }], P("가\n나").paras), {});
});

/* ---------------- files ---------------- */
test("decodeBytes: BOM, UTF-8, UTF-16, EUC-KR", () => {
  const enc = new TextEncoder();
  assert.equal(L.decodeBytes(new Uint8Array([0xef, 0xbb, 0xbf, ...enc.encode("가나")])), "가나");
  assert.equal(L.decodeBytes(enc.encode("안녕")), "안녕");
  assert.equal(L.decodeBytes(new Uint8Array([0xff, 0xfe, 0x00, 0xac, 0x98, 0xb0])), "가나");
  assert.equal(L.decodeBytes(new Uint8Array([0xb0, 0xa1, 0xb3, 0xaa])), "가나"); // EUC-KR bytes
});
test("docxToText: paragraphs, runs, tabs, entities, empty paragraphs", () => {
  const xml = '<w:document><w:body><w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:t>[00:12] 김교수</w:t></w:r><w:r><w:t xml:space="preserve"> &amp; 이학생</w:t></w:r></w:p><w:p/><w:p><w:r><w:t>둘째</w:t><w:tab/><w:t>줄</w:t></w:r></w:p></w:body></w:document>';
  assert.equal(L.docxToText(xml), "[00:12] 김교수 & 이학생\n\n둘째 줄");
});
test("docx paragraphs with times parse like pasted text", () => {
  const xml = "<w:p><w:r><w:t>[00:05] a</w:t></w:r></w:p><w:p><w:r><w:t>[00:09] b</w:t></w:r></w:p>";
  assert.deepEqual(times(P(L.docxToText(xml))), [5, 9]);
});

/* ---------------- PDF line rebuild ---------------- */
function item(str, x, y, w, h = 10) { return { str, x, y, w: w == null ? str.length * 5 : w, h }; }
test("rebuildPdfLines: y grouping, x order, gap spaces, split runs", () => {
  const page = [
    item("world", 60, 700), item("Hello", 20, 700), // out of order, one line
    item("다음 줄", 20, 686),
    item("a", 20, 672), item("b", 25, 672), // adjacent runs: no space
  ];
  const r = L.rebuildPdfLines([page]);
  assert.deepEqual(r.lines, ["Hello world", "다음 줄", "ab"]);
});
test("rebuildPdfLines: slight y jitter stays on one line", () => {
  const r = L.rebuildPdfLines([[item("A", 20, 700.4), item("B", 40, 699.8), item("C", 20, 650)]]);
  assert.equal(r.lines[0], "A B");
});
test("rebuildPdfLines: repeated header/footer and page numbers are removed, speaker/time lines are kept", () => {
  const pages = [1, 2, 3, 4].map((n) => [
    item("Butte-Rouge F1 · 크리틱 전사", 20, 800),
    item("화자 1 0" + n + ":00", 20, 760),
    item("내용 " + n, 20, 746),
    item("- " + n + " -", 20, 30),
  ]);
  const r = L.rebuildPdfLines(pages);
  assert.deepEqual(r.lines, ["화자 1 01:00", "내용 1", "화자 1 02:00", "내용 2", "화자 1 03:00", "내용 3", "화자 1 04:00", "내용 4"]);
  assert.equal(r.removed.length, 8);
  // and the result parses as a timed transcript
  const t = P(r.text);
  assert.deepEqual(times(t), [60, 120, 180, 240]);
});
test("rebuildPdfLines: speaker-only lines repeated at the top of pages are not mistaken for headers", () => {
  const pages = [1, 2, 3].map((n) => [item("화자 1", 20, 760), item("00:0" + n, 60, 760), item("본문 " + "가나다"[n - 1], 20, 746)]);
  const r = L.rebuildPdfLines(pages);
  assert.equal(r.lines.length, 6);
  assert.equal(r.removed.length, 0);
});
test("rebuildPdfLines: hyphenated line breaks join, also across pages", () => {
  const r = L.rebuildPdfLines([[item("the circu-", 20, 700), item("lation is fine", 20, 686), item("and stairs sta-", 20, 672)], [item("irs again", 20, 700)]]);
  assert.equal(r.lines[0], "the circulation is fine");
  assert.equal(r.lines[1], "and stairs stairs again");
});
test("rebuildPdfLines: large vertical gap becomes a paragraph break; scanned pdf has no chars", () => {
  const r = L.rebuildPdfLines([[item("첫째", 20, 700), item("같은 문단", 20, 686), item("새 문단", 20, 640)]]);
  assert.deepEqual(r.lines, ["첫째", "같은 문단", "", "새 문단"]);
  assert.deepEqual(P(r.text).paras.map((p) => p.text), ["첫째 같은 문단", "새 문단"]);
  assert.equal(L.rebuildPdfLines([[], []]).chars, 0);
});

/* ---------------- feedback ---------------- */
test("addFeedback / update / delete / limits", () => {
  let fb = [];
  fb = L.addFeedback(fb, { text: "  계단을 옮길 것 ", paraId: "p3", t: 90, pinId: 2, page: 1 });
  fb = L.addFeedback(fb, { text: "   " });
  assert.equal(fb.length, 1);
  assert.deepEqual([fb[0].id, fb[0].text, fb[0].status, fb[0].pinId, fb[0].page], [1, "계단을 옮길 것", "todo", 2, 1]);
  fb = L.addFeedback(fb, { text: "단면 추가" });
  assert.equal(fb[1].id, 2);
  fb = L.updateFeedback(fb, 1, { status: "done", note: "2주차 평면에서 계단 옮김" });
  assert.equal(fb[0].status, "done");
  fb = L.updateFeedback(fb, 1, { status: "nonsense" });
  assert.equal(fb[0].status, "done");
  fb = L.deleteFeedback(fb, 2);
  assert.equal(fb.length, 1);
});
test("carryOver: only todo + hold, linked to the source, no duplicates", () => {
  let w1 = [];
  w1 = L.addFeedback(w1, { text: "a" });
  w1 = L.addFeedback(w1, { text: "b", status: "done" });
  w1 = L.addFeedback(w1, { text: "c", status: "hold" });
  const prev = { id: "w1", n: 1 };
  const r = L.carryOver(w1, prev, []);
  assert.equal(r.added, 2);
  assert.deepEqual(r.items.map((x) => [x.text, x.status, x.carriedFrom.weekId, x.carriedFrom.itemId, x.carriedFrom.weekN]), [["a", "todo", "w1", 1, 1], ["c", "hold", "w1", 3, 1]]);
  const again = L.carryOver(w1, prev, r.items);
  assert.equal(again.added, 0);
  assert.equal(again.items.length, 2);
  // an item carried from week 1 that is still open carries on to week 3 and points at week 2
  const r3 = L.carryOver(r.items, { id: "w2", n: 2 }, [{ id: 1, text: "own", status: "todo", carriedFrom: null }]);
  assert.equal(r3.items.length, 3);
  assert.equal(r3.items[1].carriedFrom.weekId, "w2");
});
test("feedbackStats separates own and carried items", () => {
  let fb = L.addFeedback([], { text: "a" });
  fb = L.addFeedback(fb, { text: "b", status: "done" });
  fb = L.addFeedback(fb, { text: "c", status: "hold" });
  fb = L.addFeedback(fb, { text: "d", carriedFrom: { weekId: "w0", weekN: 1, itemId: 4 } });
  assert.deepEqual(L.feedbackStats(fb), { own: 3, todo: 1, done: 1, hold: 1, carried: 1, carriedOpen: 1, open: 2 });
});
test("normalizeFeedback / normalizeTranscript clean foreign data", () => {
  const fb = L.normalizeFeedback([{ id: 1, text: "ok", status: "weird", carriedFrom: { weekId: "w", weekN: 2, itemId: 3 } }, { id: 1, text: "dup id" }, { text: "" }, null, 5]);
  assert.equal(fb.length, 2);
  assert.equal(fb[0].status, "todo");
  assert.notEqual(fb[0].id, fb[1].id);
  assert.equal(L.normalizeFeedback("not json").length, 0);
  const tr = L.normalizeTranscript({ paras: [{ id: "p1", t: 3, text: "a" }, { id: "p1", t: "x", text: "b" }, { text: "" }, { id: "bad id!", text: "c" }] });
  assert.equal(tr.paras.length, 3);
  assert.equal(new Set(tr.paras.map((p) => p.id)).size, 3);
  assert.equal(tr.paras[1].t, null);
  assert.equal(L.normalizeTranscript({ nope: 1 }), null);
});

/* ---------------- weeks / migration ---------------- */
test("migrateToWeeks: old sessions become weeks 1..n in creation order with a date", () => {
  const d = (s) => new Date(s + "T10:00:00").getTime();
  const metas = [{ id: "b", title: "B", createdAt: d("2026-11-18") }, { id: "a", title: "A", createdAt: d("2026-11-04") }, { id: "c", title: "C", createdAt: d("2026-11-11"), n: 7, date: "2026-11-11" }];
  const r = L.migrateToWeeks(metas);
  const by = Object.fromEntries(r.metas.map((m) => [m.id, m]));
  assert.equal(by.c.n, 7);
  assert.deepEqual([by.a.n, by.a.date], [8, "2026-11-04"]);
  assert.deepEqual([by.b.n, by.b.date], [9, "2026-11-18"]);
  assert.deepEqual(r.changed.map((m) => m.id).sort(), ["a", "b"]);
  assert.equal(L.migrateToWeeks(r.metas).changed.length, 0); // idempotent
  assert.equal(L.nextWeekNo(r.metas), 10);
  assert.deepEqual(L.sortWeeks(r.metas).map((m) => m.id), ["a", "c", "b"]);
  assert.equal(L.previousWeek(r.metas, "b").id, "c");
  assert.equal(L.previousWeek(r.metas, "a"), null);
  assert.equal(L.dateShort("2026-11-18"), "11/18");
});
test("session.json round trip keeps the week number and date; old files still parse", () => {
  const s = { title: "t", createdAt: 1, presentMin: 5, n: 3, date: "2026-11-18", pages: [{ w: 10, h: 10, name: "x" }], pins: [], audio: null };
  const meta = L.buildSessionMeta(s, null, ["pages/p1.jpg"]);
  assert.deepEqual(meta.week, { n: 3, date: "2026-11-18" });
  assert.deepEqual(L.parseSessionMeta(JSON.stringify(meta)).week, { n: 3, date: "2026-11-18" });
  const old = Object.assign({}, meta); delete old.week;
  assert.equal(L.parseSessionMeta(JSON.stringify(old)).week, null);
});
test(".crit / project bundle entry names", () => {
  assert.equal(L.isCritEntryName("transcript.json"), true);
  assert.equal(L.isCritEntryName("feedback.json"), true);
  assert.equal(L.isCritEntryName("../x.json"), false);
  assert.equal(L.isProjectEntryName("project.json"), true);
  assert.equal(L.isProjectEntryName("weeks/wabc-1/session.json"), true);
  assert.equal(L.isProjectEntryName("weeks/wabc-1/pages/p3.png"), true);
  assert.equal(L.isProjectEntryName("weeks/../evil.json"), false);
  assert.equal(L.isProjectEntryName("weeks/w1/pages/../../x"), false);
  assert.equal(L.isProjectEntryName("weeks/w1/other.bin"), false);
  const pm = L.parseProjectMeta(JSON.stringify(L.buildProjectMeta("P", [{ id: "w1", n: 1, date: "2026-11-04", title: "a" }, { id: "../bad", n: 2 }])));
  assert.equal(pm.name, "P");
  assert.equal(pm.weeks.length, 1);
  assert.throws(() => L.parseProjectMeta({ format: "other" }), /format/);
});

/* ---------------- sync plan ---------------- */
test("planSync: push / pull / conflict / deletions", () => {
  const local = [
    { id: "same", updatedAt: 5, syncedAt: 5 },
    { id: "localOnlyChange", updatedAt: 9, syncedAt: 5 },
    { id: "remoteOnlyChange", updatedAt: 5, syncedAt: 5 },
    { id: "both", updatedAt: 9, syncedAt: 5 },
    { id: "new", updatedAt: 3, syncedAt: null },
    { id: "deletedRemotely", updatedAt: 5, syncedAt: 5 },
    { id: "deletedRemotelyButEdited", updatedAt: 8, syncedAt: 5 },
  ];
  const remote = [
    { id: "same", updatedAt: 5 }, { id: "localOnlyChange", updatedAt: 5 }, { id: "remoteOnlyChange", updatedAt: 7 }, { id: "both", updatedAt: 8 },
    { id: "deletedRemotely", updatedAt: 6, deleted: true }, { id: "deletedRemotelyButEdited", updatedAt: 6, deleted: true },
    { id: "fresh", updatedAt: 2 }, { id: "goneHere", updatedAt: 4 }, { id: "goneHereButEditedThere", updatedAt: 99 }, { id: "oldDeleted", updatedAt: 1, deleted: true },
  ];
  const tombs = [{ id: "goneHere", at: 10 }, { id: "goneHereButEditedThere", at: 10 }];
  const p = L.planSync(local, remote, tombs);
  assert.deepEqual(p.push.sort(), ["deletedRemotelyButEdited", "localOnlyChange", "new"]);
  assert.deepEqual(p.pull.sort(), ["fresh", "goneHereButEditedThere", "remoteOnlyChange"]);
  assert.deepEqual(p.conflict, ["both"]);
  assert.deepEqual(p.pullDelete, ["deletedRemotely"]);
  assert.deepEqual(p.pushDelete, ["goneHere"]);
});
test("mergeManifestWeeks replaces by id and sorts", () => {
  const m = L.mergeManifestWeeks([{ id: "a", n: 2, updatedAt: 1 }, { id: "b", n: 1, updatedAt: 1 }], [{ id: "a", n: 2, updatedAt: 5 }, { id: "c", n: 3, deleted: true }]);
  assert.deepEqual(m.map((w) => [w.id, w.updatedAt || 0]), [["b", 1], ["a", 5], ["c", 0]]);
  assert.equal(L.normalizeRemoteWeek({ id: "../x" }), null);
  assert.equal(L.normalizeRemoteWeek({ id: "w1", n: 2, date: "2026-11-18", updatedAt: 5, blobsRev: "r" }).n, 2);
});

/* ---------------- Markdown + search ---------------- */
const LBL = {
  project: "프로젝트", week: (n) => n + "주차", feedback: "피드백", none: "(없음)", text: "내용", status: "상태", note: "메모", source: "출처",
  pin: "핀", page: "쪽", pins: "핀 메모", transcript: "전사", statusName: { todo: "할 일", done: "반영함", hold: "보류" }, carried: (n) => n + "주차에서",
};
const WEEKS = () => [
  {
    id: "w2", n: 2, date: "2026-11-25", title: "단면", pins: [], transcript: null,
    feedback: L.addFeedback([], { text: "지난 계단 | 문제", carriedFrom: { weekId: "w1", weekN: 1, itemId: 1 }, status: "todo" }),
  },
  {
    id: "w1", n: 1, date: "2026-11-18", title: "평면",
    pins: L.addPin([], { page: 0, x: 0.5, y: 0.5, t: 90, note: "계단 폭" }),
    transcript: { paras: P("[00:01:30] 화자 1: 계단이 좁아요\n[00:02:00] 네").paras },
    feedback: L.updateFeedback(L.addFeedback([], { text: "계단 옮기기", t: 90, pinId: 1, page: 0 }), 1, { status: "done", note: "2주차에서 옮김" }),
  },
];
test("buildMarkdown: weeks in order, feedback table, pin notes, transcript", () => {
  const md = L.buildMarkdown({ name: "Butte-Rouge F1", weeks: WEEKS() }, LBL);
  assert.match(md, /^# Butte-Rouge F1\n/);
  assert.ok(md.indexOf("## 1주차 · 11/18 — 평면") < md.indexOf("## 2주차 · 11/25 — 단면"));
  assert.match(md, /\| 1 \| 계단 옮기기 \| 반영함 \| 2주차에서 옮김 \| 1:30 · 핀 1 \(1쪽\) \|/);
  assert.match(md, /지난 계단 \\\| 문제/);
  assert.match(md, /1주차에서/);
  assert.match(md, /- 핀 1 \(1쪽, 1:30\): 계단 폭/);
  assert.match(md, /\*\*\[1:30\]\*\* 화자 1: 계단이 좁아요/);
});
test("searchProject: all terms, Korean, speaker, feedback, pins", () => {
  const r = L.searchProject(WEEKS(), "계단");
  assert.deepEqual(r.map((x) => x.kind + ":" + x.weekId), ["feedback:w1", "pin:w1", "transcript:w1", "feedback:w2"]);
  assert.equal(L.searchProject(WEEKS(), "계단 좁아").length, 1);
  assert.equal(L.searchProject(WEEKS(), "화자 1").length, 1);
  assert.equal(L.searchProject(WEEKS(), "").length, 0);
  assert.equal(L.searchProject(WEEKS(), "없는말").length, 0);
  assert.match(r[2].snippet, /계단이/);
});
