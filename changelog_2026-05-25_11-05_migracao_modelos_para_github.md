# Changelog - Migração de Modelos para GitHub Pages
**Data:** 25 de Maio de 2026  
**Hora:** 11:05  

## Prompt Motivador
> Eu fiz uma migração no C:\Users\Acer\Documents\Builder v7 onde eu eliminei o supabase, deixando os convites gerados hospedados apenas no github. Agora quero que faça o mesmo com os modelos do site, para que todos estejam hospedados no github.

---

## 1. Modificações em `js/model_sources.js`

### Como funcionava antes
A lógica verificava se o modelo estava listado no array `GITHUB_ASSET_MODELS` (primeira metade, letras A-M) para decidir se os assets seriam buscados localmente ou no Storage do Supabase (para as letras N-Z).

```javascript
function isGitHubModel(slug) {
  // Normalize for comparison
  const normalized = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return GITHUB_ASSET_MODELS.some(m => {
    const mNorm = m.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return mNorm === normalized || m === slug;
  });
}

function getAssetBaseUrl(slug) {
  if (isGitHubModel(slug)) {
    // GitHub: relative path from modelos/{slug}/assets/
    return 'modelos/' + slug + '/assets/';
  }
  // Supabase: absolute URL
  const safeSlug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\-_]/g, '-');
  return 'https://xchphsltccopelblbsyb.supabase.co/storage/v1/object/public/modelos/' + safeSlug + '/assets/';
}

function getCoverUrl(slug, capaPath) {
  const base = getAssetBaseUrl(slug);
  if (isGitHubModel(slug)) {
    return base + (capaPath || 'capa.jpg').replace('assets/', '');
  }
  return base + (capaPath || 'capa.jpg').replace('assets/', '');
}
```

### Como funciona agora
A função `isGitHubModel` agora retorna sempre `true` para todos os modelos, e as funções de resolução de caminho retornam sempre paths relativos locais a partir do diretório `/modelos/`.

```javascript
function isGitHubModel(slug) {
  return true;
}

function getAssetBaseUrl(slug) {
  // GitHub: relative path from modelos/{slug}/assets/
  return 'modelos/' + slug + '/assets/';
}

function getCoverUrl(slug, capaPath) {
  const base = getAssetBaseUrl(slug);
  return base + (capaPath || 'capa.jpg').replace('assets/', '');
}
```

---

## 2. Modificações em `modelos.html`

### Como funcionava antes
- A função `discoverSlugs()` realizava um fetch para a API Rest do Supabase na tabela `modelos` para descobrir quais modelos existiam e obter suas metadados.
- A função `openPreview()` buscava o arquivo `index.html` correspondente do bucket `modelos-code` no Supabase Storage.
- O script `assetFix` injetava um interceptador `window.__loadConfig` no iframe que tentava carregar dados do banco de dados do Supabase.

```javascript
        // Load models from Supabase DB
        async function discoverSlugs() {
            try {
                const r = await fetch(SUPABASE_URL + '/rest/v1/modelos?select=slug,name,tipo,tema,paleta_cores,button_color,capa_path,idade&order=name', {
                    headers: { 'apikey': SUPABASE_ANON_KEY }
                });
                const data = await r.json();
                ...
        async function openPreview(model) {
            currentPreviewModel = model;
            document.getElementById('previewTitle').textContent = model.name;
            const frame = document.getElementById('previewFrame');
            const url = SUPABASE_CODE + '/' + sanitizeSlug(model.slug) + '/index.html';
            ...
                const assetFix = '<script>' +
                  "window.__SUPABASE_ASSETS='" + SUPABASE_ASSETS + '/' + slug + "';" +
                  "window.assetUrl=function(p){return '" + ASSET_BASE + "'+(p||'').replace(/^assets\\//,'')};" +
                  ...
                  "var _ld=window.__loadConfig;" +
                  "if(_ld){window.__loadConfig=async function(){" +
                  "await _ld();" +
                  ...
```

