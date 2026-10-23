import { calculateBudget, formatCurrency, BASE_PRICE, DELIVERY_DAYS, DEPOSIT_AMOUNT, PRICE_RULES } from "./pricing.js?v=20261014-opening-choice-1";

let MODEL_MEDIA = { models: {}, referenceDemo: null };
let MODEL_CATALOG = [];
try {
  const response = await fetch(new URL("../data/model-media.json?v=20261001-3", import.meta.url), { cache: "force-cache" });
  if (response.ok) MODEL_MEDIA = await response.json();
} catch (error) {
  // O formulário continua disponível mesmo sem a ficha de mídia local.
}
try {
  const response = await fetch(new URL("../data/catalog.json?v=20261021-aberturas-1", import.meta.url), { cache: "force-cache" });
  if (response.ok) MODEL_CATALOG = await response.json();
} catch (error) {
  // O modelo escolhido ainda pode ser identificado pelo slug salvo no rascunho ou na URL.
}

// Configuração de integração da empresa
export const BUSINESS_WHATSAPP = "5511939047235";
const DEPOSIT_PAYMENT_LINK = "https://mpago.la/1wvHN6p";
const DEPOSIT_PIX_CPF = "49455859890";
const STORAGE_KEY = "mforge_preview_budget_draft_v2";
const LEGACY_STORAGE_KEY = "mforge_preview_budget_draft_v1";
const EVENT_TYPES = ["Aniversário", "15 anos", "Casamento", "Formatura", "Outro"];
const MANUAL_SIMPLE_DEFAULT = [
  "Chegue no horário: Sua presença pontual é muito importante para nós.",
  "Confirme sua presença: Por favor, confirme sua presença pelo menos 15 dias antes do evento.",
  "Convidado não convida!",
  "Os doces e o bolo serão servidos depois do parabéns; por favor, não mexa na mesa.",
  "Divirta-se bastante! Estamos ansiosos para celebrar este momento especial com você.",
  "Não vá embora sem me dar um abraço e comer um pedaço do bolo. Queremos compartilhar cada instante com você."
].join("\n");
const ALLOWED_CHOICES = {
  modelCustomization: [true, false],
  openingType: ["short", "long", "none"],
  openingPhoto: ["include", "none"],
  rsvp: ["whatsapp", "smart_form", "none"],
  gifts: ["simple", "premium", "smart_list", "client_list", "none"],
  manual: ["simple", "premium", "none"],
  countdown: ["include", "none"],
  gallery: ["include", "none"],
  sharedAlbum: ["include", "none"],
  instagramFilter: ["include", "none"],
  saveTheDate: ["simple", "premium", "none"],
  reminder: ["include", "none"]
};

const INITIAL_STATE = {
  version: 1,
  currentStepIndex: 1,
  hasVisitedFinalReview: false,
  openingChoiceConfirmed: false,
  selectedModel: null,
  modelMode: "none", // 'selected' | 'new' | 'none'
  modelCustomization: "",
  event: {
    type: "Aniversário",
    eventName: "",
    age: "",
    date: "",
    time: "",
    endTime: "",
    location: "",
    theme: "",
    palette: ""
  },
  choices: {
    openingType: null, // Exige escolha explícita: 'long' | 'short' | 'none'
    openingPhoto: "none", // 'include' | 'none'
    music: { mode: "none", value: "" }, // mode: 'model_music' | 'name_or_link' | 'none'
    rsvp: "none", // 'whatsapp' | 'smart_form' | 'none'
    gifts: "none", // 'simple' | 'premium' | 'smart_list' | 'client_list' | 'none'
    manual: "none", // 'simple' | 'premium' | 'client' | 'none'
    countdown: "include", // 'include' | 'none'
    gallery: "none", // 'include' | 'none'
    sharedAlbum: "none", // 'include' | 'none' (independente do instagramFilter)
    instagramFilter: "none", // 'include' | 'none' (independente do sharedAlbum)
    saveTheDate: "none", // 'simple' | 'premium' | 'none'
    reminder: "none" // 'include' | 'none'
  },
  giftDetails: "",
  manualDetails: "",
  rsvpPhone: "",
  notes: "",
  doubts: [], // ids das etapas em que o cliente marcou "Tenho dúvida"
  // PII temporária NÃO salva no rascunho
  contact: {
    name: "",
    phone: ""
  }
};

let appState = JSON.parse(JSON.stringify(INITIAL_STATE));
const DEMO_GALLERY = [1, 2, 3, 4, 5].map(index => ({
  src: `../assets/gallery/debutante-${index}.jpg`,
  alt: `Foto fictícia de debutante, exemplo ${index} de 5`
}));
let countdownPreviewTimer = null;
let demoDialogOpener = null;
const demoDialog = document.getElementById("demo-dialog");
const demoDialogTitle = document.getElementById("demo-title");
const demoDialogContent = document.getElementById("demo-dialog-content");
const noticeDialog = document.getElementById("notice-dialog");
const noticeDialogTitle = document.getElementById("notice-title");
const noticeDialogMessage = document.getElementById("notice-message");
const noticeDialogConfirm = document.getElementById("notice-confirm");
const noticeDialogCancel = document.getElementById("notice-cancel");
let noticeDialogOpener = null;
let noticeDialogResolve = null;

function showNotice(message, { title = "Atenção", confirmLabel = "Entendi", cancelLabel = "" } = {}) {
  if (!noticeDialog || !noticeDialogTitle || !noticeDialogMessage || !noticeDialogConfirm) return Promise.resolve(false);
  if (noticeDialog.open) noticeDialog.close("cancel");
  return new Promise(resolve => {
    noticeDialogResolve = resolve;
    noticeDialogOpener = document.activeElement;
    noticeDialogTitle.textContent = title;
    noticeDialogMessage.textContent = message;
    noticeDialogConfirm.textContent = confirmLabel;
    noticeDialogCancel.hidden = !cancelLabel;
    if (cancelLabel) noticeDialogCancel.textContent = cancelLabel;
    noticeDialog.returnValue = "";
    noticeDialog.showModal();
    noticeDialogConfirm.focus();
  });
}

noticeDialogConfirm?.addEventListener("click", () => noticeDialog.close("confirm"));
noticeDialogCancel?.addEventListener("click", () => noticeDialog.close("cancel"));
noticeDialog?.addEventListener("click", event => {
  if (event.target === noticeDialog) noticeDialog.close("cancel");
});
noticeDialog?.addEventListener("close", () => {
  const resolve = noticeDialogResolve;
  const opener = noticeDialogOpener;
  noticeDialogResolve = null;
  noticeDialogOpener = null;
  resolve?.(noticeDialog.returnValue === "confirm");
  if (opener?.isConnected) opener.focus();
});

function getSelectedModelMedia() {
  const slug = appState.modelMode === "selected" ? appState.selectedModel?.slug : null;
  return slug ? MODEL_MEDIA.models?.[slug] || null : null;
}

function hydrateSelectedModel(model) {
  if (!model?.slug) return null;
  const catalogModel = MODEL_CATALOG.find(item => item.slug === model.slug);
  return {
    ...model,
    slug: String(model.slug),
    name: String(catalogModel?.name || model.name || model.slug),
    tema: String(catalogModel?.tema || model.tema || model.theme || ""),
    paleta_cores: String(catalogModel?.paleta_cores || model.paleta_cores || model.palette || ""),
    capa_path: String(catalogModel?.capa_path || model.capa_path || "assets/cover.jpg")
  };
}

function getSelectedModelCoverUrl(model) {
  if (!model?.slug) return "";
  try {
    const base = new URL(`https://pedidos.mforge.com.br/modelos/${encodeURIComponent(model.slug)}/`);
    const url = new URL(model.capa_path || "assets/cover.jpg", base);
    return url.origin === base.origin && url.pathname.startsWith(base.pathname) ? url.href : "";
  } catch (error) {
    return "";
  }
}

// "Eu quero" vira "Selecionado ✓" (preenchido) na opção escolhida; as demais ficam em contorno
function openingSelectButtonHtml(type) {
  const chosen = appState.openingChoiceConfirmed && appState.choices.openingType === type;
  return `<button type="button" class="btn ${chosen ? "btn-primary is-chosen" : "btn-outline"} opening-select-button" data-opening-select="${type}" aria-pressed="${chosen}">${chosen ? "Selecionado ✓" : "Eu quero"}</button>`;
}

function getSelectedModelThemeDefaults() {
  const model = appState.selectedModel || {};
  const name = model.name || model.slug || "modelo selecionado";
  return {
    theme: model.tema || model.theme || name,
    palette: model.paleta_cores || model.palette || "Cores originais do modelo"
  };
}

function syncSelectedModelThemeFields({ forceDefaults = false } = {}) {
  if (appState.modelMode !== "selected" || !appState.selectedModel) return;
  const defaults = getSelectedModelThemeDefaults();
  if (forceDefaults || !appState.choices.modelCustomization) {
    appState.event.theme = defaults.theme;
    appState.event.palette = defaults.palette;
    return;
  }
  if (!appState.event.theme) appState.event.theme = defaults.theme;
  if (!appState.event.palette) appState.event.palette = defaults.palette;
}

function modelAsset(path, media = getSelectedModelMedia()) {
  if (!path) return "";
  const slug = appState.modelMode === "selected" ? appState.selectedModel?.slug : null;
  const base = media?.baseUrl || (slug
    ? `https://pedidos.mforge.com.br/modelos/${encodeURIComponent(slug)}/`
    : MODEL_MEDIA.referenceDemo?.baseUrl || "https://pedidos.mforge.com.br/Convite_Temp/");
  try {
    const baseUrl = new URL(base);
    const assetUrl = new URL(path, baseUrl);
    if (assetUrl.origin !== "https://pedidos.mforge.com.br" || !assetUrl.pathname.startsWith(baseUrl.pathname)) return "";
    return assetUrl.href;
  } catch (error) {
    return "";
  }
}

function stopMediaIn(root) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  root.querySelectorAll("audio, video").forEach(media => {
    try { media.pause(); } catch (error) {}
    try {
      media.pause();
      media.removeAttribute("src");
      if (typeof media.load === "function") media.load();
    } catch (error) {}
    try { media.currentTime = 0; } catch (error) {}
  });
}

function disposeStepPreviews() {
  if (countdownPreviewTimer) {
    clearInterval(countdownPreviewTimer);
    countdownPreviewTimer = null;
  }
  stopMediaIn(document.getElementById("step-body-content"));
}

function showDemo(title, html, opener = document.activeElement, { builderV8GiftList = false } = {}) {
  if (!demoDialog || !demoDialogContent) return;
  const opening = !demoDialog.open;
  demoDialog.classList.toggle("demo-dialog--builder-v8-gift-list", builderV8GiftList);
  stopMediaIn(demoDialogContent);
  stopFilterCamera();
  demoDialogContent.querySelectorAll("iframe").forEach(frame => { frame.src = "about:blank"; });
  if (opening) {
    demoDialogOpener = opener;
    demoDialog.showModal();
  }
  demoDialogTitle.textContent = title;
  demoDialogContent.innerHTML = html;
  demoDialogContent.scrollTop = 0;
  if (opening) document.getElementById("demo-dialog-close")?.focus();
}

function closeDemo() {
  stopMediaIn(demoDialogContent);
  demoDialogContent?.querySelectorAll("iframe").forEach(frame => { frame.src = "about:blank"; });
  stopFilterCamera();
  if (demoDialog?.open) demoDialog.close();
}

function eventConfirmationTitle() {
  const name = appState.event.eventName.trim();
  if (appState.event.type === "Casamento") return "Confirme sua presença em nosso casamento!";
  if (appState.event.type === "15 anos") {
    return `Confirme sua presença nos 15 anos${name ? ` de ${name}` : ""}!`;
  }
  if (appState.event.type === "Formatura") return `Confirme sua presença na formatura${name ? ` de ${name}` : ""}!`;
  if (appState.event.type === "Aniversário") return `Confirme sua presença no aniversário${name ? ` de ${name}` : ""}!`;
  return `Confirme sua presença${name ? ` em ${name}` : " no evento"}!`;
}

function stopAllPreviewMedia() {
  disposeStepPreviews();
  stopMediaIn(demoDialog);
  stopFilterCamera();
}

function whatsappIconSvg() {
  return `<svg class="whatsapp-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.5 11.8a8.5 8.5 0 0 1-12.6 7.4l-4.4 1.2 1.2-4.3a8.5 8.5 0 1 1 15.8-4.3Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.3 7.2c-.3-.7-.7-.7-1-.7h-.7c-.3 0-.7.2-.9.6-.3.4-1.2 1.2-1.2 2.8s1.2 3.2 1.4 3.4c.2.2 2.4 3.8 5.8 5.2 2.8 1.1 3.4.9 4 .8.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.2-.7-.5l-2.1-1c-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.4-.2-1.5-.6-2.8-1.8-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6Z" fill="currentColor" transform="translate(5 5) scale(.58)"/></svg>`;
}

demoDialog?.addEventListener("click", event => {
  if (event.target === demoDialog) closeDemo();
});
demoDialog?.addEventListener("close", () => {
  if (demoDialog.open) return;
  stopMediaIn(demoDialog);
  demoDialogContent?.querySelectorAll("iframe").forEach(frame => { frame.src = "about:blank"; });
  stopFilterCamera();
  demoDialog.classList.remove("demo-dialog--builder-v8-gift-list");
  const opener = demoDialogOpener;
  demoDialogOpener = null;
  if (opener?.isConnected) opener.focus();
});
document.getElementById("demo-dialog-close")?.addEventListener("click", closeDemo);
window.addEventListener("pagehide", stopAllPreviewMedia);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopAllPreviewMedia();
});
window.addEventListener("message", async event => {
  if (event.data?.type !== "mforge:gift-list:copy-pix") return;
  const frame = demoDialogContent?.querySelector(".builder-v8-gift-frame");
  if (!frame || event.source !== frame.contentWindow) return;
  const value = String(event.data.value || "");
  if (!value.endsWith(".invalid")) {
    event.source.postMessage({ type: "mforge:gift-list:copy-pix-result", ok: false }, "*");
    return;
  }
  let ok = false;
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(value);
      ok = true;
    }
  } catch (error) {}
  if (!ok) {
    try {
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      ok = document.execCommand("copy");
      area.remove();
    } catch (error) {}
  }
  event.source.postMessage({ type: "mforge:gift-list:copy-pix-result", ok }, "*");
});

const STEP_DEFINITIONS = [
  { index: 1, id: "model", title: "Escolha do Modelo", subtitle: "Defina se usará um modelo da coleção ou criará um exclusivo", hint: "Pode trocar de modelo depois, se mudar de ideia." },
  { index: 2, id: "event", title: "Dados do Evento", subtitle: "Informações essenciais como data, hora, tipo e local", hint: "Dúvida em algum dado? A gente acerta com você no WhatsApp." },
  { index: 3, id: "opening", title: "Abertura Animada", subtitle: "Como o convite é apresentado na tela do convidado", hint: "Não sabe qual escolher? Fique com a que gostar mais." },
  { index: 4, id: "openingPhoto", title: "Foto na Abertura", subtitle: "Destaque emocional na entrada do convite", hint: "Não precisa ter a foto agora. A gente combina com você." },
  { index: 5, id: "music", title: "Música de Fundo", subtitle: "Trilha sonora para acompanhar a visualização", hint: "Ainda não decidiu a música? Tudo bem, a gente ajuda a escolher." },
  { index: 6, id: "rsvp", title: "Confirmação de Presença", subtitle: "Organize as confirmações dos seus convidados", hint: "Não entendeu como funciona? Tudo bem, a gente explica no whatsapp." },
  { index: 7, id: "gifts", title: "Sugestões de Presentes", subtitle: "Exiba listas, cotas Pix ou ideias de presentes", hint: "Não entendeu como funciona? Tudo bem, a gente explica no whatsapp." },
  { index: 8, id: "manual", title: "Manual do Convidado", subtitle: "Escolha como apresentar as orientações do seu evento", hint: "Não entendeu como funciona? Tudo bem, a gente explica no whatsapp." },
  { index: 9, id: "countdown", title: "Contagem Regressiva", subtitle: "Cronômetro ao vivo até o momento do evento", hint: "Na dúvida se vale a pena? A gente te orienta no WhatsApp." },
  { index: 10, id: "gallery", title: "Galeria de Fotos", subtitle: "Compartilhe momentos da festa no convite", hint: "Ainda não tem as fotos? Você envia depois." },
  { index: 11, id: "sharedPhotos", title: "Álbum e Filtro com QR Code", subtitle: "Escolha uma ou as duas opções para as fotos da festa", hint: "Pode deixar para decidir depois de ver como fica." },
  { index: 12, id: "saveTheDate", title: "Save The Date", subtitle: "Aviso antecipado em vídeo para reserva de data", hint: "Não sabe qual combina mais? A gente mostra a diferença no WhatsApp." },
  { index: 13, id: "reminder", title: "Lembrete Animado", subtitle: "Aviso especial para enviar dias antes da festa", hint: "Pode decidir junto com a gente, sem compromisso." },
  { index: 14, id: "review", title: "Revisão e Orçamento", subtitle: "Revise o orçamento e conclua pelo WhatsApp", hint: "Enviar não fecha o pedido: a gente conversa antes de qualquer pagamento." }
];
const STEP_COUNT = STEP_DEFINITIONS.length;
const OPENING_STEP = 3;
let openingAutoLocked = false;

