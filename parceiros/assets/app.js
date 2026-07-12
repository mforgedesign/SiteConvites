"use strict";

const partnerPhone = "5511939047235";

const segments = {
  decoradores: {
    label: "Para decoradores",
    headline: "Seu projeto visual continua antes e depois da decoração.",
    accent: "Convites que respeitam a identidade do evento.",
    description: "Você indica a MForge, nós atendemos o cliente e transformamos o conceito da decoração em uma experiência digital coerente. Cada venda indicada faz o parceiro avançar nos níveis e desbloquear novos materiais de divulgação.",
    benefit: "Entregue coerência visual desde o primeiro contato do convidado e valorize sua assinatura criativa.",
    bundle: "Inclua o convite como extensão da identidade visual do projeto e apresente tudo em uma única proposta.",
    rewards: "A parceria começa com Instagram e Google otimizados, entrega uma arte por venda, vídeos a cada cinco vendas e um site ao alcançar dez.",
    preferred: ["modelo-SarahEvelen15Anos","modelo-Larissa15Anos","modelo-Casamento-Isaias-e-Sonia","modelo-Anthony-Caleb-1Ano","modelo-JulianaBusson35Anos","VanGogh-Júlia-15Anos"]
  },
  saloes: {
    label: "Para salões de festa",
    headline: "Um diferencial digital para tornar seu pacote mais completo.",
    accent: "Mais valor percebido sem aumentar sua operação.",
    description: "Ofereça convite interativo junto da locação. A MForge assume briefing, criação, ajustes e suporte, enquanto cada venda indicada faz o salão avançar nos níveis de presença digital.",
    benefit: "Ajude o cliente a resolver mais uma etapa da festa no mesmo lugar e fortaleça a percepção de pacote completo.",
    bundle: "Apresente o convite como item incluído ou adicional do pacote, com atendimento e produção feitos pela MForge.",
    rewards: "Comece com Instagram e Google renovados, receba uma arte por venda, vídeos a cada cinco e um site quando alcançar dez vendas indicadas.",
    preferred: ["modelo-Alessandra50Anos","modelo-15Anos-Alicia","modelo-casamento-azul-branco","modelo-Emanuelle-1Ano","modelo-Enf-BrunaEduarda-Formatura","Modelo-BaileMascaras-Vermelho"]
  },
  buffets: {
    label: "Para buffets",
    headline: "Do primeiro convite ao último detalhe da festa.",
    accent: "Uma experiência mais completa para o seu cliente.",
    description: "Inclua convites interativos nos seus pacotes e deixe a parte digital com a MForge. O cliente organiza presença, mapa, presentes e informações enquanto o buffet ganha um argumento de venda adicional.",
    benefit: "Seu pacote fica mais fácil de comparar e mais difícil de substituir por uma oferta apenas de alimentação.",
    bundle: "Use o convite como bônus de fechamento, adicional do pacote ou item já incorporado ao valor apresentado ao cliente.",
    rewards: "A parceria ativa melhora Instagram e Google desde o início; depois libera artes, vídeos recorrentes e o site conforme as vendas indicadas avançam.",
    preferred: ["modelo-Anthony-Caleb-1Ano","modelo-Emanuelle-1Ano","modelo-alicenopaisdasmaravilhas","Lucca-Astronauta","modelo-Teca-Anos60","modelo-coraline"]
  },
  cerimonialistas: {
    label: "Para cerimonialistas e assessores",
    headline: "Centralize a experiência digital sem aumentar sua equipe.",
    accent: "Convites, confirmações e informações sob controle.",
    description: "Você mantém a estratégia e o relacionamento. A MForge executa o convite, organiza as funções digitais e atende cada produção. As vendas indicadas fazem a assessoria avançar nos níveis do programa.",
    benefit: "Reduza fornecedores soltos, ganhe previsibilidade e entregue uma experiência digital coerente aos clientes.",
    bundle: "Inclua o convite no pacote de assessoria ou apenas apresente a solução; em ambos os casos, nós assumimos a produção.",
    rewards: "A ativação inclui Instagram e Google; cada venda gera uma arte, cada cinco geram vídeo e a décima libera um site profissional.",
    preferred: ["modelo-Yasmin-e-Claudio","Modelo-casamento-branco-dourado","modelo-Sarah-Vieira-15Anos","modelo-debutante-verde-esmeralda","modelo-formatura","modelo-AniversarioGabriella-15Anos"]
  }
};

function whatsappUrl(segment) {
  const label = segments[segment]?.label || "Programa de Parceiros";
  const text = `Olá! Quero conhecer o Programa MForge Parceiros. Meu segmento é: ${label.replace("Para ", "")}.`;
  return `https://wa.me/${partnerPhone}?text=${encodeURIComponent(text)}`;
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element && value) element.textContent = value;
}

function wireCtas(segment) {
  document.querySelectorAll("[data-partner-cta]").forEach(link => {
    link.href = whatsappUrl(segment);
    link.addEventListener("click", () => {
      globalThis.MForgeMeta?.track?.("Lead", {
        content_name: "Programa MForge Parceiros",
        content_category: segment || "parceiros"
      });
    });
  });
}

