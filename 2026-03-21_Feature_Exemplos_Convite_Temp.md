# Changelog: Sincronização de Exemplos do Convite_Temp
**Data:** 2026-03-21 10:25 BRT
**Prompt:** "Quero que o botão de 'Ver exemplo' do presentes grátis e do manual grátis abra um popup com o mesmo exemplo que está configurada no config.js do C:\Users\Acer\Documents\Novo Site v7\Convite_Temp" e "O número que aparece pra copiar o pix no de presentes deve ser 11939047235"

---

## 🎨 Padronização Visual dos Popups de Exemplo (Dica de Presente e Manual)

**O que mudou:**
Anteriormente, ao clicar em "Ver Exemplo" no pacote "Simples" do Manual do Convidado, a plataforma exibia um popup claro (modo Light) construído via string diretamente no JavaScript, o qual discrepava visualmente do convite real que os convidados recebem (modo Dark). O popup de presentes usava um HTML rústico, sem Tailwind.

1. **Nova Arquitetura com Iframes Sandbox:** Assim como fizemos com a Dica de Presente, movemos o HTML do *Manual do Convidado* para seu próprio sandbox isolado (`assets/orcamento/Manual_Exemplo.html`).
2. **Importação 1:1 do Convite V7:** Copiamos as chaves HTML brutas do arquivo `Convite_Temp/config.js` e as colamos nestes novos iframes, ativando o Tailwind CDN. O resultado é que os clientes interessados nos brindes (Manual e Presentes Simples) agora visualizam exata e precisamente a UI moderna Escura *(Dark-mode Glassmorphism)* que estará nos convites originais, com a vantagem de não quebrar as regras de CSS da página de Orçamentos (já que estão em iframe).
3. **Chave PIX Única:** Atualizamos o botão e o texto de "Copiar Chave PIX" do popup de Cotação de Presentes para operar oficialmente com a chave predefinida `11939047235`.

**Arquivos modificados:**
- `orcamentos/js/app.js` (refatorada a função `showManualExample` para utilizar o iframe ao invés da string hardcoded).
- Criado: `assets/orcamento/Manual_Exemplo.html`.
- Modificado: `assets/orcamento/Simples_Exemplo.html` (inserido layout premium + novo PIX).
