# Changelog - Modelos em Galeria Grid

**Data:** 2026-06-24
**Hora:** 13:25

## Prompt
> Quero que a pagina de modelos nao tenha mais os convites sendo exibidos em carrosseis. Quero eles distribuidos em galeria conforme a tela permitir (em mobile, grid de 2).

## Arquivos Modificados
- `modelos.html`
- `DOCUMENTACAO.md`
- `LESSONS_LEARNED.md`

## Codigo Antigo

### CSS
```css
.carousel-track {
    display: flex;
    gap: 1rem;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
}

.carousel-arrow {
    position: absolute;
}
```

### Render
```javascript
sectionEl.innerHTML = `
    <h2 class="section-title">${section.title}</h2>
    <div class="carousel-container">
        <button class="carousel-arrow left" onclick="scrollCarousel(this, -1)">...</button>
        <div class="carousel-track"></div>
        <button class="carousel-arrow right" onclick="scrollCarousel(this, 1)">...</button>
    </div>
`;
```

## Codigo Novo

### CSS
```css
.models-gallery-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
}

@media (min-width: 640px) {
    .models-gallery-grid {
        grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    }
}
```

### Render
```javascript
sectionEl.innerHTML = `
    <h2 class="section-title">${section.title}</h2>
    <div class="models-gallery-grid"></div>
`;
```

## Explicacao
- A listagem de modelos deixou de renderizar carrosseis horizontais por secao.
- Cada secao agora usa grid responsivo.
- No mobile, o grid fica fixo em 2 colunas.
- Em telas maiores, o grid distribui os cards conforme a largura disponivel.
- As setas, `scrollCarousel()` e `enableDragScroll()` foram removidos da pagina.

## QA
- Busca local confirmou `carousel` com 0 ocorrencias em `modelos.html`.
- Navegador nao foi aberto/controlado.