// Modelos que só existem na abertura curta pulam a etapa de abertura e ficam travados nela.
function isShortOnlyModel() {
  if (appState.modelMode !== "selected" || !appState.selectedModel?.slug) return false;
  const catalogModel = MODEL_CATALOG.find(item => item.slug === appState.selectedModel.slug);
  const aberturas = catalogModel?.aberturas || [];
  return aberturas.length === 1 && aberturas[0] === "curta";
}

function syncOpeningLock() {
  if (isShortOnlyModel()) {
    openingAutoLocked = true;
    appState.choices.openingType = "short";
    appState.openingChoiceConfirmed = true;
  } else if (openingAutoLocked) {
    openingAutoLocked = false;
    appState.choices.openingType = null;
    appState.openingChoiceConfirmed = false;
  }
}

// Rola a tela (no celular, acima da barra fixa) até o que está pendente ficar visível.
function revealPending(el, delay = 0) {
  if (!el) return;
  setTimeout(() => {
    if (!el.isConnected) return;
    const rect = el.getBoundingClientRect();
    if (rect.top >= 72 && rect.bottom <= window.innerHeight - 96) return;
    const start = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const target = Math.max(0, Math.min(max, start + rect.top + rect.height / 2 - window.innerHeight / 2));
    const distance = target - start;
    if (Math.abs(distance) < 2) return;
    // Animação própria (easing): o "smooth" nativo é ignorado em aparelhos com movimento reduzido e vira um salto.
    const duration = Math.min(900, 400 + Math.abs(distance) * 0.4);
    const t0 = performance.now();
    let cancelled = false;
    const stop = () => { cancelled = true; };
    window.addEventListener("touchstart", stop, { once: true, passive: true });
    window.addEventListener("wheel", stop, { once: true, passive: true });
    const step = (now) => {
      if (cancelled) return;
      const k = Math.min(1, (now - t0) / duration);
      const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      window.scrollTo(0, start + distance * eased);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, delay);
}

function eventHasAge(type) {
  return type === "Aniversário" || type === "15 anos";
}

// Retorna { message, focusId } do primeiro campo obrigatório vazio da etapa, ou null.
function requiredFieldError(stepIdx) {
  if (stepIdx === 1 && appState.modelMode === "new") {
    if (!appState.event.theme) return { message: "Informe o tema do seu modelo para continuar.", focusId: "input-model-theme", errorId: "model-step-error" };
    if (!appState.event.palette) return { message: "Informe as cores do seu modelo para continuar.", focusId: "input-model-palette", errorId: "model-step-error" };
  }
  if (stepIdx === 2) {
    const e = appState.event;
    const locked = appState.modelMode === "selected" && Boolean(appState.selectedModel?.slug) && !appState.choices.modelCustomization;
    const checks = [
      [!e.eventName, "Informe o nome principal / homenageado.", "evt-name"],
      [eventHasAge(e.type) && !e.age, "Informe a idade.", "evt-age"],
      [!locked && !e.theme, "Informe o tema.", "evt-theme"],
      [!locked && !e.palette, "Informe a paleta de cores.", "evt-pal"]
    ];
    const failed = checks.find(([missing]) => missing);
    if (failed) return { message: failed[1], focusId: failed[2], errorId: "event-step-error" };
  }
  return null;
}

function stepAfter(index) {
  const next = index + 1;
  return next === OPENING_STEP && isShortOnlyModel() ? next + 1 : next;
}

function stepBefore(index) {
  const prev = index - 1;
  return prev === OPENING_STEP && isShortOnlyModel() ? prev - 1 : prev;
}

// Carregar Rascunho sem PII
function loadDraft() {
  try {
    // v1 included free text and phone fields; remove it before loading the safer format.
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && [2, 3, 4].includes(Number(parsed.version))) {
      const savedStep = Number(parsed.currentStepIndex);
      const migratedStep = Number(parsed.version) === 2 && savedStep >= 11 ? savedStep + 1 : savedStep;
      appState.currentStepIndex = Number.isInteger(migratedStep) && migratedStep >= 1 && migratedStep <= STEP_COUNT ? migratedStep : 1;
      appState.hasVisitedFinalReview = parsed.hasVisitedFinalReview === true || migratedStep === STEP_COUNT;
      const model = parsed.selectedModel;
      appState.selectedModel = model && typeof model.slug === "string"
        ? { slug: model.slug.slice(0, 160), name: String(model.name || model.slug).slice(0, 160) }
        : null;
      appState.modelMode = ["selected", "new", "none"].includes(parsed.modelMode) ? parsed.modelMode : "none";
      appState.event.type = EVENT_TYPES.includes(parsed.eventType) ? parsed.eventType : INITIAL_STATE.event.type;
      const savedChoices = parsed.choices || {};
      for (const [key, allowed] of Object.entries(ALLOWED_CHOICES)) {
        if (key === "openingType") continue;
        if (allowed.includes(savedChoices[key])) appState.choices[key] = savedChoices[key];
      }
      const savedOpeningType = savedChoices.openingType;
      const openingTypeIsValid = ["short", "long", "none"].includes(savedOpeningType);
      const openingWasExplicitlyChosen = Number(parsed.version) >= 4
        ? parsed.openingChoiceConfirmed === true && openingTypeIsValid
        : openingTypeIsValid && savedOpeningType !== "short";
      appState.openingChoiceConfirmed = openingWasExplicitlyChosen;
      appState.choices.openingType = openingWasExplicitlyChosen ? savedOpeningType : null;
      if (savedChoices.manual === "client") appState.choices.manual = "simple";
      const musicMode = ["model_music", "name_or_link", "none"].includes(savedChoices.musicMode)
        ? savedChoices.musicMode
        : INITIAL_STATE.choices.music.mode;
      appState.choices.music = { mode: musicMode, value: "" };
      const knownStepIds = STEP_DEFINITIONS.map(step => step.id);
      appState.doubts = Array.isArray(parsed.doubts) ? parsed.doubts.filter(id => knownStepIds.includes(id)) : [];
      if (Number(parsed.version) !== 4) saveDraft();
    }
  } catch (err) {
    console.warn("Rascunho não pôde ser lido de localStorage:", err);
  }
}

// Salvar Rascunho sem PII
function saveDraft() {
  try {
    // A abertura travada pelo modelo (só curta) não é escolha do cliente e não vai para o rascunho.
    const openingLocked = isShortOnlyModel();
    const toSave = {
      version: 4,
      currentStepIndex: appState.currentStepIndex,
      hasVisitedFinalReview: appState.hasVisitedFinalReview,
      openingChoiceConfirmed: openingLocked ? false : appState.openingChoiceConfirmed,
      selectedModel: appState.selectedModel ? {
        slug: appState.selectedModel.slug,
        name: appState.selectedModel.name || appState.selectedModel.slug
      } : null,
      modelMode: appState.modelMode,
      eventType: appState.event.type,
      doubts: appState.doubts,
      choices: {
        ...Object.fromEntries(Object.keys(ALLOWED_CHOICES).map(key => [key, appState.choices[key]])),
        musicMode: appState.choices.music?.mode || "none"
      }
    };
    if (openingLocked) toSave.choices.openingType = null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.warn("Rascunho não pôde ser gravado:", err);
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("selectedModel");
  } catch (e) {}
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete("modelo");
  window.history.replaceState({}, "", cleanUrl);
  appState = JSON.parse(JSON.stringify(INITIAL_STATE));
}

// Inicializar Verificando URL Query
function initModelFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const modelSlug = params.get("modelo");
  if (modelSlug) {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem("selectedModel") || "null");
    } catch (e) {}
    
    appState.selectedModel = saved && saved.slug === modelSlug ? saved : { slug: modelSlug, name: modelSlug };
    appState.modelMode = "selected";
  } else if (!appState.selectedModel) {
    try {
      const saved = JSON.parse(localStorage.getItem("selectedModel") || "null");
      if (saved) {
        appState.selectedModel = saved;
        appState.modelMode = "selected";
      }
    } catch (e) {}
  }
  if (appState.modelMode === "selected" && appState.selectedModel) {
    appState.selectedModel = hydrateSelectedModel(appState.selectedModel);
    syncSelectedModelThemeFields({ forceDefaults: true });
  }
}

// Renderizar Barra Lateral de Preço
function formatBudgetTotal(total) {
  return total === null ? "Escolha uma opção" : formatCurrency(total);
}

function getOpeningChoiceLabel() {
  if (appState.choices.openingType === "long") {
    const addOn = appState.modelMode === "selected" ? "" : ` (+${formatCurrency(PRICE_RULES.openingLong)})`;
    return `Abertura Longa${addOn}`;
  }
  if (appState.choices.openingType === "short") return "Abertura Curta";
  return "Sem abertura";
}

function updatePriceDisplays() {
  const { total, items } = calculateBudget(appState);
  
  // Sidebar
  const sidebarTotalEl = document.getElementById("sidebar-total");
  const sidebarListEl = document.getElementById("sidebar-items");
  if (sidebarTotalEl) sidebarTotalEl.textContent = formatBudgetTotal(total);
  if (sidebarListEl) {
    sidebarListEl.innerHTML = items.map(item => `
      <li class="sidebar-item">
        <span class="sidebar-item-name">${item.label}</span>
        <span class="sidebar-item-price">${formatCurrency(item.amount)}</span>
      </li>
    `).join("");
  }

  // Mobile Bar
  const mobileTotalEl = document.getElementById("mobile-total");
  if (mobileTotalEl) mobileTotalEl.textContent = formatBudgetTotal(total);
}

// Tranquilidade: sem pressa, nada é definitivo, atendimento segue no WhatsApp
function reassuranceHtml() {
  return `${whatsappIconSvg()}<span>Sem pressa. Nada aqui é definitivo: você ajusta tudo com a gente no WhatsApp antes de fechar.</span>`;
}

function welcomeHtml() {
  return `
    <ul class="welcome-points" aria-label="Como funciona o orçamento">
      <li><strong>Sem pressa.</strong> Escolha com calma e volte quando quiser.</li>
      <li><strong>Nada é definitivo.</strong> Tudo o que você marcar aqui pode mudar depois.</li>
      <li><strong>A gente atende você pelo WhatsApp.</strong> Tire todas as dúvidas antes de fechar o pedido.</li>
    </ul>`;
}

function doubtToggleHtml(def) {
  const active = appState.doubts.includes(def.id);
  return `
    <div class="doubt-row">
      <button type="button" class="doubt-toggle ${active ? "active" : ""}" id="btn-doubt" aria-pressed="${active}">
        <span class="doubt-mark" aria-hidden="true">${active ? "✓" : "?"}</span>
        <span id="doubt-label">${active ? "Anotado: vamos conversar sobre isso" : "Tenho dúvida nesta etapa"}</span>
      </button>
    </div>`;
}

function attachDoubtToggle(def) {
  const button = document.getElementById("btn-doubt");
  if (!button) return;
  button.addEventListener("click", () => {
    const active = !appState.doubts.includes(def.id);
    appState.doubts = active ? [...appState.doubts, def.id] : appState.doubts.filter(id => id !== def.id);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    button.querySelector(".doubt-mark").textContent = active ? "✓" : "?";
    document.getElementById("doubt-label").textContent = active ? "Anotado: vamos conversar sobre isso" : "Tenho dúvida nesta etapa";
    saveDraft();
  });
}

function doubtsLine() {
  const titles = STEP_DEFINITIONS
    .filter(step => appState.doubts.includes(step.id))
    .map(step => step.title);
  return titles.length ? titles.join(", ") : null;
}

