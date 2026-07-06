const $ = (selector, root = document) => root.querySelector(selector);

const els = {
  welcome: $("#welcome"),
  chat: $("#chat-app"),
  start: $("#start-chat"),
  messages: $("#messages"),
  composer: $("#composer"),
  input: $("#message-input"),
  send: $("#send-button"),
  total: $("#total-price"),
  progressBar: $("#progress-bar"),
  progressLabel: $("#progress-label"),
  progressNumber: $("#progress-number"),
  restart: $("#restart"),
  help: $("#help-button"),
  moreIndicator: $("#more-indicator"),
  assetModal: $("#asset-modal"),
  assetModalContent: $("#asset-modal-content"),
  assetModalClose: $("#asset-modal-close"),
  assetModalSelect: $("#asset-modal-select"),
  contactModal: $("#contact-modal"),
  contactForm: $("#contact-form"),
  contactName: $("#contact-name"),
  contactPhone: $("#contact-phone"),
  contactError: $("#contact-error"),
  checkout: $("#checkout-button")
};

const state = {
  step: "model",
  leadId: "",
  name: "",
  phone: "",
  total: 80,
  selectedModel: false,
  selectedModelData: null,
  modelMode: "none",
  modelBrief: "",
  modelCustomization: "",
  event: {},
  choices: {},
  giftDetails: "",
  manualDetails: "",
  rsvpPhone: "",
  notes: "",
  pending: [],
  editing: false
};

const STORAGE_KEY = "susie_budget_state";
const FIRST_ACCESS_KEY = "susie_budget_first_access_date";
const PUBLIC_SITE_ORIGIN = "https://pedidos.mforge.com.br";
const today = new Date().toISOString().slice(0, 10);
if (!localStorage.getItem(FIRST_ACCESS_KEY)) localStorage.setItem(FIRST_ACCESS_KEY, today);
const isFirstAccessDay = localStorage.getItem(FIRST_ACCESS_KEY) === today;

const placeholders = {
  name: ["Luiz Fernando", "Samantha", "Kelly Vieira", "Lívia Maia", "Sarah Vieira"],
  modelBrief: ["Floral Azul com Turquesa", "Moana Baby Rosé e Azul", "Baile de Inverno Azul, Dourado e Rosé"]
};

const GIFT_PLACEHOLDER = `Exemplo de presentes:
- Sapatos 36
- Vestidos M
- Maquiagem
- Jóias Prata
- Livros
- Pelúcias
- Chave Pix 12345678910`;

const MANUAL_TEMPLATE = `Exemplo de Manual:
Chegue no horário: Sua presença pontual é muito importante para nós.
Confirme sua presença: Por favor, confirme presença pelo menos 15 dias antes do evento.
Convidado não convida!
Divirta-se bastante! Estamos ansiosos para celebrar este momento especial com você.
Não vá embora sem me dar um abraço e comer um pedaço do bolo: Queremos compartilhar cada instante com você.`;

let placeholderTimer;
let placeholderIndex = 0;
let countdownTimer;
let activeAssetCard = null;
let startupInFlight = false;
let submissionInFlight = false;
let trackingTimer;

