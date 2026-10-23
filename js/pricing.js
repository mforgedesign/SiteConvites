/* ==========================================================================
   MForge Preview - Pricing Engine (Single Deterministic Source of Truth)
   Matches orcamentos-app.safe.js exactly.
   ========================================================================== */

export const BASE_PRICE = 80;

export const PRICE_RULES = {
  modelNew: 15,
  modelCustomization: 10,
  openingLong: 20,
  openingPhoto: 5,
  rsvpSmartForm: 5,
  giftsPremium: 5,
  giftsSmartList: 15,
  manualPremium: 5,
  gallery: 5,
  sharedAlbum: 35,
  instagramFilter: 35,
  bundle: 50,
  saveTheDateSimple: 25,
  saveTheDatePremium: 50,
  reminder: 25
};

export const DELIVERY_DAYS = 2;
export const DEPOSIT_AMOUNT = 20;

/**
 * Calculates current total and itemized breakdown based on choices.
 * @param {Object} state - The budget state object
 * @returns {Object} { total: number, items: Array<{ key: string, label: string, amount: number }> }
 */
export function calculateBudget(state = {}) {
  const choices = state.choices || {};
  const hasValidModelChoice = state.modelMode === "new"
    || (state.modelMode === "selected" && Boolean(state.selectedModel));

  if (!hasValidModelChoice) return { total: null, items: [] };

  let total = BASE_PRICE;
  const items = [
    { key: "base", label: "Convite Digital Interativo (Base)", amount: BASE_PRICE }
  ];

  if (state.modelMode === "new") {
    total += PRICE_RULES.modelNew;
    items.push({ key: "modelMode", label: "Criação de modelo exclusivo", amount: PRICE_RULES.modelNew });
  }

  if (choices.modelCustomization) {
    total += PRICE_RULES.modelCustomization;
    items.push({ key: "modelCustomization", label: "Personalização de cores/tema", amount: PRICE_RULES.modelCustomization });
  }

  if (choices.openingType === "long" && state.modelMode !== "selected") {
    total += PRICE_RULES.openingLong;
    items.push({ key: "openingLong", label: "Abertura longa sem modelo da coleção", amount: PRICE_RULES.openingLong });
  }

  if (choices.openingPhoto === "include") {
    total += PRICE_RULES.openingPhoto;
    items.push({ key: "openingPhoto", label: "Foto na abertura", amount: PRICE_RULES.openingPhoto });
  }

  if (choices.rsvp === "smart_form") {
    total += PRICE_RULES.rsvpSmartForm;
    items.push({ key: "rsvp", label: "Formulário Inteligente de RSVP", amount: PRICE_RULES.rsvpSmartForm });
  }

  if (choices.gifts === "premium") {
    total += PRICE_RULES.giftsPremium;
    items.push({ key: "gifts", label: "Sugestões de Presentes Premium", amount: PRICE_RULES.giftsPremium });
  } else if (choices.gifts === "smart_list") {
    total += PRICE_RULES.giftsSmartList;
    items.push({ key: "gifts", label: "Lista Inteligente de Presentes", amount: PRICE_RULES.giftsSmartList });
  }

  if (choices.manual === "premium") {
    total += PRICE_RULES.manualPremium;
    items.push({ key: "manual", label: "Manual do Convidado Premium", amount: PRICE_RULES.manualPremium });
  }

  if (choices.gallery === "include") {
    total += PRICE_RULES.gallery;
    items.push({ key: "gallery", label: "Galeria de Fotos", amount: PRICE_RULES.gallery });
  }

  // "Fotos que continuam depois da festa": aditivo independente ou bundle.
  // Ambos compartilham o mesmo QR Code, por isso o conjunto sai mais barato.
  const hasSharedAlbum = choices.sharedAlbum === "include";
  const hasInstagramFilter = choices.instagramFilter === "include";
  if (hasSharedAlbum && hasInstagramFilter) {
    total += PRICE_RULES.bundle;
    items.push({ key: "sharedAlbumBundle", label: "Álbum Compartilhado + Filtro (mesmo QR Code)", amount: PRICE_RULES.bundle });
  } else {
    if (hasSharedAlbum) {
      total += PRICE_RULES.sharedAlbum;
      items.push({ key: "sharedAlbum", label: "Álbum Compartilhado com QR Code", amount: PRICE_RULES.sharedAlbum });
    }
    if (hasInstagramFilter) {
      total += PRICE_RULES.instagramFilter;
      items.push({ key: "instagramFilter", label: "Filtro para Instagram com QR Code", amount: PRICE_RULES.instagramFilter });
    }
  }

  if (choices.saveTheDate === "simple") {
    total += PRICE_RULES.saveTheDateSimple;
    items.push({ key: "saveTheDate", label: "Save the Date Simples", amount: PRICE_RULES.saveTheDateSimple });
  } else if (choices.saveTheDate === "premium") {
    total += PRICE_RULES.saveTheDatePremium;
    items.push({ key: "saveTheDate", label: "Save the Date Premium", amount: PRICE_RULES.saveTheDatePremium });
  }

  if (choices.reminder === "include") {
    total += PRICE_RULES.reminder;
    items.push({ key: "reminder", label: "Lembrete animado de véspera", amount: PRICE_RULES.reminder });
  }

  return { total, items };
}

/**
 * Returns formatted Brazilian real string
 */
export function formatCurrency(amount) {
  return `R$\u00a0${Number(amount || 0).toLocaleString("pt-BR")}`;
}
