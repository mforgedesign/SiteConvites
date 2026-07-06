(function () {
  "use strict";

  const PIXEL_ID = "1628532911861052";
  const CONSENT_KEY = "mforge_meta_consent_v1";
  const ATTRIBUTION_KEY = "mforge_marketing_attribution_v1";
  const queuedEvents = [];
  let loaded = false;

  function readConsent() {
    try {
      return localStorage.getItem(CONSENT_KEY);
    } catch {
      return null;
    }
  }

  function captureAttribution() {
    const params = new URLSearchParams(location.search);
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"];
    const current = {};
    keys.forEach((key) => {
      const value = params.get(key);
      if (value) current[key] = value.slice(0, 500);
    });
    if (!Object.keys(current).length) return;

    try {
      const previous = JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || "{}");
      localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({
        ...previous,
        ...current,
        landing_page: previous.landing_page || location.href,
        captured_at: previous.captured_at || new Date().toISOString()
      }));
    } catch {
      // A medição continua funcionando se o armazenamento estiver indisponível.
    }
  }

  function loadPixel() {
    if (loaded) return;
    loaded = true;
    captureAttribution();

    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    fbq("init", PIXEL_ID);
    fbq("track", "PageView");
    while (queuedEvents.length) {
      const event = queuedEvents.shift();
      sendEvent(event.name, event.params, event.eventId);
    }
  }

  function sendEvent(name, params, eventId) {
    if (!loaded || typeof fbq !== "function") {
      queuedEvents.push({ name, params, eventId });
      return;
    }
    fbq("track", name, params || {}, eventId ? { eventID: eventId } : undefined);
  }

  function setConsent(value) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // Sem armazenamento, a escolha vale apenas para esta página.
    }
    document.getElementById("mforge-cookie-consent")?.remove();
    if (value === "granted") loadPixel();
  }

  function showConsent() {
    if (document.getElementById("mforge-cookie-consent")) return;
    const banner = document.createElement("aside");
    banner.id = "mforge-cookie-consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Preferências de privacidade");
    banner.innerHTML = `
      <p><strong>Privacidade</strong><br>Usamos dados de navegação para medir anúncios e melhorar sua experiência.</p>
      <div>
        <button type="button" data-consent="denied">Recusar</button>
        <button type="button" data-consent="granted">Aceitar</button>
      </div>`;

    const style = document.createElement("style");
    style.textContent = `
      #mforge-cookie-consent{position:fixed;z-index:2147483647;left:12px;right:12px;bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:16px;max-width:720px;margin:auto;padding:14px 16px;border:1px solid rgba(255,255,255,.2);border-radius:14px;background:#171717;color:#fff;box-shadow:0 12px 36px rgba(0,0,0,.35);font:14px/1.35 system-ui,sans-serif}
      #mforge-cookie-consent p{margin:0}
      #mforge-cookie-consent div{display:flex;gap:8px;flex-shrink:0}
      #mforge-cookie-consent button{border:1px solid #fff;border-radius:9px;padding:9px 13px;background:transparent;color:#fff;font-weight:700;cursor:pointer}
      #mforge-cookie-consent button[data-consent="granted"]{background:#fff;color:#171717}
      @media(max-width:560px){#mforge-cookie-consent{align-items:stretch;flex-direction:column}#mforge-cookie-consent div,#mforge-cookie-consent button{width:100%}}
    `;
    document.head.appendChild(style);
    document.body.appendChild(banner);
    banner.addEventListener("click", (event) => {
      const value = event.target.closest("[data-consent]")?.dataset.consent;
      if (value) setConsent(value);
    });
  }

  globalThis.MForgeMeta = {
    getAttribution() {
      try {
        return JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || "{}");
      } catch {
        return {};
      }
    },
    track(name, params, eventId) {
      if (readConsent() === "granted") sendEvent(name, params, eventId);
    },
    trackSusieEvent(payload) {
      const mapping = {
        phone_provided: "Lead",
        budget_completed: "InitiateCheckout",
        budget_confirmed_whatsapp: "Contact"
      };
      const name = mapping[payload?.eventType];
      if (!name) return;
      sendEvent(name, {
        content_name: "Convite Cinematográfico Interativo",
        content_category: "Convites digitais",
        currency: "BRL",
        value: Number(payload.total || 0)
      }, payload.eventId);
    }
  };

  const consent = readConsent();
  if (consent === "granted") loadPixel();
  else if (consent !== "denied") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", showConsent, { once: true });
    } else {
      showConsent();
    }
  }
})();