### Como funciona agora
- `discoverSlugs()` realiza um fetch no arquivo local `modelos.json`.
- `openPreview()` faz a busca do arquivo `index.html` localmente na pasta `/modelos/{slug}/index.html`.
- O interceptador `window.__loadConfig` injetado no iframe passa a ler o objeto de configuração estático local `window.__INLINE_CONFIG` (gerado localmente no HTML do modelo) e apenas reescreve os caminhos dos recursos para usar a URL base correta, evitando conexões ou requisições HTTP para o Supabase.
- Foram removidas as constantes de configuração do Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_ASSETS`, `SUPABASE_CODE`) do código.

```javascript
        // Load models from local modelos.json
        async function discoverSlugs() {
            try {
                const r = await fetch('modelos.json');
                const data = await r.json();
                ...
        async function openPreview(model) {
            currentPreviewModel = model;
            document.getElementById('previewTitle').textContent = model.name;
            const frame = document.getElementById('previewFrame');
            const siteRoot = new URL('.', window.location.href).href;
            const url = siteRoot + 'modelos/' + encodeURIComponent(model.slug) + '/index.html';
            ...
                const assetFix = '<script>' +
                  "window.__SUPABASE_ASSETS='';" +
                  "window.assetUrl=function(p){return '" + ASSET_BASE + "'+(p||'').replace(/^assets\\//,'')};" +
                  ...
                  // Patch __loadConfig to use inline config and rewrite config asset paths
                  "window.__loadConfig=async function(){" +
                  "if(window.__INLINE_CONFIG)window.config=window.__INLINE_CONFIG;" +
                  "if(window.config){" +
                  ...
```

---

## 3. Modificações em `orcamentos/js/app.js`

### Como funcionava antes
- A miniatura do modelo selecionado carregava a capa do Supabase Storage.
- A visualização rápida (`previewModelo()`) buscava o HTML do Supabase Storage (`SUPABASE_CODE`) e usava o interceptador de configuração antigo que batia na API do Supabase.

```javascript
            const coverUrl = m.capa && m.capa.startsWith('http') ? m.capa : SUPABASE_ASSETS + '/' + slug + '/' + (m.capa || 'assets/capa.webp').replace(/^\//, '');
            ...
        const codeUrl = SUPABASE_CODE + '/' + slug + '/index.html';
        ...
            // Determine asset base
            const isGit = typeof isGitHubModel === 'function' && isGitHubModel(m.slug);
            const siteRoot = new URL('..', window.location.href).href;
            const MODEL_BASE = isGit
              ? siteRoot + 'modelos/' + encodeURIComponent(m.slug) + '/'
              : SUPABASE_ASSETS + '/' + slug + '/';
            ...
```

### Como funciona agora
- A miniatura calcula o caminho relativo dinâmico apontando para `/modelos/{slug}/assets/capa.jpg` localmente.
- O preview faz o download do HTML local em `/modelos/{slug}/index.html` e injeta a tag `<base href="...">` correta, sem qualquer chamada ao Supabase.
- Foram removidas as variáveis de configuração de tokens e endpoints do Supabase.

```javascript
            const siteRoot = new URL('..', window.location.href).href;
            const coverUrl = m.capa && m.capa.startsWith('http')
              ? m.capa
              : (m.capa && m.capa.startsWith('modelos/')
                ? siteRoot + m.capa
                : siteRoot + 'modelos/' + slug + '/' + (m.capa || 'assets/capa.jpg').replace(/^\//, ''));
            ...
        const siteRoot = new URL('..', window.location.href).href;
        const codeUrl = siteRoot + 'modelos/' + encodeURIComponent(m.slug) + '/index.html';
        ...
            const MODEL_BASE = siteRoot + 'modelos/' + encodeURIComponent(m.slug) + '/';
            ...
```

---

## 4. Modificações em `js/app.js` (raiz)

### Como funcionava antes
- Mirror do comportamento do orçamento, buscando a prévia do `SUPABASE_CODE` e fazendo patch usando chaves do Supabase.

### Como funciona agora
- Alinhado com a nova lógica local, carregando a prévia e as configurações estáticas diretamente de `/modelos/{slug}/index.html`.
