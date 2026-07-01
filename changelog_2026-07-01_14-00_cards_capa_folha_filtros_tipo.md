# Changelog - Cards com capa + folha e filtros por tipo

Data: 2026-07-01

## Prompt

> Agora quero que, assim como na página inicial do builder, o site também não exiba apenas a capa, mas a capa + folha preenchida dos respectivos convites. E esses assets precisam ser exibidos integralmente (9:16 em cada), para não cortar conteúdo das imagens.
>
> E quero que tu verifique se o site está ordenando corretamente o filtro de pesquisa por "tipo de evento" em todos os modelos que contém esse dado. Se não, corrija.
>
> E o filtro de "Debutante" e "15 anos" devem exibir a mesma lista de convites, pois é exatamente a mesma coisa (redundante), mas uns clientes pesquisam de um jeito e outros de outro.

## Código antigo

```css
.model-cover {
    width: 100%;
    aspect-ratio: 3/4;
    object-fit: cover;
}
```

```js
if (tipo === 'Aniversário') tags.push('15 Anos');
if (tipo === 'Debutante') tags.push('15 Anos');
```

```js
const coverMedia = model.coverType === 'video'
    ? `<video src="${model.cover}" class="model-cover loaded" autoplay loop muted playsinline preload="metadata"></video>`
    : `<img src="${model.cover}" alt="${model.name}" class="model-cover loaded">`;
```

## Código novo

```css
.model-media-pair {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.model-media-frame {
    aspect-ratio: 9/16;
}

.model-cover {
    width: 100%;
    height: 100%;
    object-fit: contain;
}
```

```js
if (isDebutanteType(tipo)) tags.push('Debutante', '15 Anos');
```

```js
const coverMedia = createMediaMarkup(model.cover, model.coverType, 'Capa', model.name);
const sheetMedia = createMediaMarkup(model.sheet, model.sheetType, 'Convite', model.name + ' - convite');
```

## Explicação

- O card de cada modelo agora mostra dois frames: `Capa` e `Convite`.
- Cada frame é `9:16` e usa `object-fit: contain`, evitando corte de imagem ou vídeo.
- A folha preenchida é lida de `folha_preenchida_path`, `folhaPreenchida_path`, `folha_path` ou `config_json.assets`.
- A busca por tipo passou a normalizar acentos.
- `15 anos` virou alias real de `Debutante`, sem herdar todos os modelos de `Aniversário`.
- A validação local confirmou 115 modelos com capa e folha existentes, e confirmou que `Debutante` e `15 anos` retornam os mesmos 7 modelos.
