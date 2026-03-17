# Changelog - Site Convites Deploy

## 2026-03-16 10:35 - Setup Supabase e Upload de Assets

### O que foi feito:
1. **Buckets Supabase criados**:
   - `modelos` (público) - para assets (imagens, vídeos, áudios)
   - `modelos-code` (público) - para HTML templates dos modelos

2. **Usuário admin criado no Supabase Auth**:
   - Email: `valentine.vicente@gmail.com`
   - Senha: `2nf4rjwp`

3. **Tabela `modelos`**: ⚠️ **PENDENTE** - Precisa ser criada manualmente no SQL Editor do Supabase Dashboard.
   - SQL está no `scripts/setup_supabase.js` (output do console)
   - Schema: slug (PK), name, tipo, tema, paleta_cores, button_color, idade, data, hora, capa_path, config_json, created_at, updated_at

4. **Assets uploadados** (824/825 arquivos):
   - Todos os 92 modelos tiveram seus assets (capa.jpg, slide1.mp4, folha_preenchida.mp4, musica.mp3, brilhos, botões) enviados para `modelos/{slug}/assets/` no Supabase Storage
   - 1 arquivo falhou (provavelmente tamanho ou nome)

5. **Templates HTML adaptados e uploadados**:
   - Todos os 92 `index.html` foram modificados para:
     - Remover `<script src="config.js"></script>`
     - Injetar configuração do Supabase (URL, anon key, slug)
     - Adicionar `assetUrl()` helper para URLs de assets
     - Adicionar `__loadConfig()` async para buscar config do DB
     - Substituir `src="assets/..."` por URLs completas do Supabase Storage
   - Re-uploadados para `modelos-code/{slug}/index.html` no Storage

### Scripts criados:
- `scripts/setup_supabase.js` - Setup inicial (buckets, auth user, verificar tabela)
- `scripts/extract_and_upload.js` - Extrair metadados e fazer upload de assets + templates
- `scripts/adapt_model_htmls.js` - Adaptar HTMLs dos modelos para Supabase
- `scripts/upload_templates_only.js` - Re-upload apenas templates

## 2026-03-16 10:45 - modelos.html adaptado

### O que foi feito:
1. **`modelos.html` adaptado para Supabase**:
   - Adicionadas constantes SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_ASSETS, SUPABASE_CODE
   - Adicionada função `sanitizeSlug()` para remover acentos dos slugs
   - Função `discoverSlugs()` agora busca do Supabase DB (`/rest/v1/modelos`) em vez de `/modelos.json`
   - Dados do DB preenchem `models[]` diretamente
   - `openPreview()` usa iframe do Supabase Storage
   - Cards mostram capas do Supabase Storage

## 2026-03-16 10:55 - Landing page e Orçamentos adaptados

### O que foi feito:
1. **`js/app.js` adaptado**:
   - `loadSelectedModel()`: URL da capa agora aceita URL completa do Supabase
   - `showModelPreview()`: iframe do preview usa Supabase Storage URL

2. **`orcamentos/js/app.js` adaptado**:
   - Mesmas correções do app.js principal
   - Capa aceita URL completa
   - Preview iframe usa Supabase Storage

## 2026-03-16 11:10 - Editor criado e Deploy realizado

### O que foi feito:
1. **Editor de Convites criado** (`editor/index.html`):
   - Login com Supabase Auth (email/senha)
   - Grid de modelos com busca/filtro
   - Campos editáveis: nome, tipo, tema, paleta, cor botões, idade, data, hora
   - Gerenciamento de slides de abertura (adicionar/remover)
   - Upload de arquivos para Supabase Storage
   - Troca de folha preenchida
   - Preview em tempo real via iframe (Supabase Storage)
   - Salvar configurações no Supabase DB
   - Excluir modelo (DB + Storage)
   - Atalhos: Ctrl+S para salvar, ESC para voltar

2. **Deploy GitHub Pages realizado**:
   - Repositório: `mforgedesign/SiteConvites`
   - URL: https://mforgedesign.github.io/SiteConvites/
   - 123 arquivos enviados (HTML, CSS, JS, 92 templates de modelos)
   - Pages habilitado via API

3. **Scripts de apoio criados**:
   - `scripts/populate_db.js` - Popular DB após criar tabela

### Onde parou:
- ⚠️ **AÇÃO NECESSÁRIA**: Criar tabela `modelos` no SQL Editor do Supabase Dashboard
- Após criar a tabela, rodar: `node scripts/populate_db.js` para inserir metadados do DB

### SQL para criar a tabela:
```sql
CREATE TABLE modelos (
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
CREATE POLICY "auth_all" ON modelos FOR ALL USING (true);
```
