// populate_db.js - Popular DB com metadados extraídos dos config.js
// Rode DEPOIS de criar a tabela no SQL Editor do Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://xchphsltccopelblbsyb.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjaHBoc2x0Y2NvcGVsYmxic3liIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzY1MjUyNCwiZXhwIjoyMDg5MjI4NTI0fQ.30EWtw6i64ca-yz-D-7Hq154OVjtZ_gKNneOA5PV1B0';

const MODELOS_DIR = path.join(__dirname, '..', 'modelos');
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function extractConfigJson(content) {
  try {
    let jsonStr = content
      .replace(/^window\.config\s*=\s*/, '')
      .replace(/;\s*$/, '');
    jsonStr = jsonStr.replace(/(?<!:)\/\/[^\n]*/g, '');
    jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '');
    return new Function('return (' + jsonStr + ')')();
  } catch (e) {
    return null;
  }
}

function extractField(content, key) {
  let re = new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`);
  let m = content.match(re);
  if (m) return m[1];
  re = new RegExp(`"${key}"\\s*:\\s*(\\d+)`);
  m = content.match(re);
  if (m) return m[1];
  return '';
}

function formatSlug(slug) {
  return slug.replace(/^(modelo-|Modelo-)/, '').replace(/-/g, ' ').replace(/([A-Z])/g, ' $1').trim();
}

async function main() {
  console.log('=== Populando DB ===\n');

  const dirs = fs.readdirSync(MODELOS_DIR).filter(d => {
    return fs.statSync(path.join(MODELOS_DIR, d)).isDirectory()
      && fs.existsSync(path.join(MODELOS_DIR, d, 'config.js'));
  });

  let ok = 0, fail = 0;

  for (const slug of dirs) {
    const configPath = path.join(MODELOS_DIR, slug, 'config.js');
    const content = fs.readFileSync(configPath, 'utf8');
    const configJson = extractConfigJson(content);

    let modelData;
    if (configJson) {
      modelData = {
        slug,
        name: configJson.evento?.nome || formatSlug(slug),
        tipo: configJson.evento?.tipo || '',
        tema: configJson.convite?.tema || '',
        paleta_cores: configJson.convite?.paletaCores || '',
        button_color: configJson.config?.buttonColor || '#c9557c',
        idade: String(configJson.evento?.idade || ''),
        data: configJson.evento?.data || '',
        hora: configJson.evento?.hora || '',
        capa_path: configJson.assets?.capa || 'assets/capa.jpg',
        config_json: configJson
      };
    } else {
      modelData = {
        slug,
        name: extractField(content, 'nome') || formatSlug(slug),
        tipo: extractField(content, 'tipo') || '',
        tema: extractField(content, 'tema') || '',
        paleta_cores: extractField(content, 'paletaCores') || '',
        button_color: extractField(content, 'buttonColor') || '#c9557c',
        idade: extractField(content, 'idade') || '',
        data: extractField(content, 'data') || '',
        hora: extractField(content, 'hora') || '',
        capa_path: extractField(content, 'capa') || 'assets/capa.jpg',
        config_json: {}
      };
    }

    const { error } = await supabase.from('modelos').upsert(modelData, { onConflict: 'slug' });

    if (error) {
      console.log(`❌ ${slug}: ${error.message.substring(0, 80)}`);
      fail++;
    } else {
      console.log(`✅ ${slug}: ${modelData.name}`);
      ok++;
    }
  }

  console.log(`\n=== Resumo ===`);
  console.log(`Inseridos: ${ok}`);
  console.log(`Falhas: ${fail}`);
  console.log(`Total: ${dirs.length}`);
}

main();