function createLeadId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `lead-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.length < 12 || digits.length > 15) return "";
  return `+${digits}`;
}

function trackingPayload(eventType, details = {}) {
  const marketingAttribution = globalThis.MForgeMeta?.getAttribution?.() || {};
  return {
    schemaVersion: 1,
    eventId: createLeadId(),
    eventType,
    occurredAt: new Date().toISOString(),
    leadId: state.leadId,
    phoneE164: state.phone,
    name: state.name,
    step: state.step,
    total: state.total,
    pageUrl: location.href,
    referrer: document.referrer || "",
    details: {
      ...details,
      marketingAttribution
    },
    snapshot: {
      marketingAttribution,
      selectedModel: state.selectedModelData?.slug || "",
      modelMode: state.modelMode,
      modelBrief: state.modelBrief,
      modelCustomization: state.modelCustomization,
      event: state.event,
      choices: state.choices,
      giftDetails: state.giftDetails,
      manualDetails: state.manualDetails,
      rsvpPhone: state.rsvpPhone,
      notes: state.notes,
      pending: state.pending
    }
  };
}

function trackEvent(eventType, details = {}, immediate = false) {
  if (!state.leadId) return;
  const payload = trackingPayload(eventType, details);
  globalThis.MForgeMeta?.trackSusieEvent(payload);
  const config = globalThis.SUSIE_TRACKING_CONFIG || {};
  if (!config.endpoint) return;
  const body = JSON.stringify({ ...payload, writeKey: config.writeKey || "" });
  if (immediate && navigator.sendBeacon) {
    navigator.sendBeacon(config.endpoint, new Blob([body], { type: "text/plain;charset=UTF-8" }));
    return;
  }
  fetch(config.endpoint, { method: "POST", mode: "no-cors", keepalive: true, headers: { "Content-Type": "text/plain;charset=UTF-8" }, body })
    .catch(() => {});
}

function scheduleSnapshot() {
  clearTimeout(trackingTimer);
  trackingTimer = setTimeout(() => trackEvent("state_snapshot"), 500);
}

function now() {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function hasContentBelow() {
  return els.messages.scrollHeight - els.messages.scrollTop - els.messages.clientHeight > 8;
}

function updateMoreIndicator() {
  els.moreIndicator.hidden = !hasContentBelow();
}

function positionNewMessage(row, preferStart = false) {
  requestAnimationFrame(() => {
    const isLong = row.offsetHeight > els.messages.clientHeight * 0.62;
    if (preferStart || isLong) {
      els.messages.scrollTo({ top: Math.max(0, row.offsetTop - els.messages.offsetTop - 8), behavior: "smooth" });
    } else {
      els.messages.scrollTo({ top: els.messages.scrollHeight, behavior: "smooth" });
    }
    setTimeout(updateMoreIndicator, 360);
  });
}

function setProgress(number, label) {
  els.checkout.hidden = state.step !== "final";
  els.progressBar.style.width = `${Math.round((number / 12) * 100)}%`;
  els.progressLabel.textContent = label;
  els.progressNumber.textContent = `${number} de 12`;
  trackEvent("step_viewed", { progress: number, label });
}

function setInput(enabled, examples = [], fallback = "Escolha uma opção acima para continuar") {
  clearInterval(placeholderTimer);
  els.input.disabled = !enabled;
  els.send.disabled = !enabled;
  els.input.value = "";
  if (!enabled) els.composer.classList.remove("composer-expanded");
  els.input.placeholder = fallback;
  if (!enabled || !examples.length) return;
  placeholderIndex = 0;
  els.input.placeholder = `Ex.: ${examples[0]}`;
  placeholderTimer = setInterval(() => {
    placeholderIndex = (placeholderIndex + 1) % examples.length;
    els.input.placeholder = `Ex.: ${examples[placeholderIndex]}`;
  }, 2100);
  setTimeout(() => els.input.focus(), 50);
}

function message(content, who = "susie") {
  const row = document.createElement("div");
  row.className = `message-row ${who}`;
  row.innerHTML = who === "susie"
    ? `<span class="mini-avatar">S</span><div class="bubble">${content}<span class="message-time">${now()}</span></div>`
    : `<div class="bubble">${content}<span class="message-time">${now()}</span></div>`;
  els.messages.appendChild(row);
  positionNewMessage(row, who === "susie");
  return row;
}

function choices(items) {
  const group = document.createElement("div");
  group.className = "choices";
  items.forEach(item => {
    if (item.hint) {
      const hint = document.createElement("div");
      hint.className = "choice-hint";
      hint.innerHTML = item.label;
      group.appendChild(hint);
      return;
    }
    const button = document.createElement("button");
    button.className = `choice ${item.className || ""}`;
    button.innerHTML = item.label;
    button.addEventListener("click", () => {
      if (button.dataset.actionRunning === "true") return;
      button.dataset.actionRunning = "true";
      if (!item.keepEnabled) group.querySelectorAll("button").forEach(btn => btn.disabled = true);
      Promise.resolve(item.action()).finally(() => {
        if (item.keepEnabled) {
          setTimeout(() => delete button.dataset.actionRunning, 350);
        }
      });
    });
    group.appendChild(button);
  });
  els.messages.appendChild(group);
  updateMoreIndicator();
}

function phaseTitle(title, icon = "✦") {
  return `<h3 class="phase-title"><span>${icon}</span>${title}</h3>`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function assetSelectionMarkup(selection) {
  if (!selection) return "";
  return `<button type="button" class="asset-select" aria-label="Selecionar ${selection.label}">Selecionar</button>`;
}

function assetData(selection) {
  if (!selection) return "";
  return ` data-select-group="${selection.group}" data-select-value="${selection.value}" data-select-label="${selection.label}"`;
}

function assetImage(src, label, selection = null) {
  return `<figure class="asset-card" role="button" tabindex="0" data-preview-type="image" data-preview-src="${src}" data-preview-label="${label}"${assetData(selection)}><figcaption>${label}</figcaption><img src="${src}" alt="${label}" loading="lazy">${assetSelectionMarkup(selection)}</figure>`;
}

function assetVideo(src, label, selection = null) {
  return `<figure class="asset-card" role="button" tabindex="0" data-preview-type="video" data-preview-src="${src}" data-preview-label="${label}"${assetData(selection)}><figcaption>${label}</figcaption><video src="${src}" muted loop autoplay playsinline controls preload="auto"></video>${assetSelectionMarkup(selection)}</figure>`;
}

function assetStrip(items) {
  return `<div class="asset-strip">${items.join("")}</div>`;
}

function missingPreview(label) {
  return `<div class="missing-preview"><span>Imagem pendente</span><strong>${label}</strong><small>Envie este asset para substituirmos o placeholder.</small></div>`;
}

function openingAssets() {
  return assetStrip([
    assetVideo("assets/orcamento/Exemplo Abertura Longa.mp4", "Abertura Longa", { group: "opening", value: "long", label: "Abertura Longa" }),
    assetVideo("assets/orcamento/Exemplo Abertura Curta.mp4", "Abertura Curta", { group: "opening", value: "short", label: "Abertura Curta" })
  ]);
}

async function susie(content, delay = 380) {
  const typing = $("#typing-template").content.cloneNode(true);
  els.messages.appendChild(typing);
  els.messages.scrollTo({ top: els.messages.scrollHeight, behavior: "smooth" });
  await new Promise(resolve => setTimeout(resolve, delay));
  $(".typing-row", els.messages)?.remove();
  message(content);
}

function user(text) {
  message(text, "user");
}

function addPrice(amount) {
  state.total += amount;
  els.total.textContent = `R$ ${state.total}`;
  els.total.classList.add("bump");
  setTimeout(() => els.total.classList.remove("bump"), 280);
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleSnapshot();
}

function calculateTotal() {
  const c = state.choices;
  let total = 80;
  if (state.modelMode === "new") total += 10;
  if (c.modelCustomization) total += 10;
  if (c.openingPhoto === "include") total += 5;
  if (c.rsvp === "smart_form") total += 5;
  if (c.gifts === "premium") total += 5;
  if (c.gifts === "smart_list") total += 15;
  if (c.manual === "premium") total += 5;
  if (c.gallery === "include") total += 5;
  if (c.saveTheDate === "simple" && !isFirstAccessDay) total += 15;
  if (c.saveTheDate === "premium") total += 50;
  state.total = total;
  els.total.textContent = `R$ ${total}`;
  els.total.classList.add("bump");
  setTimeout(() => els.total.classList.remove("bump"), 280);
  persist();
}

function setChoice(key, value) {
  state.choices[key] = value;
  calculateTotal();
}

async function begin() {
  els.welcome.hidden = true;
  els.chat.hidden = false;
  state.step = "model";
  state.leadId ||= createLeadId();
  persist();
  setInput(false);
  await susie(`Olá, <strong>${escapeHtml(state.name)}</strong>! Eu sou a <strong>Susie</strong>. Nossos convites custam R$80 e já incluem música, abertura 3D animada e botões clicáveis. Vou te explicar tudo bem fácil e rápido ✨`, 520);
  await modelStep();
}

async function modelStep() {
  state.step = "model";
  setProgress(1, "Escolha do modelo");
  const selected = JSON.parse(localStorage.getItem("selectedModel") || "null");
  if (selected) {
    state.selectedModel = true;
    state.selectedModelData = selected;
    state.modelMode = "selected";
    persist();
    const cover = selected.capa ? `../${selected.capa}` : `../modelos/${encodeURIComponent(selected.slug)}/assets/capa.jpg`;
    await susie(`${phaseTitle("Modelo", "◇")}Pra começar, vejo que você escolheu um lindo modelo para inspirar seu convite!
      <div class="model-preview"><img src="${cover}" alt="Capa do modelo escolhido"><div><strong>${selected.name || selected.slug}</strong><small>${selected.tema || ""}</small></div></div>
      Você quer mudar alguma coisa?`);
    choices([
      { label: "Trocar Modelo", action: chooseExistingModel },
      { label: "Trocar Cores ou Tema <span class='choice-price'>+R$10</span>", action: customizeModel },
      { className: "metallic-choice", label: "Confirmar Modelo", action: () => { user("Confirmar Modelo"); if (state.editing) { state.editing = false; finalStep(); } else eventStep(); } }
    ]);
    return;
  }
  await susie(`${phaseTitle("Modelo", "◇")}Pra começar, você já deu uma olhada em nossos modelos?`);
  choices([
    { label: "✦ Escolher Modelo<small>Ver nossa coleção completa</small>", action: chooseExistingModel },
    { label: "Criar um novo <span class='choice-price'>+R$10</span>", action: createNewModel },
    { label: "Não encontrei o que eu quero", action: noModelFound }
  ]);
}

async function chooseExistingModel() {
  user("Escolher Modelo");
  state.step = "model";
  persist();
  window.location.href = "../modelos.html";
}

async function noModelFound() {
  user("Não encontrei o modelo que eu quero");
  await susie("Sem problemas! Podemos criar um novo modelo do jeitinho que você imaginou.");
  choices([{ label: "Quero criar um novo <span class='choice-price'>+R$10</span>", action: createNewModel }, { label: "Voltar e escolher modelo", action: chooseExistingModel }]);
}

async function createNewModel() {
  user("Quero criar um novo (+R$10)");
  state.modelMode = "new";
  calculateTotal();
  state.step = "modelBrief";
  await susie("Muito bem! Vamos criar um convite do zero para você. Quais cores e tema você tem em mente?");
  setInput(true, placeholders.modelBrief, "Conte as cores e o tema");
}

async function customizeModel() {
  user("Trocar cores ou tema do modelo (+R$10)");
  state.choices.modelCustomization = true;
  calculateTotal();
  state.step = "modelBrief";
  await susie("Perfeito! Me conte o que você quer mudar nas cores ou no tema.");
  setInput(true, ["Trocar prata por dourado", "Paleta rosé e lilás", "Manter as cores e trocar o tema"]);
}

async function submitModelBrief() {
  const value = els.input.value.trim();
  if (!value) return;
  user(value);
  if (state.modelMode === "new") state.modelBrief = value;
  else state.modelCustomization = value;
  persist();
  setInput(false);
  await susie("Já anotei essa inspiração. Vai ficar lindo!");
  if (state.editing) { state.editing = false; finalStep(); }
  else eventStep();
}

async function eventStep() {
  state.step = "event";
  setInput(false);
  setProgress(2, "Dados do evento");
  const customizationValue = state.modelCustomization || "";
  const themeFields = state.choices.modelCustomization
    ? `<div class="field field-wide"><label>Tema e paleta solicitados</label><input name="themePalette" value="${escapeHtml(customizationValue)}"></div>`
    : `<div class="field"><label>Tema</label><input name="theme" placeholder="Ex.: Jardim encantado"></div>
       <div class="field"><label>Paleta de cores</label><input name="palette" placeholder="Ex.: Rosé e dourado"></div>`;
  await susie(`${phaseTitle("Dados do Evento", "✎")}Agora vou anotar os dados principais do evento. Preencha o que você souber; o que faltar, a gente te lembra depois!
    <form class="mini-form" id="event-form">
      <div class="field"><label>Tipo de evento</label><select name="type"><option>Aniversário</option><option>15 anos</option><option>Casamento</option><option>Formatura</option><option>Outro</option></select></div>
      <div class="field"><label>Nome principal</label><input name="eventName" placeholder="Ex.: Lívia Maia"></div>
      <div class="field"><label>Idade, se aplicável</label><input name="age" type="number" min="0" placeholder="Ex.: 15"></div>
      <div class="field"><label>Data</label><input name="date" type="date"></div>
      <div class="field"><label>Horário de início</label><input name="time" type="time"></div>
      <div class="field"><label>Horário de término</label><input name="endTime" type="time"></div>
      <div class="field field-wide"><label>Local</label><input name="location" placeholder="Espaço, salão ou endereço"></div>
      ${themeFields}
      <button class="form-button" type="submit">Salvar dados e continuar</button>
    </form>`, 420);
  $("#event-form").addEventListener("submit", submitEvent);
}

async function submitEvent(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.event = Object.fromEntries(data.entries());
  state.pending = [];
  [["eventName","Nome do evento"],["date","Data"],["time","Horário"],["location","Local"]].forEach(([key, label]) => {
    if (!state.event[key]) state.pending.push(label);
  });
  persist();
  const parts = [data.get("type"), data.get("eventName"), data.get("date")].filter(Boolean);
  event.currentTarget.querySelectorAll("input,select,button").forEach(el => el.disabled = true);
  user(parts.length ? parts.join(" · ") : "Prefiro completar esses dados depois");
  if (state.editing) { state.editing = false; await finalStep(); }
  else await openingStep();
}

async function openingStep() {
  state.step = "opening";
  setProgress(3, "Abertura do convite");
  await susie(`${phaseTitle("Tipo de Abertura", "◇")}Agora vamos escolher como o convite começa. A abertura é a primeira impressão que o convidado vê.
    ${openingAssets()}`);
  choices([
    { label: "ou prefere algo mais direto e sem abertura?", hint: true },
    { label: "Sem Abertura", action: () => finishPreview("Sem Abertura") }
  ]);
}

async function finishPreview(choice) {
  user(choice);
  setChoice("openingType", choice === "Abertura Longa" ? "long" : choice === "Abertura Curta" ? "short" : "none");
  if (state.editing) { state.editing = false; finalStep(); }
  else openingPhotoStep();
}

async function openingPhotoStep() {
  state.step = "openingPhoto";
  setProgress(4, "Foto na abertura");
  await susie(`${phaseTitle("Foto na Abertura", "▣")}Você quer colocar uma foto especial logo na abertura? Ela deixa o início do convite mais pessoal e emocionante.<br><small>A foto será combinada e enviada pelo WhatsApp quando você confirmar o pedido.</small>`);
  choices([
    { label: "Incluir Foto na Abertura <span class='choice-price'>+R$5</span>", action: () => chooseAndGo("openingPhoto", "include", "Incluir Foto na Abertura (+R$5)", musicStep) },
    { label: "Não Quero", action: () => chooseAndGo("openingPhoto", "none", "Não quero foto na abertura", musicStep) }
  ]);
}

async function musicStep() {
  state.step = "music";
  setProgress(5, "Música");
  await susie(`${phaseTitle("Música", "♫")}Agora vamos escolher a música do convite. Você pode me mandar o nome, um link, usar a música do modelo ou deixar sem música.`);
  setInput(true, [], "Digite o nome ou link da música aqui");
  const options = [{ className: "metallic-choice", label: "Escrever nome/link da música", keepEnabled: true, action: focusComposerInput }];
  if (state.selectedModel) options.push({ label: "Usar música do modelo", keepEnabled: true, action: () => chooseMusic("model_music", "Usar música do modelo") });
  options.push({ label: "Sem música", keepEnabled: true, action: () => chooseMusic("none", "Sem música") });
  choices(options);
}

function focusComposerInput() {
  els.input.focus();
}

async function chooseMusic(mode, label, value = "") {
  const changingPreviousChoice = state.step !== "music";
  user(label);
  state.choices.music = { mode, value };
  calculateTotal();
  setInput(false);
  if (changingPreviousChoice) {
    await susie(`Perfeito! Alterei sua escolha de música para <strong>${label}</strong> e mantive o restante do orçamento.`);
  } else if (state.editing) { state.editing = false; finalStep(); }
  else rsvpStep();
}

async function rsvpPhoneStep(label) {
  user(label);
  state.step = "rsvpPhone";
  setProgress(6, "WhatsApp de confirmação");
  persist();
  await susie(`${phaseTitle("WhatsApp para Confirmações", "✓")}Qual número de WhatsApp os convidados deverão chamar para confirmar presença?`);
  setInput(true, [], "(11) 99999-9999");
  if (state.rsvpPhone) {
    els.input.value = state.rsvpPhone.replace(/(\+\d{2})(\d{2})(\d{4,5})(\d{4})/, "$1 $2 $3-$4");
  }
  els.input.focus();
}

async function submitRsvpPhone() {
  const phone = normalizePhone(els.input.value);
  if (!phone) {
    await susie("Digite um WhatsApp válido com DDD, por exemplo: <strong>(11) 99999-9999</strong>.");
    els.input.focus();
    return;
  }
  state.rsvpPhone = phone;
  setChoice("rsvp", "whatsapp");
  user(phone.replace(/(\+\d{2})(\d{2})(\d{4,5})(\d{4})/, "$1 $2 $3-$4"));
  setInput(false);
  if (state.editing) { state.editing = false; finalStep(); }
  else giftsStep();
}

async function rsvpStep() {
  state.step = "rsvp";
  setProgress(6, "Confirmação");
  await susie(`${phaseTitle("Confirmação de Presença", "✓")}Seu convite também pode ajudar a organizar quem vai participar da festa! Escolha como prefere receber as confirmações.
    ${assetStrip([
      assetVideo("assets/orcamento/Exemplo Confirmar Whatsapp.mp4", "Direto no WhatsApp", { group: "rsvp", value: "whatsapp", label: "Confirmação direto no WhatsApp" }),
      assetVideo("assets/orcamento/Formulário inteligente.mp4", "Formulário Inteligente", { group: "rsvp", value: "smart_form", label: "Formulário Inteligente (+R$5)" }),
      assetImage("assets/orcamento/Exemplo Confirmar Formulário.jpg", "Lista organizada")
    ])}`);
  choices([
    { label: "ou prefere seguir sem confirmação?", hint: true },
    { label: "Sem confirmação", action: () => chooseAndGo("rsvp", "none", "Sem confirmação", giftsStep) }
  ]);
}

async function giftsStep() {
  state.step = "gifts";
  setProgress(7, "Presentes");
  await susie(`${phaseTitle("Presentes", "♢")}Agora vamos escolher como as dicas de presente vão aparecer. Essa parte pode ser simples ou mais interativa.
    ${assetStrip([
      assetImage("assets/orcamento/Simples.png", "Sugestões Simples", { group: "gifts", value: "simple", label: "Sugestões Simples" }),
      assetImage("assets/orcamento/Premium.jpg", "Sugestões Premium", { group: "gifts", value: "premium", label: "Sugestões Premium (+R$5)" }),
      assetVideo("assets/orcamento/Lista Inteligente.mp4", "Lista Inteligente", { group: "gifts", value: "smart_list", label: "Lista Inteligente (+R$15)" }),
      assetImage("assets/orcamento/Exemplo Link Lista.jpg", "Lista do Cliente", { group: "gifts", value: "client_list", label: "Lista do Cliente" })
    ])}`);
  choices([
    { label: "ou prefere seguir sem dicas de presente?", hint: true },
    { label: "Sem dicas de presente", action: () => chooseAndGo("gifts", "none", "Sem dicas de presente", manualStep) }
  ]);
}

async function giftDetailsStep(mode, label) {
  user(label);
  setChoice("gifts", mode);
  state.step = "giftDetails";
  setProgress(7, "Sugestões de presentes");
  persist();
  await susie(`${phaseTitle("Sugestões de Presentes", "♢")}Escreva as sugestões que você quer mostrar aos convidados. Você pode seguir o exemplo esmaecido no campo abaixo.`);
  setInput(true, [], GIFT_PLACEHOLDER);
  els.composer.classList.add("composer-expanded");
  if (state.giftDetails) els.input.value = state.giftDetails;
  els.input.focus();
}

async function submitGiftDetails() {
  const value = els.input.value.trim();
  if (!value) return;
  state.giftDetails = value;
  persist();
  user(value.replace(/\n/g, "<br>"));
  setInput(false);
  if (state.editing) { state.editing = false; finalStep(); }
  else manualStep();
}

async function manualStep() {
  state.step = "manual";
  setProgress(8, "Manual");
  await susie(`${phaseTitle("Manual do Convidado", "≡")}O Manual do Convidado ajuda a passar orientações importantes de um jeito bonito e organizado. Como você quer incluir essa parte?
    ${assetStrip([
      assetImage("assets/orcamento/Exemplo Manual do Convidado.jpg", "Manual Simples", { group: "manual", value: "simple", label: "Manual Simples" }),
      assetImage("assets/orcamento/Manual Premium.jpg", "Manual Premium", { group: "manual", value: "premium", label: "Manual Premium (+R$5)" })
    ])}`);
  choices([
    { label: "ou prefere outra opção?", hint: true },
    { label: "Manual do Cliente", action: () => chooseAndGo("manual", "client", "Manual do Cliente", countdownStep) },
    { label: "Sem Manual", action: () => chooseAndGo("manual", "none", "Sem Manual", countdownStep) }
  ]);
}

async function manualDetailsStep(mode, label) {
  user(label);
  setChoice("manual", mode);
  state.step = "manualDetails";
  setProgress(8, "Texto do manual");
  persist();
  await susie(`${phaseTitle("Texto do Manual", "≡")}O texto abaixo já está pronto. Adapte o que quiser ou apenas confirme para continuar.`);
  setInput(true, [], "Escreva o Manual do Convidado");
  els.composer.classList.add("composer-expanded");
  els.input.value = state.manualDetails || MANUAL_TEMPLATE;
  els.input.focus();
}

async function submitManualDetails() {
  const value = els.input.value.trim();
  if (!value) return;
  state.manualDetails = value;
  persist();
  user(value.replace(/\n/g, "<br>"));
  setInput(false);
  if (state.editing) { state.editing = false; finalStep(); }
  else countdownStep();
}

async function countdownStep() {
  state.step = "countdown";
  setProgress(9, "Cronômetro");
  const future = countdownTarget();
  await susie(`${phaseTitle("Contagem Regressiva", "◷")}Quer incluir um cronômetro contando os dias para o evento? Ele cria aquela expectativa gostosa até a data chegar.
    <div class="countdown-preview" data-countdown-target="${future.toISOString()}">
      <h4>CONTAGEM REGRESSIVA</h4>
      <div class="countdown-units">
        <div><strong data-unit="months">00</strong><span>Meses</span></div>
        <div><strong data-unit="days">00</strong><span>Dias</span></div>
        <div><strong data-unit="hours">00</strong><span>Hs</span></div>
        <div><strong data-unit="minutes">00</strong><span>Min</span></div>
        <div><strong data-unit="seconds">00</strong><span>Seg</span></div>
      </div>
    </div>`);
  startCountdownPreview();
  choices([
    { label: "Incluir Cronômetro", action: () => chooseAndGo("countdown", "include", "Incluir Cronômetro", galleryStep) },
    { label: "Não Quero", action: () => chooseAndGo("countdown", "none", "Sem Cronômetro", galleryStep) }
  ]);
}

function countdownTarget() {
  if (state.event?.date) {
    const time = state.event.time || "23:59:59";
    const eventDate = new Date(`${state.event.date}T${time}`);
    if (!Number.isNaN(eventDate.getTime())) return eventDate;
  }
  const fallback = new Date();
  fallback.setMonth(fallback.getMonth() + 3);
  return fallback;
}

function startCountdownPreview() {
  clearInterval(countdownTimer);
  const preview = [...els.messages.querySelectorAll(".countdown-preview")].pop();
  if (!preview) return;
  const target = new Date(preview.dataset.countdownTarget);
  const update = () => {
    const current = new Date();
    let difference = Math.max(0, target - current);
    const seconds = Math.floor((difference / 1000) % 60);
    const minutes = Math.floor((difference / 60000) % 60);
    const hours = Math.floor((difference / 3600000) % 24);
    const totalDays = Math.floor(difference / 86400000);
    const months = Math.floor(totalDays / 30);
    const days = totalDays % 30;
    const values = { months, days, hours, minutes, seconds };
    Object.entries(values).forEach(([unit, value]) => {
      const element = preview.querySelector(`[data-unit="${unit}"]`);
      if (element) element.textContent = String(value).padStart(2, "0");
    });
  };
  update();
  countdownTimer = setInterval(update, 1000);
}

async function galleryStep() {
  state.step = "gallery";
  setProgress(10, "Galeria");
  await susie(`${phaseTitle("Galeria de Fotos", "▦")}Você quer incluir uma galeria de fotos no convite? Ela deixa o convite mais pessoal e ajuda a contar a história visual do evento.<br><small>Você pode nos enviar as fotos pelo WhatsApp depois da confirmação para que possamos colocar na galeria do seu convite.</small>${missingPreview("Galeria de Fotos")}`);
  yesNo("gallery", "Incluir Galeria", 5, saveDateStep);
}

async function saveDateStep() {
  state.step = "saveTheDate";
  setProgress(11, "Save The Date");
  await susie(`${phaseTitle("Save The Date", "◫")}${isFirstAccessDay
    ? "Agora uma opção especial ✨ Fechando o convite ainda hoje, você ganha o Save The Date Simples de brinde!"
    : "Você também pode incluir um Save The Date para avisar os convidados antes do convite oficial."}
    ${assetStrip([assetImage("assets/orcamento/Exemplo Save The Date.jpg", "Exemplo de Save The Date")])}`);
  choices([
    { label: isFirstAccessDay ? "Save The Date Simples — Brinde" : "Save The Date Simples <span class='choice-price'>+R$15</span>", action: () => chooseAndGo("saveTheDate", "simple", isFirstAccessDay ? "Save The Date Simples — Brinde" : "Save The Date Simples (+R$15)", notesStep) },
    { label: "Save The Date Premium <span class='choice-price'>+R$50</span>", action: () => chooseAndGo("saveTheDate", "premium", "Save The Date Premium (+R$50)", notesStep) },
    { label: "Não Quero", action: () => chooseAndGo("saveTheDate", "none", "Sem Save The Date", notesStep) }
  ]);
}

async function notesStep() {
  state.step = "notes";
  setProgress(12, "Observações finais");
  await susie(`${phaseTitle("Observações Finais", "✎")}Antes de fechar, quer me contar mais alguma observação importante sobre o convite? Pode ser uma ideia, preferência ou pedido especial.`);
  setInput(true, [], "Digite sua observação aqui");
  choices([{ label: "Não tenho observações", action: () => finishNotes("") }]);
}

async function finishNotes(value) {
  state.notes = value;
  state.editing = false;
  persist();
  setInput(false);
  if (!value) user("Não tenho observações");
  await finalStep();
}

function yesNo(key, label, price, next) {
  choices([
    { label: `${label} <span class='choice-price'>+R$${price}</span>`, action: () => chooseAndGo(key, "include", `${label} (+R$${price})`, next) },
    { label: "Não Quero", action: () => chooseAndGo(key, "none", "Não Quero", next) }
  ]);
}

function chooseAndGo(key, value, label, next) {
  user(label);
  setChoice(key, value);
  if (state.editing) { state.editing = false; finalStep(); }
  else next();
}

const labels = {
  include: "Incluir", none: "Não incluir", long: "Abertura Longa", short: "Abertura Curta",
  whatsapp: "Direto no WhatsApp", smart_form: "Formulário Inteligente", simple: "Simples",
  premium: "Premium", smart_list: "Lista Inteligente", client_list: "Lista do Cliente",
  client: "Manual do Cliente", model_music: "Música do modelo", name_or_link: "Nome ou link informado"
};

function choiceLabel(value) {
  if (value && typeof value === "object") {
    if (value.mode === "name_or_link" && value.value) return value.value;
    return labels[value.mode] || value.value || "Informada";
  }
  return labels[value] || value || "Não informado";
}

function summaryChoice(key) {
  const value = choiceLabel(state.choices[key]);
  if (key === "rsvp" && state.choices.rsvp === "whatsapp" && state.rsvpPhone) {
    return `${value} · ${state.rsvpPhone}`;
  }
  if (key === "saveTheDate" && state.choices.saveTheDate === "simple" && isFirstAccessDay) {
    return "Save The Date Simples (Brinde)";
  }
  return value;
}

const summaryOptions = [
  ["openingType", "Abertura", "opening"],
  ["openingPhoto", "Foto na abertura", "openingPhoto"],
  ["music", "Música", "music"],
  ["rsvp", "Confirmação", "rsvp"],
  ["gifts", "Presentes", "gifts"],
  ["manual", "Manual", "manual"],
  ["countdown", "Cronômetro", "countdown"],
  ["gallery", "Galeria", "gallery"],
  ["saveTheDate", "Save The Date", "saveTheDate"]
];

function isSummaryIncluded(key) {
  const value = state.choices[key];
  if (!value) return false;
  if (typeof value === "object") return value.mode !== "none";
  return value !== "none";
}

function summaryAddition(key) {
  const value = state.choices[key];
  const prices = {
    openingPhoto: value === "include" ? 5 : 0,
    rsvp: value === "smart_form" ? 5 : 0,
    gifts: value === "premium" ? 5 : value === "smart_list" ? 15 : 0,
    manual: value === "premium" ? 5 : 0,
    gallery: value === "include" ? 5 : 0,
    saveTheDate: value === "premium" ? 50 : value === "simple" && !isFirstAccessDay ? 15 : 0
  };
  return prices[key] || 0;
}

function summaryEditButton(key, label) {
  return `<button type="button" class="summary-edit" data-edit="${key}" aria-label="Alterar ${label}"><i class="fa-solid fa-pencil" aria-hidden="true"></i></button>`;
}

function summaryHtml() {
  const modelName = state.selectedModelData?.name || (state.modelMode === "new" ? "Modelo novo" : "Não escolhido");
  const modelAddition = (state.modelMode === "new" ? 10 : 0) + (state.choices.modelCustomization ? 10 : 0);
  const rows = summaryOptions.filter(([key]) => isSummaryIncluded(key));
  return `<div class="summary-card">
    <h3>Orçamento de ${state.name}</h3>
    <div class="summary-event"><div><strong>${state.event.type || "Evento"}</strong><span>${state.event.eventName || "Nome pendente"} · ${state.event.date || "Data pendente"}</span></div>${summaryEditButton("event", "dados do evento")}</div>
    <div class="summary-row"><span><strong>Modelo:</strong> ${modelName}${modelAddition ? ` <em>+R$${modelAddition}</em>` : ""}</span>${summaryEditButton("model", "modelo")}</div>
    ${rows.map(([key, label, editKey]) => {
      const addition = summaryAddition(key);
      return `<div class="summary-row"><span><strong>${label}:</strong> ${summaryChoice(key)}${addition ? ` <em>+R$${addition}</em>` : ""}</span>${summaryEditButton(editKey, label)}</div>`;
    }).join("")}
    ${state.giftDetails ? `<div class="summary-text"><strong>Texto dos presentes</strong><p>${escapeHtml(state.giftDetails).replace(/\n/g, "<br>")}</p></div>` : ""}
    ${state.manualDetails ? `<div class="summary-text"><strong>Texto do manual</strong><p>${escapeHtml(state.manualDetails).replace(/\n/g, "<br>")}</p></div>` : ""}
    ${state.notes ? `<div class="summary-row"><span><strong>Observações:</strong> ${state.notes}</span>${summaryEditButton("notes", "observações")}</div>` : ""}
    <div class="summary-pending"><strong>Pendências:</strong> ${state.pending.length ? state.pending.join(", ") : "Nenhuma"}</div>
    <div class="summary-total"><span>Valor total</span><strong>R$ ${state.total}</strong></div>
    <p>Prazo de entrega: até 2 dias úteis após o pagamento do sinal de R$20.</p>
  </div>`;
}

async function finalStep() {
  state.step = "final";
  setProgress(12, "Resumo final");
  els.checkout.hidden = false;
  persist();
  trackEvent("budget_completed");
  await susie(`${phaseTitle("Resumo do Orçamento", "✓")}Prontinho! Montei o resumo do seu orçamento ✨ Dá uma olhadinha se está tudo certo.${summaryHtml()}`);
  const editGroup = document.createElement("div");
  editGroup.className = "edit-grid";
  editGroup.innerHTML = `<h3>Outras opções</h3><p>Você também pode incluir:</p>`;
  [["fa-envelope-open","Abertura","openingType","opening"],["fa-image","Foto","openingPhoto","openingPhoto"],["fa-music","Música","music","music"],["fa-user-check","Confirmação","rsvp","rsvp"],["fa-gift","Presentes","gifts","gifts"],["fa-book-open","Manual","manual","manual"],["fa-clock","Cronômetro","countdown","countdown"],["fa-images","Galeria","gallery","gallery"],["fa-heart","Save The Date","saveTheDate","saveTheDate"],["fa-pen","Observações","notes","notes"]].filter(([, , choiceKey]) => choiceKey === "notes" ? !state.notes : !isSummaryIncluded(choiceKey)).forEach(([icon, label, , key]) => {
    editGroup.insertAdjacentHTML("beforeend", `<button type="button" data-edit="${key}"><i class="fa-solid ${icon}"></i>${label}</button>`);
  });
  if (editGroup.querySelector("button")) els.messages.appendChild(editGroup);
  updateMoreIndicator();
  choices([{ label: "Recomeçar orçamento", action: restart }]);
}

function editSection(key) {
  const handlers = {
    model: modelStep, event: eventStep,
    opening: () => { state.editing = true; state.step = "opening"; setProgress(3, "Abertura do convite"); susie(`${phaseTitle("Tipo de Abertura", "◇")}Vamos alterar o tipo de abertura.${openingAssets()}`).then(() => choices([
      { label: "ou prefere algo mais direto e sem abertura?", hint: true },
      { label: "Sem Abertura", action: () => finishPreview("Sem Abertura") }
    ])); },
    openingPhoto: openingPhotoStep, music: musicStep, rsvp: rsvpStep, gifts: giftsStep, manual: manualStep,
    countdown: countdownStep, gallery: galleryStep, saveTheDate: saveDateStep, notes: notesStep
  };
  state.editing = true;
  user(`Alterar: ${key}`);
  handlers[key]?.();
}

function modelModeLabel() {
  if (state.modelMode === "selected") return "Modelo escolhido da galeria";
  if (state.modelMode === "new") return "Criação de modelo novo";
  return "Modelo ainda não definido";
}

function selectedModelLink() {
  const slug = state.selectedModelData?.slug;
  return slug ? `${PUBLIC_SITE_ORIGIN}/modelos.html?modelo=${encodeURIComponent(slug)}` : "";
}

function whatsappChoiceLines() {
  const c = state.choices || {};
  const specs = [
    ["openingType", "Tipo de abertura", { long: "Abertura Longa", short: "Abertura Curta" }],
    ["openingPhoto", "Foto na abertura", { include: "Sim" }],
    ["rsvp", "Confirmação de presença", { whatsapp: state.rsvpPhone ? `Direto no WhatsApp (${state.rsvpPhone})` : "Direto no WhatsApp", smart_form: "Formulário Inteligente" }],
    ["gifts", "Presentes", { simple: "Sugestões Simples", premium: "Sugestões Premium", smart_list: "Lista Inteligente", client_list: "Lista do Cliente" }],
    ["manual", "Manual do Convidado", { simple: "Manual Simples", premium: "Manual Premium", client: "Manual do Cliente" }],
    ["countdown", "Cronômetro", { include: "Sim" }],
    ["gallery", "Galeria de Fotos", { include: "Sim" }],
    ["saveTheDate", "Save The Date", { simple: isFirstAccessDay ? "Simples — Brinde de primeiro acesso" : "Simples", premium: "Premium" }]
  ];
  const lines = specs.flatMap(([key, label, values]) => {
    const value = c[key];
    if (!value || value === "none" || !values[value]) return [];
    return [`- ${label}: ${values[value]}`];
  });
  const music = c.music;
  if (music?.mode === "model_music") lines.splice(2, 0, "- Música: Usar música do modelo");
  if (music?.mode === "name_or_link" && music.value?.trim()) lines.splice(2, 0, `- Música: ${music.value.trim()}`);
  return lines;
}

function whatsappMessage() {
  const e = state.event || {};
  const sections = [
    "Oi! Finalizei meu orçamento pelo site com a Susie \u2728",
    `\u{1F464} *Cliente:* ${state.name}`,
    `\u{1F4F1} *WhatsApp informado:* ${state.phone}`,
  ];

  const modelLines = [
    "\u{1F48C} *MODELO*",
    `- Tipo: ${modelModeLabel()}`
  ];
  const modelLink = selectedModelLink();
  if (modelLink) modelLines.push(`- Link do modelo escolhido: ${modelLink}`);
  if (state.modelCustomization?.trim()) modelLines.push(`- Personalização: ${state.modelCustomization.trim()}`);
  if (state.modelBrief?.trim()) modelLines.push(`- Briefing do modelo novo: ${state.modelBrief.trim()}`);
  sections.push(modelLines.join("\n"));

  const eventFields = [
    ["Tipo de evento", e.type],
    ["Nome", e.eventName],
    ["Idade", e.age],
    ["Data", e.date],
    ["Horário de início", e.time],
    ["Horário de término", e.endTime],
    ["Local", e.location],
    ["Tema e paleta", e.themePalette],
    ["Tema", e.theme],
    ["Paleta de cores", e.palette]
  ].filter(([, value]) => String(value || "").trim());
  if (eventFields.length) {
    sections.push(`\u{1F389} *DADOS DO EVENTO*\n${eventFields.map(([label, value]) => `- ${label}: ${String(value).trim()}`).join("\n")}`);
  }

  const choiceLines = whatsappChoiceLines();
  if (choiceLines.length) sections.push(`\u2728 *ESCOLHAS DO CONVITE*\n${choiceLines.join("\n")}`);
  if (state.giftDetails?.trim()) sections.push(`\u{1F381} *SUGESTÕES DE PRESENTES*\n${state.giftDetails.trim()}`);
  if (state.manualDetails?.trim()) sections.push(`\u{1F4D6} *MANUAL DO CONVIDADO*\n${state.manualDetails.trim()}`);
  if (state.notes?.trim()) sections.push(`\u{1F4DD} *OBSERVAÇÕES*\n${state.notes.trim()}`);
  if (state.pending?.length) sections.push(`\u26A0\uFE0F *PENDÊNCIAS*\n${state.pending.join(", ")}`);

  sections.push(`\u{1F4B0} *VALOR TOTAL:* R$${state.total}`);
  sections.push("\u23F0 *Prazo de entrega:* até 2 dias úteis após o pagamento do sinal de R$20.");
  sections.push("\u26A0\uFE0F *PAGAMENTO DE SINAL*\nSinal de R$20: https://mpago.la/1wvHN6p ou Pix CPF 49455859890.");
  return sections.join("\n\n");
}

function openWhatsApp() {
  persist();
  trackEvent("budget_confirmed_whatsapp", { destination: "5511939047235" }, true);
  window.open(`https://api.whatsapp.com/send/?phone=5511939047235&text=${encodeURIComponent(whatsappMessage())}&type=phone_number&app_absent=0`, "_blank", "noopener");
}

