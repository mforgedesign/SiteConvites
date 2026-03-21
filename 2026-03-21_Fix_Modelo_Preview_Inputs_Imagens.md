# Changelog: Fix Preview Assets, Default Inputs & Broken Images
**Data:** 2026-03-21 08:36 BRT
**Prompt:** "Quando um cliente está fazendo um novo pedido, é esperado que, nas janelas de presentes e manual do convidado, já estejam selecionadas as opções gratuitas. O problema é que, mesmo estando selecionadas, os campos para preencher esses dados não aparecem." + Imagens quebradas nos cards.

---

## 1. Preview de Modelos — Assets 404 no iframe

**Problema:** Ao clicar "Ver Prévia" em modelos como Modelo-Lilas-Prata, Lucca-Astronauta e Modelo-Borboleta-Azul-Prata, os assets (capa, vídeos, músicas, GIFs) não carregavam (404).

**Causa:** O iframe usa `srcdoc`, cuja base URL é `about:srcdoc`. Atributos HTML estáticos como `src="assets/capa.jpg"` resolviam contra essa base ao invés do diretório real do modelo. O script `assetFix` injetado apenas interceptava operações JavaScript (setAttribute, .src setter), não atributos HTML que já existiam no markup.

**Código antigo (modelos.html e orcamentos/js/app.js):**
```javascript
const ASSET_BASE = isGit
  ? window.location.origin + '/SiteConvites/modelos/' + slug + '/assets/'
  : SUPABASE_ASSETS + '/' + slug + '/assets/';
const assetFix = '<script>' + ...
```

**Código novo:**
```javascript
const ASSET_BASE = isGit
  ? window.location.origin + '/SiteConvites/modelos/' + slug + '/assets/'
  : SUPABASE_ASSETS + '/' + slug + '/assets/';
// Rewrite static HTML asset paths
html = html.replace(/(["'])assets\//g, '$1' + ASSET_BASE);
html = html.replace(/(url\()assets\//g, '$1' + ASSET_BASE);
const assetFix = '<script>' + ...
```

**Arquivos:** `modelos.html`, `orcamentos/js/app.js`

---

## 2. Campos de texto não visíveis para opções pré-selecionadas

**Problema:** Os cards "Sugestões Simples" (Presentes) e "Manual Simples" vinham pré-selecionados por padrão, mas seus campos de texto (`gift_text_input_container` e `manual_text_input_container`) ficavam ocultos até o usuário desmarcar e remarcar.

**Causa:** Os containers tinham `class="hidden"` no HTML, e o `init()` não disparava a lógica de `selectGiftTip()`/`selectManual()` para os valores padrão.

**Código antigo (orcamentos/index.html):**
```html
<div id="gift_text_input_container" class="hidden mt-4 ...">
<div id="manual_text_input_container" class="hidden mt-4 ...">
```

**Código novo:**
```html
<div id="gift_text_input_container" class="mt-4 ...">
<div id="manual_text_input_container" class="mt-4 ...">
```

**Arquivo:** `orcamentos/index.html`

---

## 3. Imagens quebradas: Sugestões Simples e Manual Simples

**Problema:** Os cards mostravam ícone de imagem quebrada pois referenciavam `temp/Print Lista de Presentes.png` e `temp/Print Manual.png` — arquivos que nunca existiram no repositório.

**Código antigo:**
```html
<img src="temp/Print Lista de Presentes.png" ...>
<img src="temp/Print Manual.png" ...>
```

**Código novo:**
```html
<i class="fa-solid fa-gift text-3xl md:text-4xl text-accent"></i>
<i class="fa-solid fa-book-open text-2xl md:text-3xl text-accent"></i>
```

**Arquivo:** `orcamentos/index.html`
