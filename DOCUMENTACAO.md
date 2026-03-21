# Documentação do Projeto: Convite Inteligente & Automação de WhatsApp

Este projeto consiste em um sistema de convites digitais com checkout automatizado e notificações via WhatsApp.

## Arquitetura do Sistema
O sistema opera em um modelo híbrido para otimizar custos e performance:
- **Frontend (GitHub Pages)**: Hospeda a lógica do site principal e a página de sucesso (`/PagamentoRecebido`).
- **Assets (Supabase Storage)**: Armazena mídias pesadas (MP4, MP3, GIFs) para manter o repositório leve.
- **Backend/Bot (VPS)**: Servidor Node.js dedicado ao processamento do bot de WhatsApp.

## Funcionalidades Principais

### 1. Página de Sucesso (`PagamentoRecebido/index.html`)
- **Funcionamento**: Captura os dados do pedido (`quoteData`) diretamente do `localStorage` do navegador do cliente.
- **Vantagem**: Permite um link de retorno único no Mercado Pago, sem necessidade de parâmetros complexos na URL.
- **Integração**: Ao ser aberta, a página dispara uma requisição silenciosa para o bot na VPS.

### 2. Bot de WhatsApp (VPS)
- **Localização**: `/root/whatsapp-bot` na VPS.
- **Gerenciamento**: PM2 (`pm2 start index.js --name whatsapp-bot`).
- **Automação**: Recebe o payload do pedido e envia uma mensagem formatada com o resumo do orçamento para o cliente.

## Guia de Deploy

### Atualização do Frontend
Para atualizar a página de sucesso no GitHub sem sobrecarregar o repositório com o diretório `modelos`:
1.  Remova qualquer pasta `.git` dentro de `PagamentoRecebido` se existir.
2.  Use o comando: `git add PagamentoRecebido/index.html`
3.  Commit e Push: `git commit -m "update success page"`, `git push origin master`.

### Sincronização de Assets (Supabase)
Sempre que novos modelos forem adicionados localmente:
-   Comando: `node scripts/extract_and_upload.js`
-   Este script extrai os assets e injeta os links do Supabase nos arquivos HTML.

## Segurança
- **VPS**: Protegida com Fail2Ban para prevenir ataques de força bruta no SSH.
- **JWT**: Integração com Supabase Auth para o Editor de Modelos.

---
*Documentação gerada em 20/03/2026 seguindo a Regra R2.*
