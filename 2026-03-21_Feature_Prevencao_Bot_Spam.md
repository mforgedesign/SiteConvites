# Changelog: Prevenção de Mensagens Duplicadas no Bot (Reload da Página)
**Data:** 2026-03-21 10:20 BRT
**Prompt:** "Quando a página de https://pedidos.mforge.com.br/PagamentoRecebido/ enviar a mensagem com sucesso via bot da vps, deve redirecionar para a página de orçamentos. Porque se o cliente deixa aberta no navegador, toda vez que ele abrir o navegador vai acabar carregando a página de novo e a mensagem é solicitada pro bot novamente."

---

## 🛡️ Prevenção Antimamute (F5) no Servidor VPS

**O que mudou:**
Para evitar que clientes reenviem o mesmo orçamento para a VPS apenas dando um simples "refresh" (F5) na aba da página final de Sucesso, ou quando o navegador reabre abas em background no celular, implementamos duas linhas de defesa no `PagamentoRecebido/index.html`.

1. **Destruição do Carrinho (`localStorage`):** Assim que a resposta da VPS volta como `200 OK` (sucesso), a variável `quoteData` é instantaneamente deletada da memória do navegador local do cliente.
2. **Redirecionamento Automático:**
   - **Caso de sucesso:** O cliente lê "Mensagem enviada com sucesso" e, após 5 segundos, a tela redireciona automaticamente (fecha o ciclo) jogando o usuário de volta para a primeira tela de novos orçamentos (`../orcamentos/`).
   - **Caso de Reload Indesejado:** Se o cliente atualizar a página durante ou após esse momento, o script do topo agora checa: `if (!savedData) window.location.href = '../orcamentos/'`. Como os dados já foram destruídos, a página aborta o envio do POST para a VPS e dá bounce no visitante imediatamente para o início do site.

**Arquivos modificados:**
- `PagamentoRecebido/index.html` (adição de validação inicial e `setTimeout` pós-sucesso da requisição).
