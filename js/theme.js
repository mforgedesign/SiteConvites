(() => {
  const key = "mforge-theme-preference";
  const root = document.documentElement;
  const toggle = document.querySelector("[data-theme-toggle]");
  const sunIcon = '<path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/>';
  const moonIcon = '<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>';
  let savedPreference = null;

  try {
    savedPreference = localStorage.getItem(key);
  } catch {
    // Preferência de aparência é opcional; o tema continua utilizável sem storage.
  }

  const hasSavedPreference = savedPreference === "light" || savedPreference === "dark";
  let theme = hasSavedPreference ? savedPreference : "light";

  const applyTheme = () => {
    root.dataset.theme = theme;
    if (!toggle) return;
    const dark = theme === "dark";
    toggle.innerHTML = `<span class="toggle-knob" aria-hidden="true"><svg viewBox="0 0 20 20" focusable="false">${dark ? moonIcon : sunIcon}</svg></span>`;
    toggle.setAttribute("aria-label", dark ? "Ativar tema claro" : "Ativar tema escuro");
    toggle.setAttribute("aria-pressed", String(dark));
  };

  applyTheme();

  toggle?.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    applyTheme();
    try {
      localStorage.setItem(key, theme);
    } catch {
      // Tema escolhido vale nesta página mesmo se o storage estiver indisponível.
    }
  });

})();