// Renderizar Etapa Atual
function renderStep() {
  // Qualquer troca de etapa encerra o dialog e toda midia/camera ativa.
  closeDemo();
  disposeStepPreviews();
  syncOpeningLock();
  if (appState.currentStepIndex === OPENING_STEP && isShortOnlyModel()) appState.currentStepIndex = OPENING_STEP + 1;
  const stepIdx = appState.currentStepIndex;
  if (stepIdx === STEP_COUNT && !appState.hasVisitedFinalReview) {
    appState.hasVisitedFinalReview = true;
    saveDraft();
  }
  const def = STEP_DEFINITIONS.find(s => s.index === stepIdx) || STEP_DEFINITIONS[0];

  const container = document.getElementById("step-container");
  if (!container) return;

  const openingSkipped = isShortOnlyModel();
  const visibleCount = openingSkipped ? STEP_COUNT - 1 : STEP_COUNT;
  const visibleIdx = openingSkipped && stepIdx > OPENING_STEP ? stepIdx - 1 : stepIdx;
  const progressPercent = Math.round((visibleIdx / visibleCount) * 100);

  let stepHtml = `
    <div class="step-card" role="region" aria-labelledby="step-heading">
      <p class="reassure-strip">${reassuranceHtml()}</p>
      <div class="step-header">
        <div class="step-indicator">
          <span class="step-tag">Etapa ${visibleIdx} de ${visibleCount}</span>
          <span class="step-number">${progressPercent}% concluído</span>
        </div>
        <h2 id="step-heading" class="step-title" tabindex="-1">${def.title}</h2>
        <p class="step-description">${def.subtitle}</p>
        ${def.hint ? `<p class="step-hint">${def.hint}</p>` : ""}
        <div class="progress-track" aria-hidden="true">
          <div class="progress-fill" style="width: ${progressPercent}%;"></div>
        </div>
      </div>
      ${stepIdx === 1 ? welcomeHtml() : ""}
      <div class="step-body" id="step-body-content">
        ${getStepContentHtml(stepIdx)}
      </div>
      ${stepIdx < STEP_COUNT ? doubtToggleHtml(def) : ""}
      <div class="step-actions">
        <div class="step-actions-left">
          ${stepIdx === STEP_COUNT
            ? `<button type="button" class="btn btn-secondary" id="btn-step-prev">Voltar</button><button type="button" class="btn btn-outline" id="btn-step-restart">Começar outro orçamento</button>`
            : stepIdx > 1
              ? `<button type="button" class="btn btn-secondary" id="btn-step-prev">Voltar</button>`
              : `<button type="button" class="btn btn-outline" id="btn-step-restart">Recomeçar</button>`}
        </div>
        <div class="step-actions-center">
          ${stepIdx < STEP_COUNT ? `<button type="button" class="btn btn-primary" id="btn-step-next">Próximo</button>` : ""}
        </div>
        <div class="step-actions-right">
          ${appState.hasVisitedFinalReview && stepIdx < STEP_COUNT ? `<button type="button" class="btn btn-outline" id="btn-summary-final">Resumo Final</button>` : ""}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = stepHtml;
  updatePriceDisplays();
  attachStepHandlers(stepIdx);
  attachDoubtToggle(def);
  window.scrollTo({ top: container.offsetTop - 80, behavior: "smooth" });

  const heading = document.getElementById("step-heading");
  if (heading) heading.focus();
}

// HTML das 14 etapas
function getStepContentHtml(stepIdx) {
  switch (stepIdx) {
    case 1: { // Modelo
      const model = appState.modelMode === "selected" ? appState.selectedModel : null;
      const isSelected = appState.modelMode === "selected" && model;
      const isNew = appState.modelMode === "new";
      const hasCustomization = !!appState.choices.modelCustomization;

      return `
        <div class="options-grid">
          <div class="option-card ${isSelected ? 'selected' : ''}" data-model-mode="selected">
            <div class="option-card-head">
              <span class="option-label">Usar Modelo</span>
              <span class="option-price">${formatCurrency(BASE_PRICE)}</span>
            </div>
            ${model && getSelectedModelCoverUrl(model) ? `<figure class="selected-model-cover">
              <img src="${getSelectedModelCoverUrl(model)}" alt="Capa do convite ${escapeHtml(model.name || model.slug)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.closest('figure').hidden = true">
            </figure>` : ""}
            <p class="option-desc">${model ? `Selecionado: <strong>${escapeHtml(model.name || model.slug)}</strong>` : "Escolha um dos 143 modelos do nosso catálogo."}</p>
            <div style="margin-top: 8px;">
              <a href="../modelos.html" class="btn btn-secondary" style="font-size:0.85rem; padding: 6px 12px; width: 100%;">
                ${model ? "Trocar Modelo" : "Explorar Catálogo"}
              </a>
            </div>
            ${isSelected ? `<div class="model-customization-box" data-no-card-toggle>
              <label>
                <input type="checkbox" id="chk-model-custom" ${hasCustomization ? "checked" : ""}>
                <span>Quero trocar o tema e as cores deste modelo (+R$ 10)</span>
              </label>
              <div id="box-model-custom" style="margin-top: 10px; ${hasCustomization ? "" : "display:none;"}">
                <input type="text" id="input-model-custom" class="form-input" placeholder="Outros ajustes visuais que você gostaria de pedir (opcional)" value="${escapeHtml(appState.modelCustomization || "")}">
              </div>
            </div>` : ""}
          </div>

          <div class="option-card ${isNew ? 'selected' : ''}" data-model-mode="new">
            <div class="option-card-head">
              <span class="option-label">Criar Novo</span>
              <span class="option-price">${formatCurrency(BASE_PRICE + PRICE_RULES.modelNew)}</span>
            </div>
            <p class="option-desc">Conte seu tema e suas cores para pedir uma arte exclusiva.</p>
          </div>
        </div>

        <p id="model-step-error" class="form-error" role="alert" hidden></p>
        ${isNew ? `
          <div class="form-grid" style="margin-top: 16px;">
            <div class="form-group">
              <label class="form-label" for="input-model-theme">Tema *</label>
              <input type="text" id="input-model-theme" class="form-input" required aria-required="true" placeholder="Ex.: Floresta Mágica" value="${escapeHtml(appState.event.theme || "")}">
            </div>
            <div class="form-group">
              <label class="form-label" for="input-model-palette">Cores *</label>
              <input type="text" id="input-model-palette" class="form-input" required aria-required="true" placeholder="Ex.: Esmeralda e Dourado" value="${escapeHtml(appState.event.palette || "")}">
            </div>
          </div>
        ` : ""}
      `;
    }

    case 2: { // Evento
      const e = appState.event;
      const isSelectedModel = appState.modelMode === "selected" && Boolean(appState.selectedModel?.slug);
      const themeFieldsLocked = isSelectedModel && !appState.choices.modelCustomization;
      const lockedBadgeHtml = `<span class="form-label-locked" data-locked-badge>🔒 Definido pelo modelo</span>`;
      const missingModelDetails = [];
      if (isSelectedModel && !appState.selectedModel?.tema) missingModelDetails.push("tema");
      if (isSelectedModel && !appState.selectedModel?.paleta_cores) missingModelDetails.push("paleta de cores");
      const modelDetailsHelp = missingModelDetails.length
        ? `<p class="form-help col-full">O catálogo não informa ${missingModelDetails.join(" e ")} deste modelo; os campos preservam o nome e as cores originais. Ative a opção acima para editar.</p>`
        : "";
      return `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="evt-type">Tipo de Evento</label>
            <select id="evt-type" class="form-select">
              <option value="Aniversário" ${e.type === "Aniversário" ? "selected" : ""}>Aniversário</option>
              <option value="15 anos" ${e.type === "15 anos" ? "selected" : ""}>15 anos (Debutante)</option>
              <option value="Casamento" ${e.type === "Casamento" ? "selected" : ""}>Casamento</option>
              <option value="Formatura" ${e.type === "Formatura" ? "selected" : ""}>Formatura</option>
              <option value="Outro" ${e.type === "Outro" ? "selected" : ""}>Outro</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="evt-name">Nome Principal / Homenageado *</label>
            <input id="evt-name" type="text" class="form-input" required aria-required="true" placeholder="Ex.: Lívia Maia" value="${escapeHtml(e.eventName)}">
          </div>
          <div class="form-group" id="evt-age-group" ${eventHasAge(e.type) ? "" : "hidden"}>
            <label class="form-label" for="evt-age">Idade *</label>
            <input id="evt-age" type="number" min="0" class="form-input" required aria-required="true" placeholder="Ex.: 15" value="${escapeHtml(e.age)}">
          </div>
          <div class="form-group">
            <label class="form-label" for="evt-date">Data do Evento</label>
            <input id="evt-date" type="date" class="form-input" value="${escapeHtml(e.date)}">
          </div>
          <div class="form-group">
            <label class="form-label" for="evt-time">Horário de Início</label>
            <input id="evt-time" type="time" class="form-input" value="${escapeHtml(e.time)}">
          </div>
          <div class="form-group">
            <label class="form-label" for="evt-endtime">Horário de Término</label>
            <input id="evt-endtime" type="time" class="form-input" value="${escapeHtml(e.endTime)}">
          </div>
          <div class="form-group col-full">
            <label class="form-label" for="evt-loc">Local do Evento</label>
            <input id="evt-loc" type="text" class="form-input" placeholder="Nome do salão, espaço ou endereço completo" value="${escapeHtml(e.location)}">
          </div>
          ${isSelectedModel ? `<div class="form-group col-full theme-customization-toggle">
            <label class="theme-customization-label" for="chk-event-theme-custom">
              <input type="checkbox" id="chk-event-theme-custom" ${appState.choices.modelCustomization ? "checked" : ""}>
              <span><strong>Quero trocar o tema e as cores deste modelo</strong><small>Ao ativar, você pode editar os campos abaixo (+R$ 10).</small></span>
            </label>
          </div>` : ""}
          <div class="form-group">
            <label class="form-label" for="evt-theme">Tema${themeFieldsLocked ? lockedBadgeHtml : " *"}</label>
            <input id="evt-theme" type="text" class="form-input" placeholder="Ex.: Jardim Encantado" value="${escapeHtml(e.theme)}" ${themeFieldsLocked ? "disabled aria-disabled=\"true\"" : ""}>
          </div>
          <div class="form-group">
            <label class="form-label" for="evt-pal">Paleta de Cores${themeFieldsLocked ? lockedBadgeHtml : " *"}</label>
            <input id="evt-pal" type="text" class="form-input" placeholder="Ex.: Rosé, Dourado e Branco" value="${escapeHtml(e.palette)}" ${themeFieldsLocked ? "disabled aria-disabled=\"true\"" : ""}>
          </div>
          ${modelDetailsHelp}
        </div>
        <p id="event-step-error" class="form-error" role="alert" hidden></p>
      `;
    }

    case 3: { // Abertura
      const cur = appState.choices.openingType;
      const isSelectedModel = appState.modelMode === "selected" && Boolean(appState.selectedModel?.slug);
      const openingLongPrice = isSelectedModel ? "Sem adicional" : `+${formatCurrency(PRICE_RULES.openingLong)}`;
      return `
        <div class="options-grid opening-options-grid">
          <div class="option-card ${appState.openingChoiceConfirmed && cur === 'short' ? 'selected' : ''}" data-opening="short">
            <div class="option-card-head">
              <span class="option-label">Abertura Curta</span>
              <span class="option-price">Sem adicional</span>
            </div>
            <p class="option-desc">O envelope abre e o convite é revelado</p>
            <div class="opening-card-actions">
              ${openingSelectButtonHtml("short")}
              <button type="button" class="btn btn-secondary opening-test-button" data-demo-action="opening-short">Testar</button>
            </div>
          </div>
          <div class="option-card ${appState.openingChoiceConfirmed && cur === 'long' ? 'selected' : ''}" data-opening="long">
            <div class="option-card-head">
              <span class="option-label">Abertura Longa</span>
              <span class="option-price">${openingLongPrice}</span>
            </div>
            <p class="option-desc">O envelope abre e algumas cenas passam na tela antes do convite ser revelado</p>
            <div class="opening-card-actions">
              ${openingSelectButtonHtml("long")}
              <button type="button" class="btn btn-secondary opening-test-button" data-demo-action="opening-long">Testar</button>
            </div>
          </div>
          <div class="option-card ${appState.openingChoiceConfirmed && cur === 'none' ? 'selected' : ''}" data-opening="none">
            <div class="option-card-head">
              <span class="option-label">Sem Abertura</span>
              <span class="option-price">Sem adicional</span>
            </div>
            <p class="option-desc">O convite abre direto nos dados do evento.</p>
            ${openingSelectButtonHtml("none")}
          </div>
        </div>
        <p id="opening-step-error" class="form-error" role="alert" hidden></p>
      `;
    }

    case 4: { // Foto na abertura
      const cur = appState.choices.openingPhoto;
      return `
        <div class="options-grid">
          <div class="option-card ${cur === 'include' ? 'selected' : ''}" data-photo="include">
            <div class="option-card-head">
              <span class="option-label">Incluir Foto na Abertura</span>
              <span class="option-price">+R$ 5</span>
            </div>
            <p class="option-desc">Sua foto preferida inserida no momento da abertura do envelope.</p>
          </div>
          <div class="option-card ${cur === 'none' ? 'selected' : ''}" data-photo="none">
            <div class="option-card-head">
              <span class="option-label">Não Incluir</span>
              <span class="option-price">Sem adicional</span>
            </div>
            <p class="option-desc">Abertura focada apenas nos detalhes gráficos e nomes.</p>
          </div>
        </div>
        <p class="form-help" style="margin-top: 12px;">A foto poderá ser enviada no WhatsApp após a confirmação do pedido.</p>
      `;
    }

    case 5: { // Música
      const m = appState.choices.music || { mode: "none", value: "" };
      const selectedMedia = getSelectedModelMedia();
      const hasSelectedModel = appState.modelMode === "selected" && Boolean(appState.selectedModel?.slug);
      const modelMusicUrl = hasSelectedModel && selectedMedia?.musicPath
        ? modelAsset(selectedMedia.musicPath, selectedMedia)
        : "";
      return `
        <div class="options-grid">
          <div class="option-card ${m.mode === 'name_or_link' ? 'selected' : ''}" data-music-mode="name_or_link">
            <div class="option-card-head">
              <span class="option-label">Nova música</span>
              <span class="option-price">Sem adicional</span>
            </div>
            <p class="option-desc">Informe o nome da canção ou um link do YouTube / Spotify.</p>
            ${m.mode === 'name_or_link' ? `
              <div class="option-inline-field">
                <label class="form-label" for="music-text">Nome ou link da música</label>
                <input type="text" id="music-text" class="form-input" placeholder="Ex.: Ed Sheeran - Perfect ou link do YouTube" value="${escapeHtml(m.value || "")}">
              </div>` : ""}
          </div>
          ${modelMusicUrl ? `<div class="option-card model-music-card ${m.mode === 'model_music' ? 'selected' : ''}" data-music-mode="model_music">
            <div class="option-card-head">
              <span class="option-label">Música do modelo</span>
              <span class="option-price">Sem adicional</span>
            </div>
            <p class="option-desc">Usar a mesma música que já está no modelo que você selecionou.</p>
            <div class="model-music-player" data-model-music-player>
              <button type="button" class="music-play-button" data-music-play aria-label="Reproduzir música do modelo">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>
              </button>
              <div class="music-track-wrap">
                <div class="music-time-row"><span data-music-current>0:00</span><span class="music-time-separator" aria-hidden="true">/</span><span data-music-duration>0:00</span></div>
                <input type="range" class="music-timeline" data-music-timeline min="0" max="100" value="0" step="0.1" aria-label="Posição da música do modelo">
              </div>
              <audio id="model-music-audio" src="${escapeHtml(modelMusicUrl)}" preload="metadata"></audio>
            </div>
            <p class="music-player-status" data-music-status role="status">Toque em reproduzir para ouvir.</p>
          </div>` : ""}
          ${hasSelectedModel && !selectedMedia?.musicPath ? `<p class="form-help">Este modelo não tem uma música padrão cadastrada.</p>` : ""}
          <div class="option-card ${m.mode === 'none' ? 'selected' : ''}" data-music-mode="none">
            <div class="option-card-head">
              <span class="option-label">Sem Música</span>
              <span class="option-price">Sem adicional</span>
            </div>
            <p class="option-desc">O convite abrirá silenciosamente.</p>
          </div>
        </div>
      `;
    }

    case 6: { // RSVP
      const cur = appState.choices.rsvp;
      return `
        <div class="options-grid">
          <div class="option-card ${cur === 'whatsapp' ? 'selected' : ''}" data-rsvp="whatsapp">
            <div class="option-card-head">
              <span class="option-label">Direto no WhatsApp</span>
              <span class="option-price">Sem adicional</span>
            </div>
            <p class="option-desc">O convidado confirma pelo próprio WhatsApp.</p>
            ${cur === "whatsapp" ? `<div class="option-inline-field" data-no-card-toggle><label class="form-label" for="rsvp-phone-input">Número do WhatsApp que receberá as confirmações:</label><input type="tel" id="rsvp-phone-input" class="form-input" placeholder="(11) 99999-9999" value="${escapeHtml(appState.rsvpPhone || "")}"></div>` : ""}
            <button type="button" class="demo-text-button" data-demo-action="rsvp-whatsapp">Ver exemplo</button>
          </div>
          <div class="option-card ${cur === 'smart_form' ? 'selected' : ''}" data-rsvp="smart_form">
            <div class="option-card-head">
              <span class="option-label">Formulário Inteligente</span>
              <span class="option-price">+R$ 5</span>
            </div>
            <p class="option-desc">Organize respostas e acompanhe sua lista de convidados.</p>
            <button type="button" class="demo-text-button" data-demo-action="rsvp-smart">Ver exemplo</button>
          </div>
          <div class="option-card ${cur === 'none' ? 'selected' : ''}" data-rsvp="none">
            <div class="option-card-head">
              <span class="option-label">Sem Confirmação</span>
              <span class="option-price">Sem adicional</span>
            </div>
            <p class="option-desc">Não incluir botão de RSVP no convite.</p>
          </div>
        </div>

      `;
    }

    case 7: { // Presentes
      const cur = appState.choices.gifts;
      return `
        <div class="options-grid">
          <div class="option-card ${cur === 'simple' ? 'selected' : ''}" data-gifts="simple">
            <div class="option-card-head">
              <span class="option-label">Sugestões Simples</span>
              <span class="option-price">Sem adicional</span>
            </div>
            <p class="option-desc">Uma mensagem com tamanhos, ideias e informações úteis.</p>
            ${cur === "simple" ? `<div class="option-inline-field" data-no-card-toggle><label class="form-label" for="gift-details-input">Descreva as sugestões de presente:</label><textarea id="gift-details-input" class="form-textarea" placeholder="Escreva as sugestões e informações que deseja exibir aos convidados.">${escapeHtml(appState.giftDetails || "")}</textarea></div>` : ""}
            <button type="button" class="demo-text-button" data-demo-action="gift-simple">Ver exemplo</button>
          </div>
          <div class="option-card ${cur === 'premium' ? 'selected' : ''}" data-gifts="premium">
            <div class="option-card-head">
              <span class="option-label">Sugestões Premium</span>
              <span class="option-price">+R$ 5</span>
            </div>
            <p class="option-desc">Sugestões apresentadas em cartões visuais.</p>
            ${cur === "premium" ? `<div class="option-inline-field" data-no-card-toggle><label class="form-label" for="gift-details-input">Descreva as sugestões de presente:</label><textarea id="gift-details-input" class="form-textarea" placeholder="Escreva as sugestões e informações que deseja exibir aos convidados.">${escapeHtml(appState.giftDetails || "")}</textarea></div>` : ""}
            <button type="button" class="demo-text-button" data-demo-action="gift-premium">Ver exemplo</button>
          </div>
          <div class="option-card ${cur === 'smart_list' ? 'selected' : ''}" data-gifts="smart_list">
            <div class="option-card-head">
              <span class="option-label">Lista Inteligente</span>
              <span class="option-price">+R$ 15</span>
            </div>
            <p class="option-desc">Escolha um presente e veja a reserva e o Pix pelo fluxo do convidado.</p>
            <small class="gift-demo-note">Exemplo do v8. Ações locais; nada é salvo.</small>
            <button type="button" class="demo-text-button" data-demo-action="gift-smart">Ver exemplo</button>
          </div>
          <div class="option-card ${cur === 'client_list' ? 'selected' : ''}" data-gifts="client_list">
            <div class="option-card-head">
              <span class="option-label">Link de Lista Externa</span>
              <span class="option-price">Sem adicional</span>
            </div>
            <p class="option-desc">Um botão leva o convidado à lista que você já usa.</p>
            <button type="button" class="demo-text-button" data-demo-action="gift-link">Ver exemplo</button>
          </div>
          <div class="option-card ${cur === 'none' ? 'selected' : ''}" data-gifts="none">
            <div class="option-card-head">
              <span class="option-label">Sem Dicas de Presente</span>
              <span class="option-price">Sem adicional</span>
            </div>
            <p class="option-desc">Não incluir seção de presentes no convite.</p>
          </div>
        </div>

      `;
    }

    case 8: { // Manual do convidado
      const cur = appState.choices.manual;
      const manualText = appState.manualDetails || (cur === "simple" ? MANUAL_SIMPLE_DEFAULT : "");
      return `
        <div class="options-grid">
          <div class="option-card ${cur === 'simple' ? 'selected' : ''}" data-manual="simple">
            <div class="option-card-head">
              <span class="option-label">Manual Simples</span>
              <span class="option-price">Sem adicional</span>
            </div>
            <p class="option-desc">Você escreve as orientações; elas aparecem no formato padrão do manual.</p>
            ${cur === "simple" ? `<div class="option-inline-field" data-no-card-toggle><label class="form-label" for="manual-details-input">O que você quer informar aos convidados?</label><textarea id="manual-details-input" class="form-textarea" placeholder="Digite as orientações que deseja incluir no manual.">${escapeHtml(manualText)}</textarea></div>` : ""}
            <button type="button" class="demo-text-button" data-demo-action="manual-simple">Ver exemplo</button>
          </div>
          <div class="option-card ${cur === 'premium' ? 'selected' : ''}" data-manual="premium">
            <div class="option-card-head">
              <span class="option-label">Manual Premium</span>
              <span class="option-price">+R$ 5</span>
            </div>
            <p class="option-desc">Seu conteúdo em uma página visual, organizada por assunto.</p>
            ${cur === "premium" ? `<div class="option-inline-field" data-no-card-toggle><label class="form-label" for="manual-details-input">O que você quer informar aos convidados?</label><textarea id="manual-details-input" class="form-textarea" placeholder="Digite as orientações que deseja incluir no manual.">${escapeHtml(appState.manualDetails || "")}</textarea></div>` : ""}
            <button type="button" class="demo-text-button" data-demo-action="manual-premium">Ver exemplo</button>
          </div>
          <div class="option-card ${cur === 'none' ? 'selected' : ''}" data-manual="none">
            <div class="option-card-head">
              <span class="option-label">Sem Manual</span>
              <span class="option-price">Sem adicional</span>
            </div>
            <p class="option-desc">Não incluir seção de dicas/manual no convite.</p>
          </div>
        </div>

      `;
    }

    case 9: { // Cronômetro
      const cur = appState.choices.countdown;
      return `
        <section class="countdown-stage" aria-label="Prévia da contagem regressiva">
          ${appState.event.eventName ? `<h3>${escapeHtml(appState.event.eventName)}</h3>` : ""}
          <div class="countdown-preview-units" aria-live="off">
            <div><strong data-countdown-unit="days">--</strong><span>dias</span></div>
            <div><strong data-countdown-unit="hours">--</strong><span>horas</span></div>
            <div><strong data-countdown-unit="minutes">--</strong><span>min</span></div>
            <div><strong data-countdown-unit="seconds">--</strong><span>seg</span></div>
          </div>
          ${appState.event.date ? `<p data-countdown-caption>Contagem até a data do seu evento.</p>` : ""}
        </section>
        <div class="options-grid">
          <div class="option-card ${cur === 'include' ? 'selected' : ''}" data-countdown="include">
            <div class="option-card-head">
              <span class="option-label">Incluir Cronômetro</span>
              <span class="option-price">Sem adicional</span>
            </div>
            <p class="option-desc">Contador decrescente de dias, horas e minutos até o evento.</p>
          </div>
          <div class="option-card ${cur === 'none' ? 'selected' : ''}" data-countdown="none">
            <div class="option-card-head">
              <span class="option-label">Sem Cronômetro</span>
              <span class="option-price">Não incluir</span>
            </div>
            <p class="option-desc">Exibir apenas a data e horário estáticos.</p>
          </div>
        </div>
      `;
    }

    case 10: { // Galeria do convite
      const cur = appState.choices.gallery;
      return `
        <div class="options-grid">
          <div class="option-card ${cur === 'include' ? 'selected' : ''}" data-gallery="include">
            <div class="option-card-head">
              <span class="option-label">Incluir Galeria de Fotos</span>
              <span class="option-price">+R$ 5</span>
            </div>
            <p class="option-desc">Um espaço no convite para reunir fotos do casal, da debutante ou do aniversariante.</p>
          </div>
          <div class="option-card ${cur === 'none' ? 'selected' : ''}" data-gallery="none">
            <div class="option-card-head">
              <span class="option-label">Sem Galeria</span>
              <span class="option-price">Não incluir</span>
            </div>
            <p class="option-desc">O convite fica sem uma galeria de fotos.</p>
          </div>
        </div>
        <button type="button" class="example-open-button" data-demo-action="open-gallery">Abrir Galeria Exemplo</button>
      `;
    }

    case 11: { // Álbum compartilhado e filtro: etapa independente da galeria do convite
      const sharedAlbumOn = appState.choices.sharedAlbum === "include";
      const filterOn = appState.choices.instagramFilter === "include";
      const isBundle = sharedAlbumOn && filterOn;
      const isNone = !sharedAlbumOn && !filterOn;
      const bundleHint = isBundle
        ? `Os dois juntos: ${formatCurrency(PRICE_RULES.bundle)} no total. Usam o mesmo QR Code.`
        : sharedAlbumOn
          ? `Álbum selecionado: ${formatCurrency(PRICE_RULES.sharedAlbum)}. Se incluir o filtro também, os dois ficam por ${formatCurrency(PRICE_RULES.bundle)} no total.`
          : filterOn
            ? `Filtro selecionado: ${formatCurrency(PRICE_RULES.instagramFilter)}. Se incluir o álbum também, os dois ficam por ${formatCurrency(PRICE_RULES.bundle)} no total.`
            : `Cada opção custa ${formatCurrency(PRICE_RULES.sharedAlbum)}. Escolhendo as duas, o total cai para ${formatCurrency(PRICE_RULES.bundle)} e elas funcionam juntas no mesmo QR Code.`;
      return `
        <section class="after-party-section" aria-labelledby="after-party-heading">
          <div class="after-party-head">
            <h3 id="after-party-heading" class="after-party-title">Fotos da festa com um QR Code</h3>
            
          </div>

          <div class="after-party-grid">
            <article class="after-party-card option-card ${sharedAlbumOn ? 'selected' : ''}" data-shared-album-option role="button" tabindex="0" aria-pressed="${sharedAlbumOn}">
              <div class="option-card-head">
                <span class="option-label">Álbum Compartilhado</span>
                <span class="option-price">${formatCurrency(PRICE_RULES.sharedAlbum)} cada</span>
              </div>
              <p class="option-desc">Coloque o QR Code nos cardápios, em cartões ou num cartaz. O convidado tira fotos pela câmera aberta no QR Code, e elas aparecem no álbum online que você acessa.</p>
              <figure class="after-party-media">
                <img src="../assets/examples/qr-album-compartilhado.svg" alt="QR Code fictício de exemplo para o álbum compartilhado" loading="lazy">
                <figcaption>QR Code fictício de demonstração.</figcaption>
              </figure>
            </article>

            <article class="after-party-card option-card ${filterOn ? 'selected' : ''}" data-instagram-filter-option role="button" tabindex="0" aria-pressed="${filterOn}">
              <div class="option-card-head">
                <span class="option-label">Filtro para Instagram</span>
                <span class="option-price">${formatCurrency(PRICE_RULES.instagramFilter)} cada</span>
              </div>
              <p class="option-desc">O QR Code abre a câmera com uma moldura no tema da festa. A foto fica no celular do convidado para baixar ou compartilhar.</p>
              <figure class="after-party-media">
                <img src="../assets/examples/filtro-exemplo.png" alt="Moldura de exemplo para o filtro da festa" loading="lazy">
                <figcaption>Prévia da moldura no formato vertical do Instagram.</figcaption>
              </figure>
              <button type="button" class="demo-text-button" data-demo-action="test-filter">Ver exemplo</button>
            </article>
            <article class="after-party-card option-card after-party-none-card ${isNone ? 'selected' : ''}" data-after-party-none role="button" tabindex="0" aria-pressed="${isNone}">
              <div class="option-card-head">
                <span class="option-label">Não incluir</span>
                <span class="option-price">Sem adicional</span>
              </div>
              <p class="option-desc">Não adicionar álbum compartilhado nem filtro para Instagram.</p>
            </article>
          </div>

          <p class="bundle-hint" data-bundle-hint role="status" aria-live="polite">${bundleHint}</p>
        </section>
      `;
    }

    case 12: { // Save the date
      const cur = appState.choices.saveTheDate;
      return `
        <div class="options-grid">
          <div class="option-card ${cur === 'simple' ? 'selected' : ''}" data-std="simple">
            <div class="option-card-head">
              <span class="option-label">Save the Date Simples</span>
              <span class="option-price">+R$ 25</span>
            </div>
            <p class="option-desc">Um vídeo curto para seus convidados reservarem a data.</p>
            <button type="button" class="demo-text-button" data-demo-action="save-date-simple">Assistir exemplo</button>
            <p class="sample-note">Esse é apenas um exemplo em outro tema.</p>
          </div>
          <div class="option-card ${cur === 'premium' ? 'selected' : ''}" data-std="premium">
            <div class="option-card-head">
              <span class="option-label">Save the Date Premium</span>
              <span class="option-price">+R$ 50</span>
            </div>
            <p class="option-desc">Uma versão com apresentação visual mais elaborada.</p>
            <p class="asset-pending-preview"><strong>Exemplo em preparação.</strong><span>Esta prévia será adicionada quando o arquivo estiver pronto.</span></p>
          </div>
          <div class="option-card ${cur === 'none' ? 'selected' : ''}" data-std="none">
            <div class="option-card-head">
              <span class="option-label">Não incluir</span>
              <span class="option-price">Sem adicional</span>
            </div>
            <p class="option-desc">Seguir apenas com o convite oficial.</p>
          </div>
        </div>
      `;
    }

    case 13: { // Lembrete
      const cur = appState.choices.reminder;
      return `
        <div class="options-grid">
          <div class="option-card ${cur === 'include' ? 'selected' : ''}" data-reminder="include">
            <div class="option-card-head">
              <span class="option-label">Incluir Lembrete</span>
              <span class="option-price">+R$ 25</span>
            </div>
            <p class="option-desc">Um vídeo com música para lembrar os convidados perto da data.</p>
            <button type="button" class="demo-text-button" data-demo-action="reminder-example">Assistir exemplo</button>
          </div>
          <div class="option-card ${cur === 'none' ? 'selected' : ''}" data-reminder="none">
            <div class="option-card-head">
              <span class="option-label">Não incluir</span>
              <span class="option-price">Sem adicional</span>
            </div>
            <p class="option-desc">Não incluir serviço de lembrete.</p>
          </div>
        </div>

        <div style="margin-top: 16px;">
          <label class="form-label" for="notes-input">Observações adicionais para a equipe (opcional):</label>
          <p class="step-hint step-hint-inline">Escreva do seu jeito. A gente organiza para você.</p>
          <textarea id="notes-input" class="form-textarea" placeholder="Algum detalhe especial ou dúvida que você queira registrar...">${escapeHtml(appState.notes || "")}</textarea>
        </div>
      `;
    }

    case 14: { // Revisão Final e Contato
      const { total } = calculateBudget(appState);
      const afterPartyLabel = describeAfterPartyChoices(appState.choices).lines.join(", ") || null;
      const mName = appState.modelMode === "new"
        ? "Modelo Novo Exclusivo"
        : appState.modelMode === "selected"
          ? appState.selectedModel?.name || appState.selectedModel?.slug || "Modelo da coleção"
          : "Não selecionado";

      return `
        <div class="review-summary-card">
          <div class="review-section-row">
            <div class="review-section-content">
              <span class="review-section-label">Modelo</span>
              <span class="review-section-val">${escapeHtml(mName)}</span>
            </div>
            <button type="button" class="review-btn-edit" data-jump-to="1">Editar</button>
          </div>

          <div class="review-section-row">
            <div class="review-section-content">
              <span class="review-section-label">Evento</span>
              <span class="review-section-val">${escapeHtml(appState.event.eventName || "Nome não informado")} · ${escapeHtml(appState.event.date || "Data a definir")}</span>
            </div>
            <button type="button" class="review-btn-edit" data-jump-to="2">Editar</button>
          </div>

          <div class="review-section-row">
            <div class="review-section-content">
              <span class="review-section-label">Abertura</span>
              <span class="review-section-val">${getOpeningChoiceLabel()} ${appState.choices.openingPhoto === 'include' ? '(Com foto +R$5)' : ''}</span>
            </div>
            ${isShortOnlyModel() ? "" : `<button type="button" class="review-btn-edit" data-jump-to="3">Editar</button>`}
          </div>

          <div class="review-section-row">
            <div class="review-section-content">
              <span class="review-section-label">Música</span>
              <span class="review-section-val">${appState.choices.music?.mode === 'model_music' ? 'Música do modelo' : escapeHtml(appState.choices.music?.value || (appState.choices.music?.mode === 'none' ? 'Sem música' : 'A definir'))}</span>
            </div>
            <button type="button" class="review-btn-edit" data-jump-to="5">Editar</button>
          </div>

          <div class="review-section-row">
            <div class="review-section-content">
              <span class="review-section-label">Confirmação de Presença</span>
              <span class="review-section-val">${appState.choices.rsvp === 'smart_form' ? 'Formulário Inteligente (+R$5)' : appState.choices.rsvp === 'whatsapp' ? `WhatsApp (${escapeHtml(appState.rsvpPhone || 'não informado')})` : 'Sem confirmação'}</span>
            </div>
            <button type="button" class="review-btn-edit" data-jump-to="6">Editar</button>
          </div>

          <div class="review-section-row">
            <div class="review-section-content">
              <span class="review-section-label">Presentes</span>
              <span class="review-section-val">${appState.choices.gifts === 'smart_list' ? 'Lista Inteligente (+R$15)' : appState.choices.gifts === 'premium' ? 'Sugestões Premium (+R$5)' : appState.choices.gifts === 'client_list' ? 'Link Externo' : appState.choices.gifts === 'simple' ? 'Sugestões Simples' : 'Sem presentes'}</span>
            </div>
            <button type="button" class="review-btn-edit" data-jump-to="7">Editar</button>
          </div>

          <div class="review-section-row">
            <div class="review-section-content">
              <span class="review-section-label">Manual do Convidado</span>
              <span class="review-section-val">${appState.choices.manual === 'none' ? 'Não incluir' : appState.choices.manual === 'premium' ? 'Manual Premium' : 'Manual Simples'}</span>
            </div>
            <button type="button" class="review-btn-edit" data-jump-to="8">Editar</button>
          </div>

          <div class="review-section-row">
            <div class="review-section-content">
              <span class="review-section-label">Contagem Regressiva</span>
              <span class="review-section-val">${appState.choices.countdown === 'include' ? 'Incluir cronômetro' : 'Não incluir'}</span>
            </div>
            <button type="button" class="review-btn-edit" data-jump-to="9">Editar</button>
          </div>

          <div class="review-section-row">
            <div class="review-section-content">
              <span class="review-section-label">Galeria do Convite</span>
              <span class="review-section-val">${appState.choices.gallery === 'include' ? 'Galeria de Fotos (+R$5)' : 'Não incluir'}</span>
            </div>
            <button type="button" class="review-btn-edit" data-jump-to="10">Editar</button>
          </div>

          <div class="review-section-row">
            <div class="review-section-content">
              <span class="review-section-label">Fotos por QR Code</span>
              <span class="review-section-val">${afterPartyLabel || 'Não incluir'}</span>
            </div>
            <button type="button" class="review-btn-edit" data-jump-to="11">Editar</button>
          </div>

          <div class="review-section-row">
            <div class="review-section-content">
              <span class="review-section-label">Save the Date</span>
              <span class="review-section-val">${appState.choices.saveTheDate === 'simple' ? 'Simples (+R$25)' : appState.choices.saveTheDate === 'premium' ? 'Premium (+R$50)' : 'Não incluir'}</span>
            </div>
            <button type="button" class="review-btn-edit" data-jump-to="12">Editar</button>
          </div>

          <div class="review-section-row">
            <div class="review-section-content">
              <span class="review-section-label">Lembrete Animado</span>
              <span class="review-section-val">${appState.choices.reminder === 'include' ? 'Incluir (+R$25)' : 'Não incluir'}</span>
            </div>
            <button type="button" class="review-btn-edit" data-jump-to="13">Editar</button>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: baseline; padding-top: 12px; margin-top: 8px; border-top: 2px solid var(--color-wine);">
            <strong style="font-size: 1.1rem; color: var(--color-ink);">Total Calculado:</strong>
            <strong style="font-size: 1.6rem; font-family: var(--font-serif); color: var(--color-wine-dark);">${formatBudgetTotal(total)}</strong>
          </div>
        </div>

        <div class="contact-step-box">
          <h4>Dados para envio do orçamento</h4>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="contact-name">Seu Nome *</label>
              <input type="text" id="contact-name" class="form-input" placeholder="Ex.: Samantha Silva" value="${escapeHtml(appState.contact.name || "")}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="contact-phone">Seu WhatsApp (com DDD) *</label>
              <input type="tel" id="contact-phone" class="form-input" placeholder="(11) 99999-9999" value="${escapeHtml(appState.contact.phone || "")}" required>
            </div>
          </div>

          <div class="whatsapp-intent-note">
            <h4>Enviar não fecha o pedido</h4>
            <p>Ao continuar, abrimos uma conversa no WhatsApp com o seu resumo. Lá a gente tira todas as dúvidas, ajusta o que você quiser e só depois combina o pagamento.</p>
          </div>

          <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px;">
            <button type="button" class="btn btn-primary btn-whatsapp-cta" id="btn-open-whatsapp" style="flex: 2; min-width: 220px; font-size: 1.05rem;">
              ${whatsappIconSvg()}<span>Continuar atendimento no WhatsApp</span>
            </button>
            <button type="button" class="btn btn-secondary" id="btn-copy-summary" style="flex: 1; min-width: 140px;">
              Copiar Resumo
            </button>
          </div>
          <div id="copy-feedback" role="status" style="margin-top: 8px; font-size: 0.85rem; color: var(--color-success); font-weight: 500; display: none;">
            Resumo copiado para a área de transferência!
          </div>
        </div>
      `;
    }

    default:
      return `<p>Etapa em construção.</p>`;
  }
}

function renderWhatsappRsvpDemo() {
  return `
    <div class="demo-disclosure">Demonstração interativa. O WhatsApp só abre depois do seu clique; a mensagem fica para você revisar.</div>
    <section class="builder-rsvp-preview" aria-label="Exemplo de confirmação pelo WhatsApp">
      <span class="demo-form-kicker">RESPOSTA AO CONVITE</span>
      <h3>${escapeHtml(eventConfirmationTitle())}</h3>
      <p>Que bom ter você com a gente. Preencha seu nome para preparar a confirmação.</p>
      <label class="demo-field-label" for="demo-rsvp-guest">Nome do convidado</label>
      <input id="demo-rsvp-guest" class="demo-field" type="text" autocomplete="name" placeholder="Digite seu nome">
      <button type="button" class="demo-whatsapp-button" data-demo-action="send-rsvp-whatsapp">
        ${whatsappIconSvg()}<span>Confirmar no WhatsApp</span>
      </button>
      <p class="demo-inline-status" id="demo-rsvp-status" role="status"></p>
      <p class="demo-small-note">A conversa abre com a mensagem preenchida. Só é enviada se você tocar em Enviar no WhatsApp.</p>
    </section>`;
}

function renderSmartRsvpDemo() {
  const eventTitle = encodeURIComponent(eventConfirmationTitle());
  return `
    <button type="button" class="example-open-button" data-demo-action="show-rsvp-list">Ver exemplo de lista de convidados</button>
    <iframe class="builder-v8-demo-frame builder-v8-rsvp-frame" title="Formulário de RSVP inteligente do Builder v8 — demonstração local" src="../assets/examples/builder-v8-rsvp-smart-demo.html?evento=${escapeHtml(eventTitle)}" sandbox="allow-scripts" loading="eager"></iframe>`;
}

function renderRsvpDashboardDemo() {
  return `
    <div class="demo-disclosure">Painel do Builder v8 com dados fictícios. A busca funciona; ações de edição e exportação ficam desativadas nesta prévia.</div>
    <iframe class="builder-v8-demo-frame builder-v8-dashboard-frame" title="Painel RSVP do Builder v8 — demonstração local" src="../assets/examples/builder-v8-rsvp-dashboard-demo.html" sandbox="allow-scripts allow-same-origin" loading="eager"></iframe>`;
}

function renderSourceExample(src, alt, note) {
  return `<div class="demo-disclosure">${note}</div>
    <figure class="source-example-figure">
      <button type="button" class="source-example-zoom-button" data-demo-action="source-image-zoom" aria-expanded="false">Ampliar para ler</button>
      <div class="source-example-image-wrap"><img src="${src}" alt="${alt}" loading="lazy" decoding="async"></div>
    </figure>`;
}

function renderGiftDemo(kind) {
  if (kind === "gift-simple") {
    return `<iframe class="builder-v8-demo-frame builder-v8-manual-frame" title="Exemplo de sugestões de presente simples" src="../assets/examples/gift-simple-snippet-demo.html?v=20261023-1" sandbox="allow-scripts" allow="clipboard-write" loading="eager"></iframe>`;
  }
  if (kind === "gift-premium") {
    return renderSourceExample("../assets/examples/gift-premium-source-safe.png", "Exemplo original do site para sugestões de presente premium", "Exemplo original do site. A chave Pix e o QR Code foram mascarados; os itens e a arte continuam visíveis.");
  }
  if (kind === "gift-smart") {
    return `<iframe class="builder-v8-demo-frame builder-v8-gift-frame" title="Lista de Presentes" src="../assets/examples/builder-v8-gift-list-demo.html?v=20261002-3" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" allow="clipboard-write" loading="eager"></iframe>`;
  }
  return renderSourceExample("../assets/examples/gift-link-source.jpg", "Exemplo original de uma lista externa de presentes", "Crie sua lista em sites de terceiros, como Magalu, iCasei, Shopee, Extra, Shein, Amazon ou em qualquer outro site, e nos encaminhe o link para colocarmos no botão de Lista de Presentes");
}

