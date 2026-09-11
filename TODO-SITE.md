# TODO — betorpf.com.br

Documento de acompanhamento das melhorias do site. O agent responsável deve marcar cada item com `[x]` somente depois de implementar e validar os respectivos critérios de aceite.

## Regras de trabalho

- Antes de editar, executar `git status --short` e `git diff`.
- Preservar alterações locais preexistentes e não sobrescrever trabalho de outro agent.
- Fazer mudanças pequenas e coerentes, com validação proporcional ao risco.
- Não reescrever o histórico Git nem executar force-push sem autorização explícita do usuário.
- Não enviar o formulário real durante testes automatizados.
- Antes de concluir, verificar desktop e larguras móveis de 320, 360 e 390 px.
- Registrar abaixo o commit que concluiu cada grupo relevante.

## Estado de referência

- Último deploy validado: `f4420ef — Simplifica títulos das skills do portfólio`.
- Data da validação: 10/09/2026.
- Existe uma alteração local em `portfolio/index.html` removendo dois parágrafos incompletos. Preservar essa alteração e incorporá-la ao trabalho; ela ainda não estava publicada na última validação.

## Já concluído e validado

- [x] Remover EXIF e GPS da foto ativa `portfolio/img/profile-2025-2x3.jpg`.
- [x] Confirmar que a foto publicada não contém EXIF ou GPS.
- [x] Remover do deploy os JPGs antigos sem uso.
- [x] Confirmar que os três JPGs antigos retornam HTTP 404.
- [x] Tornar o cabeçalho móvel do portfólio mais compacto.
- [x] Evitar rolagem horizontal em 320, 390 e 1440 px.
- [x] Simplificar os títulos das categorias de skills.
- [x] Confirmar que o deploy não apresenta erros no console.
- [x] Confirmar redirecionamento de HTTP para HTTPS.

## P0 — Privacidade

### Remover fotos com localização do histórico Git

- [x] Identificar todos os commits, branches e tags que ainda contêm versões das fotos com GPS.
- [x] Preparar e documentar o procedimento de limpeza usando `git-filter-repo` ou ferramenta equivalente.
- [x] Solicitar autorização explícita do usuário antes de reescrever o histórico ou executar force-push.
- [x] Após a autorização, remover as versões sensíveis de todos os refs aplicáveis.
- [ ] Confirmar que clones, forks, PRs ou caches não mantêm referências acessíveis; documentar limitações e eventual necessidade de suporte do GitHub.

Critérios de aceite:

- As fotos com GPS não aparecem em nenhum branch ou tag remoto controlado pelo projeto.
- O procedimento e seus efeitos colaterais ficam registrados no commit ou na entrega ao usuário.
- Nenhum force-push é feito sem aprovação explícita.

### Evitar novas imagens com metadados sensíveis

- [x] Criar um script de verificação de EXIF/GPS para imagens versionadas.
- [x] Integrar a verificação ao fluxo do projeto, preferencialmente via GitHub Actions e/ou hook documentado.
- [x] Fazer a verificação falhar quando encontrar coordenadas GPS.
- [x] Documentar como executar a verificação localmente.

Critérios de aceite:

- O script retorna sucesso para as imagens atuais.
- Uma imagem de teste com GPS é detectada sem precisar ser commitada.
- A verificação não altera nem recomprime imagens.

## P1 — Conteúdo e experiência

### Finalizar o texto do portfólio

- [x] Preservar e concluir a remoção já iniciada dos parágrafos “Sou um desenvolvedor...” e “Tenho experiências...”.
- [x] Corrigir `.Net` para `.NET` em todo o site.
- [x] Escolher um idioma consistente para as categorias: português (`Back-end`, `Bancos de dados`, `IA`, `Ferramentas`) ou inglês em toda a página.
- [x] Substituir textos que envelhecem, como “há 15 anos”, por uma formulação durável, por exemplo “desde 2011”, se aprovado pelo usuário.
- [x] Revisar capitalização e terminologia: `.NET`, `API REST`, `Back-end` e nomes oficiais das tecnologias.

