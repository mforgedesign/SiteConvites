/* ==========================================================================
   Catálogo - Lógica JS
   143 modelos com filtros, busca, prévia modal e seleção
   ========================================================================== */

const PUBLIC_ORIGIN = "https://pedidos.mforge.com.br";
let allModels = [];
let activeCategory = "all";
let searchQuery = "";

const elements = {
  grid: document.getElementById("catalog-grid"),
  count: document.getElementById("catalog-count"),
  searchInput: document.getElementById("catalog-search"),
  filterTabs: document.getElementById("catalog-filters"),
  clearSearch: document.getElementById("catalog-clear-search"),
  modalBackdrop: document.getElementById("preview-modal-backdrop"),
  modalTitle: document.getElementById("preview-modal-title"),
  modalIframe: document.getElementById("preview-modal-iframe"),
  modalClose: document.getElementById("preview-modal-close"),
  modalSelect: document.getElementById("preview-modal-select"),
  modalExternal: document.getElementById("preview-modal-external"),
  modalCopy: document.getElementById("preview-modal-copy"),
  modalOpening: document.getElementById("preview-modal-opening"),
  copyFeedback: document.getElementById("preview-copy-feedback"),
  liveRegion: document.getElementById("catalog-live")
};

let currentModalModel = null;
let currentOpening = "longa";
let modalOpener = null;

async function loadCatalog() {
  elements.grid.innerHTML = `
    <div class="catalog-loading" role="status">
      <p>Carregando catálogo de modelos...</p>
    </div>
  `;
  try {
    const res = await fetch("data/catalog.json?v=20261021-aberturas-1");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allModels = await res.json();
    renderCatalog();
  } catch (err) {
    console.error("Erro ao carregar catálogo:", err);
    elements.grid.innerHTML = `
      <div class="catalog-error" role="alert">
        <h3>Não foi possível carregar os modelos</h3>
        <p>Houve uma falha ao acessar o arquivo estático de dados. Você pode recarregar a página para tentar novamente.</p>
        <button class="btn btn-secondary" id="catalog-reload">Recarregar página</button>
      </div>
    `;
    elements.count.textContent = "Erro ao carregar";
    document.getElementById("catalog-reload")?.addEventListener("click", () => window.location.reload());
  }
}