function renderManualDemo(kind = "manual-simple") {
  if (kind === "manual-simple") {
    return `<iframe class="builder-v8-demo-frame builder-v8-manual-frame" title="Exemplo de Manual do Convidado" src="../assets/examples/manual-snippet-demo.html?v=20261023-1" sandbox="allow-scripts" loading="eager"></iframe>`;
  }
  const premium = kind === "manual-premium";
  const src = premium ? "../assets/examples/manual-premium-source-safe.png" : "../assets/examples/manual-guest-source-safe.png";
  const alt = premium ? "Exemplo original do Manual dos Convidados Premium" : "Captura original do Manual do Convidado no convite";
  const note = premium
    ? "Arte original do Manual Premium disponível no site. Os nomes e a data do evento foram mascarados."
    : "Captura original do Manual do Convidado no convite publicado. O endereço e o telefone foram mascarados; role a imagem para ver o conteúdo.";
  return renderSourceExample(src, alt, note).replace('loading="lazy"', 'loading="eager"');
}

// Modelo escolhido com a versão de abertura pedida, ou null se ele não tiver essa versão
function getSelectedModelWithOpening(abertura) {
  if (appState.modelMode !== "selected" || !appState.selectedModel?.slug) return null;
  const catalogModel = MODEL_CATALOG.find(item => item.slug === appState.selectedModel.slug);
  // Sem catálogo carregado, confia no modelo (o próprio convite cai na versão disponível)
  if (catalogModel && !(catalogModel.aberturas || []).includes(abertura)) return null;
  return appState.selectedModel;
}

