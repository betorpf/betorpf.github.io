# Plano de remoção de fotos com GPS do histórico

## Resultado da auditoria

Auditoria executada em 10/09/2026 sobre todos os objetos alcançáveis por branches e tags locais/remotos.

- Branches controladas pelo projeto: `main` e `origin/main`.
- Tags: nenhuma.
- Blobs históricos de imagem examinados: 13.
- Blobs com GPS encontrados: 3.

| Blob | Caminho histórico | Commits relacionados |
| --- | --- | --- |
| `a927b053626dca44c306114a57780c2b9be80597` | `portfolio/img/profile-2025-2x3.jpg` | `95b80a3`, `4184505` |
| `46e639caa36171223d703014a2639bef988448a0` | `portfolio/img/profile-2025-original.jpg` | `3f50109`, `95b80a3`, `4184505` |
| `c2569be112805175872a2d299ab6e8e5a94587fa` | `portfolio/img/profile.jpg` | `fdbd020`, `55165cb`, `4184505` |

O arquivo ativo atual passou na verificação e não contém GPS. O problema está nas versões antigas ainda alcançáveis pelo histórico da branch principal.

## Procedimento proposto

Este procedimento reescreve IDs de commits e exige force-push. Ele só pode ser executado após autorização explícita.

1. Avisar colaboradores para interromper pushes e criar uma cópia de segurança do repositório.
2. Guardar fora do clone uma cópia da foto ativa já sanitizada.
3. Criar um clone espelho novo e instalar `git-filter-repo` por uma fonte confiável.
4. Remover de todos os refs as quatro rotas históricas de fotos:

   ```bash
   git filter-repo --invert-paths \
     --path portfolio/img/profile-2025-2x3.jpg \
     --path portfolio/img/profile-2025-original.jpg \
     --path portfolio/img/profile-2025.jpg \
     --path portfolio/img/profile.jpg
   ```

5. Em um clone de trabalho baseado no histórico limpo, recolocar somente `portfolio/img/profile-2025-2x3.jpg`, usando a cópia sanitizada, e criar um novo commit normal.
6. Repetir a auditoria de todos os objetos e confirmar zero blobs com GPS.
7. Com a autorização final já concedida, atualizar as branches e tags controladas pelo projeto com force-push explícito. Não usar `--mirror` sem revisar refs especiais.
8. Recriar clones e worktrees locais; colaboradores não devem fazer merge de branches antigas, pois isso pode reintroduzir os objetos removidos.

## Limitações e ações posteriores

A limpeza dos refs do repositório não garante remoção imediata de forks, clones locais, pull requests fechados, caches, artefatos de CI, URLs de objetos ou retenção interna do GitHub. Após o force-push, é necessário:

- verificar branches, tags, releases, Actions e pull requests no GitHub;
- solicitar que proprietários de forks ou clones descartem o histórico antigo;
- aguardar a coleta de lixo do GitHub e, se os objetos continuarem acessíveis, abrir uma solicitação ao GitHub Support informando os IDs dos blobs sensíveis;
- trocar a foto por outra sem informação de localização caso exista risco de cópias externas permanentes.

Nenhum comando de reescrita ou force-push foi executado durante esta auditoria.
