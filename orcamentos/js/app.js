// orcamento/js/app.js — Página A/B Test (Rolagem)

const app = {
    baseValue: 80,
    data: {
        clientName: '',
        clientWhatsapp: '',
        // Personalização
        aberturaType: 'longa', // longa | curta | sem
        rsvpType: 'whatsapp', // whatsapp | formulario | none
        rsvpExtra: 0,
        rsvpWhatsapp: '',
        giftType: 'simples', // simples | premium | inteligente | sua_lista | none
        giftExtra: 0,
        giftText: '',
        giftLink: '',
        manualType: 'simples', // simples | premium | none
        manualExtra: 0,
        manualText: '',
        // Extras (checkboxes)
        extras: ['musica'],
        extrasExtra: 0,
        musicText: '',
        includePhoto: false,
        photoExtra: 0,
        // Evento
        eventType: 'aniversario',
        customEventType: '',
        eventName: '',
        eventAge: '',
        eventDate: '',
        eventTimeStart: '',
        eventTimeEnd: '',
        eventLocation: '',
        eventTheme: '',
        eventColors: '',
        eventFormacao: ''
    },

    // ==================== POPUP ====================
    initPopup() {
        const nameInput = document.getElementById('popup-name');
        const phoneInput = document.getElementById('popup-phone');
        const btn = document.getElementById('popup-btn');

        const checkFields = () => {
            const nameOk = nameInput.value.trim().length >= 2;
            const phoneOk = phoneInput.value.replace(/\D/g, '').length >= 10;
            if (nameOk && phoneOk) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        };

        nameInput.addEventListener('input', checkFields);
        phoneInput.addEventListener('input', () => {
            this.maskPhone(phoneInput);
            checkFields();
        });

        btn.addEventListener('click', () => {
            this.data.clientName = nameInput.value.trim();
            this.data.clientWhatsapp = phoneInput.value.trim();
            document.getElementById('identify-popup').classList.add('hidden');
            this.save();
        });
    },

    maskPhone(input) {
        let v = input.value.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
        else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
        input.value = v;
    },

    // ==================== SELEÇÃO DE CARDS ====================
    // Radio groups: só um selecionado por grupo
    selectOption(group, value) {
        const cards = document.querySelectorAll(`[data-group="${group}"]`);
        cards.forEach(c => c.classList.remove('selected'));

        if (this.data[group + 'Type'] === value) {
            // Toggle off
            this.data[group + 'Type'] = 'none';
            this.data[group + 'Extra'] = 0;
        } else {
            const card = document.querySelector(`[data-group="${group}"][data-value="${value}"]`);
            if (card) card.classList.add('selected');
            this.data[group + 'Type'] = value;
            this.data[group + 'Extra'] = this.getPriceFor(group, value);
        }

        if (group !== 'abertura') this.updateConditionalFields(group);
        this.updateTotal();
        this.save();
    },

    getPriceFor(group, value) {
        const prices = {
            abertura: { longa: 0, curta: 0, sem: 0 },
            rsvp: { whatsapp: 0, formulario: 10 },
            gift: { simples: 0, premium: 10, inteligente: 25, sua_lista: 0 },
            manual: { simples: 0, premium: 10 }
        };
        return (prices[group] && prices[group][value]) || 0;
    },

    updateConditionalFields(group) {
        if (group === 'rsvp') {
            const f = document.getElementById('field-rsvp-whatsapp');
            f.classList.toggle('hidden', this.data.rsvpType !== 'whatsapp');
        }
        if (group === 'gift') {
            document.getElementById('field-gift-text').classList.toggle('hidden',
                !['simples', 'premium'].includes(this.data.giftType));
            document.getElementById('field-gift-link').classList.toggle('hidden',
                this.data.giftType !== 'sua_lista');
            document.getElementById('field-gift-notice').classList.toggle('hidden',
                this.data.giftType !== 'inteligente');
        }
        if (group === 'manual') {
            document.getElementById('field-manual-text').classList.toggle('hidden',
                !['simples', 'premium'].includes(this.data.manualType));
        }
    },

    // Extras (checkboxes — independentes)
    toggleExtra(value) {
        const card = document.querySelector(`[data-extra="${value}"]`);
        if (!card) return;

        const idx = this.data.extras.indexOf(value);
        if (idx >= 0) {
            this.data.extras.splice(idx, 1);
            card.classList.remove('selected');
        } else {
            this.data.extras.push(value);
            card.classList.add('selected');
        }

        // Música field
        if (value === 'musica') {
            document.getElementById('field-music-text').classList.toggle('hidden',
                !this.data.extras.includes('musica'));
        }

        this.updateTotal();
        this.save();
    },

    togglePhoto() {
        this.data.includePhoto = !this.data.includePhoto;
        const card = document.querySelector('[data-extra="photo"]');
        if (card) card.classList.toggle('selected', this.data.includePhoto);
        this.data.photoExtra = 0;
        this.updateTotal();
        this.save();
    },

    // ==================== CÁLCULO DE TOTAL ====================
    updateTotal() {
        let extrasVal = 0;
        this.data.extras.forEach(e => {
            if (e === 'galeria') extrasVal += 10;
            else if (e === 'lembrete') extrasVal += 25;
            else if (e === 'savethedate') extrasVal += 25;
        });
        this.data.extrasExtra = extrasVal;

        const rsvpExtra = this.getPriceFor('rsvp', this.data.rsvpType);
        const giftExtra = this.getPriceFor('gift', this.data.giftType);
        const manualExtra = this.getPriceFor('manual', this.data.manualType);
        this.data.rsvpExtra = rsvpExtra;
        this.data.giftExtra = giftExtra;
        this.data.manualExtra = manualExtra;

        const total = this.baseValue + rsvpExtra + giftExtra + manualExtra + extrasVal + this.data.photoExtra;

        const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
        document.querySelectorAll('.total-value').forEach(el => el.textContent = fmt.format(total));
    },

    getTotal() {
        return this.baseValue + this.data.rsvpExtra + this.data.giftExtra +
               this.data.manualExtra + this.data.extrasExtra + this.data.photoExtra;
    },

    // ==================== EVENTO ====================
    initEventForm() {
        document.querySelectorAll('.evt-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.evt-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.data.eventType = btn.dataset.type;
                this.updateEventFields();
                this.save();
            });
        });
    },

    updateEventFields() {
        const t = this.data.eventType;
        const ageWrap = document.getElementById('age-wrap');
        const nameLabel = document.getElementById('event-name-label');
        const nameInput = document.getElementById('event-name');
        const customWrap = document.getElementById('custom-event-wrap');

        if (ageWrap) ageWrap.style.display = t === 'aniversario' ? '' : 'none';
        if (customWrap) customWrap.style.display = t === 'outro' ? '' : 'none';
        const formacaoWrap = document.getElementById('formacao-wrap');
        if (formacaoWrap) formacaoWrap.style.display = t === 'formatura' ? '' : 'none';

        if (nameLabel && nameInput) {
            const labels = { aniversario: 'Nome do Aniversariante', casamento: 'Nome do Casal', formatura: 'Nome do Formando', outro: 'Nome' };
            const ph = { aniversario: 'Ex: Maria', casamento: 'Ex: Maria e João', formatura: 'Ex: João', outro: 'Ex: Maria' };
            nameLabel.textContent = labels[t] || 'Nome';
            nameInput.placeholder = ph[t] || 'Ex: Maria';
        }
    },

    // ==================== RESUMO ====================
    buildSummary() {
        const list = document.getElementById('summary-items');
        if (!list) return;
        list.innerHTML = '';
        const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

        const addRow = (label, value, isFree) => {
            const row = document.createElement('div');
            row.className = 'summary-row';
            row.innerHTML = `<span class="label">${label}</span><span class="value ${isFree ? 'free' : ''}">${isFree ? 'Grátis' : fmt.format(value)}</span>`;
            list.appendChild(row);
        };

        addRow('Convite Digital Premium', 80, false);

        // Abertura
        const aberturaLabels = { longa: 'Abertura Longa', curta: 'Abertura Curta', sem: 'Sem Abertura' };
        addRow(aberturaLabels[this.data.aberturaType] || 'Abertura Longa', 0, true);

        // RSVP
        const rsvpLabels = { whatsapp: 'Confirmação: WhatsApp Simples', formulario: 'Confirmação: Formulário Inteligente' };
        if (this.data.rsvpType !== 'none') {
            addRow(rsvpLabels[this.data.rsvpType] || 'Confirmação', this.data.rsvpExtra, this.data.rsvpExtra === 0);
        }

        // Gift
        const giftLabels = { simples: 'Presentes: Sugestões Simples', premium: 'Presentes: Sugestões Premium', inteligente: 'Presentes: Lista Inteligente', sua_lista: 'Presentes: Sua Lista' };
        if (this.data.giftType !== 'none') {
            addRow(giftLabels[this.data.giftType] || 'Presentes', this.data.giftExtra, this.data.giftExtra === 0);
        }

        // Manual
        const manualLabels = { simples: 'Manual: Simples', premium: 'Manual: Premium' };
        if (this.data.manualType !== 'none') {
            addRow(manualLabels[this.data.manualType] || 'Manual', this.data.manualExtra, this.data.manualExtra === 0);
        }

        // Extras
        if (this.data.extras.includes('musica')) addRow('Música Personalizada', 0, true);
        if (this.data.extras.includes('cronometro')) addRow('Cronômetro', 0, true);
        if (this.data.extras.includes('galeria')) addRow('Galeria de Fotos', 10, false);
        if (this.data.extras.includes('lembrete')) addRow('Lembrete', 25, false);
        if (this.data.extras.includes('savethedate')) addRow('Save The Date', 25, false);
        if (this.data.includePhoto) addRow('Foto na Abertura', 0, true);

        this.updateTotal();
    },

    // ==================== WHATSAPP ====================
    syncFormData() {
        this.data.rsvpWhatsapp = document.getElementById('rsvp-number')?.value || '';
        this.data.giftText = document.getElementById('gift-text')?.value || '';
        this.data.giftLink = document.getElementById('gift-link')?.value || '';
        this.data.manualText = document.getElementById('manual-text')?.value || '';
        this.data.musicText = document.getElementById('music-text')?.value || '';
        this.data.eventName = document.getElementById('event-name')?.value || '';
        this.data.eventAge = document.getElementById('event-age')?.value || '';
        this.data.eventDate = document.getElementById('event-date')?.value || '';
        this.data.eventTimeStart = document.getElementById('event-time-start')?.value || '';
        this.data.eventTimeEnd = document.getElementById('event-time-end')?.value || '';
        this.data.eventLocation = document.getElementById('event-location')?.value || '';
        this.data.eventTheme = document.getElementById('event-theme')?.value || '';
        this.data.eventColors = document.getElementById('event-colors')?.value || '';
        this.data.customEventType = document.getElementById('custom-event-type')?.value || '';
        this.data.eventFormacao = document.getElementById('event-formacao')?.value || '';
    },

    confirmOrder() {
        this.syncFormData();
        this.buildSummary();

        if (!this.data.eventName.trim()) {
            alert('Por favor, preencha pelo menos o Nome no convite.');
            document.getElementById('event-name')?.focus();
            return;
        }

        // Show confirm modal
        document.getElementById('confirm-modal').classList.add('active');
    },

    sendToWhatsApp() {
        this.syncFormData();
        const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
        const total = this.getTotal();

        const typeMap = { aniversario: 'Aniversário', casamento: 'Casamento', formatura: 'Formatura', outro: 'Outro' };
        const aberturaMap = { longa: 'Abertura Longa', curta: 'Abertura Curta', sem: 'Sem Abertura' };
        const rsvpMap = { whatsapp: 'WhatsApp Simples', formulario: 'Formulário Inteligente', none: 'Não incluir' };
        const giftMap = { simples: 'Sugestões Simples', premium: 'Sugestões Premium', inteligente: 'Lista Inteligente', sua_lista: 'Sua Lista', none: 'Não incluir' };
        const manualMap = { simples: 'Simples', premium: 'Premium', none: 'Não incluir' };

        let msg = `⚠️ *PAGAMENTO DE SINAL*\n`;
        msg += `Pagamento de Sinal de R$20 deve ser feito no link abaixo e comprovante deve ser enviado aqui na conversa:\n`;
        msg += `🔗 https://mpago.la/1wvHN6p\n\n`;
        msg += `─────────────────────\n`;
        msg += `📋 *RESUMO DO ORÇAMENTO*\n`;
        msg += `─────────────────────\n\n`;

        msg += `👤 *DADOS DO CLIENTE*\n`;
        msg += `• Nome: ${this.data.clientName}\n`;
        msg += `• WhatsApp: ${this.data.clientWhatsapp}\n\n`;

        msg += `🎉 *CONVITE DIGITAL*\n`;
        msg += `• Convite Premium — ${fmt.format(80)}\n\n`;

        msg += `🎨 *PERSONALIZAÇÃO*\n`;
        msg += `• Abertura: ${aberturaMap[this.data.aberturaType] || 'Longa'}\n`;
        if (this.data.rsvpType !== 'none') {
            msg += `• Confirmação: ${rsvpMap[this.data.rsvpType]} — ${this.data.rsvpExtra === 0 ? 'Grátis' : fmt.format(this.data.rsvpExtra)}\n`;
            if (this.data.rsvpType === 'whatsapp' && this.data.rsvpWhatsapp) msg += `  ↳ Número: ${this.data.rsvpWhatsapp}\n`;
        }
        if (this.data.giftType !== 'none') {
            msg += `• Presentes: ${giftMap[this.data.giftType]} — ${this.data.giftExtra === 0 ? 'Grátis' : fmt.format(this.data.giftExtra)}\n`;
            if (this.data.giftText) msg += `  ↳ Texto: ${this.data.giftText}\n`;
            if (this.data.giftLink) msg += `  ↳ Link: ${this.data.giftLink}\n`;
        }
        if (this.data.manualType !== 'none') {
            msg += `• Manual: ${manualMap[this.data.manualType]} — ${this.data.manualExtra === 0 ? 'Grátis' : fmt.format(this.data.manualExtra)}\n`;
            if (this.data.manualText) msg += `  ↳ Info: ${this.data.manualText}\n`;
        }
        if (this.data.extras.includes('musica')) {
            msg += `• Música: Inclusa — Grátis\n`;
            if (this.data.musicText) msg += `  ↳ ${this.data.musicText}\n`;
        }
        if (this.data.extras.includes('cronometro')) msg += `• Cronômetro — Grátis\n`;
        if (this.data.extras.includes('galeria')) msg += `• Galeria de Fotos — ${fmt.format(10)}\n`;
        if (this.data.extras.includes('lembrete')) msg += `• Lembrete — ${fmt.format(25)}\n`;
        if (this.data.extras.includes('savethedate')) msg += `• Save The Date — ${fmt.format(25)}\n`;
        if (this.data.includePhoto) msg += `• Foto na Abertura — Grátis\n`;

        msg += `\n📅 *DADOS DO EVENTO*\n`;
        const evtType = this.data.eventType === 'outro' ? this.data.customEventType : typeMap[this.data.eventType];
        msg += `• Tipo: ${evtType}\n`;
        msg += `• Nome: ${this.data.eventName}\n`;
        if (this.data.eventType === 'aniversario' && this.data.eventAge) msg += `• Idade: ${this.data.eventAge}\n`;
        if (this.data.eventType === 'formatura' && this.data.eventFormacao) msg += `• Formação: ${this.data.eventFormacao}\n`;
        if (this.data.eventDate) msg += `• Data: ${this.data.eventDate}\n`;
        if (this.data.eventTimeStart) msg += `• Horário: ${this.data.eventTimeStart}${this.data.eventTimeEnd ? ' às ' + this.data.eventTimeEnd : ''}\n`;
        if (this.data.eventLocation) msg += `• Local: ${this.data.eventLocation}\n`;
        if (this.data.eventTheme) msg += `• Tema: ${this.data.eventTheme}\n`;
        if (this.data.eventColors) msg += `• Paleta: ${this.data.eventColors}\n`;

        msg += `\n💰 *VALOR TOTAL: ${fmt.format(total)}*\n\n`;
        msg += `Trabalhamos com um sinal de R$20 para colocar seu convite em nossa Fila de Produção.\n\n`;
        msg += `Clique em enviar para poder acessar o link de pagamento👉`;

        const url = `https://wa.me/5511939047235?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    },

    // ==================== MODAL "COMO FUNCIONA" ====================
    howItWorks(type) {
        const base = 'assets/orcamento/';
        const info = {
            'abertura-longa': { title: 'Abertura Longa', desc: 'Animação 3D completa com transições cinematográficas. Dura cerca de 8 segundos e cria uma experiência imersiva antes do convite aparecer.', media: base+'Exemplo%20Abertura%20Longa.mp4' },
            'abertura-curta': { title: 'Abertura Curta', desc: 'Animação rápida de 3 segundos. Ideal para quem quer um visual bonito mas direto ao ponto.', media: base+'Exemplo%20Abertura%20Curta.mp4' },
            'abertura-sem': { title: 'Sem Abertura', desc: 'O convite abre direto no conteúdo, sem animação prévia. O convidado vê tudo de primeira.', media: base+'Exemplo%20sem%20Abertura.mp4' },
            'rsvp-whatsapp': { title: 'Confirmação WhatsApp', desc: 'Ao clicar no botão de confirmação, o convidado preenche nome e é redirecionado ao seu WhatsApp automaticamente. Simples e rápido!', media: base+'Exemplo%20Confirmar%20Whatsapp.mp4' },
            'rsvp-formulario': { title: 'Formulário Inteligente', desc: 'O convidado preenche um formulário completo com nome, acompanhantes e outros dados. Todas as confirmações ficam organizadas em uma planilha inteligente.', media: base+'Formul%C3%A1rio%20inteligente.mp4' },
            'gift-simples': { title: 'Sugestões Simples', desc: 'Uma lista em texto direto no convite com opção de Pix. Você nos envia o que quer escrever e nós colocamos no convite.', media: base+'Simples.png' },
            'gift-premium': { title: 'Sugestões Premium', desc: 'Uma imagem bela e personalizada com as sugestões de presente. Design elegante que combina com o convite.', media: base+'Premium.jpg' },
            'gift-inteligente': { title: 'Lista Inteligente', desc: 'Mini-site com fotos e preços dos presentes. O dinheiro vai direto pro seu Pix. Entraremos em contato via WhatsApp para montar a lista.', media: base+'Lista%20Inteligente.mp4' },
            'gift-sua_lista': { title: 'Sua Lista', desc: 'Botão que redireciona para sua lista de presentes em outra loja (Amazon, Magalu, etc). Você nos envia o link.', media: base+'Exemplo%20Link%20Lista.jpg' },
            'manual-simples': { title: 'Manual Simples', desc: 'Informações escritas diretamente na tela do convite. Dress code, estacionamento, e qualquer instrução para seus convidados.', media: base+'Exemplo%20Manual%20do%20Convidado.jpg' },
            'manual-premium': { title: 'Manual Premium', desc: 'O botão abre uma imagem personalizada e trabalhada de forma elegante com as informações do manual.', media: base+'Manual%20Premium.jpg' },
            'extra-galeria': { title: 'Galeria de Fotos', desc: 'Botão que abre um carrossel de fotos selecionadas por você (até 15 fotos).' },
            'extra-cronometro': { title: 'Cronômetro', desc: 'Contagem regressiva no topo do convite mostrando meses, dias, horas, minutos e segundos até a festa.', media: base+'Exemplo%20Contagem%20Regressiva.jpg' },
            'extra-lembrete': { title: 'Lembrete', desc: 'Um aviso para ser enviado poucos dias antes do evento, garantindo que os convidados estarão preparados.', media: base+'Lembrete.jpg' },
            'extra-savethedate': { title: 'Save The Date', desc: 'Imagem estática elegante com a data da festa, na mesma paleta visual do convite. Perfeita para enviar antes dos convites oficiais.', media: base+'Exemplo%20Save%20The%20Date.jpg' },
            'extra-musica': { title: 'Música do Convite', desc: 'Escolha qualquer música para tocar no seu convite. Envie o link do YouTube ou o nome da música.' },
            'extra-photo': { title: 'Foto na Abertura', desc: 'Uma foto sua ou do aniversariante aparece na animação de abertura do convite, tornando-o ainda mais especial e personalizado.' }
        };

        const item = info[type];
        if (!item) return;

        document.getElementById('how-modal-title').textContent = item.title;
        document.getElementById('how-modal-desc').textContent = item.desc;

        const mediaBox = document.getElementById('how-modal-media');
        mediaBox.innerHTML = '';
        if (item.media) {
            if (item.media.endsWith('.mp4')) {
                mediaBox.innerHTML = `<video src="${item.media}" autoplay loop muted playsinline></video>`;
            } else {
                mediaBox.innerHTML = `<img src="${item.media}" alt="${item.title}">`;
            }
        }

        document.getElementById('how-modal').classList.add('active');
    },

    closeHowModal() {
        document.getElementById('how-modal').classList.remove('active');
    },

    closeConfirmModal() {
        document.getElementById('confirm-modal').classList.remove('active');
    },

    // ==================== PERSISTÊNCIA ====================
    save() {
        localStorage.setItem('orcamentoAB', JSON.stringify(this.data));
    },

    load() {
        const saved = localStorage.getItem('orcamentoAB');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.data = { ...this.data, ...parsed };
                return true;
            } catch (e) { return false; }
        }
        return false;
    },

    restoreUI() {
        // Popup
        if (this.data.clientName && this.data.clientWhatsapp) {
            document.getElementById('identify-popup').classList.add('hidden');
        }

        // Radio groups
        ['abertura', 'rsvp', 'gift', 'manual'].forEach(group => {
            const val = this.data[group + 'Type'];
            document.querySelectorAll(`[data-group="${group}"]`).forEach(c => c.classList.remove('selected'));
            if (val && val !== 'none') {
                const card = document.querySelector(`[data-group="${group}"][data-value="${val}"]`);
                if (card) card.classList.add('selected');
            }
            if (group !== 'abertura') this.updateConditionalFields(group);
        });

        // Extras
        this.data.extras.forEach(e => {
            const card = document.querySelector(`[data-extra="${e}"]`);
            if (card) card.classList.add('selected');
        });
        if (this.data.includePhoto) {
            const card = document.querySelector('[data-extra="photo"]');
            if (card) card.classList.add('selected');
        }

        // Music field
        document.getElementById('field-music-text').classList.toggle('hidden',
            !this.data.extras.includes('musica'));

        // Text fields
        const bindings = {
            'rsvp-number': 'rsvpWhatsapp', 'gift-text': 'giftText', 'gift-link': 'giftLink',
            'manual-text': 'manualText', 'music-text': 'musicText',
            'event-name': 'eventName', 'event-age': 'eventAge', 'event-date': 'eventDate',
            'event-time-start': 'eventTimeStart', 'event-time-end': 'eventTimeEnd',
            'event-location': 'eventLocation', 'event-theme': 'eventTheme',
            'event-colors': 'eventColors', 'custom-event-type': 'customEventType',
            'event-formacao': 'eventFormacao'
        };
        for (const [id, key] of Object.entries(bindings)) {
            const el = document.getElementById(id);
            if (el && this.data[key]) el.value = this.data[key];
        }

        // Event type
        document.querySelectorAll('.evt-type-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.type === this.data.eventType);
        });
        this.updateEventFields();
    },

    // ==================== INIT ====================
    init() {
        this.initPopup();
        this.initEventForm();

        // Auto-save on all inputs
        document.querySelectorAll('input, textarea, select').forEach(el => {
            el.addEventListener('input', () => { this.syncFormData(); this.save(); });
            el.addEventListener('change', () => { this.syncFormData(); this.save(); });
        });

        if (this.load()) {
            this.restoreUI();
        }

        this.updateTotal();
        this.buildSummary();

        // Scroll to personalize
        document.getElementById('btn-personalize')?.addEventListener('click', () => {
            document.getElementById('section-personalize')?.scrollIntoView({ behavior: 'smooth' });
        });

        // Intersection observer to rebuild summary when visible
        const summarySection = document.getElementById('section-summary');
        if (summarySection) {
            const obs = new IntersectionObserver(entries => {
                if (entries[0].isIntersecting) { this.syncFormData(); this.buildSummary(); }
            }, { threshold: 0.1 });
            obs.observe(summarySection);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
