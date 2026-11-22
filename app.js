/* Atelier Crit - UI. All data stays on this device (no network use except pinned CDN libraries). */
(function () {
  "use strict";
  var L = window.CritLib;
  var PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";
  var PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
  var JSPDF_URL = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
  var MAX_PAGE_W = 1800;

  /* ---------------- i18n ---------------- */
  var DICT = {
    ko: {
      brandAria: "Atelier 4·2 메인페이지", titlePh: "크리틱 제목",
      sessions: "세션", newSession: "새로", openCrit: "열기", saveCrit: "저장", export: "내보내기",
      dropTitle: "도면을 놓으세요", dropSub: "PDF(여러 쪽) · JPG · PNG",
      privacy: "파일과 녹음은 이 기기 밖으로 나가지 않습니다.",
      addPages: "쪽 추가", pinMode: "핀 추가", elapsed: "경과", remaining: "남은 발표",
      presentTime: "발표 시간(분)", recStart: "녹음 시작", pause: "일시정지", resume: "다시 시작", recStop: "끝내기",
      recHint: "녹음 중에는 화면을 켜 두세요. 다른 앱이나 탭으로 가면 녹음이 끊길 수 있습니다. 도면을 탭하면 그 시각이 핀에 묶입니다.",
      rerecord: "다시 녹음", pinsTitle: "핀 메모", starOnly: "★만",
      pinEmpty: "아직 핀이 없습니다. 녹음 중 도면을 탭하세요.", seekAria: "재생 위치",
      storeOff: "저장이 꺼져 있습니다. 이 화면을 닫으면 세션이 사라지니 .crit 파일로 저장하세요.",
      sessEmpty: "저장된 세션이 없습니다.", close: "닫기",
      expPdf: "요약 PDF", expPng: "요약 PNG", expCrit: ".crit 세션 파일",
      untitled: "크리틱", page: "쪽", pinWord: "핀", notePh: "메모", play: "재생", pauseAria: "일시정지",
      star: "중요", del: "삭제", at: "시각",
      wakeNote: "화면 켜짐 유지 중입니다.", noWake: "이 브라우저는 화면 켜짐 유지를 지원하지 않습니다. 화면을 직접 켜 두세요.",
      micAsk: "마이크 권한을 요청합니다. 녹음은 이 기기에만 저장됩니다.",
      micDenied: "마이크를 사용할 수 없습니다. 브라우저 설정에서 허용해 주세요.",
      noMic: "이 브라우저에서는 녹음을 지원하지 않습니다.",
      recording: "녹음 중", paused: "일시정지됨",
      interrupted: "화면이 꺼졌거나 다른 탭에 다녀왔습니다. 녹음이 끊겼는지 확인하세요.",
      needPagesToPin: "도면을 먼저 넣으세요.", startToPin: "녹음을 시작하면 핀을 찍을 수 있습니다.",
      pinAdded: "핀 {n} · {t}", pinModeOn: "도면을 탭하면 현재 재생 위치에 핀이 생깁니다.",
      loadingPdf: "PDF를 불러오는 중…", loadFail: "불러오지 못했습니다: {e}",
      confirmRerecord: "다시 녹음하면 지금 녹음과 핀 시각이 지워집니다. 계속할까요?",
      confirmNew: "지금 세션을 닫고 새로 시작할까요? (저장된 세션은 목록에 남습니다)",
      confirmDelSession: "이 세션을 삭제할까요?", confirmDelPin: "이 핀을 삭제할까요?",
      saved: "저장했습니다.", exporting: "만드는 중…", libFail: "라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.",
      openFail: ".crit 파일을 열 수 없습니다.", noPinsForExport: "내보낼 핀이 없어도 도면은 내보냅니다.",
      sumPage: "{i} / {n}쪽", sumNoPins: "이 쪽에는 핀이 없습니다.", sumCols: "번호 · 시각 · 메모",
      mins: "분", over: "초과", dateFmt: "ko-KR",
    },
    fr: {
      brandAria: "Atelier 4·2 accueil", titlePh: "Titre de la critique",
      sessions: "Sessions", newSession: "Nouveau", openCrit: "Ouvrir", saveCrit: "Enregistrer", export: "Exporter",
      dropTitle: "Déposez vos plans", dropSub: "PDF (plusieurs pages) · JPG · PNG",
      privacy: "Vos fichiers et l'enregistrement ne quittent jamais cet appareil.",
      addPages: "Ajouter", pinMode: "Ajouter épingle", elapsed: "Écoulé", remaining: "Reste (présentation)",
      presentTime: "Durée de présentation (min)", recStart: "Démarrer l'enregistrement", pause: "Pause", resume: "Reprendre", recStop: "Terminer",
      recHint: "Gardez l'écran allumé pendant l'enregistrement. Quitter l'appli ou l'onglet peut l'interrompre. Touchez le plan : l'instant est lié à l'épingle.",
      rerecord: "Réenregistrer", pinsTitle: "Notes épinglées", starOnly: "★ seul.",
      pinEmpty: "Pas encore d'épingle. Touchez le plan pendant l'enregistrement.", seekAria: "Position de lecture",
      storeOff: "Le stockage est désactivé. Fermer cette page efface la session : enregistrez un fichier .crit.",
      sessEmpty: "Aucune session enregistrée.", close: "Fermer",
      expPdf: "Synthèse PDF", expPng: "Synthèse PNG", expCrit: "Fichier de session .crit",
      untitled: "Critique", page: "p.", pinWord: "Épingle", notePh: "Note", play: "Lecture", pauseAria: "Pause",
      star: "Important", del: "Supprimer", at: "Instant",
      wakeNote: "Écran maintenu allumé.", noWake: "Ce navigateur ne peut pas garder l'écran allumé. Gardez-le allumé vous-même.",
      micAsk: "Demande d'accès au micro. L'enregistrement reste sur cet appareil.",
      micDenied: "Micro indisponible. Autorisez-le dans les réglages du navigateur.",
      noMic: "Ce navigateur ne permet pas l'enregistrement.",
      recording: "Enregistrement", paused: "En pause",
      interrupted: "L'écran s'est éteint ou vous avez changé d'onglet. Vérifiez que l'enregistrement n'a pas été coupé.",
      needPagesToPin: "Ajoutez d'abord un plan.", startToPin: "Démarrez l'enregistrement pour poser des épingles.",
      pinAdded: "Épingle {n} · {t}", pinModeOn: "Touchez le plan pour poser une épingle à la position de lecture.",
      loadingPdf: "Chargement du PDF…", loadFail: "Échec du chargement : {e}",
      confirmRerecord: "Réenregistrer efface l'audio actuel et les instants des épingles. Continuer ?",
      confirmNew: "Fermer cette session et recommencer ? (les sessions enregistrées restent dans la liste)",
      confirmDelSession: "Supprimer cette session ?", confirmDelPin: "Supprimer cette épingle ?",
      saved: "Enregistré.", exporting: "Création…", libFail: "Impossible de charger la bibliothèque. Vérifiez la connexion.",
      openFail: "Impossible d'ouvrir ce fichier .crit.", noPinsForExport: "",
      sumPage: "Page {i} / {n}", sumNoPins: "Aucune épingle sur cette page.", sumCols: "n° · instant · note",
      mins: "min", over: "dépassé", dateFmt: "fr-FR",
    },
  };
  var lang = "ko";
  try { var sl = localStorage.getItem("crit-lang"); if (sl === "fr" || sl === "ko") lang = sl; } catch (e) { /* ignore */ }
  function t(key, vars) {
    var s = (DICT[lang] && DICT[lang][key]) || DICT.ko[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.replace("{" + k + "}", vars[k]); });
    return s;
  }
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) { el.placeholder = t(el.getAttribute("data-i18n-ph")); });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
    document.querySelectorAll(".lang button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === lang)); });
    $("btnPause").textContent = mode === "paused" ? t("resume") : t("pause");
    renderAll();
  }

  /* ---------------- state ---------------- */
  var $ = function (id) { return document.getElementById(id); };
  var session = newSession();
  var curPage = 0, selId = null, starOnly = false, pinMode = false;
  var mode = "setup"; // setup | recording | paused | review
  var clock = L.clockNew();
  var recorder = null, stream = null, chunks = [], recMime = "";
  var tickTimer = null, wakeLock = null, hiddenDuringRec = false;
  var audioEl = null, audioUrl = null;
  var pageUrls = [];
  var db = null, storeOk = false, saveTimer = null, followHoldUntil = -1;

  function newSession() {
    return { id: "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: "", createdAt: Date.now(), presentMin: 10, pages: [], pins: [], audio: null };
  }
  function defaultTitle() { return t("untitled") + " " + new Date(session.createdAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "ko-KR"); }

  /* ---------------- helpers ---------------- */
  function toast(msg, ms) {
    var el = $("toast"); el.textContent = msg; el.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.hidden = true; }, ms || 2200);
  }
  function banner(msg, warn) {
    var el = $("banner");
    if (!msg) { el.hidden = true; return; }
    el.textContent = msg; el.className = "banner" + (warn ? " warn" : ""); el.hidden = false;
  }
  function download(blob, name) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = function () { rej(new Error("script")); };
      document.head.appendChild(s);
    });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* ---------------- IndexedDB (graceful) ---------------- */
  function openDb() {
    return new Promise(function (resolve) {
      try {
        if (!window.indexedDB) return resolve(null);
        var req = indexedDB.open("atelier-crit", 1);
        req.onupgradeneeded = function () { req.result.createObjectStore("sessions", { keyPath: "id" }); };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { resolve(null); };
        req.onblocked = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  }
  function idb(mode_, fn) {
    return new Promise(function (resolve, reject) {
      if (!db) return reject(new Error("nodb"));
      try {
        var tx = db.transaction("sessions", mode_), st = tx.objectStore("sessions"), r = fn(st);
        tx.oncomplete = function () { resolve(r && r.result); };
        tx.onerror = tx.onabort = function () { reject(tx.error || new Error("tx")); };
      } catch (e) { reject(e); }
    });
  }
  function persistNow() {
    if (!storeOk || !hasContent()) return Promise.resolve();
    var copy = Object.assign({}, session, { title: session.title || defaultTitle(), updatedAt: Date.now() });
    return idb("readwrite", function (st) { return st.put(copy); }).catch(function () {
      storeOk = false; $("storeOff").hidden = false; banner(t("storeOff"), true);
    });
  }
  function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(persistNow, 500); }
  function hasContent() { return session.pages.length || session.pins.length || session.audio; }

  /* ---------------- pages ---------------- */
  function canvasToBlob(canvas, type, q) { return new Promise(function (r) { canvas.toBlob(r, type, q); }); }
  function imageToPage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var sz = L.fitSize(img.naturalWidth, img.naturalHeight, MAX_PAGE_W);
        var c = document.createElement("canvas"); c.width = sz.w; c.height = sz.h;
        var cx = c.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, sz.w, sz.h); cx.drawImage(img, 0, 0, sz.w, sz.h);
        URL.revokeObjectURL(url);
        canvasToBlob(c, "image/jpeg", 0.88).then(function (blob) { resolve({ blob: blob, w: sz.w, h: sz.h, name: file.name }); });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error(file.name)); };
      img.src = url;
    });
  }
  var pdfjsP = null;
  function getPdfjs() {
    if (!pdfjsP) pdfjsP = import(PDFJS_URL).then(function (m) { m.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; return m; });
    return pdfjsP;
  }
  function pdfToPages(file) {
    return Promise.all([getPdfjs(), file.arrayBuffer()]).then(function (r) {
      return r[0].getDocument({ data: r[1] }).promise;
    }).then(function (pdf) {
      var out = [], chain = Promise.resolve();
      for (var i = 1; i <= pdf.numPages; i++) (function (n) {
        chain = chain.then(function () { return pdf.getPage(n); }).then(function (page) {
          var v1 = page.getViewport({ scale: 1 });
          var scale = Math.min(3, MAX_PAGE_W / v1.width);
          var vp = page.getViewport({ scale: scale });
          var c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
          var cx = c.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, c.width, c.height);
          return page.render({ canvasContext: cx, viewport: vp }).promise.then(function () {
            return canvasToBlob(c, "image/jpeg", 0.9);
          }).then(function (blob) {
            out.push({ blob: blob, w: c.width, h: c.height, name: file.name + " " + n });
            banner(t("loadingPdf") + " " + n + "/" + pdf.numPages);
          });
        });
      })(i);
      return chain.then(function () { return out; });
    });
  }
  function addFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return Promise.resolve();
    banner(t("loadingPdf"));
    var chain = Promise.resolve(), fail = null;
    files.forEach(function (f) {
      chain = chain.then(function () {
        var isPdf = /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name);
        return (isPdf ? pdfToPages(f) : imageToPage(f).then(function (p) { return [p]; })).then(function (pages) {
          pages.forEach(function (p) { session.pages.push(p); });
        });
      }).catch(function (e) { fail = e; });
    });
    return chain.then(function () {
      banner(fail ? t("loadFail", { e: fail.message }) : "", !!fail);
      if (!storeOk && !fail) banner(t("storeOff"), true);
      persist(); renderAll();
    });
  }
  function pageUrl(i) {
    if (!session.pages[i]) return "";
    var pg = session.pages[i];
    if (!pg._url) pg._url = URL.createObjectURL(pg.blob);
    return pg._url;
  }
  function revokePages() { session.pages.forEach(function (p) { if (p._url) { URL.revokeObjectURL(p._url); p._url = null; } }); }

  /* ---------------- render ---------------- */
  function renderAll() { renderViewer(); renderPins(); renderDock(); }
  function renderViewer() {
    var has = session.pages.length > 0;
    $("empty").hidden = has; $("viewer").hidden = !has;
    if (!has) return;
    curPage = L.clamp(curPage, 0, session.pages.length - 1);
    var img = $("pageImg"), src = pageUrl(curPage);
    if (img.getAttribute("src") !== src) img.src = src;
    $("pageLabel").textContent = (curPage + 1) + " / " + session.pages.length;
    $("prevPage").disabled = curPage === 0; $("nextPage").disabled = curPage >= session.pages.length - 1;
    $("btnPinMode").hidden = mode !== "review";
    $("btnPinMode").setAttribute("aria-pressed", String(pinMode));
    $("pinLayer").classList.toggle("nocross", !(mode === "recording" || mode === "paused" || (mode === "review" && pinMode)));
    var th = $("thumbs"); th.textContent = "";
    session.pages.forEach(function (pg, i) {
      var b = el("button", "thumb"); b.type = "button"; b.setAttribute("role", "listitem");
      b.setAttribute("aria-label", t("page") + " " + (i + 1)); if (i === curPage) b.setAttribute("aria-current", "true");
      var im = el("img"); im.src = pageUrl(i); im.alt = ""; b.appendChild(im);
      var n = L.pinsOnPage(session.pins, i).length;
      if (n) b.appendChild(el("span", "cnt", String(n)));
      b.addEventListener("click", function () { curPage = i; renderAll(); });
      th.appendChild(b);
    });
    renderPinMarks();
  }
  function renderPinMarks() {
    var layer = $("pinLayer"); layer.textContent = "";
    L.pinsOnPage(session.pins, curPage).forEach(function (p) {
      var d = el("div", "pin" + (p.star ? " star" : "") + (p.id === selId ? " sel" : ""), String(p.n));
      d.style.left = p.x * 100 + "%"; d.style.top = p.y * 100 + "%"; d.dataset.id = p.id;
      d.setAttribute("role", "button"); d.tabIndex = 0;
      d.setAttribute("aria-label", t("pinWord") + " " + p.n + " " + L.formatTime(p.t));
      layer.appendChild(d);
    });
  }
  function renderPins() {
    var list = $("pinList"); list.textContent = "";
    var pins = session.pins.filter(function (p) { return !starOnly || p.star; });
    $("pinEmpty").hidden = pins.length > 0;
    pins.forEach(function (p) {
      var li = el("li", "pin-row" + (p.id === selId ? " sel" : "")); li.dataset.id = p.id;
      var num = el("button", "num", String(p.n)); num.type = "button";
      num.setAttribute("aria-label", t("pinWord") + " " + p.n + " — " + t("play"));
      num.addEventListener("click", function () { selectPin(p.id, true); });
      var mid = el("div");
      var meta = el("div", "meta");
      meta.appendChild(el("span", "", L.formatTime(p.t)));
      meta.appendChild(el("span", "", t("page") + " " + (p.page + 1)));
      mid.appendChild(meta);
      var ta = el("textarea"); ta.rows = 2; ta.placeholder = t("notePh"); ta.value = p.note; ta.maxLength = 500;
      ta.setAttribute("aria-label", t("notePh") + " " + p.n);
      ta.addEventListener("input", function () { setPins(session.pins.map(function (q) { return q.id === p.id ? Object.assign({}, q, { note: ta.value }) : q; })); });
      ta.addEventListener("focus", function () { if (selId !== p.id) { selId = p.id; if (p.page !== curPage) { curPage = p.page; renderViewer(); } else renderPinMarks(); markRows(); } });
      mid.appendChild(ta);
      var acts = el("div", "acts");
      var st = el("button", p.star ? "star-on" : "", p.star ? "★" : "☆"); st.type = "button"; st.setAttribute("aria-label", t("star")); st.setAttribute("aria-pressed", String(p.star));
      st.addEventListener("click", function () { setPins(L.toggleStar(session.pins, p.id)); renderAll(); });
      var dl = el("button", "", "✕"); dl.type = "button"; dl.setAttribute("aria-label", t("del"));
      dl.addEventListener("click", function () { if (confirm(t("confirmDelPin"))) { if (selId === p.id) selId = null; setPins(L.deletePin(session.pins, p.id)); renderAll(); } });
      acts.appendChild(st); acts.appendChild(dl);
      li.appendChild(num); li.appendChild(mid); li.appendChild(acts);
      list.appendChild(li);
    });
    $("btnStarOnly").setAttribute("aria-pressed", String(starOnly));
  }
  function markRows() {
    document.querySelectorAll(".pin-row").forEach(function (r) { r.classList.toggle("sel", +r.dataset.id === selId); });
  }
  function renderDock() {
    var rec = mode === "setup" || mode === "recording" || mode === "paused";
    $("recPanel").hidden = !rec; $("playPanel").hidden = rec;
    document.body.classList.toggle("recording", mode === "recording");
    $("btnRec").hidden = mode !== "setup";
    $("btnPause").hidden = !(mode === "recording" || mode === "paused");
    $("btnStop").hidden = !(mode === "recording" || mode === "paused");
    $("btnPause").textContent = mode === "paused" ? t("resume") : t("pause");
    $("setupRow").hidden = mode !== "setup";
    $("recHint").hidden = mode === "review";
    $("talkBox").hidden = mode === "setup" && !(+$("presentMin").value > 0) ? true : false;
    if (mode === "review") {
      $("durTime").textContent = L.formatTime(session.audio ? session.audio.duration : 0);
      renderTicks(); updateBar();
    } else tickClock();
    $("title").value = session.title;
  }
  function renderTicks() {
    var box = $("barTicks"); box.textContent = "";
    L.barPositions(session.pins, session.audio ? session.audio.duration : 0).forEach(function (b) {
      var k = el("button", "tick" + (b.star ? " star" : ""), String(b.n)); k.type = "button";
      k.style.left = b.frac * 100 + "%"; k.dataset.id = b.id;
      k.setAttribute("aria-label", t("pinWord") + " " + b.n);
      k.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
      k.addEventListener("click", function (e) { e.stopPropagation(); selectPin(b.id, true); });
      box.appendChild(k);
    });
  }

  /* ---------------- pins ---------------- */
  function setPins(pins) {
    // keep selection stable across renumbering (ids are stable)
    session.pins = pins; persist();
  }
  function nowT() {
    if (mode === "review") return audioEl ? audioEl.currentTime : 0;
    return L.clockElapsed(clock, performance.now());
  }
  function addPinAt(x, y) {
    var tt = nowT();
    var before = session.pins.length;
    session.pins = L.addPin(session.pins, { page: curPage, x: x, y: y, t: tt });
    // find the new pin (largest id)
    var np = session.pins.reduce(function (a, p) { return p.id > a.id ? p : a; }, session.pins[0]);
    selId = np.id; persist();
    try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(15); } catch (e) { /* ignore */ }
    toast(t("pinAdded", { n: np.n, t: L.formatTime(tt) }), 1200);
    renderPins(); renderViewer(); if (mode === "review") renderTicks();
    return before;
  }
  function selectPin(id, play) {
    var p = session.pins.filter(function (q) { return q.id === id; })[0];
    if (!p) return;
    selId = id;
    if (p.page !== curPage) curPage = p.page;
    renderViewer(); markRows();
    var row = document.querySelector('.pin-row[data-id="' + id + '"]');
    if (row && row.scrollIntoView) row.scrollIntoView({ block: "nearest" });
    if (play && mode === "review" && audioEl) { followHoldUntil = p.t; seekPlay(L.pinSeek(p.t)); }
  }

  /* pin layer interaction */
  (function bindPinLayer() {
    var layer = $("pinLayer"), drag = null;
    function frac(e) {
      var r = $("pageImg").getBoundingClientRect();
      return { x: L.clamp((e.clientX - r.left) / r.width, 0, 1), y: L.clamp((e.clientY - r.top) / r.height, 0, 1) };
    }
    layer.addEventListener("pointerdown", function (e) {
      var pinEl = e.target.closest ? e.target.closest(".pin") : null;
      if (pinEl) {
        drag = { id: +pinEl.dataset.id, el: pinEl, sx: e.clientX, sy: e.clientY, moved: false };
        try { pinEl.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
        e.preventDefault(); return;
      }
      if (mode === "recording" || mode === "paused" || (mode === "review" && pinMode)) { var f = frac(e); addPinAt(f.x, f.y); }
      else if (mode === "setup") toast(t("startToPin"));
    });
    layer.addEventListener("pointermove", function (e) {
      if (!drag) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
      if (drag.moved) { var f = frac(e); drag.el.style.left = f.x * 100 + "%"; drag.el.style.top = f.y * 100 + "%"; drag.last = f; }
    });
    function end(e) {
      if (!drag) return; var d = drag; drag = null;
      if (d.moved && d.last) { setPins(L.movePin(session.pins, d.id, d.last.x, d.last.y)); renderPinMarks(); }
      else selectPin(d.id, true);
    }
    layer.addEventListener("pointerup", end);
    layer.addEventListener("pointercancel", function () { if (drag) { drag = null; renderPinMarks(); } });
    layer.addEventListener("keydown", function (e) {
      var pinEl = e.target.closest ? e.target.closest(".pin") : null; if (!pinEl) return;
      var id = +pinEl.dataset.id, step = e.shiftKey ? 0.05 : 0.01, p = session.pins.filter(function (q) { return q.id === id; })[0];
      var d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (d) { e.preventDefault(); setPins(L.movePin(session.pins, id, p.x + d[0], p.y + d[1])); renderPinMarks(); var n = document.querySelector('.pin[data-id="' + id + '"]'); if (n) n.focus(); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectPin(id, true); }
      else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); if (confirm(t("confirmDelPin"))) { setPins(L.deletePin(session.pins, id)); selId = null; renderAll(); } }
    });
  })();

  /* ---------------- clock / timer ---------------- */
  function tickClock() {
    var el_ = L.clockElapsed(clock, performance.now());
    $("elapsed").textContent = L.formatTime(el_);
    var ts = L.talkState(session.presentMin, el_, 60);
    var box = $("talkBox");
    box.classList.toggle("warn", ts.warn); box.classList.toggle("over", ts.over);
    if (!ts.enabled) $("talk").textContent = "-";
    else $("talk").textContent = ts.over ? "+" + L.formatTime(-ts.remaining) + " " + t("over") : L.formatTime(ts.remaining);
    if (mode === "setup" && ts.enabled) $("talk").textContent = L.formatTime(ts.remaining);
  }

  /* ---------------- recording ---------------- */
  function pickMime() {
    var cands = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return "";
    for (var i = 0; i < cands.length; i++) if (MediaRecorder.isTypeSupported(cands[i])) return cands[i];
    return "";
  }
  function requestWake() {
    try {
      if (!("wakeLock" in navigator)) { banner(t("noWake"), true); return; }
      navigator.wakeLock.request("screen").then(function (l) { wakeLock = l; l.addEventListener("release", function () { wakeLock = null; }); banner(t("wakeNote")); }).catch(function () { banner(t("noWake"), true); });
    } catch (e) { banner(t("noWake"), true); }
  }
  function releaseWake() { try { if (wakeLock) wakeLock.release(); } catch (e) { /* ignore */ } wakeLock = null; }
  document.addEventListener("visibilitychange", function () {
    if (mode === "recording" || mode === "paused") {
      if (document.hidden) hiddenDuringRec = true;
      else { if (!wakeLock && mode === "recording") requestWake(); if (hiddenDuringRec) { banner(t("interrupted"), true); hiddenDuringRec = false; } }
    }
  });
  function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { banner(t("noMic"), true); return; }
    session.presentMin = Math.max(0, +$("presentMin").value || 0);
    banner(t("micAsk"));
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
      stream = s; recMime = pickMime(); chunks = [];
      recorder = recMime ? new MediaRecorder(stream, { mimeType: recMime }) : new MediaRecorder(stream);
      recMime = recorder.mimeType || recMime || "audio/webm";
      recorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onstop = finishRecording;
      recorder.start(1000);
      clock = L.clockStart(L.clockNew(), performance.now());
      mode = "recording"; hiddenDuringRec = false;
      requestWake();
      tickTimer = setInterval(tickClock, 250);
      renderAll();
    }).catch(function () { banner(t("micDenied"), true); });
  }
  function pauseResume() {
    if (!recorder) return;
    if (mode === "recording") { try { recorder.pause(); } catch (e) { /* ignore */ } clock = L.clockPause(clock, performance.now()); mode = "paused"; releaseWake(); }
    else if (mode === "paused") { try { recorder.resume(); } catch (e) { /* ignore */ } clock = L.clockStart(clock, performance.now()); mode = "recording"; requestWake(); }
    renderDock(); renderViewer();
  }
  function stopRecording() {
    if (!recorder) return;
    clock = L.clockPause(clock, performance.now());
    session.audio = { blob: null, mime: recMime, duration: L.clockElapsed(clock, performance.now()) };
    try { recorder.stop(); } catch (e) { finishRecording(); }
    if (stream) stream.getTracks().forEach(function (tr) { tr.stop(); });
    clearInterval(tickTimer); releaseWake();
  }
  function finishRecording() {
    if (!session.audio) return;
    session.audio.blob = new Blob(chunks, { type: recMime });
    recorder = null; stream = null; chunks = [];
    banner("");
    enterReview();
    persistNow();
  }

  /* ---------------- playback ---------------- */
  function enterReview() {
    mode = "review"; pinMode = false;
    setupAudio();
    renderAll();
  }
  function setupAudio() {
    teardownAudio();
    if (!session.audio || !session.audio.blob) return;
    audioUrl = URL.createObjectURL(session.audio.blob);
    audioEl = new Audio(); audioEl.preload = "auto"; audioEl.src = audioUrl;
    audioEl.addEventListener("loadedmetadata", function () {
      // MediaRecorder webm often reports Infinity: force a duration scan once
      if (audioEl.duration === Infinity) {
        var fix = function () { audioEl.removeEventListener("timeupdate", fix); audioEl.currentTime = 0; };
        audioEl.addEventListener("timeupdate", fix); audioEl.currentTime = 1e101;
      }
    });
    audioEl.addEventListener("timeupdate", updateBar);
    audioEl.addEventListener("play", function () { $("btnPlay").textContent = "❚❚"; $("btnPlay").setAttribute("aria-label", t("pauseAria")); });
    audioEl.addEventListener("pause", function () { $("btnPlay").textContent = "▶"; $("btnPlay").setAttribute("aria-label", t("play")); });
    audioEl.addEventListener("ended", function () { $("btnPlay").textContent = "▶"; updateBar(); });
  }
  function teardownAudio() {
    if (audioEl) { try { audioEl.pause(); } catch (e) { /* ignore */ } audioEl.removeAttribute("src"); audioEl = null; }
    if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = null; }
  }
  function dur() { return session.audio ? session.audio.duration : 0; }
  function seekPlay(sec) {
    if (!audioEl) return;
    audioEl.currentTime = L.clamp(sec, 0, dur() || sec);
    var p = audioEl.play(); if (p && p.catch) p.catch(function () { /* autoplay blocked */ });
  }
  function updateBar() {
    if (mode !== "review" || !audioEl) return;
    var c = audioEl.currentTime, d = dur();
    $("curTime").textContent = L.formatTime(c);
    var f = d > 0 ? L.clamp(c / d, 0, 1) : 0;
    $("barFill").style.width = f * 100 + "%";
    $("bar").setAttribute("aria-valuenow", String(Math.round(f * 100)));
    $("bar").setAttribute("aria-valuetext", L.formatTime(c) + " / " + L.formatTime(d));
    if (followHoldUntil >= 0 && c >= followHoldUntil) followHoldUntil = -1;
    if (!audioEl.paused && followHoldUntil < 0) {
      var cp = L.currentPin(session.pins, c);
      if (cp && cp.id !== selId) { selId = cp.id; if (cp.page !== curPage) { curPage = cp.page; renderViewer(); } else renderPinMarks(); markRows(); }
    }
  }
  (function bindBar() {
    var bar = $("bar"), down = false;
    function seekFromEvent(e) {
      var r = bar.getBoundingClientRect(); if (!audioEl) return;
      audioEl.currentTime = L.clamp((e.clientX - r.left) / r.width, 0, 1) * dur(); updateBar();
    }
    bar.addEventListener("pointerdown", function (e) { down = true; try { bar.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } seekFromEvent(e); });
    bar.addEventListener("pointermove", function (e) { if (down) seekFromEvent(e); });
    bar.addEventListener("pointerup", function () { down = false; });
    bar.addEventListener("pointercancel", function () { down = false; });
    bar.addEventListener("keydown", function (e) {
      if (!audioEl) return;
      var d = { ArrowLeft: -5, ArrowRight: 5, Home: -1e9, End: 1e9 }[e.key];
      if (d != null) { e.preventDefault(); audioEl.currentTime = L.clamp(audioEl.currentTime + d, 0, dur()); updateBar(); }
      else if (e.key === " " || e.key === "Enter") { e.preventDefault(); $("btnPlay").click(); }
    });
    $("btnPlay").addEventListener("click", function () { if (!audioEl) return; if (audioEl.paused) { var p = audioEl.play(); if (p && p.catch) p.catch(function () {}); } else audioEl.pause(); });
  })();

  /* ---------------- .crit zip ---------------- */
  function u8(blob) { return blob.arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
  function buildCrit() {
    var files = {}, pageFiles = [], audioFile = null, jobs = [];
    session.pages.forEach(function (pg, i) {
      var name = "pages/p" + (i + 1) + "." + L.imageExt(pg.blob.type); pageFiles.push(name);
      jobs.push(u8(pg.blob).then(function (b) { files[name] = [b, { level: 0 }]; }));
    });
    if (session.audio && session.audio.blob) {
      audioFile = "audio." + L.extForMime(session.audio.mime);
      jobs.push(u8(session.audio.blob).then(function (b) { files[audioFile] = [b, { level: 0 }]; }));
    }
    return Promise.all(jobs).then(function () {
      var meta = L.buildSessionMeta(Object.assign({}, session, { title: session.title || defaultTitle() }), audioFile, pageFiles);
      files["session.json"] = [new TextEncoder().encode(JSON.stringify(meta, null, 1)), { level: 6 }];
      var zipped = fflate.zipSync(files);
      return new Blob([zipped], { type: "application/zip" });
    });
  }
  function loadCrit(file) {
    return file.arrayBuffer().then(function (buf) {
      var z = fflate.unzipSync(new Uint8Array(buf));
      if (!z["session.json"]) throw new Error("format");
      var meta = L.parseSessionMeta(new TextDecoder().decode(z["session.json"]));
      var s = newSession();
      s.title = meta.title; s.createdAt = meta.createdAt; s.presentMin = meta.presentMin; s.pins = meta.pins;
      s.pages = meta.pages.map(function (pg) {
        var data = z[pg.file]; if (!data) throw new Error("page");
        return { blob: new Blob([data], { type: /png$/i.test(pg.file) ? "image/png" : "image/jpeg" }), w: pg.w, h: pg.h, name: pg.name };
      });
      if (meta.audio && z[meta.audio.file]) {
        var ext = meta.audio.file.split(".").pop();
        var mime = meta.audio.mime || L.mimeForExt(ext);
        s.audio = { blob: new Blob([z[meta.audio.file]], { type: mime }), mime: mime, duration: meta.audio.duration };
      }
      return s;
    });
  }
  function adoptSession(s) {
    stopEverything();
    revokePages(); session = s; curPage = 0; selId = null; pinMode = false; starOnly = false; clock = L.clockNew();
    mode = s.audio && s.audio.blob ? "review" : "setup";
    $("presentMin").value = s.presentMin || 0;
    if (mode === "review") setupAudio(); else teardownAudio();
    renderAll(); persist();
  }
  function stopEverything() {
    if (recorder) { try { recorder.onstop = null; recorder.stop(); } catch (e) { /* ignore */ } recorder = null; }
    if (stream) stream.getTracks().forEach(function (tr) { tr.stop(); });
    stream = null; clearInterval(tickTimer); releaseWake(); teardownAudio(); banner("");
  }

  /* ---------------- summary export ---------------- */
  var SW = 1240, SH = 1754, SM = 64;
  function loadImg(blob) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(blob), im = new Image();
      im.onload = function () { res({ im: im, url: u }); }; im.onerror = function () { rej(new Error("img")); }; im.src = u;
    });
  }
  var FONT = '"Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
  function renderSummarySheets() {
    var allText = session.pins.map(function (p) { return p.note; }).join("") + t("sumNoPins") + (session.title || "") + "0123456789 ★";
    var fontsReady = document.fonts && document.fonts.load ? Promise.all([document.fonts.load("700 28px " + FONT, allText), document.fonts.load("400 26px " + FONT, allText)]).catch(function () {}) : Promise.resolve();
    var sheets = [], title = session.title || defaultTitle(), chain = fontsReady;
    var mc = document.createElement("canvas").getContext("2d");
    session.pages.forEach(function (pg, pi) {
      chain = chain.then(function () { return loadImg(pg.blob); }).then(function (r) {
        var pins = L.pinsOnPage(session.pins, pi), rows = L.noteRows(pins);
        var NW = SW - SM * 2 - 60 - 110 - 20; // note column width
        mc.font = "400 26px " + FONT;
        var lines = rows.map(function (row) { return L.wrapText(row.note || "—", NW, function (s) { return mc.measureText(s).width; }); });
        var heights = lines.map(function (ls) { return Math.max(54, ls.length * 34 + 20); });
        var imgMaxH = 900, sz = (function () { var k = Math.min((SW - SM * 2) / r.im.naturalWidth, imgMaxH / r.im.naturalHeight); return { w: Math.round(r.im.naturalWidth * k), h: Math.round(r.im.naturalHeight * k) }; })();
        var headH = 80, firstRoom = SH - SM - (SM + headH + sz.h + 40), restRoom = SH - SM * 2 - headH;
        var groups = L.paginateByHeight(heights, firstRoom, restRoom);
        groups.forEach(function (g, gi) {
          var c = document.createElement("canvas"); c.width = SW; c.height = SH;
          var cx = c.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, SW, SH);
          cx.fillStyle = "#1d1d1f"; cx.textBaseline = "alphabetic";
          cx.font = "700 30px " + FONT; cx.fillText(title, SM, SM + 30);
          cx.font = "400 22px " + FONT; cx.fillStyle = "#6e6e73";
          var lab = t("sumPage", { i: pi + 1, n: session.pages.length }) + (groups.length > 1 ? "  (" + (gi + 1) + "/" + groups.length + ")" : "");
          cx.textAlign = "right"; cx.fillText(lab, SW - SM, SM + 30); cx.textAlign = "left";
          cx.strokeStyle = "#d2d2d7"; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(SM, SM + 50); cx.lineTo(SW - SM, SM + 50); cx.stroke();
          var y = SM + headH;
          if (gi === 0) {
            var x0 = Math.round((SW - sz.w) / 2);
            cx.drawImage(r.im, x0, y, sz.w, sz.h);
            cx.strokeStyle = "#d2d2d7"; cx.lineWidth = 1; cx.strokeRect(x0, y, sz.w, sz.h);
            pins.forEach(function (p) {
              var px = x0 + p.x * sz.w, py = y + p.y * sz.h, rad = 20;
              cx.beginPath(); cx.arc(px, py, rad, 0, Math.PI * 2); cx.fillStyle = "#d70015"; cx.fill();
              cx.lineWidth = 3; cx.strokeStyle = "#fff"; cx.stroke();
              cx.fillStyle = "#fff"; cx.font = "700 20px " + FONT; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(String(p.n), px, py + 1);
              cx.textAlign = "left"; cx.textBaseline = "alphabetic";
            });
            y += sz.h + 40;
          }
          if (!rows.length) { cx.fillStyle = "#6e6e73"; cx.font = "400 24px " + FONT; cx.fillText(t("sumNoPins"), SM, y + 30); }
          g.forEach(function (ri) {
            var row = rows[ri], h = heights[ri];
            cx.beginPath(); cx.arc(SM + 22, y + 27, 20, 0, Math.PI * 2); cx.fillStyle = "#d70015"; cx.fill();
            cx.fillStyle = "#fff"; cx.font = "700 20px " + FONT; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(String(row.n), SM + 22, y + 28);
            cx.textAlign = "left"; cx.textBaseline = "alphabetic";
            cx.fillStyle = "#1d1d1f"; cx.font = "400 24px " + FONT; cx.fillText(row.time + (row.star ? "  ★" : ""), SM + 60, y + 36);
            cx.font = "400 26px " + FONT;
            lines[ri].forEach(function (ln, li) { cx.fillStyle = row.note ? "#1d1d1f" : "#a1a1a6"; cx.fillText(ln, SM + 60 + 130, y + 36 + li * 34); });
            cx.strokeStyle = "#e5e5ea"; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(SM, y + h - 4); cx.lineTo(SW - SM, y + h - 4); cx.stroke();
            y += h;
          });
          sheets.push(c);
        });
        URL.revokeObjectURL(r.url);
      });
    });
    return chain.then(function () { return sheets; });
  }
  function exportStatus(msg) { $("expStatus").textContent = msg || ""; }
  function exportPng() {
    exportStatus(t("exporting"));
    return renderSummarySheets().then(function (sheets) {
      var base = L.safeName(session.title || defaultTitle()) + "_" + L.stamp();
      return Promise.all(sheets.map(function (c) { return canvasToBlob(c, "image/png"); })).then(function (blobs) {
        if (blobs.length === 1) { download(blobs[0], base + ".png"); return; }
        return Promise.all(blobs.map(u8)).then(function (arr) {
          var f = {}; arr.forEach(function (a, i) { f[base + "_" + (i + 1) + ".png"] = [a, { level: 0 }]; });
          download(new Blob([fflate.zipSync(f)], { type: "application/zip" }), base + "_png.zip");
        });
      });
    }).then(function () { exportStatus(t("saved")); }).catch(function (e) { exportStatus(t("loadFail", { e: e.message })); });
  }
  function exportPdf() {
    exportStatus(t("exporting"));
    var lib = window.jspdf ? Promise.resolve() : loadScript(JSPDF_URL);
    return lib.catch(function () { throw new Error(t("libFail")); }).then(renderSummarySheets).then(function (sheets) {
      var pdf = new window.jspdf.jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      sheets.forEach(function (c, i) {
        if (i) pdf.addPage("a4", "portrait");
        pdf.addImage(c.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, 210, 297);
      });
      download(pdf.output("blob"), L.safeName(session.title || defaultTitle()) + "_" + L.stamp() + ".pdf");
    }).then(function () { exportStatus(t("saved")); }).catch(function (e) { exportStatus(e.message); });
  }
  function exportCrit() {
    exportStatus(t("exporting"));
    return buildCrit().then(function (blob) {
      download(blob, L.safeName(session.title || defaultTitle()) + "_" + L.stamp() + ".crit"); exportStatus(t("saved"));
    }).catch(function (e) { exportStatus(t("loadFail", { e: e.message })); });
  }

  /* ---------------- sessions dialog ---------------- */
  function listSessions() {
    var ul = $("sessionList"); ul.textContent = "";
    $("storeOff").hidden = storeOk;
    if (!storeOk) { $("sessEmpty").hidden = true; return Promise.resolve(); }
    return idb("readonly", function (st) { return st.getAll(); }).then(function (all) {
      all = (all || []).sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
      $("sessEmpty").hidden = all.length > 0;
      all.forEach(function (s) {
        var li = el("li", "sess-item");
        var b = el("button", "open"); b.type = "button";
        b.appendChild(el("b", "", s.title || defaultTitle()));
        b.appendChild(el("span", "", new Date(s.createdAt).toLocaleString(lang === "fr" ? "fr-FR" : "ko-KR") + " · " + s.pages.length + t("page") + " · " + s.pins.length + " " + t("pinWord")));
        b.addEventListener("click", function () { $("dlgSessions").close(); adoptSession(s); });
        var d = el("button", "del", "✕"); d.type = "button"; d.setAttribute("aria-label", t("del"));
        d.addEventListener("click", function () { if (confirm(t("confirmDelSession"))) idb("readwrite", function (st) { return st.delete(s.id); }).then(listSessions); });
        li.appendChild(b); li.appendChild(d); ul.appendChild(li);
      });
    }).catch(function () { storeOk = false; $("storeOff").hidden = false; });
  }

  /* ---------------- wiring ---------------- */
  function bind() {
    document.querySelectorAll(".lang button").forEach(function (b) {
      b.addEventListener("click", function () { lang = b.dataset.lang; try { localStorage.setItem("crit-lang", lang); } catch (e) { /* ignore */ } applyLang(); });
    });
    var fi = $("fileInput"), fi2 = $("fileInput2");
    fi.addEventListener("change", function () { addFiles(fi.files).then(function () { fi.value = ""; }); });
    fi2.addEventListener("change", function () { addFiles(fi2.files).then(function () { fi2.value = ""; }); });
    var drop = $("drop");
    drop.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fi.click(); } });
    ["dragenter", "dragover"].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
    document.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });

    $("title").addEventListener("input", function () { session.title = $("title").value; persist(); });
    $("presentMin").addEventListener("input", function () { session.presentMin = Math.max(0, +$("presentMin").value || 0); persist(); renderDock(); });
    $("prevPage").addEventListener("click", function () { curPage--; renderAll(); });
    $("nextPage").addEventListener("click", function () { curPage++; renderAll(); });
    $("btnPinMode").addEventListener("click", function () { pinMode = !pinMode; if (pinMode) toast(t("pinModeOn"), 3000); renderViewer(); });
    $("btnStarOnly").addEventListener("click", function () { starOnly = !starOnly; renderPins(); });
    $("btnRec").addEventListener("click", startRecording);
    $("btnPause").addEventListener("click", pauseResume);
    $("btnStop").addEventListener("click", stopRecording);
    $("btnRerecord").addEventListener("click", function () {
      if (!confirm(t("confirmRerecord"))) return;
      teardownAudio(); session.audio = null; session.pins = session.pins.map(function (p) { return Object.assign({}, p, { t: 0 }); });
      session.pins = []; selId = null; clock = L.clockNew(); mode = "setup"; persist(); renderAll();
    });
    $("btnNew").addEventListener("click", function () {
      if (hasContent() && !confirm(t("confirmNew"))) return;
      persistNow().then(function () { adoptSession(newSession()); $("presentMin").value = 10; session.presentMin = 10; renderAll(); });
    });
    $("btnSessions").addEventListener("click", function () { listSessions(); $("dlgSessions").showModal(); });
    $("btnOpen").addEventListener("click", function () { $("openInput").click(); });
    $("openInput").addEventListener("change", function () {
      var f = $("openInput").files[0]; if (!f) return;
      loadCrit(f).then(function (s) { adoptSession(s); }).catch(function () { banner(t("openFail"), true); });
      $("openInput").value = "";
    });
    $("btnSaveCrit").addEventListener("click", function () { exportCrit().then(function () { toast(t("saved")); }); });
    $("btnExport").addEventListener("click", function () { exportStatus(""); $("dlgExport").showModal(); });
    $("expPdf").addEventListener("click", exportPdf);
    $("expPng").addEventListener("click", exportPng);
    $("expCrit").addEventListener("click", exportCrit);
    window.addEventListener("beforeunload", function (e) {
      if (mode === "recording" || mode === "paused") { e.preventDefault(); e.returnValue = ""; }
    });
  }

  /* ---------------- boot ---------------- */
  bind();
  $("presentMin").value = session.presentMin;
  openDb().then(function (d) {
    db = d; storeOk = !!d;
    if (!storeOk) banner(t("storeOff"), true);
  });
  applyLang();

  // Test/automation hook (no network, no side effects): lets a test load a generated audio blob.
  window.CritApp = {
    state: function () { return { mode: mode, session: session, curPage: curPage, selId: selId }; },
    loadSession: function (s) { adoptSession(s); },
    loadAudio: function (blob, duration) { session.audio = { blob: blob, mime: blob.type || "audio/wav", duration: duration }; enterReview(); },
    addFiles: addFiles, buildCrit: buildCrit, loadCrit: loadCrit, renderSummarySheets: renderSummarySheets,
    storeOk: function () { return storeOk; },
    setClockForTest: function (c) { clock = c; },
    startFakeRecording: function () { clock = L.clockStart(L.clockNew(), performance.now()); mode = "recording"; tickTimer = setInterval(tickClock, 250); renderAll(); },
  };
})();
