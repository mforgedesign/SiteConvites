# Changelog — 2026-03-21 00:40 — Reformulação da página de sucesso e link MP

**Prompt motivador:** O usuário reportou que a mensagem do WhatsApp tinha emojis quebrados ("????"), faltavam dados detalhados do pedido, e pediu:
1. Redesign com as cores e estilo do site
2. Resumo detalhado idêntico ao formato do orçamento
3. Botão fallback "Confirmar Pedido no WhatsApp" caso a VPS falhe
4. Atualização do link Mercado Pago para `https://mpago.la/1wvHN6p`

---

## `PagamentoRecebido/index.html`

### ANTES (v3)
- Página com fundo verde claro, estilo genérico
- Resumo simples: apenas tipo de evento, nome, data, pacote e extras em lista
- Sem fallback visual caso o envio automático falhasse
- Emojis no payload quebravam por falta de header charset

### AGORA (v4)
- Design dark mode com Tailwind CSS, cores accent (#e63946), ícones FontAwesome
- Barra gradiente no topo, cartão de status com borda lateral accent
- Resumo completo extraído do `localStorage`:
  - Modelo escolhido + link
  - Funções selecionadas (pacote, presentes, RSVP, manual, extras nomeados)
  - Total formatado em R$
  - Dados do evento (nome, tipo, tema, cores, data, horário, endereço, WhatsApp)
  - Presentes customizados, Manual do Convidado, link de música
  - Rodapé "_Orçamento feito pelo site_"
- Botão verde "Confirmar Pedido no WhatsApp" aparece automaticamente se o envio falhar
  - Abre `api.whatsapp.com` com o resumo completo pré-preenchido
- Header `Content-Type: application/json; charset=UTF-8` no fetch

---

## VPS `/root/whatsapp-bot/index.js`

### ANTES
- Montava as mensagens de cliente e admin internamente com emojis hardcoded
- Emojis ficavam como "????" (encoding latin1)
- Resumo simplificado

### AGORA
- Recebe o campo `summary` já formatado pelo frontend (UTF-8 nativo do JSON)
- Mensagem do cliente: saudação + summary completo
- Mensagem do admin: cabeçalho NOVO PEDIDO + nome/telefone + summary completo
- Adicionado `--disable-dev-shm-usage` ao Puppeteer para estabilidade

---

## `orcamentos/index.html`

### ANTES
- Link de pagamento: `https://mpago.la/1nzJ1eN`

### AGORA
- Link de pagamento: `https://mpago.la/1wvHN6p`
