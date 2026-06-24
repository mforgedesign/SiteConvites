# Documentação Completa do Projeto: Site Convites & VPS Bot

## Modelos em Galeria Grid (2026-06-24)

- `modelos.html` nao usa mais carrosseis horizontais para exibir os modelos.
- Cada secao de modelos renderiza uma `<div class="models-gallery-grid">`.
- No mobile, o grid usa 2 colunas.
- Em telas maiores, o grid usa `repeat(auto-fill, minmax(...))` para distribuir os cards conforme a largura disponivel.
- Foram removidos da pagina os controles de seta, `scrollCarousel()` e `enableDragScroll()`.
- Changelog relacionado: `changelog_2026-06-24_13-25_modelos_galeria_grid.md`.

Este documento serve como o "Cérebro do Projeto", aglutinando todos os detalhes arquiteturais, de fluxo e infraestrutura descobertos ou construídos. **Sempre leia este documento primeiro ao perder contexto.**

---

## 1. Arquitetura Geral

O projeto opera em um ecossistema dividido em 3 camadas (Frontend, Middleware Supabase e Backend VPS):

1. **Frontend (GitHub Pages + Domínio Customizado):** 
   - Responde por `pedidos.mforge.com.br` (Raiz) e também pelo fallback `mforgedesign.github.io/SiteConvites/`.
   - Lê orçamentos, renderiza a vitrine de modelos, e gera as requisições de compra.
2. **Middleware (Supabase Edge Functions):**
   - Atua como um *Proxy HTTPS* (`whatsapp-proxy`). Como o Frontend está em HTTPS, ele não pode enviar requisições diretas para a VPS (que roda em HTTP puro), pois gera erro de *Mixed Content* no navegador. O Supabase recebe a requisição segura e a repassa para o IP HTTP da VPS.
3. **Backend / Bot WhatsApp (VPS Hostinger/Hetzner):**
   - Roda um servidor Node.js com `Express` e a biblioteca `@wppconnect-team/wppconnect` que mantém um WhatsApp Web headless rodando para disparar as mensagens.

---

## 2. Detalhes do Frontend

### Vitrine de Modelos (`modelos.html`)
- **Dados:** A lista de modelos vem do banco PostgreSQL no Supabase (tabela `modelos`).
- **Assets (Imagens/Vídeos):** Existe uma divisão onde metade dos modelos tem seus arquivos (`assets/`) salvos no próprio repositório Git, e a outra metade só tem os arquivos salvos no **Supabase Storage** (buckets `modelos` e `modelos-code`).
- **Preview Modal (Iframe):** Exibe o convite injetando HTML via propriedade `srcdoc`. 
  - *Truque técnico:* Como o `srcdoc` perde a URL base para ler caminhos relativos (imagens, CSS), injetamos via JavaScript uma tag `<base href="...">` no `<head>`.
  - *URL Dinâmica:* O código usa `new URL('.', window.location.href)` para descobrir se o cliente está acessando via domínio customizado (raiz) ou via GitHub Pages (`/SiteConvites/`), impedindo erros 404 estáticos.
- **Deep Linking:** Se a página for acessada via `pedidos.mforge.com.br/modelos.html?modelo=Lucca-Astronauta`, o script intercepta a query (`?modelo=`) logo após criar a lista, e abre o popup de preview automaticamente. Há também um botão "Copiar Link" dentro do Modal de preview.
- **Nota de Atualização:** Os dados e assets de todos os modelos foram migrados para hospedagem local no GitHub, eliminando a dependência do Supabase para esta finalidade. Veja os detalhes no [Changelog - Migração de Modelos para GitHub Pages](file:///C:/Users/Acer/Documents/Novo%20Site%20v7/changelog_2026-05-25_11-05_migracao_modelos_para_github.md).

### Fluxo de Pagamento (`orcamentos/index.html` -> `PagamentoRecebido/index.html`)
- O orçamento é preenchido e salvo no `localStorage` sob a chave `quoteData`.
- Quando o usuário finaliza, ele é enviado para a URL do **Mercado Pago** (ex: `https://mpago.la/1wvHN6p`).
- Após pagar, o Mercado Pago redireciona o cliente para a tela de Sucesso (`/PagamentoRecebido/index.html`).
- **Atenção Máxima:** É o script dentro de *`PagamentoRecebido/index.html`* que **gera e escreve todo o texto da mensagem do WhatsApp**. Ele monta a string, compõe o link do modelo (usando o Deep Link `?modelo=slug`), e dispara o POST via fetch para o Webhook.

---

## 3. Detalhes do Middleware (Supabase Edge Function)

- **Caminho:** `https://xchphsltccopelblbsyb.supabase.co/functions/v1/whatsapp-proxy`
- O Frontend faz um POST para cá.
- Esta Edge Function recebe o payload e simplesmente faz um repasse (fetch) para `http://72.60.62.157:3000/webhook/pagamento`.

---

## 4. Detalhes do Bot de WhatsApp (VPS)

- **IP do Servidor:** `72.60.62.157`
- **Usuário SSH:** `root`
- **Diretório do Bot:** `/root/whatsapp-bot/`
- **Arquivo Principal:** `index.js`
- **Gerenciamento de Processo:** Controlado pelo daemon `pm2`. Para reiniciar após atualizações usa-se: `pm2 restart whatsapp_bot` (ou `pm2 restart all`).
- **Comportamento do Código (`index.js` na VPS):**
  - O express escuta na porta `3000`.
  - O endpoint `/webhook/pagamento` recebe o payload contendo `{ phone, summary, name }`.
  - Diferente do que parece intuitivo, o *Bot VPS NÃO formata a mensagem*. Ele é um repetidor "burro". Ele pega a string exata que veio na variável `summary` e dispara para:
    1. O Administrador: Número `5511939047235`.
    2. O Cliente: Adiciona `55` se não tiver, remove caracteres inválidos, e tenta disparar.
- **Emoji Encoding:** O script local na VPS foi editado diretamente com suporte estrito a formatação UTF-8, garantindo que o Webhook receba os emojis disparados pelo Frontend (🎉, 🚨) de forma intacta. 

---

## Guia Rápido de Solução de Problemas

1. **Mensagem do WhatsApp está com Link quebrado ou texto errado:** Modifique o `PagamentoRecebido/index.html`. O Frontend é quem dita as palavras.
2. **Convite aparece quebrado na Vitrine (Preview Modal 404):** O cálculo do `<base href=>` no `modelos.html` ou `orcamentos/js/app.js` pode estar falhando. Se a pasta tiver acentos, certifique-se que o código possui o `encodeURIComponent()`.
3. **Bot no WhatsApp não responde / parou / caiu QR Code:** Conecte via SSH na VPS (`ssh root@72.60.62.157`), e veja os logs pelo comando `pm2 logs whatsapp_bot`.

---
*Atualizado massivamente em 21/03/2026 após consolidação de domínio web e VPS.*
*Modificado em 03/06/2026 16:16:* Adição da feature Playlist dos Convidados aos Extras e sincronização com quoteData. Detalhes em [Changelog - Playlist Convidados nos Extras](file:///C:/Users/Acer/Documents/Novo%20Site%20v7/changelog_2026-06-03_16-16_adicionado_extra_playlist_convidados_orcamento.md).
