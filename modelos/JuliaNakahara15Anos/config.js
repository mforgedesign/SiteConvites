window.config = {
  // =========================
  // INFORMAÇÕES DO EVENTO
  // =========================
  "evento": {
    "tipo": "Aniversário",
    // Tipo do evento: Casamento, Aniversário, Debutante, Chá de Bebê, Formatura, etc.

    "nome": "Modelo Portão Jardim Encantado",
    // Nome principal do evento. Exemplo: nome do aniversariante ou nome do casal.

    "idade": "15",
    // Idade celebrada (Se aniversário/debutante)

    "data": "2026-07-25",
    // Data do evento (ex: 2026-08-15)

    "hora": "19:30",
    // Hora de início do evento

    "endereco": ""
    // Endereço completo do local do evento
  },

  // =========================
  // CONFIGURAÇÕES DO CONVITE
  // =========================
  "convite": {
    "paletaCores": "Rosa, Pink, Branco, Dourado, Pérola, Rosé",
    // Paleta de cores usada no design do convite

    "tema": "Portão Jardim Encantado",
    // Tema visual do convite (ex: princesa, floral, minimalista, elegante)

    "musica": "assets/musica.mp3",
    // Música de fundo principal do convite

    "tipoAbertura": "longa",
    // Tipo de animação de abertura do convite: curta | longa | nenhuma

    "particulasAbertura": true,
    // Habilita a animação contínua de brilhos e lantejoulas caindo suavemente sobre os slides de abertura (Efeito CapCut)

    "slug": "JuliaNakahara15Anos",
    // Identificador único que será usado na URL final do convite (gerado automaticamente pelo squad)

    "seo": {
      "pageTitle": "Convite: Aniversário",
      // Título da página (gerado automaticamente com Nome + Tipo de Evento)

      "ogTitle": "Você está convidado!",
      // Título usado ao compartilhar o convite nas redes sociais

      "ogDescription": "Embarque nessa noite mágica. Clique para ver os detalhes."
      // Descrição usada ao compartilhar o convite nas redes sociais
    }
  },

  // =========================
  // ARQUIVOS / ASSETS DO CONVITE (Caminhos)
  // =========================
  "assets": {
    "capa": "assets/capa.jpg",
    // Arquivo da capa principal do convite

    "aberturaSlides": [
      "assets/slide1.mp4"
    ],
    // Lista de vídeos ou slides que compõem a abertura animada

    "folhaPreenchida": "assets/folha_preenchida.mp4",
    // Arte da folha com o conteúdo do evento preenchido

    "musica": "assets/musica.mp3"
    // Arquivo de música usado no convite
  },

  // =========================
  // FUNÇÕES INTERATIVAS (NOVOS BOTÕES)
  // =========================
  // Novo sistema de botões: permite criar botões infinitos.
  // tipoAcao: "Link" , "PopupImagem" ou "PopupHtml"
  // tipoVisual: "css" (usa icone fontawesome e borda) ou "imagem" (usa urlImagem livre)
  "botoes": [
    {
      "tipoAcao": "Link",
      "tipoVisual": "css",
      "titulo": "Como Chegar",
      "icone": "fa-solid fa-location-dot",
      "conteudo": "https://maps.app.goo.gl/apshuicUt4GEB1UW7"
    },
    {
      "tipoAcao": "PopupHtml",
      "tipoVisual": "css",
      "titulo": "Dicas de\nPresente",
      "icone": "fa-solid fa-gift",
      "conteudo": "<div class=\"text-left\"><div class=\"grid grid-cols-2 gap-3 mb-6\"><div class=\"bg-white/5 p-3 rounded-xl border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-all hover:scale-105\"><i class=\"fa-regular fa-gem text-white text-xl drop-shadow-md\"></i><span class=\"text-[10px] sm:text-xs leading-tight font-medium\">Jóias Prata,<br>Nike</span></div><div class=\"bg-white/5 p-3 rounded-xl border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-all hover:scale-105\"><i class=\"fa-solid fa-glasses text-white text-xl drop-shadow-md\"></i><span class=\"text-[10px] sm:text-xs leading-tight font-medium\">Óculos de Sol,<br>Itens de Praia</span></div><div class=\"bg-white/5 p-3 rounded-xl border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-all hover:scale-105\"><i class=\"fa-solid fa-shirt text-white text-xl drop-shadow-md\"></i><span class=\"text-[10px] sm:text-xs leading-tight font-medium\">Roupas P/PP<br>(32, 34, 36)</span></div><div class=\"bg-white/5 p-3 rounded-xl border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-all hover:scale-105\"><i class=\"fa-solid fa-shoe-prints text-white text-xl drop-shadow-md\"></i><span class=\"text-[10px] sm:text-xs leading-tight font-medium\">Itens da Farm,<br>Sapato 35</span></div><div class=\"bg-white/5 p-3 rounded-xl border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-all hover:scale-105\"><i class=\"fa-solid fa-spray-can-sparkles text-white text-xl drop-shadow-md\"></i><span class=\"text-[10px] sm:text-xs leading-tight font-medium\">Perfume,<br>Body Splash</span></div><div class=\"bg-white/5 p-3 rounded-xl border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-all hover:scale-105\"><i class=\"fa-solid fa-spa text-white text-xl drop-shadow-md\"></i><span class=\"text-[10px] sm:text-xs leading-tight font-medium\">O Boticário,<br>Cabelos Cachos</span></div><div class=\"bg-white/5 p-3 rounded-xl border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-all hover:scale-105\"><i class=\"fa-solid fa-futbol text-white text-xl drop-shadow-md\"></i><span class=\"text-[10px] sm:text-xs leading-tight font-medium\">Itens do<br>Flamengo</span></div><div class=\"bg-white/5 p-3 rounded-xl border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-all hover:scale-105\"><i class=\"fa-solid fa-dumbbell text-white text-xl drop-shadow-md\"></i><span class=\"text-[10px] sm:text-xs leading-tight font-medium\">Academia /<br>Muay Thai</span></div></div><div class=\"bg-black/40 p-4 rounded-xl border border-white/20 mb-4 text-center relative overflow-hidden\"><div class=\"absolute inset-0 bg-white/5 animate-pulse\"></div><p class=\"text-[10px] text-stone-300 mb-1 uppercase tracking-widest relative z-10\">Chave PIX (Telefone)</p><p class=\"font-bold text-xl text-white select-all tracking-wider relative z-10\">11988509403</p></div><button onclick=\"navigator.clipboard.writeText('11988509403'); alert('Chave Pix copiada!');\" class=\"w-full bg-gradient-to-r from-[var(--button-color)] to-blue-800 hover:brightness-110 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(12,43,113,0.4)] flex items-center justify-center gap-2 uppercase text-xs tracking-widest relative overflow-hidden group\"><span class=\"relative z-10 flex items-center gap-2\">Copiar Chave Pix <i class=\"fa-regular fa-copy group-hover:scale-110 transition-transform\"></i></span><div class=\"absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300\"></div></button></div>"
    },
    {
      "tipoAcao": "PopupHtml",
      "tipoVisual": "css",
      "titulo": "Manual do\nConvidado",
      "icone": "fa-solid fa-book-open",
      "conteudo": "<div class=\"space-y-3\"><div class=\"flex gap-4 items-center bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-colors group\"><div class=\"w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:bg-white/20 transition-colors\"><i class=\"fa-regular fa-clock text-white text-xl\"></i></div><div><h3 class=\"font-bold text-white text-sm mb-0.5 tracking-wide\">A Pontualidade é um Carinho</h3><p class=\"text-xs text-stone-300 leading-relaxed\">Chegue no horário combinado para não perder nenhum detalhe da nossa mágica história.</p></div></div><div class=\"flex gap-4 items-center bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-colors group\"><div class=\"w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:bg-white/20 transition-colors\"><i class=\"fa-regular fa-calendar-check text-white text-xl\"></i></div><div><h3 class=\"font-bold text-white text-sm mb-0.5 tracking-wide\">Confirmação de Presença</h3><p class=\"text-xs text-stone-300 leading-relaxed\">Confirme sua vinda até 15 dias antes, para que possamos preparar tudo com muito amor.</p></div></div><div class=\"flex gap-4 items-center bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-colors group\"><div class=\"w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:bg-white/20 transition-colors\"><i class=\"fa-solid fa-heart text-white text-xl animate-pulse\"></i></div><div><h3 class=\"font-bold text-white text-sm mb-0.5 tracking-wide\">Celebre Conosco</h3><p class=\"text-xs text-stone-300 leading-relaxed\">Deixe a alegria guiar a sua noite! Estamos ansiosos para criar memórias inesquecíveis.</p></div></div><div class=\"flex gap-4 items-center bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-colors group\"><div class=\"w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:bg-white/20 transition-colors\"><i class=\"fa-solid fa-cake-candles text-white text-xl\"></i></div><div><h3 class=\"font-bold text-white text-sm mb-0.5 tracking-wide\">Um Doce Encontro</h3><p class=\"text-xs text-stone-300 leading-relaxed\">Não se despeça sem nos presentear com um abraço e saborear uma fatia do nosso bolo.</p></div></div></div>"
    },
    {
      "tipoAcao": "RSVP",
      "tipoVisual": "css",
      "titulo": "Confirmar\nPresença",
      "icone": "fa-solid fa-check",
      "whatsapp": "5511988509403",
      "rsvpConfig": {
        "exibirNome": true,
        "exibirWhatsapp": false,
        "exibirAcompanhantes": false
      }
    }
  ],

  // =========================
  // RECURSOS EXTRAS (UPSELL)
  // =
  // RECURSOS EXTRAS (UPSELL)
  // =========================
  "upsell": {
    "galeriaFotos": false,
    // Habilita uma galeria de fotos dentro do convite

    "saveTheDate": false,
    // Sinaliza que orçamento inclui "Save The Date"

    "lembrete": true
    // Sinaliza que orçamento inclui lembrete (Cronômetro)
  },

  // =========================
  // CONFIGURAÇÕES VISUAIS DO SISTEMA
  // =========================
  "config": {
    "exibirMarcaDagua": false,
    // Exibe a marca d'água de "Pagamento Pendente" cobrindo o convite

    "buttonColor": "#b7747b",
    // Cor principal dos botões

    "buttonSize": 1.0,
    // Escala de tamanho dos botões

    "isButtonFilled": true,
    // Define se os botões são sólidos ou apenas contornados

    "shadowStyle": "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",

    // ==========================================
    // BRILHOS (OVERLAYS SVG)
    // ==========================================
    "brilhos": {
      "esquerdo": true, // Habilita o brilho no canto superior esquerdo (GIF Animado)
      "direito": true,  // Habilita o brilho no canto inferior direito (GIF Animado)
      "centro": true    // Habilita o brilho centralizado (GIF Animado)
    }
  }
};