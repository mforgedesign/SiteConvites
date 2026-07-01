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
  return true;
}

function getAssetBaseUrl(slug) {
  // GitHub: relative path from modelos/{slug}/assets/
  return 'modelos/' + slug + '/assets/';
}

function getCoverUrl(slug, capaPath) {
  if (!capaPath) {
    return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 400%22%3E%3Crect fill=%22%23e5e7eb%22 width=%22300%22 height=%22400%22/%3E%3Ctext fill=%22%239ca3af%22 x=%22150%22 y=%22200%22 text-anchor=%22middle%22 font-size=%2214%22%3ESem capa%3C/text%3E%3C/svg%3E';
  }
  const base = getAssetBaseUrl(slug);
  return base + capaPath.replace('assets/', '');
}