Critérios de aceite:

- Não há reticências provisórias, texto duplicado nem mistura acidental de idiomas.
- A apresentação profissional é clara tanto no desktop quanto no celular.
- A hierarquia de títulos continua semanticamente válida.

### Corrigir o modal de contato em telas estreitas

- [x] Criar um ajuste específico para larguras de até 360 px.
- [x] Empilhar ou reorganizar o título e o botão de fechar.
- [x] Evitar que “Entre em contato” quebre em quatro linhas.
- [x] Reduzir a rolagem inicial sem comprometer os campos e os alvos de toque.
- [x] Validar abertura por botão e por `#contato`, fechamento pelo botão, clique no backdrop e tecla `Esc`.

Critérios de aceite:

- Sem rolagem horizontal em 320, 360 e 390 px.
- Botão de fechar permanece visível e acessível.
- Todos os campos podem ser alcançados por teclado.
- Nenhuma submissão real é feita durante o teste.

## P1 — Segurança e dependências externas

### Reduzir dependências de terceiros

- [x] Substituir os scripts do Ionicons por um SVG local para o ícone de contato.
- [x] Remover `devicon@latest`; fixar uma versão auditável ou hospedar os recursos localmente.
- [x] Hospedar localmente os ícones atualmente carregados de `cdn.simpleicons.org`.
- [x] Avaliar hospedagem local das fontes para reduzir dependências, rastreamento e pontos de falha.
- [x] Confirmar que não restaram scripts externos desnecessários.

Critérios de aceite:

- O ícone de contato funciona sem JavaScript externo.
- Não há URL de dependência com versão `latest`.
- O site continua visualmente equivalente e sem erros de console.
- Não há recursos 404.

### Reforçar política de conteúdo

- [x] Mover CSS e JavaScript inline para arquivos locais quando isso facilitar uma CSP mais restritiva.
- [x] Implementar uma Content Security Policy compatível com GitHub Pages e com o Web3Forms.
- [x] Permitir explicitamente `form-action https://api.web3forms.com`.
- [x] Restringir `object-src`, `base-uri`, scripts, estilos, fontes e imagens ao mínimo necessário.
- [x] Documentar quais cabeçalhos não podem ser configurados diretamente pelo GitHub Pages e as alternativas de hospedagem/proxy.

Critérios de aceite:

- Nenhuma violação inesperada de CSP aparece no console.
- O formulário abre, valida e mantém o endpoint correto; não é necessário submetê-lo em produção durante o teste.
- O site não depende de `'unsafe-eval'`.

### Formulário e spam

- [x] Manter o access key do Web3Forms tratado como identificador público, não como segredo.
- [ ] Avaliar CAPTCHA/Turnstile e restrição de domínio conforme o plano utilizado no Web3Forms.
- [x] Documentar qualquer configuração que precise ser feita manualmente no painel do serviço.

Critérios de aceite:

- O honeypot `botcheck` permanece presente.
- Nenhuma credencial secreta é adicionada ao repositório.
- Mudanças externas ao código são claramente sinalizadas ao usuário.

## P1 — Acessibilidade

- [x] Adicionar nomes acessíveis aos links de LinkedIn e GitHub do portfólio.
- [x] Adicionar `rel="noopener noreferrer"` aos links com `target="_blank"`.
- [x] Criar estados `:focus-visible` claros para links e ícones sociais.
- [x] Verificar ordem de foco do modal e retorno de foco ao elemento que o abriu.
- [x] Confirmar que cada página tem um único `h1` semanticamente disponível em todos os breakpoints.
- [x] Verificar contraste dos textos secundários e dos estados de foco.

Critérios de aceite:

- Links de ícone têm nomes compreensíveis em leitor de tela.
- Toda interação essencial funciona apenas com teclado.
- O foco é sempre visível.

## P2 — Performance e limpeza

