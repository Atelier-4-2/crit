/* Atelier Crit - pure functions (no DOM). Works in browser (window.CritLib) and node (module.exports). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CritLib = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PRE_ROLL = 3; // seconds before the pin when playing back
  var MAX_PINS = 2000, MAX_NOTE = 500;
  /** .crit open limits: total uncompressed bytes, number of zip entries */
  var CRIT_LIMITS = { maxTotal: 1.5e9, maxEntries: 500 };

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  /** seconds -> "m:ss" or "h:mm:ss" */
  function formatTime(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h > 0 ? h + ":" + pad2(m) + ":" + pad2(s) : m + ":" + pad2(s);
  }

  /* ---------- recording clock (pause aware) ---------- */
  function clockNew() { return { running: false, startedAt: 0, accumulated: 0 }; }
  function clockStart(c, now) { return c.running ? c : { running: true, startedAt: now, accumulated: c.accumulated }; }
  function clockPause(c, now) {
    return c.running ? { running: false, startedAt: 0, accumulated: c.accumulated + (now - c.startedAt) } : c;
  }
  /** elapsed recording seconds (paused time excluded) */
  function clockElapsed(c, now) {
    return (c.accumulated + (c.running ? now - c.startedAt : 0)) / 1000;
  }

  /* ---------- presentation timer ---------- */
  /** state of the talk timer: {remaining, over, warn, label} ; warnAt = seconds before end */
  function talkState(presentMin, elapsedSec, warnAt) {
    warnAt = warnAt == null ? 60 : warnAt;
    var total = Math.max(0, Math.round((Number(presentMin) || 0) * 60));
    if (!total) return { enabled: false, remaining: 0, over: false, warn: false };
    var remaining = total - Math.floor(elapsedSec);
    return {
      enabled: true,
      remaining: remaining,
      over: remaining < 0,
      warn: remaining >= 0 && remaining <= warnAt,
    };
  }

  /* ---------- pins ---------- */
  function renumber(pins) {
    return pins
      .slice()
      .sort(function (a, b) { return a.t - b.t || a.id - b.id; })
      .map(function (p, i) { return Object.assign({}, p, { n: i + 1 }); });
  }
  function nextId(pins) {
    return pins.reduce(function (m, p) { return Math.max(m, p.id); }, 0) + 1;
  }
  /** x,y are fractions 0..1 of the page image. t = seconds on the audio timeline. */
  function addPin(pins, o) {
    var pin = {
      id: nextId(pins),
      n: 0,
      page: o.page | 0,
      x: clamp(+o.x, 0, 1),
      y: clamp(+o.y, 0, 1),
      t: Math.max(0, +o.t || 0),
      note: o.note || "",
      star: !!o.star,
      untimed: false,
    };
    return renumber(pins.concat([pin]));
  }
  function updatePin(pins, id, patch) {
    return renumber(pins.map(function (p) {
      if (p.id !== id) return p;
      var q = Object.assign({}, p, patch);
      q.x = clamp(+q.x, 0, 1); q.y = clamp(+q.y, 0, 1); q.t = Math.max(0, +q.t || 0);
      return q;
    }));
  }
  function movePin(pins, id, x, y) { return updatePin(pins, id, { x: x, y: y }); }
  function deletePin(pins, id) { return renumber(pins.filter(function (p) { return p.id !== id; })); }
  function toggleStar(pins, id) {
    return pins.map(function (p) { return p.id === id ? Object.assign({}, p, { star: !p.star }) : p; });
  }
  /** "re-record, keep notes": positions and notes stay, times are blanked (shown as an em dash) */
  function untimeAll(pins) {
    return renumber(pins.map(function (p) { return Object.assign({}, p, { t: 0, untimed: true }); }));
  }
  function setPinTime(pins, id, t) { return updatePin(pins, id, { t: t, untimed: false }); }
  /** delete page index `page`: its pins go, later pages shift down by one */
  function removePage(pins, page) {
    return renumber(pins.filter(function (p) { return p.page !== page; }).map(function (p) {
      return p.page > page ? Object.assign({}, p, { page: p.page - 1 }) : p;
    }));
  }
  function pinsOnPage(pins, page) { return pins.filter(function (p) { return p.page === page; }); }
  /** where to start playing for a pin */
  function pinSeek(t, preRoll) { return Math.max(0, t - (preRoll == null ? PRE_ROLL : preRoll)); }
  /** pin ticks along a bar: fraction 0..1 of duration (clamped) */
  function barPositions(pins, duration) {
    if (!(duration > 0)) return [];
    return pins.filter(function (p) { return !p.untimed; }).map(function (p) { return { id: p.id, n: p.n, frac: clamp(p.t / duration, 0, 1), star: p.star }; });
  }
  /** which pin is "current" at time t (last pin whose t <= t), or null */
  function currentPin(pins, t) {
    var cur = null;
    pins.forEach(function (p) { if (!p.untimed && p.t <= t && (!cur || p.t >= cur.t)) cur = p; });
    return cur;
  }
  /** a pin drawn at fractional position on a w x h image -> pixels */
  function pinPixel(p, w, h) { return { x: Math.round(p.x * w), y: Math.round(p.y * h) }; }

  /* ---------- summary rows ---------- */
  function noteRows(pins, onlyStar) {
    return pins
      .filter(function (p) { return !onlyStar || p.star; })
      .map(function (p) { return { n: p.n, time: p.untimed ? "—" : formatTime(p.t), note: p.note || "", star: !!p.star, page: p.page }; });
  }
  /** split rows into sheets: first sheet holds firstCap rows, the rest restCap rows each. Always >= 1 sheet. */
  function paginateRows(rows, firstCap, restCap) {
    var sheets = [rows.slice(0, firstCap)];
    for (var i = firstCap; i < rows.length; i += restCap) sheets.push(rows.slice(i, i + restCap));
    return sheets;
  }
  /** height-aware pagination: heights[] of rows; first sheet has firstH room, later sheets restH. returns arrays of indices. */
  function paginateByHeight(heights, firstH, restH) {
    var sheets = [[]], room = firstH;
    heights.forEach(function (h, i) {
      var cur = sheets[sheets.length - 1];
      if (h > room && cur.length) { sheets.push([]); room = restH; cur = sheets[sheets.length - 1]; }
      cur.push(i); room -= h;
    });
    return sheets;
  }
  /** greedy word wrap with a measure function (px width of a string) */
  function wrapText(text, maxW, measure) {
    var out = [];
    String(text).split(/\r?\n/).forEach(function (para) {
      var line = "";
      var tokens = para.split(/(\s+)/);
      tokens.forEach(function (tok) {
        // break long tokens (CJK has no spaces) char by char
        var parts = measure(tok) > maxW ? tok.split("") : [tok];
        parts.forEach(function (part) {
          if (measure(line + part) <= maxW || !line) line += part;
          else { out.push(line.replace(/\s+$/, "")); line = part.replace(/^\s+/, ""); }
        });
      });
      out.push(line.replace(/\s+$/, ""));
    });
    return out;
  }

  /* ---------- files ---------- */
  function safeName(s, fallback) {
    var n = String(s || "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
    return n || fallback || "crit";
  }
  function stamp(d) {
    d = d || new Date();
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  }
  function extForMime(mime) {
    mime = String(mime || "").toLowerCase();
    if (mime.indexOf("mp4") >= 0 || mime.indexOf("aac") >= 0) return "m4a";
    if (mime.indexOf("ogg") >= 0) return "ogg";
    if (mime.indexOf("wav") >= 0) return "wav";
    if (mime.indexOf("mpeg") >= 0 || mime.indexOf("mp3") >= 0) return "mp3";
    return "webm";
  }
  function mimeForExt(ext) {
    return { m4a: "audio/mp4", ogg: "audio/ogg", wav: "audio/wav", mp3: "audio/mpeg", webm: "audio/webm" }[ext] || "audio/webm";
  }
  function imageExt(mime) { return /png/i.test(mime) ? "png" : "jpg"; }

  /** validate + normalise the session.json of a .crit file. Throws Error with code on problems. */
  function parseSessionMeta(json) {
    var m;
    try { m = typeof json === "string" ? JSON.parse(json) : json; } catch (e) { throw new Error("json"); }
    if (!m || m.format !== "atelier-crit" || m.version !== 1) throw new Error("format");
    var pages = Array.isArray(m.pages) ? m.pages : [];
    var pageCount = pages.length;
    var seen = {}, maxId = 0;
    var rawPins = (Array.isArray(m.pins) ? m.pins : []).slice(0, MAX_PINS).filter(function (p) { return p && typeof p === "object"; });
    rawPins.forEach(function (p) { if (Number.isFinite(+p.id)) maxId = Math.max(maxId, +p.id); });
    var pins = rawPins.map(function (p, i) {
      var id = Number.isFinite(+p.id) ? +p.id : NaN;
      if (!(id >= 0) || seen[id]) id = ++maxId; // missing or duplicate id -> fresh one
      seen[id] = true;
      return {
        id: id,
        n: 0,
        page: clamp(p.page | 0, 0, Math.max(0, pageCount - 1)),
        x: clamp(+p.x || 0, 0, 1),
        y: clamp(+p.y || 0, 0, 1),
        t: Math.max(0, +p.t || 0),
        note: String(p.note || "").slice(0, MAX_NOTE),
        star: !!p.star,
        untimed: !!p.untimed,
      };
    });
    return {
      title: String(m.title || ""),
      createdAt: +m.createdAt || Date.now(),
      presentMin: Math.max(0, +m.presentMin || 0),
      pages: pages.map(function (pg) { return { file: String(pg.file || ""), w: +pg.w || 0, h: +pg.h || 0, name: String(pg.name || "") }; }),
      week: m.week && typeof m.week === "object" ? { n: Math.max(0, m.week.n | 0), date: isDateStr(m.week.date) ? m.week.date : "" } : null,
      pins: renumber(pins),
      audio: m.audio ? { file: String(m.audio.file || ""), mime: String(m.audio.mime || ""), duration: Math.max(0, +m.audio.duration || 0) } : null,
    };
  }
  function buildSessionMeta(s, audioFile, pageFiles) {
    return {
      format: "atelier-crit",
      version: 1,
      title: s.title,
      createdAt: s.createdAt,
      presentMin: s.presentMin,
      week: s.n ? { n: s.n, date: s.date || "" } : undefined,
      pages: s.pages.map(function (pg, i) { return { file: pageFiles[i], w: pg.w, h: pg.h, name: pg.name || "" }; }),
      pins: s.pins.map(function (p) { return { id: p.id, page: p.page, x: p.x, y: p.y, t: p.t, note: p.note, star: !!p.star, untimed: !!p.untimed }; }),
      audio: s.audio ? { file: audioFile, mime: s.audio.mime, duration: s.audio.duration } : null,
    };
  }

  /** shrink to fit within maxW (keeps ratio, never upscales) */
  function fitSize(w, h, maxW, maxH) {
    if (!w || !h) return { w: 0, h: 0 };
    var k = Math.min(1, maxW / w, maxH ? maxH / h : 1);
    return { w: Math.round(w * k), h: Math.round(h * k) };
  }

  /* ---------- .crit zip safety (read the central directory BEFORE unzipping anything) ---------- */
  /** only these names are ever read out of a .crit */
  function isCritEntryName(name) {
    return name === "session.json" || name === "transcript.json" || name === "feedback.json" || /^pages\/p\d{1,4}\.(jpg|png)$/.test(name) || /^audio\.(webm|m4a|ogg|wav|mp3)$/.test(name);
  }
  /** parse the zip central directory. Throws Error("format"|"critmany"|"critbig"). Returns [{name, size, originalSize}] */
  function scanZipDirectory(u8, limits) {
    limits = limits || CRIT_LIMITS;
    var n = u8.length;
    if (n < 22) throw new Error("format");
    var dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), eocd = -1;
    for (var i = n - 22; i >= Math.max(0, n - 22 - 65535); i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
    if (eocd < 0) throw new Error("format");
    var count = dv.getUint16(eocd + 10, true), cdOff = dv.getUint32(eocd + 16, true);
    if (count === 0xffff || cdOff === 0xffffffff) throw new Error("critbig"); // zip64: not produced by this app
    if (count > limits.maxEntries) throw new Error("critmany");
    var out = [], total = 0, p = cdOff;
    for (var k = 0; k < count; k++) {
      if (p + 46 > n || dv.getUint32(p, true) !== 0x02014b50) throw new Error("format");
      var csz = dv.getUint32(p + 20, true), usz = dv.getUint32(p + 24, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
      if (csz === 0xffffffff || usz === 0xffffffff) throw new Error("critbig");
      if (p + 46 + nl > n) throw new Error("format");
      var name = "";
      for (var j = 0; j < nl; j++) name += String.fromCharCode(u8[p + 46 + j]);
      total += usz;
      if (total > limits.maxTotal) throw new Error("critbig");
      out.push({ name: name, size: csz, originalSize: usz });
      p += 46 + nl + el + cl;
    }
    return out;
  }

  /* ---------- crash recovery of an interrupted recording ---------- */
  /**
   * recs = [{seq, size, elapsed, ...}] chunk records stored while recording. A webm/mp4 stream is only playable from its
   * first chunk onward without holes, so only the contiguous run starting at seq 0 is used.
   * -> {used:[recs in order], dropped:n, bytes, elapsed (clock seconds at the last used chunk), empty}
   */
  function planRecovery(recs) {
    var by = {};
    (recs || []).forEach(function (r) { if (r && r.size > 0 && r.seq >= 0 && !(r.seq in by)) by[r.seq] = r; });
    var used = [], bytes = 0, k = 0;
    while (by[k]) { used.push(by[k]); bytes += by[k].size; k++; }
    return {
      used: used, dropped: (recs || []).length - used.length, bytes: bytes,
      elapsed: used.length ? Math.max(0, +used[used.length - 1].elapsed || 0) : 0,
      empty: bytes === 0,
    };
  }
  /** skip recording leftovers that a live tab still owns: heldNames = web-lock names, or fall back to heartbeat age */
  function isLiveRecording(meta, heldNames, now, staleMs) {
    if (heldNames) return heldNames.indexOf("crit-rec-" + meta.rid) >= 0;
    return now - (meta.updatedAt || 0) < (staleMs || 15000);
  }

  /* =====================================================================
     Crit v03 - weekly notes: transcript parsing, pin linking, feedback, weeks, sync plan, export text.
     Everything below is pure (no DOM, no network).
     ===================================================================== */
  var MAX_PARAS = 5000, MAX_PARA_TEXT = 20000, MAX_FEEDBACK = 1000, MAX_FB_TEXT = 2000, MAX_FB_NOTE = 300;
  var LINK_WINDOW = 20, LINK_FALLBACK = 90;
  var PROJECT_LIMITS = { maxTotal: 1.5e9, maxEntries: 2500 };

  function trim(s) { return String(s == null ? "" : s).replace(/^\s+|\s+$/g, ""); }

  /* ---------- time tokens ---------- */
  /** "12:34" -> 754, "1:02:03" -> 3723, "00:01,500" -> 1.5; null when it is not a plausible time */
  function parseTimeToken(s) {
    var m = /^(\d{1,3}):(\d{2})(?::(\d{2}))?(?:[.,](\d{1,3}))?$/.exec(trim(s));
    if (!m) return null;
    var a = +m[1], b = +m[2], c = m[3] != null ? +m[3] : null, frac = m[4] ? +("0." + m[4]) : 0, sec;
    if (c == null) { if (b > 59) return null; sec = a * 60 + b; }
    else { if (b > 59 || c > 59 || a > 99) return null; sec = a * 3600 + b * 60 + c; }
    return sec + frac;
  }

  var TIME = "(\\d{1,2}:\\d{2}:\\d{2}(?:[.,]\\d{1,3})?|\\d{1,3}:\\d{2}(?:[.,]\\d{1,3})?)(?![\\d:])";
  var SPK_WORD = "(?:화자|참석자|발언자|발표자|발화자|Speaker|SPEAKER|speaker|Intervenante?|Participante?|Locut(?:eur|rice)|Interlocut(?:eur|rice)|Spk|SPK|Person)";
  var SPK_LABEL = SPK_WORD + "\\s?[A-Za-z0-9]{0,3}";
  var FREE = "[^\\s\\[\\]():：\\d.,!?。][^\\[\\]():：\\d.,!?。]{0,22}";
  var RE_CUE = /(?:\d{1,2}:)?\d{1,3}:\d{2}[.,]\d{1,3}\s*-->\s*((?:\d{1,2}:)?\d{1,3}:\d{2}[.,]\d{1,3})/;
  var RE_A = new RegExp("^\\s*[\\[\\(]?" + TIME + "[\\]\\)]?\\s*[:\\-–—]?\\s*(.*)$");
  var RE_B_LABEL = new RegExp("^\\s*(" + SPK_LABEL + ")\\s*[\\[\\(\\-–—]?\\s*" + TIME + "\\s*[\\]\\)]?\\s*[:：]?\\s*(.*)$");
  var RE_B_FREE_BR = new RegExp("^\\s*(" + FREE + ")\\s*[\\[\\(]\\s*" + TIME + "\\s*[\\]\\)]\\s*[:：]?\\s*(.+)$");
  var RE_B_FREE_HDR = new RegExp("^\\s*(" + FREE + ")\\s*[\\[\\(\\-–—]?\\s*" + TIME + "\\s*[\\]\\)]?\\s*[:：]?\\s*$");
  var RE_SPK_ONLY = new RegExp("^\\s*(" + SPK_LABEL + ")\\s*[:：]?\\s*$");
  var RE_SPK_COLON = new RegExp("^\\s*(" + SPK_LABEL + ")\\s*[:：]\\s*(.*)$");
  var RE_FREE_COLON_ONLY = new RegExp("^\\s*(" + FREE + ")\\s*[:：]\\s*$");
  var RE_NAME_COLON = /^\s*([^\s:：\[\]()]{1,12})\s*[:：]\s*(.+)$/;

  /** a line that starts a timed paragraph -> {t, speaker, text} | null */
  function matchHeader(line) {
    var m = RE_A.exec(line);
    if (m) {
      var t = parseTimeToken(m[1]);
      if (t != null) {
        var rest = trim(m[2]), mm;
        if ((mm = RE_SPK_ONLY.exec(rest))) return { t: t, speaker: trim(mm[1]), text: "" };
        if ((mm = RE_FREE_COLON_ONLY.exec(rest))) return { t: t, speaker: trim(mm[1]), text: "" };
        if ((mm = RE_SPK_COLON.exec(rest))) return { t: t, speaker: trim(mm[1]), text: trim(mm[2]) };
        if ((mm = RE_NAME_COLON.exec(rest)) && !/\s/.test(mm[1])) return { t: t, speaker: trim(mm[1]), text: trim(mm[2]) };
        return { t: t, speaker: "", text: rest };
      }
    }
    var b = RE_B_LABEL.exec(line) || RE_B_FREE_BR.exec(line) || RE_B_FREE_HDR.exec(line);
    if (b) {
      var tb = parseTimeToken(b[2]);
      if (tb != null) return { t: tb, speaker: trim(b[1]), text: trim(b[3] || "") };
    }
    return null;
  }

  function splitLines(raw) { return String(raw).replace(/\u00a0/g, " ").split("\n"); }

  /** SRT / WebVTT cues -> paragraphs (neighbouring cues of one speaker are merged) */
  function parseCues(raw) {
    var blocks = raw.split(/\n[ \t]*\n/), cues = [];
    blocks.forEach(function (blk) {
      var lines = splitLines(blk).map(trim).filter(function (x) { return x; });
      if (!lines.length) return;
      var ci = -1;
      for (var i = 0; i < lines.length; i++) if (RE_CUE.test(lines[i])) { ci = i; break; }
      if (ci < 0) return;
      var cm = RE_CUE.exec(lines[ci]);
      var start = parseTimeToken(/((?:\d{1,2}:)?\d{1,3}:\d{2}[.,]\d{1,3})/.exec(lines[ci])[1]);
      var end = parseTimeToken(cm[1]);
      if (start == null) return;
      var body = lines.slice(ci + 1).join(" "), speaker = "";
      var v = /<v(?:\.[^\s>]*)?\s+([^>]+)>/.exec(body);
      if (v) speaker = trim(v[1]);
      body = body.replace(/<[^>]*>/g, "").replace(/\{\\[^}]*\}/g, "").replace(/^-\s+/, "");
      var sc = RE_SPK_COLON.exec(body);
      if (sc) { speaker = speaker || trim(sc[1]); body = sc[2]; }
      body = trim(body);
      if (body) cues.push({ t: start, end: end == null ? start : end, speaker: speaker, text: body });
    });
    var out = [];
    cues.forEach(function (c) {
      var p = out[out.length - 1];
      if (p && p.speaker === c.speaker && c.t - p.end <= 2 && c.t >= p.t && (p.text + " " + c.text).length <= 240) { p.text += " " + c.text; p.end = c.end; }
      else out.push({ t: c.t, end: c.end, speaker: c.speaker, text: c.text });
    });
    return out.map(function (p) { return { t: p.t, speaker: p.speaker, text: p.text }; });
  }

  function parseLines(lines, allowTimes) {
    var timedCount = 0;
    if (allowTimes) lines.forEach(function (l) { if (trim(l) && matchHeader(l)) timedCount++; });
    var timed = allowTimes && timedCount >= 2;
    var paras = [], cur = null, pending = null, hasBlank = false;
    var trimmed = lines.map(trim), firstI = trimmed.findIndex(function (x) { return x; }), lastI = -1;
    trimmed.forEach(function (x, i) { if (x) lastI = i; });
    for (var i = firstI; firstI >= 0 && i < lastI; i++) if (!trimmed[i]) { hasBlank = true; break; }
    lines.forEach(function (ln) {
      var s = trim(ln), h, sp, mm;
      if (!s) { if (!timed) cur = null; return; }
      if (timed && (h = matchHeader(s))) {
        cur = { t: h.t, speaker: h.speaker || pending || "", lines: h.text ? [h.text] : [] };
        pending = null; paras.push(cur); return;
      }
      if ((mm = RE_SPK_ONLY.exec(s))) { pending = trim(mm[1]); cur = null; return; }
      if (!timed && (sp = RE_SPK_COLON.exec(s))) {
        cur = { t: null, speaker: trim(sp[1]), lines: sp[2] ? [trim(sp[2])] : [] }; paras.push(cur); pending = null;
        if (!hasBlank) cur = null;
        return;
      }
      if (cur && (timed || hasBlank)) { cur.lines.push(s); return; }
      cur = { t: null, speaker: pending || "", lines: [s] }; pending = null; paras.push(cur);
      if (!timed && !hasBlank) cur = null;
    });
    return { timed: timed, paras: paras.map(function (p) { return { t: p.t, speaker: p.speaker, text: p.lines.join(" ") }; }) };
  }

  /** "name: ..." only counts as a speaker when the same short name opens at least two paragraphs */
  function assignFreeSpeakers(paras) {
    var count = {};
    paras.forEach(function (p) { if (!p.speaker) { var m = RE_NAME_COLON.exec(p.text); if (m) count[m[1]] = (count[m[1]] || 0) + 1; } });
    paras.forEach(function (p) {
      if (p.speaker) return;
      var m = RE_NAME_COLON.exec(p.text);
      if (m && count[m[1]] >= 2) { p.speaker = m[1]; p.text = m[2]; }
    });
  }

  /**
   * Text -> { paras:[{id,t,est,anchor,speaker,text}], format:"srt"|"vtt"|"lines"|"plain", timed:n, total:n, truncated, nonMonotonic }.
   * opts.noTimes: do not look for times at all (upload "without times").
   */
  function parseTranscript(text, opts) {
    opts = opts || {};
    var raw = String(text == null ? "" : text).replace(/^\uFEFF/, "").replace(/\r\n?|\u2028|\u2029/g, "\n");
    var format, list;
    if (!opts.noTimes && RE_CUE.test(raw)) { format = /^\s*WEBVTT/.test(raw) ? "vtt" : "srt"; list = parseCues(raw); }
    else { var r = parseLines(splitLines(raw), !opts.noTimes); format = r.timed ? "lines" : "plain"; list = r.paras; }
    list = list.map(function (p) { return { t: p.t, speaker: p.speaker || "", text: trim(String(p.text).replace(/\s+/g, " ")) }; }).filter(function (p) { return p.text; });
    assignFreeSpeakers(list);
    var truncated = list.length > MAX_PARAS;
    if (truncated) list = list.slice(0, MAX_PARAS);
    var nonMono = 0, last = -1;
    var paras = list.map(function (p, i) {
      if (p.t != null) { if (p.t < last) nonMono++; last = p.t; }
      return { id: "p" + (i + 1), t: p.t, est: false, anchor: false, speaker: p.speaker.slice(0, 40), text: p.text.slice(0, MAX_PARA_TEXT) };
    });
    return { paras: paras, format: format, timed: paras.filter(function (p) { return p.t != null; }).length, total: paras.length, truncated: truncated, nonMonotonic: nonMono };
  }
  /** the first n paragraphs as rows for the recognition preview */
  function previewTranscript(res, n) {
    return res.paras.slice(0, n == null ? 10 : n).map(function (p, i) {
      return { i: i + 1, time: p.t == null ? "—" : formatTime(p.t), speaker: p.speaker, text: p.text.length > 70 ? p.text.slice(0, 70) + "…" : p.text };
    });
  }
  /** validate a stored / downloaded transcript.json (null when unusable) */
  function normalizeTranscript(o) {
    if (typeof o === "string") { try { o = JSON.parse(o); } catch (e) { return null; } }
    if (!o || typeof o !== "object" || !Array.isArray(o.paras)) return null;
    var seen = {};
    var paras = o.paras.slice(0, MAX_PARAS).filter(function (p) { return p && typeof p === "object" && String(p.text || "").trim(); }).map(function (p, i) {
      var id = typeof p.id === "string" && /^[A-Za-z0-9_-]{1,16}$/.test(p.id) && !seen[p.id] ? p.id : "p" + (i + 1) + "x";
      while (seen[id]) id += "x";
      seen[id] = true;
      var t = p.t == null || !Number.isFinite(+p.t) ? null : Math.max(0, +p.t);
      var anchor = !!p.anchor && t != null;
      var q = { id: id, t: t, est: !!p.est && t != null && !anchor, anchor: anchor, speaker: String(p.speaker || "").slice(0, 40), text: String(p.text).slice(0, MAX_PARA_TEXT) };
      if (anchor && p.t0 != null && Number.isFinite(+p.t0)) q.t0 = Math.max(0, +p.t0);
      return q;
    });
    return { v: 1, source: String(o.source || "").slice(0, 20), name: String(o.name || "").slice(0, 120), createdAt: +o.createdAt || Date.now(), format: String(o.format || "").slice(0, 12), paras: paras };
  }

  /* ---------- no timestamps: two anchors -> straight-line estimate ---------- */
  /** paragraphs between two timed ones (parsed or anchored) get t on a straight line by paragraph index, est:true */
  function fillEstimates(paras) {
    var out = paras.map(function (p) { return p.est ? Object.assign({}, p, { t: null, est: false }) : p; });
    var fixed = [];
    out.forEach(function (p, i) { if (p.t != null) fixed.push(i); });
    for (var k = 0; k + 1 < fixed.length; k++) {
      var a = fixed[k], b = fixed[k + 1];
      if (b - a < 2) continue;
      var ta = out[a].t, tb = out[b].t;
      if (!(tb > ta)) continue;
      for (var i = a + 1; i < b; i++) out[i] = Object.assign({}, out[i], { t: ta + (tb - ta) * (i - a) / (b - a), est: true });
    }
    return out;
  }
  function setAnchor(paras, id, t) {
    t = Math.max(0, +t || 0);
    return fillEstimates(paras.map(function (p) {
      if (p.id !== id) return p;
      var q = Object.assign({}, p, { t: t, anchor: true, est: false });
      q.t0 = p.anchor ? p.t0 : (p.est ? null : p.t);
      if (q.t0 == null) delete q.t0;
      return q;
    }));
  }
  function clearAnchor(paras, id) {
    return fillEstimates(paras.map(function (p) {
      if (p.id !== id || !p.anchor) return p;
      var q = Object.assign({}, p, { t: p.t0 != null ? p.t0 : null, anchor: false, est: false }); delete q.t0; return q;
    }));
  }
  /** how many paragraphs carry a real (parsed or hand-set) time */
  function fixedCount(paras) { return paras.filter(function (p) { return p.t != null && !p.est; }).length; }
  /** index of the paragraph being spoken at time t (greatest start <= t), or -1 */
  function activePara(paras, t) {
    var best = -1, bt = -1;
    for (var i = 0; i < paras.length; i++) { var pt = paras[i].t; if (pt != null && pt <= t && pt >= bt) { best = i; bt = pt; } }
    return best;
  }

  /* ---------- pin <-> paragraph ---------- */
  /**
   * For every timed pin: paragraphs starting within +-window seconds (default 20). When none does, the paragraph that was
   * being spoken (started up to `fallback` s earlier) is used. -> { [pinId]: {paraIds:[nearest first], primary, dt, fallback} }
   */
  function linkPinsToParas(pins, paras, opts) {
    opts = opts || {};
    var win = opts.window == null ? LINK_WINDOW : opts.window, fb = opts.fallback == null ? LINK_FALLBACK : opts.fallback;
    var timed = paras.filter(function (p) { return p.t != null; }).sort(function (a, b) { return a.t - b.t; });
    var out = {};
    if (!timed.length) return out;
    function lower(x) { var lo = 0, hi = timed.length; while (lo < hi) { var mid = (lo + hi) >> 1; if (timed[mid].t < x) lo = mid + 1; else hi = mid; } return lo; }
    pins.forEach(function (pin) {
      if (pin.untimed) return;
      var i = lower(pin.t - win), c = [];
      for (; i < timed.length && timed[i].t <= pin.t + win; i++) c.push({ p: timed[i], d: Math.abs(timed[i].t - pin.t) });
      if (c.length) {
        c.sort(function (a, b) { return a.d - b.d || a.p.t - b.p.t; });
        out[pin.id] = { paraIds: c.map(function (x) { return x.p.id; }), primary: c[0].p.id, dt: c[0].p.t - pin.t, fallback: false };
        return;
      }
      var j = lower(pin.t) - 1;
      if (j >= 0 && pin.t - timed[j].t <= fb) out[pin.id] = { paraIds: [timed[j].id], primary: timed[j].id, dt: timed[j].t - pin.t, fallback: true };
    });
    return out;
  }
  /** the pin whose primary paragraph is paraId (nearest in time), or null */
  function pinForPara(links, paraId) {
    var best = null;
    Object.keys(links).forEach(function (k) { var l = links[k]; if (l.primary === paraId && (!best || Math.abs(l.dt) < Math.abs(best.dt))) best = { pinId: +k, dt: l.dt }; });
    return best ? best.pinId : null;
  }

  /* ---------- reading transcript files ---------- */
  /** bytes -> string: BOM aware, UTF-8 first, EUC-KR as the legacy fallback */
  function decodeBytes(u8) {
    var d = function (enc, fatal, bytes) { return new TextDecoder(enc, { fatal: !!fatal }).decode(bytes); };
    if (u8.length >= 2 && u8[0] === 0xff && u8[1] === 0xfe) return d("utf-16le", false, u8.subarray(2));
    if (u8.length >= 2 && u8[0] === 0xfe && u8[1] === 0xff) return d("utf-16be", false, u8.subarray(2));
    if (u8.length >= 3 && u8[0] === 0xef && u8[1] === 0xbb && u8[2] === 0xbf) u8 = u8.subarray(3);
    try { return d("utf-8", true, u8); } catch (e) { /* not UTF-8 */ }
    try { return d("euc-kr", false, u8); } catch (e2) { return d("utf-8", false, u8); }
  }
  function xmlDecode(s) {
    return String(s).replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, function (m, g) {
      if (g === "amp") return "&";
      if (g === "lt") return "<";
      if (g === "gt") return ">";
      if (g === "quot") return '"';
      if (g === "apos") return "'";
      var code = g.charAt(1) === "x" ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
      try { return String.fromCodePoint(code); } catch (e) { return ""; }
    });
  }
  /** word/document.xml -> one line per paragraph (runs joined, soft breaks kept as line breaks) */
  function docxToText(xml) {
    xml = String(xml);
    var out = [], re = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>|<w:p\s*\/>/g, m;
    while ((m = re.exec(xml))) {
      var para = m[0], line = "", tk = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>|<w:cr\s*\/>/g, k;
      while ((k = tk.exec(para))) line += k[1] != null ? xmlDecode(k[1]) : (/tab/.test(k[0]) ? " " : "\n");
      out.push(line.replace(/[ \t]+\n/g, "\n"));
    }
    return out.join("\n");
  }

  /**
   * PDF text items -> lines. pages = [ [ {str, x, y, w, h}, ... ], ... ] (pdf.js getTextContent: x = transform[4], y = transform[5],
   * w = width, h = height). Items are grouped into lines by y and ordered by x; a blank line marks a paragraph gap; page headers and
   * footers (same text on most pages) and bare page numbers are dropped; "word-" + "word" line breaks are joined.
   * -> { text, lines, removed:[...], chars }
   */
  function rebuildPdfLines(pages) {
    var perPage = [], chars = 0;
    pages.forEach(function (items) {
      items = (items || []).filter(function (it) { return it && typeof it.str === "string" && it.str.trim() !== ""; });
      items.forEach(function (it) { chars += it.str.trim().length; });
      var hs = items.map(function (it) { return it.h > 0 ? it.h : 10; }).sort(function (a, b) { return a - b; });
      var mh = hs.length ? hs[hs.length >> 1] : 10, tol = Math.max(2, mh * 0.5);
      var sorted = items.slice().sort(function (a, b) { return b.y - a.y || a.x - b.x; });
      var rows = [];
      sorted.forEach(function (it) {
        var r = rows[rows.length - 1];
        if (r && Math.abs(r.y - it.y) <= tol) r.items.push(it); else rows.push({ y: it.y, items: [it] });
      });
      var lines = rows.map(function (r) {
        r.items.sort(function (a, b) { return a.x - b.x; });
        var s = "", prev = null;
        r.items.forEach(function (it) {
          if (prev) {
            var gap = it.x - (prev.x + (prev.w || 0));
            if (gap > mh * 0.22 && !/\s$/.test(s) && !/^\s/.test(it.str)) s += " ";
          }
          s += it.str; prev = it;
        });
        return { text: s.replace(/\s+/g, " ").trim(), y: r.y };
      }).filter(function (l) { return l.text; });
      var dys = [];
      for (var i = 1; i < lines.length; i++) dys.push(lines[i - 1].y - lines[i].y);
      dys.sort(function (a, b) { return a - b; });
      var typ = dys.length ? dys[(dys.length - 1) >> 1] : 0;
      lines.forEach(function (l, i) { l.gap = i > 0 && typ > 0 && lines[i - 1].y - l.y > typ * 1.7; });
      perPage.push(lines);
    });
    var removed = [];
    var reTime = new RegExp(TIME);
    var isTime = function (s) { return reTime.test(s); };
    var isSpk = function (s) { return RE_SPK_ONLY.test(s) || new RegExp("^\\s*" + SPK_LABEL + "\\b").test(s); };
    var keyOf = function (s) { return isTime(s) || isSpk(s) ? s : s.replace(/\b\d{1,4}\b(\s*\/\s*\d{1,4})?/g, "#"); };
    var PAGENO = /^\s*[-–—]?\s*(?:p\.?|page|쪽|페이지)?\s*\d{1,4}\s*(?:\/\s*\d{1,4})?\s*[-–—]?\s*$/i;
    var edge = function (lines, i) { return lines.length >= 7 ? i < 2 || i >= lines.length - 2 : i === 0 || i === lines.length - 1; };
    var counts = {};
    if (perPage.length >= 3) perPage.forEach(function (lines) {
      var seen = {};
      lines.forEach(function (l, i) { if (edge(lines, i)) { var k = keyOf(l.text); if (!seen[k]) { seen[k] = 1; counts[k] = (counts[k] || 0) + 1; } } });
    });
    var need = Math.max(2, Math.ceil(perPage.length * 0.6));
    perPage = perPage.map(function (lines) {
      return lines.filter(function (l, i) {
        if (!edge(lines, i)) return true;
        var drop = (perPage.length >= 3 && counts[keyOf(l.text)] >= need) || (!isTime(l.text) && PAGENO.test(l.text));
        if (drop) removed.push(l.text);
        return !drop;
      });
    });
    var out = [];
    perPage.forEach(function (lines) {
      lines.forEach(function (l) {
        var prev = out.length ? out[out.length - 1] : null;
        if (l.gap && prev !== "" && prev !== null) out.push("");
        prev = out.length ? out[out.length - 1] : null;
        if (prev && /[A-Za-zÀ-ÿ]-$/.test(prev) && /^[a-zà-ÿ]/.test(l.text)) out[out.length - 1] = prev.slice(0, -1) + l.text;
        else out.push(l.text);
      });
    });
    while (out.length && out[out.length - 1] === "") out.pop();
    return { text: out.join("\n"), lines: out, removed: removed, chars: chars };
  }

  /* ---------- feedback items ---------- */
  var FB_STATUS = ["todo", "done", "hold"];
  function fbNextId(items) { return items.reduce(function (m, x) { return Math.max(m, x.id); }, 0) + 1; }
  /** o: {text, paraId, t, pinId, page, status, note, carriedFrom} */
  function addFeedback(items, o) {
    if (items.length >= MAX_FEEDBACK) return items;
    var text = trim(o.text).slice(0, MAX_FB_TEXT);
    if (!text) return items;
    var item = {
      id: fbNextId(items), text: text, status: FB_STATUS.indexOf(o.status) >= 0 ? o.status : "todo", note: trim(o.note || "").slice(0, MAX_FB_NOTE),
      paraId: o.paraId || null, t: o.t == null || !Number.isFinite(+o.t) ? null : Math.max(0, +o.t),
      pinId: o.pinId == null ? null : +o.pinId, page: o.page == null ? null : o.page | 0,
      carriedFrom: o.carriedFrom || null, createdAt: o.createdAt || Date.now(),
    };
    return items.concat([item]);
  }
  function updateFeedback(items, id, patch) {
    return items.map(function (x) {
      if (x.id !== id) return x;
      var q = Object.assign({}, x, patch);
      if (FB_STATUS.indexOf(q.status) < 0) q.status = x.status;
      q.text = String(q.text == null ? "" : q.text).slice(0, MAX_FB_TEXT);
      q.note = String(q.note == null ? "" : q.note).slice(0, MAX_FB_NOTE);
      return q;
    });
  }
  function deleteFeedback(items, id) { return items.filter(function (x) { return x.id !== id; }); }
  /**
   * Last week's open items (todo, hold) -> this week's list, each linked back to where it came from.
   * existing: this week's items (never duplicated: same weekId + itemId). -> { items, added }
   */
  function carryOver(prevItems, prevWeek, existing) {
    var items = (existing || []).slice(), added = 0;
    (prevItems || []).forEach(function (x) {
      if (x.status !== "todo" && x.status !== "hold") return;
      if (items.some(function (y) { return y.carriedFrom && y.carriedFrom.weekId === prevWeek.id && y.carriedFrom.itemId === x.id; })) return;
      var n = items.length;
      items = addFeedback(items, {
        text: x.text, status: x.status, note: "", paraId: null, t: null, pinId: null, page: null,
        carriedFrom: { weekId: prevWeek.id, weekN: prevWeek.n, itemId: x.id },
      });
      if (items.length > n) added++;
    });
    return { items: items, added: added };
  }
  /** own = typed or selected this week, carried = came from an earlier week */
  function feedbackStats(items) {
    var s = { own: 0, todo: 0, done: 0, hold: 0, carried: 0, carriedOpen: 0, open: 0 };
    (items || []).forEach(function (x) {
      if (x.carriedFrom) { s.carried++; if (x.status !== "done") s.carriedOpen++; return; }
      s.own++; s[x.status]++;
      if (x.status !== "done") s.open++;
    });
    return s;
  }
  function normalizeFeedback(arr) {
    if (typeof arr === "string") { try { arr = JSON.parse(arr); } catch (e) { return []; } }
    if (arr && !Array.isArray(arr) && Array.isArray(arr.items)) arr = arr.items;
    if (!Array.isArray(arr)) return [];
    var seen = {}, maxId = 0, out = [];
    arr.forEach(function (x) { if (x && Number.isFinite(+x.id)) maxId = Math.max(maxId, +x.id); });
    arr.slice(0, MAX_FEEDBACK).forEach(function (x) {
      if (!x || typeof x !== "object" || !trim(x.text)) return;
      var id = Number.isFinite(+x.id) && +x.id > 0 && !seen[+x.id] ? +x.id : ++maxId;
      seen[id] = true;
      var cf = x.carriedFrom && typeof x.carriedFrom === "object" && typeof x.carriedFrom.weekId === "string"
        ? { weekId: String(x.carriedFrom.weekId).slice(0, 60), weekN: x.carriedFrom.weekN | 0, itemId: +x.carriedFrom.itemId || 0 } : null;
      out.push({
        id: id, text: String(x.text).slice(0, MAX_FB_TEXT), status: FB_STATUS.indexOf(x.status) >= 0 ? x.status : "todo", note: String(x.note || "").slice(0, MAX_FB_NOTE),
        paraId: typeof x.paraId === "string" ? x.paraId.slice(0, 16) : null, t: x.t == null || !Number.isFinite(+x.t) ? null : Math.max(0, +x.t),
        pinId: x.pinId == null || !Number.isFinite(+x.pinId) ? null : +x.pinId, page: x.page == null || !Number.isFinite(+x.page) ? null : x.page | 0,
        carriedFrom: cf, createdAt: +x.createdAt || Date.now(),
      });
    });
    return out;
  }

  /* ---------- weeks ---------- */
  function todayStr(d) { d = d || new Date(); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function isDateStr(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && !isNaN(new Date(s + "T00:00:00").getTime()); }
  /** "2026-11-18" -> "11/18" */
  function dateShort(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "")); return m ? +m[2] + "/" + +m[3] : ""; }
  function sortWeeks(metas) {
    return metas.slice().sort(function (a, b) { return String(a.date || "").localeCompare(String(b.date || "")) || (a.n || 0) - (b.n || 0) || (a.createdAt || 0) - (b.createdAt || 0); });
  }
  function nextWeekNo(metas) { return metas.reduce(function (m, w) { return Math.max(m, w.n || 0); }, 0) + 1; }
  /** the week before `id` in date order, or null */
  function previousWeek(metas, id) {
    var s = sortWeeks(metas), i = s.findIndex(function (w) { return w.id === id; });
    return i > 0 ? s[i - 1] : null;
  }
  /** old sessions (no week number / date) become weeks 1..n in creation order. -> { metas: all rows, changed: only the rows that were filled in } */
  function migrateToWeeks(metas) {
    var rows = metas.map(function (m) { return Object.assign({}, m); });
    var order = rows.slice().sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0) || String(a.id).localeCompare(String(b.id)); });
    var next = rows.reduce(function (m, w) { return Math.max(m, w.n || 0); }, 0), changed = [];
    order.forEach(function (w) {
      var ch = false;
      if (!(w.n > 0)) { w.n = ++next; ch = true; }
      if (!isDateStr(w.date)) { w.date = todayStr(new Date(w.createdAt || Date.now())); ch = true; }
      if (ch) changed.push(w);
    });
    return { metas: rows, changed: changed };
  }

  /* ---------- Drive sync plan ---------- */
  /**
   * local:  [{id, updatedAt, syncedAt}]  (syncedAt = updatedAt of the version both sides had at the last sync, or null)
   * remote: [{id, updatedAt, deleted?}]  (project.json tools.crit.weeks)
   * tombs:  [{id, at}]                   weeks deleted on this device
   * -> { push, pull, conflict, pullDelete, pushDelete }  (arrays of week ids)
   */
  function planSync(local, remote, tombs) {
    var R = {}, T = {}, out = { push: [], pull: [], conflict: [], pullDelete: [], pushDelete: [] }, have = {};
    (remote || []).forEach(function (r) { R[r.id] = r; });
    (tombs || []).forEach(function (x) { T[x.id] = x; });
    (local || []).forEach(function (l) {
      have[l.id] = true;
      var r = R[l.id], s = l.syncedAt == null ? null : l.syncedAt, lc = l.updatedAt !== s;
      if (!r) { out.push.push(l.id); return; }
      if (r.deleted) { if (lc) out.push.push(l.id); else out.pullDelete.push(l.id); return; }
      var rc = r.updatedAt !== s;
      if (!lc && !rc) return;
      if (lc && !rc) out.push.push(l.id);
      else if (!lc && rc) out.pull.push(l.id);
      else if (l.updatedAt !== r.updatedAt) out.conflict.push(l.id);
    });
    (remote || []).forEach(function (r) {
      if (have[r.id] || r.deleted) return;
      var tb = T[r.id];
      if (tb && tb.at >= r.updatedAt) out.pushDelete.push(r.id); else out.pull.push(r.id);
    });
    return out;
  }
  /** manifest weeks after a push: replace by id, add deletions, keep the rest. Sorted by n. */
  function mergeManifestWeeks(existing, entries) {
    var by = {};
    (existing || []).forEach(function (w) { if (w && w.id) by[w.id] = w; });
    (entries || []).forEach(function (w) { by[w.id] = w; });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return (a.n || 0) - (b.n || 0) || String(a.id).localeCompare(String(b.id)); });
  }
  /** remote project.json entry -> validated {id,n,date,title,updatedAt,blobsRev,deleted} or null */
  function normalizeRemoteWeek(w) {
    if (!w || typeof w !== "object" || !/^[A-Za-z0-9_-]{1,40}$/.test(String(w.id || ""))) return null;
    return {
      id: String(w.id), n: Math.max(0, w.n | 0), date: isDateStr(w.date) ? w.date : "", title: String(w.title || "").slice(0, 60),
      updatedAt: +w.updatedAt || 0, blobsRev: String(w.blobsRev || "").slice(0, 40), deleted: !!w.deleted,
    };
  }

  /* ---------- project .crit bundle ---------- */
  var RE_WID = "[A-Za-z0-9_-]{1,40}";
  function isWeekFileName(name) {
    return name === "session.json" || name === "transcript.json" || name === "feedback.json" || /^pages\/p\d{1,4}\.(jpg|png)$/.test(name) || /^audio\.(webm|m4a|ogg|wav|mp3)$/.test(name);
  }
  function isProjectEntryName(name) {
    if (name === "project.json") return true;
    var m = new RegExp("^weeks/(" + RE_WID + ")/(.+)$").exec(name);
    return !!m && isWeekFileName(m[2]);
  }
  function parseProjectMeta(json) {
    var m;
    try { m = typeof json === "string" ? JSON.parse(json) : json; } catch (e) { throw new Error("json"); }
    if (!m || m.format !== "atelier-crit-project" || m.version !== 1) throw new Error("format");
    var weeks = (Array.isArray(m.weeks) ? m.weeks : []).slice(0, 200).map(function (w) {
      if (!w || !new RegExp("^" + RE_WID + "$").test(String(w.id || ""))) return null;
      return { id: String(w.id), n: Math.max(0, w.n | 0), date: isDateStr(w.date) ? w.date : "", title: String(w.title || "").slice(0, 60) };
    }).filter(Boolean);
    return { name: String(m.name || "").slice(0, 60), weeks: weeks };
  }
  function buildProjectMeta(name, weeks) {
    return { format: "atelier-crit-project", version: 1, name: name, createdAt: Date.now(), weeks: weeks.map(function (w) { return { id: w.id, n: w.n, date: w.date, title: w.title }; }) };
  }

  /* ---------- export text / search ---------- */
  function mdCell(s) { return String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " "); }
  /**
   * data: { name, weeks:[{n, date, title, pins, transcript:{paras}|null, feedback:[...]}] } ; lbl: translated labels.
   * -> Markdown string (feedback table, pin notes, transcript per week)
   */
  function buildMarkdown(data, lbl) {
    var out = ["# " + (data.name || lbl.project), ""];
    sortWeeks(data.weeks).forEach(function (w) {
      out.push("## " + lbl.week(w.n) + (w.date ? " · " + dateShort(w.date) : "") + (w.title ? " — " + w.title : ""), "");
      var fb = w.feedback || [];
      out.push("### " + lbl.feedback, "");
      if (!fb.length) out.push(lbl.none, "");
      else {
        out.push("| # | " + lbl.text + " | " + lbl.status + " | " + lbl.note + " | " + lbl.source + " |", "|---|---|---|---|---|");
        fb.forEach(function (x, i) {
          var src = [];
          if (x.t != null) src.push(formatTime(x.t));
          if (x.pinId != null) { var pn = (w.pins || []).filter(function (p) { return p.id === x.pinId; })[0]; if (pn) src.push(lbl.pin + " " + pn.n + (x.page != null ? " (" + (x.page + 1) + lbl.page + ")" : "")); }
          if (x.carriedFrom) src.push(lbl.carried(x.carriedFrom.weekN));
          out.push("| " + (i + 1) + " | " + mdCell(x.text) + " | " + lbl.statusName[x.status] + " | " + mdCell(x.note) + " | " + mdCell(src.join(" · ")) + " |");
        });
        out.push("");
      }
      var pins = (w.pins || []).filter(function (p) { return p.note; });
      if (pins.length) {
        out.push("### " + lbl.pins, "");
        pins.forEach(function (p) { out.push("- " + lbl.pin + " " + p.n + " (" + (p.page + 1) + lbl.page + (p.untimed ? "" : ", " + formatTime(p.t)) + "): " + String(p.note).replace(/\s*\n\s*/g, " ")); });
        out.push("");
      }
      var tr = w.transcript && w.transcript.paras;
      if (tr && tr.length) {
        out.push("### " + lbl.transcript, "");
        tr.forEach(function (p) {
          out.push((p.t != null ? "**[" + formatTime(p.t) + (p.est ? "~" : "") + "]** " : "") + (p.speaker ? p.speaker + ": " : "") + p.text, "");
        });
      }
    });
    return out.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
  }
  function fold(s) { return String(s == null ? "" : s).normalize("NFC").toLowerCase(); }
  /** every whitespace-separated term must occur in the same paragraph / feedback / pin note. -> [{weekId, kind, id, text, snippet, t}] (max 200) */
  function searchProject(weeks, query) {
    var terms = fold(query).split(/\s+/).filter(Boolean), res = [];
    if (!terms.length) return res;
    function snip(text, lowered) {
      var i = lowered.indexOf(terms[0]); if (i < 0) i = 0;
      var a = Math.max(0, i - 24), b = Math.min(text.length, i + terms[0].length + 48);
      return (a > 0 ? "…" : "") + text.slice(a, b) + (b < text.length ? "…" : "");
    }
    function test(w, kind, id, text, t) {
      if (res.length >= 200) return;
      var f = fold(text);
      if (terms.every(function (x) { return f.indexOf(x) >= 0; })) res.push({ weekId: w.id, kind: kind, id: id, text: text, snippet: snip(text, f), t: t == null ? null : t });
    }
    sortWeeks(weeks).forEach(function (w) {
      (w.feedback || []).forEach(function (x) { test(w, "feedback", x.id, x.text + (x.note ? " " + x.note : ""), x.t); });
      (w.pins || []).forEach(function (p) { if (p.note) test(w, "pin", p.id, p.note, p.untimed ? null : p.t); });
      ((w.transcript && w.transcript.paras) || []).forEach(function (p) { test(w, "transcript", p.id, (p.speaker ? p.speaker + " " : "") + p.text, p.t); });
    });
    return res;
  }

  return {
    MAX_PINS: MAX_PINS, MAX_NOTE: MAX_NOTE, CRIT_LIMITS: CRIT_LIMITS,
    isCritEntryName: isCritEntryName, scanZipDirectory: scanZipDirectory, planRecovery: planRecovery, isLiveRecording: isLiveRecording,
    untimeAll: untimeAll, setPinTime: setPinTime, removePage: removePage,
    PRE_ROLL: PRE_ROLL, clamp: clamp, formatTime: formatTime,
    clockNew: clockNew, clockStart: clockStart, clockPause: clockPause, clockElapsed: clockElapsed,
    talkState: talkState,
    renumber: renumber, addPin: addPin, updatePin: updatePin, movePin: movePin, deletePin: deletePin,
    toggleStar: toggleStar, pinsOnPage: pinsOnPage, pinSeek: pinSeek, barPositions: barPositions,
    currentPin: currentPin, pinPixel: pinPixel,
    noteRows: noteRows, paginateRows: paginateRows, paginateByHeight: paginateByHeight, wrapText: wrapText,
    safeName: safeName, stamp: stamp, extForMime: extForMime, mimeForExt: mimeForExt, imageExt: imageExt,
    parseSessionMeta: parseSessionMeta, buildSessionMeta: buildSessionMeta, fitSize: fitSize,
    /* v03 weekly notes */
    PROJECT_LIMITS: PROJECT_LIMITS, LINK_WINDOW: LINK_WINDOW, FB_STATUS: FB_STATUS,
    parseTimeToken: parseTimeToken, matchHeader: matchHeader, parseTranscript: parseTranscript, previewTranscript: previewTranscript, normalizeTranscript: normalizeTranscript,
    fillEstimates: fillEstimates, setAnchor: setAnchor, clearAnchor: clearAnchor, fixedCount: fixedCount, activePara: activePara,
    linkPinsToParas: linkPinsToParas, pinForPara: pinForPara,
    decodeBytes: decodeBytes, docxToText: docxToText, rebuildPdfLines: rebuildPdfLines,
    addFeedback: addFeedback, updateFeedback: updateFeedback, deleteFeedback: deleteFeedback, carryOver: carryOver, feedbackStats: feedbackStats, normalizeFeedback: normalizeFeedback,
    todayStr: todayStr, isDateStr: isDateStr, dateShort: dateShort, sortWeeks: sortWeeks, nextWeekNo: nextWeekNo, previousWeek: previousWeek, migrateToWeeks: migrateToWeeks,
    planSync: planSync, mergeManifestWeeks: mergeManifestWeeks, normalizeRemoteWeek: normalizeRemoteWeek,
    isWeekFileName: isWeekFileName, isProjectEntryName: isProjectEntryName, parseProjectMeta: parseProjectMeta, buildProjectMeta: buildProjectMeta,
    buildMarkdown: buildMarkdown, searchProject: searchProject,
  };
});
