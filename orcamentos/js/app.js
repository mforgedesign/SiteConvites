// js/app.js

const app = {
    currentStep: 1,
    totalSteps: 8,
    baseValue: 60,
    quoteData: {
        clientName: '',
        clientWhatsapp: '',
        basePackage: 60,
        eventType: 'aniversario',
        customEventType: '',
        eventName: '',
        eventAge: '',
        eventDate: '',
        eventTimeStart: '',
        eventTimeEnd: '',
        eventLocation: '',
        eventTheme: '',
        eventColorPalette: '',
        giftTipType: 'simples',
        giftTipExtra: 0,
        rsvpType: 'whatsapp',
        rsvpExtra: 0,
        rsvpWhatsapp: '',
        manualType: 'simples',
        manualExtra: 0,
        extras: ['musica'],
        extrasExtra: 0,
        musicCustomText: '',
        giftCustomText: '',
        giftLinkUrl: ''
    },

    packageDetails: {
        'base': {
            title: 'Sem Abertura',
            price: 'R$ 35,00',
            desc: 'Convite direto sem animação de envelope. Apenas a folha com informações.',
            videoSrc: 'assets/orcamento/Exemplo sem Abertura.mp4',
            value: 35
        },
        'simples': {
            title: 'Abertura Padrão (Curta)',
            price: 'R$ 60,00',
            desc: 'Envelope 3D abrindo com glitter ou fumaça, revelando o convite diretamente.',
            videoSrc: 'assets/orcamento/Exemplo Abertura Curta.mp4',
            value: 60
        },
        'premium': {
            title: 'Abertura Premium (Longa)',
            price: 'R$ 85,00',
            desc: 'Envelope 3D com glitter ou fumaça + Vídeo personalizado antes do convite.<br><br><span class="text-accent font-bold mt-2 inline-block">✨ Inclui foto na abertura</span>',
            videoSrc: 'assets/orcamento/Exemplo Abertura Longa.mp4',
            value: 85
        }
    },
    
    currentModalPackage: null,

    init() {
        this.setupAutoSave();

        // Carrega modelo selecionado do localStorage antes de navegar
        this.loadSelectedModel();

        if(this.loadData()) {
            this.restoreUI();
            this.updateTotal(); // Garante recálculo dos totais da base salva
            if(this.currentStep > 1) {
                // Navega para o passo salvo, pulando validação
                this.goToStep(this.currentStep, true);
            }
        } else {
            this.updateTotal();
            this.toggleAgeField();
        }

        // Setup listener for iframe messages (like closing from inside Simples_Exemplo.html)
        window.addEventListener('message', (event) => {
            if(event.data === 'closeModal') {
                this.closeModal();
            }
        });

        // Setup keyboard listener for model preview modal
        document.addEventListener('keydown', (event) => {
            if(event.key === 'Escape') {
                this.closeModelPreview();
            }
        });
    },

    // --- LOCAL STORAGE LOGIC ---
    setupAutoSave() {
        // Vincula evento de input/change a todos os campos para auto-save
        document.querySelectorAll('input[type="text"], input[type="tel"], input[type="url"], input[type="date"], input[type="time"], textarea, select').forEach(el => {
            el.addEventListener('input', () => this.syncInputsToData());
            el.addEventListener('change', () => this.syncInputsToData());
        });
    },

    syncInputsToData() {
        const q = this.quoteData;
        
        // Step 1
        q.clientName = document.getElementById('client_name')?.value || '';
        q.clientWhatsapp = document.getElementById('client_whatsapp')?.value || '';
        
        // Step 3
        q.eventType = document.getElementById('event_type')?.value || 'aniversario';
        q.customEventType = document.getElementById('custom_event_type')?.value || '';
        q.eventName = document.getElementById('event_name')?.value || '';
        q.eventAge = document.getElementById('event_age')?.value || '';
        q.eventDate = document.getElementById('event_date')?.value || '';
        q.eventTimeStart = document.getElementById('event_time_start')?.value || '';
        q.eventTimeEnd = document.getElementById('event_time_end')?.value || '';
        q.eventLocation = document.getElementById('event_location')?.value || '';
        q.eventTheme = document.getElementById('event_theme')?.value || '';
        q.eventColorPalette = document.getElementById('event_colors')?.value || '';

        // Steps 4, 5, 6, 7 (Textfields)
        q.giftCustomText = document.getElementById('gift_custom_text')?.value || '';
        q.giftLinkUrl = document.getElementById('gift_link_url')?.value || '';
        q.rsvpWhatsapp = document.getElementById('rsvp_dest_number')?.value || '';
        q.manualCustomText = document.getElementById('manual_custom_text')?.value || '';
        q.musicCustomText = document.getElementById('music_link')?.value || '';

        this.saveData();
    },

    saveData() {
        this.quoteData.currentStep = this.currentStep;
        localStorage.setItem('quoteData', JSON.stringify(this.quoteData));
    },

    loadData() {
        const saved = localStorage.getItem('quoteData');
        if(saved) {
            try {
                const parsed = JSON.parse(saved);
                this.quoteData = { ...this.quoteData, ...parsed };
                if(parsed.currentStep) {
                    this.currentStep = parsed.currentStep;
                }
                return true;
            } catch(e) {
                console.error("Erro ao carregar dados", e);
            }
        }
        return false;
    },

    clearData() {
        localStorage.removeItem('quoteData');
        window.location.reload();
    },

    restoreUI() {
        // Restaurar inputs de texto principais
        const bindings = {
            'client_name': 'clientName',
            'client_whatsapp': 'clientWhatsapp',
            'event_type': 'eventType',
            'custom_event_type': 'customEventType',
            'event_name': 'eventName',
            'event_age': 'eventAge',
            'event_date': 'eventDate',
            'event_time_start': 'eventTimeStart',
            'event_time_end': 'eventTimeEnd',
            'event_location': 'eventLocation',
            'event_theme': 'eventTheme',
            'event_colors': 'eventColorPalette',
            'gift_custom_text': 'giftCustomText',
            'gift_link_url': 'giftLinkUrl',
            'rsvp_dest_number': 'rsvpWhatsapp',
            'manual_custom_text': 'manualCustomText',
            'music_link': 'musicCustomText'
        };

        for(let id in bindings) {
            const el = document.getElementById(id);
            if(el && this.quoteData[bindings[id]]) {
                el.value = this.quoteData[bindings[id]];
            }
        }

        // Restaurar base package
        const radio = document.querySelector(`input[name="base_value"][value="${this.quoteData.basePackage}"]`);
        if(radio) radio.checked = true;

        // Limpar todos extras checks force logic sem disparar o updateTotal para não sobrescrever a array cedo
        const savedExtras = [...(this.quoteData.extras || [])];
        document.querySelectorAll('input[name="extras"]').forEach(cb => {
            const shouldBeChecked = savedExtras.includes(cb.value);
            // set current state to opposite of desired, so toggleExtra flips it to desired and updates UI
            cb.checked = !shouldBeChecked;
            this.toggleExtra(cb.value, true); 
        });

        // Restaurar sub-opções (resetar tipo antes para evitar toggle indesejado)
        this.toggleAgeField();
        const savedGift = this.quoteData.giftTipType || 'simples';
        const savedRsvp = this.quoteData.rsvpType || 'whatsapp';
        const savedManual = this.quoteData.manualType || 'simples';
        this.quoteData.giftTipType = 'none';
        this.quoteData.rsvpType = 'none';
        this.quoteData.manualType = 'none';
        this.selectGiftTip(savedGift);
        this.selectRSVP(savedRsvp);
        this.selectManual(savedManual);
    },

    // --- FIM LOCAL STORAGE ---

    // Janela Modal
    openModal(pkgType) {
        this.currentModalPackage = pkgType;
        const data = this.packageDetails[pkgType];
        
        document.getElementById('modal_title').innerText = data.title;
        document.getElementById('modal_price').innerText = data.price;
        document.getElementById('modal_desc').innerHTML = data.desc;
        
        const video = document.getElementById('modal_video');
        if(video) video.src = data.videoSrc;
        
        const modal = document.getElementById('info_modal');
        const box = document.getElementById('modal_content_box');
        
        modal.classList.remove('opacity-0', 'pointer-events-none');
        box.classList.remove('scale-95');
        box.classList.add('scale-100');
    },
    
    closeModal() {
        const modal = document.getElementById('info_modal');
        const box = document.getElementById('modal_content_box');
        
        if(modal) {
            modal.classList.remove('opacity-100');
            modal.classList.add('opacity-0', 'pointer-events-none');
        }
        
        if(box) {
            box.classList.remove('scale-100');
            box.classList.add('scale-95');
        }
        
        setTimeout(() => {
            const video = document.getElementById('modal_video');
            if(video) {
                video.pause();
                video.src = '';
            }
            
            // Restore original HTML and classes if they were modified by showGiftExample
            // This is required so Step 2 modals still work.
            if(this.originalModalHTML && box) {
                box.innerHTML = this.originalModalHTML;
                this.originalModalHTML = null;
            }
            if(this.originalModalClass && box) {
                box.className = this.originalModalClass;
                this.originalModalClass = null;
            }
        }, 300);
    },
    
    selectFromModal() {
        if(!this.currentModalPackage) return;
        
        const data = this.packageDetails[this.currentModalPackage];
        const radio = document.querySelector(`input[name="base_value"][value="${data.value}"]`);
        
        if(radio) {
            radio.checked = true;
            this.updateTotal();
        }
        
        this.closeModal();
    },

    // Alternar o tema escuro/claro
    toggleTheme() {
        const root = document.documentElement;
        if(root.getAttribute("data-theme") === "dark") {
            root.removeAttribute("data-theme");
            root.classList.remove("dark");
            document.getElementById("sunIcon")?.classList.add("hidden");
            document.getElementById("moonIcon")?.classList.remove("hidden");
        } else {
            root.setAttribute("data-theme", "dark");
            root.classList.add("dark");
            document.getElementById("sunIcon")?.classList.remove("hidden");
            document.getElementById("moonIcon")?.classList.add("hidden");
        }
    },

    // Navegação entre janelas (steps)
    goToStep(step, skipValidation = false) {
        if(step > this.currentStep && !skipValidation) {
            // Validação simples ao avançar
            if(this.currentStep === 1) {
                const name = document.getElementById('client_name')?.value?.trim();
                const wpp = document.getElementById('client_whatsapp')?.value?.trim();
                
                if(!name || !wpp) {
                    alert('Por favor, preencha o Nome e WhatsApp para avançar.');
                    return;
                }
                
                this.quoteData.clientName = name;
                this.quoteData.clientWhatsapp = wpp;
            }

            if(this.currentStep === 3) {
                this.quoteData.eventName = document.getElementById('event_name')?.value?.trim();
                this.quoteData.eventAge = document.getElementById('event_age')?.value?.trim();
                this.quoteData.eventDate = document.getElementById('event_date')?.value?.trim();
                this.quoteData.eventTimeStart = document.getElementById('event_time_start')?.value?.trim();
                this.quoteData.eventTimeEnd = document.getElementById('event_time_end')?.value?.trim();
                this.quoteData.eventLocation = document.getElementById('event_location')?.value?.trim();
                this.quoteData.customEventType = document.getElementById('custom_event_type')?.value?.trim();

                if(!this.quoteData.eventName) {
                    alert('Lembre-se de colocar ao menos o Nome no convite ou casal.');
                    return;
                }
            }

            if(this.currentStep === 5) {
                if(this.quoteData.rsvpType === 'whatsapp') {
                    const rsvpInput = document.getElementById('rsvp_dest_number')?.value?.trim();
                    // Just a basic check to ensure something is typed if selected
                    if(!rsvpInput || rsvpInput.length < 10) {
                        alert('Por favor, informe um número de WhatsApp válido para receber as confirmações.');
                        return;
                    }
                    this.quoteData.rsvpWhatsapp = rsvpInput;
                }
            }

            if(this.currentStep === 4) {
                if(this.quoteData.giftTipType === 'simples' || this.quoteData.giftTipType === 'premium') {
                    const giftText = document.getElementById('gift_custom_text')?.value?.trim();
                    if(!giftText) {
                        alert('Por favor, informe o que deseja escrever na lista de presentes.');
                        return;
                    }
                    this.quoteData.giftCustomText = giftText;
                } else if(this.quoteData.giftTipType === 'sua_lista') {
                    const giftLink = document.getElementById('gift_link_url')?.value?.trim();
                    if(!giftLink) {
                        alert('Por favor, informe o link da sua lista de presentes.');
                        return;
                    }
                    this.quoteData.giftLinkUrl = giftLink;
                }
            }

            if(this.currentStep === 6) {
                if(this.quoteData.manualType === 'simples' || this.quoteData.manualType === 'premium') {
                    const manualText = document.getElementById('manual_custom_text')?.value?.trim();
                    if(!manualText) {
                        alert('Por favor, informe quais informações deseja no Manual do Convidado.');
                        return;
                    }
                    this.quoteData.manualCustomText = manualText;
                }
            }
        }

        // Nota: restoreUI() já garante a seleção visual correta ao restaurar do localStorage

        // Hide all steps
        document.querySelectorAll('.step-window').forEach(el => {
            el.classList?.remove('active');
            setTimeout(() => el.classList?.add('hidden'), 300);
        });

        // Show target step
        const targetEl = document.getElementById(`step-${step}`);
        if(targetEl) {
            setTimeout(() => {
                targetEl.classList?.remove('hidden');
                requestAnimationFrame(() => {
                    targetEl.classList?.add('active');
                });
            }, 300);
        }

        this.currentStep = step;
        
        for(let i = 1; i <= 8; i++) {
            const dot = document.getElementById(`step-dot-${i}`);
            if(dot) {
                if(i <= this.currentStep) {
                    dot.className = "shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all bg-accent text-white shadow-sm";
                } else {
                    dot.className = "shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all border border-gray-300 text-gray-400 hover:border-accent hover:text-accent bg-transparent";
                }
            }
        }
        
        // Ajusta Rodapé para o Passo 8
        const standardFooter = document.getElementById('standard_footer_content');
        const summaryFooter = document.getElementById('summary_footer_content');
        
        if(step === 8) {
            if(standardFooter) standardFooter.classList.add('hidden');
            if(summaryFooter) summaryFooter.classList.remove('hidden');
            this.populateSummary(); // Always populate summary when entering step 8
        } else {
            if(standardFooter) standardFooter.classList.remove('hidden');
            if(summaryFooter) summaryFooter.classList.add('hidden');
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        this.saveData(); // Save step state
    },

    // Atualiza o valor do rodapé
    updateTotal() {
        // Valor base do pacote
        const baseRadios = document.querySelectorAll('input[name="base_value"]');
        let selectedBase = 60;
        baseRadios.forEach(radio => {
            if(radio.checked) selectedBase = parseInt(radio.value);
        });

        // Valor da Dica de Presente
        let giftExtra = 0;
        const giftRadios = document.querySelectorAll('input[name="gift_tip"]');
        giftRadios.forEach(radio => {
            if(radio.checked) {
                if(radio.value === 'premium') giftExtra = 10;
                else if(radio.value === 'inteligente') giftExtra = 25;
            }
        });

        // Valor do RSVP
        let rsvpExtra = 0;
        const rsvpRadios = document.querySelectorAll('input[name="rsvp_type"]');
        rsvpRadios.forEach(radio => {
            if(radio.checked) {
                if(radio.value === 'formulario') rsvpExtra = 10;
            }
        });

        // Valor do Manual do Convidado
        let manualExtra = 0;
        const manualRadios = document.querySelectorAll('input[name="manual_type"]');
        manualRadios.forEach(radio => {
            if(radio.checked) {
                if(radio.value === 'premium') manualExtra = 10;
            }
        });

        // Valor de Funções Extras
        let extrasExtra = 0;
        const extrasCheckboxes = document.querySelectorAll('input[name="extras"]');
        let selectedExtras = [];
        extrasCheckboxes.forEach(checkbox => {
            if(checkbox.checked) {
                selectedExtras.push(checkbox.value);
                if(checkbox.value === 'galeria') extrasExtra += 10;
                else if(checkbox.value === 'savethedate') extrasExtra += 25;
                else if(checkbox.value === 'lembrete') extrasExtra += 25;
            }
        });

        this.baseValue = selectedBase;
        this.quoteData.basePackage = selectedBase;
        this.quoteData.giftTipExtra = giftExtra;
        this.quoteData.rsvpExtra = rsvpExtra;
        this.quoteData.manualExtra = manualExtra;
        this.quoteData.extras = selectedExtras;
        this.quoteData.extrasExtra = extrasExtra;
        
        const formatter = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });

        const total = this.baseValue + giftExtra + rsvpExtra + manualExtra + extrasExtra; 
        const totalFooter = document.getElementById('total_footer');
        if(totalFooter) totalFooter.innerText = formatter.format(total);

        const summaryTotal = document.getElementById('summary_total');
        if(summaryTotal) summaryTotal.innerText = formatter.format(total);

        const footerTotalSummary = document.getElementById('footer_total_summary');
        if(footerTotalSummary) footerTotalSummary.innerText = formatter.format(total);

        // Auto-save whenever totals (and thus choices) strongly update
        if(this.saveData) this.saveData();
    },

    // Ocultar/Mostrar input idade caso seja niver ou não
    toggleAgeField() {
        const eventTypeRadios = document.querySelectorAll('input[name="event_type"]');
        let selectedType = 'aniversario';
        
        eventTypeRadios.forEach(radio => {
            if(radio.checked) {
                selectedType = radio.value;
            }
        });

        this.quoteData.eventType = selectedType;
        const ageContainer = document.getElementById('age_container');
        const nameLabel = document.getElementById('event_name_label');
        const nameInput = document.getElementById('event_name');
        const customContainer = document.getElementById('custom_event_container');

        // Show/hide custom event field
        if(customContainer) {
            if(selectedType === 'outro') {
                customContainer.style.maxHeight = '120px';
                customContainer.style.opacity = '1';
                customContainer.style.marginTop = '0.5rem';
                customContainer.style.marginBottom = '0.5rem';
            } else {
                customContainer.style.maxHeight = '0';
                customContainer.style.opacity = '0';
                customContainer.style.marginTop = '0';
                customContainer.style.marginBottom = '0';
            }
        }

        if(selectedType === 'aniversario') {
            if(ageContainer) {
                ageContainer.classList?.remove('opacity-0', 'pointer-events-none', 'h-0', 'overflow-hidden');
                ageContainer.classList?.add('opacity-100', 'h-auto');
            }
            if(nameLabel) nameLabel.innerText = "Nome do Aniversariante";
            if(nameInput) nameInput.placeholder = "Ex: Maria";
        } else {
            if(ageContainer) {
                ageContainer.classList?.add('opacity-0', 'pointer-events-none', 'h-0', 'overflow-hidden');
                ageContainer.classList?.remove('opacity-100', 'h-auto');
            }
            if(nameLabel && nameInput) {
                if(selectedType === 'casamento') {
                    nameLabel.innerText = "Nome do Casal";
                    nameInput.placeholder = "Ex: Maria e João";
                } else if(selectedType === 'formatura') {
                    nameLabel.innerText = "Nome do Formando";
                    nameInput.placeholder = "Ex: João";
                } else {
                    nameLabel.innerText = "Nome";
                    nameInput.placeholder = "Ex: Maria";
                }
            }
        }
    },

    // --- LOGICA JANELA 4: DICAS DE PRESENTE ---
    
    selectGiftTip(type) {
        // Se clicar na mesma opção já selecionada, desmarca (função toggle)
        if (this.quoteData.giftTipType === type) {
            this.noGiftTip();
            return;
        }

        // Desmarcar todos os cards visualmente
        document.querySelectorAll('#step-4 .package-card').forEach(card => {
            card.classList?.remove('border-accent', 'bg-pink-50', 'dark:bg-pink-900/10');
            card.classList?.add('border-transparent');
        });

        // Marcar o selecionado
        const selectedCard = document.getElementById(`card_gift_${type}`);
        if(selectedCard) {
            selectedCard.classList?.remove('border-transparent');
            selectedCard.classList?.add('border-accent', 'bg-pink-50', 'dark:bg-pink-900/10');
            
            // Marcar o radio hidden
            const radio = selectedCard.querySelector('input[type="radio"]');
            if(radio) radio.checked = true;
        }

        // Esconder todos os containers condicionais
        const textContainer = document.getElementById('gift_text_input_container');
        const noticeContainer = document.getElementById('gift_inteligente_notice');
        const linkContainer = document.getElementById('gift_link_input_container');
        
        if(textContainer) textContainer.classList.add('hidden');
        if(noticeContainer) noticeContainer.classList.add('hidden');
        if(linkContainer) linkContainer.classList.add('hidden');

        // Mostrar o container correto
        if(type === 'simples' || type === 'premium') {
            if(textContainer) textContainer.classList.remove('hidden');
        } else if(type === 'inteligente') {
            if(noticeContainer) noticeContainer.classList.remove('hidden');
        } else if(type === 'sua_lista') {
            if(linkContainer) linkContainer.classList.remove('hidden');
        }

        this.quoteData.giftTipType = type;
        this.updateTotal();
    },

    noGiftTip() {
        // Desmarcar todos
        document.querySelectorAll('#step-4 .package-card').forEach(card => {
            card.classList?.remove('border-accent', 'bg-pink-50', 'dark:bg-pink-900/10');
            card.classList?.add('border-transparent');
            const radio = card.querySelector('input[type="radio"]');
            if(radio) radio.checked = false;
        });

        // Esconder todos os containers condicionais
        const textContainer = document.getElementById('gift_text_input_container');
        const noticeContainer = document.getElementById('gift_inteligente_notice');
        const linkContainer = document.getElementById('gift_link_input_container');
        if(textContainer) textContainer.classList.add('hidden');
        if(noticeContainer) noticeContainer.classList.add('hidden');
        if(linkContainer) linkContainer.classList.add('hidden');

        this.quoteData.giftTipType = 'none';
        this.updateTotal();
    },

    selectRSVP(type) {
        // Se clicar na mesma opção já selecionada, desmarca (função toggle)
        if (this.quoteData.rsvpType === type) {
            this.noRSVP();
            return;
        }

        document.querySelectorAll('#step-5 .package-card').forEach(card => {
            card.classList?.remove('border-accent', 'bg-pink-50', 'dark:bg-pink-900/10');
            card.classList?.add('border-transparent');
        });

        const selectedCard = document.getElementById(`card_rsvp_${type}`);
        if(selectedCard) {
            selectedCard.classList?.remove('border-transparent');
            selectedCard.classList?.add('border-accent', 'bg-pink-50', 'dark:bg-pink-900/10');
            const radio = selectedCard.querySelector('input[type="radio"]');
            if(radio) radio.checked = true;
        }

        const wppInputContainer = document.getElementById('rsvp_whatsapp_input_container');
        if(wppInputContainer) {
            if(type === 'whatsapp') {
                wppInputContainer.classList.remove('hidden');
            } else {
                wppInputContainer.classList.add('hidden');
            }
        }

        this.quoteData.rsvpType = type;
        this.updateTotal();
    },

    noRSVP() {
        document.querySelectorAll('#step-5 .package-card').forEach(card => {
            card.classList?.remove('border-accent', 'bg-pink-50', 'dark:bg-pink-900/10');
            card.classList?.add('border-transparent');
            const radio = card.querySelector('input[type="radio"]');
            if(radio) radio.checked = false;
        });

        const wppInputContainer = document.getElementById('rsvp_whatsapp_input_container');
        if(wppInputContainer) wppInputContainer.classList.add('hidden');

        this.quoteData.rsvpType = 'none';
        this.updateTotal();
    },

    showRSVPExample(type) {
        if(type === 'formulario') {
            window.open('https://docs.google.com/forms/d/e/1FAIpQLSeuzrR6x1iq9eKBBi_23127zXiQnSBsclF1T1DugNjb8ZI0Eg/viewform?usp=publish-editor', '_blank');
            return;
        }

        if(type === 'whatsapp') {
            const modal = document.getElementById('rsvp_example_modal');
            if(modal) {
                modal.classList.remove('opacity-0', 'pointer-events-none');
                modal.classList.add('opacity-100');
            }
        }
    },

    closeRSVPModal() {
        const modal = document.getElementById('rsvp_example_modal');
        if(modal) {
            modal.classList.remove('opacity-100');
            modal.classList.add('opacity-0', 'pointer-events-none');
        }
    },

    async showGiftExample(type) {
        if(type === 'inteligente') {
            window.open('https://presentes.mforge.com.br/cibele15anos/', '_blank');
            return;
        }
        if(type === 'sua_lista') {
            window.open('https://listas.extra.com.br/', '_blank');
            return;
        }

        const modal = document.getElementById('info_modal');
        const contentBox = document.getElementById('modal_content_box');
        
        if(!modal || !contentBox) return;

        // Salvar HTML original para restaurar se necessário
        if(!this.originalModalHTML) {
            this.originalModalHTML = contentBox.innerHTML;
            this.originalModalClass = contentBox.className;
        }

        if(type === 'simples') {
            // Usa iframe para isolar o CSS e consertar o Tailwind
            contentBox.className = "relative w-full max-w-[400px] h-[600px] max-h-[90vh] rounded-xl shadow-2xl overflow-hidden transition-all duration-300 scale-100 bg-black/95 border border-white/20";
            
            contentBox.innerHTML = `
                <iframe id="simples_iframe" src="assets/orcamento/Simples_Exemplo.html" class="w-full h-full border-0 outline-none block" title="Lista de Presentes" onload="
                    try {
                        const doc = this.contentWindow.document;
                        const btn = doc.querySelector('.fa-xmark');
                        if(btn) {
                            btn.onclick = function() { window.parent.postMessage('closeModal', '*'); };
                        }
                        
                        // Fallback also hook root modal elements just in case the original JS intercepts it
                        const modalContainer = doc.querySelector('.modal-container');
                        if(modalContainer) {
                             modalContainer.addEventListener('click', function(e) {
                                  if(e.target.classList.contains('fa-xmark')) window.parent.postMessage('closeModal', '*');
                             });
                        }
                    } catch(e) {}
                "></iframe>
            `;
        } else if(type === 'premium') {
            contentBox.className = "relative max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl overflow-hidden transition-all duration-300 scale-100 bg-transparent";
            contentBox.innerHTML = `
                <button type="button" onclick="app.closeModal()" class="absolute top-3 right-3 z-10 bg-black/50 text-white hover:bg-black/70 rounded-full w-10 h-10 flex items-center justify-center transition-colors border border-white/20">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
                <img src="assets/orcamento/Premium.jpg" class="max-w-full max-h-[85vh] object-contain rounded-lg">
            `;
        }

        modal.classList?.remove('opacity-0', 'pointer-events-none');
        modal.classList?.add('opacity-100');
    },

    // --- LOGICA JANELA 6: MANUAL DO CONVIDADO ---

    selectManual(type) {
        // Se clicar na mesma opção já selecionada, desmarca (função toggle)
        if (this.quoteData.manualType === type) {
            this.noManual();
            return;
        }

        document.querySelectorAll('#step-6 .package-card').forEach(card => {
            card.classList?.remove('border-accent', 'bg-pink-50', 'dark:bg-pink-900/10');
            card.classList?.add('border-transparent');
        });

        const selectedCard = document.getElementById(`card_manual_${type}`);
        if(selectedCard) {
            selectedCard.classList?.remove('border-transparent');
            selectedCard.classList?.add('border-accent', 'bg-pink-50', 'dark:bg-pink-900/10');
            const radio = selectedCard.querySelector('input[type="radio"]');
            if(radio) radio.checked = true;
        }

        const manualInputContainer = document.getElementById('manual_text_input_container');
        if(manualInputContainer) {
            if(type === 'simples' || type === 'premium') {
                manualInputContainer.classList.remove('hidden');
            } else {
                manualInputContainer.classList.add('hidden');
            }
        }

        this.quoteData.manualType = type;
        this.updateTotal();
    },

    noManual() {
        document.querySelectorAll('#step-6 .package-card').forEach(card => {
            card.classList?.remove('border-accent', 'bg-pink-50', 'dark:bg-pink-900/10');
            card.classList?.add('border-transparent');
            const radio = card.querySelector('input[type="radio"]');
            if(radio) radio.checked = false;
        });

        const manualInputContainer = document.getElementById('manual_text_input_container');
        if(manualInputContainer) manualInputContainer.classList.add('hidden');

        this.quoteData.manualType = 'none';
        this.updateTotal();
    },

    showManualExample(type) {
        const modal = document.getElementById('info_modal');
        const contentBox = document.getElementById('modal_content_box');
        
        if(!modal || !contentBox) return;

        // Salvar HTML original para restaurar se necessário
        if(!this.originalModalHTML) {
            this.originalModalHTML = contentBox.innerHTML;
            this.originalModalClass = contentBox.className;
        }

        if(type === 'simples') {
            contentBox.className = "relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 transform transition-all duration-300 scale-100";
            contentBox.innerHTML = `
                <div class="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-4 mb-5">
                    <h3 class="text-xl font-bold gradient-text">Manual do Convidado</h3>
                    <button type="button" onclick="app.closeModal()" class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors text-gray-500 dark:text-gray-300">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="space-y-4 text-sm md:text-base leading-relaxed" style="color: var(--text-secondary);">
                    <p><i class="fa-solid fa-clock text-accent w-5"></i> <strong>A Pontualidade é um Carinho:</strong> Sua presença desde o primeiro instante é fundamental para que não perca nenhum detalhe da nossa história. Por favor, chegue no horário combinado.</p>
                    <p><i class="fa-solid fa-calendar-check text-accent w-5"></i> <strong>Confirmação de Presença:</strong> Para que possamos preparar tudo com perfeição e amor, pedimos a gentileza de confirmar sua vinda até 15 dias antes do evento.</p>
                    <p><i class="fa-solid fa-heart text-accent w-5"></i> <strong>Celebre Conosco:</strong> Deixe a alegria guiar a sua noite! Estamos ansiosos para criar memórias inesquecíveis e celebrar este capítulo tão especial ao seu lado.</p>
                    <p><i class="fa-solid fa-cake-candles text-accent w-5"></i> <strong>Um Doce Encontro:</strong> Não se despeça sem nos presentear com um abraço apertado e saborear uma fatia do nosso bolo. Queremos compartilhar cada segundo de felicidade com você.</p>
                </div>
                <button type="button" onclick="app.closeModal()" class="mt-6 w-full bg-accent hover:bg-pink-700 text-white font-semibold py-3 rounded-xl shadow-md transition-all">
                    Entendi
                </button>
            `;
        } else if(type === 'premium') {
            contentBox.className = "relative max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl overflow-hidden transition-all duration-300 scale-100 bg-transparent";
            contentBox.innerHTML = `
                <button type="button" onclick="app.closeModal()" class="absolute top-3 right-3 z-10 bg-black/50 text-white hover:bg-black/70 rounded-full w-10 h-10 flex items-center justify-center transition-colors border border-white/20">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
                <img src="assets/orcamento/Manual Premium.jpg" class="max-w-full max-h-[85vh] object-contain rounded-lg">
            `;
        }

        modal.classList?.remove('opacity-0', 'pointer-events-none');
        modal.classList?.add('opacity-100');
    },

    // --- LOGICA JANELA 7: FUNÇÕES EXTRAS ---

    toggleExtra(type, skipUpdate = false) {
        const card = document.getElementById(`card_extra_${type}`);
        if(!card) return;

        const checkbox = card.querySelector('input[type="checkbox"]');
        if(!checkbox) return;

        // Inverte estado do checkbox
        checkbox.checked = !checkbox.checked;

        // Atualiza visual do card
        if(checkbox.checked) {
            card.classList.remove('border-transparent');
            card.classList.add('border-accent', 'bg-pink-50', 'dark:bg-pink-900/10');
            
            // Troca o botão para estado ativo
            const btnEuQuero = card.querySelector('.btn-eu-quero');
            if(btnEuQuero) {
                btnEuQuero.classList.remove('bg-white', 'dark:bg-gray-800', 'text-accent');
                btnEuQuero.classList.add('bg-accent', 'text-white');
                btnEuQuero.querySelector('.unselected-text').classList.add('hidden');
                btnEuQuero.querySelector('.selected-text').classList.remove('hidden');
            }
        } else {
            card.classList.remove('border-accent', 'bg-pink-50', 'dark:bg-pink-900/10');
            card.classList.add('border-transparent');
            
            // Troca o botão para estado inativo
            const btnEuQuero = card.querySelector('.btn-eu-quero');
            if(btnEuQuero) {
                btnEuQuero.classList.remove('bg-accent', 'text-white');
                btnEuQuero.classList.add('bg-white', 'dark:bg-gray-800', 'text-accent');
                btnEuQuero.querySelector('.unselected-text').classList.remove('hidden');
                btnEuQuero.querySelector('.selected-text').classList.add('hidden');
            }
        }

        // Caso seja a Música, mostrar campo extra
        if(type === 'musica') {
            const musicInputContainer = document.getElementById('music_input_container');
            if(musicInputContainer) {
                if(checkbox.checked) {
                    musicInputContainer.classList.remove('hidden');
                } else {
                    musicInputContainer.classList.add('hidden');
                }
            }
        }

        if(!skipUpdate) this.updateTotal();
    },

    showExtraInfo(type) {
        const modal = document.getElementById('info_modal');
        const contentBox = document.getElementById('modal_content_box');
        
        if(!modal || !contentBox) return;

        if(!this.originalModalHTML) {
            this.originalModalHTML = contentBox.innerHTML;
            this.originalModalClass = contentBox.className;
        }

        contentBox.className = "relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 transform transition-all duration-300 scale-100";
        
        let title = '';
        let desc = '';
        let mediaHtml = '';

        switch(type) {
            case 'galeria':
                title = 'Galeria de Fotos';
                desc = 'Ao clicar no botão "Galeria de Fotos", seu convidado irá automaticamente abrir um carrossel de fotos da aniversariante (ou casal) selecionadas por você (Até 15 Fotos).';
                mediaHtml = '<div class="w-full aspect-video bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mb-4"><i class="fa-solid fa-images text-5xl text-gray-300 dark:text-gray-600"></i></div>';
                break;
            case 'cronometro':
                title = 'Cronômetro';
                desc = 'Seu convite irá exibir um cronômetro no topo da tela, cujo mostra quantos meses, dias, horas, minutos e segundos faltam para chegar na hora que a festa vai começar.';
                mediaHtml = '<img src="assets/orcamento/Exemplo Contagem Regressiva2.jpg" class="w-full rounded-xl mb-4 object-cover">';
                break;
            case 'lembrete':
                title = 'Lembrete';
                desc = 'Um aviso para ser enviado poucos dias antes do evento, garantindo que os convidados serão relembrados e estarão preparados para a data especial.';
                mediaHtml = '<div class="w-full aspect-video bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mb-4"><i class="fa-solid fa-bell text-5xl text-gray-300 dark:text-gray-600"></i></div>';
                break;
            case 'savethedate':
                title = 'Save The Date';
                desc = 'O "Save the Date" é um aviso prévio enviado semanas ou dias antes do convite oficial, para que os convidados bloqueiem/reservem a data da festa.<br><br>Uma imagem estática elegante montada exatamente com a mesma paleta de cores e estilo visual do seu convite, perfeita para enviar para sua família nas redes sociais e Whatsapp antes que os convites oficiais estejam prontos.';
                mediaHtml = '<img src="assets/orcamento/Exemplo Save The Date.jpg" class="w-full rounded-xl mb-4 object-cover">';
                break;
            case 'musica':
                title = 'Música do Convite';
                desc = 'Você pode escolher uma música para o seu convite. Nos forneça o Link do Youtube do som ou vídeo em que a música toca, ou envie o arquivo de áudio diretamente para nossa equipe pelo Whatsapp após concluírmos o orçamento.';
                mediaHtml = '<div class="w-full aspect-video bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mb-4"><i class="fa-solid fa-music text-5xl text-gray-300 dark:text-gray-600"></i></div>';
                break;
        }

        contentBox.innerHTML = `
            <div class="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-4 mb-5">
                <h3 class="text-xl font-bold gradient-text">${title}</h3>
                <button type="button" onclick="app.closeModal()" class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors text-gray-500 dark:text-gray-300">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            ${mediaHtml}
            <div class="text-sm md:text-base leading-relaxed text-center" style="color: var(--text-secondary);">
                <p>${desc}</p>
            </div>
            <button type="button" onclick="app.closeModal()" class="mt-6 w-full bg-accent hover:bg-pink-700 text-white font-semibold py-3 rounded-xl shadow-md transition-all">
                Entendi
            </button>
        `;
        
        modal.classList?.remove('opacity-0', 'pointer-events-none');
        modal.classList?.add('opacity-100');
    },

    toggleModelSelection() {
        window.location.href = '../modelos.html';
    },

    // Carrega modelo selecionado do localStorage
    loadSelectedModel() {
        const saved = localStorage.getItem('selectedModel');
        if (saved) {
            try {
                const model = JSON.parse(saved);
                const selectedSection = document.getElementById('selected_model_section');
                const noModelSection = document.getElementById('no_model_section');
                const selectedThumb = document.getElementById('selected_model_thumb');
                const selectedName = document.getElementById('selected_model_name');

                if (selectedSection && noModelSection) {
                    selectedSection.classList.remove('hidden');
                    selectedSection.classList.add('flex');
                    noModelSection.classList.add('hidden');
                }

                if (selectedThumb) {
                    selectedThumb.src = model.capa.startsWith('http') ? model.capa : '/' + model.capa;
                    selectedThumb.alt = model.name;
                }

                if (selectedName) {
                    selectedName.textContent = model.name;
                }

                this.selectedModel = model;
                return true;
            } catch (e) {
                console.error('Error loading selected model:', e);
            }
        }
        return false;
    },

    // Mostra preview do modelo selecionado
    async showModelPreview() {
        if (!this.selectedModel) return;
        const modal = document.getElementById('model_preview_modal');
        const title = document.getElementById('model_preview_title');
        const frame = document.getElementById('model_preview_frame');

        if (title) title.textContent = this.selectedModel.name;
        if (frame) {
            const SUPABASE_CODE = 'https://xchphsltccopelblbsyb.supabase.co/storage/v1/object/public/modelos-code';
            const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjaHBoc2x0Y2NvcGVsYmxic3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMDk0MTAsImV4cCI6MjA1Njc4NTQxMH0.8e2V0H1xRJi_3w_GYWOWn8dWfAEcPqS8mPR3k5U0hMo';
            const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjaHBoc2x0Y2NvcGVsYmxic3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NTI1MjQsImV4cCI6MjA4OTIyODUyNH0.ZOtoygT-PZKcByjh2GEzKGX--6K1UqedvVqTlhCAko0';
            const slug = this.selectedModel.slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\-_]/g, '-');
            const SUPABASE_ASSETS = 'https://xchphsltccopelblbsyb.supabase.co/storage/v1/object/public/modelos';
            try {
                const r = await fetch(SUPABASE_CODE + '/' + slug + '/index.html');
                let html = await r.text();
                html = html.replace(new RegExp(OLD_KEY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), NEW_KEY);
                // Determine asset base based on model source
                const isGit = typeof isGitHubModel === 'function' && isGitHubModel(this.selectedModel.slug);
                // Compute site root dynamically (works with custom domain or github.io)
                const siteRoot = new URL('../', window.location.href).href;
                const MODEL_BASE = isGit
                  ? siteRoot + 'modelos/' + encodeURIComponent(this.selectedModel.slug) + '/'
                  : SUPABASE_ASSETS + '/' + slug + '/';
                const ASSET_BASE = MODEL_BASE + 'assets/';
                // Inject <base> tag so ALL relative URLs resolve correctly in srcdoc
                html = html.replace('<head>', '<head><base href="' + MODEL_BASE + '">');
                // Also do static replacement as belt-and-suspenders
                html = html.replace(/(["'])assets\//g, '$1' + ASSET_BASE);
                html = html.replace(/(url\()assets\//g, '$1' + ASSET_BASE);
                const assetFix = '<script>' +
                  "window.__SUPABASE_ASSETS='" + SUPABASE_ASSETS + '/' + slug + "';" +
                  "window.assetUrl=function(p){return '" + ASSET_BASE + "'+(p||'').replace(/^assets\\//,'')};" +
                  "(function(){" +
                  "var AB='" + ASSET_BASE + "';" +
                  "function fix(v){return v&&typeof v==='string'&&v.indexOf('assets/')===0?AB+v.substring(7):v;}" +
                  // Patch setAttribute
                  "var _sa=Element.prototype.setAttribute;" +
                  "Element.prototype.setAttribute=function(n,v){if(n==='src'||n==='data-src'||n==='poster')v=fix(v);return _sa.call(this,n,v);};" +
                  // Patch .src property setter for img, video, source, audio
                  "function patchSrc(Cls){var d=Object.getOwnPropertyDescriptor(Cls.prototype,'src');if(!d||!d.set)return;var _s=d.set;Object.defineProperty(Cls.prototype,'src',{set:function(v){_s.call(this,fix(v));},get:d.get,configurable:true});}" +
                  "patchSrc(HTMLImageElement);patchSrc(HTMLVideoElement);patchSrc(HTMLSourceElement);patchSrc(HTMLAudioElement);" +
                  // Patch __loadConfig to rewrite config asset paths
                  "var _ld=window.__loadConfig;" +
                  "if(_ld){window.__loadConfig=async function(){" +
                  "await _ld();" +
                  "if(window.config){" +
                  "['assets','imagens','backgrounds'].forEach(function(k){" +
                  "if(window.config[k]&&typeof window.config[k]==='object'){" +
                  "for(var p in window.config[k]){" +
                  "var v=window.config[k][p];" +
                  "if(typeof v==='string')window.config[k][p]=fix(v);" +
                  "else if(Array.isArray(v))window.config[k][p]=v.map(function(x){return typeof x==='string'?fix(x):x;});" +
                  "}}});" +
                  "if(window.config.musica)window.config.musica=fix(window.config.musica);" +
                  "}};}" +
                  "})();" +
                  '<\/script>';
                html = html.replace('</head>', assetFix + '</head>');
                html = html.replace('init();', 'window.__loadConfig?window.__loadConfig().then(init).catch(init):init();');
                frame.srcdoc = html;
            } catch(e) {
                console.error('Preview load error:', e);
                frame.srcdoc = '<p style="padding:2rem;text-align:center;">Erro ao carregar prévia.</p>';
            }
        }
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    },

    // Fecha preview do modelo
    closeModelPreview() {
        const modal = document.getElementById('model_preview_modal');
        const frame = document.getElementById('model_preview_frame');
        if (modal) modal.classList.add('hidden');
        if (frame) frame.srcdoc = '';
        document.body.style.overflow = '';
    },

    // Toggle device no preview do modelo
    togglePreviewDevice(device) {
        const container = document.getElementById('model_preview_container');
        const btnMobile = document.getElementById('preview_btn_mobile');
        const btnDesktop = document.getElementById('preview_btn_desktop');

        if (!container) return;

        if (device === 'mobile') {
            container.style.width = '390px';
            container.style.height = '844px';
            container.style.maxHeight = '85vh';
            if (btnMobile) btnMobile.className = 'px-3 py-1.5 rounded text-sm bg-accent text-white transition-colors';
            if (btnDesktop) btnDesktop.className = 'px-3 py-1.5 rounded text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors';
        } else {
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.maxHeight = '85vh';
            if (btnMobile) btnMobile.className = 'px-3 py-1.5 rounded text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors';
            if (btnDesktop) btnDesktop.className = 'px-3 py-1.5 rounded text-sm bg-accent text-white transition-colors';
        }
    },

    // Trocar modelo - redireciona para página de modelos
    changeModel() {
        window.location.href = '../modelos.html';
    },

    finishQuote() {
        // Valida se selecionou música e campo de música está vazio
        if(this.quoteData.extras.includes('musica')) {
            const musicInput = document.getElementById('music_link')?.value?.trim();
            if(!musicInput) {
                alert('Por favor, informe o nome da música ou link do Youtube.');
                const musicCard = document.getElementById('card_extra_musica');
                if(musicCard) {
                    musicCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }
            this.quoteData.musicCustomText = musicInput;
        }

        this.populateSummary();
        this.goToStep(8);
    },

    populateSummary() {
        // Dados Pessoais
        document.getElementById('summary_name').value = this.quoteData.clientName;
        document.getElementById('summary_whatsapp').value = this.quoteData.clientWhatsapp;

        // Dados do Evento
        const eventSelect = document.getElementById('summary_event_type_select');
        if(eventSelect) eventSelect.value = this.quoteData.eventType;

        document.getElementById('summary_event_name').value = this.quoteData.eventName;
        document.getElementById('summary_event_age').value = this.quoteData.eventAge;
        document.getElementById('summary_event_date').value = this.quoteData.eventDate;
        document.getElementById('summary_event_time').value = this.quoteData.eventTimeStart;
        document.getElementById('summary_event_time_end').value = this.quoteData.eventTimeEnd;
        document.getElementById('summary_event_location').value = this.quoteData.eventLocation;
        document.getElementById('summary_event_theme').value = this.quoteData.eventTheme;
        document.getElementById('summary_event_colors').value = this.quoteData.eventColorPalette;

        // Mostrar/Ocultar custom event type no resumo
        const customRow = document.getElementById('summary_custom_event_type_row');
        if(customRow) {
            if(this.quoteData.eventType === 'outro') {
                customRow.style.display = 'block';
                document.getElementById('summary_custom_event_type').value = this.quoteData.customEventType;
            } else {
                customRow.style.display = 'none';
            }
        }

        // Mostrar/Ocultar idade no resumo
        const ageRow = document.getElementById('summary_age_row');
        if(ageRow) {
            ageRow.style.visibility = (this.quoteData.eventType === 'aniversario') ? 'visible' : 'hidden';
            if(this.quoteData.eventType !== 'aniversario') {
                document.getElementById('summary_event_age').value = '';
            }
        }

        // Funções Selecionadas - Interativas
        const featuresList = document.getElementById('summary_features_list');
        featuresList.innerHTML = '';

        // Dica de Presente
        const giftOptions = { 'none': 'Não quero', 'simples': 'Dica Simples (grátis)', 'premium': 'Dica Premium (+ R$ 10)', 'inteligente': 'Lista Inteligente (+ R$ 25)', 'sua_lista': 'Sua Lista (grátis)' };
        this.addSummaryFeature(featuresList, 'fa-gift', 'Presentes', this.quoteData.giftTipType, giftOptions, 'gift');

        // RSVP
        const rsvpOptions = { 'none': 'Não quero', 'whatsapp': 'RSVP Via WhatsApp (grátis)', 'formulario': 'RSVP Formulário (+ R$ 10)' };
        this.addSummaryFeature(featuresList, 'fa-check-to-slot', 'RSVP (Confirmação)', this.quoteData.rsvpType, rsvpOptions, 'rsvp');

        // Manual
        const manualOptions = { 'none': 'Não quero', 'simples': 'Manual Simples (grátis)', 'premium': 'Manual Premium (+ R$ 10)' };
        this.addSummaryFeature(featuresList, 'fa-book-open', 'Manual', this.quoteData.manualType, manualOptions, 'manual');

        // Extras Toggles
        const extrasContainer = document.createElement('div');
        extrasContainer.className = 'grid grid-cols-2 gap-2 mt-3';
        this.addSummaryExtraToggle(extrasContainer, 'fa-music', 'Música', 0, 'musica', this.quoteData.extras.includes('musica'));
        this.addSummaryExtraToggle(extrasContainer, 'fa-images', 'Galeria', 10, 'galeria', this.quoteData.extras.includes('galeria'));
        this.addSummaryExtraToggle(extrasContainer, 'fa-clock', 'Cronômetro', 0, 'cronometro', this.quoteData.extras.includes('cronometro'));
        this.addSummaryExtraToggle(extrasContainer, 'fa-bell', 'Lembrete', 25, 'lembrete', this.quoteData.extras.includes('lembrete'));
        this.addSummaryExtraToggle(extrasContainer, 'fa-calendar-check', 'Save Date', 25, 'savethedate', this.quoteData.extras.includes('savethedate'));
        featuresList.appendChild(extrasContainer);

        // Detalhes Adicionais (campos de texto)
        const detailsList = document.getElementById('summary_details_list');
        const detailsSection = document.getElementById('summary_details_section');
        detailsList.innerHTML = '';
        let hasDetails = false;

        if(this.quoteData.extras.includes('musica')) {
            this.addSummaryDetail(detailsList, 'Musica Escolhida', this.quoteData.musicCustomText || '', 'music_link');
            hasDetails = true;
        }
        if(this.quoteData.giftTipType !== 'none') {
            this.addSummaryDetail(detailsList, 'Texto Presentes', this.quoteData.giftCustomText || '', 'gift_custom_text');
            if(this.quoteData.giftTipType === 'sua_lista') {
                this.addSummaryDetail(detailsList, 'Link da Lista', this.quoteData.giftLinkUrl || '', 'gift_link_url');
            }
            hasDetails = true;
        }
        if(this.quoteData.rsvpType === 'whatsapp') {
            this.addSummaryDetail(detailsList, 'WhatsApp RSVP (Confirmação)', this.quoteData.rsvpWhatsapp || '', 'rsvp_dest_number');
            hasDetails = true;
        }
        if(this.quoteData.manualType !== 'none') {
            this.addSummaryDetail(detailsList, 'Info do Manual', this.quoteData.manualCustomText || '', 'manual_custom_text');
            hasDetails = true;
        }

        detailsSection.style.display = hasDetails ? 'block' : 'none';

        // Resumo de Preços
        const pricingList = document.getElementById('summary_pricing');
        if(!pricingList) return;
        pricingList.innerHTML = '';
        const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

        const baseKey = Object.keys(this.packageDetails).find(key => this.packageDetails[key].value === this.quoteData.basePackage);
        const basePkg = this.packageDetails[baseKey] || { title: 'Pacote', value: 0 };

        this.addSummaryPrice(pricingList, basePkg.title, basePkg.value);
        
        const giftOptionsPricing = { 'simples': 'Dica Simples', 'premium': 'Dica Premium', 'inteligente': 'Lista Inteligente', 'sua_lista': 'Sua Lista' };
        if(this.quoteData.giftTipExtra > 0) this.addSummaryPrice(pricingList, giftOptionsPricing[this.quoteData.giftTipType], this.quoteData.giftTipExtra);
        
        const rsvpOptionsPricing = { 'whatsapp': 'RSVP Via WhatsApp', 'formulario': 'RSVP Formulário' };
        if(this.quoteData.rsvpExtra > 0) this.addSummaryPrice(pricingList, rsvpOptionsPricing[this.quoteData.rsvpType], this.quoteData.rsvpExtra);
        
        const manualOptionsPricing = { 'simples': 'Manual Simples', 'premium': 'Manual Premium' };
        if(this.quoteData.manualExtra > 0) this.addSummaryPrice(pricingList, manualOptionsPricing[this.quoteData.manualType], this.quoteData.manualExtra);
        
        // Extras individuais
        if(this.quoteData.extras.includes('galeria')) this.addSummaryPrice(pricingList, 'Galeria de Fotos', 10);
        if(this.quoteData.extras.includes('savethedate')) this.addSummaryPrice(pricingList, 'Save the Date', 25);
        if(this.quoteData.extras.includes('lembrete')) this.addSummaryPrice(pricingList, 'Lembrete', 25);

        this.updateTotal();

        // Modelo Atualizado
        const footerThumb = document.getElementById('selected_model_thumb');
        const footerName = document.getElementById('selected_model_name');
        const summaryThumb = document.getElementById('summary_model_thumb');
        const summaryModelDisplay = document.getElementById('summary_model_name_display');
        const packageSelect = document.getElementById('summary_package_select');

        if(packageSelect) packageSelect.value = String(this.quoteData.basePackage);

        if(footerThumb && footerThumb.src && !footerThumb.src.endsWith('/') && summaryThumb) {
            summaryThumb.innerHTML = `<img src="${footerThumb.src}" class="w-full h-full object-cover rounded-lg">`;
            if(summaryModelDisplay) summaryModelDisplay.innerText = footerName?.textContent || 'Modelo Selecionado';
        }
    },

    addSummaryFeature(container, icon, label, currentValue, options, syncField) {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700';
        
        let optionsHtml = '';
        for(let key in options) {
            optionsHtml += `<option value="${key}" ${currentValue === key ? 'selected' : ''}>${options[key]}</option>`;
        }

        div.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center text-accent shrink-0">
                <i class="fa-solid ${icon} text-xs"></i>
            </div>
            <div class="flex-1 relative min-w-0 flex flex-col justify-center">
                <p class="text-[9px] font-bold uppercase tracking-tight mb-0.5 mt-0.5" style="color: var(--text-muted);">${label}</p>
                <div class="relative w-full">
                    <select class="w-full text-[11px] md:text-xs font-bold cursor-pointer truncate bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md py-1.5 pl-2 pr-7 outline-none focus:border-accent focus:ring-1 focus:ring-accent appearance-none" style="color: var(--text-primary);" onchange="app.syncFromSummary('${syncField}', this.value)">
                        ${optionsHtml}
                    </select>
                    <div class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold">
                        <i class="fa-solid fa-chevron-down text-[10px]"></i>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(div);
    },

    addSummaryExtraToggle(container, icon, label, price, value, isChecked) {
        const div = document.createElement('div');
        div.className = `flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer select-none ${isChecked ? 'bg-pink-50 dark:bg-pink-900/20 border-accent/30' : 'bg-white dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'}`;
        div.onclick = () => {
            app.syncFromSummary('extra', value, !isChecked);
        };
        
        const priceText = price === 0 ? 'Grátis' : `+ R$ ${price}`;
        
        div.innerHTML = `
            <div class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'bg-accent text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}">
                <i class="fa-solid ${icon} text-[10px]"></i>
            </div>
            <div class="flex flex-col flex-1 min-w-0">
                <span class="text-[10px] font-bold truncate ${isChecked ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}">${label}</span>
                <span class="text-[9px] font-bold text-accent">${priceText}</span>
            </div>
        `;
        container.appendChild(div);
    },

    syncFromSummary(field, value, checked = false) {
        if(field === 'event_type') {
            const radio = document.querySelector(`input[name="event_type"][value="${value}"]`);
            if(radio) { radio.checked = true; }
            this.quoteData.eventType = value;
            this.toggleAgeField();
            if(this.syncInputsToData) this.syncInputsToData();
        } else if(field === 'package') {
            const radio = document.querySelector(`input[name="base_value"][value="${value}"]`);
            if(radio) { radio.checked = true; }
            this.quoteData.basePackage = parseInt(value);
        } else if(field === 'gift') {
            if(value === 'none') {
                this.noGiftTip();
                this.quoteData.giftCustomText = '';
                this.quoteData.giftLinkUrl = '';
            } else {
                this.selectGiftTip(value);
            }
        } else if(field === 'rsvp') {
            if(value === 'none') {
                this.noRSVP();
                this.quoteData.rsvpWhatsapp = '';
            } else {
                this.selectRSVP(value);
            }
        } else if(field === 'manual') {
            if(value === 'none') {
                this.noManual();
                this.quoteData.manualCustomText = '';
            } else {
                this.selectManual(value);
            }
        } else if(field === 'extra') {
            const cb = document.querySelector(`input[name="extras"][value="${value}"]`);
            if(cb && cb.checked !== checked) {
                this.toggleExtra(value);
            }
            if(checked && !this.quoteData.extras.includes(value)) {
                this.quoteData.extras.push(value);
            } else if(!checked) {
                this.quoteData.extras = this.quoteData.extras.filter(e => e !== value);
                if(value === 'musica') { this.quoteData.musicCustomText = ''; }
            }
        }

        // Recalcular e repopular para atualizar os cards e o preço total
        this.updateTotal();
        this.populateSummary();
    },

    addSummaryDetail(container, label, value, originalId) {
        const div = document.createElement('div');
        const escapedValue = String(value).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        div.innerHTML = `
            <label class="text-[10px] font-semibold uppercase mb-1 block" style="color: var(--text-muted);">${label}</label>
            <textarea class="w-full form-input text-sm p-2 rounded-lg resize-none overflow-hidden leading-snug" 
                      rows="1"
                      style="border-color: var(--border-color); box-sizing: border-box;" 
                      oninput="document.getElementById('${originalId}').value = this.value; this.style.height = 'auto'; this.style.height = (this.scrollHeight + 2) + 'px'; if(app.syncInputsToData) app.syncInputsToData();">${escapedValue}</textarea>
        `;
        container.appendChild(div);
        
        // Auto-resize on initial load with timeout to account for CSS transition (300ms)
        setTimeout(() => {
            const textarea = div.querySelector('textarea');
            if(textarea) {
                textarea.style.height = 'auto';
                textarea.style.height = (textarea.scrollHeight + 2) + 'px';
            }
        }, 350);
    },

    addSummaryPrice(container, label, price) {
        const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center';
        div.innerHTML = `
            <span style="color: var(--text-secondary);">${label}</span>
            <span class="font-bold" style="color: var(--text-primary);">${formatter.format(price)}</span>
        `;
        container.appendChild(div);
    },

    confirmOrder() {
        // Verifica se um modelo foi selecionado
        if (!this.selectedModel && !localStorage.getItem('selectedModel')) {
            this.showNoModelWarning();
            return;
        }

        // Mostra modal de sinal antes de enviar para WhatsApp
        const modal = document.getElementById('confirm_order_modal');
        const box = document.getElementById('confirm_order_box');
        if(modal) {
            modal.classList.remove('opacity-0', 'pointer-events-none');
            modal.classList.add('opacity-100');
        }
        if(box) {
            box.classList.remove('scale-95');
            box.classList.add('scale-100');
        }
    },

    showNoModelWarning() {
        const modal = document.getElementById('no_model_warning_modal');
        const box = document.getElementById('no_model_warning_box');
        if(modal) {
            modal.classList.remove('opacity-0', 'pointer-events-none');
            modal.classList.add('opacity-100');
        }
        if(box) {
            box.classList.remove('scale-95');
            box.classList.add('scale-100');
        }
    },

    closeNoModelWarning() {
        const modal = document.getElementById('no_model_warning_modal');
        const box = document.getElementById('no_model_warning_box');
        if(modal) {
            modal.classList.add('opacity-0', 'pointer-events-none');
            modal.classList.remove('opacity-100');
        }
        if(box) {
            box.classList.add('scale-95');
            box.classList.remove('scale-100');
        }
    },

    closeConfirmModal() {
        const modal = document.getElementById('confirm_order_modal');
        const box = document.getElementById('confirm_order_box');
        if(modal) {
            modal.classList.add('opacity-0', 'pointer-events-none');
            modal.classList.remove('opacity-100');
        }
        if(box) {
            box.classList.add('scale-95');
            box.classList.remove('scale-100');
        }
    },

    // Continua o envio para WhatsApp (chamado pelo botão Pagamento se quiser ir direto)
    sendToWhatsApp() {
        // Sincronizar campos do resumo de volta para o quoteData antes de enviar
        this.quoteData.clientName = document.getElementById('summary_name').value;
        this.quoteData.clientWhatsapp = document.getElementById('summary_whatsapp').value;
        this.quoteData.eventName = document.getElementById('summary_event_name').value;
        this.quoteData.eventAge = document.getElementById('summary_event_age').value;
        this.quoteData.eventDate = document.getElementById('summary_event_date').value;
        this.quoteData.eventTimeStart = document.getElementById('summary_event_time').value;
        this.quoteData.eventLocation = document.getElementById('summary_event_location').value;
        this.quoteData.eventTheme = document.getElementById('summary_event_theme').value;
        this.quoteData.eventColorPalette = document.getElementById('summary_event_colors').value;

        const eventTypeMap = {
            'aniversario': 'Aniversário',
            'casamento': 'Casamento',
            'formatura': 'Formatura',
            'outro': 'Outro'
        };

        const message = `Olá! Gostaria de confirmar meu pedido de Convite:\n\n` +
            `*DADOS PESSOAIS*\n` +
            `- Nome: ${this.quoteData.clientName}\n` +
            `- WhatsApp: ${this.quoteData.clientWhatsapp}\n\n` +
            `*MODELO ESCOLHIDO*\n` +
            `- ${document.getElementById('summary_model_name').innerText}\n\n` +
            `*DETALHES DO EVENTO*\n` +
            `- Tipo: ${this.quoteData.eventType === 'outro' ? this.quoteData.customEventType : eventTypeMap[this.quoteData.eventType]}\n` +
            `- Nome: ${this.quoteData.eventName}\n` +
            (this.quoteData.eventType === 'aniversario' ? `- Idade: ${this.quoteData.eventAge}\n` : '') +
            `- Data: ${this.quoteData.eventDate}\n` +
            `- Horário: ${this.quoteData.eventTimeStart}${this.quoteData.eventTimeEnd ? ' às ' + this.quoteData.eventTimeEnd : ''}\n` +
            `- Local: ${this.quoteData.eventLocation}\n` +
            `- Tema: ${this.quoteData.eventTheme}\n` +
            `- Paleta de Cores: ${this.quoteData.eventColorPalette}\n\n` +
            `*FUNÇÕES SELECIONADAS*\n` +
            `${this.getSelectedFeaturesText()}` +
            `\n*VALOR TOTAL: ${document.getElementById('summary_total').innerText}*`;
        
        const url = `https://wa.me/5582987114660?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    },

    getSelectedFeaturesText() {
        let text = '';
        const giftMap = { 'simples': 'Dica Simples', 'premium': 'Dica Premium', 'inteligente': 'Lista Inteligente', 'sua_lista': 'Sua Lista' };
        const rsvpMap = { 'whatsapp': 'RSVP Via WhatsApp', 'formulario': 'RSVP Formulário' };
        const manualMap = { 'simples': 'Manual Simples', 'premium': 'Manual Premium' };

        text += `- Pacote: ${this.packageDetails[Object.keys(this.packageDetails).find(key => this.packageDetails[key].value === this.quoteData.basePackage)].title}\n`;
        
        if(this.quoteData.giftTipType !== 'none') {
            text += `- Presentes: ${giftMap[this.quoteData.giftTipType]}`;
            if(this.quoteData.giftCustomText) text += ` (${this.quoteData.giftCustomText})`;
            if(this.quoteData.giftLinkUrl) text += ` (${this.quoteData.giftLinkUrl})`;
            text += `\n`;
        }

        if(this.quoteData.rsvpType !== 'none') {
            text += `- Confirmação: ${rsvpMap[this.quoteData.rsvpType]}`;
            if(this.quoteData.rsvpWhatsapp) text += ` (${this.quoteData.rsvpWhatsapp})`;
            text += `\n`;
        }

        if(this.quoteData.manualType !== 'none') {
            text += `- Manual: ${manualMap[this.quoteData.manualType]}`;
            if(this.quoteData.manualCustomText) text += ` (${this.quoteData.manualCustomText})`;
            text += `\n`;
        }

        if(this.quoteData.extras.length > 0) {
            text += `- Extras: ${this.quoteData.extras.join(', ')}`;
            if(this.quoteData.extras.includes('musica') && this.quoteData.musicCustomText) {
                text += ` (Musica: ${this.quoteData.musicCustomText})`;
            }
            text += `\n`;
        }

        return text;
    },

    previewMedia(src, type) {
        const modal = document.getElementById('media_preview_modal');
        const container = document.getElementById('media_preview_container');
        if(!modal || !container) return;

        let content = '';
        if(type === 'image') {
            content = `<img src="${src}" class="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl">`;
        } else if(type === 'video') {
            content = `<video src="${src}" class="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" autoplay loop muted playsinline controls></video>`;
        }

        container.innerHTML = content;
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.classList.add('opacity-100');
    },

    closeMediaPreview() {
        const modal = document.getElementById('media_preview_modal');
        const container = document.getElementById('media_preview_container');
        if(!modal) return;
        
        modal.classList.remove('opacity-100');
        modal.classList.add('opacity-0', 'pointer-events-none');
        
        // Limpar o src para parar vídeos
        setTimeout(() => {
            if(container) container.innerHTML = '';
        }, 300);
    }
};

// Start Initialize
document.addEventListener('DOMContentLoaded', () => {
    app.init();

    // Safari Autoplay fix: play videos on first user interaction
    const playAllVideos = () => {
        document.querySelectorAll('video').forEach(vid => {
            if (vid.paused) {
                vid.play().catch(e => console.log("Video play prevented:", e));
            }
        });
        document.removeEventListener('click', playAllVideos);
        document.removeEventListener('touchstart', playAllVideos);
    };
    document.addEventListener('click', playAllVideos);
    document.addEventListener('touchstart', playAllVideos);
});