function openAssetModal(card) {
  const { previewType, previewSrc, previewLabel } = card.dataset;
  els.assetModalContent.innerHTML = previewType === "video"
    ? `<video src="${previewSrc}" aria-label="${previewLabel}" muted loop autoplay playsinline controls></video><strong>${previewLabel}</strong>`
    : `<img src="${previewSrc}" alt="${previewLabel}"><strong>${previewLabel}</strong>`;
  els.assetModal.hidden = false;
  activeAssetCard = card;
  els.assetModalSelect.hidden = !card.dataset.selectGroup;
  document.body.classList.add("modal-open");
  els.assetModalClose.focus();
}

function closeAssetModal() {
  els.assetModal.hidden = true;
  els.assetModalContent.innerHTML = "";
  activeAssetCard = null;
  els.assetModalSelect.hidden = true;
  document.body.classList.remove("modal-open");
}

function selectAssetOption(card) {
  const { selectGroup: group, selectValue: value, selectLabel: label } = card.dataset;
  if (!group) return;
  const assetGroup = card.closest(".asset-strip");
  if (assetGroup?.dataset.selectionHandled === "true") return;
  if (assetGroup) assetGroup.dataset.selectionHandled = "true";
  assetGroup?.querySelectorAll(".asset-select").forEach(button => { button.disabled = true; });
  card.classList.add("asset-card-selected");
  if (group === "opening") {
    finishPreview(label);
  } else if (group === "rsvp") {
    if (value === "whatsapp") rsvpPhoneStep(label);
    else chooseAndGo("rsvp", value, label, giftsStep);
  } else if (group === "gifts") {
    if (value === "simple" || value === "premium") giftDetailsStep(value, label);
    else chooseAndGo("gifts", value, label, manualStep);
  } else if (group === "manual") {
    manualDetailsStep(value, label);
  }
}

