// split_assets.js - Delete all assets from Supabase, upload only second half
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://xchphsltccopelblbsyb.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjaHBoc2x0Y2NvcGVsYmxic3liIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzY1MjUyNCwiZXhwIjoyMDg5MjI4NTI0fQ.30EWtw6i64ca-yz-D-7Hq154OVjtZ_gKNneOA5PV1B0';
const BUCKET = 'modelos';
const MODELOS_DIR = path.join(__dirname, '..', 'modelos');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Models that go to Supabase (second half, alphabetically)
const SUPABASE_MODELS = [
  'Modelo-casamento-branco-dourado', 'Morena-15Anos', 'MorenaClarah15Anos',
  'Patrícia', 'Rosely', 'Sara15Anos-HP', 'VanGogh-Júlia-15Anos',
  'VitoriaFabia-15Anos', 'Yasmin15Anos-Ado', 'YasminHabib15Anos',
  'modelo-Las-Vegas', 'modelo-alicenopaisdasmaravilhas', 'modelo-aniversario-sereia',
  'modelo-auroramalevola', 'modelo-azul-floral', 'modelo-azulcomamarelopastel',
  'modelo-bailedemascara', 'modelo-bailedemascarapreta', 'modelo-baileinverno-AberturaCurta',
  'modelo-brancodourado', 'modelo-casamento-azul-branco', 'modelo-casamento-minimalista',
  'modelo-casamentoazulebranco', 'modelo-casamentominimalista', 'modelo-cinderela',
  'modelo-coraline', 'modelo-debutante-azul-floral', 'modelo-debutante-enrolados',
  'modelo-debutante-rosa-azul', 'modelo-debutante-rosa-gold', 'modelo-debutante-verde-esmeralda',
  'modelo-enrolados-rapunzel', 'modelo-formatura', 'modelo-galo',
  'modelo-lilascomdourado', 'modelo-lilascomdouradoerosa', 'modelo-marromdourado',
  'modelo-noiteestrelada', 'modelo-palmeiras', 'modelo-portão-jardim',
  'modelo-rosadouradoespelho', 'modelo-rosaprata', 'modelo-rosegold',
  'modelo-roxoedourado', 'modelo-tropical', 'modelo-vitoriasecrets'
];

function sanitizeSlug(slug) {
  return slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\-_]/g, '-');
}

// List all files recursively in bucket
async function listAllFiles(prefix = '') {
  const files = [];
  const { data: items, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 200 });
  if (error || !items) return files;

  for (const item of items) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      const sub = await listAllFiles(fullPath);
      files.push(...sub);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

// Delete files in batches of 100
async function deleteAllFiles() {
  console.log('Listando todos os arquivos no bucket...');
  const files = await listAllFiles();
  console.log(`Encontrados ${files.length} arquivos\n`);

  if (files.length === 0) {
    console.log('Bucket já está vazio.');
    return;
  }

  for (let i = 0; i < files.length; i += 100) {
    const batch = files.slice(i, i + 100);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) {
      console.log(`Erro no batch ${Math.floor(i/100)+1}: ${error.message}`);
    } else {
      console.log(`Batch ${Math.floor(i/100)+1}: ${batch.length} arquivos deletados`);
    }
  }
  console.log('Todos os arquivos deletados.\n');
}

// Upload assets for one model
async function uploadModelAssets(slug) {
  const safeSlug = sanitizeSlug(slug);
  const assetsDir = path.join(MODELOS_DIR, slug, 'assets');
  if (!fs.existsSync(assetsDir)) return { ok: 0, fail: 0 };

  const files = fs.readdirSync(assetsDir).filter(f => {
    return fs.statSync(path.join(assetsDir, f)).isFile();
  });

  let ok = 0, fail = 0;
  for (const file of files) {
    const localPath = path.join(assetsDir, file);
    const remotePath = `${safeSlug}/assets/${file}`;
    const buffer = fs.readFileSync(localPath);
    const ext = path.extname(file).toLowerCase();

    const ct = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg', '.webm': 'video/webm'
    }[ext] || 'application/octet-stream';

    const { error } = await supabase.storage.from(BUCKET).upload(remotePath, buffer, {
      contentType: ct, upsert: true
    });

    if (error) {
      console.log(`  ✗ ${file}: ${error.message.substring(0, 60)}`);
      fail++;
    } else {
      ok++;
    }
  }
  return { ok, fail };
}

async function main() {
  console.log('=== Split Assets: Delete + Upload Supabase Half ===\n');

  // Step 1: Delete all
  await deleteAllFiles();

  // Step 2: Upload second half
  console.log(`Enviando ${SUPABASE_MODELS.length} modelos para Supabase...\n`);
  let totalOk = 0, totalFail = 0;

  for (let i = 0; i < SUPABASE_MODELS.length; i++) {
    const slug = SUPABASE_MODELS[i];
    console.log(`[${i+1}/${SUPABASE_MODELS.length}] ${slug}`);
    const { ok, fail } = await uploadModelAssets(slug);
    console.log(`  ✓ ${ok} enviados, ✗ ${fail} falhas`);
    totalOk += ok;
    totalFail += fail;
  }

  console.log(`\n=== Resumo ===`);
  console.log(`Enviados: ${totalOk}`);
  console.log(`Falhas: ${totalFail}`);
  console.log(`Modelos: ${SUPABASE_MODELS.length}`);
}

main().catch(console.error);
