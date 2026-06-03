# Changelog - Adição do Item "Playlist dos Convidados" ao Orçamento
**Data:** 03 de Junho de 2026  
**Hora:** 16:16  

---

## Prompt Motivador
> Quero acrescentar um item na sessão "Extras" da página de orçamentos do site e realizar o deploy. Será o item "Playlist dos Convidados", com descrição explicando de forma intuitiva e esclarecedora de que é uma função onde o convidado poderá sugerir uma música para tocar no dia da festa. custará R$10. Deve ser devidamente populado na mensagem automática que é criada ao confirmar o orçamento.

---

## 1. Modificações em `orcamentos/index.html`

### Como funcionava antes
Havia uma listagem de extras contendo música, cronômetro, galeria, lembrete, save the date e foto na abertura.

```html
        <div class="option-card" data-extra="savethedate" onclick="app.toggleExtra('savethedate')">
            <div class="card-check"><i class="fa-solid fa-check"></i></div>
            <div class="card-thumb"><img src="assets/orcamento/Exemplo%20Save%20The%20Date.jpg" alt="Save The Date"></div>
            <div class="card-info">
                <div class="card-title">Save The Date</div>
                <div class="card-subtitle">Imagem elegante para antecipar</div>
                <div class="card-price paid">+ R$ 25,00</div>
                <button class="card-how" onclick="event.stopPropagation();app.howItWorks('extra-savethedate')"><i class="fa-solid fa-circle-info"></i> Como funciona?</button>
            </div>
        </div>
        <div class="option-card" data-extra="photo" onclick="app.togglePhoto()">
```

### Como funciona agora
Adicionamos a opção "Playlist dos Convidados" (R$ 10,00) após a opção "Save The Date".

```html
        <div class="option-card" data-extra="savethedate" onclick="app.toggleExtra('savethedate')">
            <div class="card-check"><i class="fa-solid fa-check"></i></div>
            <div class="card-thumb"><img src="assets/orcamento/Exemplo%20Save%20The%20Date.jpg" alt="Save The Date"></div>
            <div class="card-info">
                <div class="card-title">Save The Date</div>
                <div class="card-subtitle">Imagem elegante para antecipar</div>
                <div class="card-price paid">+ R$ 25,00</div>
                <button class="card-how" onclick="event.stopPropagation();app.howItWorks('extra-savethedate')"><i class="fa-solid fa-circle-info"></i> Como funciona?</button>
            </div>
        </div>
        <div class="option-card" data-extra="playlist" onclick="app.toggleExtra('playlist')">
            <div class="card-check"><i class="fa-solid fa-check"></i></div>
            <div class="card-icon-thumb"><i class="fa-solid fa-compact-disc"></i></div>
            <div class="card-info">
                <div class="card-title">Playlist dos Convidados</div>
                <div class="card-subtitle">Convidados sugerem músicas para a festa</div>
                <div class="card-price paid">+ R$ 10,00</div>
                <button class="card-how" onclick="event.stopPropagation();app.howItWorks('extra-playlist')"><i class="fa-solid fa-circle-info"></i> Como funciona?</button>
            </div>
        </div>
        <div class="option-card" data-extra="photo" onclick="app.togglePhoto()">
```

---

## 2. Modificações em `orcamentos/js/app.js`

### Como funcionava antes
- A função `updateTotal` calculava o preço dos extras desconsiderando playlists.
- A mensagem para WhatsApp e o modal explicativo "Como funciona?" não possuíam as strings para o extra playlist.
- A função `save()` persistia apenas `orcamentoAB` localmente, o que causava dessincronização com o painel de sucesso do pagamento (`PagamentoRecebido/index.html`) que lia a chave `quoteData`.