function showContactModal() {
  els.contactName.value = state.name || "";
  els.contactPhone.value = state.phone || "";
  els.contactError.hidden = true;
  els.contactModal.hidden = false;
  requestAnimationFrame(() => els.contactName.focus());
}

function submitContact(event) {
  event.preventDefault();
  const name = els.contactName.value.trim();
  const phone = normalizePhone(els.contactPhone.value);
  if (name.length < 2 || !phone) {
    els.contactError.textContent = name.length < 2
      ? "Digite seu nome para continuar."
      : "Digite um WhatsApp válido com DDD.";
    els.contactError.hidden = false;
    return;
  }
  state.leadId ||= createLeadId();
  state.name = name;
  state.phone = phone;
  state.step = "contactComplete";
  persist();
  trackEvent("name_provided");
  trackEvent("phone_provided", {}, true);
  els.contactModal.hidden = true;
  els.contactError.hidden = true;
}

async function startOrResume() {
  if (startupInFlight || !els.chat.hidden) return;
  if (!state.name || !state.phone) {
    showContactModal();
    return;
  }
  startupInFlight = true;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved?.name || !saved?.phone) {
      await begin();
      return;
    }
    Object.assign(state, saved);
    if (state.step === "contactComplete") {
      await begin();
      return;
    }
    state.leadId ||= createLeadId();
    state.choices ||= {};
    delete state.choices.visualIdentity;
    delete state.choices.reminder;
    delete state.choices.photoQrCode;
    delete state.choices.guestPlaylist;
    if (state.step === "identity") state.step = "opening";
    if (["name", "phone"].includes(state.step)) state.step = "model";
    if (["reminder", "photoQrCode", "guestPlaylist"].includes(state.step)) state.step = "notes";
    els.welcome.hidden = true;
    els.chat.hidden = false;
    calculateTotal();
    setInput(false);
    await susie(`Que bom ter você de volta, <strong>${state.name}</strong>! Suas escolhas continuam salvas por aqui ✨`);
    const handlers = {
      model: modelStep, modelBrief: modelStep, event: eventStep, opening: openingStep,
      openingPhoto: openingPhotoStep, music: musicStep, rsvp: rsvpStep, rsvpPhone: () => rsvpPhoneStep("Confirmação direto no WhatsApp"), gifts: giftsStep, giftDetails: () => giftDetailsStep(state.choices.gifts || "simple", choiceLabel(state.choices.gifts)),
      manual: manualStep, manualDetails: () => manualDetailsStep(state.choices.manual || "simple", choiceLabel(state.choices.manual)),
      countdown: countdownStep, gallery: galleryStep, saveTheDate: saveDateStep, notes: notesStep, final: finalStep
    };
    await (handlers[state.step] || modelStep)();
  } finally {
    startupInFlight = false;
  }
}