function getOpeningPreviewUrl(abertura) {
  const selectedModel = getSelectedModelWithOpening(abertura);
  if (selectedModel) {
    const slug = encodeURIComponent(selectedModel.slug);
    return `https://pedidos.mforge.com.br/modelos/${slug}/index.html?abertura=${abertura}`;
  }
  return `https://pedidos.mforge.com.br/Convite_Temp/?v=20260709-assets&abertura=${abertura}`;
}

function renderOpeningDemo(kind) {
  const isShort = kind === "opening-short";
  const title = isShort ? "Abertura curta" : "Abertura longa";
  const abertura = isShort ? "curta" : "longa";
  const selectedModel = appState.modelMode === "selected" ? appState.selectedModel : null;
  const modelLabel = selectedModel?.name || selectedModel?.slug;
  const modelHasOpening = Boolean(getSelectedModelWithOpening(abertura));
  const disclosure = modelLabel && modelHasOpening
    ? `Prévia interativa do convite real ${escapeHtml(modelLabel)}. A abertura escolhida será aplicada ao orçamento.`
    : modelLabel
      ? `O modelo ${escapeHtml(modelLabel)} ainda não tem a ${title.toLowerCase()} pronta; a prévia usa um convite de exemplo para mostrar como ela funciona. A abertura escolhida será aplicada ao orçamento.`
      : "Prévia interativa de um convite real. O exemplo usa um tema demonstrativo; a abertura escolhida será aplicada ao orçamento.";
  const url = escapeHtml(getOpeningPreviewUrl(abertura));
  return `<div class="demo-disclosure">${disclosure}</div><div class="opening-live-preview-shell"><iframe class="opening-live-preview" src="${url}" title="${title} — convite real interativo" referrerpolicy="no-referrer" allow="autoplay; fullscreen" loading="eager"></iframe></div>`;
}

function renderGalleryDemo(index = 0) {
  const photo = DEMO_GALLERY[index];
  return `<div class="demo-disclosure">Cinco fotos de uma debutante fictícia, criadas apenas para demonstrar a galeria.</div><div class="gallery-demo-viewer"><button type="button" class="gallery-step-button" data-demo-action="gallery-prev" aria-label="Foto anterior" ${index === 0 ? "disabled" : ""}>‹</button><figure><img src="${photo.src}" alt="${photo.alt}" class="gallery-demo-photo" data-index="${index}"><figcaption><span>${index + 1} de ${DEMO_GALLERY.length}</span><span>Galeria de exemplo</span></figcaption></figure><button type="button" class="gallery-step-button" data-demo-action="gallery-next" aria-label="Próxima foto" ${index === DEMO_GALLERY.length - 1 ? "disabled" : ""}>›</button></div><div class="gallery-demo-thumbnails">${DEMO_GALLERY.map((item, photoIndex) => `<button type="button" data-demo-action="gallery-select" data-index="${photoIndex}" aria-label="Ver foto ${photoIndex + 1}" aria-pressed="${photoIndex === index}"><img src="${item.src}" alt="" loading="lazy"></button>`).join("")}</div>`;
}

function renderFilterDemo() {
  return `
    <section class="filter-demo" aria-label="Teste do filtro para Instagram">
      <div class="filter-demo-heading"><div><span class="filter-demo-eyebrow">FILTRO PARA INSTAGRAM</span><h3>Teste uma foto</h3></div><span class="filter-format-chip">9:16</span></div>
      <p class="demo-disclosure">Exemplo local. Suas fotos não são enviadas nem salvas na nuvem.</p>
      <div class="filter-stage" data-filter-stage data-camera-state="waiting">
        <div class="filter-camera-placeholder" data-filter-placeholder aria-hidden="true">
          <img class="filter-placeholder-photo" src="../assets/gallery/debutante-1.jpg" alt="">
          <img class="filter-placeholder-frame" src="../assets/examples/filtro-exemplo.png" alt="">
        </div>
        <video class="filter-video" data-filter-video playsinline muted autoplay></video>
        <canvas class="filter-canvas" data-filter-canvas width="720" height="1280" aria-label="Prévia vertical com o filtro da festa"></canvas>
        <img class="filter-stage-result" data-filter-stage-result alt="Foto com a moldura da festa aplicada" hidden>
        <p class="filter-overlay-note" data-filter-overlay-note>Exemplo da moldura em uma foto fictícia</p>
        <button type="button" class="filter-camera-switch" data-demo-action="filter-switch" aria-label="Alternar câmera">↻</button>
      </div>
      <div class="filter-transform-controls">
        <span>Arraste a prévia para reposicionar</span>
        <label for="filter-zoom">Zoom <input id="filter-zoom" type="range" min="1" max="3" step="0.01" value="1" data-filter-zoom></label>
        <button type="button" class="filter-reset-button" data-demo-action="filter-reset">Centralizar</button>
      </div>
      <p class="filter-status" data-filter-status role="status" aria-live="polite">Conectando a câmera. Veja a moldura com uma foto fictícia enquanto isso.</p>
      <p class="demo-media-error" data-filter-error hidden>Câmera indisponível. Envie uma foto do celular ou tente novamente. <button type="button" class="filter-retry-button" data-demo-action="filter-retry">Tentar novamente</button></p>
      <div class="filter-actions">
        <button type="button" class="filter-action-button" data-demo-action="filter-upload">
          <svg class="filter-action-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="8.5" cy="9" r="1.5"></circle><path d="m5 18 5-5 3 3 2-2 4 4"></path></svg>
          <span>Escolher foto</span><small>Da galeria</small>
        </button>
        <input type="file" accept="image/*" id="filter-upload-input" data-filter-upload hidden>
        <button type="button" class="filter-action-button" data-demo-action="filter-shoot" disabled>
          <svg class="filter-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5h3l1.4-2h7.2l1.4 2h3v10H4z"></path><circle cx="12" cy="13.5" r="3.2"></circle></svg>
          <span>Tirar foto</span><small>Com a câmera</small>
        </button>
      </div>
      <figure class="filter-preview" data-filter-preview hidden>
        <figcaption>Sua foto está pronta. Ela fica apenas neste dispositivo.</figcaption>
      </figure>
      <a class="btn btn-primary filter-download" data-filter-download download="mforge-filtro-festa.png" hidden>Baixar foto</a>
      <p class="demo-small-note">O filtro é aplicado no navegador. Nada é enviado ou guardado em um servidor.</p>
    </section>`;
}

const filterDemo = {
  frameImage: null,
  stream: null,
  frameId: null,
  lastPaintAt: 0,
  facing: "user",
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  dragPointerId: null,
  dragX: 0,
  dragY: 0,
  objectUrl: null,
  stillObjectUrl: null,
  lastFrame: null
};

function stopFilterCamera() {
  if (filterDemo.frameId !== null) {
    cancelAnimationFrame(filterDemo.frameId);
    filterDemo.frameId = null;
  }
  filterDemo.lastPaintAt = 0;
  if (filterDemo.stream) {
    filterDemo.stream.getTracks().forEach(track => track.stop());
    filterDemo.stream = null;
  }
  const video = demoDialogContent?.querySelector("[data-filter-video]");
  const stage = demoDialogContent?.querySelector("[data-filter-stage]");
  const shootButton = demoDialogContent?.querySelector("[data-demo-action='filter-shoot'], [data-demo-action='filter-retake']");
  if (stage) stage.dataset.cameraState = "waiting";
  if (shootButton) shootButton.disabled = true;
  if (video) {
    try { video.pause(); } catch (error) {}
    video.srcObject = null;
    if (video.src) { try { video.removeAttribute("src"); video.load(); } catch (error) {} }
  }
  if (filterDemo.objectUrl) { URL.revokeObjectURL(filterDemo.objectUrl); filterDemo.objectUrl = null; }
  clearFilterResult();
  filterDemo.lastFrame = null;
}

function clearFilterResult() {
  const preview = demoDialogContent?.querySelector("[data-filter-preview]");
  const img = demoDialogContent?.querySelector("[data-filter-stage-result]");
  const download = demoDialogContent?.querySelector("[data-filter-download]");
  if (filterDemo.stillObjectUrl) URL.revokeObjectURL(filterDemo.stillObjectUrl);
  filterDemo.stillObjectUrl = null;
  if (img) {
    img.onload = null;
    img.onerror = null;
    img.hidden = true;
    img.removeAttribute("src");
  }
  if (preview) preview.hidden = true;
  if (download) {
    download.hidden = true;
    download.removeAttribute("href");
  }
}

function setFilterStatus(message) {
  const status = demoDialogContent?.querySelector("[data-filter-status]");
  if (status) status.textContent = message;
}