```javascript
        // Em updateTotal():
        let extrasVal = 0;
        this.data.extras.forEach(e => {
            if (e === 'galeria') extrasVal += 10;
            else if (e === 'lembrete') extrasVal += 25;
            else if (e === 'savethedate') extrasVal += 25;
        });
        this.data.extrasExtra = extrasVal;

        // Em sendToWhatsApp():
        if (this.data.extras.includes('musica')) { ... }
        if (this.data.extras.includes('cronometro')) msg += `• Cronômetro — Grátis\n`;
        if (this.data.extras.includes('galeria')) msg += `• Galeria de Fotos — ${fmt.format(10)}\n`;
        if (this.data.extras.includes('lembrete')) msg += `• Lembrete — ${fmt.format(25)}\n`;
        if (this.data.extras.includes('savethedate')) msg += `• Save The Date — ${fmt.format(25)}\n`;

        // Em howItWorks():
        'extra-galeria': { title: 'Galeria de Fotos', desc: 'Botão que abre um carrossel de fotos selecionadas por você (até 15 fotos).' },

        // Em save():
        save() {
            localStorage.setItem('orcamentoAB', JSON.stringify(this.data));
        },
```

### Como funciona agora
- O preço da playlist (+ R$ 10,00) foi integrado ao cálculo.
- Integrado o modal e o resumo do WhatsApp com a opção de Playlist.
- Adicionada sincronização robusta do `save()` com a chave `quoteData` no `localStorage`, mapeando o formato de dados A/B para o formato lido na tela de sucesso.

```javascript
        // Em updateTotal():
        let extrasVal = 0;
        this.data.extras.forEach(e => {
            if (e === 'galeria') extrasVal += 10;
            else if (e === 'playlist') extrasVal += 10;
            else if (e === 'lembrete') extrasVal += 25;
            else if (e === 'savethedate') extrasVal += 25;
        });
        this.data.extrasExtra = extrasVal;

        // Em sendToWhatsApp():
        if (this.data.extras.includes('musica')) { ... }
        if (this.data.extras.includes('cronometro')) msg += `• Cronômetro — Grátis\n`;
        if (this.data.extras.includes('galeria')) msg += `• Galeria de Fotos — ${fmt.format(10)}\n`;
        if (this.data.extras.includes('playlist')) msg += `• Playlist dos Convidados — ${fmt.format(10)}\n`;
        if (this.data.extras.includes('lembrete')) msg += `• Lembrete — ${fmt.format(25)}\n`;
        if (this.data.extras.includes('savethedate')) msg += `• Save The Date — ${fmt.format(25)}\n`;

        // Em howItWorks():
        'extra-galeria': { title: 'Galeria de Fotos', desc: 'Botão que abre um carrossel de fotos selecionadas por você (até 15 fotos).' },
        'extra-playlist': { title: 'Playlist dos Convidados', desc: 'Uma função onde o convidado poderá sugerir uma música para jogar/tocar no dia da festa, tornando a comemoração ainda mais interativa e animada!' },

        // Em save():
        save() {
            localStorage.setItem('orcamentoAB', JSON.stringify(this.data));
            try {
                const quoteData = {
                    clientName: this.data.clientName || '',
                    clientWhatsapp: this.data.clientWhatsapp || '',
                    basePackage: this.data.baseValue || 0,
                    giftTipType: this.data.giftType || 'none',
                    giftTipExtra: this.data.giftExtra || 0,
                    giftCustomText: this.data.giftText || '',
                    giftLinkUrl: this.data.giftLink || '',
                    rsvpType: this.data.rsvpType || 'none',
                    rsvpExtra: this.data.rsvpExtra || 0,
                    rsvpWhatsapp: this.data.rsvpWhatsapp || '',
                    manualType: this.data.manualType || 'none',
                    manualExtra: this.data.manualExtra || 0,
                    manualCustomText: this.data.manualText || '',
                    extras: this.data.extras || [],
                    extrasExtra: this.data.extrasExtra || 0,
                    eventName: this.data.eventName || '',
                    eventType: this.data.eventType || '',
                    customEventType: this.data.customEventType || '',
                    eventTheme: this.data.eventTheme || '',
                    eventColorPalette: this.data.eventColors || '',
                    eventDate: this.data.eventDate || '',
                    eventTimeStart: this.data.eventTimeStart || '',
                    eventTimeEnd: this.data.eventTimeEnd || '',
                    eventLocation: this.data.eventLocation || '',
                    musicCustomText: this.data.musicText || ''
                };
                localStorage.setItem('quoteData', JSON.stringify(quoteData));
            } catch (e) {
                console.error("Erro ao sincronizar com quoteData:", e);
            }
        },
```

