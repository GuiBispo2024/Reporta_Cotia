# Etapa 5 — CI

Na pasta mobile, execute `npm ci` e `npm run check`. O workflow validate.yml faz esses checks, Expo Doctor e exportação dos bundles Android/iOS em configuração production, e guarda os bundles por 7 dias. A URL de API no CI é um domínio reservado inválido para que os testes não enviem dados a produção; o artefato é de verificação e não deve ser distribuído como app.

Depois de enviar a branch ao GitHub, confira o job mobile na aba Actions. O CI não gera APK, não faz deploy e não precisa de credencial Expo. Testes que exigem API local estão separados e não são ativados nesse job. A execução remota ainda não ocorreu nesta entrega local.

[Voltar ao índice](../README.md)