function submitMessage(event) {
  event.preventDefault();
  if (submissionInFlight) return;
  let action = null;
  if (state.step === "modelBrief") action = submitModelBrief();
  else if (state.step === "music") {
    const value = els.input.value.trim();
    if (value) action = chooseMusic("name_or_link", value, value);
  } else if (state.step === "rsvpPhone") action = submitRsvpPhone();
  else if (state.step === "giftDetails") action = submitGiftDetails();
  else if (state.step === "manualDetails") action = submitManualDetails();
  else if (state.step === "notes") {
    const value = els.input.value.trim();
    if (value) {
      user(value);
      action = finishNotes(value);
    }
  }
  if (!action) return;
  submissionInFlight = true;
  Promise.resolve(action).finally(() => { submissionInFlight = false; });
}

function restart() {
  clearInterval(placeholderTimer);
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(state, {
    step: "model", leadId: "", name: "", phone: "", total: 80, selectedModel: false, selectedModelData: null,
    modelMode: "none", modelBrief: "", modelCustomization: "", event: {}, choices: {}, giftDetails: "", manualDetails: "", rsvpPhone: "", notes: "", pending: [], editing: false
  });
  els.messages.innerHTML = "";
  els.total.textContent = "R$ 80";
  els.checkout.hidden = true;
  els.chat.hidden = true;
  els.welcome.hidden = false;
  $("#start-chat span").textContent = "Começar meu orçamento";
  showContactModal();
}

