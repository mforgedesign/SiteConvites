# Changelog - Página de auditoria de modelos 15 anos

Data: 2026-07-01

## Prompt

> Cria pra mim uma página html simples com todos os modelos que aparecem no filtro de aniversário, pra eu selecionar quais são de 15anos/debutante, porque talvez esteja marcado incorretamente. Aí um botão que copia o texto indicando todos os que são 15 anos, pra eu colar aqui pra você e tu corrigir pra mim.

## Código antigo

Não existia uma página de auditoria manual para separar modelos de `Aniversário` que deveriam ser `Debutante / 15 anos`.

## Código novo

```html
<button id="copySelected" type="button">Copiar selecionados</button>
```

```js
state.all = modelos
  .filter(isAniversario)
  .sort((a, b) => String(a.name || a.slug).localeCompare(String(b.name || b.slug), 'pt-BR'));
```

```js
lines.push(`${index + 1}. slug: ${model.slug}`);
lines.push(`   título atual: ${model.name || ''}`);
lines.push(`   tema: ${model.tema || model.config_json?.convite?.tema || ''}`);
lines.push(`   paleta: ${model.paleta_cores || model.config_json?.convite?.paletaCores || ''}`);
lines.push(`   tipo atual: ${model.tipo || ''}`);
```

## Explicação

- Foi criada a página `auditar-15anos.html`.
- A página carrega `modelos.json` e mostra apenas os modelos cujo tipo atual é `Aniversário`.
- Cada card mostra capa e folha preenchida em frames `9:16`.
- Clicar no card marca/desmarca o modelo como `Debutante / 15 anos`.
- O botão `Copiar selecionados` copia um texto estruturado com os slugs selecionados para aplicação posterior da correção.