function applyFilterToSource(source, sourceWidth, sourceHeight, mirror = false) {
  const canvas = demoDialogContent?.querySelector("[data-filter-canvas]");
  if (!canvas || !sourceWidth || !sourceHeight) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // Recorta a foto no formato vertical 9:16 da moldura.
  const targetRatio = 9 / 16;
  const sourceRatio = sourceWidth / sourceHeight;
  let sw = sourceWidth, sh = sourceHeight, sx = 0, sy = 0;
  if (sourceRatio > targetRatio) { sw = Math.round(sourceHeight * targetRatio); sx = Math.round((sourceWidth - sw) / 2); }
  else { sh = Math.round(sourceWidth / targetRatio); sy = Math.round((sourceHeight - sh) / 2); }
  sw /= filterDemo.zoom;
  sh /= filterDemo.zoom;
  const maxX = Math.max(0, sourceWidth - sw);
  const maxY = Math.max(0, sourceHeight - sh);
  sx = Math.max(0, Math.min(maxX, (sourceWidth - sw) / 2 + filterDemo.offsetX * maxX));
  sy = Math.max(0, Math.min(maxY, (sourceHeight - sh) / 2 + filterDemo.offsetY * maxY));
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  if (mirror) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  ctx.restore();
  // Aplica o filtro da festa como moldura por cima da foto.
  const frame = filterDemo.frameImage;
  if (frame && frame.complete && frame.naturalWidth) {
    const scale = Math.min(canvas.width / frame.naturalWidth, canvas.height / frame.naturalHeight);
    const frameWidth = frame.naturalWidth * scale;
    const frameHeight = frame.naturalHeight * scale;
    ctx.drawImage(frame, (canvas.width - frameWidth) / 2, (canvas.height - frameHeight) / 2, frameWidth, frameHeight);
  }
  return canvas;
}

function showFilterResult(canvas) {
  const preview = demoDialogContent?.querySelector("[data-filter-preview]");
  const img = demoDialogContent?.querySelector("[data-filter-stage-result]");
  const download = demoDialogContent?.querySelector("[data-filter-download]");
  const stage = demoDialogContent?.querySelector("[data-filter-stage]");
  if (!preview || !img || !download || !stage) return;
  clearFilterResult();
  setFilterStatus("Preparando a foto com a moldura...");
  canvas.toBlob(blob => {
    if (!blob || !demoDialog?.open || !img.isConnected) return;
    const resultUrl = URL.createObjectURL(blob);
    filterDemo.stillObjectUrl = resultUrl;
    img.onload = () => {
      if (filterDemo.stillObjectUrl !== resultUrl || !demoDialog?.open) return;
      img.hidden = false;
      stage.dataset.cameraState = "result";
      download.href = resultUrl;
      preview.hidden = false;
      download.hidden = false;
      const shootButton = demoDialogContent?.querySelector("[data-demo-action='filter-shoot'], [data-demo-action='filter-retake']");
      if (shootButton) {
        shootButton.dataset.demoAction = "filter-retake";
        shootButton.disabled = false;
        const label = shootButton.querySelector("span");
        const helper = shootButton.querySelector("small");
        if (label) label.textContent = "Tirar outra foto";
        if (helper) helper.textContent = "Abrir a câmera";
      }
      setFilterStatus("Foto pronta. Você pode baixar a prévia.");
    };
    img.onerror = () => {
      if (filterDemo.stillObjectUrl === resultUrl) clearFilterResult();
      setFilterStatus("Não foi possível abrir a prévia. Tente tirar ou escolher outra foto.");
    };
    img.src = resultUrl;
  }, "image/png");
}

function startFilterCamera() {
  stopFilterCamera();
  const video = demoDialogContent?.querySelector("[data-filter-video]");
  const shootButton = demoDialogContent?.querySelector("[data-demo-action='filter-shoot'], [data-demo-action='filter-retake']");
  const errorNote = demoDialogContent?.querySelector("[data-filter-error]");
  if (!video) return;
  if (shootButton) {
    shootButton.dataset.demoAction = "filter-shoot";
    shootButton.disabled = true;
    const label = shootButton.querySelector("span");
    const helper = shootButton.querySelector("small");
    if (label) label.textContent = "Tirar foto";
    if (helper) helper.textContent = "Com a câmera";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    if (errorNote) errorNote.hidden = false;
    setFilterStatus("Este navegador não oferece acesso à câmera. Use o envio de foto abaixo.");
    return;
  }
  setFilterStatus("Pedindo acesso à câmera. Veja a amostra enquanto ela conecta.");
  if (errorNote) errorNote.hidden = true;
  navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: filterDemo.facing }, width: { ideal: 1920 }, height: { ideal: 2400 } }, audio: false })
    .then(stream => {
      if (!demoDialog?.open || !video.isConnected) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      filterDemo.stream = stream;
      // O preview usa a câmera localmente; o MediaStream nunca sai do navegador.
      video.srcObject = stream;
      return video.play();
    })
    .then(() => {
      if (!filterDemo.stream) return;
      const videoNow = demoDialogContent?.querySelector("[data-filter-video]");
      const w = videoNow?.videoWidth || 0, h = videoNow?.videoHeight || 0;
      if (w && h) {
        const stage = demoDialogContent?.querySelector("[data-filter-stage]");
        if (stage) stage.dataset.cameraState = "live";
        const overlayNote = demoDialogContent?.querySelector("[data-filter-overlay-note]");
        if (overlayNote) overlayNote.textContent = "Câmera ao vivo com a moldura aplicada";
        if (shootButton) shootButton.disabled = false;
        setFilterStatus("Câmera ativa. Enquadre e toque em Foto.");
      }
      else setFilterStatus("Câmera ativando…");
      filterDemo.frameId = requestAnimationFrame(drawLiveFilterFrame);
    })
    .catch(() => {
      stopFilterCamera();
      if (errorNote) errorNote.hidden = false;
      setFilterStatus("Não foi possível acessar a câmera. Você pode enviar uma foto do dispositivo.");
    });
}

function drawLiveFilterFrame(timestamp = 0) {
  if (!filterDemo.stream || !demoDialog?.open) return;
  filterDemo.frameId = requestAnimationFrame(drawLiveFilterFrame);
  if (timestamp - filterDemo.lastPaintAt < 1000 / 24) return;
  const video = demoDialogContent?.querySelector("[data-filter-video]");
  if (video?.videoWidth && video.videoHeight) {
    const stage = demoDialogContent?.querySelector("[data-filter-stage]");
    if (stage) stage.dataset.cameraState = "live";
    const shootButton = demoDialogContent?.querySelector("[data-demo-action='filter-shoot']");
    if (shootButton) shootButton.disabled = false;
    const status = demoDialogContent?.querySelector("[data-filter-status]");
    if (status?.textContent === "Câmera ativando…" || status?.textContent.includes("Pedindo acesso à câmera")) {
      setFilterStatus("Câmera ativa. Enquadre e toque em Tirar foto.");
    }
    const overlayNote = demoDialogContent?.querySelector("[data-filter-overlay-note]");
    if (overlayNote) overlayNote.textContent = "Câmera ao vivo com a moldura aplicada";
    applyFilterToSource(video, video.videoWidth, video.videoHeight, filterDemo.facing === "user");
    filterDemo.lastPaintAt = timestamp;
  }
}

function loadFilterFrame() {
  if (filterDemo.frameImage) return filterDemo.frameImage;
  const img = new Image();
  img.src = "../assets/examples/filtro-exemplo.png";
  filterDemo.frameImage = img;
  return img;
}

function startCountdownPreview(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  if (countdownPreviewTimer) {
    clearInterval(countdownPreviewTimer);
    countdownPreviewTimer = null;
  }
  const fields = root.querySelectorAll("[data-countdown-unit]");
  if (!fields.length) return;
  const target = appState.event.date
    ? new Date(`${appState.event.date}T${appState.event.time || "20:00"}:00`).getTime()
    : Date.now() + 30 * 24 * 60 * 60 * 1000;
  const update = () => {
    const remaining = Math.max(0, target - Date.now());
    const units = {
      days: Math.floor(remaining / 86400000),
      hours: Math.floor((remaining % 86400000) / 3600000),
      minutes: Math.floor((remaining % 3600000) / 60000),
      seconds: Math.floor((remaining % 60000) / 1000)
    };
    for (const [unit, value] of Object.entries(units)) {
      const field = root.querySelector(`[data-countdown-unit="${unit}"]`);
      if (field) field.textContent = String(value).padStart(unit === "days" ? 1 : 2, "0");
    }
  };
  update();
  countdownPreviewTimer = window.setInterval(update, 1000);
}

function handleDemoAction(event) {
  const button = event.target.closest("[data-demo-action]");
  if (!button) return;
  const action = button.dataset.demoAction;
  if (action === "source-image-zoom") {
    event.stopPropagation();
    const figure = button.closest(".source-example-figure");
    const zoomed = figure?.classList.toggle("is-zoomed") || false;
    button.setAttribute("aria-expanded", String(zoomed));
    button.textContent = zoomed ? "Ajustar à tela" : "Ampliar para ler";
    return;
  }
  const guestName = (document.getElementById("demo-rsvp-guest")?.value || "").trim();

  if (["rsvp-whatsapp", "rsvp-smart", "gift-simple", "gift-premium", "gift-smart", "gift-link", "manual-simple", "manual-premium", "opening-short", "opening-long", "save-date-simple", "reminder-example", "open-gallery", "test-filter"].includes(action)) {
    event.stopPropagation();
    switch (action) {
      case "rsvp-whatsapp": showDemo(eventConfirmationTitle(), renderWhatsappRsvpDemo(), button); break;
      case "rsvp-smart": showDemo("RSVP inteligente", renderSmartRsvpDemo(), button); break;
      case "gift-simple": showDemo("Sugestões de presente", renderGiftDemo(action), button); break;
      case "gift-premium": showDemo("Sugestões de presente", renderGiftDemo(action), button); break;
      case "gift-smart": showDemo("Lista de Presentes", renderGiftDemo(action), button, { builderV8GiftList: true }); break;
      case "gift-link": showDemo("Lista de presentes", renderGiftDemo(action), button); break;
      case "manual-simple": case "manual-premium": {
        const manualInput = document.getElementById("manual-details-input");
        if (manualInput) appState.manualDetails = manualInput.value.trim();
        showDemo(action === "manual-premium" ? "Manual Premium" : "Manual do convidado", renderManualDemo(action), button); break;
      }
      case "opening-short": showDemo("Abertura curta", renderOpeningDemo(action), button); break;
      case "opening-long": showDemo("Abertura longa", renderOpeningDemo(action), button); break;
      case "save-date-simple":
        showDemo("Save the Date Simples", `<div class="demo-disclosure">Esse é apenas um exemplo em outro tema.</div><div class="save-date-demo"><video class="demo-video-preview" controls playsinline preload="metadata" src="../assets/examples/save-the-date-simple.mp4" aria-label="Exemplo de Save the Date Simples"></video><p class="demo-media-error" hidden>Não foi possível abrir este vídeo neste navegador.</p></div>` , button);
        break;
      case "reminder-example":
        showDemo("Lembrete Animado", `<div class="demo-disclosure">Exemplo de lembrete em vídeo. A arte final acompanha o tema do seu convite.</div><div class="save-date-demo"><video class="demo-video-preview" controls playsinline preload="metadata" src="../assets/examples/lembrete-exemplo.mp4" aria-label="Exemplo de lembrete animado"></video><p class="demo-media-error" hidden>Não foi possível abrir este vídeo neste navegador.</p></div>`, button);
        break;
      case "open-gallery": showDemo("Galeria de exemplo", renderGalleryDemo(0), button); break;
      case "test-filter":
        stopFilterCamera();
        filterDemo.facing = "user";
        filterDemo.zoom = 1;
        filterDemo.offsetX = 0;
        filterDemo.offsetY = 0;
        showDemo("Testar filtro da festa", renderFilterDemo(), button);
        loadFilterFrame().addEventListener("load", () => {
          const v = demoDialogContent?.querySelector("[data-filter-video]");
          if (v?.videoWidth) applyFilterToSource(v, v.videoWidth, v.videoHeight);
        }, { once: true });
        startFilterCamera();
        break;
    }
    return;
  }

  if (action === "send-rsvp-whatsapp") {
    const status = document.getElementById("demo-rsvp-status");
    if (!guestName) {
      if (status) status.textContent = "Digite seu nome para continuar.";
      document.getElementById("demo-rsvp-guest")?.focus();
      return;
    }
    const eventPhrase = appState.event.type === "Casamento" ? "em nosso casamento"
      : appState.event.type === "15 anos" ? "nos 15 anos"
        : appState.event.type === "Formatura" ? "na formatura"
          : appState.event.type === "Aniversário" ? "no aniversário"
            : "no evento";
    const message = `Olá! Confirmo minha presença ${eventPhrase}. Meu nome é ${guestName}.`;
    const url = `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    if (status) status.textContent = "O WhatsApp abriu com a mensagem pronta. Revise e envie por lá, se estiver tudo certo.";
    return;
  }

  if (action === "show-rsvp-list") {
    const opener = demoDialogOpener || button;
    const dashboard = renderRsvpDashboardDemo();
    closeDemo();
    window.setTimeout(() => showDemo("Lista de confirmações", dashboard, opener), 0);
    return;
  }
  if (action === "filter-upload") {
    demoDialogContent?.querySelector("[data-filter-upload]")?.click();
    return;
  }
  if (action === "filter-retake") {
    startFilterCamera();
    return;
  }
  if (action === "filter-switch") {
    filterDemo.facing = filterDemo.facing === "user" ? "environment" : "user";
    startFilterCamera();
    return;
  }
  if (action === "filter-reset") {
    filterDemo.zoom = 1;
    filterDemo.offsetX = 0;
    filterDemo.offsetY = 0;
    const zoomInput = demoDialogContent?.querySelector("[data-filter-zoom]");
    if (zoomInput) zoomInput.value = "1";
    const videoNow = demoDialogContent?.querySelector("[data-filter-video]");
    if (videoNow?.videoWidth) applyFilterToSource(videoNow, videoNow.videoWidth, videoNow.videoHeight, filterDemo.facing === "user");
    return;
  }
  if (action === "filter-shoot") {
    const video = demoDialogContent?.querySelector("[data-filter-video]");
    const canvas = demoDialogContent?.querySelector("[data-filter-canvas]");
    if (video?.videoWidth && canvas) {
      const painted = applyFilterToSource(video, video.videoWidth, video.videoHeight, filterDemo.facing === "user");
      if (painted) { showFilterResult(painted); stopFilterCamera(); }
      else setFilterStatus("Não foi possível montar a foto agora. Tente novamente.");
    } else {
      setFilterStatus("A câmera ainda não está pronta. Tente novamente ou envie uma foto do dispositivo.");
    }
    return;
  }

  if (action === "filter-retry") {
    startFilterCamera();
    return;
  }

  if (action === "gallery-prev" || action === "gallery-next" || action === "gallery-select") {
    const current = Number(demoDialogContent.querySelector(".gallery-demo-photo")?.dataset.index || 0);
    const next = action === "gallery-select" ? Number(button.dataset.index) : current + (action === "gallery-next" ? 1 : -1);
    const safeIndex = Math.max(0, Math.min(DEMO_GALLERY.length - 1, next));
    demoDialogContent.innerHTML = renderGalleryDemo(safeIndex);
  }
}

function handleFilterUpload(event) {
  const input = event.target;
  if (!input.matches || !input.matches("[data-filter-upload]")) return;
  const file = input.files?.[0];
  if (!file) return;
  stopFilterCamera();
  if (!file.type.startsWith("image/")) {
    setFilterStatus("Esse arquivo não é uma imagem. Envie uma foto do seu dispositivo.");
    return;
  }
  if (filterDemo.objectUrl) URL.revokeObjectURL(filterDemo.objectUrl);
  filterDemo.objectUrl = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const stage = demoDialogContent?.querySelector("[data-filter-stage]");
    if (stage) stage.dataset.cameraState = "photo";
    const overlayNote = demoDialogContent?.querySelector("[data-filter-overlay-note]");
    if (overlayNote) overlayNote.textContent = "Sua foto com a moldura aplicada";
    const painted = applyFilterToSource(img, img.naturalWidth, img.naturalHeight);
    if (painted) {
      showFilterResult(painted);
    } else {
      setFilterStatus("Não foi possível montar a foto agora. Tente outra imagem.");
    }
    URL.revokeObjectURL(filterDemo.objectUrl);
    filterDemo.objectUrl = null;
  };
  img.onerror = () => {
    setFilterStatus("Não foi possível ler esta imagem. Tente outro arquivo.");
    if (filterDemo.objectUrl) { URL.revokeObjectURL(filterDemo.objectUrl); filterDemo.objectUrl = null; }
  };
  img.src = filterDemo.objectUrl;
  setFilterStatus("Aplicando o filtro da festa na foto enviada...");
}

function handleDemoInput(event) {
  if (event.target.matches?.("[data-filter-zoom]")) {
    filterDemo.zoom = Number(event.target.value) || 1;
    const video = demoDialogContent?.querySelector("[data-filter-video]");
    if (video?.videoWidth) applyFilterToSource(video, video.videoWidth, video.videoHeight, filterDemo.facing === "user");
    return;
  }
}

function handleDemoMediaError(event) {
  const media = event.target;
  if (!(media instanceof HTMLMediaElement)) return;
  const note = media.parentElement?.querySelector(".demo-media-error");
  if (note) note.hidden = false;
}

// Impede que o clique em um controle interno (botão, link, mídia, etc.)
// dispare a seleção do cartão-pai que o contém.
function isNestedOptionControl(event) {
  const target = event.target;
  if (!target || typeof target.closest !== "function") return false;
  const card = target.closest(".option-card");
  if (!card) return false;
  return Boolean(target.closest("a, button, input, select, textarea, video, audio, canvas, label, [data-demo-action], [data-no-card-toggle]"));
}

function formatPlayerTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const wholeSeconds = Math.floor(seconds);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainder = String(wholeSeconds % 60).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}`
    : `${minutes}:${remainder}`;
}

function initModelMusicPlayer(root = document) {
  if (!root || typeof root.querySelector !== "function") return;
  const audio = root.querySelector("#model-music-audio");
  const playButton = root.querySelector("[data-music-play]");
  const timeline = root.querySelector("[data-music-timeline]");
  const currentLabel = root.querySelector("[data-music-current]");
  const durationLabel = root.querySelector("[data-music-duration]");
  const status = root.querySelector("[data-music-status]");
  if (!audio || !playButton || !timeline) return;

  const paint = () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const progress = duration ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0;
    timeline.value = String(progress);
    timeline.style.setProperty("--music-progress", `${progress}%`);
    timeline.setAttribute("aria-valuetext", `${formatPlayerTime(currentTime)} de ${formatPlayerTime(duration)}`);
    if (currentLabel) currentLabel.textContent = formatPlayerTime(currentTime);
    if (durationLabel) durationLabel.textContent = formatPlayerTime(duration);
    playButton.setAttribute("aria-label", audio.paused ? "Reproduzir música do modelo" : "Pausar música do modelo");
    playButton.setAttribute("aria-pressed", audio.paused ? "false" : "true");
    playButton.innerHTML = audio.paused
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>';
  };

  playButton.addEventListener("click", async event => {
    event.stopPropagation();
    if (audio.paused) {
      try {
        await audio.play();
        if (status) status.textContent = "Reproduzindo a música do modelo.";
      } catch (error) {
        if (status) status.textContent = "Não foi possível reproduzir esta faixa agora.";
      }
    } else {
      audio.pause();
      if (status) status.textContent = "Música pausada.";
    }
    paint();
  });
  timeline.addEventListener("click", event => event.stopPropagation());
  timeline.addEventListener("input", event => {
    event.stopPropagation();
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (Number(timeline.value) / 100) * audio.duration;
    }
  });
  audio.addEventListener("loadedmetadata", paint);
  audio.addEventListener("durationchange", paint);
  audio.addEventListener("timeupdate", paint);
  audio.addEventListener("seeking", paint);
  audio.addEventListener("seeked", paint);
  audio.addEventListener("play", paint);
  audio.addEventListener("pause", paint);
  audio.addEventListener("ended", () => {
    if (status) status.textContent = "A faixa terminou. Toque em reproduzir para ouvir novamente.";
    paint();
  });
  audio.addEventListener("error", () => {
    if (status) status.textContent = "A trilha padrão deste modelo não está disponível nesta prévia.";
    playButton.disabled = true;
    timeline.disabled = true;
  });
  paint();
}

