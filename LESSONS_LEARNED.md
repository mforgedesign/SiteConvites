# Lições Aprendidas (Lessons Learned)

## URLs Dinâmicas vs Prefixos Hardcoded (21/03/2026)
**Problema:** Ao carregar assets no GitHub Pages, usávamos o prefixo estático `/SiteConvites/`. O site quebrava (Erro 404 nos arquivos `.jpg`, `.mp4`) quando acessado via domínio customizado (`pedidos.mforge.com.br`), pois o domínio customizado aponta direto para a raiz do repositório, não precisando do `/SiteConvites/`.
**Solução:** Sempre use a API `new URL()` do navegador para computar caminhos dinamicamente baseados na URL do cliente. 
*Exemplo:* `new URL('.', window.location.href).href` pega o diretório atual de forma universal (funciona tanto no `github.io/SiteConvites/` quanto no `pedidos.mforge.../`).

## Acentos em Nomes de Pastas do GitHub (21/03/2026)
**Problema:** O slug salvo no banco passa por um `sanitizeSlug()` que remove acentos. Porém, os arquivos físicos no repositório foram criados com acentos (ex: `AliceVitória15Anos`). Isso fazia as URLs dos assets quebrarem.
**Solução:** Ao lidar com arquivos servidos diretamente do repositório Git, use o nome original da pasta (com os acentos em `encodeURIComponent()`). Só aplique sanitize para serviços onde as chaves/storages foram de fato higienizados (como no bucket do Supabase).

## Erros de Renderização em Iframes srcdoc (21/03/2026)
**Problema:** Ao injetar HTML completo de um convite em um `iframe srcdoc`, os assets relativos da página perdiam sua referência base.
**Solução:** A injeção de uma tag `<base href="...">` com o modelo de URL correto diretamente no `<head>` do HTML antes de jogar no `srcdoc` é a forma mais limpa e abrangente de consertar **todas** as referências relativas (CSS, script src, imagens HTML), sem precisar de regex pesadas em tempo de execução. Nunca se esqueça de validar se as tags adicionadas por script em tempo de execução também respeitam essa tag base ou precisam de paths fixos.
