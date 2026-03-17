// upload_templates_only.js - Re-upload apenas os templates HTML adaptados
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://xchphsltccopelblbsyb.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjaHBoc2x0Y2NvcGVsYmxic3liIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzY1MjUyNCwiZXhwIjoyMDg5MjI4NTI0fQ.30EWtw6i64ca-yz-D-7Hq154OVjtZ_gKNneOA5PV1B0';

const MODELOS_DIR = path.join(__dirname, '..', 'modelos');
const CODE_BUCKET = 'modelos-code';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function sanitizeSlug(slug) {
  return slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\-_]/g, '-');
}

async function main() {
  const dirs = fs.readdirSync(MODELOS_DIR).filter(d => {
    return fs.statSync(path.join(MODELOS_DIR, d)).isDirectory();
  });

  let ok = 0, fail = 0;
  for (const slug of dirs) {
    const htmlPath = path.join(MODELOS_DIR, slug, 'index.html');
    if (!fs.existsSync(htmlPath)) continue;

    const content = fs.readFileSync(htmlPath);
    const safeSlug = sanitizeSlug(slug);

    const { error } = await supabase.storage
      .from(CODE_BUCKET)
      .upload(`${safeSlug}/index.html`, content, {
        contentType: 'text/html',
        upsert: true
      });

    if (error) {
      console.log(`❌ ${slug}: ${error.message.substring(0, 60)}`);
      fail++;
    } else {
      ok++;
    }
  }

  console.log(`\n✅ Templates re-uploadados: ${ok}/${ok + fail}`);
}

main();