document.addEventListener("click", handleDemoAction);
demoDialogContent?.addEventListener("input", handleDemoInput);
demoDialogContent?.addEventListener("pointerdown", event => {
  const stage = event.target.closest?.("[data-filter-stage]");
  if (!stage || event.target.closest?.("button")) return;
  filterDemo.dragPointerId = event.pointerId;
  filterDemo.dragX = event.clientX;
  filterDemo.dragY = event.clientY;
  stage.setPointerCapture?.(event.pointerId);
});
demoDialogContent?.addEventListener("pointermove", event => {
  if (filterDemo.dragPointerId !== event.pointerId) return;
  const stage = demoDialogContent.querySelector("[data-filter-stage]");
  const video = demoDialogContent.querySelector("[data-filter-video]");
  if (!stage || !video?.videoWidth) return;
  const bounds = stage.getBoundingClientRect();
  filterDemo.offsetX = Math.max(-0.5, Math.min(0.5, filterDemo.offsetX + (event.clientX - filterDemo.dragX) / bounds.width));
  filterDemo.offsetY = Math.max(-0.5, Math.min(0.5, filterDemo.offsetY + (event.clientY - filterDemo.dragY) / bounds.height));
  filterDemo.dragX = event.clientX;
  filterDemo.dragY = event.clientY;
  applyFilterToSource(video, video.videoWidth, video.videoHeight, filterDemo.facing === "user");
});
demoDialogContent?.addEventListener("pointerup", event => {
  if (filterDemo.dragPointerId === event.pointerId) filterDemo.dragPointerId = null;
});
demoDialogContent?.addEventListener("pointercancel", event => {
  if (filterDemo.dragPointerId === event.pointerId) filterDemo.dragPointerId = null;
});
demoDialogContent?.addEventListener("change", handleFilterUpload);
demoDialogContent?.addEventListener("error", handleDemoMediaError, true);

