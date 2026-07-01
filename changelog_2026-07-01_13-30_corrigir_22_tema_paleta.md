# Corrigir título e subtítulo dos 22 modelos

Data: 2026-07-01

## Prompt

> A regra tem que ser: Título - Tema; subtítulo - Paleta.
>
> Sobre a correção nos 22 itens, tem uns que não vão ter tema e paleta, então vou te informar quais são.

## Problema

Os 22 modelos do lote `666f44d` foram publicados com o nome do aniversariante em `name`. Como a vitrine usa `name` no título e `paleta_cores` no subtítulo, os cards não descreviam corretamente o visual reutilizável.

## Código/dados antigos

```json
{
  "name": "Yasmin Zara",
  "tema": "",
  "paleta_cores": ""
}
```

## Código/dados novos

```json
{
  "name": "Baile de Máscaras",
  "tema": "Baile de Máscaras",
  "paleta_cores": "Vermelho e Dourado"
}
```

## Explicação

- Os 22 títulos foram substituídos pelo tema.
- Os 22 subtítulos usam a paleta.
- Doze pares fornecidos manualmente foram gravados no catálogo, em `config_json` e no `config.js` correspondente.
- Os dez modelos restantes reutilizam tema e paleta já existentes no config.
- O modelo Sarah, corrigido anteriormente, também teve o título combinado normalizado para apenas `Floral`.
- O script valida que todos os 22 modelos terminam com tema e paleta preenchidos antes de salvar.

## Arquivos alterados

- `modelos.json`
- `modelos/<12 modelos informados>/config.js`
- `scripts/fix-model-batch-theme-palette.js`
- `DOCUMENTACAO.md`
- `LESSONS_LEARNED.md`
- `changelog_2026-07-01_13-30_corrigir_22_tema_paleta.md`

## Backup

`backups/20260701_1330_corrigir_22_tema_paleta`
