# Segurança e privacidade do site

## Verificação de metadados de imagens

Execute na raiz do repositório:

```bash
python scripts/check-image-metadata.py
python scripts/check-image-metadata.py --self-test
```

O primeiro comando verifica as imagens versionadas e retorna erro quando encontra um bloco EXIF GPS ou marcadores textuais de coordenadas. O segundo cria uma imagem temporária com GPS, confirma que ela é detectada e a remove automaticamente. O script somente lê as imagens do projeto: não altera nem recomprime arquivos.

A workflow `.github/workflows/image-metadata.yml` executa as duas verificações em pushes e pull requests.

## Content Security Policy

O site usa uma CSP por elemento `meta`, compatível com a hospedagem estática do GitHub Pages. Ela restringe scripts, imagens, objetos, frames e URLs-base; mantém somente as origens necessárias para as fontes do Google; e permite o envio do formulário exclusivamente para `https://api.web3forms.com`.

As fontes do Google foram avaliadas e mantidas por enquanto para preservar a tipografia existente sem adicionar vários arquivos de fonte ao repositório. Elas são as únicas dependências visuais carregadas de terceiros e estão limitadas na CSP a `fonts.googleapis.com` e `fonts.gstatic.com`. Se a prioridade passar a ser funcionamento totalmente independente de terceiros, o próximo passo é baixar somente os pesos usados, registrar suas licenças e substituir os links por declarações locais `@font-face`.

O GitHub Pages não permite configurar cabeçalhos HTTP arbitrários diretamente pelo repositório. Diretivas que dependem de cabeçalho, como `frame-ancestors`, e proteções como HSTS exigem um proxy/CDN configurável ou outra hospedagem. A política atual usa `frame-src 'none'`, mas isso não substitui `frame-ancestors` contra incorporação da página por terceiros.

## Web3Forms

O `access_key` presente no HTML é um identificador público necessário para o formulário, não uma credencial secreta. O honeypot `botcheck` permanece ativo.

CAPTCHA/Turnstile e restrição por domínio dependem do plano e de configuração manual no painel do Web3Forms. Essas mudanças não foram aplicadas. Antes de ativá-las, confirme o recurso disponível na conta e teste o formulário sem publicar credenciais secretas.