const savedOnLoad = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
if (savedOnLoad?.name && savedOnLoad?.phone) {
  Object.assign(state, savedOnLoad);
  $("#start-chat span").textContent = "Continuar meu orçamento";
  queueMicrotask(startOrResume);
} else {
  showContactModal();
}
els.start.addEventListener("click", startOrResume);
els.contactForm.addEventListener("submit", submitContact);
els.checkout.addEventListener("click", openWhatsApp);
els.composer.addEventListener("submit", submitMessage);
els.restart.addEventListener("click", restart);
els.messages.addEventListener("scroll", updateMoreIndicator, { passive: true });
els.messages.addEventListener("click", event => {
  const assetCard = event.target.closest(".asset-card");
  if (assetCard) {
    if (event.target.closest(".asset-select")) {
      event.stopPropagation();
      selectAssetOption(assetCard);
      return;
    }
    openAssetModal(assetCard);
    return;
  }
  const editButton = event.target.closest("[data-edit]");
  if (editButton) {
    els.messages.querySelectorAll("[data-edit]").forEach(button => { button.disabled = true; });
    editSection(editButton.dataset.edit);
  }
});
els.messages.addEventListener("keydown", event => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches(".asset-card")) {
    event.preventDefault();
    openAssetModal(event.target);
  }
});
els.assetModalClose.addEventListener("click", closeAssetModal);
els.assetModalSelect.addEventListener("click", () => {
  const selectedCard = activeAssetCard;
  closeAssetModal();
  if (selectedCard) selectAssetOption(selectedCard);
});
els.assetModal.addEventListener("click", event => {
  if (event.target === els.assetModal) closeAssetModal();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !els.assetModal.hidden) closeAssetModal();
});
els.moreIndicator.addEventListener("click", () => {
  els.messages.scrollBy({ top: Math.max(160, els.messages.clientHeight * .72), behavior: "smooth" });
  setTimeout(updateMoreIndicator, 360);
});
els.help.addEventListener("click", () => {
  const text = encodeURIComponent("Oi! Eu estava fazendo o orçamento pelo site e tive uma dificuldade…");
  window.open(`https://wa.me/5511939047235?text=${text}`, "_blank", "noopener");
});
