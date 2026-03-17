// adapt_model_htmls.js - Adapta os index.html dos modelos para buscar config do Supabase
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://xchphsltccopelblbsyb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjaHBoc2x0Y2NvcGVsYmxic3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NTI1MjQsImV4cCI6MjA4OTIyODUyNH0.ZOtoygT-PZKcByjh2GEzKGX--6K1UqedvVqTlhCAko0';

const MODELOS_DIR = path.join(__dirname, '..', 'modelos');

// Script que será injetado no <head> de cada modelo
function getSupabaseScript(slug) {
  return `
    <!-- Supabase Config (injected) -->
    <script>
      window.__SUPABASE_URL = '${SUPABASE_URL}';
      window.__SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';
      window.__SUPABASE_ASSETS = '${SUPABASE_URL}/storage/v1/object/public/modelos';
      window.__MODEL_SLUG = '${slug}';
      window.__CONFIG_LOADED = false;

      // Helper para URLs de assets
      window.assetUrl = function(path) {
        if (!path) return '';
        // Remove prefixo "assets/" duplicado se houver
        const cleanPath = path.replace(/^assets\\//, '');
        return window.__SUPABASE_ASSETS + '/' + window.__MODEL_SLUG + '/assets/' + cleanPath;
      };

      // Carregar config do Supabase de forma assíncrona
      window.__loadConfig = async function() {
        try {
          const res = await fetch(
            window.__SUPABASE_URL + '/rest/v1/modelos?slug=eq.' + window.__MODEL_SLUG + '&select=config_json',
            { headers: { 'apikey': window.__SUPABASE_ANON_KEY } }
          );
          const data = await res.json();
          if (data && data[0] && data[0].config_json) {
            window.config = data[0].config_json;
            window.__CONFIG_LOADED = true;
            // Dispara evento para código que depende do config
            window.dispatchEvent(new Event('configLoaded'));
          } else {
            console.warn('Config não encontrado no Supabase para:', window.__MODEL_SLUG);
            window.dispatchEvent(new Event('configError'));
          }
        } catch (e) {
          console.error('Erro ao carregar config:', e);
          window.dispatchEvent(new Event('configError'));
        }
      };
    </script>
`;
}

// Adapta um arquivo index.html
function adaptHtmlFile(filePath, slug) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Substituir <script src="config.js"></script> pelo script do Supabase
  if (content.includes('<script src="config.js"></script>')) {
    content = content.replace(
      '<script src="config.js"></script>',
      getSupabaseScript(slug)
    );
    modified = true;
  } else if (content.includes("src=\"config.js\"")) {
    // Variações
    content = content.replace(
      /<script\s+src="config\.js"\s*><\/script>/,
      getSupabaseScript(slug)
    );
    modified = true;
  }

  // 2. Se não encontrou script config.js, injetar no <head>
  if (!modified) {
    const headEnd = content.indexOf('</head>');
    if (headEnd > -1) {
      content = content.slice(0, headEnd) + getSupabaseScript(slug) + content.slice(headEnd);
      modified = true;
    }
  }

  // 3. Substituir referências diretas a "assets/" em src attributes
  // Padrão: src="assets/..." -> src="${assetUrl('...')}"
  // NOTA: Isso é feito via template literals, mas como estamos editando HTML,
  // precisamos usar uma abordagem diferente.

  // Substituir src="assets/X" por src dinâmico
  content = content.replace(
    /src="assets\/([^"]+)"/g,
    (match, assetPath) => {
      return `src="${SUPABASE_URL}/storage/v1/object/public/modelos/${slug}/assets/${assetPath}"`;
    }
  );

  // Substituir url('assets/X') em CSS inline
  content = content.replace(
    /url\(['"]?assets\/([^'")\s]+)['"]?\)/g,
    (match, assetPath) => {
      return `url('${SUPABASE_URL}/storage/v1/object/public/modelos/${slug}/assets/${assetPath}')`;
    }
  );

  // Substituir source src="assets/X" em <source> tags
  content = content.replace(
    /<source\s+src="assets\/([^"]+)"/g,
    (match, assetPath) => {
      return `<source src="${SUPABASE_URL}/storage/v1/object/public/modelos/${slug}/assets/${assetPath}"`;
    }
  );

  if (modified || content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

// Main
function main() {
  console.log('=== Adaptando HTMLs dos Modelos ===\n');

  const dirs = fs.readdirSync(MODELOS_DIR).filter(d => {
    const full = path.join(MODELOS_DIR, d);
    return fs.statSync(full).isDirectory();
  });

  let adapted = 0;
  let skipped = 0;

  for (const slug of dirs) {
    const htmlPath = path.join(MODELOS_DIR, slug, 'index.html');
    if (!fs.existsSync(htmlPath)) {
      skipped++;
      continue;
    }

    const result = adaptHtmlFile(htmlPath, slug);
    if (result) {
      console.log(`✅ ${slug}`);
      adapted++;
    } else {
      console.log(`⏭️  ${slug} (sem alterações)`);
      skipped++;
    }
  }

  console.log(`\n=== Resumo ===`);
  console.log(`Adaptados: ${adapted}`);
  console.log(`Pulados: ${skipped}`);
  console.log(`Total: ${dirs.length}`);
}

main();
