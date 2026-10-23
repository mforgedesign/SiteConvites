// Movimento do orçamento: troca de etapa, campos que aparecem, avisos e rolagem.
// Tudo via Web Animations API (só transform/opacity), para não depender das regras globais de CSS
// e para que um re-render no meio da animação simplesmente a descarte junto com o nó.

const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";

export function prefersReducedMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

function animate(el, keyframes, options) {
  if (!el?.animate) return null;
  try {
    return el.animate(keyframes, { fill: "backwards", ...options });
  } catch {
    return null;
  }
}

// Com movimento reduzido (ex.: "Efeitos de animação" desligado no Windows), o deslocamento some
// e fica o esmaecer em cascata, que não causa desconforto e ainda mostra a transição.
function enterFrames(dx, dy, scale = 1) {
  if (prefersReducedMotion()) return [{ opacity: 0 }, { opacity: 1 }];
  return [
    { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
    { opacity: 1, transform: "none" }
  ];
}

// Entrada da etapa: avançar desliza da direita, voltar desliza da esquerda; o conteúdo chega em cascata.
export function enterStep(card, direction) {
  if (!card) return;
  const reduced = prefersReducedMotion();
  const dx = direction === "back" ? -28 : direction === "forward" ? 28 : 0;
  const dy = direction === "initial" ? 14 : 0;
  const header = card.querySelector(".step-header");
  animate(header, enterFrames(dx, dy), { duration: reduced ? 280 : 340, easing: EASE_OUT });

  const body = card.querySelector(".step-body");
  const items = body ? staggerTargets(body) : [];
  items.slice(0, 10).forEach((item, i) => {
    animate(item, enterFrames(dx * 0.5, 12), {
      duration: reduced ? 300 : 380,
      delay: 70 + i * 40,
      easing: EASE_OUT
    });
  });

  const rest = [card.querySelector(".reassure-strip"), card.querySelector(".welcome-card"), ...card.querySelectorAll(":scope > .doubt-row, :scope > .doubt-toggle, :scope > .step-actions")];
  rest.filter(Boolean).forEach(el => {
    animate(el, enterFrames(0, 8), { duration: reduced ? 280 : 320, delay: 180, easing: EASE_OUT });
  });
}

// Itens que entram um a um: cartões de opção e campos; senão, os blocos de primeiro nível.
function staggerTargets(body) {
  const cards = [...body.querySelectorAll(".option-card, .form-group")].filter(el => !el.hidden && !el.closest("[hidden]"));
  if (cards.length) return cards;
  return [...body.children].filter(el => !el.hidden);
}

export function animateProgress(fill, fromPercent, toPercent) {
  if (!fill) return;
  if (fromPercent == null || fromPercent === toPercent) return;
  animate(fill, [{ width: `${fromPercent}%` }, { width: `${toPercent}%` }], {
    duration: 520,
    easing: EASE_OUT,
    fill: "none"
  });
}

// Bloco que acabou de aparecer (campos extras de uma opção, grupo de idade, caixa de ajuste).
export function revealIn(el) {
  if (!el || el.hidden) return;
  animate(el, enterFrames(0, -8, 0.985), { duration: 300, easing: EASE_OUT });
}

// Re-render na mesma etapa: anima só o que não existia antes (por id), e dá um "toque" no cartão escolhido.
export function snapshotIds(root) {
  return new Set([...(root?.querySelectorAll("[id]") || [])].map(el => el.id));
}

export function revealNewSince(root, previousIds) {
  if (!root || !previousIds) return;
  const fresh = [...root.querySelectorAll("[id]")].filter(el => !previousIds.has(el.id) && !el.hidden);
  // Só o mais externo de cada grupo novo, para não animar pai e filhos juntos.
  fresh.filter(el => !fresh.some(other => other !== el && other.contains(el)))
    .map(el => el.closest(".form-grid, .form-group, [id^='box-']") || el)
    .filter((el, i, list) => list.indexOf(el) === i)
    .forEach(revealIn);
}

export function settleSelection(root) {
  const frames = prefersReducedMotion()
    ? [{ opacity: 0.6 }, { opacity: 1 }]
    : [{ transform: "scale(0.985)" }, { transform: "scale(1.006)", offset: 0.6 }, { transform: "none" }];
  root?.querySelectorAll(".option-card.selected").forEach(card => {
    animate(card, frames, {
      duration: 280,
      easing: EASE_OUT,
      fill: "none"
    });
  });
}

// Aviso de pendência: entra e balança de leve para chamar o olho.
export function attention(el) {
  if (!el || el.hidden) return;
  if (prefersReducedMotion()) {
    animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 260 });
    return;
  }
  animate(el, [
    { opacity: 0, transform: "translateX(0)" },
    { opacity: 1, transform: "translateX(-6px)", offset: 0.25 },
    { transform: "translateX(5px)", offset: 0.5 },
    { transform: "translateX(-3px)", offset: 0.75 },
    { opacity: 1, transform: "none" }
  ], { duration: 420, easing: "ease-out", fill: "none" });
}

// Rolagem animada própria: o "smooth" nativo vira salto em aparelhos com movimento reduzido;
// nesses, ela só fica mais curta.
let activeScroll = 0;
export function animateScrollTo(targetY) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const target = Math.max(0, Math.min(max, targetY));
  const start = window.scrollY;
  const distance = target - start;
  const token = ++activeScroll;
  if (Math.abs(distance) < 2) return;
  const duration = prefersReducedMotion() ? Math.min(450, 250 + Math.abs(distance) * 0.2) : Math.min(900, 400 + Math.abs(distance) * 0.4);
  const t0 = performance.now();
  const stop = () => { if (activeScroll === token) activeScroll++; };
  window.addEventListener("touchstart", stop, { once: true, passive: true });
  window.addEventListener("wheel", stop, { once: true, passive: true });
  const frame = (now) => {
    if (activeScroll !== token) return;
    const k = Math.min(1, (now - t0) / duration);
    const eased = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    window.scrollTo(0, start + distance * eased);
    if (k < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// Rola (no celular, acima da barra fixa) até o que está pendente ficar visível.
export function revealPending(el, delay = 0) {
  if (!el) return;
  setTimeout(() => {
    if (!el.isConnected) return;
    const rect = el.getBoundingClientRect();
    if (rect.top >= 72 && rect.bottom <= window.innerHeight - 96) return;
    animateScrollTo(window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2);
  }, delay);
}
