# Changelog: Reposicionamento Dinâmico de Inputs (UX Mobile)
**Data:** 2026-03-21 10:15 BRT
**Prompt:** "Quando as opções de Presente Grátis e Manual Grátis estão selecionadas, no mobile (onde a maior parte dos clientes fazem seus pedidos), o campo de texto fica abaixo das demais opções, sendo obrigado o cliente adivinhar que precisa rolar a página. Quero que, quando essas funções em específico estiverem selecionadas, o campo de texto apareça exatamente abaixo delas, pro cliente já conseguir ver onde ele precisa escrever."

---

## 🚀 Melhoria de Experiência (UX) na página de Orçamentos

**O que mudou:**
Foi criada uma lógica em JavaScript que move fisicamente no DOM a caixa de input (onde o cliente digita o texto do presente ou manual) para dentro da malha (CSS Grid), exatamente na *linha* abaixo do card que o cliente clicou. 
Além disso, foi adicionado um recurso autônomo que efetua um leve "Scroll" na tela do celular para centralizar o novo campo que apareceu, garantindo que o cliente não o perca de vista.

**Como funcionava antes:**
A caixa de input ficava fixada hardcoded embaixo de toda a malha de opções daquele passo. Se o cliente selecionasse o 1º card no celular, a caixa só apareceria no final do passo, escondida, exigindo scroll manual.
*Código antigo (exemplo simplificado lido de `orcamentos/js/app.js`)*:
```javascript
if(type === 'simples' || type === 'premium') {
    if(textContainer) textContainer.classList.remove('hidden');
} 
```

**Como funciona agora:**
Ao selecionar uma opção, o sistema invoca a função `placeInputContainer` que tira o container do fundo da seção, remove as restrições de largura (para ele esticar usando `grid-column: 1 / -1`) e o injeta logo após os botões da fileira ativa, movendo a visão da tela para ele.
*Código novo inserido:*
```javascript
if(type === 'simples' || type === 'premium') {
    if(textContainer) {
        textContainer.classList.remove('hidden');
        this.placeInputContainer('gift_text_input_container', `card_gift_${type}`, 4);
    }
}
```

**Arquivos modificados:**
- `orcamentos/js/app.js` (criação da função auxiliar `placeInputContainer` e implantação no `selectGiftTip` e `selectManual`).