function filterModels() {
  const q = searchQuery.toLowerCase().trim();
  return allModels.filter(m => {
    const matchesCategory = activeCategory === "all" || m.tipo.toLowerCase() === activeCategory.toLowerCase();
    if (!matchesCategory) return false;
    if (!q) return true;
    const name = (m.name || "").toLowerCase();
    const tema = (m.tema || "").toLowerCase();
    const paleta = (m.paleta_cores || "").toLowerCase();
    const slug = (m.slug || "").toLowerCase();
    return name.includes(q) || tema.includes(q) || paleta.includes(q) || slug.includes(q);
  });
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

function renderCatalog() {
  const filtered = filterModels();
  elements.count.textContent = `Mostrando ${filtered.length} de ${allModels.length} modelos`;
  elements.liveRegion.textContent = `${filtered.length} modelos encontrados.`;

  if (filtered.length === 0) {
    elements.grid.innerHTML = `
      <div class="catalog-empty">
        <h3>Nenhum modelo encontrado</h3>
        <p>Tente ajustar a busca por tema, cor ou selecionar outra categoria.</p>
        <button class="btn btn-secondary" id="reset-filters-btn">Limpar busca e filtros</button>
      </div>
    `;
    document.getElementById("reset-filters-btn")?.addEventListener("click", () => {
      searchQuery = "";
      activeCategory = "all";
      elements.searchInput.value = "";
      updateActiveTab();
      renderCatalog();
    });
    return;
  }

  elements.grid.innerHTML = filtered.map(model => {
    const safeSlug = encodeURIComponent(model.slug);
    const coverUrl = `${PUBLIC_ORIGIN}/modelos/${safeSlug}/${model.capa_path || 'assets/cover.jpg'}`;
    const previewUrl = `${PUBLIC_ORIGIN}/modelos/${safeSlug}/index.html`;

    return `
      <article class="model-card" data-slug="${escapeHtml(model.slug)}">
        <div class="model-cover-wrapper">
          <img 
            src="${coverUrl}" 
            alt="Capa do convite ${escapeHtml(model.name || model.slug)}"
            class="model-cover-img"
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
          >
        </div>
        <div class="model-info">
          <span class="model-type-badge">${escapeHtml(model.tipo)}</span>
          <h2 class="model-name">${escapeHtml(model.name || model.slug)}</h2>
          <div class="model-details">
            <div><strong>Tema:</strong> ${escapeHtml(model.tema || "Tema clássico")}</div>
            ${model.paleta_cores ? `<div><strong>Paleta:</strong> ${escapeHtml(model.paleta_cores)}</div>` : ""}
          </div>
          <div class="model-actions">
            <button 
              type="button" 
              class="btn btn-secondary btn-preview"
              data-preview-slug="${escapeHtml(model.slug)}"
              data-preview-url="${previewUrl}"
              data-preview-name="${escapeHtml(model.name || model.slug)}"
              aria-label="Ver demonstração do modelo ${escapeHtml(model.name || model.slug)}"
            >
              Ver
            </button>
            <button 
              type="button" 
              class="btn btn-primary btn-select"
              data-select-slug="${escapeHtml(model.slug)}"
              aria-label="Escolher modelo ${escapeHtml(model.name || model.slug)} e orçar"
            >
              Escolher
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  elements.grid.querySelectorAll(".model-cover-img").forEach(img => {
    img.addEventListener("error", () => {
      const placeholder = document.createElement("div");
      placeholder.className = "model-cover-placeholder";
      const mark = document.createElement("span");
      mark.textContent = "✦";
      const title = document.createElement("strong");
      title.textContent = img.alt.replace(/^Capa do convite\s*/, "");
      const status = document.createElement("small");
      status.textContent = "Foto indisponível";
      placeholder.append(mark, title, status);
      img.replaceWith(placeholder);
    }, { once: true });
  });

  attachCardEvents();
}

function attachCardEvents() {
  elements.grid.querySelectorAll(".btn-preview").forEach(btn => {
    btn.addEventListener("click", () => {
      const slug = btn.dataset.previewSlug;
      const url = btn.dataset.previewUrl;
      const name = btn.dataset.previewName;
      openPreviewModal(slug, url, name);
    });
  });

  elements.grid.querySelectorAll(".btn-select").forEach(btn => {
    btn.addEventListener("click", () => {
      const slug = btn.dataset.selectSlug;
      selectModelAndProceed(slug);
    });
  });
}

// Link da prévia com a abertura escolhida (?abertura=curta|longa)
function getModalPreviewUrl() {
  const base = `${PUBLIC_ORIGIN}/modelos/${encodeURIComponent(currentModalModel.slug)}/index.html`;
  const aberturas = currentModalModel.aberturas || [];
  return aberturas.includes(currentOpening) ? `${base}?abertura=${currentOpening}` : base;
}

function setModalOpening(opening) {
  currentOpening = opening;
  elements.modalOpening?.querySelectorAll(".opening-option").forEach(btn => {
    btn.setAttribute("aria-pressed", btn.dataset.opening === opening ? "true" : "false");
  });
  const url = getModalPreviewUrl();
  elements.modalIframe.src = url;
  elements.modalExternal.href = url;
}

function openPreviewModal(slug, url, name) {
  const model = allModels.find(m => m.slug === slug);
  currentModalModel = model || { slug, name };
  modalOpener = document.activeElement;
  elements.modalTitle.textContent = name;
  const aberturas = currentModalModel.aberturas || [];
  const hasChoice = aberturas.includes("curta") && aberturas.includes("longa");
  if (elements.modalOpening) elements.modalOpening.hidden = !hasChoice;
  elements.modalBackdrop.querySelector(".preview-modal")?.classList.toggle("has-opening-choice", hasChoice);
  setModalOpening(hasChoice ? "longa" : (aberturas[0] || "longa"));
  elements.modalBackdrop.hidden = false;
  elements.modalClose.focus();
  document.body.style.overflow = "hidden";
}

function closePreviewModal() {
  elements.modalBackdrop.hidden = true;
  elements.modalIframe.src = "about:blank";
  currentModalModel = null;
  document.body.style.overflow = "";
  modalOpener?.focus();
  modalOpener = null;
  if (elements.copyFeedback) elements.copyFeedback.textContent = "";
}

elements.modalCopy?.addEventListener("click", async () => {
  if (!currentModalModel?.slug) return;
  const url = getModalPreviewUrl();
  try {
    await navigator.clipboard.writeText(url);
    elements.copyFeedback.textContent = "Link da prévia copiado.";
  } catch {
    elements.copyFeedback.textContent = "Não foi possível copiar. Use Abrir em nova aba para acessar o modelo.";
  }
});

function selectModelAndProceed(slug) {
  const model = allModels.find(m => m.slug === slug);
  if (model) {
    try {
      localStorage.setItem("selectedModel", JSON.stringify({
        slug: model.slug,
        name: model.name || model.slug
      }));
    } catch (e) {
      console.warn("localStorage indisponível ou bloqueado", e);
    }
  }
  window.location.href = `orcamentos/index.html?modelo=${encodeURIComponent(slug)}`;
}

function updateActiveTab() {
  elements.filterTabs.querySelectorAll(".filter-chip").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.category === activeCategory);
    chip.setAttribute("aria-pressed", chip.dataset.category === activeCategory ? "true" : "false");
  });
}

// Event Listeners
elements.searchInput?.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  renderCatalog();
});

elements.clearSearch?.addEventListener("click", () => {
  searchQuery = "";
  elements.searchInput.value = "";
  elements.searchInput.focus();
  renderCatalog();
});

elements.filterTabs?.addEventListener("click", (e) => {
  const chip = e.target.closest(".filter-chip");
  if (!chip) return;
  activeCategory = chip.dataset.category;
  updateActiveTab();
  renderCatalog();
});

elements.modalClose?.addEventListener("click", closePreviewModal);
elements.modalBackdrop?.addEventListener("click", (e) => {
  if (e.target === elements.modalBackdrop) closePreviewModal();
});

elements.modalOpening?.addEventListener("click", (e) => {
  const btn = e.target.closest(".opening-option");
  if (!btn || !currentModalModel || btn.dataset.opening === currentOpening) return;
  setModalOpening(btn.dataset.opening);
});

elements.modalSelect?.addEventListener("click", () => {
  if (currentModalModel?.slug) {
    selectModelAndProceed(currentModalModel.slug);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !elements.modalBackdrop.hidden) {
    closePreviewModal();
    return;
  }
  if (e.key === "Tab" && !elements.modalBackdrop.hidden) {
    const focusable = elements.modalBackdrop.querySelectorAll("button:not([disabled]), a[href], iframe");
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
});

loadCatalog();