function encodePath(value) {
  return String(value || "").split("/").map(encodeURIComponent).join("/");
}

function modelCard(model) {
  const slug = encodePath(model.slug);
  const cover = encodePath(model.capa_path || "assets/capa.jpg");
  const title = model.tema || model.name || "Convite interativo";
  const detail = [model.tipo, model.paleta_cores].filter(Boolean).join(" · ") || "Modelo personalizável";
  return `<article class="model-card">
    <div class="model-image"><img src="../modelos/${slug}/${cover}" alt="Prévia do modelo ${title}" loading="lazy"></div>
    <div class="model-body">
      <small>${model.tipo || "Convite"}</small>
      <h3>${title}</h3>
      <p>${detail}</p>
      <a href="../modelos/${slug}/" target="_blank" rel="noopener">Abrir modelo completo →</a>
    </div>
  </article>`;
}

async function loadModels(segment) {
  const grid = document.querySelector("#model-grid");
  if (!grid || !segments[segment]) return;
  try {
    const response = await fetch("../modelos.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const models = await response.json();
    const bySlug = new Map(models.map(model => [model.slug, model]));
    const selected = segments[segment].preferred.map(slug => bySlug.get(slug)).filter(Boolean);
    const fallback = models.filter(model => !selected.includes(model)).slice(0, 6 - selected.length);
    grid.innerHTML = [...selected, ...fallback].slice(0, 6).map(modelCard).join("");
  } catch {
    grid.innerHTML = `<p class="models-status">A galeria completa está disponível em <a href="../modelos.html">pedidos.mforge.com.br/modelos.html</a>.</p>`;
  }
}

function initializeSegmentPage(segment) {
  const config = segments[segment];
  if (!config) return;
  setText("[data-segment-label]", config.label);
  setText("[data-segment-headline]", config.headline);
  setText("[data-segment-accent]", config.accent);
  setText("[data-segment-description]", config.description);
  setText("[data-segment-benefit]", config.benefit);
  setText("[data-segment-bundle]", config.bundle);
  setText("[data-segment-rewards]", config.rewards);
  wireCtas(segment);
  loadModels(segment);
}

function renderSegmentShell() {
  document.body.innerHTML = `
    <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <header class="site-header"><nav class="nav wrap" aria-label="Navegação principal">
      <a class="brand" href="./"><span class="brand-mark">M</span><span class="brand-copy"><strong>MForge</strong><small>PROGRAMA DE PARCEIROS</small></span></a>
      <div class="nav-links"><a href="#modelos">Modelos</a><a href="#como-funciona">Como funciona</a><a class="button button-primary button-small" data-partner-cta target="_blank" rel="noopener">Quero ser parceiro</a></div>
    </nav></header>
    <main id="conteudo">
      <section class="hero"><div class="wrap hero-grid">
        <div><p class="eyebrow" data-segment-label>PROGRAMA DE PARCEIROS</p><h1 data-segment-headline>Uma parceria feita para o seu segmento.</h1><h1><em data-segment-accent>Mais valor sem aumentar a operação.</em></h1><p class="hero-copy" data-segment-description>A MForge cuida da produção e cada venda indicada faz o parceiro avançar nos níveis do programa.</p><div class="hero-actions"><a class="button button-primary" data-partner-cta target="_blank" rel="noopener">Quero conhecer o programa</a><a class="button button-secondary" href="#modelos">Ver modelos de convite</a></div><div class="trust-row"><span>Sem comissão em dinheiro</span><span>Atendimento pela MForge</span><span>Benefícios cumulativos</span></div></div>
        <aside class="hero-card"><span class="mini-label">O QUE MUDA PARA VOCÊ</span><h2 data-segment-benefit>Uma oferta mais completa para seu cliente.</h2><p>Você gera a oportunidade e escolhe como apresentá-la. A MForge assume briefing, criação, ajustes e suporte.</p><div class="credit-preview"><div class="credit-line"><span>Parceria ativada</span><strong>Instagram + Google</strong></div><div class="credit-line"><span>Cada venda indicada</span><strong>1 arte</strong></div><div class="credit-line"><span>Marcos de 5 e 10</span><strong>vídeo + site</strong></div></div></aside>
      </div></section>

      <section class="section section-soft"><div class="wrap"><header class="section-head"><p class="eyebrow">DOIS JEITOS DE OFERECER</p><h2>Adapte a parceria <em>ao seu processo comercial.</em></h2></header><div class="grid grid-2">
        <article class="card partnership-card"><span class="step">1</span><div><h3>Indicação assistida</h3><p>Apresente a solução e conecte o cliente. A MForge continua a conversa, fecha e entrega.</p><ul><li>Cliente contrata diretamente.</li><li>Você não precisa explicar detalhes técnicos.</li><li>Venda quitada conta para o próximo nível.</li></ul></div></article>
        <article class="card partnership-card"><span class="step">2</span><div><h3>Convite dentro do pacote</h3><p data-segment-bundle>Inclua o convite na sua proposta e deixe toda a execução conosco.</p><ul><li>Você controla a apresentação da oferta.</li><li>Podemos atender o cliente em seu nome ou em conjunto.</li><li>Pedido quitado também conta para os níveis.</li></ul></div></article>
      </div></div></section>

      <section class="section"><div class="wrap"><header class="section-head"><p class="eyebrow">VALOR PARA O PARCEIRO</p><h2>Cada marco fortalece <em>sua presença digital.</em></h2><p data-segment-rewards>A ativação organiza Instagram e Google; as vendas liberam artes, vídeos e o site.</p></header><div class="grid grid-4"><article class="card"><span class="card-icon">✦</span><h3>Ativação</h3><p>Repaginação do Instagram e Perfil da Empresa no Google otimizado.</p></article><article class="card"><span class="card-icon">◇</span><h3>Toda venda</h3><p>Uma arte de divulgação para cada cliente indicado que concluir o convite.</p></article><article class="card"><span class="card-icon">▶</span><h3>A cada 5</h3><p>Um novo vídeo de divulgação a cada bloco de cinco vendas indicadas.</p></article><article class="card"><span class="card-icon">↗</span><h3>Ao chegar a 10</h3><p>Site profissional, com domínio anual pago pelo parceiro.</p></article></div></div></section>

      <section class="section section-soft" id="modelos"><div class="wrap"><header class="section-head"><p class="eyebrow">CATÁLOGO REAL</p><h2>Modelos para apresentar <em>agora mesmo.</em></h2><p>Os exemplos abaixo vêm do catálogo publicado e podem ser personalizados para cada evento.</p></header><div class="model-grid" id="model-grid"><p class="models-status">Carregando modelos...</p></div></div></section>

      <section class="section" id="como-funciona"><div class="wrap"><header class="section-head"><p class="eyebrow">OPERAÇÃO SIMPLES</p><h2>Você apresenta. <em>A MForge executa.</em></h2></header><div class="grid grid-4 process"><article class="card"><h3>Parceria ativada</h3><p>Criamos sua identificação e iniciamos a renovação de Instagram e Google.</p></article><article class="card"><h3>Cliente sinalizado</h3><p>O contato chega com seu código ou é enviado diretamente por você.</p></article><article class="card"><h3>Produção completa</h3><p>Briefing, criação, ajustes, entrega e suporte do convite ficam conosco.</p></article><article class="card"><h3>Nível atualizado</h3><p>Após a quitação, a venda entra no histórico e libera o benefício correspondente.</p></article></div></div></section>

      <section class="section section-soft"><div class="wrap"><header class="section-head"><p class="eyebrow">DÚVIDAS FREQUENTES</p><h2>Regras claras <em>desde o início.</em></h2></header><div class="faq"><details><summary>Quando uma indicação conta para o nível?</summary><p>Depois que o convite indicado estiver integralmente pago. Orçamentos, sinais cancelados, reembolsos ou contatos sem identificação do parceiro não entram na contagem.</p></details><details><summary>Os benefícios são cumulativos?</summary><p>Sim. A arte continua em toda venda; o vídeo é liberado em cada múltiplo de cinco; o site é desbloqueado quando o parceiro atinge dez vendas.</p></details><details><summary>Como funciona a manutenção do site?</summary><p>A manutenção mensal gratuita continua enquanto a parceria permanecer ativa e gerando indicações. Se o fluxo parar, o site continua pertencendo ao parceiro, mas a manutenção inclusa é suspensa. Domínio e serviços de terceiros são pagos pelo parceiro.</p></details><details><summary>Tráfego pago está incluído?</summary><p>Não. Gestão e investimento de mídia são oferecidos separadamente depois que a parceria já tiver histórico e dados suficientes para uma proposta responsável.</p></details><details><summary>O site acompanha visitas?</summary><p>O site pode usar mensuração e banco de dados para gerar análises e oportunidades de melhoria, sempre com aviso de privacidade, consentimento quando aplicável e uso responsável dos dados.</p></details><details><summary>Quem atende o cliente?</summary><p>A MForge pode assumir todo o atendimento ou trabalhar em conjunto, conforme o modelo definido no cadastro do parceiro.</p></details></div></div></section>

      <section class="section"><div class="wrap"><div class="cta-panel"><p class="eyebrow">COMECE COM UMA CONVERSA</p><h2>Vamos montar a parceria que faz sentido para o seu negócio.</h2><p>Conte como você vende seus pacotes e qual material digital faria mais diferença hoje.</p><a class="button button-primary" data-partner-cta target="_blank" rel="noopener">Falar com a MForge</a></div></div></section>
    </main>
    <footer class="site-footer"><div class="wrap footer-row"><span>© 2026 MForge · Programa de Parceiros</span><a href="./">Ver todos os segmentos</a></div></footer>`;
}

const segment = document.body.dataset.segment;
if (segment) {
  renderSegmentShell();
  initializeSegmentPage(segment);
}
else wireCtas("");
