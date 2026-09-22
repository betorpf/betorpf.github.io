# Academia

Aplicação estática para acompanhar a constância semanal na academia. Abra `/academia/` no site ou sirva a pasta do repositório com um servidor HTTP local, por exemplo `python -m http.server 8000` na raiz e acesse `http://localhost:8000/academia/`.

Os treinos e preferências ficam apenas no `localStorage` do navegador, na chave `academiaTrackerData`. Cada dia pode ter no máximo um treino. As semanas começam no domingo; a sequência atual considera semanas completas anteriores e a semana em curso quando ela já atingiu a meta. A média anual usa as semanas transcorridas no ano até hoje.

Use **Registrar outra data** para ir ao calendário e marcar ou corrigir treinos anteriores. As datas futuras ficam indisponíveis. Em **Configurações**, escolha o modo automático, claro ou escuro e uma das oito paletas; essas escolhas não alteram o histórico.

Em **Backup**, exporte um JSON para guardar os dados ou importá-los em outro navegador. A restauração valida o arquivo inteiro e pede confirmação antes de substituir os dados locais. Não há sincronização automática.

## Testes

Com Node.js 20 ou superior, na raiz do repositório:

```sh
node --test academia/test/core.test.mjs
```

O app usa HTML, CSS e módulos JavaScript nativos, sem processo de build nem dependências externas.