---

## 3. Modificações em `js/app.js` (raiz)

### Como funcionava antes
O script raiz não calculava ou renderizava a playlist no resumo dinâmico do orçamento antigo.

```javascript
        // Em cálculo:
        if(checkbox.value === 'galeria') extrasExtra += 10;
        else if(checkbox.value === 'savethedate') extrasExtra += 25;
        else if(checkbox.value === 'lembrete') extrasExtra += 25;

        // Em addSummaryExtraToggle:
        this.addSummaryExtraToggle(extrasContainer, 'fa-images', 'Galeria', 10, 'galeria', this.quoteData.extras.includes('galeria'));
        // (Sem playlist)

        // Em summary pricing list:
        if(this.quoteData.extras.includes('galeria')) this.addSummaryPrice(pricingList, 'Galeria de Fotos', 10);
```

### Como funciona agora
Adicionamos o cálculo de R$ 10,00, a inclusão do toggle dinâmico de resumo visual e do detalhamento de preços para o item de playlist.

```javascript
        // Em cálculo:
        if(checkbox.value === 'galeria') extrasExtra += 10;
        else if(checkbox.value === 'playlist') extrasExtra += 10;
        else if(checkbox.value === 'savethedate') extrasExtra += 25;
        else if(checkbox.value === 'lembrete') extrasExtra += 25;

        // Em addSummaryExtraToggle:
        this.addSummaryExtraToggle(extrasContainer, 'fa-images', 'Galeria', 10, 'galeria', this.quoteData.extras.includes('galeria'));
        this.addSummaryExtraToggle(extrasContainer, 'fa-compact-disc', 'Playlist', 10, 'playlist', this.quoteData.extras.includes('playlist'));

        // Em summary pricing list:
        if(this.quoteData.extras.includes('galeria')) this.addSummaryPrice(pricingList, 'Galeria de Fotos', 10);
        if(this.quoteData.extras.includes('playlist')) this.addSummaryPrice(pricingList, 'Playlist dos Convidados', 10);
```

---

## 4. Modificações em `PagamentoRecebido/index.html`

### Como funcionava antes
A tela de pagamento confirmado do Mercado Pago varria o array de extras em `quoteData` no `localStorage`, mas não convertia o slug `playlist` para o nome legível na mensagem gerada.

```javascript
                    if (parsed.extras && parsed.extras.length > 0) {
                        parsed.extras.forEach(ext => {
                            if(ext === 'musica') summaryTexto += `- Música do Convite\n`;
                            else if(ext === 'cronometro') summaryTexto += `- Cronômetro Regressivo\n`;
                            else if(ext === 'lembrete') summaryTexto += `- Lembrete\n`;
                            else if(ext === 'savethedate') summaryTexto += `- Save The Date\n`;
                            else if(ext === 'galeria') summaryTexto += `- Galeria de Fotos\n`;
                            else summaryTexto += `- ${ext}\n`;
                        });
                    }
```

### Como funciona agora
Adicionamos a tradução legível da `playlist` no WhatsApp disparado de pós-pagamento.

```javascript
                    if (parsed.extras && parsed.extras.length > 0) {
                        parsed.extras.forEach(ext => {
                            if(ext === 'musica') summaryTexto += `- Música do Convite\n`;
                            else if(ext === 'cronometro') summaryTexto += `- Cronômetro Regressivo\n`;
                            else if(ext === 'lembrete') summaryTexto += `- Lembrete\n`;
                            else if(ext === 'savethedate') summaryTexto += `- Save The Date\n`;
                            else if(ext === 'galeria') summaryTexto += `- Galeria de Fotos\n`;
                            else if(ext === 'playlist') summaryTexto += `- Playlist dos Convidados\n`;
                            else summaryTexto += `- ${ext}\n`;
                        });
                    }
```
