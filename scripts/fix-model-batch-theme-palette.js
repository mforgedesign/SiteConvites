const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'modelos.json');

const batchSlugs = [
    'modelo-15Anos-Alicia',
    'modelo-15Anos-Julia',
    'modelo-Alessandra50Anos',
    'modelo-AliceAlves-15Anos',
    'modelo-anajulia15anos',
    'modelo-ana-julia15anos',
    'modelo-AniversarioGabriella-15Anos',
    'modelo-AnnaFlavia-15Anos',
    'modelo-Antonella1Ano',
    'modelo-beatriz15anos',
    'modelo-Catarina15Anos',
    'modelo-EliCavalcante40Anos',
    'modelo-Emanuelle-1Ano',
    'modelo-Enf-BrunaEduarda-Formatura',
    'modelo-ester15anos',
    'modelo-Ester-15Anos',
    'modelo-Gabriella-15Anos',
    'modelo-JulianaBusson35Anos',
    'modelo-Julianne15Anos',
    'modelo-Larissa15Anos',
    'modelo-Teca-Anos60',
    'modelo-YasminZara15Anos'
];

const manualVisuals = {
    'modelo-YasminZara15Anos': ['Baile de Máscaras', 'Vermelho e Dourado'],
    'modelo-Teca-Anos60': ['Anos 60', 'Pink, Bege e Preto'],
    'modelo-Enf-BrunaEduarda-Formatura': ['Formatura Enfermagem', 'Verde e Dourado'],
    'modelo-Emanuelle-1Ano': ['Castelo Encantado', 'Azul, Lilás e Prata'],
    'modelo-EliCavalcante40Anos': ['Baile de Máscaras', 'Vermelho, Preto e Dourado'],
    'modelo-Catarina15Anos': ['Castelo Encantado', 'Verde Água, branco e Dourado'],
    'modelo-Antonella1Ano': ['Floral Elegante', 'Rosa e Dourado'],
    'modelo-AnnaFlavia-15Anos': ['Floral Mágico', 'Azul, Rosa, Verde Água e Pérola'],
    'modelo-anajulia15anos': ['Enrolados Rapunzel', 'Lilás e Dourado'],
    'modelo-Alessandra50Anos': ['Salão Elegante', 'Preto e Dourado'],
    'modelo-15Anos-Julia': ['Harry Potter Hogwarts', 'Azul Marinho e Preto'],
    'modelo-15Anos-Alicia': ['Jardim Encantado', 'Rosé Gold e Branco']
};

function readConfig(slug) {
    const filePath = path.join(ROOT, 'modelos', slug, 'config.js');
    const source = fs.readFileSync(filePath, 'utf8');
    const sandbox = { window: {} };
    vm.runInNewContext(source, sandbox, { filename: filePath });
    if (!sandbox.window.config) throw new Error(`Config inválido: ${slug}`);
    return { filePath, config: sandbox.window.config };
}

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const changed = [];

for (const slug of batchSlugs) {
    const entry = catalog.find(item => item.slug === slug);
    if (!entry) throw new Error(`Modelo ausente no catálogo: ${slug}`);

    let theme = String(entry.tema || entry.config_json?.convite?.tema || '').trim();
    let palette = String(entry.paleta_cores || entry.config_json?.convite?.paletaCores || '').trim();

    if (manualVisuals[slug]) {
        [theme, palette] = manualVisuals[slug];
        const { filePath, config } = readConfig(slug);
        config.convite = config.convite || {};
        config.convite.tema = theme;
        config.convite.paletaCores = palette;
        fs.writeFileSync(filePath, `window.config = ${JSON.stringify(config, null, 2)};\n`, 'utf8');
    }

    if (!theme || !palette) {
        throw new Error(`Tema ou paleta ausente após correção: ${slug}`);
    }

    entry.name = theme;
    entry.tema = theme;
    entry.paleta_cores = palette;
    entry.config_json = entry.config_json || {};
    entry.config_json.convite = entry.config_json.convite || {};
    entry.config_json.convite.tema = theme;
    entry.config_json.convite.paletaCores = palette;
    changed.push({ slug, title: theme, subtitle: palette });
}

const sarah = catalog.find(item => item.slug === 'modelo-Sarah-Vieira-15Anos');
if (sarah) {
    const theme = String(sarah.tema || sarah.config_json?.convite?.tema || '').trim();
    const palette = String(sarah.paleta_cores || sarah.config_json?.convite?.paletaCores || '').trim();
    if (!theme || !palette) throw new Error('Tema ou paleta ausente no modelo Sarah.');
    sarah.name = theme;
}

fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(changed, null, 2));
