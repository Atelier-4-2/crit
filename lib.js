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
    return name === "session.json" || /^pages\/p\d{1,4}\.(jpg|png)$/.test(name) || /^audio\.(webm|m4a|ogg|wav|mp3)$/.test(name);
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
  };
});