// Handlers e Listeners por Etapa
function attachStepHandlers(stepIdx) {
  // Botões de Navegação Global
  document.getElementById("btn-step-prev")?.addEventListener("click", () => {
    stopAllPreviewMedia();
    saveCurrentStepData(stepIdx);
    if (appState.currentStepIndex > 1) {
      appState.currentStepIndex = stepBefore(appState.currentStepIndex);
      saveDraft();
      renderStep();
    }
  });

  document.getElementById("btn-summary-final")?.addEventListener("click", () => {
    stopAllPreviewMedia();
    saveCurrentStepData(stepIdx);
    appState.currentStepIndex = STEP_COUNT;
    saveDraft();
    renderStep();
  });

  document.getElementById("btn-step-restart")?.addEventListener("click", async () => {
    if (await showNotice("Seu orçamento atual será apagado. Quer começar novamente?", {
      title: "Começar um novo orçamento?",
      confirmLabel: "Recomeçar",
      cancelLabel: "Manter orçamento"
    })) {
      stopAllPreviewMedia();
      closeDemo();
      clearDraft();
      renderStep();
    }
  });

  document.getElementById("btn-step-next")?.addEventListener("click", () => {
    stopAllPreviewMedia();
    saveCurrentStepData(stepIdx);
    if (stepIdx === 1 && (appState.modelMode === "none" || (appState.modelMode === "selected" && !appState.selectedModel))) {
      const error = document.getElementById("model-step-error");
      if (error) {
        error.textContent = "Escolha um modelo da coleção ou peça uma criação exclusiva para continuar.";
        error.hidden = false;
      }
      document.querySelector("[data-model-mode='new']")?.focus({ preventScroll: true });
      revealPending(error);
      return;
    }
    const missing = requiredFieldError(stepIdx);
    if (missing) {
      const error = document.getElementById(missing.errorId);
      if (error) {
        error.textContent = missing.message;
        error.hidden = false;
      }
      const field = document.getElementById(missing.focusId);
      const group = field?.closest(".form-group");
      // O aviso vai para baixo do campo pendente, para os dois aparecerem juntos na tela.
      if (error && group && error.parentElement !== group) group.appendChild(error);
      field?.focus({ preventScroll: true });
      revealPending(group || error);
      return;
    }
    if (stepIdx === 3 && !appState.openingChoiceConfirmed) {
      const error = document.getElementById("opening-step-error");
      if (error) {
        error.textContent = "Escolha a abertura que você quer para continuar.";
        error.hidden = false;
      }
      document.querySelector("[data-opening-select]")?.focus({ preventScroll: true });
      revealPending(error);
      return;
    }
    if (appState.currentStepIndex < STEP_COUNT) {
      syncOpeningLock();
      appState.currentStepIndex = stepAfter(appState.currentStepIndex);
      saveDraft();
      renderStep();
    }
  });

  const mobileNext = document.getElementById("mobile-step-next");
  if (mobileNext) {
    if (stepIdx === STEP_COUNT) {
      mobileNext.innerHTML = `${whatsappIconSvg()}<span>Continuar atendimento</span>`;
      mobileNext.setAttribute("aria-label", "Continuar atendimento no WhatsApp");
      mobileNext.classList.add("btn-whatsapp-cta");
    } else {
      mobileNext.textContent = "Próximo";
      mobileNext.removeAttribute("aria-label");
      mobileNext.classList.remove("btn-whatsapp-cta");
    }
    // onclick (não addEventListener): o botão da barra é fixo e sobrevive às etapas; senão os cliques se acumulam.
    mobileNext.onclick = () => {
      if (stepIdx === STEP_COUNT) document.getElementById("btn-open-whatsapp")?.click();
      else document.getElementById("btn-step-next")?.click();
    };
  }
  const mobileSummary = document.getElementById("mobile-summary-final");
  if (mobileSummary) {
    mobileSummary.hidden = !appState.hasVisitedFinalReview || stepIdx >= STEP_COUNT;
    mobileSummary.onclick = () => document.getElementById("btn-summary-final")?.click();
  }

  // Handlers Específicos
  if (stepIdx === 1) {
    document.querySelectorAll("[data-model-mode]").forEach(card => {
      card.addEventListener("click", event => {
        if (isNestedOptionControl(event)) return;
          if (card.dataset.modelMode === "selected" && !appState.selectedModel) return;
        const wasNew = appState.modelMode === "new";
        appState.modelMode = card.dataset.modelMode;
        if (appState.modelMode === "new") {
          appState.selectedModel = null;
          appState.choices.modelCustomization = false;
          appState.modelCustomization = "";
          if (!wasNew) {
            appState.event.theme = "";
            appState.event.palette = "";
          }
          if (appState.choices.music?.mode === "model_music") appState.choices.music = { mode: "none", value: "" };
        } else {
          syncSelectedModelThemeFields();
        }
        saveDraft();
        renderStep();
        if (appState.modelMode === "new") revealPending(document.getElementById("input-model-theme")?.closest(".form-grid"), 650);
      });
    });

    const chk = document.getElementById("chk-model-custom");
    chk?.addEventListener("change", (e) => {
      appState.choices.modelCustomization = e.target.checked;
      if (!e.target.checked) syncSelectedModelThemeFields({ forceDefaults: true });
      else syncSelectedModelThemeFields();
      document.getElementById("box-model-custom").style.display = e.target.checked ? "block" : "none";
      updatePriceDisplays();
      saveDraft();
      if (e.target.checked) revealPending(document.getElementById("box-model-custom"));
    });
  } else if (stepIdx === 2) {
    const hideEventError = () => { const error = document.getElementById("event-step-error"); if (error) error.hidden = true; };
    document.getElementById("step-body-content")?.addEventListener("input", hideEventError);
    document.getElementById("evt-type")?.addEventListener("change", (event) => {
      hideEventError();
      const group = document.getElementById("evt-age-group");
      const ageInput = document.getElementById("evt-age");
      const hasAge = eventHasAge(event.target.value);
      if (group) group.hidden = !hasAge;
      if (ageInput && !hasAge) ageInput.value = "";
      if (hasAge) revealPending(group);
    });
    const themeCustomization =document.getElementById("chk-event-theme-custom");
    themeCustomization?.addEventListener("change", (event) => {
      appState.choices.modelCustomization = event.target.checked;
      if (event.target.checked) syncSelectedModelThemeFields();
      else syncSelectedModelThemeFields({ forceDefaults: true });
      const locked = appState.modelMode === "selected" && !appState.choices.modelCustomization;
      for (const id of ["evt-theme", "evt-pal"]) {
        const field = document.getElementById(id);
        if (field) {
          field.disabled = locked;
          field.setAttribute("aria-disabled", String(locked));
          field.value = id === "evt-theme" ? appState.event.theme : appState.event.palette;
          const label = document.querySelector(`label[for="${id}"]`);
          label?.querySelector("[data-locked-badge]")?.remove();
          if (locked && label) label.insertAdjacentHTML("beforeend", `<span class="form-label-locked" data-locked-badge>🔒 Definido pelo modelo</span>`);
        }
      }
      updatePriceDisplays();
      saveDraft();
    });
  } else if (stepIdx === 3) {
    document.querySelectorAll("[data-opening]").forEach(card => {
      card.addEventListener("click", event => {
        if (isNestedOptionControl(event)) return;
        appState.choices.openingType = card.dataset.opening;
        appState.openingChoiceConfirmed = true;
        saveDraft();
        renderStep();
      });
    });
    document.querySelectorAll("[data-opening-select]").forEach(button => {
      button.addEventListener("click", event => {
        event.stopPropagation();
        appState.choices.openingType = button.dataset.openingSelect;
        appState.openingChoiceConfirmed = true;
        saveDraft();
        renderStep();
      });
    });
  } else if (stepIdx === 4) {
    document.querySelectorAll("[data-photo]").forEach(card => {
      card.addEventListener("click", event => {
        if (isNestedOptionControl(event)) return;
          appState.choices.openingPhoto = card.dataset.photo;
        saveDraft();
        renderStep();
      });
    });
  } else if (stepIdx === 5) {
    document.querySelectorAll("[data-music-mode]").forEach(card => {
      card.addEventListener("click", event => {
        if (isNestedOptionControl(event)) return;
          const mode = card.dataset.musicMode;
        appState.choices.music.mode = mode;
        saveDraft();
        renderStep();
      });
    });
  } else if (stepIdx === 6) {
    document.querySelectorAll("[data-rsvp]").forEach(card => {
      card.addEventListener("click", event => {
        if (isNestedOptionControl(event)) return;
        saveCurrentStepData(stepIdx);
        appState.choices.rsvp = card.dataset.rsvp;
        saveDraft();
        renderStep();
      });
    });
  } else if (stepIdx === 7) {
    document.querySelectorAll("[data-gifts]").forEach(card => {
      card.addEventListener("click", event => {
        if (isNestedOptionControl(event)) return;
        saveCurrentStepData(stepIdx);
        appState.choices.gifts = card.dataset.gifts;
        saveDraft();
        renderStep();
      });
    });
  } else if (stepIdx === 8) {
    document.querySelectorAll("[data-manual]").forEach(card => {
      card.addEventListener("click", event => {
        if (isNestedOptionControl(event)) return;
        saveCurrentStepData(stepIdx);
        appState.choices.manual = card.dataset.manual;
        saveDraft();
        renderStep();
      });
    });
  } else if (stepIdx === 9) {
    document.querySelectorAll("[data-countdown]").forEach(card => {
      card.addEventListener("click", event => {
        if (isNestedOptionControl(event)) return;
          appState.choices.countdown = card.dataset.countdown;
        saveDraft();
        renderStep();
      });
    });
  } else if (stepIdx === 10) {
    document.querySelectorAll("[data-gallery]").forEach(card => {
      card.addEventListener("click", event => {
        if (isNestedOptionControl(event)) return;
          appState.choices.gallery = card.dataset.gallery;
        saveDraft();
        renderStep();
      });
    });

  } else if (stepIdx === 11) {
    // Multi-select independente: cada opção pode ser combinada com a outra.
    document.querySelectorAll("[data-shared-album-option]").forEach(card => {
      card.addEventListener("click", event => {
        if (isNestedOptionControl(event)) return;
        appState.choices.sharedAlbum = appState.choices.sharedAlbum === "include" ? "none" : "include";
        saveDraft();
        renderStep();
      });
    });

    document.querySelectorAll("[data-instagram-filter-option]").forEach(card => {
      card.addEventListener("click", event => {
        if (isNestedOptionControl(event)) return;
        appState.choices.instagramFilter = appState.choices.instagramFilter === "include" ? "none" : "include";
        saveDraft();
        renderStep();
      });
    });
    document.querySelector("[data-after-party-none]")?.addEventListener("click", event => {
      if (isNestedOptionControl(event)) return;
      appState.choices.sharedAlbum = "none";
      appState.choices.instagramFilter = "none";
      saveDraft();
      renderStep();
    });
  } else if (stepIdx === 12) {
    document.querySelectorAll("[data-std]").forEach(card => {
      card.addEventListener("click", event => {
        if (isNestedOptionControl(event)) return;
          appState.choices.saveTheDate = card.dataset.std;
        saveDraft();
        renderStep();
      });
    });
  } else if (stepIdx === 13) {
    document.querySelectorAll("[data-reminder]").forEach(card => {
      card.addEventListener("click", event => {
        if (isNestedOptionControl(event)) return;
          appState.choices.reminder = card.dataset.reminder;
        saveDraft();
        renderStep();
      });
    });
  } else if (stepIdx === 14) {
    document.querySelectorAll("[data-jump-to]").forEach(btn => {
      btn.addEventListener("click", () => {
        appState.currentStepIndex = parseInt(btn.dataset.jumpTo, 10);
        saveDraft();
        renderStep();
      });
    });

    document.getElementById("btn-copy-summary")?.addEventListener("click", () => {
      saveContactInputs();
      const text = generateSummaryText();
      const feedback = document.getElementById("copy-feedback");
      const report = (message, isError = false) => {
        if (!feedback) return;
        feedback.textContent = message;
        feedback.style.color = isError ? "var(--color-danger)" : "var(--color-success)";
        feedback.style.display = "block";
        setTimeout(() => { feedback.style.display = "none"; }, 4000);
      };
      if (!navigator.clipboard?.writeText) {
        report("Este navegador não permite copiar automaticamente. Você ainda pode abrir o WhatsApp para revisar o texto.", true);
        return;
      }
      navigator.clipboard.writeText(text)
        .then(() => report("Resumo copiado para a área de transferência!"))
        .catch(() => report("Não foi possível copiar neste navegador. Você ainda pode abrir o WhatsApp para revisar o texto.", true));
    });

    document.getElementById("btn-open-whatsapp")?.addEventListener("click", async () => {
      saveContactInputs();
      if (!appState.contact.name || !appState.contact.phone) {
        await showNotice("Preencha seu nome e número de WhatsApp para continuarmos a conversa.", {
          title: "Preencha seus dados",
          confirmLabel: "Revisar dados"
        });
        document.getElementById("contact-name")?.focus();
        return;
      }
      const contactDigits = appState.contact.phone.replace(/\D/g, "");
      if (contactDigits.length < 10 || contactDigits.length > 13) {
        await showNotice("Informe o DDD e um telefone com 10 a 13 dígitos.", {
          title: "Confira o WhatsApp",
          confirmLabel: "Corrigir número"
        });
        document.getElementById("contact-phone")?.focus();
        return;
      }
      const message = generateWhatsAppMessage();
      const url = `https://api.whatsapp.com/send/?phone=${encodeURIComponent(BUSINESS_WHATSAPP)}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  // Previews dependentes da etapa montada (antes nunca eram chamados).
  initModelMusicPlayer(document.getElementById("step-body-content") || document);
  startCountdownPreview(document.getElementById("step-body-content") || document);


  const keyboardCards = document.querySelectorAll(
    ".option-card[data-model-mode='new'], .option-card[data-opening], .option-card[data-photo], .option-card[data-music-mode], .option-card[data-rsvp], .option-card[data-gifts], .option-card[data-manual], .option-card[data-countdown], .option-card[data-gallery], .option-card[data-shared-album-option], .option-card[data-instagram-filter-option], .option-card[data-after-party-none], .option-card[data-std], .option-card[data-reminder]"
  );
  keyboardCards.forEach(card => {
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-pressed", card.classList.contains("selected") ? "true" : "false");
    card.addEventListener("keydown", event => {
      if (event.target === card && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        card.click();
      }
    });
  });

  addChoiceSelectButtons();
}

// Todo cartão de escolha ganha o botão "Eu quero" (vira "Selecionado ✓" na opção ativa), como na etapa de abertura
const CHOICE_CARD_SELECTOR = [
  "data-model-mode", "data-photo", "data-music-mode", "data-rsvp", "data-gifts", "data-manual",
  "data-countdown", "data-gallery", "data-shared-album-option", "data-instagram-filter-option",
  "data-after-party-none", "data-std", "data-reminder"
].map(attr => `.option-card[${attr}]`).join(", ");

function addChoiceSelectButtons() {
  document.querySelectorAll(CHOICE_CARD_SELECTOR).forEach(card => {
    if (card.querySelector(".opening-select-button, .choice-select-button")) return;
    // "Usar Modelo" só tem ação quando já existe um modelo escolhido
    if (card.dataset.modelMode === "selected" && !appState.selectedModel) return;
    const chosen = card.classList.contains("selected");
    const button = document.createElement("button");
    button.type = "button";
    button.className = `btn ${chosen ? "btn-primary is-chosen" : "btn-outline"} choice-select-button`;
    button.setAttribute("aria-pressed", String(chosen));
    button.textContent = chosen ? "Selecionado ✓" : "Eu quero";
    // O clique é repassado ao cartão (o handler do cartão ignora cliques em botões internos)
    button.addEventListener("click", event => {
      event.stopPropagation();
      card.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    card.appendChild(button);
  });
}

function saveContactInputs() {
  const nameEl = document.getElementById("contact-name");
  const phoneEl = document.getElementById("contact-phone");
  if (nameEl) appState.contact.name = nameEl.value.trim();
  if (phoneEl) appState.contact.phone = phoneEl.value.trim();
}

function saveCurrentStepData(stepIdx) {
  if (stepIdx === 1) {
    const custInput = document.getElementById("input-model-custom");
    if (custInput) appState.modelCustomization = custInput.value.trim();
    const themeInput = document.getElementById("input-model-theme");
    if (themeInput) appState.event.theme = themeInput.value.trim();
    const paletteInput = document.getElementById("input-model-palette");
    if (paletteInput) appState.event.palette = paletteInput.value.trim();
  } else if (stepIdx === 2) {
    appState.event.type = document.getElementById("evt-type")?.value || "Aniversário";
    appState.event.eventName = document.getElementById("evt-name")?.value.trim() || "";
    appState.event.age = eventHasAge(appState.event.type) ? document.getElementById("evt-age")?.value.trim() || "" : "";
    appState.event.date = document.getElementById("evt-date")?.value || "";
    appState.event.time = document.getElementById("evt-time")?.value || "";
    appState.event.endTime = document.getElementById("evt-endtime")?.value || "";
    appState.event.location = document.getElementById("evt-loc")?.value.trim() || "";
    appState.event.theme = document.getElementById("evt-theme")?.value.trim() || "";
    appState.event.palette = document.getElementById("evt-pal")?.value.trim() || "";
  } else if (stepIdx === 5) {
    const musicText = document.getElementById("music-text");
    if (musicText) appState.choices.music.value = musicText.value.trim();
  } else if (stepIdx === 6) {
    const rsvpPhone = document.getElementById("rsvp-phone-input");
    if (rsvpPhone) appState.rsvpPhone = rsvpPhone.value.trim();
  } else if (stepIdx === 7) {
    const giftInput = document.getElementById("gift-details-input");
    if (giftInput) appState.giftDetails = giftInput.value.trim();
  } else if (stepIdx === 8) {
    const manualInput = document.getElementById("manual-details-input");
    if (manualInput) appState.manualDetails = manualInput.value.trim();
  } else if (stepIdx === 13) {
    const notesInput = document.getElementById("notes-input");
    if (notesInput) appState.notes = notesInput.value.trim();
  }
}

/**
 * Rótulos do bloco de álbum e filtro por QR Code.
 * Funcao pura: nao depende do DOM e reflete isolar vs conjunto.
 * @param {Object} choices - appState.choices
 * @returns {{ isBundle: boolean, lines: string[] }}
 */
export function describeAfterPartyChoices(choices = {}) {
  const album = choices.sharedAlbum === "include";
  const filter = choices.instagramFilter === "include";
  if (album && filter) {
    return { isBundle: true, lines: [`Fotos depois da festa: Álbum Compartilhado + Filtro — ${formatCurrency(PRICE_RULES.bundle)} no conjunto (um QR Code).`] };
  }
  if (album) return { isBundle: false, lines: [`Fotos depois da festa: Álbum Compartilhado — ${formatCurrency(PRICE_RULES.sharedAlbum)}.`] };
  if (filter) return { isBundle: false, lines: [`Fotos depois da festa: Filtro para Instagram — ${formatCurrency(PRICE_RULES.instagramFilter)}.`] };
  return { isBundle: false, lines: [] };
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

function generateSummaryText() {
  const { total } = calculateBudget(appState);
  const selectedModel = appState.modelMode === "selected" ? appState.selectedModel : null;
  const mName = selectedModel?.name || selectedModel?.slug || (appState.modelMode === "new" ? "Modelo Novo Exclusivo" : "Não informado");
  const musicMode = appState.choices.music?.mode || "none";
  const musicLabel = musicMode === "model_music"
    ? "Do modelo"
    : musicMode === "name_or_link"
      ? appState.choices.music?.value || "A definir"
      : "Sem música";
  const giftDetailsEnabled = ["simple", "premium"].includes(appState.choices.gifts);
  const manualDetailsEnabled = ["simple", "premium"].includes(appState.choices.manual);
  const rsvpLabel = appState.choices.rsvp === "smart_form"
    ? "Formulário Inteligente (+R$5)"
    : appState.choices.rsvp === "whatsapp"
      ? `Direto no WhatsApp (${appState.rsvpPhone || "a combinar"})`
      : "Sem confirmação";
  const giftsLabel = ({
    smart_list: "Lista Inteligente (+R$15)",
    premium: "Sugestões Premium (+R$5)",
    client_list: "Link de Lista Externa",
    simple: "Sugestões Simples"
  })[appState.choices.gifts] || "Sem presentes";
  const manualLabel = appState.choices.manual === "premium"
    ? "Manual Premium (+R$5)"
    : appState.choices.manual === "simple"
      ? "Manual Simples"
      : "Sem manual";
  
  return [
    `RESUMO DO ORÇAMENTO - CONVITES MFORGE`,
    `Cliente: ${appState.contact.name || "A informar"}`,
    `WhatsApp: ${appState.contact.phone || "A informar"}`,
    `----------------------------------------`,
    `Modelo: ${mName}`,
    appState.modelMode === "selected" && appState.choices.modelCustomization && appState.modelCustomization ? `Personalização: ${appState.modelCustomization}` : null,
    `Evento: ${appState.event.type} - ${appState.event.eventName || "A definir"}`,
    appState.event.theme ? `Tema: ${appState.event.theme}` : null,
    appState.event.palette ? `Paleta: ${appState.event.palette}` : null,
    appState.event.date ? `Data: ${appState.event.date} (${appState.event.time || "horário a definir"})` : null,
    appState.event.location ? `Local: ${appState.event.location}` : null,
    `Abertura: ${getOpeningChoiceLabel()}`,
    appState.choices.openingPhoto === 'include' ? `Foto na abertura: Sim` : null,
    `Música: ${musicLabel}`,
    `Confirmação de presença: ${rsvpLabel}`,
    `Presentes: ${giftsLabel}`,
    giftDetailsEnabled && appState.giftDetails ? `Sugestões de presentes:\n${appState.giftDetails}` : null,
    `Manual: ${manualLabel}`,
    manualDetailsEnabled && appState.manualDetails ? `Manual do convidado:\n${appState.manualDetails}` : null,
    `Cronômetro: ${appState.choices.countdown === "include" ? "Incluir" : "Não incluir"}`,
    appState.choices.gallery === 'include' ? `Galeria: Sim` : null,
    ...describeAfterPartyChoices(appState.choices).lines,
    appState.choices.saveTheDate !== 'none' ? `Save the Date: ${appState.choices.saveTheDate}` : null,
    appState.choices.reminder === 'include' ? `Lembrete: Sim` : null,
    appState.notes ? `Observações: ${appState.notes}` : null,
    doubtsLine() ? `Dúvidas em: ${doubtsLine()}` : null,
    `----------------------------------------`,
    `VALOR TOTAL: ${formatBudgetTotal(total)}`,
    `Prazo de entrega: até ${DELIVERY_DAYS} dias úteis após o pagamento do sinal de R$${DEPOSIT_AMOUNT}.`
  ].filter(Boolean).join("\n");
}

function generateWhatsAppMessage() {
  const { total } = calculateBudget(appState);
  const selectedModel = appState.modelMode === "selected" ? appState.selectedModel : null;
  const mName = selectedModel?.name || selectedModel?.slug || (appState.modelMode === "new" ? "Modelo Novo Exclusivo" : "Não definido");
  const modelUrl = selectedModel?.slug ? `https://pedidos.mforge.com.br/modelos/${encodeURIComponent(selectedModel.slug)}/index.html` : "";
  const musicMode = appState.choices.music?.mode || "none";
  const musicLabel = musicMode === "model_music"
    ? "Música do modelo"
    : musicMode === "name_or_link"
      ? appState.choices.music?.value || "Música a definir"
      : "Sem música";
  const giftDetailsEnabled = ["simple", "premium"].includes(appState.choices.gifts);
  const manualDetailsEnabled = ["simple", "premium"].includes(appState.choices.manual);

  const lines = [
    "Olá! Finalizei meu orçamento pelo site da MForge ✨",
    "",
    `👤 *Cliente:* ${appState.contact.name}`,
    `📱 *WhatsApp informado:* ${appState.contact.phone}`,
    "",
    "💌 *MODELO*",
    `- Escolha: ${mName}`,
    modelUrl ? `- Demonstração: ${modelUrl}` : null,
    appState.modelMode === "selected" && appState.choices.modelCustomization && appState.modelCustomization ? `- Personalização solicitada: ${appState.modelCustomization}` : null,
    "",
    "🎉 *DADOS DO EVENTO*",
    `- Tipo: ${appState.event.type}`,
    appState.event.eventName ? `- Nome: ${appState.event.eventName}` : null,
    appState.event.age ? `- Idade: ${appState.event.age}` : null,
    appState.event.date ? `- Data: ${appState.event.date}` : null,
    appState.event.time ? `- Horário: ${appState.event.time}${appState.event.endTime ? ` até ${appState.event.endTime}` : ''}` : null,
    appState.event.location ? `- Local: ${appState.event.location}` : null,
    appState.event.theme ? `- Tema: ${appState.event.theme}` : null,
    appState.event.palette ? `- Paleta: ${appState.event.palette}` : null,
    "",
    "✨ *ESCOLHAS DO CONVITE*",
    `- Tipo de abertura: ${getOpeningChoiceLabel()}`,
    appState.choices.openingPhoto === 'include' ? "- Foto na abertura: Sim" : null,
    `- Música: ${musicLabel}`,
    `- RSVP: ${appState.choices.rsvp === 'smart_form' ? 'Formulário Inteligente' : appState.choices.rsvp === 'whatsapp' ? `Direto no WhatsApp (${appState.rsvpPhone || 'a combinar'})` : 'Sem confirmação'}`,
    `- Presentes: ${appState.choices.gifts === 'smart_list' ? 'Lista Inteligente' : appState.choices.gifts === 'premium' ? 'Sugestões Premium' : appState.choices.gifts === 'client_list' ? 'Link Externo' : appState.choices.gifts === 'simple' ? 'Sugestões Simples' : 'Sem sugestões'}`,
    `- Manual: ${appState.choices.manual === 'premium' ? 'Manual Premium' : appState.choices.manual !== 'none' ? 'Manual do Convidado' : 'Sem manual'}`,
    `- Cronômetro: ${appState.choices.countdown === 'include' ? 'Sim' : 'Não'}`,
    appState.choices.gallery === 'include' ? "- Galeria de Fotos: Sim" : null,
    ...describeAfterPartyChoices(appState.choices).lines.map(l => `- ${l.replace(" - R$", ": R$")}`),
    appState.choices.saveTheDate !== 'none' ? `- Save the Date: ${appState.choices.saveTheDate === 'premium' ? 'Premium' : 'Simples'}` : null,
    appState.choices.reminder === 'include' ? "- Lembrete animado: Sim" : null,
    giftDetailsEnabled && appState.giftDetails ? `\n🎁 *DETALHES DOS PRESENTES:*\n${appState.giftDetails}` : null,
    manualDetailsEnabled && appState.manualDetails ? `\n📖 *MANUAL DO CONVIDADO:*\n${appState.manualDetails}` : null,
    appState.notes ? `\n📝 *OBSERVAÇÕES:*\n${appState.notes}` : null,
    doubtsLine() ? `\n❓ *Dúvidas em:* ${doubtsLine()}` : null,
    "",
    `💰 *VALOR TOTAL:* ${total === null ? formatBudgetTotal(total) : `R$${total}`}`,
    "",
    `⏰ *Prazo de entrega:* até ${DELIVERY_DAYS} dias úteis após o pagamento do sinal de R$${DEPOSIT_AMOUNT}.`,
    "",
    "⚠️ *PAGAMENTO DE SINAL*",
    `Sinal de R$${DEPOSIT_AMOUNT}: ${DEPOSIT_PAYMENT_LINK} ou Pix CPF ${DEPOSIT_PIX_CPF}.`
  ];

  return lines.filter(l => l !== null).join("\n");
}

// Inicialização
const mobileReassure = document.getElementById("mobile-reassure");
if (mobileReassure) mobileReassure.innerHTML = reassuranceHtml();
loadDraft();
initModelFromQuery();
renderStep();
