// model_sources.js - Define which models have assets on GitHub vs Supabase
// First half (A-M): assets on GitHub Pages
// Second half (N-Z): assets on Supabase Storage
// THIS FILE IS LOADED BY modelos.html, orcamentos/index.html

const GITHUB_ASSET_MODELS = [
  '15Anos-Alladin', '15Anos-AnaClara', '15Anos-Caroline',
  'AgathaCristina15Anos', 'Alanna15Anos-CeuEstrelado', 'Alice10Anos-EmilyVick',
  'AliceVitória15Anos', 'AliciaMarinelli15Anos', 'AlixValentina15Anos',
  'Alícia15Anos-JardimEncantado', 'Antonio&Erika-Casamento', 'Antônia60Anos',
  'Cibele15Anos', 'Dione&Danilo-Casamento', 'Dra-Yasmin', 'Duda15Anos',
  'Edmilson60Anos', 'EduardaVasques15Anos', 'Elisete&Luciano-Casamento',
  'Emanuela15Anos-BaileMascara', 'Evelyn15Anos', 'Felipe15Anos-GALO',
  'Fransisca50Anos', 'Giovana15Anos-Azul', 'Graziella15Anos',
  'Isadora15Anos-Serenity', 'JoséRoberto60Anos', 'JuliaNakahara15Anos',
  'LaraHamphreis15Anos', 'Lauany15Anos-JardimEncanto', 'LavíniaGregório15Anos',
  'Luara15Anos-JardimDaIntimidade', 'Lucca-Astronauta', 'Lívia15Anos-BaileDeInverno',
  'Maria15anos-AzulDourado', 'MariaEduarda-15-Anos', 'MariaElise15Anos',
  'MariaLara15Anos', 'Mariana15Anos-Baile', 'Modelo-Azul-Prata-Floral',
  'Modelo-BaileMascaras-Vermelho', 'Modelo-Bela-e-a-Fera',
  'Modelo-Borboleta-Azul-Prata', 'Modelo-Lilas-Prata',
  'Modelo-Neon-Laranja-Verde', 'Modelo-VanGogh'
];

function isGitHubModel(slug) {
  // Normalize for comparison
  const normalized = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return GITHUB_ASSET_MODELS.some(m => {
    const mNorm = m.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return mNorm === normalized || m === slug;
  });
}

function getAssetBaseUrl(slug) {
  if (isGitHubModel(slug)) {
    // GitHub: relative path from modelos/{slug}/assets/
    return 'modelos/' + slug + '/assets/';
  }
  // Supabase: absolute URL
  const safeSlug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\-_]/g, '-');
  return 'https://xchphsltccopelblbsyb.supabase.co/storage/v1/object/public/modelos/' + safeSlug + '/assets/';
}

function getCoverUrl(slug, capaPath) {
  const base = getAssetBaseUrl(slug);
  if (isGitHubModel(slug)) {
    return base + (capaPath || 'capa.jpg').replace('assets/', '');
  }
  return base + (capaPath || 'capa.jpg').replace('assets/', '');
}
