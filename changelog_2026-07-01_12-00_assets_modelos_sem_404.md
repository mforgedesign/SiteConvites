# Changelog - 2026-07-01 - Assets de modelos sem 404

## Prompt

Corrigir as capas ausentes da vitrine e o modelo `modelo-Sarah-Vieira-15Anos`, publicado pelo novo fluxo do Builder com referências antigas.

## Código antigo

```js
return base + (capaPath || 'capa.jpg').replace('assets/', '');
```

```html
<img src="${model.cover}" class="model-cover loaded">
```

## Código novo

```js
if (!capaPath) return 'data:image/svg+xml,...Sem capa...';
return base + capaPath.replace('assets/', '');
```

```js
const coverMedia = model.coverType === 'video'
    ? `<video ...></video>`
    : `<img ...>`;
```

## Explicação

- `modelos.json` agora aponta somente para thumbnails existentes.
- Capas históricas `capa.jpg` foram corrigidas para `cover.jpg` onde esse era o arquivo real.
- A vitrine aceita vídeo como thumbnail de fallback.
- Modelos sem asset visual recebem placeholder inline, sem uma requisição 404.
- O config de Sarah usa `cover.jpg`, `slide1.mp4`, `folha_vazia.jpg` e `folha.png`.
- Referências históricas de folha, música e abertura sem arquivo físico foram corrigidas ou removidas.

## Backup

`backups/20260701-asset-reconciliation-modelos/`

## QA

Auditoria local de `modelos.json` e de todos os `config.js`, validação de sintaxe JavaScript e checagem HTTP após deploy. Nenhum navegador foi aberto ou controlado.
