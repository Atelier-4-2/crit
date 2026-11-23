/* Atelier Crit v03 - weekly critique notes.
   All data stays on this device unless the user signs in to their own Google Drive (atelier-cloud.js). */
(function () {
  "use strict";
  var L = window.CritLib;
  var PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";
  var PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
  var JSPDF_URL = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
  var JSPDF_SRI = "sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk";
  var GOOGLE_CLIENT_ID = "333501036096-o6m50cvb01b4t49kcedi4jq4a7kv42i3.apps.googleusercontent.com";
  var TRANSCRIBE_WORKER_URL = "https://atelier-crit-transcribe.ljae-archi.workers.dev";
  var TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/+esm";
  var MAX_GEMINI_AUDIO = 20 * 1024 * 1024;
  var MAX_PAGE_W = 2400, MAX_PAGE_H = 3600;
  var CHUNK_MS = 4000;
  var ZOOMS = [1, 1.5, 2, 3];
  var IS_LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

  /* ---------------- i18n ---------------- */
  var DICT = {
    ko: {
      brandAria: "Atelier 4·2 메인페이지", titlePh: "이번 주 제목", projPh: "프로젝트 이름",
      overview: "전체 흐름", cloudBtn: "Drive", openCrit: "열기", saveCrit: "저장", export: "내보내기",
      weeksAria: "주차 목록", weeksTitle: "주차", newWeek: "+ 새 주차", weekN: "{n}주차", delWeek: "주차 삭제",
      weekDateAria: "크리틱 날짜", confirmDelWeek: "이 주차({w})를 삭제할까요? 도면·녹음·전사·피드백이 함께 지워집니다.",
      carriedToast: "지난주 미완료 피드백 {n}건을 가져왔습니다.",
      dropTitle: "도면을 놓으세요", dropSub: "PDF(여러 쪽) · JPG · PNG",
      privacy: "파일과 녹음은 이 기기 밖으로 나가지 않습니다.",
      addPages: "쪽 추가", pinMode: "핀 추가", elapsed: "경과", remaining: "남은 발표",
      presentTime: "발표 시간", mins: "분", recStart: "녹음 시작", pause: "일시정지", resume: "다시 시작", recStop: "끝내기",
      recHint: "녹음 중에는 화면을 켜 두세요. 다른 앱이나 탭으로 가면 녹음이 끊길 수 있습니다. 도면을 탭하면 그 시각이 핀에 묶입니다.",
      rerecord: "다시 녹음", pinsTitle: "핀 메모", starOnly: "★만",
      pinEmpty: "아직 핀이 없습니다. 녹음 중 도면을 탭하세요.", seekAria: "재생 위치",
      storeOff: "저장이 꺼져 있습니다. 이 화면을 닫으면 기록이 사라지니 .crit 파일로 저장하세요.",
      close: "닫기", cancel: "취소", add: "추가",
      expPdf: "요약 PDF (이번 주)", expPng: "요약 PNG (이번 주)", expCrit: ".crit 파일 (이번 주)",
      expSemPdf: "학기 정리 PDF (전체 주차)", expMd: "Markdown 정리 (전사·피드백)", expProjCrit: "프로젝트 전체 .crit 묶음",
      untitled: "크리틱", defaultProj: "내 프로젝트", page: "쪽", pinWord: "핀", notePh: "메모", play: "재생", pauseAria: "일시정지",
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
      confirmDelPin: "이 핀을 삭제할까요?",
      saved: "저장했습니다.", exporting: "만드는 중…", libFail: "라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.",
      openFail: ".crit 파일을 열 수 없습니다.", noPinsForExport: "등록된 핀이 없습니다. 핀 없이 도면만 내보냅니다.",
      sumPage: "{i} / {n}쪽", sumNoPins: "이 쪽에는 핀이 없습니다.", sumCols: "번호 · 시각 · 메모",
      over: "초과", dateFmt: "ko-KR",
      langAria: "언어 선택", prevAria: "이전 쪽", nextAria: "다음 쪽",
      h1: "Crit — 주간 크리틱 노트",
      docDesc: "매주 도면·녹음·전사를 정리하고 지난주 피드백과 도면을 비교하는 주간 크리틱 노트입니다.",
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
      critTooMany: ".crit 파일을 열 수 없습니다. 포함된 항목이 너무 많습니다.",
      saveFailed: "브라우저에 저장하지 못했습니다. 저장 공간이 부족할 수 있으니 지금 .crit 파일로 내려받으세요.",
      saveFailedAct: "지금 .crit 저장",
      rerecTitle: "다시 녹음",
      rerecBody: "다시 녹음하면 현재 녹음은 지워집니다. 도면 위의 핀과 메모는 어떻게 처리할까요?",
      rerecKeep: "핀과 메모 유지 (시각 비움)", rerecWipe: "핀과 메모도 모두 지움", rerecSave: "먼저 .crit으로 저장",
      untimedTip: "녹음 시각 없음", setTimeHere: "지금 재생 위치로 시각 지정",
      delPage: "쪽 삭제",
      confirmDelPage: "현재 쪽을 삭제하시겠습니까? 이 쪽에 남긴 핀 {n}개도 함께 삭제됩니다.",
      zoomIn: "도면 확대", zoomOut: "도면 축소", pinNow: "지금 시각으로 핀 추가", undo: "실행 취소",
      warnLabel: "종료 1분 전", alertClose: "경고 닫기",
      chunkFail: "녹음 중 자동 저장에 실패했습니다. 화면을 닫으면 지금까지의 녹음이 사라질 수 있습니다.",
      /* v03 weekly notes */
      trTitle: "전사", fbTitle: "피드백",
      trUpload: "전사 올리기", selToFb: "선택 → 피드백", trClear: "지우기",
      trEmpty: "전사 텍스트를 붙여 넣거나 PDF·TXT·DOCX 파일을 올리면 녹음·핀과 연결됩니다.",
      trDlgHint: "ALT 전사 텍스트를 붙여 넣거나 PDF·TXT·MD·SRT·VTT·DOCX 파일을 선택하세요.",
      trPickFile: "파일 선택", trPastePh: "전사 텍스트를 여기에 붙여 넣으세요…",
      trNoTimes: "시각 없음으로 올리기", trApply: "붙여 넣고 정리",
      trPreviewSummary: "문단 {total}개 · 시각 인식 {timed}개",
      trPreviewTrunc: " (최대 5,000문단까지 표시)",
      trPdfScan: "글자를 읽을 수 없는 PDF입니다. 텍스트가 있는 PDF나 복사한 글자를 붙여 넣어 주세요.",
      trApplied: "전사 {n}문단을 올렸습니다.",
      trConfirmClear: "이 주차의 전사를 지울까요?",
      trAnchorHere: "지금 재생 위치로 맞추기", trAnchorClear: "기준점 해제",
      trAnchorHint: "시각 없는 전사입니다. 재생 중 문단 2개에 기준점을 찍으면 사이 시각을 추정합니다.",
      trToFb: "+ 피드백", trEstTip: "기준점 사이 추정 시각",
      pinQuotePrefix: "이때 한 말: ",
      fbAddPh: "피드백 항목을 직접 입력…", fbPrevHead: "지난주 피드백", fbOwnHead: "이번 주 피드백",
      fbEmpty: "아직 피드백이 없습니다.", fbNotePh: "반영 메모 (예: 2주차 평면에서 계단 옮김)",
      fbAdded: "피드백에 추가했습니다.", fbConfirmDel: "이 피드백을 삭제할까요?",
      stTodo: "할 일", stDone: "반영함", stHold: "보류",
      fromWeek: "{n}주차에서",
      comparePrev: "지난주 보기", cmpSide: "나란히", cmpOverlay: "겹치기", cmpSplit: "가르기",
      cmpNoPage: "지난주에는 이 쪽이 없습니다.", cmpPrevLbl: "지난주 ({w})", cmpCurLbl: "이번 주 ({w})",
      searchPh: "전사·피드백·핀 메모 검색…", searchHits: "검색 결과 {n}건",
      ovWeeks: "주차별 기록", ovFbTitle: "누적 피드백",
      filterAll: "전체", filterOpen: "남음", filterDone: "반영함",
      colWeek: "주차", colContent: "내용", colStatus: "상태", colNote: "메모",
      ovStats: "도면 {p}쪽 · 피드백 {fb}건 (반영 {done} / 남음 {open})",
      noThumb: "도면 없음",
      projImported: "프로젝트 {n}개 주차를 불러왔습니다.",
      mdProject: "프로젝트", mdFeedback: "피드백", mdNone: "없음", mdText: "내용", mdStatus: "상태", mdNote: "메모", mdSource: "출처", mdPins: "핀 메모", mdTranscript: "전사",
      cloudTitle: "Google Drive 동기화", cloudSignIn: "Google 로그인", cloudSignOut: "로그아웃",
      cloudProjLabel: "Drive 프로젝트", cloudSyncNow: "지금 동기화",
      cloudOff: "로그인하지 않은 상태입니다. 기록은 이 브라우저에만 저장됩니다.",
      cloudOn: "연결됨: {email}", cloudSyncing: "Drive와 동기화하는 중…",
      cloudSynced: "Drive 동기화를 마쳤습니다.", cloudErr: "Drive 동기화 오류: {e}",
      cloudCreateNew: "+ 새 Drive 프로젝트 만들기",
      semTitle: "학기 크리틱 정리",
      uploadAudio: "녹음 파일 올리기", audioLoaded: "녹음 파일을 불러왔습니다.",
      autoTrBtn: "녹음 전사하기", autoTrTitle: "녹음 자동 전사",
      autoTrNoAudio: "먼저 녹음을 하거나 녹음 파일(m4a·mp3·wav)을 올려 주세요.",
      engGeminiTitle: "Gemini 고정확도 전사 (소유자 계정)",
      engGeminiSub: "화자 구분 · 건축 용어 보정 · 피드백 자동 추출. 전사 시 오디오가 Google Gemini로 전송됩니다.",
      engLocalTitle: "기본 모델 — 기기 안 로컬 Whisper",
      engLocalSub: "무료 · 음성이 기기 밖으로 나가지 않음. 첫 1회 모델 내려받기(약 150 MB)가 필요합니다.",
      autoTrLangLbl: "음성 언어", langAuto: "자동 감지 (한국어·프랑스어)", langKo: "한국어", langFr: "프랑스어",
      autoTrExtractFb: "핵심 피드백 항목도 함께 추출", autoTrStart: "전사 시작",
      autoTrUploading: "Gemini로 녹음을 보내 전사하는 중…",
      autoTrTooBig: "파일이 20 MB보다 큽니다. 기기 안 로컬 Whisper를 쓰거나 더 작은 파일로 올려 주세요.",
      autoTrLoadingModel: "로컬 Whisper 모델 준비 중… ({p}%)",
      autoTrDecoding: "오디오를 분석하는 중…",
      autoTrRunningLocal: "기기 안에서 전사하는 중… (길이에 따라 시간이 걸릴 수 있습니다)",
      autoTrDone: "전사 완료: {n}문단",
      autoTrDoneFb: "전사 완료: {n}문단 · 피드백 {fb}건 추가",
      autoTrFail: "자동 전사에 실패했습니다: {e}",
    },
    fr: {
      brandAria: "Atelier 4·2 accueil", titlePh: "Titre de la semaine", projPh: "Nom du projet",
      overview: "Vue d'ensemble", cloudBtn: "Drive", openCrit: "Ouvrir", saveCrit: "Enregistrer", export: "Exporter",
      weeksAria: "Semaines", weeksTitle: "Semaines", newWeek: "+ Semaine", weekN: "Sem. {n}", delWeek: "Supprimer",
      weekDateAria: "Date de la critique", confirmDelWeek: "Supprimer cette semaine ({w}) ? Plans, audio, transcription et retours seront effacés.",
      carriedToast: "{n} retour(s) ouvert(s) repris de la semaine précédente.",
      dropTitle: "Déposez vos plans", dropSub: "PDF (plusieurs pages) · JPG · PNG",
      privacy: "Vos fichiers et l'enregistrement ne quittent jamais cet appareil.",
      addPages: "Ajouter", pinMode: "Ajouter épingle", elapsed: "Écoulé", remaining: "Reste (présentation)",
      presentTime: "Durée", mins: "min", recStart: "Démarrer l'enregistrement", pause: "Pause", resume: "Reprendre", recStop: "Terminer",
      recHint: "Gardez l'écran allumé pendant l'enregistrement. Touchez le plan : l'instant est lié à l'épingle.",
      rerecord: "Réenregistrer", pinsTitle: "Épingles", starOnly: "★ seul.",
      pinEmpty: "Pas encore d'épingle. Touchez le plan pendant l'enregistrement.", seekAria: "Position de lecture",
      storeOff: "Le stockage est désactivé. Enregistrez un fichier .crit avant de fermer.",
      close: "Fermer", cancel: "Annuler", add: "Ajouter",
      expPdf: "Synthèse PDF (semaine)", expPng: "Synthèse PNG (semaine)", expCrit: "Fichier .crit (semaine)",
      expSemPdf: "PDF du semestre (toutes semaines)", expMd: "Export Markdown (texte + retours)", expProjCrit: "Archive projet .crit",
      untitled: "Critique", defaultProj: "Mon projet", page: "p.", pinWord: "Épingle", notePh: "Note", play: "Lecture", pauseAria: "Pause",
      star: "Important", del: "Supprimer", at: "Instant",
      wakeNote: "Écran maintenu allumé.", noWake: "Ce navigateur ne peut pas garder l'écran allumé.",
      micAsk: "Demande d'accès au micro. L'enregistrement reste sur cet appareil.",
      micDenied: "Micro indisponible. Autorisez-le dans les réglages du navigateur.",
      noMic: "Ce navigateur ne permet pas l'enregistrement.",
      recording: "Enregistrement", paused: "En pause",
      interrupted: "L'écran s'est éteint ou vous avez changé d'onglet. Vérifiez l'enregistrement.",
      needPagesToPin: "Ajoutez d'abord un plan.", startToPin: "Démarrez l'enregistrement pour poser des épingles.",
      pinAdded: "Épingle {n} · {t}", pinModeOn: "Touchez le plan pour poser une épingle à la position de lecture.",
      loadingPdf: "Chargement du PDF…", loadFail: "Échec du chargement : {e}",
      confirmDelPin: "Supprimer cette épingle ?",
      saved: "Enregistré.", exporting: "Création…", libFail: "Impossible de charger la bibliothèque.",
      openFail: "Impossible d'ouvrir ce fichier .crit.", noPinsForExport: "Aucune épingle : seuls les plans seront exportés.",
      sumPage: "Page {i} / {n}", sumNoPins: "Aucune épingle sur cette page.", sumCols: "n° · instant · note",
      over: "dépassé", dateFmt: "fr-FR",
      langAria: "Langue", prevAria: "Page précédente", nextAria: "Page suivante",
      h1: "Crit — carnet de critiques hebdomadaires",
      docDesc: "Carnet hebdomadaire : plans, enregistrement, transcription et suivi des retours.",
      lockedNote: "Indisponible pendant l'enregistrement.",
      micNotFound: "Aucun micro trouvé.",
      recFail: "Impossible de démarrer l'enregistrement ({e}).",
      trackMuted: "Entrée micro coupée.", trackUnmuted: "Entrée micro rétablie.",
      trackEnded: "Connexion au micro perdue. Terminez et enregistrez.",
      recError: "Erreur d'enregistrement. Sauvegarde en cours.",
      recEmpty: "Aucun son enregistré. Les épingles sont conservées.",
      silentInput: "Aucun son détecté sur le micro.",
      durMismatch: "Durée réelle ({real}) ≠ horloge ({clock}). La durée du fichier est retenue.",
      recoverTitle: "Récupérer l'enregistrement",
      recoverBody: "Enregistrement interrompu trouvé ({t}, {n} épingle(s)). Récupérer ?",
      recoverYes: "Récupérer", recoverLater: "Plus tard", recoverDiscard: "Abandonner",
      recovered: "Enregistrement récupéré.", recoverEmpty: "Aucun fragment récupérable.",
      confirmDiscardRecover: "Supprimer définitivement les fragments ?",
      critTooBig: "Fichier .crit trop volumineux (max. 1,5 Go).",
      critTooMany: "Trop d'éléments dans le fichier .crit.",
      saveFailed: "Échec d'enregistrement local. Téléchargez un fichier .crit maintenant.",
      saveFailedAct: "Enregistrer en .crit",
      rerecTitle: "Réenregistrer",
      rerecBody: "L'enregistrement actuel sera effacé. Que faire des épingles et notes ?",
      rerecKeep: "Garder épingles et notes (sans instant)", rerecWipe: "Tout effacer", rerecSave: "D'abord enregistrer en .crit",
      untimedTip: "Sans instant", setTimeHere: "Fixer à la position de lecture",
      delPage: "Supprimer page",
      confirmDelPage: "Supprimer cette page et ses {n} épingle(s) ?",
      zoomIn: "Agrandir", zoomOut: "Réduire", pinNow: "Épingle maintenant", undo: "Annuler",
      warnLabel: "Dernière minute", alertClose: "Fermer",
      chunkFail: "Échec de la sauvegarde auto pendant l'enregistrement.",
      trTitle: "Texte", fbTitle: "Retours",
      trUpload: "Importer texte", selToFb: "Sélection → Retour", trClear: "Effacer",
      trEmpty: "Collez la transcription ou importez un fichier PDF, TXT ou DOCX.",
      trDlgHint: "Collez le texte (ALT) ou choisissez un fichier PDF, TXT, MD, SRT, VTT ou DOCX.",
      trPickFile: "Choisir un fichier", trPastePh: "Collez la transcription ici…",
      trNoTimes: "Importer sans horodatage", trApply: "Importer et organiser",
      trPreviewSummary: "{total} paragraphes · {timed} horodatés",
      trPreviewTrunc: " (limité à 5 000)",
      trPdfScan: "Ce PDF ne contient pas de texte lisible (scan).",
      trApplied: "{n} paragraphes importés.",
      trConfirmClear: "Effacer la transcription de cette semaine ?",
      trAnchorHere: "Caler ici", trAnchorClear: "Retirer repère",
      trAnchorHint: "Sans horodatage : posez 2 repères pendant la lecture pour estimer les instants.",
      trToFb: "+ Retour", trEstTip: "Instant estimé entre repères",
      pinQuotePrefix: "Dit à ce moment : ",
      fbAddPh: "Ajouter un point de retour…", fbPrevHead: "De la semaine précédente", fbOwnHead: "Retours de cette semaine",
      fbEmpty: "Aucun retour pour l'instant.", fbNotePh: "Note de suivi (ex. escalier déplacé sem. 2)",
      fbAdded: "Ajouté aux retours.", fbConfirmDel: "Supprimer ce retour ?",
      stTodo: "À faire", stDone: "Fait", stHold: "En attente",
      fromWeek: "De sem. {n}",
      comparePrev: "Voir sem. préc.", cmpSide: "Côte à côte", cmpOverlay: "Superposer", cmpSplit: "Glisser",
      cmpNoPage: "Pas de page correspondante la semaine précédente.", cmpPrevLbl: "Sem. préc. ({w})", cmpCurLbl: "Cette sem. ({w})",
      searchPh: "Rechercher dans textes, retours, épingles…", searchHits: "{n} résultat(s)",
      ovWeeks: "Semaines", ovFbTitle: "Tous les retours",
      filterAll: "Tous", filterOpen: "Ouverts", filterDone: "Faits",
      colWeek: "Sem.", colContent: "Contenu", colStatus: "Statut", colNote: "Note",
      ovStats: "{p} p. · {fb} retours ({done} faits / {open} ouverts)",
      noThumb: "Aucun plan",
      projImported: "{n} semaine(s) importée(s).",
      mdProject: "Projet", mdFeedback: "Retours", mdNone: "Aucun", mdText: "Contenu", mdStatus: "Statut", mdNote: "Note", mdSource: "Source", mdPins: "Épingles", mdTranscript: "Transcription",
      cloudTitle: "Synchronisation Google Drive", cloudSignIn: "Connexion Google", cloudSignOut: "Déconnexion",
      cloudProjLabel: "Projet Drive", cloudSyncNow: "Synchroniser",
      cloudOff: "Non connecté. Les données restent dans ce navigateur.",
      cloudOn: "Connecté : {email}", cloudSyncing: "Synchronisation Drive…",
      cloudSynced: "Synchronisé avec Drive.", cloudErr: "Erreur Drive : {e}",
      cloudCreateNew: "+ Nouveau projet Drive",
      semTitle: "Synthèse du semestre",
      uploadAudio: "Importer audio", audioLoaded: "Fichier audio chargé.",
      autoTrBtn: "Transcrire l'audio", autoTrTitle: "Transcription automatique",
      autoTrNoAudio: "Enregistrez ou importez d'abord un fichier audio (m4a, mp3, wav).",
      engGeminiTitle: "Gemini haute précision (compte propriétaire)",
      engGeminiSub: "Interlocuteurs · termes d'architecture · retours extraits. L'audio est envoyé à Google Gemini.",
      engLocalTitle: "Modèle de base — Whisper local (sur cet appareil)",
      engLocalSub: "Gratuit · l'audio ne quitte pas l'appareil. Premier téléchargement du modèle (~150 Mo).",
      autoTrLangLbl: "Langue parlée", langAuto: "Auto (coréen / français)", langKo: "Coréen", langFr: "Français",
      autoTrExtractFb: "Extraire aussi les points de retour", autoTrStart: "Lancer la transcription",
      autoTrUploading: "Envoi vers Gemini et transcription…",
      autoTrTooBig: "Fichier supérieur à 20 Mo. Utilisez le modèle local Whisper ou un fichier plus léger.",
      autoTrLoadingModel: "Chargement du modèle Whisper… ({p}%)",
      autoTrDecoding: "Préparation de l'audio…",
      autoTrRunningLocal: "Transcription locale en cours…",
      autoTrDone: "Terminé : {n} paragraphes",
      autoTrDoneFb: "Terminé : {n} paragraphes · {fb} retour(s) ajouté(s)",
      autoTrFail: "Échec de la transcription : {e}",
    },
  };
  var lang = "ko";
  try { var sl = localStorage.getItem("crit-lang"); if (sl === "fr" || sl === "ko") lang = sl; } catch (e) { /* ignore */ }
  function t(key, vars) {
    var s = (DICT[lang] && DICT[lang][key]) || DICT.ko[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.replace("{" + k + "}", vars[k]); });
    return s;
  }
  function statusLabel(st) { return st === "done" ? t("stDone") : st === "hold" ? t("stHold") : t("stTodo"); }
  function weekLabel(w) { return t("weekN", { n: w.n || 1 }) + (w.date ? " · " + L.dateShort(w.date) : ""); }

  /* ---------------- state ---------------- */
  var $ = function (id) { return document.getElementById(id); };
  var projectName = "";
  try { projectName = localStorage.getItem("crit-project-name") || ""; } catch (e) { /* ignore */ }
  var weeksMeta = []; // sorted array of meta rows
  var session = newWeekObj(1);
  var curPage = 0, selId = null, starOnly = false, pinMode = false, zoomIdx = 0;
  var sideTab = "pins"; // pins | transcript | feedback
  var viewMode = "week"; // week | overview
  var ovFilter = "all"; // all | open | done
  var cmpOn = false, cmpMode = "side", cmpVal = 50, prevWeekData = null, prevWeekUrls = [];
  var mode = "setup"; // setup | recording | paused | review
  var starting = false;
  var clock = L.clockNew();
  var recorder = null, stream = null, chunks = [], recMime = "";
  var curRid = null, chunkSeq = 0, chunkChain = Promise.resolve(), chunkWarned = false, lockRelease = null, finishing = false;
  var tickTimer = null, wakeLock = null, hiddenDuringRec = false;
  var audioCtx = null, analyser = null, meterBuf = null, silentSince = 0, silentWarned = false, warnShown = false;
  var audioEl = null, audioUrl = null, fixing = false, pendingSeek = null;
  var db = null, storeOk = false, saveTimer = null, followHoldUntil = -1;
  var blobDirty = false, saveFailed = false, everSaved = {}, refocusing = false;
  var trDraft = null, trFileSource = "paste", trFileNameStr = "";
  var activeParaId = null;
  var cloudMod = null, cloud = null, cloudProjId = null, cloudUser = null, cloudSyncing = false;
  var isOwner = false, whisperPipe = null, transcribing = false;
  try { cloudProjId = localStorage.getItem("crit-cloud-proj") || null; } catch (e) { /* ignore */ }

  function newWeekObj(n) {
    return {
      id: "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      n: n || 1,
      date: L.todayStr(),
      title: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncedAt: null,
      presentMin: 10,
      pages: [],
      pins: [],
      audio: null,
      transcript: null,
      feedback: [],
    };
  }
  function defaultTitle() { return t("weekN", { n: session.n || 1 }); }
  function recActive() { return mode === "recording" || mode === "paused" || starting; }
  function pinTime(p) { return p.untimed ? "—" : L.formatTime(p.t); }
  function pinLinks() {
    if (!session.transcript || !session.transcript.paras || !session.transcript.paras.length) return {};
    return L.linkPinsToParas(session.pins, session.transcript.paras);
  }

  /* ---------------- helpers ---------------- */
  function toast(msg, ms, act) {
    var el_ = $("toast"), b = $("toastAct");
    $("toastText").textContent = msg; el_.hidden = false;
    if (act) { b.hidden = false; b.textContent = act.label; b.onclick = function () { el_.hidden = true; act.fn(); }; } else { b.hidden = true; b.onclick = null; }
    clearTimeout(toast._t); toast._t = setTimeout(function () { el_.hidden = true; }, ms || 2400);
  }
  function banner(msg, warn) {
    var el_ = $("banner");
    if (!msg) { el_.hidden = true; return; }
    el_.textContent = msg; el_.className = "banner" + (warn ? " warn" : ""); el_.hidden = false;
  }
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

  function applyLang() {
    document.documentElement.lang = lang;
    document.title = "Crit · Atelier 4·2";
    var md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute("content", t("docDesc"));
    document.querySelectorAll("[data-i18n]").forEach(function (n) { n.textContent = t(n.getAttribute("data-i18n")); });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (n) { n.placeholder = t(n.getAttribute("data-i18n-ph")); });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (n) { n.setAttribute("aria-label", t(n.getAttribute("data-i18n-aria"))); });
    document.querySelectorAll(".lang button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === lang)); });
    $("btnPlay").setAttribute("aria-label", audioEl && !audioEl.paused ? t("pauseAria") : t("play"));
    renderAll();
  }

  /* ---------------- IndexedDB v3 ---------------- */
  var MAXSEQ = Number.MAX_SAFE_INTEGER;
  function metaOf(s) {
    return {
      id: s.id, n: s.n || 1, date: s.date || L.todayStr(new Date(s.createdAt || Date.now())),
      title: s.title || "", createdAt: s.createdAt, updatedAt: s.updatedAt || Date.now(),
      syncedAt: s.syncedAt == null ? null : s.syncedAt,
      presentMin: s.presentMin, pins: s.pins || [],
      transcript: s.transcript || null, feedback: s.feedback || [],
      pageCount: (s.pages || []).length, hasAudio: !!(s.audio && s.audio.blob),
    };
  }
  function openDb(cb) {
    return new Promise(function (resolve0) {
      var resolve = function (d) { cb(d); resolve0(d); };
      try {
        if (!window.indexedDB) return resolve(null);
        var req = indexedDB.open("atelier-crit", 3);
        req.onupgradeneeded = function (ev) {
          var d = req.result, tx = req.transaction;
          if (!d.objectStoreNames.contains("sessions")) d.createObjectStore("sessions", { keyPath: "id" });
          if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta", { keyPath: "id" });
          if (!d.objectStoreNames.contains("recMeta")) d.createObjectStore("recMeta", { keyPath: "rid" });
          if (!d.objectStoreNames.contains("recChunks")) d.createObjectStore("recChunks", { keyPath: ["rid", "seq"] });
          if (!d.objectStoreNames.contains("tombs")) d.createObjectStore("tombs", { keyPath: "id" });
          if (ev.oldVersion >= 1 && ev.oldVersion < 2) {
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
  function syncMetaInList(m) {
    var idx = weeksMeta.findIndex(function (w) { return w.id === m.id; });
    if (idx >= 0) weeksMeta[idx] = m; else weeksMeta.push(m);
    weeksMeta = L.sortWeeks(weeksMeta);
  }
  function hasContent() {
    return session.pages.length || session.pins.length || session.audio ||
      (session.transcript && session.transcript.paras && session.transcript.paras.length) ||
      (session.feedback && session.feedback.length) || session.title;
  }
  function persistNow() {
    clearTimeout(saveTimer); saveTimer = null;
    session.updatedAt = Date.now();
    var m = metaOf(session);
    syncMetaInList(m);
    if (!storeOk) { renderWeekRail(); return Promise.resolve(false); }
    var snap = Object.assign({}, session);
    var full = blobDirty || !everSaved[session.id];
    blobDirty = false;
    var p;
    if (full) {
      snap.pages = session.pages.map(function (pg) { return { blob: pg.blob, w: pg.w, h: pg.h, name: pg.name }; });
      p = idb(["sessions", "meta"], "readwrite", function (tx) { tx.objectStore("meta").put(m); return tx.objectStore("sessions").put(snap); });
    } else {
      p = idb(["meta"], "readwrite", function (tx) { return tx.objectStore("meta").put(m); });
    }
    return p.then(function () {
      everSaved[session.id] = true;
      try { localStorage.setItem("crit-last-week", session.id); } catch (e) { /* ignore */ }
      if (saveFailed) { saveFailed = false; $("alertBox").hidden = true; }
      renderWeekRail();
      return true;
    }, function () {
      if (full) blobDirty = true;
      saveFailed = true;
      alertMsg(t("saveFailed"), { label: t("saveFailedAct"), fn: function () { exportCrit(); } });
      return false;
    });
  }
  function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(persistNow, 450); }
  function flushPersist() { if (saveTimer) persistNow(); }

  /* ---------------- pages & PDF ---------------- */
  function canvasToBlob(canvas, type, q) {
    return new Promise(function (r, rej) { canvas.toBlob(function (b) { b ? r(b) : rej(new Error("toBlob")); }, type, q); });
  }
  function imageToPage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var sz = L.fitSize(img.naturalWidth, img.naturalHeight, MAX_PAGE_W, MAX_PAGE_H);
        var c = document.createElement("canvas"); c.width = sz.w; c.height = sz.h;
        var ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, sz.w, sz.h); ctx.drawImage(img, 0, 0, sz.w, sz.h);
        URL.revokeObjectURL(url);
        var png = /png/i.test(file.type);
        canvasToBlob(c, png ? "image/png" : "image/jpeg", png ? undefined : 0.9).then(function (b) {
          c.width = c.height = 0; resolve({ blob: b, w: sz.w, h: sz.h, name: file.name || "" });
        }, reject);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("image")); };
      img.src = url;
    });
  }
  var pdfMod = null;
  function loadPdfJs() {
    if (pdfMod) return Promise.resolve(pdfMod);
    return import(PDFJS_URL).then(function (m) {
      m.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; pdfMod = m; return m;
    });
  }
  function pdfToPages(file) {
    banner(t("loadingPdf"));
    return loadPdfJs().then(function (pdfjs) { return file.arrayBuffer().then(function (buf) { return pdfjs.getDocument({ data: new Uint8Array(buf) }).promise; }); }).then(function (doc) {
      var out = [], chain = Promise.resolve();
      for (var i = 1; i <= doc.numPages; i++) (function (pi) {
        chain = chain.then(function () { return doc.getPage(pi); }).then(function (pg) {
          var vp0 = pg.getViewport({ scale: 1 });
          var scale = Math.min(2, MAX_PAGE_W / vp0.width, MAX_PAGE_H / vp0.height);
          var vp = pg.getViewport({ scale: scale });
          var c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
          var ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
          return pg.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
            return canvasToBlob(c, "image/jpeg", 0.9).then(function (b) {
              var w = c.width, h = c.height; c.width = c.height = 0;
              out.push({ blob: b, w: w, h: h, name: (file.name || "pdf") + "#" + pi });
            });
          });
        });
      })(i);
      return chain.then(function () { doc.destroy(); banner(""); return out; });
    });
  }
  function addFiles(files) {
    if (recActive()) return Promise.resolve();
    var arr = Array.prototype.slice.call(files || []), added = 0, chain = Promise.resolve();
    arr.forEach(function (f) {
      chain = chain.then(function () {
        if (/\.pdf$/i.test(f.name) || f.type === "application/pdf") return pdfToPages(f).then(function (ps) { session.pages = session.pages.concat(ps); added += ps.length; });
        if (/^image\//.test(f.type) || /\.(png|jpe?g)$/i.test(f.name)) return imageToPage(f).then(function (p) { session.pages.push(p); added++; });
      });
    });
    return chain.then(function () {
      if (added) { blobDirty = true; persist(); renderAll(); }
    }).catch(function (e) { banner(t("loadFail", { e: e.message || e }), true); });
  }
  function pageUrl(i) {
    var p = session.pages[i]; if (!p) return "";
    if (!p._url) p._url = URL.createObjectURL(p.blob);
    return p._url;
  }
  function revokePages() { session.pages.forEach(function (p) { if (p._url) { URL.revokeObjectURL(p._url); p._url = null; } }); }
  function revokePrevUrls() { prevWeekUrls.forEach(function (u) { URL.revokeObjectURL(u); }); prevWeekUrls = []; }

  /* ---------------- weeks management ---------------- */
  function loadStored(id) {
    if (!storeOk) return Promise.resolve(null);
    return idb(["sessions", "meta"], "readonly", function (tx) {
      var a = tx.objectStore("sessions").get(id), b = tx.objectStore("meta").get(id);
      return function () { return { rec: a.result, meta: b.result }; };
    }).then(function (r) {
      if (!r.rec) return null;
      var s = r.rec;
      if (r.meta) {
        s.n = r.meta.n || s.n || 1;
        s.date = r.meta.date || s.date || L.todayStr(new Date(s.createdAt || Date.now()));
        s.title = r.meta.title != null ? r.meta.title : s.title;
        s.pins = r.meta.pins || s.pins || [];
        s.presentMin = r.meta.presentMin != null ? r.meta.presentMin : s.presentMin;
        s.transcript = r.meta.transcript != null ? r.meta.transcript : (s.transcript || null);
        s.feedback = r.meta.feedback || s.feedback || [];
        s.updatedAt = r.meta.updatedAt || s.updatedAt || Date.now();
        s.syncedAt = r.meta.syncedAt != null ? r.meta.syncedAt : null;
      }
      if (!s.pages) s.pages = [];
      if (!s.pins) s.pins = [];
      if (!s.feedback) s.feedback = [];
      return s;
    });
  }
  function openWeek(id) {
    if (recActive()) return Promise.resolve(false);
    return persistNow().then(function () { return loadStored(id); }).then(function (rec) {
      if (!rec) return false;
      viewMode = "week";
      return adoptSession(rec, true);
    });
  }
  function createNewWeek() {
    if (recActive()) return;
    persistNow().then(function () {
      var sorted = L.sortWeeks(weeksMeta);
      var last = sorted.length ? sorted[sorted.length - 1] : null;
      var nw = newWeekObj(L.nextWeekNo(weeksMeta));
      var carried = 0;
      if (last && last.feedback && last.feedback.length) {
        var r = L.carryOver(last.feedback, last, []);
        nw.feedback = r.items; carried = r.added;
      }
      viewMode = "week";
      adoptSession(nw, false);
      blobDirty = true;
      persistNow().then(function () {
        if (carried > 0) { sideTab = "feedback"; renderSideTabs(); toast(t("carriedToast", { n: carried }), 3200); }
      });
    });
  }
  function deleteCurrentWeek() {
    if (recActive()) return;
    if (!confirm(t("confirmDelWeek", { w: weekLabel(session) }))) return;
    var delId = session.id;
    weeksMeta = weeksMeta.filter(function (w) { return w.id !== delId; });
    delete everSaved[delId];
    var p = storeOk ? idb(["sessions", "meta", "tombs"], "readwrite", function (tx) {
      tx.objectStore("sessions").delete(delId);
      tx.objectStore("meta").delete(delId);
      tx.objectStore("tombs").put({ id: delId, at: Date.now() });
    }).catch(function () {}) : Promise.resolve();
    p.then(function () {
      if (weeksMeta.length) {
        var next = weeksMeta[weeksMeta.length - 1];
        loadStored(next.id).then(function (rec) { adoptSession(rec || newWeekObj(1), !!rec); });
      } else {
        adoptSession(newWeekObj(1), false);
        blobDirty = true; persistNow();
      }
    });
  }

  /* ---------------- compare with previous week ---------------- */
  function loadPrevWeekData() {
    var prevMeta = L.previousWeek(weeksMeta, session.id);
    if (!prevMeta) { prevWeekData = null; revokePrevUrls(); return Promise.resolve(null); }
    if (prevWeekData && prevWeekData.id === prevMeta.id) return Promise.resolve(prevWeekData);
    revokePrevUrls();
    return loadStored(prevMeta.id).then(function (rec) {
      prevWeekData = rec;
      if (rec && rec.pages) prevWeekUrls = rec.pages.map(function (pg) { return URL.createObjectURL(pg.blob); });
      return rec;
    });
  }
  function toggleCompare() {
    cmpOn = !cmpOn;
    if (cmpOn) {
      loadPrevWeekData().then(function () { renderViewer(); });
    } else renderViewer();
  }
  function renderCompare() {
    var prevMeta = L.previousWeek(weeksMeta, session.id);
    var canCmp = !!(prevMeta && prevMeta.pageCount > 0 && session.pages.length > 0);
    $("btnCompare").hidden = !canCmp;
    $("btnCompare").setAttribute("aria-pressed", String(cmpOn && canCmp));
    if (!canCmp) cmpOn = false;
    $("cmpBar").hidden = !cmpOn;

    var sideWrap = $("cmpSideWrap"), pageBox = $("pageBox"), wrap = $("canvasWrap");
    var ovImg = $("cmpOverlayImg"), splitLine = $("cmpSplitLine");
    if (!cmpOn) {
      sideWrap.hidden = true; ovImg.hidden = true; splitLine.hidden = true;
      if (pageBox.parentNode !== wrap) wrap.appendChild(pageBox);
      return;
    }
    var prevUrl = prevWeekUrls[curPage] || "";
    $("cmpPrevInfo").textContent = t("cmpPrevLbl", { w: weekLabel(prevMeta) });
    document.querySelectorAll("#cmpModes button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.cmode === cmpMode)); });
    $("cmpSliderWrap").hidden = cmpMode === "side";
    $("cmpSliderLbl").textContent = cmpVal + "%";
    $("cmpRange").value = cmpVal;

    if (cmpMode === "side") {
      sideWrap.hidden = false; ovImg.hidden = true; splitLine.hidden = true;
      $("cmpPrevCap").textContent = t("cmpPrevLbl", { w: weekLabel(prevMeta) });
      $("cmpCurCap").textContent = t("cmpCurLbl", { w: weekLabel(session) });
      $("cmpPrevImg").hidden = !prevUrl; $("cmpNoPrevPage").hidden = !!prevUrl;
      if (prevUrl) $("cmpPrevImg").src = prevUrl;
      if (pageBox.parentNode !== $("sideSlot")) $("sideSlot").appendChild(pageBox);
    } else {
      sideWrap.hidden = true;
      if (pageBox.parentNode !== wrap) wrap.appendChild(pageBox);
      if (prevUrl) {
        ovImg.src = prevUrl; ovImg.hidden = false;
        if (cmpMode === "overlay") {
          ovImg.style.opacity = (cmpVal / 100).toFixed(2);
          ovImg.style.clipPath = "";
          splitLine.hidden = true;
        } else {
          ovImg.style.opacity = "1";
          ovImg.style.clipPath = "inset(0 " + (100 - cmpVal) + "% 0 0)";
          splitLine.hidden = false;
          splitLine.style.left = cmpVal + "%";
        }
      } else {
        ovImg.hidden = true; splitLine.hidden = true;
      }
    }
  }

  /* ---------------- render ---------------- */
  function renderAll() {
    $("projName").value = projectName;
    $("btnOverview").setAttribute("aria-pressed", String(viewMode === "overview"));
    $("overviewView").hidden = viewMode !== "overview";
    $("weekMain").hidden = viewMode !== "week";
    renderWeekRail();
    renderCloudBtn();
    if (viewMode === "overview") { renderOverview(); return; }
    $("weekBadge").textContent = t("weekN", { n: session.n || 1 });
    $("weekDate").value = session.date || L.todayStr();
    $("title").value = session.title || "";
    renderViewer();
    renderSideTabs();
    renderPins();
    renderTranscript();
    renderFeedback();
    renderDock();
  }
  function renderWeekRail() {
    var ul = $("weekList"); ul.textContent = "";
    L.sortWeeks(weeksMeta).forEach(function (w) {
      var li = el("li", "week-item");
      var b = el("button", "week-btn"); b.type = "button";
      if (viewMode === "week" && w.id === session.id) b.setAttribute("aria-current", "true");
      var top = el("div", "wk-top");
      top.appendChild(el("span", "", weekLabel(w)));
      var st = L.feedbackStats(w.feedback);
      var open = st.open + st.carriedOpen;
      if (open > 0) top.appendChild(el("span", "", String(open)));
      b.appendChild(top);
      b.appendChild(el("div", "wk-sub", w.title || (w.pageCount + t("page"))));
      b.addEventListener("click", function () { if (w.id !== session.id || viewMode !== "week") openWeek(w.id); });
      li.appendChild(b); ul.appendChild(li);
    });
  }
  function renderSideTabs() {
    var map = { pins: "panePins", transcript: "paneTranscript", feedback: "paneFeedback" };
    Object.keys(map).forEach(function (k) {
      $(map[k]).hidden = sideTab !== k;
      var tabBtn = document.querySelector('.side-tabs button[data-tab="' + k + '"]');
      if (tabBtn) tabBtn.setAttribute("aria-selected", String(sideTab === k));
    });
    $("cntPins").textContent = session.pins.length ? String(session.pins.length) : "";
    var pc = session.transcript && session.transcript.paras ? session.transcript.paras.length : 0;
    $("cntTr").textContent = pc ? String(pc) : "";
    var fc = session.feedback ? session.feedback.length : 0;
    $("cntFb").textContent = fc ? String(fc) : "";
  }
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
      b.addEventListener("click", function () { curPage = i; renderViewer(); });
      th.appendChild(b);
    });
    renderCompare();
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
    var ae = document.activeElement, keep = null;
    if (ae && ae.tagName === "TEXTAREA" && list.contains(ae)) { keep = { id: ae.closest(".pin-row").dataset.id, s: ae.selectionStart, e: ae.selectionEnd }; }
    list.textContent = "";
    var pins = session.pins.filter(function (p) { return !starOnly || p.star; });
    $("pinEmpty").hidden = pins.length > 0;
    var links = pinLinks();
    var paraById = {};
    if (session.transcript && session.transcript.paras) session.transcript.paras.forEach(function (pr) { paraById[pr.id] = pr; });

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
      var lk = links[p.id];
      if (lk && paraById[lk.primary]) {
        var pr = paraById[lk.primary];
        var sn = pr.text.length > 72 ? pr.text.slice(0, 72) + "…" : pr.text;
        var qb = el("button", "pin-quote", t("pinQuotePrefix") + (pr.speaker ? pr.speaker + ": " : "") + sn);
        qb.type = "button";
        qb.addEventListener("click", function () { jumpToPara(pr.id); });
        mid.appendChild(qb);
      }
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
    ["btnOverview", "btnCloud", "btnOpen", "btnSaveCrit", "btnExport", "btnNewWeek", "btnDelWeek", "btnAddPages", "btnDelPage"].forEach(function (id) {
      var b = $(id); if (!b) return;
      b.disabled = lock;
      if (lock) { b.setAttribute("data-locked", "1"); b.title = t("lockedNote"); } else { b.removeAttribute("data-locked"); b.removeAttribute("title"); }
    });
    $("btnRec").disabled = starting;
    if (lock) { ["dlgExport", "dlgTranscript", "dlgCloud"].forEach(function (id) { var d = $(id); if (d && d.open) d.close(); }); }
  }
  function renderDock() {
    var rec = mode === "setup" || mode === "recording" || mode === "paused";
    $("recPanel").hidden = !rec; $("playPanel").hidden = rec;
    document.body.classList.toggle("recording", mode === "recording");
    $("btnRec").hidden = mode !== "setup";
    $("btnUploadAudio").hidden = mode !== "setup";
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
    $("talkBox").hidden = mode === "setup" && !(+$("presentMin").value > 0);
    if (mode === "review") {
      $("durTime").textContent = L.formatTime(session.audio ? session.audio.duration : 0);
      renderTicks(); updateBar();
    } else tickClock();
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

  /* ---------------- transcript UI ---------------- */
  function jumpToPara(paraId) {
    sideTab = "transcript"; renderSideTabs();
    var node = document.querySelector('.tr-para[data-pid="' + paraId + '"]');
    if (node && node.scrollIntoView) node.scrollIntoView({ block: "center" });
  }
  function renderTranscript() {
    var tr = session.transcript, paras = (tr && tr.paras) || [];
    var ul = $("trList"); ul.textContent = "";
    $("trEmpty").hidden = paras.length > 0;
    $("btnClearTr").hidden = !paras.length;
    var metaEl = $("trMeta");
    if (!paras.length) { metaEl.hidden = true; return; }
    var fixed = L.fixedCount(paras);
    if (fixed < 2 && mode === "review") { metaEl.textContent = t("trAnchorHint"); metaEl.hidden = false; }
    else { metaEl.textContent = t("trPreviewSummary", { total: paras.length, timed: paras.filter(function (p) { return p.t != null; }).length }) + (tr.name ? " · " + tr.name : ""); metaEl.hidden = false; }

    var links = pinLinks();
    var pinById = {}; session.pins.forEach(function (p) { pinById[p.id] = p; });

    paras.forEach(function (p) {
      var li = el("li", "tr-para" + (p.id === activeParaId ? " active" : "")); li.dataset.pid = p.id;
      var hd = el("div", "tr-para-head");
      if (p.t != null) {
        var tb = el("button", "tr-time" + (p.est ? " est" : ""), L.formatTime(p.t) + (p.est ? "~" : p.anchor ? " ●" : ""));
        tb.type = "button";
        if (p.est) tb.title = t("trEstTip");
        tb.addEventListener("click", function () { if (mode === "review" && audioEl) seekPlay(p.t); });
        hd.appendChild(tb);
      }
      if (p.speaker) hd.appendChild(el("span", "tr-spk", p.speaker));
      var pid = L.pinForPara(links, p.id);
      if (pid != null && pinById[pid]) {
        var pt = el("button", "tr-pin-tag", t("pinWord") + " " + pinById[pid].n); pt.type = "button";
        pt.addEventListener("click", function () { sideTab = "pins"; renderSideTabs(); selectPin(pid, false); });
        hd.appendChild(pt);
      }
      if (mode === "review" && audioEl) {
        if (p.anchor) {
          var ca = el("button", "tr-act", t("trAnchorClear")); ca.type = "button";
          ca.addEventListener("click", function () { session.transcript.paras = L.clearAnchor(session.transcript.paras, p.id); persist(); renderTranscript(); renderPins(); });
          hd.appendChild(ca);
        } else if (p.t == null || p.est) {
          var sa = el("button", "tr-act", t("trAnchorHere")); sa.type = "button";
          sa.addEventListener("click", function () { session.transcript.paras = L.setAnchor(session.transcript.paras, p.id, audioEl.currentTime); persist(); renderTranscript(); renderPins(); });
          hd.appendChild(sa);
        }
      }
      var addFb = el("button", "tr-act", t("trToFb")); addFb.type = "button";
      addFb.addEventListener("click", function () {
        var pinObj = pid != null ? pinById[pid] : null;
        addFeedbackItem({ text: p.text, paraId: p.id, t: p.t, pinId: pinObj ? pinObj.id : null, page: pinObj ? pinObj.page : null });
      });
      hd.appendChild(addFb);
      li.appendChild(hd);
      var tx = el("p", "tr-text", p.text);
      li.appendChild(tx);
      ul.appendChild(li);
    });
  }
  function updateTranscriptPreview() {
    var raw = $("trPaste").value;
    var noTimes = $("trNoTimes").checked;
    if (!raw.trim()) { trDraft = null; $("trPreviewBox").hidden = true; $("btnTrApply").disabled = true; return; }
    var res = L.parseTranscript(raw, { noTimes: noTimes });
    trDraft = res;
    $("btnTrApply").disabled = res.total === 0;
    $("trPreviewBox").hidden = res.total === 0;
    $("trPrevSummary").textContent = t("trPreviewSummary", { total: res.total, timed: res.timed }) + (res.truncated ? t("trPreviewTrunc") : "");
    var ol = $("trPrevRows"); ol.textContent = "";
    L.previewTranscript(res, 10).forEach(function (r) {
      ol.appendChild(el("li", "", "[" + r.time + "] " + (r.speaker ? r.speaker + ": " : "") + r.text));
    });
  }
  function extractPdfText(file) {
    $("trDlgStatus").textContent = t("loadingPdf");
    return loadPdfJs().then(function (pdfjs) { return file.arrayBuffer().then(function (buf) { return pdfjs.getDocument({ data: new Uint8Array(buf) }).promise; }); }).then(function (doc) {
      var pages = [], chain = Promise.resolve();
      for (var i = 1; i <= doc.numPages; i++) (function (pi) {
        chain = chain.then(function () { return doc.getPage(pi); }).then(function (pg) { return pg.getTextContent(); }).then(function (tc) {
          pages.push((tc.items || []).map(function (it) {
            var tr = it.transform || [1, 0, 0, 1, 0, 0];
            return { str: it.str || "", x: tr[4], y: tr[5], w: it.width || 0, h: Math.abs(tr[3]) || it.height || 10 };
          }));
        });
      })(i);
      return chain.then(function () {
        doc.destroy();
        var rebuilt = L.rebuildPdfLines(pages);
        if (rebuilt.chars === 0) { $("trDlgStatus").textContent = t("trPdfScan"); return ""; }
        $("trDlgStatus").textContent = "";
        return rebuilt.text;
      });
    });
  }
  function handleTranscriptFile(file) {
    if (!file) return;
    trFileNameStr = file.name || "";
    $("trFileName").textContent = trFileNameStr;
    $("trDlgStatus").textContent = "";
    if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
      trFileSource = "pdf";
      extractPdfText(file).then(function (txt) { if (txt) { $("trPaste").value = txt; updateTranscriptPreview(); } })
        .catch(function (e) { $("trDlgStatus").textContent = t("loadFail", { e: e.message || e }); });
    } else if (/\.docx$/i.test(file.name)) {
      trFileSource = "docx";
      file.arrayBuffer().then(function (buf) {
        var z = fflate.unzipSync(new Uint8Array(buf), { filter: function (f) { return f.name === "word/document.xml"; } });
        if (!z["word/document.xml"]) throw new Error("docx");
        var txt = L.docxToText(L.decodeBytes(z["word/document.xml"]));
        $("trPaste").value = txt; updateTranscriptPreview();
      }).catch(function (e) { $("trDlgStatus").textContent = t("loadFail", { e: e.message || e }); });
    } else {
      trFileSource = "file";
      file.arrayBuffer().then(function (buf) {
        $("trPaste").value = L.decodeBytes(new Uint8Array(buf)); updateTranscriptPreview();
      }).catch(function (e) { $("trDlgStatus").textContent = t("loadFail", { e: e.message || e }); });
    }
  }

  /* ---------------- feedback UI ---------------- */
  function addFeedbackItem(o) {
    var before = session.feedback.length;
    session.feedback = L.addFeedback(session.feedback, o);
    if (session.feedback.length > before) {
      persist(); renderSideTabs(); renderFeedback(); toast(t("fbAdded"), 1800);
    }
  }
  function cycleStatus(cur) { return cur === "todo" ? "done" : cur === "done" ? "hold" : "todo"; }
  function renderFbRow(item, pinById) {
    var li = el("li", "fb-item" + (item.status === "done" ? " done" : ""));
    var top = el("div", "fb-top");
    var sb = el("button", "fb-status st-" + item.status, statusLabel(item.status)); sb.type = "button";
    sb.addEventListener("click", function () {
      session.feedback = L.updateFeedback(session.feedback, item.id, { status: cycleStatus(item.status) });
      persist(); renderFeedback(); renderWeekRail();
    });
    var tx = el("div", "fb-text", item.text);
    var dl = el("button", "fb-del", "✕"); dl.type = "button"; dl.setAttribute("aria-label", t("del"));
    dl.addEventListener("click", function () {
      if (confirm(t("fbConfirmDel"))) { session.feedback = L.deleteFeedback(session.feedback, item.id); persist(); renderSideTabs(); renderFeedback(); renderWeekRail(); }
    });
    top.appendChild(sb); top.appendChild(tx); top.appendChild(dl);
    li.appendChild(top);

    var meta = el("div", "fb-meta");
    if (item.carriedFrom) {
      var cb = el("button", "", t("fromWeek", { n: item.carriedFrom.weekN })); cb.type = "button";
      cb.addEventListener("click", function () { openWeek(item.carriedFrom.weekId); });
      meta.appendChild(cb);
    }
    if (item.t != null) {
      var tb = el("button", "", L.formatTime(item.t)); tb.type = "button";
      tb.addEventListener("click", function () { if (mode === "review" && audioEl) seekPlay(item.t); });
      meta.appendChild(tb);
    }
    if (item.pinId != null && pinById[item.pinId]) {
      var pb = el("button", "", t("pinWord") + " " + pinById[item.pinId].n); pb.type = "button";
      pb.addEventListener("click", function () { sideTab = "pins"; renderSideTabs(); selectPin(item.pinId, false); });
      meta.appendChild(pb);
    }
    if (meta.childNodes.length) li.appendChild(meta);

    var note = el("input", "fb-note"); note.type = "text"; note.maxLength = 300;
    note.placeholder = t("fbNotePh"); note.value = item.note || "";
    note.addEventListener("input", function () {
      session.feedback = L.updateFeedback(session.feedback, item.id, { note: note.value });
      persist();
    });
    li.appendChild(note);
    return li;
  }
  function renderFeedback() {
    var items = session.feedback || [];
    var carried = items.filter(function (x) { return !!x.carriedFrom; });
    var own = items.filter(function (x) { return !x.carriedFrom; });
    var pinById = {}; session.pins.forEach(function (p) { pinById[p.id] = p; });
    $("fbCarriedWrap").hidden = !carried.length;
    $("fbOwnHead").hidden = !carried.length || !own.length;
    $("fbEmpty").hidden = items.length > 0;
    var cl = $("fbCarriedList"); cl.textContent = "";
    carried.forEach(function (it) { cl.appendChild(renderFbRow(it, pinById)); });
    var ol = $("fbOwnList"); ol.textContent = "";
    own.forEach(function (it) { ol.appendChild(renderFbRow(it, pinById)); });
  }

  /* ---------------- overview ---------------- */
  var ovThumbUrls = [];
  function renderOverview() {
    ovThumbUrls.forEach(function (u) { URL.revokeObjectURL(u); }); ovThumbUrls = [];
    var sorted = L.sortWeeks(weeksMeta);
    var cards = $("ovCards"); cards.textContent = "";
    sorted.forEach(function (w) {
      var card = el("button", "ov-card"); card.type = "button";
      var th = el("div", "ov-thumb");
      th.appendChild(el("span", "hint", t("noThumb")));
      if (w.pageCount > 0 && storeOk) {
        loadStored(w.id).then(function (rec) {
          if (rec && rec.pages && rec.pages[0] && viewMode === "overview") {
            var u = URL.createObjectURL(rec.pages[0].blob); ovThumbUrls.push(u);
            th.textContent = ""; var im = el("img"); im.src = u; im.alt = ""; th.appendChild(im);
          }
        });
      }
      var body = el("div", "ov-card-body");
      body.appendChild(el("b", "", weekLabel(w) + (w.title ? " — " + w.title : "")));
      var st = L.feedbackStats(w.feedback);
      body.appendChild(el("span", "", t("ovStats", { p: w.pageCount || 0, fb: st.own + st.carried, done: st.done, open: st.open + st.carriedOpen })));
      card.appendChild(th); card.appendChild(body);
      card.addEventListener("click", function () { openWeek(w.id); });
      cards.appendChild(card);
    });
    renderOverviewTable(sorted);
    runOverviewSearch();
  }
  function renderOverviewTable(sorted) {
    document.querySelectorAll("#ovFbFilter button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.filter === ovFilter)); });
    var tb = $("ovFbBody"); tb.textContent = "";
    var rows = [];
    sorted.forEach(function (w) {
      (w.feedback || []).forEach(function (it) {
        if (ovFilter === "open" && it.status === "done") return;
        if (ovFilter === "done" && it.status !== "done") return;
        rows.push({ w: w, it: it });
      });
    });
    $("ovFbEmpty").hidden = rows.length > 0;
    $("ovFbTable").hidden = !rows.length;
    rows.forEach(function (r) {
      var tr = el("tr");
      var tdW = el("td");
      var wb = el("button", "btn ghost small", weekLabel(r.w)); wb.type = "button";
      wb.addEventListener("click", function () { openWeek(r.w.id).then(function () { sideTab = "feedback"; renderSideTabs(); }); });
      tdW.appendChild(wb);
      tr.appendChild(tdW);
      tr.appendChild(el("td", "", r.it.text));
      tr.appendChild(el("td", "", statusLabel(r.it.status)));
      tr.appendChild(el("td", "", r.it.note || "—"));
      tb.appendChild(tr);
    });
  }
  function runOverviewSearch() {
    var q = $("ovSearch").value.trim();
    var box = $("ovSearchRes"); box.textContent = "";
    if (!q) { box.hidden = true; $("ovSearchCount").textContent = ""; return; }
    var hits = L.searchProject(weeksMeta, q);
    $("ovSearchCount").textContent = t("searchHits", { n: hits.length });
    box.hidden = !hits.length;
    var byId = {}; weeksMeta.forEach(function (w) { byId[w.id] = w; });
    hits.slice(0, 60).forEach(function (h) {
      var w = byId[h.weekId];
      var b = el("button", "search-hit"); b.type = "button";
      var kindLbl = h.kind === "feedback" ? t("fbTitle") : h.kind === "pin" ? t("pinsTitle") : t("trTitle");
      b.appendChild(el("small", "", (w ? weekLabel(w) : "") + " · " + kindLbl + (h.t != null ? " · " + L.formatTime(h.t) : "")));
      b.appendChild(el("span", "", h.snippet));
      b.addEventListener("click", function () {
        openWeek(h.weekId).then(function () {
          sideTab = h.kind === "feedback" ? "feedback" : h.kind === "pin" ? "pins" : "transcript";
          renderSideTabs();
          if (h.kind === "transcript") jumpToPara(h.id);
          else if (h.kind === "pin") selectPin(h.id, false);
        });
      });
      box.appendChild(b);
    });
  }

  /* ---------------- pins ---------------- */
  function setPins(pins) { session.pins = pins; persist(); }
  function nowT() {
    if (mode === "review") return audioEl ? audioEl.currentTime : 0;
    return L.clockElapsed(clock, performance.now());
  }
  function canPin() { return mode === "recording" || mode === "paused" || (mode === "review" && pinMode); }
  function addPinAt(x, y, tt) {
    if (tt == null) tt = nowT();
    session.pins = L.addPin(session.pins, { page: curPage, x: x, y: y, t: tt });
    var np = session.pins.reduce(function (a, p) { return p.id > a.id ? p : a; }, session.pins[0]);
    selId = np.id; persist();
    try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(15); } catch (e) { /* ignore */ }
    toast(t("pinAdded", { n: np.n, t: L.formatTime(tt) }), 4000, { label: t("undo"), fn: function () {
      if (selId === np.id) selId = null;
      setPins(L.deletePin(session.pins, np.id)); renderAll();
    } });
    renderSideTabs(); renderPins(); renderTranscript(); renderViewer(); if (mode === "review") renderTicks();
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
    var saved = persistNow();
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
  function enterReview() { mode = "review"; pinMode = false; setupAudio(); renderAll(); }
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
      if (a.duration === Infinity) {
        setFixing(true);
        var finish = function () {
          a.removeEventListener("timeupdate", fix); clearTimeout(guard);
          if (a !== audioEl) return;
          var real = a.duration; setFixing(false);
          a.currentTime = 0; checkDuration(real);
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
    var p = audioEl.play(); if (p && p.catch) p.catch(function () {});
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
    if (session.transcript && session.transcript.paras && session.transcript.paras.length) {
      var ai = L.activePara(session.transcript.paras, c);
      var newId = ai >= 0 ? session.transcript.paras[ai].id : null;
      if (newId !== activeParaId) {
        activeParaId = newId;
        document.querySelectorAll(".tr-para").forEach(function (n) { n.classList.toggle("active", n.dataset.pid === activeParaId); });
      }
    }
  }
  (function bindBar() {
    var bar = $("bar"), down = false;
    function seekFromEvent(e) {
      var r = bar.getBoundingClientRect(); if (!audioEl || fixing) return;
      audioEl.currentTime = L.clamp((e.clientX - r.left) / r.width, 0, 1) * dur(); updateBar();
    }
    bar.addEventListener("pointerdown", function (e) { down = true; try { bar.setPointerCapture(e.pointerId); } catch (x) {} seekFromEvent(e); });
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

  /* ---------------- .crit zip (single week & project bundle) ---------------- */
  function u8(blob) { return blob.arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
  function packWeekFiles(s, prefix, files) {
    var pageFiles = [], audioFile = null, jobs = [];
    (s.pages || []).forEach(function (pg, i) {
      var name = "pages/p" + (i + 1) + "." + L.imageExt(pg.blob.type); pageFiles.push(name);
      jobs.push(u8(pg.blob).then(function (b) { files[prefix + name] = [b, { level: 0 }]; }));
    });
    if (s.audio && s.audio.blob) {
      audioFile = "audio." + L.extForMime(s.audio.mime);
      jobs.push(u8(s.audio.blob).then(function (b) { files[prefix + audioFile] = [b, { level: 0 }]; }));
    }
    return Promise.all(jobs).then(function () {
      var meta = L.buildSessionMeta(Object.assign({}, s, { title: s.title || t("weekN", { n: s.n || 1 }) }), audioFile, pageFiles);
      files[prefix + "session.json"] = [new TextEncoder().encode(JSON.stringify(meta, null, 1)), { level: 6 }];
      if (s.transcript) files[prefix + "transcript.json"] = [new TextEncoder().encode(JSON.stringify(s.transcript)), { level: 6 }];
      if (s.feedback && s.feedback.length) files[prefix + "feedback.json"] = [new TextEncoder().encode(JSON.stringify(s.feedback)), { level: 6 }];
    });
  }
  function buildCrit() {
    var files = {};
    return packWeekFiles(session, "", files).then(function () {
      return new Blob([fflate.zipSync(files)], { type: "application/zip" });
    });
  }
  function buildProjectCrit() {
    var files = {}, sorted = L.sortWeeks(weeksMeta), chain = Promise.resolve();
    sorted.forEach(function (w) {
      chain = chain.then(function () { return w.id === session.id ? session : loadStored(w.id); }).then(function (rec) {
        if (rec) return packWeekFiles(rec, "weeks/" + w.id + "/", files);
      });
    });
    return chain.then(function () {
      var pm = L.buildProjectMeta(projectName || t("defaultProj"), sorted);
      files["project.json"] = [new TextEncoder().encode(JSON.stringify(pm, null, 1)), { level: 6 }];
      return new Blob([fflate.zipSync(files)], { type: "application/zip" });
    });
  }
  function unpackWeekFromMap(z, prefix, fallbackN) {
    if (!z[prefix + "session.json"]) throw new Error("format");
    var meta = L.parseSessionMeta(new TextDecoder().decode(z[prefix + "session.json"]));
    var s = newWeekObj((meta.week && meta.week.n) || fallbackN || L.nextWeekNo(weeksMeta));
    if (meta.week && meta.week.date) s.date = meta.week.date;
    s.title = meta.title; s.createdAt = meta.createdAt; s.presentMin = meta.presentMin; s.pins = meta.pins;
    s.pages = meta.pages.map(function (pg) {
      var d = z[prefix + pg.file]; if (!d) throw new Error("page");
      return { blob: new Blob([d], { type: /png$/i.test(pg.file) ? "image/png" : "image/jpeg" }), w: pg.w, h: pg.h, name: pg.name };
    });
    if (meta.audio && z[prefix + meta.audio.file]) {
      var ext = meta.audio.file.split(".").pop();
      var mime = meta.audio.mime || L.mimeForExt(ext);
      s.audio = { blob: new Blob([z[prefix + meta.audio.file]], { type: mime }), mime: mime, duration: meta.audio.duration };
    }
    if (z[prefix + "transcript.json"]) s.transcript = L.normalizeTranscript(new TextDecoder().decode(z[prefix + "transcript.json"]));
    if (z[prefix + "feedback.json"]) s.feedback = L.normalizeFeedback(new TextDecoder().decode(z[prefix + "feedback.json"]));
    return s;
  }
  function loadCrit(file) {
    if (file.size > L.PROJECT_LIMITS.maxTotal) return Promise.reject(new Error("critbig"));
    return file.arrayBuffer().then(function (buf) {
      var data = new Uint8Array(buf);
      var entries = L.scanZipDirectory(data, L.PROJECT_LIMITS);
      var isProj = entries.some(function (e) { return e.name === "project.json"; });
      if (!isProj) L.scanZipDirectory(data, L.CRIT_LIMITS);
      var raw = fflate.unzipSync(data, { filter: function (f) { return isProj ? L.isProjectEntryName(f.name) : L.isCritEntryName(f.name); } });
      var z = Object.create(null); Object.keys(raw).forEach(function (k) { z[k] = raw[k]; });
      if (isProj) {
        var pm = L.parseProjectMeta(new TextDecoder().decode(z["project.json"]));
        var list = pm.weeks.map(function (w, idx) {
          var s = unpackWeekFromMap(z, "weeks/" + w.id + "/", w.n || idx + 1);
          s.id = w.id; if (w.date) s.date = w.date;
          return s;
        });
        return { kind: "project", name: pm.name, weeks: list };
      }
      return { kind: "week", session: unpackWeekFromMap(z, "", L.nextWeekNo(weeksMeta)) };
    });
  }
  function openCritMessage(e) {
    if (e && e.message === "critbig") return t("critTooBig");
    if (e && e.message === "critmany") return t("critTooMany");
    if (e && e.name === "RangeError") return t("critTooBig");
    return t("openFail");
  }
  function importLoadedCrit(res) {
    if (res.kind === "week") {
      adoptSession(res.session, false);
      blobDirty = true; persistNow();
      return;
    }
    if (res.name) { projectName = res.name; try { localStorage.setItem("crit-project-name", projectName); } catch (e) {} }
    var chain = Promise.resolve();
    res.weeks.forEach(function (s) {
      chain = chain.then(function () {
        var m = metaOf(s); syncMetaInList(m);
        if (!storeOk) return;
        var snap = Object.assign({}, s, { pages: s.pages.map(function (pg) { return { blob: pg.blob, w: pg.w, h: pg.h, name: pg.name }; }) });
        return idb(["sessions", "meta"], "readwrite", function (tx) { tx.objectStore("meta").put(m); tx.objectStore("sessions").put(snap); }).then(function () { everSaved[s.id] = true; });
      });
    });
    chain.then(function () {
      toast(t("projImported", { n: res.weeks.length }), 3000);
      if (res.weeks.length) adoptSession(res.weeks[res.weeks.length - 1], true);
    });
  }

  function adoptSession(s, fromDb) {
    if (recActive()) return false;
    stopEverything();
    revokePages(); revokePrevUrls(); prevWeekData = null; cmpOn = false;
    session = s; curPage = 0; selId = null; pinMode = false; starOnly = false; zoomIdx = 0; clock = L.clockNew(); activeParaId = null;
    $("alertBox").hidden = true;
    blobDirty = !fromDb; if (fromDb) everSaved[s.id] = true;
    mode = s.audio && s.audio.blob ? "review" : "setup";
    $("presentMin").value = s.presentMin || 0;
    if (mode === "review") setupAudio(); else teardownAudio();
    syncMetaInList(metaOf(s));
    try { localStorage.setItem("crit-last-week", s.id); } catch (e) {}
    renderAll();
    if (!fromDb) persist();
    return true;
  }
  function stopEverything() {
    if (recorder) { try { recorder.onstop = null; recorder.stop(); } catch (e) {} recorder = null; }
    stopStream(); stopMeter(); dropLock(); clearInterval(tickTimer); releaseWake(); teardownAudio(); banner("");
  }

  /* ---------------- crash recovery ---------------- */
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
            var s = stored || newWeekObj(L.nextWeekNo(weeksMeta)); if (!stored) s.id = m.sessionId;
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
    }).catch(function () {});
  }

  /* ---------------- exports (PDF / PNG / Semester PDF / Markdown / .crit) ---------------- */
  var SW = 1240, SH = 1754, SM = 64;
  var FONT = '"Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
  function loadImg(blob) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(blob), im = new Image();
      im.onload = function () { res({ im: im, url: u }); }; im.onerror = function () { URL.revokeObjectURL(u); rej(new Error("img")); }; im.src = u;
    });
  }
  function renderSummarySheets(kind) {
    var mime = kind === "jpeg" ? "image/jpeg" : "image/png", q = kind === "jpeg" ? 0.9 : undefined;
    var out = [], title = weekLabel(session) + (session.title ? " — " + session.title : ""), chain = Promise.resolve();
    var mc = document.createElement("canvas").getContext("2d");
    session.pages.forEach(function (pg, pi) {
      chain = chain.then(function () { return loadImg(pg.blob); }).then(function (r) {
        var pins = L.pinsOnPage(session.pins, pi), rows = L.noteRows(pins);
        mc.font = "400 24px " + FONT;
        var colW = 130;
        rows.forEach(function (row) { colW = Math.max(colW, Math.ceil(mc.measureText(row.time + (row.star ? "  ★" : "")).width) + 16); });
        var NW = SW - SM * 2 - 60 - colW - 20;
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
                var px = x0 + p.x * sz.w, py = y + p.y * sz.h;
                cx.beginPath(); cx.arc(px, py, 20, 0, Math.PI * 2); cx.fillStyle = "#d70015"; cx.fill();
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
  function renderSemesterSheets() {
    var sorted = L.sortWeeks(weeksMeta), out = [], chain = Promise.resolve();
    var mc = document.createElement("canvas").getContext("2d");
    sorted.forEach(function (w) {
      chain = chain.then(function () { return w.id === session.id ? session : loadStored(w.id); }).then(function (rec) {
        var wk = rec || w;
        var imgP = (wk.pages && wk.pages[0]) ? loadImg(wk.pages[0].blob) : Promise.resolve(null);
        return imgP.then(function (r) {
          var c = document.createElement("canvas"); c.width = SW; c.height = SH;
          var cx = c.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, SW, SH);
          cx.fillStyle = "#1d1d1f"; cx.font = "700 32px " + FONT;
          cx.fillText((projectName || t("defaultProj")) + " · " + weekLabel(wk), SM, SM + 32);
          if (wk.title) { cx.fillStyle = "#6e6e73"; cx.font = "400 22px " + FONT; cx.fillText(wk.title, SM, SM + 66); }
          cx.strokeStyle = "#d2d2d7"; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(SM, SM + 82); cx.lineTo(SW - SM, SM + 82); cx.stroke();
          var y = SM + 106;
          if (r) {
            var k = Math.min((SW - SM * 2) / r.im.naturalWidth, 720 / r.im.naturalHeight);
            var iw = Math.round(r.im.naturalWidth * k), ih = Math.round(r.im.naturalHeight * k);
            var x0 = Math.round((SW - iw) / 2);
            cx.drawImage(r.im, x0, y, iw, ih);
            cx.strokeStyle = "#d2d2d7"; cx.lineWidth = 1; cx.strokeRect(x0, y, iw, ih);
            URL.revokeObjectURL(r.url);
            y += ih + 36;
          }
          cx.fillStyle = "#1d1d1f"; cx.font = "700 24px " + FONT; cx.fillText(t("fbTitle"), SM, y); y += 34;
          var fb = wk.feedback || [];
          if (!fb.length) { cx.fillStyle = "#6e6e73"; cx.font = "400 22px " + FONT; cx.fillText(t("fbEmpty"), SM, y); }
          else {
            mc.font = "400 22px " + FONT;
            fb.forEach(function (it) {
              if (y > SH - SM - 40) return;
              var st = "[" + statusLabel(it.status) + "] ";
              var ls = L.wrapText(st + it.text + (it.note ? " — " + it.note : ""), SW - SM * 2, function (s) { return mc.measureText(s).width; });
              cx.fillStyle = it.status === "done" ? "#6e6e73" : "#1d1d1f"; cx.font = "400 22px " + FONT;
              ls.slice(0, 3).forEach(function (ln) { cx.fillText(ln, SM, y); y += 30; });
              y += 8;
            });
          }
          return canvasToBlob(c, "image/jpeg", 0.88).then(function (b) { c.width = c.height = 0; out.push(b); });
        });
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
        chain = chain.then(function () { return u8(b); }).then(function (bytes) { if (i) pdf.addPage("a4", "portrait"); pdf.addImage(bytes, "JPEG", 0, 0, 210, 297); });
      });
      return chain.then(function () { download(pdf.output("blob"), L.safeName(session.title || defaultTitle()) + "_" + L.stamp() + ".pdf"); });
    }).then(function () { exportStatus(t("saved")); }).catch(function (e) { exportStatus(e.message); });
  }
  function exportSemesterPdf() {
    exportStatus(t("exporting"));
    var lib = window.jspdf ? Promise.resolve() : loadScript(JSPDF_URL, JSPDF_SRI);
    return lib.catch(function () { throw new Error(t("libFail")); }).then(renderSemesterSheets).then(function (blobs) {
      var pdf = new window.jspdf.jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      var chain = Promise.resolve();
      blobs.forEach(function (b, i) {
        chain = chain.then(function () { return u8(b); }).then(function (bytes) { if (i) pdf.addPage("a4", "portrait"); pdf.addImage(bytes, "JPEG", 0, 0, 210, 297); });
      });
      return chain.then(function () { download(pdf.output("blob"), L.safeName(projectName || t("defaultProj")) + "_semester_" + L.stamp() + ".pdf"); });
    }).then(function () { exportStatus(t("saved")); }).catch(function (e) { exportStatus(e.message); });
  }
  function exportMarkdown() {
    var md = L.buildMarkdown({ name: projectName || t("defaultProj"), weeks: weeksMeta }, {
      project: t("mdProject"), week: function (n) { return t("weekN", { n: n }); },
      feedback: t("mdFeedback"), none: t("mdNone"), text: t("mdText"), status: t("mdStatus"), note: t("mdNote"), source: t("mdSource"),
      pin: t("pinWord"), page: t("page"), pins: t("mdPins"), transcript: t("mdTranscript"),
      carried: function (n) { return t("fromWeek", { n: n }); },
      statusName: { todo: t("stTodo"), done: t("stDone"), hold: t("stHold") },
    });
    download(new Blob([md], { type: "text/markdown;charset=utf-8" }), L.safeName(projectName || t("defaultProj")) + "_" + L.stamp() + ".md");
    exportStatus(t("saved"));
  }
  function exportCrit() {
    exportStatus(t("exporting"));
    return buildCrit().then(function (blob) {
      download(blob, L.safeName(session.title || defaultTitle()) + "_" + L.stamp() + ".crit"); exportStatus(t("saved"));
    }).catch(function (e) { exportStatus(t("loadFail", { e: e.message })); });
  }
  function exportProjectCrit() {
    exportStatus(t("exporting"));
    return persistNow().then(buildProjectCrit).then(function (blob) {
      download(blob, L.safeName(projectName || t("defaultProj")) + "_all_" + L.stamp() + ".crit"); exportStatus(t("saved"));
    }).catch(function (e) { exportStatus(t("loadFail", { e: e.message })); });
  }

  /* ---------------- Google Drive sync & auto-transcription ---------------- */
  function getGoogleToken() {
    try {
      var raw = sessionStorage.getItem("atelier-cloud-session");
      if (!raw) return null;
      var s = JSON.parse(raw);
      return (s && s.token) || null;
    } catch (e) { return null; }
  }
  function checkOwnerStatus() {
    var tok = getGoogleToken();
    if (!tok || !TRANSCRIBE_WORKER_URL) { isOwner = false; return Promise.resolve(false); }
    return fetch(TRANSCRIBE_WORKER_URL + "/me", { headers: { Authorization: "Bearer " + tok } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { isOwner = !!(d && d.isOwner); return isOwner; })
      .catch(function () { isOwner = false; return false; });
  }
  function loadAudioFile(file) {
    if (!file || recActive()) return;
    var mime = file.type || L.mimeForExt((file.name || "").split(".").pop().toLowerCase());
    session.audio = { blob: file, mime: mime, duration: 0 };
    blobDirty = true;
    enterReview();
    persist();
    toast(t("audioLoaded"), 2200);
  }
  function setAutoTrProgress(pct, msg) {
    $("autoTrProgWrap").hidden = false;
    $("autoTrMeter").style.width = L.clamp(pct, 0, 100) + "%";
    $("autoTrStatus").textContent = msg || "";
  }
  function updateAutoTrEngineUi() {
    var useGemini = isOwner && $("engGemini").checked;
    $("autoTrFbRow").hidden = !useGemini;
  }
  function openAutoTrDialog() {
    if (recActive()) return;
    var hasAudio = !!(session.audio && session.audio.blob);
    $("autoTrNoAudio").hidden = hasAudio;
    $("autoTrBody").hidden = !hasAudio;
    $("btnAutoTrStart").disabled = !hasAudio || transcribing;
    $("autoTrProgWrap").hidden = !transcribing;
    $("engGeminiOpt").hidden = !isOwner;
    if (isOwner) $("engGemini").checked = true;
    else $("engLocal").checked = true;
    updateAutoTrEngineUi();
    $("dlgAutoTr").showModal();
  }
  function applyAutoTranscript(paras, fbItems, sourceName) {
    session.transcript = { v: 1, source: sourceName, name: sourceName, createdAt: Date.now(), format: "lines", paras: paras };
    var addedFb = 0;
    (fbItems || []).forEach(function (f) {
      var before = session.feedback.length;
      session.feedback = L.addFeedback(session.feedback, { text: f.text, t: f.t != null ? f.t : null });
      if (session.feedback.length > before) addedFb++;
    });
    persist();
    sideTab = "transcript";
    renderAll();
    if ($("dlgAutoTr").open) $("dlgAutoTr").close();
    toast(addedFb ? t("autoTrDoneFb", { n: paras.length, fb: addedFb }) : t("autoTrDone", { n: paras.length }), 3200);
  }
  function runGeminiTranscribe(langChoice, extractFb) {
    var blob = session.audio.blob;
    if (blob.size > MAX_GEMINI_AUDIO) return Promise.reject(new Error(t("autoTrTooBig")));
    var tok = getGoogleToken();
    if (!tok) return Promise.reject(new Error("Google login required"));
    setAutoTrProgress(25, t("autoTrUploading"));
    var fd = new FormData();
    fd.append("audio", blob, "audio." + L.extForMime(session.audio.mime));
    fd.append("lang", langChoice);
    fd.append("extractFeedback", extractFb ? "1" : "0");
    return fetch(TRANSCRIBE_WORKER_URL + "/transcribe", {
      method: "POST",
      headers: { Authorization: "Bearer " + tok },
      body: fd,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok || !d.ok) throw new Error(d.error || ("HTTP " + r.status));
        setAutoTrProgress(100, "");
        return d;
      });
    });
  }
  function decodeTo16kMono(blob) {
    return blob.arrayBuffer().then(function (buf) {
      var AC = window.AudioContext || window.webkitAudioContext;
      var ctx = new AC();
      return ctx.decodeAudioData(buf).then(function (audioBuf) {
        var len = Math.ceil(audioBuf.duration * 16000);
        var off = new OfflineAudioContext(1, Math.max(1, len), 16000);
        var src = off.createBufferSource();
        src.buffer = audioBuf;
        src.connect(off.destination);
        src.start(0);
        return off.startRendering().then(function (rendered) {
          try { ctx.close(); } catch (e) {}
          return rendered.getChannelData(0);
        });
      });
    });
  }
  function runLocalWhisperTranscribe(langChoice) {
    setAutoTrProgress(10, t("autoTrLoadingModel", { p: 0 }));
    var loadPipe = whisperPipe ? Promise.resolve(whisperPipe) : import(TRANSFORMERS_URL).then(function (tf) {
      var device = (navigator && navigator.gpu) ? "webgpu" : "wasm";
      return tf.pipeline("automatic-speech-recognition", "onnx-community/whisper-base", {
        dtype: "q8",
        device: device,
        progress_callback: function (p) {
          if (p && p.progress != null) setAutoTrProgress(Math.round(p.progress * 0.6), t("autoTrLoadingModel", { p: Math.round(p.progress) }));
        },
      }).then(function (pipe) { whisperPipe = pipe; return pipe; });
    });
    return loadPipe.then(function (pipe) {
      setAutoTrProgress(65, t("autoTrDecoding"));
      return decodeTo16kMono(session.audio.blob).then(function (pcm) {
        setAutoTrProgress(75, t("autoTrRunningLocal"));
        var opts = { return_timestamps: true, chunk_length_s: 30, stride_length_s: 5, task: "transcribe" };
        if (langChoice === "ko") opts.language = "korean";
        else if (langChoice === "fr") opts.language = "french";
        return pipe(pcm, opts);
      });
    }).then(function (out) {
      setAutoTrProgress(100, "");
      var chunks_ = (out && Array.isArray(out.chunks) && out.chunks.length) ? out.chunks : [{ timestamp: [0, null], text: (out && out.text) || "" }];
      var paras = chunks_.map(function (c, i) {
        var ts = Array.isArray(c.timestamp) && c.timestamp[0] != null ? +c.timestamp[0] : null;
        return { id: "p" + (i + 1), t: ts, est: false, anchor: false, speaker: "", text: String(c.text || "").trim() };
      }).filter(function (p) { return p.text; });
      return { paras: paras, feedback: [] };
    });
  }
  function startAutoTranscribe() {
    if (transcribing || !session.audio || !session.audio.blob) return;
    transcribing = true;
    $("btnAutoTrStart").disabled = true;
    var useGemini = isOwner && $("engGemini").checked;
    var langChoice = $("autoTrLang").value || "auto";
    var extractFb = $("autoTrExtractFb").checked;
    var job = useGemini ? runGeminiTranscribe(langChoice, extractFb) : runLocalWhisperTranscribe(langChoice);
    job.then(function (res) {
      transcribing = false;
      $("btnAutoTrStart").disabled = false;
      applyAutoTranscript(res.paras || [], res.feedback || [], useGemini ? "gemini" : "whisper-local");
    }).catch(function (e) {
      transcribing = false;
      $("btnAutoTrStart").disabled = false;
      setAutoTrProgress(0, t("autoTrFail", { e: e.message || e }));
    });
  }

  function renderCloudBtn() {
    var b = $("btnCloud");
    if (!b) return;
    b.textContent = cloudUser ? "Drive ●" : t("cloudBtn");
  }
  function initCloud() {
    return import("./atelier-cloud.js").then(function (m) {
      cloudMod = m;
      cloud = m.createCloud({ googleClientId: GOOGLE_CLIENT_ID, rootFolderName: "Atelier 4·2 Share" });
      return cloud.restore().then(function (ok) {
        if (ok) { cloudUser = cloud.session(); renderCloudBtn(); checkOwnerStatus(); }
      });
    }).catch(function () {});
  }
  function openCloudDialog() {
    $("cloudStatus").textContent = cloudUser ? t("cloudOn", { email: cloudUser.email || "Google" }) : t("cloudOff");
    $("cloudSignedOut").hidden = !!cloudUser;
    $("cloudSignedIn").hidden = !cloudUser;
    if (cloudUser && cloud) {
      cloud.listProjects().then(function (list) {
        var sel = $("cloudProjSel"); sel.textContent = "";
        list.forEach(function (p) { var o = el("option", "", p.name); o.value = p.id; if (p.id === cloudProjId) o.selected = true; sel.appendChild(o); });
        var nw = el("option", "", t("cloudCreateNew")); nw.value = "__new__"; sel.appendChild(nw);
        if (!cloudProjId && list.length) { cloudProjId = list[0].id; try { localStorage.setItem("crit-cloud-proj", cloudProjId); } catch (e) {} }
      }).catch(function (e) { $("cloudStatus").textContent = t("cloudErr", { e: e.message || e }); });
    }
    $("dlgCloud").showModal();
  }
  function syncWithDrive() {
    if (!cloud || !cloudUser || cloudSyncing) return;
    cloudSyncing = true;
    $("cloudStatus").textContent = t("cloudSyncing");
    var ensureProj = function () {
      var v = $("cloudProjSel").value;
      if (v && v !== "__new__") { cloudProjId = v; try { localStorage.setItem("crit-cloud-proj", cloudProjId); } catch (e) {} return cloud.openProject(cloudProjId); }
      return cloud.createProject(projectName || t("defaultProj")).then(function (p) {
        cloudProjId = p.id; try { localStorage.setItem("crit-cloud-proj", cloudProjId); } catch (e) {} return p;
      });
    };
    persistNow().then(ensureProj).then(function (proj) {
      var remoteWeeks = ((proj.manifest && proj.manifest.tools && proj.manifest.tools.crit && proj.manifest.tools.crit.weeks) || []).map(L.normalizeRemoteWeek).filter(Boolean);
      return (storeOk ? idb(["tombs"], "readonly", function (tx) { return tx.objectStore("tombs").getAll(); }) : Promise.resolve([])).then(function (tombs) {
        var plan = L.planSync(weeksMeta, remoteWeeks, tombs);
        var updatedEntries = [], chain = Promise.resolve();
        plan.push.forEach(function (wid) {
          chain = chain.then(function () { return wid === session.id ? session : loadStored(wid); }).then(function (rec) {
            if (!rec) return;
            var base = "crit/" + wid + "/";
            var jobs = [];
            var pageFiles = [];
            (rec.pages || []).forEach(function (pg, i) {
              var fn = "pages/p" + (i + 1) + "." + L.imageExt(pg.blob.type); pageFiles.push(fn);
              jobs.push(proj.uploadBlob(base + fn, pg.blob, { overwrite: true }));
            });
            var audioFile = null;
            if (rec.audio && rec.audio.blob) {
              audioFile = "audio." + L.extForMime(rec.audio.mime);
              jobs.push(proj.uploadBlob(base + audioFile, rec.audio.blob, { overwrite: true }));
            }
            var sm = L.buildSessionMeta(rec, audioFile, pageFiles);
            jobs.push(proj.writeJson(base + "session.json", sm, {}));
            if (rec.transcript) jobs.push(proj.writeJson(base + "transcript.json", rec.transcript, {}));
            if (rec.feedback) jobs.push(proj.writeJson(base + "feedback.json", rec.feedback, {}));
            return Promise.all(jobs).then(function () {
              rec.syncedAt = rec.updatedAt;
              if (rec.id === session.id) session.syncedAt = rec.syncedAt;
              var m = metaOf(rec); syncMetaInList(m);
              if (storeOk) return idb(["meta"], "readwrite", function (tx) { tx.objectStore("meta").put(m); });
            }).then(function () {
              updatedEntries.push({ id: wid, n: rec.n, date: rec.date, title: rec.title, updatedAt: rec.updatedAt, deleted: false });
            });
          });
        });
        plan.pushDelete.forEach(function (wid) {
          updatedEntries.push({ id: wid, n: 0, date: "", title: "", updatedAt: Date.now(), deleted: true });
        });
        return chain.then(function () {
          if (!updatedEntries.length) return;
          return proj.updateManifest(function (m) {
            m.tools = m.tools || {};
            m.tools.crit = { weeks: L.mergeManifestWeeks(remoteWeeks, updatedEntries) };
          });
        });
      });
    }).then(function () {
      cloudSyncing = false;
      $("cloudStatus").textContent = t("cloudSynced");
      toast(t("cloudSynced"), 2400);
    }).catch(function (e) {
      cloudSyncing = false;
      $("cloudStatus").textContent = t("cloudErr", { e: e.message || e });
    });
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
    var d = $("dlgRerecord"); d.returnValue = "";
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
      b.addEventListener("click", function () { lang = b.dataset.lang; try { localStorage.setItem("crit-lang", lang); } catch (e) {} applyLang(); });
    });
    $("projName").addEventListener("input", function () {
      projectName = $("projName").value;
      try { localStorage.setItem("crit-project-name", projectName); } catch (e) {}
    });
    $("btnOverview").addEventListener("click", function () {
      if (recActive()) return;
      viewMode = viewMode === "overview" ? "week" : "overview";
      renderAll();
    });
    $("btnNewWeek").addEventListener("click", createNewWeek);
    $("btnDelWeek").addEventListener("click", deleteCurrentWeek);
    $("weekDate").addEventListener("change", function () {
      if (L.isDateStr($("weekDate").value)) { session.date = $("weekDate").value; persist(); renderWeekRail(); }
    });
    $("title").addEventListener("input", function () { session.title = $("title").value; persist(); });
    $("presentMin").addEventListener("input", function () { session.presentMin = Math.max(0, +$("presentMin").value || 0); persist(); renderDock(); });

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
      if (crit) { loadCrit(crit).then(importLoadedCrit).catch(function (err) { banner(openCritMessage(err), true); }); return; }
      addFiles(fl);
    });

    $("alertClose").addEventListener("click", function () { $("alertBox").hidden = true; });
    $("prevPage").addEventListener("click", function () { curPage--; renderViewer(); });
    $("nextPage").addEventListener("click", function () { curPage++; renderViewer(); });
    $("zoomIn").addEventListener("click", function () { zoomIdx = Math.min(ZOOMS.length - 1, zoomIdx + 1); renderViewer(); });
    $("zoomOut").addEventListener("click", function () { zoomIdx = Math.max(0, zoomIdx - 1); renderViewer(); });
    $("btnCompare").addEventListener("click", toggleCompare);
    document.querySelectorAll("#cmpModes button").forEach(function (b) {
      b.addEventListener("click", function () { cmpMode = b.dataset.cmode; renderCompare(); });
    });
    $("cmpRange").addEventListener("input", function () { cmpVal = +$("cmpRange").value; renderCompare(); });

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
    $("btnUploadAudio").addEventListener("click", function () { if (!recActive()) $("audioFileInput").click(); });
    $("audioFileInput").addEventListener("change", function () { loadAudioFile($("audioFileInput").files[0]); $("audioFileInput").value = ""; });
    $("btnAutoTr").addEventListener("click", openAutoTrDialog);
    $("btnAutoTrDock").addEventListener("click", openAutoTrDialog);
    $("btnAutoTrStart").addEventListener("click", startAutoTranscribe);
    $("engGemini").addEventListener("change", updateAutoTrEngineUi);
    $("engLocal").addEventListener("change", updateAutoTrEngineUi);
    $("btnPause").addEventListener("click", pauseResume);
    $("btnStop").addEventListener("click", stopRecording);
    $("btnRerecord").addEventListener("click", askRerecord);

    /* Side tabs */
    document.querySelectorAll(".side-tabs button").forEach(function (b) {
      b.addEventListener("click", function () { sideTab = b.dataset.tab; renderSideTabs(); });
    });

    /* Transcript dialog & selection-to-feedback */
    $("btnUploadTr").addEventListener("click", function () {
      trDraft = null; trFileSource = "paste"; trFileNameStr = "";
      $("trPaste").value = ""; $("trFileName").textContent = ""; $("trDlgStatus").textContent = "";
      $("trNoTimes").checked = false; $("trPreviewBox").hidden = true; $("btnTrApply").disabled = true;
      $("dlgTranscript").showModal();
    });
    $("btnTrFile").addEventListener("click", function () { $("trFileInput").click(); });
    $("trFileInput").addEventListener("change", function () { handleTranscriptFile($("trFileInput").files[0]); $("trFileInput").value = ""; });
    $("trPaste").addEventListener("input", updateTranscriptPreview);
    $("trNoTimes").addEventListener("change", updateTranscriptPreview);
    $("btnTrApply").addEventListener("click", function () {
      if (!trDraft || !trDraft.total) return;
      session.transcript = { v: 1, source: trFileSource, name: trFileNameStr, createdAt: Date.now(), format: trDraft.format, paras: trDraft.paras };
      $("dlgTranscript").close();
      persist(); renderSideTabs(); renderTranscript(); renderPins();
      toast(t("trApplied", { n: trDraft.total }), 2400);
    });
    $("btnClearTr").addEventListener("click", function () {
      if (confirm(t("trConfirmClear"))) { session.transcript = null; persist(); renderSideTabs(); renderTranscript(); renderPins(); }
    });
    document.addEventListener("selectionchange", function () {
      if (sideTab !== "transcript") { $("btnSelToFb").hidden = true; return; }
      var sel = window.getSelection();
      var txt = sel ? sel.toString().trim() : "";
      var inside = txt && sel.anchorNode && $("trList").contains(sel.anchorNode);
      $("btnSelToFb").hidden = !inside;
    });
    $("btnSelToFb").addEventListener("click", function () {
      var sel = window.getSelection();
      var txt = sel ? sel.toString().trim() : "";
      if (!txt) return;
      var paraEl = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
      var li = paraEl && paraEl.closest ? paraEl.closest(".tr-para") : null;
      var pid = li ? li.dataset.pid : null;
      var pr = pid && session.transcript ? session.transcript.paras.filter(function (x) { return x.id === pid; })[0] : null;
      addFeedbackItem({ text: txt, paraId: pid, t: pr ? pr.t : null });
      if (sel.removeAllRanges) sel.removeAllRanges();
      $("btnSelToFb").hidden = true;
    });

    /* Feedback add */
    $("fbForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var v = $("fbInput").value.trim(); if (!v) return;
      addFeedbackItem({ text: v });
      $("fbInput").value = "";
    });

    /* Overview search & filter */
    $("ovSearch").addEventListener("input", runOverviewSearch);
    document.querySelectorAll("#ovFbFilter button").forEach(function (b) {
      b.addEventListener("click", function () { ovFilter = b.dataset.filter; renderOverviewTable(L.sortWeeks(weeksMeta)); });
    });

    /* Cloud dialog */
    $("btnCloud").addEventListener("click", function () { if (!recActive()) openCloudDialog(); });
    $("btnGoogleSignIn").addEventListener("click", function () {
      if (!cloud) { $("cloudStatus").textContent = t("libFail"); return; }
      cloud.signIn("google").then(function () { cloudUser = cloud.session(); renderCloudBtn(); return checkOwnerStatus(); }).then(function () { openCloudDialog(); })
        .catch(function (e) { $("cloudStatus").textContent = t("cloudErr", { e: e.message || e }); });
    });
    $("btnCloudSync").addEventListener("click", syncWithDrive);
    $("btnCloudSignOut").addEventListener("click", function () {
      if (!cloud) return;
      cloud.signOut().then(function () { cloudUser = null; isOwner = false; renderCloudBtn(); openCloudDialog(); });
    });

    /* Open / Save / Export */
    $("btnOpen").addEventListener("click", function () { if (!recActive()) $("openInput").click(); });
    $("openInput").addEventListener("change", function () {
      var f = $("openInput").files[0]; if (!f) return;
      loadCrit(f).then(importLoadedCrit).catch(function (err) { banner(openCritMessage(err), true); });
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
    $("expSemPdf").addEventListener("click", exportSemesterPdf);
    $("expMd").addEventListener("click", exportMarkdown);
    $("expProjCrit").addEventListener("click", exportProjectCrit);

    window.addEventListener("beforeunload", function (e) {
      if (recActive() || (!storeOk && hasContent()) || saveFailed) { e.preventDefault(); e.returnValue = ""; }
    });
    window.addEventListener("pagehide", flushPersist);
  }

  /* ---------------- boot ---------------- */
  bind();
  $("presentMin").value = session.presentMin;
  initCloud();
  openDb(function (d) {
    db = d; storeOk = !!d;
    if (!storeOk) { banner(t("storeOff"), true); syncMetaInList(metaOf(session)); applyLang(); return; }
    if ($("banner").textContent === t("storeOff")) banner("");
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    idb(["meta"], "readonly", function (tx) { return tx.objectStore("meta").getAll(); }).then(function (all) {
      var mig = L.migrateToWeeks(all || []);
      weeksMeta = L.sortWeeks(mig.metas);
      var saveMig = mig.changed.length ? idb(["meta"], "readwrite", function (tx) { mig.changed.forEach(function (m) { tx.objectStore("meta").put(m); }); }) : Promise.resolve();
      return saveMig.then(function () {
        if (!weeksMeta.length) {
          syncMetaInList(metaOf(session));
          applyLang();
          return checkRecovery();
        }
        var lastId = null; try { lastId = localStorage.getItem("crit-last-week"); } catch (e) {}
        var target = weeksMeta.filter(function (w) { return w.id === lastId; })[0] || weeksMeta[weeksMeta.length - 1];
        return loadStored(target.id).then(function (rec) {
          if (rec) adoptSession(rec, true);
          else { syncMetaInList(metaOf(session)); applyLang(); }
          return checkRecovery();
        });
      });
    }).catch(function () { syncMetaInList(metaOf(session)); applyLang(); });
  });
  applyLang();

  if (IS_LOCAL) {
    window.CritApp = {
      state: function () { return { mode: mode, viewMode: viewMode, sideTab: sideTab, weeksMeta: weeksMeta, session: session, curPage: curPage, selId: selId, cmpOn: cmpOn, cmpMode: cmpMode }; },
      loadSession: function (s) { adoptSession(s, false); },
      loadAudio: function (blob, duration) { session.audio = { blob: blob, mime: blob.type || "audio/wav", duration: duration }; blobDirty = true; enterReview(); },
      addFiles: addFiles, buildCrit: buildCrit, buildProjectCrit: buildProjectCrit, loadCrit: loadCrit,
      flush: function () { return persistNow(); },
      createNewWeek: createNewWeek, openWeek: openWeek,
    };
  }
})();
