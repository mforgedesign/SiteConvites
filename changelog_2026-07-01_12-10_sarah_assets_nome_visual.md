# Changelog - 2026-07-01 12:10 - Assets finais de Sarah e nome visual

## Prompt

> O modelo Sarah Vieira foi pro site com capa errada. Ao invés de pegar a capa, pegou a referência do modelo usado, bem como a abertura. Modelos não devem vir com nome do evento como nome do modelo, tem que ser `[[tema]] e [[paleta]]`.

## Diagnóstico

Os arquivos publicados no modelo Sarah não correspondiam aos arquivos finais da pasta de Produção:

- `cover.jpg` do modelo: 1.242.545 bytes;
- `cover.jpg` final: 2.293.907 bytes;
- `slide1.mp4` do modelo: 2.753.702 bytes;
- `slide1.mp4` final: 1.743.331 bytes.

Os demais assets comparados já coincidiam. O modelo havia sido criado antes das versões finais da capa e da abertura.

## Código antigo

```json
"name": "Sarah Vieira"
```

## Código novo

```json
"name": "Floral e Azul com Branco e Prata"
```

`cover.jpg` e `slide1.mp4` foram substituídos pelas versões finais atuais de:

`Builder v6/Produção/Sarah-Vieira-15Anos/assets/`

## Regra adotada

O nome comercial de novos modelos passa a ser `Tema e Paleta`. O nome da pessoa permanece apenas dentro do config necessário para a prévia.

## Backup

`backups/20260701_1205_modelo_sarah_assets_nome_tema_paleta/`

## QA

- hashes SHA-256 de capa e abertura iguais aos arquivos de Produção;
- `modelos.json` validado;
- validação HTTP após deploy;
- navegador não aberto ou controlado.