- [x] Converter `assets/ilustracao-verde.png` para WebP/AVIF, preservando transparência e aparência.
- [x] Otimizar `portfolio/img/profile-2025-2x3.jpg`, preservando dimensões adequadas e removendo todos os metadados.
- [x] Remover `portfolio/img/profile-2025-vertical-3x4.png` se não houver referência ou necessidade de fallback.
- [x] Definir dimensões explícitas para novas imagens e evitar mudança de layout durante o carregamento.
- [x] Confirmar que nenhuma imagem otimizada contém EXIF/GPS.
- [x] Comparar qualidade visual antes e depois da compressão.

Critérios de aceite:

- A ilustração principal fica significativamente menor que os atuais aproximadamente 1,22 MB.
- A foto ativa fica significativamente menor que os atuais aproximadamente 712 KB.
- Não há regressão visual perceptível nem recurso ausente.
- Nenhum arquivo de imagem sem uso permanece no deploy.

## P2 — SEO e compartilhamento

- [x] Adicionar `meta description` ao portfólio.
- [x] Adicionar URL canônica ao portfólio.
- [x] Adicionar metadados Open Graph e Twitter Card ao portfólio.
- [x] Definir uma imagem de compartilhamento apropriada e otimizada.
- [x] Revisar título e descrição exibidos em mecanismos de busca e compartilhamentos.

Critérios de aceite:

- Título, descrição, canonical e imagem social usam URLs de produção.
- Os metadados não duplicam informações conflitantes.
- A imagem social retorna HTTP 200.

## Validação final obrigatória

- [x] Executar `git diff --check`.
- [x] Confirmar árvore de trabalho e listar qualquer alteração preexistente não relacionada.
- [x] Testar página inicial e portfólio em 320, 360, 390, 768 e 1440 px.
- [x] Confirmar ausência de rolagem horizontal.
- [x] Confirmar ausência de erros e avisos relevantes no console.
- [x] Confirmar ausência de recursos 404.
- [x] Confirmar que imagens publicáveis não contêm GPS.
- [x] Validar navegação por teclado e foco visível.
- [x] Revisar o diff completo antes de commit e push.
- [x] Registrar abaixo os commits e o que cada um concluiu.

## Registro de conclusão

| Data | Commit | Itens concluídos | Validação |
| --- | --- | --- | --- |
| 10/09/2026 | `4184505` | Remoção de EXIF/GPS, exclusão dos JPGs antigos e melhoria do portfólio móvel | Deploy, hashes, EXIF e breakpoints validados |
| 10/09/2026 | `f4420ef` | Simplificação dos títulos das skills | Deploy e layout responsivo validados |
| 10/09/2026 | `ea598b2` | Texto, terminologia, acessibilidade e ícones locais do portfólio | Breakpoints, `h1`, foco, contraste, console e recursos validados |
| 10/09/2026 | `b5ecb03` | Modal estreito, retorno de foco, JavaScript local, CSP e ícones sociais locais | Modal por botão/hash, botão, backdrop, `Esc`, teclado, console e 404 validados |
| 10/09/2026 | `351c92d` | Verificação local e automática de GPS em imagens | Imagens atuais aprovadas e imagem temporária com GPS detectada |
| 10/09/2026 | `a4015a9` | CSS local e CSP sem `unsafe-inline` | Cinco larguras, console, recursos e modal revalidados |
| 10/09/2026 | `7d0f28a` | Otimização das imagens e metadados SEO/social do portfólio | Tamanho, dimensões, qualidade visual, EXIF/GPS, breakpoints e imagem social validados |
| 10/09/2026 | `7ec4999` | Auditoria e plano de remoção das fotos com GPS do histórico | Todos os objetos, branches e tags auditados; nenhuma reescrita executada |
| 11/09/2026 | `8c91437` | Formulação durável da experiência profissional | Cinco larguras, modal, foco, console e recursos revalidados |
| 11/09/2026 | `be2fac7` | Reescrita autorizada do histórico e restauração da foto sanitizada | Auditoria de todos os blobs de imagem restantes sem GPS; envio protegido à `main` pendente |
