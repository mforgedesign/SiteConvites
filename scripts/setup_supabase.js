// setup_supabase.js - Criar tabela e usuário admin no Supabase
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xchphsltccopelblbsyb.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjaHBoc2x0Y2NvcGVsYmxic3liIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzY1MjUyNCwiZXhwIjoyMDg5MjI4NTI0fQ.30EWtw6i64ca-yz-D-7Hq154OVjtZ_gKNneOA5PV1B0';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createTable() {
  console.log('Tentando criar tabela via Management API...');

  // Tenta criar a tabela usando SQL direto via fetch
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY
    }
  });

  // A tabela precisa ser criada via SQL Editor do dashboard
  // Vamos apenas verificar se existe tentando fazer um select
  const { data, error } = await supabase.from('modelos').select('slug').limit(1);

  if (error && error.code === '42P01') {
    console.log('❌ Tabela "modelos" não existe.');
    console.log('');
    console.log('Crie manualmente no SQL Editor do Supabase Dashboard:');
    console.log('');
    console.log(`CREATE TABLE modelos (
  slug TEXT PRIMARY KEY,
  name TEXT DEFAULT '',
  tipo TEXT DEFAULT '',
  tema TEXT DEFAULT '',
  paleta_cores TEXT DEFAULT '',
  button_color TEXT DEFAULT '#c9557c',
  idade TEXT DEFAULT '',
  data TEXT DEFAULT '',
  hora TEXT DEFAULT '',
  capa_path TEXT DEFAULT 'assets/capa.jpg',
  config_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE modelos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON modelos FOR SELECT USING (true);
CREATE POLICY "auth_write" ON modelos FOR INSERT WITH CHECK (true);
CREATE POLICY "auth_update" ON modelos FOR UPDATE USING (true);
CREATE POLICY "auth_delete" ON modelos FOR DELETE USING (true);`);
    console.log('');
    return false;
  } else if (error) {
    console.log('Erro ao verificar tabela:', error.message);
    return false;
  } else {
    console.log('✅ Tabela "modelos" já existe!');
    return true;
  }
}

async function createAuthUser() {
  console.log('Criando usuário admin...');

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'valentine.vicente@gmail.com',
      password: '2nf4rjwp',
      email_confirm: true
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        console.log('✅ Usuário admin já existe!');
        return true;
      }
      console.log('❌ Erro ao criar usuário:', error.message);
      return false;
    }

    console.log('✅ Usuário admin criado:', data.user.email);
    return true;
  } catch (e) {
    console.log('❌ Erro:', e.message);
    return false;
  }
}

async function main() {
  console.log('=== Setup Supabase ===\n');

  const tableOk = await createTable();
  console.log('');

  const userOk = await createAuthUser();
  console.log('');

  if (tableOk && userOk) {
    console.log('✅ Setup completo!');
  } else if (!tableOk) {
    console.log('⚠️  Crie a tabela manualmente no SQL Editor e rode novamente.');
  }
}

main();
