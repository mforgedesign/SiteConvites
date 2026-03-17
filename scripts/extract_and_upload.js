// extract_and_upload.js - Extrai metadados dos config.js e faz upload para Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://xchphsltccopelblbsyb.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjaHBoc2x0Y2NvcGVsYmxic3liIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzY1MjUyNCwiZXhwIjoyMDg5MjI4NTI0fQ.30EWtw6i64ca-yz-D-7Hq154OVjtZ_gKNneOA5PV1B0';

const MODELOS_DIR = path.join(__dirname, '..', 'modelos');
const ASSETS_BUCKET = 'modelos';
const CODE_BUCKET = 'modelos-code';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Sanitizar slug para uso em paths do Storage (remove acentos e caracteres especiais)
function sanitizeSlug(slug) {
  return slug
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
    .replace(/[^a-zA-Z0-9\-_]/g, '-'); // Substitui outros especiais por hífen
}

// Extrair config_json do window.config
function extractConfigJson(content) {
  try {
    // Remove "window.config = " e ";" final
    let jsonStr = content
      .replace(/^window\.config\s*=\s*/, '')
      .replace(/;\s*$/, '');

    // Remove comentários de forma mais robusta
    // Remove // comments mas preserva URLs (http://)
    jsonStr = jsonStr.replace(/(?<!:)\/\/[^\n]*/g, '');
    // Remove /* */ comments
    jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '');

    // Usa Function constructor para avaliar o objeto JS
    const config = new Function('return (' + jsonStr + ')')();
    return config;
  } catch (e) {
    console.log('  ⚠️ Erro ao parsear config_json:', e.message.substring(0, 100));
    return null;
  }
}

// Fallback: extrair campo individual com regex
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
  return slug
    .replace(/^(modelo-|Modelo-)/, '')
    .replace(/-/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

// Processar um modelo
async function processModel(slug) {
  const configPath = path.join(MODELOS_DIR, slug, 'config.js');
  if (!fs.existsSync(configPath)) return null;

  const content = fs.readFileSync(configPath, 'utf8');
  const configJson = extractConfigJson(content);

  if (configJson) {
    return {
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
  }

  // Fallback com regex
  return {
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

// Upload de um arquivo para o Storage
async function uploadFile(bucket, remotePath, localPath) {
  const fileBuffer = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();

  const contentTypeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json'
  };

  const contentType = contentTypeMap[ext] || 'application/octet-stream';

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(remotePath, fileBuffer, {
      contentType,
      upsert: true
    });

  if (error) {
    console.log(`  ❌ Upload ${remotePath}: ${error.message.substring(0, 80)}`);
    return false;
  }
  return true;
}

// Upload de todos os assets de um modelo
async function uploadModelAssets(slug) {
  const assetsDir = path.join(MODELOS_DIR, slug, 'assets');
  if (!fs.existsSync(assetsDir)) return { success: 0, total: 0 };

  const files = fs.readdirSync(assetsDir);
  let success = 0;
  const safeSlug = sanitizeSlug(slug);

  for (const file of files) {
    const localPath = path.join(assetsDir, file);
    const remotePath = `${safeSlug}/assets/${file}`;

    if (fs.statSync(localPath).isFile()) {
      const ok = await uploadFile(ASSETS_BUCKET, remotePath, localPath);
      if (ok) success++;
    }
  }

  return { success, total: files.length };
}

// Upload do HTML template
async function uploadTemplate(slug) {
  const htmlPath = path.join(MODELOS_DIR, slug, 'index.html');
  if (!fs.existsSync(htmlPath)) return false;

  const safeSlug = sanitizeSlug(slug);
  return await uploadFile(CODE_BUCKET, `${safeSlug}/index.html`, htmlPath);
}

// Main
async function main() {
  console.log('=== Processando Modelos ===\n');

  const dirs = fs.readdirSync(MODELOS_DIR).filter(d => {
    const full = path.join(MODELOS_DIR, d);
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'config.js'));
  });

  console.log(`Encontrados ${dirs.length} modelos\n`);

  let dbSuccess = 0;
  let dbFail = 0;
  let assetsTotal = 0;
  let assetsSuccess = 0;
  let templatesOk = 0;
  let tableExists = null;

  for (let i = 0; i < dirs.length; i++) {
    const slug = dirs[i];
    const progress = `[${i + 1}/${dirs.length}]`;
    console.log(`${progress} ${slug}`);

    // 1. Extrair metadados e inserir no DB
    const modelData = await processModel(slug);
    if (modelData) {
      // Só tenta DB se a tabela existir (verifica uma vez)
      if (tableExists !== false) {
        const { error } = await supabase
          .from('modelos')
          .upsert(modelData, { onConflict: 'slug' });

        if (error) {
          if (tableExists === null && error.message.includes('not find the table')) {
            console.log(`  ⏳ Tabela ainda não criada - pulando DB`);
            tableExists = false;
          } else {
            console.log(`  ❌ DB: ${error.message.substring(0, 60)}`);
            dbFail++;
          }
        } else {
          console.log(`  ✅ DB: ${modelData.name || slug}`);
          dbSuccess++;
          tableExists = true;
        }
      }
    }

    // 2. Upload de assets
    const assets = await uploadModelAssets(slug);
    assetsTotal += assets.total;
    assetsSuccess += assets.success;
    if (assets.total > 0) {
      console.log(`  📦 Assets: ${assets.success}/${assets.total}`);
    }

    // 3. Upload do template HTML
    const templateOk = await uploadTemplate(slug);
    if (templateOk) {
      templatesOk++;
    }
  }

  console.log('\n=== Resumo ===');
  console.log(`Modelos processados: ${dirs.length}`);
  console.log(`DB: ${dbSuccess} inseridos, ${dbFail} falhas`);
  console.log(`Assets: ${assetsSuccess}/${assetsTotal} arquivos`);
  console.log(`Templates HTML: ${templatesOk}/${dirs.length}`);

  if (!tableExists) {
    console.log('\n⚠️  Tabela não existe ainda. Rode novamente após criar a tabela!');
  } else {
    console.log('\n✅ Processo completo!');
  }
}

main().catch(console.error);
