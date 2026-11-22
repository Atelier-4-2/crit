/* Atelier Crit - UI. All data stays on this device (no network use except pinned CDN libraries). */
(function () {
  "use strict";
  var L = window.CritLib;
  var PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";
  var PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
  var JSPDF_URL = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
  var JSPDF_SRI = "sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk";
  var MAX_PAGE_W = 2400, MAX_PAGE_H = 3600;
  var CHUNK_MS = 4000;            // MediaRecorder timeslice: every chunk is also written to IndexedDB
  var ZOOMS = [1, 1.5, 2, 3];
  var IS_LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

  /* ---------------- i18n ---------------- */
  var DICT = {
    ko: {
      brandAria: "Atelier 4·2 메인페이지", titlePh: "크리틱 제목",
      sessions: "세션", newSession: "새로", openCrit: "열기", saveCrit: "저장", export: "내보내기",
      dropTitle: "도면을 놓으세요", dropSub: "PDF(여러 쪽) · JPG · PNG",
      privacy: "파일과 녹음은 이 기기 밖으로 나가지 않습니다.",
      addPages: "쪽 추가", pinMode: "핀 추가", elapsed: "경과", remaining: "남은 발표",
      presentTime: "발표 시간", mins: "분", recStart: "녹음 시작", pause: "일시정지", resume: "다시 시작", recStop: "끝내기",
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
      confirmNew: "지금 세션을 닫고 새로 시작할까요? (저장된 세션은 목록에 남습니다)",
      confirmDelSession: "이 세션을 삭제할까요?", confirmDelPin: "이 핀을 삭제할까요?",
      saved: "저장했습니다.", exporting: "만드는 중…", libFail: "라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.",
      openFail: ".crit 파일을 열 수 없습니다.", noPinsForExport: "등록된 핀이 없습니다. 핀 없이 도면만 내보냅니다.",
      sumPage: "{i} / {n}쪽", sumNoPins: "이 쪽에는 핀이 없습니다.", sumCols: "번호 · 시각 · 메모",
      over: "초과", dateFmt: "ko-KR",
      /* review round (texts by the Korean copy role) */
      langAria: "언어 선택", prevAria: "이전 쪽", nextAria: "다음 쪽",
      h1: "Crit — 도면 크리틱 녹음 및 핀 메모",
      docDesc: "크리틱을 녹음하면서 도면을 탭해 그 순간의 말을 핀에 기록하며, 파일과 음성은 기기 밖으로 나가지 않습니다.",
      lockedNote: "녹음을 보호하기 위해 녹음 중에는 사용할 수 없습니다.",
      micNotFound: "마이크를 찾을 수 없습니다. 연결 상태를 확인해 주세요.",
      recFail: "녹음을 시작하지 못했습니다. ({e})",
      trackMuted: "마이크 입력이 끊겼습니다. 녹음이 비거나 핀 시각이 어긋날 수 있습니다.",
      trackUnmuted: "마이크 입력이 다시 연결되었습니다. 끊긴 구간은 무음일 수 있습니다.",
      trackEnded: "마이크 연결이 끊어졌습니다. 녹음을 끝내고 저장해 주세요.",
      recError: "녹음 중 오류가 발생했습니다. 지금까지의 녹음을 저장합니다.",
      recEmpty: "녹음된 소리가 없습니다. 도면의 핀은 그대로 유지됩니다.",
      silentInput: "마이크 소리가 감지되지 않습니다. 마이크 연결과 음소거 설정을 확인해 주세요.",
      durMismatch: "녹음 파일의 실제 길이({real})가 기록 시계({clock})와 다릅니다. 핀 시각이 어긋났을 수 있어 파일 길이를 기준으로 적용합니다.",
      recoverTitle: "이전 녹음 복구",
      recoverBody: "비정상적으로 종료된 이전 녹음({t}, 핀 {n}개)이 있습니다. 복구하시겠습니까?",
      recoverYes: "복구", recoverLater: "나중에", recoverDiscard: "버리기",
      recovered: "녹음을 복구했습니다.", recoverEmpty: "복구할 녹음 조각이 없습니다.",
      confirmDiscardRecover: "복구할 녹음 조각을 완전히 삭제하시겠습니까? 삭제하면 되돌릴 수 없습니다.",
      critTooBig: ".crit 파일을 열 수 없습니다. 압축을 푼 용량이 너무 큽니다. (최대 1.5 GB)",
      critTooMany: ".crit 파일을 열 수 없습니다. 포함된 항목이 너무 많습니다. (최대 500개)",
      saveFailed: "브라우저에 저장하지 못했습니다. 저장 공간이 부족할 수 있으니 지금 .crit 파일로 내려받으세요.",
      saveFailedAct: "지금 .crit 저장",
      rerecTitle: "다시 녹음",
      rerecBody: "다시 녹음하면 현재 녹음은 지워집니다. 도면 위의 핀과 메모는 어떻게 처리할까요?",
      rerecKeep: "핀과 메모 유지 (시각 비움)", rerecWipe: "핀과 메모도 모두 지움", rerecSave: "먼저 .crit으로 저장", cancel: "취소",
      untimedTip: "녹음 시각 없음", setTimeHere: "지금 재생 위치로 시각 지정",
      delPage: "현재 쪽 삭제",
      confirmDelPage: "현재 쪽을 삭제하시겠습니까? 이 쪽에 남긴 핀 {n}개도 함께 삭제됩니다.",
      zoomIn: "도면 확대", zoomOut: "도면 축소", pinNow: "지금 시각으로 핀 추가", undo: "실행 취소",
      warnLabel: "종료 1분 전", alertClose: "경고 닫기",
      chunkFail: "녹음 중 자동 저장에 실패했습니다. 화면을 닫으면 지금까지의 녹음이 사라질 수 있습니다.",
    },
    fr: {
      brandAria: "Atelier 4·2 accueil", titlePh: "Titre de la critique",
      sessions: "Sessions", newSession: "Nouveau", openCrit: "Ouvrir", saveCrit: "Enregistrer", export: "Exporter",
      dropTitle: "Déposez vos plans", dropSub: "PDF (plusieurs pages) · JPG · PNG",
      privacy: "Vos fichiers et l'enregistrement ne quittent jamais cet appareil.",
      addPages: "Ajouter", pinMode: "Ajouter épingle", elapsed: "Écoulé", remaining: "Reste (présentation)",
      presentTime: "Durée de présentation", mins: "min", recStart: "Démarrer l'enregistrement", pause: "Pause", resume: "Reprendre", recStop: "Terminer",
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
      confirmNew: "Fermer cette session et recommencer ? (les sessions enregistrées restent dans la liste)",
      confirmDelSession: "Supprimer cette session ?", confirmDelPin: "Supprimer cette épingle ?",
      saved: "Enregistré.", exporting: "Création…", libFail: "Impossible de charger la bibliothèque. Vérifiez la connexion.",
      openFail: "Impossible d'ouvrir ce fichier .crit.", noPinsForExport: "Aucune épingle : seuls les plans seront exportés.",
      sumPage: "Page {i} / {n}", sumNoPins: "Aucune épingle sur cette page.", sumCols: "n° · instant · note",
      over: "dépassé", dateFmt: "fr-FR",
      langAria: "Langue", prevAria: "Page précédente", nextAria: "Page suivante",
      h1: "Crit — enregistrement de critique et notes épinglées",
      docDesc: "Atelier 4·2 Crit — enregistrez la critique et touchez le plan : chaque instant est lié à une épingle. Fichiers et voix ne quittent pas cet appareil.",
      lockedNote: "Indisponible pendant l'enregistrement, pour le protéger.",
      micNotFound: "Aucun micro trouvé. Vérifiez la connexion.",
      recFail: "Impossible de démarrer l'enregistrement ({e}).",
      trackMuted: "L'entrée micro a été coupée. L'enregistrement peut être vide et les instants des épingles décalés.",
      trackUnmuted: "L'entrée micro est revenue. La partie coupée peut être silencieuse.",
      trackEnded: "La connexion au micro est perdue. Terminez et enregistrez.",
      recError: "Erreur d'enregistrement. L'enregistrement actuel est sauvegardé.",
      recEmpty: "Aucun son enregistré. Les épingles du plan sont conservées.",
      silentInput: "Aucun son détecté sur le micro. Vérifiez la connexion et le mode muet.",
      durMismatch: "La durée réelle du fichier ({real}) diffère de l'horloge ({clock}). Les instants des épingles peuvent être décalés ; la durée du fichier est retenue.",
      recoverTitle: "Récupérer l'enregistrement",
      recoverBody: "Un enregistrement interrompu a été trouvé ({t}, {n} épingle(s)). Le récupérer ?",
      recoverYes: "Récupérer", recoverLater: "Plus tard", recoverDiscard: "Abandonner",
      recovered: "Enregistrement récupéré.", recoverEmpty: "Aucun fragment récupérable.",
      confirmDiscardRecover: "Supprimer définitivement les fragments d'enregistrement ? Action irréversible.",
      critTooBig: "Fichier .crit impossible à ouvrir : trop volumineux une fois décompressé (max. 1,5 Go).",
      critTooMany: "Fichier .crit impossible à ouvrir : trop d'éléments (max. 500).",
      saveFailed: "Échec de l'enregistrement dans le navigateur (espace insuffisant ?). Téléchargez un fichier .crit maintenant.",
      saveFailedAct: "Enregistrer en .crit",
      rerecTitle: "Réenregistrer",
      rerecBody: "L'enregistrement actuel sera effacé. Que faire des épingles et des notes ?",
      rerecKeep: "Garder épingles et notes (sans instant)", rerecWipe: "Tout effacer", rerecSave: "D'abord enregistrer en .crit", cancel: "Annuler",
      untimedTip: "Sans instant", setTimeHere: "Fixer l'instant à la position de lecture",
      delPage: "Supprimer la page",
      confirmDelPage: "Supprimer cette page ? Les {n} épingle(s) qu'elle porte seront supprimées aussi.",
      zoomIn: "Agrandir le plan", zoomOut: "Réduire le plan", pinNow: "Épingle à l'instant présent", undo: "Annuler",
      warnLabel: "Dernière minute", alertClose: "Fermer l'alerte",
      chunkFail: "Échec de la sauvegarde automatique. Fermer la page peut effacer l'enregistrement en cours.",
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
    document.title = "Crit · Atelier 4·2";
    var md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute("content", t("docDesc"));
    document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) { el.placeholder = t(el.getAttribute("data-i18n-ph")); });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
    document.querySelectorAll(".lang button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === lang)); });
    $("btnPlay").setAttribute("aria-label", audioEl && !audioEl.paused ? t("pauseAria") : t("play"));
    renderAll();
  }

  /* ---------------- state ---------------- */
  var $ = function (id) { return document.getElementById(id); };
  var session = newSession();
  var curPage = 0, selId = null, starOnly = false, pinMode = false, zoomIdx = 0;
  var mode = "setup"; // setup | recording | paused | review
  var starting = false; // mic permission pending
  var clock = L.clockNew();
  var recorder = null, stream = null, chunks = [], recMime = "";
  var curRid = null, chunkSeq = 0, chunkChain = Promise.resolve(), chunkWarned = false, lockRelease = null, finishing = false;
  var tickTimer = null, wakeLock = null, hiddenDuringRec = false;
  var audioCtx = null, analyser = null, meterBuf = null, silentSince = 0, silentWarned = false, warnShown = false;
  var audioEl = null, audioUrl = null, fixing = false, pendingSeek = null;
  var db = null, storeOk = false, saveTimer = null, followHoldUntil = -1;
  var blobDirty = false, saveFailed = false, everSaved = {}, refocusing = false;

  function newSession() {
    return { id: "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: "", createdAt: Date.now(), presentMin: 10, pages: [], pins: [], audio: null };
  }
  function defaultTitle() { return t("untitled") + " " + new Date(session.createdAt).toLocaleDateString(t("dateFmt")); }
  function recActive() { return mode === "recording" || mode === "paused" || starting; }
  function pinTime(p) { return p.untimed ? "—" : L.formatTime(p.t); }

  /* ---------------- helpers ---------------- */
  function toast(msg, ms, act) {
    var el = $("toast"), b = $("toastAct");
    $("toastText").textContent = msg; el.hidden = false;
    if (act) { b.hidden = false; b.textContent = act.label; b.onclick = function () { el.hidden = true; act.fn(); }; } else { b.hidden = true; b.onclick = null; }
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.hidden = true; }, ms || 2200);
  }
  function banner(msg, warn) {
    var el = $("banner");
    if (!msg) { el.hidden = true; return; }
    el.textContent = msg; el.className = "banner" + (warn ? " warn" : ""); el.hidden = false;
  }
  /* alerts stay until the user closes them (recording problems must not be overwritten by status lines) */
  function alertMsg(msg, act) {
    $("alertText").textContent = msg; $("alertBox").hidden = false;
    var b = $("alertAct");
    if (act) { b.hidden = false; b.textContent = act.label; b.onclick = act.fn; } else { b.hidden = true; b.onclick = null; }
  }
  function download(blob, name) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function loadScript(src, integrity) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = function () { rej(new Error("script")); };
      if (integrity) { s.integrity = integrity; s.crossOrigin = "anonymous"; }
      document.head.appendChild(s);
    });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* ---------------- IndexedDB (graceful) ----------------
     sessions : full record incl. page images + audio (written only when blobs changed)
     meta     : title, pins, counts (written on every edit - tiny; the session list reads only this)
     recMeta / recChunks : the recording in progress, one chunk row per MediaRecorder slice (crash recovery) */
  var MAXSEQ = Number.MAX_SAFE_INTEGER;
  function metaOf(s) {
    return { id: s.id, title: s.title, createdAt: s.createdAt, updatedAt: s.updatedAt, presentMin: s.presentMin, pins: s.pins,
      pageCount: s.pages.length, hasAudio: !!(s.audio && s.audio.blob) };
  }
  /** cb(db|null) - may be called twice: null when an old tab blocks the upgrade, then the db once that tab is closed */
  function openDb(cb) {
    return new Promise(function (resolve0) {
      var resolve = function (d) { cb(d); resolve0(d); };
      try {
        if (!window.indexedDB) return resolve(null);
        var req = indexedDB.open("atelier-crit", 2);
        req.onupgradeneeded = function (ev) {
          var d = req.result, tx = req.transaction;
          if (!d.objectStoreNames.contains("sessions")) d.createObjectStore("sessions", { keyPath: "id" });
          if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta", { keyPath: "id" });
          if (!d.objectStoreNames.contains("recMeta")) d.createObjectStore("recMeta", { keyPath: "rid" });
          if (!d.objectStoreNames.contains("recChunks")) d.createObjectStore("recChunks", { keyPath: ["rid", "seq"] });
          if (ev.oldVersion >= 1 && ev.oldVersion < 2) { // v1 -> v2: build the meta rows once
            var ms = tx.objectStore("meta");
            tx.objectStore("sessions").openCursor().onsuccess = function (e) { var c = e.target.result; if (c) { ms.put(metaOf(c.value)); c.continue(); } };
          }
        };
        req.onsuccess = function () { req.result.onversionchange = function () { req.result.close(); if (db === req.result) { db = null; storeOk = false; } }; resolve(req.result); };
        req.onerror = function () { resolve(null); };
        req.onblocked = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  }
  /** run fn(tx) in one transaction; fn may return a request (-> its result) or a function (-> called after complete) */
  function idb(stores, mode_, fn) {
    return new Promise(function (resolve, reject) {
      if (!db) return reject(new Error("nodb"));
      try {
        var tx = db.transaction(stores, mode_), r = fn(tx);
        tx.oncomplete = function () { resolve(typeof r === "function" ? r() : (r && r.result)); };
        tx.onerror = tx.onabort = function () { reject(tx.error || new Error("tx")); };
      } catch (e) { reject(e); }
    });
  }
  function hasContent() { return session.pages.length || session.pins.length || session.audio; }
  /** resolves true when the current state is safely stored */
  function persistNow() {
    clearTimeout(saveTimer); saveTimer = null;
    if (!storeOk) return Promise.resolve(false);
    if (!hasContent()) {
      if (!everSaved[session.id]) return Promise.resolve(true);
      delete everSaved[session.id];
      return idb(["sessions", "meta"], "readwrite", function (tx) { tx.objectStore("sessions").delete(session.id); tx.objectStore("meta").delete(session.id); }).then(function () { return true; }, function () { return false; });
    }
    var snap = Object.assign({}, session, { title: session.title || defaultTitle(), updatedAt: Date.now() });
    var full = blobDirty; blobDirty = false;
    var p;
    if (full) {
      snap.pages = session.pages.map(function (pg) { return { blob: pg.blob, w: pg.w, h: pg.h, name: pg.name }; });
      p = idb(["sessions", "meta"], "readwrite", function (tx) { tx.objectStore("meta").put(metaOf(snap)); return tx.objectStore("sessions").put(snap); });
    } else {
      p = idb(["meta"], "readwrite", function (tx) { return tx.objectStore("meta").put(metaOf(snap)); });
    }
    return p.then(function () {
      everSaved[session.id] = true;
      if (saveFailed) { saveFailed = false; $("alertBox").hidden = true; }
      return true;
    }, function () {
      if (full) blobDirty = true;
      saveFailed = true;
      alertMsg(t("saveFailed"), { label: t("saveFailedAct"), fn: function () { exportCrit(); } });
      return false;
    });
  }
  function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(persistNow, 500); }
  function flushPersist() { if (saveTimer) persistNow(); }

  /* ---------------- pages ---------------- */
  function canvasToBlob(canvas, type, q) {
    return new Promise(function (r, rej) { canvas.toBlob(function (b) { b ? r(b) : rej(new Error("toBlob")); }, type, q); });
  }
  function imageToPage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var sz = L.fitSize(img.naturalWidth, img.naturalHeight, MAX_PAGE_W, MAX_PAGE_H);
        var c = document.createElement("canvas"); c.width = sz.w; c.height = sz.h;
        var cx = c.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, sz.w, sz.h); cx.drawImage(img, 0, 0, sz.w, sz.h);
        URL.revokeObjectURL(url);
        canvasToBlob(c, "image/jpeg", 0.88).then(function (blob) { c.width = c.height = 0; resolve({ blob: blob, w: sz.w, h: sz.h, name: file.name }); }, function () { reject(new Error(file.name)); });
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
          var scale = Math.min(3, MAX_PAGE_W / v1.width, MAX_PAGE_H / v1.height);
          var vp = page.getViewport({ scale: scale });
          var c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
          var cx = c.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, c.width, c.height);
          return page.render({ canvasContext: cx, viewport: vp }).promise.then(function () {
            return canvasToBlob(c, "image/jpeg", 0.9);
          }).then(function (blob) {
            out.push({ blob: blob, w: c.width, h: c.height, name: file.name + " " + n });
            c.width = c.height = 0;
            banner(t("loadingPdf") + " " + n + "/" + pdf.numPages);
          });
        });
      })(i);
      return chain.then(function () { return out; });
    });
  }
  function addFiles(fileList) {
    if (recActive()) return Promise.resolve();
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return Promise.resolve();
    banner(t("loadingPdf"));
    var chain = Promise.resolve(), fail = null;
    files.forEach(function (f) {
      chain = chain.then(function () {
        var isPdf = /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name);
        return (isPdf ? pdfToPages(f) : imageToPage(f).then(function (p) { return [p]; })).then(function (pages) {
          pages.forEach(function (p) { session.pages.push(p); });
          blobDirty = true;
        });
      }).catch(function () { fail = f.name; });
    });
    return chain.then(function () {
      banner(fail ? t("loadFail", { e: fail }) : "", !!fail);
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
    var z = ZOOMS[zoomIdx];
    $("canvasWrap").classList.toggle("zoomed", z > 1);
    $("pageBox").style.width = z > 1 ? z * 100 + "%" : "";
    $("zoomLabel").textContent = Math.round(z * 100) + "%";
    $("zoomOut").disabled = zoomIdx === 0; $("zoomIn").disabled = zoomIdx >= ZOOMS.length - 1;
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
      d.setAttribute("aria-label", t("pinWord") + " " + p.n + " " + t("at") + " " + pinTime(p) + (p.star ? " ★" : ""));
      layer.appendChild(d);
    });
  }
  function renderPins() {
    var list = $("pinList");
    // keep the caret when a note is being typed while the list is rebuilt (e.g. a new pin arrives)
    var ae = document.activeElement, keep = null;
    if (ae && ae.tagName === "TEXTAREA" && list.contains(ae)) { keep = { id: ae.closest(".pin-row").dataset.id, s: ae.selectionStart, e: ae.selectionEnd }; }
    list.textContent = "";
    var pins = session.pins.filter(function (p) { return !starOnly || p.star; });
    $("pinEmpty").hidden = pins.length > 0;
    pins.forEach(function (p) {
      var li = el("li", "pin-row" + (p.id === selId ? " sel" : "")); li.dataset.id = p.id;
      var num = el("button", "num", String(p.n)); num.type = "button";
      num.setAttribute("aria-label", t("pinWord") + " " + p.n + " — " + t("play"));
      num.addEventListener("click", function () { selectPin(p.id, true); });
      var mid = el("div");
      var meta = el("div", "meta");
      var tm = el("span", p.untimed ? "untimed" : "", pinTime(p)); if (p.untimed) tm.title = t("untimedTip");
      meta.appendChild(tm);
      meta.appendChild(el("span", "", t("page") + " " + (p.page + 1)));
      if (p.untimed && mode === "review" && audioEl) {
        var st0 = el("button", "", t("setTimeHere")); st0.type = "button";
        st0.addEventListener("click", function () { setPins(L.setPinTime(session.pins, p.id, audioEl.currentTime)); renderAll(); });
        meta.appendChild(st0);
      }
      mid.appendChild(meta);
      var ta = el("textarea"); ta.rows = 2; ta.placeholder = t("notePh"); ta.value = p.note; ta.maxLength = 500;
      ta.setAttribute("aria-label", t("notePh") + " " + p.n);
      ta.addEventListener("input", function () { setPins(session.pins.map(function (q) { return q.id === p.id ? Object.assign({}, q, { note: ta.value }) : q; })); });
      ta.addEventListener("focus", function () {
        if (refocusing) return;
        if (selId !== p.id) { selId = p.id; if (p.page !== curPage) { curPage = p.page; renderViewer(); } else renderPinMarks(); markRows(); }
      });
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
    if (keep) {
      var ta2 = list.querySelector('.pin-row[data-id="' + keep.id + '"] textarea');
      if (ta2) { refocusing = true; try { ta2.focus({ preventScroll: true }); ta2.setSelectionRange(keep.s, keep.e); } catch (e) { /* ignore */ } refocusing = false; }
    }
    $("btnStarOnly").setAttribute("aria-pressed", String(starOnly));
  }
  function markRows() {
    document.querySelectorAll(".pin-row").forEach(function (r) { r.classList.toggle("sel", +r.dataset.id === selId); });
  }
  function applyLocks() {
    var lock = recActive();
    ["btnSessions", "btnNew", "btnOpen", "btnSaveCrit", "btnExport", "btnAddPages", "btnDelPage"].forEach(function (id) {
      var b = $(id); if (!b) return;
      b.disabled = lock;
      if (lock) { b.setAttribute("data-locked", "1"); b.title = t("lockedNote"); } else { b.removeAttribute("data-locked"); b.removeAttribute("title"); }
    });
    $("btnRec").disabled = starting;
    if (lock) { ["dlgSessions", "dlgExport"].forEach(function (id) { var d = $(id); if (d.open) d.close(); }); }
  }
  function renderDock() {
    var rec = mode === "setup" || mode === "recording" || mode === "paused";
    $("recPanel").hidden = !rec; $("playPanel").hidden = rec;
    document.body.classList.toggle("recording", mode === "recording");
    $("btnRec").hidden = mode !== "setup";
    $("btnPause").hidden = !(mode === "recording" || mode === "paused");
    $("btnStop").hidden = !(mode === "recording" || mode === "paused");
    $("btnPause").textContent = mode === "paused" ? t("resume") : t("pause");
    $("btnPinNow").hidden = mode === "setup";
    var rs = $("recState");
    rs.textContent = mode === "recording" ? t("recording") : mode === "paused" ? t("paused") : "";
    rs.className = "rec-state" + (mode === "recording" ? " on" : mode === "paused" ? " paused" : "");
    $("levelWrap").hidden = !(mode === "recording" && analyser);
    $("setupRow").hidden = mode !== "setup";
    $("recHint").hidden = mode === "review";
    $("talkBox").hidden = mode === "setup" && !(+$("presentMin").value > 0) ? true : false;
    if (mode === "review") {
      $("durTime").textContent = L.formatTime(session.audio ? session.audio.duration : 0);
      renderTicks(); updateBar();
    } else tickClock();
    $("title").value = session.title;
    applyLocks();
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
  function canPin() { return mode === "recording" || mode === "paused" || (mode === "review" && pinMode); }
  function addPinAt(x, y, tt) {
    if (tt == null) tt = nowT();
    session.pins = L.addPin(session.pins, { page: curPage, x: x, y: y, t: tt });
    // find the new pin (largest id)
    var np = session.pins.reduce(function (a, p) { return p.id > a.id ? p : a; }, session.pins[0]);
    selId = np.id; persist();
    try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(15); } catch (e) { /* ignore */ }
    toast(t("pinAdded", { n: np.n, t: L.formatTime(tt) }), 4000, { label: t("undo"), fn: function () {
      if (selId === np.id) selId = null;
      setPins(L.deletePin(session.pins, np.id)); renderAll();
    } });
    renderPins(); renderViewer(); if (mode === "review") renderTicks();
    return np;
  }
  function pinNow() {
    if (!session.pages.length) { toast(t("needPagesToPin")); return; }
    if (mode === "setup") { toast(t("startToPin")); return; }
    var np = addPinAt(0.5, 0.5);
    var m = document.querySelector('.pin[data-id="' + np.id + '"]');
    if (m) { try { m.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  function selectPin(id, play) {
    var p = session.pins.filter(function (q) { return q.id === id; })[0];
    if (!p) return;
    selId = id;
    if (p.page !== curPage) curPage = p.page;
    renderViewer(); markRows();
    var row = document.querySelector('.pin-row[data-id="' + id + '"]');
    if (row && row.scrollIntoView) row.scrollIntoView({ block: "nearest" });
    if (play && !p.untimed && mode === "review" && audioEl) { followHoldUntil = p.t; seekPlay(L.pinSeek(p.t)); }
  }

  /* pin layer interaction: a pin is created on pointer-UP of a still tap (so a scroll or pinch never drops a pin) */
  (function bindPinLayer() {
    var layer = $("pinLayer"), drag = null, tap = null;
    function frac(e) {
      var r = $("pageImg").getBoundingClientRect();
      return { x: L.clamp((e.clientX - r.left) / r.width, 0, 1), y: L.clamp((e.clientY - r.top) / r.height, 0, 1) };
    }
    layer.addEventListener("pointerdown", function (e) {
      if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
      var pinEl = e.target.closest ? e.target.closest(".pin") : null;
      if (pinEl) {
        drag = { id: +pinEl.dataset.id, el: pinEl, sx: e.clientX, sy: e.clientY, moved: false };
        try { pinEl.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
        e.preventDefault(); return;
      }
      if (canPin()) tap = { id: e.pointerId, x: e.clientX, y: e.clientY, t: nowT(), moved: false };
      else if (mode === "setup") toast(t("startToPin"));
    });
    layer.addEventListener("pointermove", function (e) {
      if (tap && e.pointerId === tap.id && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 10) tap.moved = true;
      if (!drag) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
      if (drag.moved) { var f = frac(e); drag.el.style.left = f.x * 100 + "%"; drag.el.style.top = f.y * 100 + "%"; drag.last = f; }
    });
    layer.addEventListener("pointerup", function (e) {
      if (tap && e.pointerId === tap.id) { var tp = tap; tap = null; if (!tp.moved && canPin()) { var f = frac(e); addPinAt(f.x, f.y, tp.t); } }
      if (!drag) return; var d = drag; drag = null;
      if (d.moved && d.last) { setPins(L.movePin(session.pins, d.id, d.last.x, d.last.y)); renderPinMarks(); }
      else selectPin(d.id, true);
    });
    layer.addEventListener("pointercancel", function () { tap = null; if (drag) { drag = null; renderPinMarks(); } });
    layer.addEventListener("keydown", function (e) {
      var pinEl = e.target.closest ? e.target.closest(".pin") : null; if (!pinEl) return;
      var id = +pinEl.dataset.id, step = e.shiftKey ? 0.05 : 0.01, p = session.pins.filter(function (q) { return q.id === id; })[0];
      var d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (d) { e.preventDefault(); setPins(L.movePin(session.pins, id, p.x + d[0], p.y + d[1])); renderPinMarks(); var n = document.querySelector('.pin[data-id="' + id + '"]'); if (n) n.focus(); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectPin(id, true); }
      else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); if (confirm(t("confirmDelPin"))) { setPins(L.deletePin(session.pins, id)); selId = null; renderAll(); } }
    });
  })();

  /* ---------------- clock / timer / mic level ---------------- */
  function tickClock() {
    var el_ = L.clockElapsed(clock, performance.now());
    $("elapsed").textContent = L.formatTime(el_);
    var ts = L.talkState(session.presentMin, el_, 60);
    var box = $("talkBox");
    box.classList.toggle("warn", ts.warn); box.classList.toggle("over", ts.over);
    $("talkNote").textContent = ts.warn ? t("warnLabel") : "";
    if (ts.warn && mode === "recording" && !warnShown) { warnShown = true; try { if (navigator.vibrate) navigator.vibrate([60, 40, 60]); } catch (e) { /* ignore */ } }
    if (!ts.warn) warnShown = false;
    if (!ts.enabled) $("talk").textContent = "-";
    else $("talk").textContent = ts.over ? "+" + L.formatTime(-ts.remaining) + " " + t("over") : L.formatTime(ts.remaining);
    if (mode === "setup" && ts.enabled) $("talk").textContent = L.formatTime(ts.remaining);
    if (mode === "recording") readLevel();
  }
  function startMeter(s) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      audioCtx = new AC(); if (audioCtx.state === "suspended" && audioCtx.resume) audioCtx.resume();
      var src = audioCtx.createMediaStreamSource(s);
      analyser = audioCtx.createAnalyser(); analyser.fftSize = 1024; src.connect(analyser);
      meterBuf = new Uint8Array(analyser.fftSize); silentSince = 0; silentWarned = false;
    } catch (e) { analyser = null; }
  }
  function stopMeter() {
    analyser = null; meterBuf = null;
    try { if (audioCtx) audioCtx.close(); } catch (e) { /* ignore */ }
    audioCtx = null; $("levelWrap").hidden = true; $("levelFill").style.width = "0";
  }
  function readLevel() {
    if (!analyser || !meterBuf) return;
    analyser.getByteTimeDomainData(meterBuf);
    var max = 0; for (var i = 0; i < meterBuf.length; i++) { var d = Math.abs(meterBuf[i] - 128); if (d > max) max = d; }
    $("levelFill").style.width = Math.min(100, (max / 128) * 400) + "%";
    // exact digital silence for 5 s while the audio graph is running = muted / dead mic
    if (max === 0 && audioCtx && audioCtx.state === "running" && !document.hidden) {
      if (!silentSince) silentSince = performance.now();
      else if (!silentWarned && performance.now() - silentSince > 5000) { silentWarned = true; alertMsg(t("silentInput")); }
    } else { silentSince = 0; silentWarned = false; }
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
      navigator.wakeLock.request("screen").then(function (l) { wakeLock = l; l.addEventListener("release", function () { wakeLock = null; }); toast(t("wakeNote"), 1500); }).catch(function () { banner(t("noWake"), true); });
    } catch (e) { banner(t("noWake"), true); }
  }
  function releaseWake() { try { if (wakeLock) wakeLock.release(); } catch (e) { /* ignore */ } wakeLock = null; }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) flushPersist();
    if (mode === "recording" || mode === "paused") {
      if (document.hidden) hiddenDuringRec = true;
      else { if (!wakeLock && mode === "recording") requestWake(); if (hiddenDuringRec) { alertMsg(t("interrupted")); hiddenDuringRec = false; } }
    }
  });
  function holdLock(rid) {
    try {
      if (navigator.locks && navigator.locks.request) navigator.locks.request("crit-rec-" + rid, function () { return new Promise(function (res) { lockRelease = res; }); });
    } catch (e) { /* ignore */ }
  }
  function dropLock() { if (lockRelease) { lockRelease(); lockRelease = null; } }
  function stopStream() {
    if (stream) { try { stream.getTracks().forEach(function (tr) { tr.stop(); }); } catch (e) { /* ignore */ } }
    stream = null;
  }
  function micError(err) {
    var n = (err && err.name) || "";
    if (n === "NotAllowedError" || n === "SecurityError" || n === "PermissionDeniedError") return t("micDenied");
    if (n === "NotFoundError" || n === "OverconstrainedError" || n === "DevicesNotFoundError") return t("micNotFound");
    return t("recFail", { e: n || (err && err.message) || "?" });
  }
  function recWrite(rid, seq, blob, elapsed, meta) {
    if (!storeOk) return Promise.resolve(false);
    return idb(["recChunks", "recMeta"], "readwrite", function (tx) {
      tx.objectStore("recChunks").put({ rid: rid, seq: seq, blob: blob, size: blob.size, elapsed: elapsed });
      return tx.objectStore("recMeta").put(Object.assign({}, meta, { updatedAt: Date.now(), elapsed: elapsed, lastSeq: seq }));
    }).then(function () { return true; }, function () {
      if (!chunkWarned) { chunkWarned = true; alertMsg(t("chunkFail")); }
      return false;
    });
  }
  function clearRec(rid) {
    if (!db) return Promise.resolve();
    return idb(["recChunks", "recMeta"], "readwrite", function (tx) {
      tx.objectStore("recMeta").delete(rid);
      tx.objectStore("recChunks").delete(IDBKeyRange.bound([rid, 0], [rid, MAXSEQ]));
    }).catch(function () { /* ignore */ });
  }
  function startRecording() {
    if (starting || recActive()) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { banner(t("noMic"), true); return; }
    starting = true; applyLocks();
    session.presentMin = Math.max(0, +$("presentMin").value || 0);
    banner(t("micAsk"));
    var gum = navigator.mediaDevices.getUserMedia({ audio: true });
    var saved = persistNow(); // pages must be in IndexedDB before the first chunk, so recovery can rebuild the session
    Promise.all([gum, saved]).then(function (r) { banner(""); beginRecording(r[0]); }).catch(function (err) {
      starting = false; stopStream(); banner("");
      gum.then(function (s) { s.getTracks().forEach(function (tr) { tr.stop(); }); }, function () { /* ignore */ });
      alertMsg(micError(err)); renderDock();
    });
  }
  function beginRecording(s) {
    stream = s;
    var m = pickMime(), rec;
    try { rec = m ? new MediaRecorder(stream, { mimeType: m }) : new MediaRecorder(stream); }
    catch (e1) { try { rec = new MediaRecorder(stream); } catch (e2) { stopStream(); throw e2; } }
    recMime = rec.mimeType || m || "audio/webm"; recorder = rec; chunks = []; chunkSeq = 0; chunkWarned = false; finishing = false;
    var rid = curRid = "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    var meta = { rid: rid, sessionId: session.id, mime: recMime, startedAt: Date.now() };
    chunkChain = Promise.resolve();
    holdLock(rid);
    rec.ondataavailable = function (e) {
      if (!e.data || !e.data.size) return;
      var seq = chunkSeq++, el_ = L.clockElapsed(clock, performance.now());
      chunks.push(e.data);
      chunkChain = chunkChain.then(function () { return recWrite(rid, seq, e.data, el_, meta); });
    };
    rec.onstop = function () { finishRecording(rid); };
    rec.onerror = function () { alertMsg(t("recError")); stopRecording(); };
    var tr = stream.getAudioTracks()[0];
    if (tr) {
      tr.onmute = function () { if (recActive()) alertMsg(t("trackMuted")); };
      tr.onunmute = function () { if (recActive()) alertMsg(t("trackUnmuted")); };
      tr.onended = function () { if (recActive()) alertMsg(t("trackEnded")); };
    }
    rec.start(CHUNK_MS);
    clock = L.clockStart(L.clockNew(), performance.now());
    mode = "recording"; starting = false; hiddenDuringRec = false; warnShown = false;
    startMeter(stream);
    requestWake();
    tickTimer = setInterval(tickClock, 250);
    renderAll();
  }
  function pauseResume() {
    if (!recorder) return;
    if (mode === "recording") { try { recorder.pause(); } catch (e) { /* ignore */ } clock = L.clockPause(clock, performance.now()); mode = "paused"; releaseWake(); silentSince = 0; }
    else if (mode === "paused") { try { recorder.resume(); } catch (e) { /* ignore */ } clock = L.clockStart(clock, performance.now()); mode = "recording"; requestWake(); }
    renderDock(); renderViewer();
  }
  function stopRecording() {
    if (!recorder || finishing) return;
    var rec = recorder, rid = curRid;
    clock = L.clockPause(clock, performance.now());
    session.audio = { blob: null, mime: recMime, duration: L.clockElapsed(clock, performance.now()) };
    clearInterval(tickTimer); releaseWake(); stopMeter();
    try { rec.stop(); } catch (e) { finishRecording(rid); }
    stopStream();
  }
  function finishRecording(rid) {
    if (!session.audio || finishing) return;
    finishing = true;
    var blob = new Blob(chunks, { type: recMime });
    recorder = null; stream = null; chunks = [];
    dropLock();
    banner("");
    var chain = chunkChain;
    if (blob.size === 0) {
      session.audio = null; mode = "setup"; clock = L.clockNew(); finishing = false;
      alertMsg(t("recEmpty")); renderAll();
      chain.then(function () { return clearRec(rid); });
      return;
    }
    session.audio.blob = blob; blobDirty = true;
    enterReview();
    chain.then(function () { return persistNow(); }).then(function (ok) { finishing = false; if (ok) return clearRec(rid); });
  }

  /* ---------------- playback ---------------- */
  function enterReview() {
    mode = "review"; pinMode = false;
    setupAudio();
    renderAll();
  }
  function setFixing(v) { fixing = v; $("btnPlay").disabled = v; $("bar").setAttribute("aria-busy", String(v)); }
  function checkDuration(real) {
    if (!session.audio || !(real > 0) || !isFinite(real)) return;
    var clockD = session.audio.duration;
    if (Math.abs(real - clockD) > 2) {
      alertMsg(t("durMismatch", { real: L.formatTime(real), clock: L.formatTime(clockD) }));
      session.audio.duration = real; persist();
      $("durTime").textContent = L.formatTime(real); renderTicks(); updateBar();
    }
  }
  function setupAudio() {
    teardownAudio();
    if (!session.audio || !session.audio.blob) return;
    audioUrl = URL.createObjectURL(session.audio.blob);
    var a = audioEl = new Audio(); a.preload = "auto"; a.src = audioUrl;
    a.addEventListener("loadedmetadata", function () {
      if (a !== audioEl) return;
      // MediaRecorder webm often reports Infinity: force a duration scan once, and lock seeking meanwhile
      if (a.duration === Infinity) {
        setFixing(true);
        var finish = function () {
          a.removeEventListener("timeupdate", fix); clearTimeout(guard);
          if (a !== audioEl) return;
          var real = a.duration; setFixing(false);
          a.currentTime = 0;
          checkDuration(real);
          if (pendingSeek != null) { var ps = pendingSeek; pendingSeek = null; seekPlay(ps); }
        };
        var fix = function () { finish(); };
        var guard = setTimeout(finish, 4000);
        a.addEventListener("timeupdate", fix); a.currentTime = 1e101;
      } else checkDuration(a.duration);
    });
    a.addEventListener("timeupdate", updateBar);
    a.addEventListener("play", function () { $("btnPlay").textContent = "❚❚"; $("btnPlay").setAttribute("aria-label", t("pauseAria")); });
    a.addEventListener("pause", function () { $("btnPlay").textContent = "▶"; $("btnPlay").setAttribute("aria-label", t("play")); });
    a.addEventListener("ended", function () { $("btnPlay").textContent = "▶"; updateBar(); });
  }
  function teardownAudio() {
    if (audioEl) { try { audioEl.pause(); } catch (e) { /* ignore */ } audioEl.removeAttribute("src"); audioEl = null; }
    if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = null; }
    pendingSeek = null; setFixing(false);
  }
  function dur() { return session.audio ? session.audio.duration : 0; }
  function seekPlay(sec) {
    if (!audioEl) return;
    if (fixing) { pendingSeek = sec; return; }
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
      var r = bar.getBoundingClientRect(); if (!audioEl || fixing) return;
      audioEl.currentTime = L.clamp((e.clientX - r.left) / r.width, 0, 1) * dur(); updateBar();
    }
    bar.addEventListener("pointerdown", function (e) { down = true; try { bar.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } seekFromEvent(e); });
    bar.addEventListener("pointermove", function (e) { if (down) seekFromEvent(e); });
    bar.addEventListener("pointerup", function () { down = false; });
    bar.addEventListener("pointercancel", function () { down = false; });
    bar.addEventListener("keydown", function (e) {
      if (!audioEl || fixing) return;
      var d = { ArrowLeft: -5, ArrowRight: 5, Home: -1e9, End: 1e9 }[e.key];
      if (d != null) { e.preventDefault(); audioEl.currentTime = L.clamp(audioEl.currentTime + d, 0, dur()); updateBar(); }
      else if (e.key === " " || e.key === "Enter") { e.preventDefault(); $("btnPlay").click(); }
    });
    $("btnPlay").addEventListener("click", function () { if (!audioEl || fixing) return; if (audioEl.paused) { var p = audioEl.play(); if (p && p.catch) p.catch(function () {}); } else audioEl.pause(); });
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
  /** limits: <= 1.5 GB uncompressed, <= 500 entries - checked on the zip directory BEFORE anything is inflated */
  function loadCrit(file) {
    if (file.size > L.CRIT_LIMITS.maxTotal) return Promise.reject(new Error("critbig"));
    return file.arrayBuffer().then(function (buf) {
      var data = new Uint8Array(buf);
      L.scanZipDirectory(data); // throws critbig / critmany / format
      var raw = fflate.unzipSync(data, { filter: function (f) { return L.isCritEntryName(f.name); } });
      var z = Object.create(null); Object.keys(raw).forEach(function (k) { z[k] = raw[k]; });
      if (!z["session.json"]) throw new Error("format");
      var meta = L.parseSessionMeta(new TextDecoder().decode(z["session.json"]));
      var s = newSession();
      s.title = meta.title; s.createdAt = meta.createdAt; s.presentMin = meta.presentMin; s.pins = meta.pins;
      s.pages = meta.pages.map(function (pg) {
        var d = z[pg.file]; if (!d) throw new Error("page");
        return { blob: new Blob([d], { type: /png$/i.test(pg.file) ? "image/png" : "image/jpeg" }), w: pg.w, h: pg.h, name: pg.name };
      });
      if (meta.audio && z[meta.audio.file]) {
        var ext = meta.audio.file.split(".").pop();
        var mime = meta.audio.mime || L.mimeForExt(ext);
        s.audio = { blob: new Blob([z[meta.audio.file]], { type: mime }), mime: mime, duration: meta.audio.duration };
      }
      return s;
    });
  }
  function openCritMessage(e) {
    if (e && e.message === "critbig") return t("critTooBig");
    if (e && e.message === "critmany") return t("critTooMany");
    if (e && e.name === "RangeError") return t("critTooBig");
    return t("openFail");
  }
  /** fromDb: the record came from IndexedDB (blobs already stored); otherwise the next save writes everything */
  function adoptSession(s, fromDb) {
    if (recActive()) return false;
    stopEverything();
    revokePages(); session = s; curPage = 0; selId = null; pinMode = false; starOnly = false; zoomIdx = 0; clock = L.clockNew();
    $("alertBox").hidden = true;
    blobDirty = !fromDb; if (fromDb) everSaved[s.id] = true;
    mode = s.audio && s.audio.blob ? "review" : "setup";
    $("presentMin").value = s.presentMin || 0;
    if (mode === "review") setupAudio(); else teardownAudio();
    renderAll(); persist();
    return true;
  }
  function stopEverything() {
    if (recorder) { try { recorder.onstop = null; recorder.stop(); } catch (e) { /* ignore */ } recorder = null; }
    stopStream(); stopMeter(); dropLock(); clearInterval(tickTimer); releaseWake(); teardownAudio(); banner("");
  }

  /* ---------------- crash recovery of an interrupted recording ---------------- */
  function loadStored(id) {
    return idb(["sessions", "meta"], "readonly", function (tx) {
      var a = tx.objectStore("sessions").get(id), b = tx.objectStore("meta").get(id);
      return function () { return { rec: a.result, meta: b.result }; };
    }).then(function (r) {
      if (!r.rec) return null;
      if (r.meta) { r.rec.title = r.meta.title; r.rec.pins = r.meta.pins; r.rec.presentMin = r.meta.presentMin; }
      return r.rec;
    });
  }
  function askRecover(n, plan) {
    return new Promise(function (resolve) {
      var d = $("dlgRecover");
      $("recoverBody").textContent = t("recoverBody", { t: L.formatTime(plan.elapsed), n: n });
      d.returnValue = "";
      d.addEventListener("close", function h() { d.removeEventListener("close", h); resolve(d.returnValue || "later"); });
      d.showModal();
    });
  }
  function offerRecovery(m) {
    return idb(["recChunks"], "readonly", function (tx) {
      return tx.objectStore("recChunks").getAll(IDBKeyRange.bound([m.rid, 0], [m.rid, MAXSEQ]));
    }).then(function (recs) {
      var plan = L.planRecovery(recs);
      if (plan.empty) { toast(t("recoverEmpty")); return clearRec(m.rid).then(function () { return "empty"; }); }
      return loadStored(m.sessionId).catch(function () { return null; }).then(function (stored) {
        return askRecover(stored ? stored.pins.length : 0, plan).then(function (ans) {
          if (ans === "yes") {
            var s = stored || newSession(); if (!stored) s.id = m.sessionId;
            s.audio = { blob: new Blob(plan.used.map(function (r) { return r.blob; }), { type: m.mime }), mime: m.mime, duration: plan.elapsed };
            adoptSession(s, false);
            toast(t("recovered"), 3000);
            return persistNow().then(function (ok) { if (ok) return clearRec(m.rid); }).then(function () { return "recovered"; });
          }
          if (ans === "discard") {
            if (confirm(t("confirmDiscardRecover"))) return clearRec(m.rid).then(function () { return "discarded"; });
          }
          return "later";
        });
      });
    });
  }
  function checkRecovery() {
    if (!storeOk) return Promise.resolve();
    return idb(["recMeta"], "readonly", function (tx) { return tx.objectStore("recMeta").getAll(); }).then(function (metas) {
      if (!metas || !metas.length) return;
      var q = (navigator.locks && navigator.locks.query) ? navigator.locks.query().then(function (r) { return (r.held || []).map(function (x) { return x.name; }); }, function () { return null; }) : Promise.resolve(null);
      return q.then(function (held) {
        var todo = metas.filter(function (m) { return !L.isLiveRecording(m, held, Date.now()); }).sort(function (a, b) { return b.startedAt - a.startedAt; });
        var chain = Promise.resolve(), done = false;
        todo.forEach(function (m) { chain = chain.then(function () { if (done) return; return offerRecovery(m).then(function (r) { if (r === "recovered") done = true; }); }); });
        return chain;
      });
    }).catch(function () { /* ignore */ });
  }

  /* ---------------- summary export ---------------- */
  var SW = 1240, SH = 1754, SM = 64;
  function loadImg(blob) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(blob), im = new Image();
      im.onload = function () { res({ im: im, url: u }); }; im.onerror = function () { URL.revokeObjectURL(u); rej(new Error("img")); }; im.src = u;
    });
  }
  var FONT = '"Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
  /** one sheet at a time: draw, convert to a Blob, free the canvas (iOS has a hard total canvas memory limit). kind: "png" | "jpeg" */
  function renderSummarySheets(kind) {
    var mime = kind === "jpeg" ? "image/jpeg" : "image/png", q = kind === "jpeg" ? 0.9 : undefined;
    var allText = session.pins.map(function (p) { return p.note + L.formatTime(p.t); }).join("") + t("sumNoPins") + t("sumCols") + t("sumPage", { i: 1234567890, n: 1234567890 }) +
      (session.title || "") + defaultTitle() + "0123456789 ★—()/:·+-";
    var fontsReady = document.fonts && document.fonts.load ? Promise.all([document.fonts.load("700 28px " + FONT, allText), document.fonts.load("400 26px " + FONT, allText)]).catch(function () {}) : Promise.resolve();
    var out = [], title = session.title || defaultTitle(), chain = fontsReady;
    var mc = document.createElement("canvas").getContext("2d");
    session.pages.forEach(function (pg, pi) {
      chain = chain.then(function () { return loadImg(pg.blob); }).then(function (r) {
        var pins = L.pinsOnPage(session.pins, pi), rows = L.noteRows(pins);
        // time column wide enough for "1:23:45  ★" so the note never overlaps it
        mc.font = "400 24px " + FONT;
        var colW = 130;
        rows.forEach(function (row) { colW = Math.max(colW, Math.ceil(mc.measureText(row.time + (row.star ? "  ★" : "")).width) + 16); });
        var NW = SW - SM * 2 - 60 - colW - 20; // note column width
        mc.font = "400 26px " + FONT;
        var lines = rows.map(function (row) { return L.wrapText(row.note || "—", NW, function (s) { return mc.measureText(s).width; }); });
        var heights = lines.map(function (ls) { return Math.max(54, ls.length * 34 + 20); });
        var imgMaxH = 900, sz = (function () { var k = Math.min((SW - SM * 2) / r.im.naturalWidth, imgMaxH / r.im.naturalHeight); return { w: Math.round(r.im.naturalWidth * k), h: Math.round(r.im.naturalHeight * k) }; })();
        var headH = 80, colHead = rows.length ? 34 : 0;
        var firstRoom = SH - SM - (SM + headH + sz.h + 40) - colHead, restRoom = SH - SM * 2 - headH - colHead;
        var groups = L.paginateByHeight(heights, firstRoom, restRoom);
        var gchain = Promise.resolve();
        groups.forEach(function (g, gi) {
          gchain = gchain.then(function () {
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
            else { cx.fillStyle = "#6e6e73"; cx.font = "400 20px " + FONT; cx.fillText(t("sumCols"), SM, y + 20); y += colHead; }
            g.forEach(function (ri) {
              var row = rows[ri], h = heights[ri];
              cx.beginPath(); cx.arc(SM + 22, y + 27, 20, 0, Math.PI * 2); cx.fillStyle = "#d70015"; cx.fill();
              cx.fillStyle = "#fff"; cx.font = "700 20px " + FONT; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(String(row.n), SM + 22, y + 28);
              cx.textAlign = "left"; cx.textBaseline = "alphabetic";
              cx.fillStyle = "#1d1d1f"; cx.font = "400 24px " + FONT; cx.fillText(row.time + (row.star ? "  ★" : ""), SM + 60, y + 36);
              cx.font = "400 26px " + FONT;
              lines[ri].forEach(function (ln, li) { cx.fillStyle = row.note ? "#1d1d1f" : "#a1a1a6"; cx.fillText(ln, SM + 60 + colW, y + 36 + li * 34); });
              cx.strokeStyle = "#e5e5ea"; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(SM, y + h - 4); cx.lineTo(SW - SM, y + h - 4); cx.stroke();
              y += h;
            });
            return canvasToBlob(c, mime, q).then(function (b) { c.width = c.height = 0; out.push(b); });
          });
        });
        return gchain.then(function () { URL.revokeObjectURL(r.url); });
      });
    });
    return chain.then(function () { return out; });
  }
  function exportStatus(msg) { $("expStatus").textContent = msg || ""; }
  function exportPng() {
    exportStatus(t("exporting"));
    return renderSummarySheets("png").then(function (blobs) {
      var base = L.safeName(session.title || defaultTitle()) + "_" + L.stamp();
      if (blobs.length === 1) { download(blobs[0], base + ".png"); return; }
      return Promise.all(blobs.map(u8)).then(function (arr) {
        var f = {}; arr.forEach(function (a, i) { f[base + "_" + (i + 1) + ".png"] = [a, { level: 0 }]; });
        download(new Blob([fflate.zipSync(f)], { type: "application/zip" }), base + "_png.zip");
      });
    }).then(function () { exportStatus(t("saved")); }).catch(function (e) { exportStatus(t("loadFail", { e: e.message })); });
  }
  function exportPdf() {
    exportStatus(t("exporting"));
    var lib = window.jspdf ? Promise.resolve() : loadScript(JSPDF_URL, JSPDF_SRI);
    return lib.catch(function () { throw new Error(t("libFail")); }).then(function () { return renderSummarySheets("jpeg"); }).then(function (blobs) {
      var pdf = new window.jspdf.jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      var chain = Promise.resolve();
      blobs.forEach(function (b, i) {
        chain = chain.then(function () { return u8(b); }).then(function (bytes) {
          if (i) pdf.addPage("a4", "portrait");
          pdf.addImage(bytes, "JPEG", 0, 0, 210, 297);
        });
      });
      return chain.then(function () { download(pdf.output("blob"), L.safeName(session.title || defaultTitle()) + "_" + L.stamp() + ".pdf"); });
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
    return idb(["meta"], "readonly", function (tx) { return tx.objectStore("meta").getAll(); }).then(function (all) {
      all = (all || []).sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
      $("sessEmpty").hidden = all.length > 0;
      all.forEach(function (s) {
        var li = el("li", "sess-item");
        var b = el("button", "open"); b.type = "button";
        b.appendChild(el("b", "", s.title || defaultTitle()));
        b.appendChild(el("span", "", new Date(s.createdAt).toLocaleString(t("dateFmt")) + " · " + s.pageCount + t("page") + " · " + s.pins.length + " " + t("pinWord")));
        b.addEventListener("click", function () {
          if (recActive()) return;
          $("dlgSessions").close();
          loadStored(s.id).then(function (rec) { if (rec) adoptSession(rec, true); });
        });
        var d = el("button", "del", "✕"); d.type = "button"; d.setAttribute("aria-label", t("del"));
        d.addEventListener("click", function () {
          if (confirm(t("confirmDelSession"))) idb(["sessions", "meta"], "readwrite", function (tx) { tx.objectStore("sessions").delete(s.id); tx.objectStore("meta").delete(s.id); delete everSaved[s.id]; }).then(listSessions);
        });
        li.appendChild(b); li.appendChild(d); ul.appendChild(li);
      });
    }).catch(function () { storeOk = false; $("storeOff").hidden = false; });
  }

  /* ---------------- re-record ---------------- */
  function rerecord(keepPins) {
    teardownAudio(); session.audio = null;
    session.pins = keepPins ? L.untimeAll(session.pins) : [];
    selId = null; clock = L.clockNew(); mode = "setup"; blobDirty = true;
    $("alertBox").hidden = true;
    persist(); renderAll();
  }
  function askRerecord() {
    var d = $("dlgRerecord");
    d.returnValue = "";
    d.addEventListener("close", function h() {
      d.removeEventListener("close", h);
      var v = d.returnValue;
      if (v === "keep") rerecord(true);
      else if (v === "wipe") rerecord(false);
      else if (v === "save") exportCrit().then(function () { toast(t("saved")); askRerecord(); });
    });
    d.showModal();
  }

  /* ---------------- wiring ---------------- */
  function bind() {
    document.querySelectorAll(".lang button").forEach(function (b) {
      b.addEventListener("click", function () { lang = b.dataset.lang; try { localStorage.setItem("crit-lang", lang); } catch (e) { /* ignore */ } applyLang(); });
    });
    var fi = $("fileInput"), fi2 = $("fileInput2");
    fi.addEventListener("change", function () { addFiles(fi.files).then(function () { fi.value = ""; }); });
    fi2.addEventListener("change", function () { addFiles(fi2.files).then(function () { fi2.value = ""; }); });
    $("btnAddPages").addEventListener("click", function () { if (!recActive()) fi2.click(); });
    var drop = $("drop");
    drop.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fi.click(); } });
    ["dragenter", "dragover"].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); if (!recActive()) drop.classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
    document.addEventListener("drop", function (e) {
      if (recActive() || !e.dataTransfer || !e.dataTransfer.files.length) return;
      var fl = Array.prototype.slice.call(e.dataTransfer.files);
      var crit = fl.filter(function (f) { return /\.crit$/i.test(f.name); })[0];
      if (crit) { loadCrit(crit).then(function (s) { adoptSession(s); }).catch(function (err) { banner(openCritMessage(err), true); }); return; }
      addFiles(fl);
    });

    $("alertClose").addEventListener("click", function () { $("alertBox").hidden = true; });
    $("title").addEventListener("input", function () { session.title = $("title").value; persist(); });
    $("presentMin").addEventListener("input", function () { session.presentMin = Math.max(0, +$("presentMin").value || 0); persist(); renderDock(); });
    $("prevPage").addEventListener("click", function () { curPage--; renderAll(); });
    $("nextPage").addEventListener("click", function () { curPage++; renderAll(); });
    $("zoomIn").addEventListener("click", function () { zoomIdx = Math.min(ZOOMS.length - 1, zoomIdx + 1); renderViewer(); });
    $("zoomOut").addEventListener("click", function () { zoomIdx = Math.max(0, zoomIdx - 1); renderViewer(); });
    $("btnDelPage").addEventListener("click", function () {
      if (recActive() || !session.pages.length) return;
      var n = L.pinsOnPage(session.pins, curPage).length;
      if (!confirm(t("confirmDelPage", { n: n }))) return;
      var pg = session.pages[curPage]; if (pg && pg._url) URL.revokeObjectURL(pg._url);
      session.pages.splice(curPage, 1);
      session.pins = L.removePage(session.pins, curPage);
      selId = null; curPage = Math.max(0, Math.min(curPage, session.pages.length - 1)); blobDirty = true; persist(); renderAll();
    });
    $("btnPinMode").addEventListener("click", function () { pinMode = !pinMode; if (pinMode) toast(t("pinModeOn"), 3000); renderViewer(); });
    $("btnPinNow").addEventListener("click", pinNow);
    $("btnStarOnly").addEventListener("click", function () { starOnly = !starOnly; renderPins(); });
    $("btnRec").addEventListener("click", startRecording);
    $("btnPause").addEventListener("click", pauseResume);
    $("btnStop").addEventListener("click", stopRecording);
    $("btnRerecord").addEventListener("click", askRerecord);
    $("btnNew").addEventListener("click", function () {
      if (recActive()) return;
      if (hasContent() && !confirm(t("confirmNew"))) return;
      persistNow().then(function () { if (adoptSession(newSession())) { $("presentMin").value = 10; session.presentMin = 10; renderAll(); } });
    });
    $("btnSessions").addEventListener("click", function () { if (recActive()) return; listSessions(); $("dlgSessions").showModal(); });
    $("btnOpen").addEventListener("click", function () { if (!recActive()) $("openInput").click(); });
    $("openInput").addEventListener("change", function () {
      var f = $("openInput").files[0]; if (!f) return;
      loadCrit(f).then(function (s) { adoptSession(s); }).catch(function (err) { banner(openCritMessage(err), true); });
      $("openInput").value = "";
    });
    $("btnSaveCrit").addEventListener("click", function () { if (!recActive()) exportCrit().then(function () { toast(t("saved")); }); });
    $("btnExport").addEventListener("click", function () {
      if (recActive()) return;
      exportStatus(session.pins.length ? "" : t("noPinsForExport")); $("dlgExport").showModal();
    });
    $("expPdf").addEventListener("click", exportPdf);
    $("expPng").addEventListener("click", exportPng);
    $("expCrit").addEventListener("click", exportCrit);
    window.addEventListener("beforeunload", function (e) {
      if (recActive() || (!storeOk && hasContent()) || saveFailed) { e.preventDefault(); e.returnValue = ""; }
    });
    window.addEventListener("pagehide", flushPersist);
  }

  /* ---------------- boot ---------------- */
  bind();
  $("presentMin").value = session.presentMin;
  openDb(function (d) {
    db = d; storeOk = !!d;
    if (!storeOk) banner(t("storeOff"), true);
    else {
      if ($("banner").textContent === t("storeOff")) banner("");
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }
      checkRecovery();
    }
  });
  applyLang();

  // Test/automation hook: only on a local dev host (never exposes sessions or audio on the published site).
  if (IS_LOCAL) {
    window.CritApp = {
      state: function () { return { mode: mode, starting: starting, session: session, curPage: curPage, selId: selId, chunkSeq: chunkSeq, rid: curRid, zoom: ZOOMS[zoomIdx], fixing: fixing }; },
      loadSession: function (s) { adoptSession(s); },
      loadAudio: function (blob, duration) { session.audio = { blob: blob, mime: blob.type || "audio/wav", duration: duration }; blobDirty = true; enterReview(); },
      addFiles: addFiles, buildCrit: buildCrit, loadCrit: loadCrit, renderSummarySheets: renderSummarySheets,
      storeOk: function () { return storeOk; },
      setClockForTest: function (c) { clock = c; },
      startFakeRecording: function () { clock = L.clockStart(L.clockNew(), performance.now()); mode = "recording"; tickTimer = setInterval(tickClock, 250); renderAll(); },
      /* real MediaRecorder path with a caller-supplied MediaStream (e.g. an oscillator): exercises chunk saving without a microphone */
      startRecordingWithStream: function (s) { starting = true; return persistNow().then(function () { beginRecording(s); }); },
      stopRecording: stopRecording,
      flush: function () { return persistNow(); },
      checkRecovery: checkRecovery,
    };
  }
})();
