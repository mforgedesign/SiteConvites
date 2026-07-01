# Changelog - 2026-07-01 10:45 - Restaurar assets do modelo Tropical

## Prompt

> No site, modelo tropical segue sem carregar capa e convite na prévia.

O console mostrava `404` para `brilho_esquerdo.gif`, `brilho_centro.gif` e `brilho_direito.gif`. A capa também não aparecia no catálogo.

## Diagnóstico

Os assets originais do modelo Tropical foram removidos no commit `3ed240d` durante a migração para Supabase Storage. Quando o catálogo voltou a usar assets locais, essa pasta específica não foi restaurada. O histórico imediatamente anterior ao commit continha todos os nove arquivos originais.

## Código antigo

```js
"musica": "",
"tipoAbertura": "nenhuma",
"capa": "",
"aberturaSlides": [],
"folhaPreenchida": ""
```

```json
"capa_path": "",
"capa_type": ""
```

## Código novo

```js
"musica": "assets/musica.mp3",
"tipoAbertura": "longa",
"capa": "assets/capa.jpg",
"aberturaSlides": ["assets/slide1.mp4"],
"folhaPreenchida": "assets/folha_preenchida.mp4"
```

```json
"capa_path": "assets/capa.jpg",
"capa_type": "image"
```

## Assets restaurados

- `brilho_centro.gif`
- `brilho_direito.gif`
- `brilho_esquerdo.gif`
- `btn_animado.svg`
- `btn_estatico.svg`
- `capa.jpg`
- `folha_preenchida.mp4`
- `musica.mp3`
- `slide1.mp4`

Os assets foram recuperados de `3ed240d^`, antes da remoção. Os blobs de mídia foram preservados byte a byte; o SVG animado recebeu apenas normalização de espaços em branco finais.

## Backup

`backups/20260701_1035_restaurar_modelo_tropical/`

## QA

- comparação dos blobs com o histórico Git;
- validação de todas as referências do `config.js`;
- validação do `modelos.json`;
- validação HTTP após o deploy;
- navegador não aberto ou controlado, conforme R7.
