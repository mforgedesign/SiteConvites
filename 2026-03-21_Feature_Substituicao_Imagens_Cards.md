# Changelog: Inserção de Imagens Reais nos Cards de Opção Simples
**Data:** 2026-03-21 10:30 BRT
**Prompt:** "Coloca essas imagens na miniatura de cada um, pra não ficar com esses placeholders de ícone"

---

## 🖼️ Miniaturas Atualizadas na Página de Orçamentos

**O que mudou:**
Anteriormente, enquanto não tínhamos as imagens das miniaturas, eu instalei placeholders temporários usando ícones grandes do FontAwesome (`fa-gift` e `fa-book-open`) para os cards do pacote **Simples** dos passos "Dica de Presente" e "Manual do Convidado".

Com as impressões (prints) oficiais do layout Escuro baseados no template mestre (`Convite V7`) agora disponíveis na pasta `assets/orcamento/`, promovi a troca.

1. Substituí a `div` vazia que segurava os ícones fontawesome pela mesma estrutura de Imagem Expansível que usamos no pacote Premium.
2. Agora, ao carregar a página de orçamentos, o cliente verá a screenshot real (`Print Lista de Presentes.png` e `Print Manual.png`) preenchendo a caixa da miniatura em `aspect-[9/16]`. 
3. Caso o cliente passe o mouse por cima (ou clique no mobile) fora dos botões, ele poderá ampliar a miniatura usando nosso componente de modal já existente (`app.previewMedia()`), permitindo ver os detalhes da imagem com zoom.

**Arquivos modificados:**
- `orcamentos/index.html` (atualização dos cards `card_gift_simples` e `card_manual_simples` com a nova tag de imagem e handler de zoom).
