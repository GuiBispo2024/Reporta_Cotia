# Entregas incrementais do mobile

Implementações em sequência, com um commit por etapa e um roteiro separado para cada entrega. A branch é mrcatt. Os commits são locais; nenhum push, deploy ou build remoto foi realizado.

| Etapa | Commit | Roteiro | Estado |
| --- | --- | --- | --- |
| 1 | 6ce4fdd | [Development build e EAS](01-development-build/README.md) | Configuração aprovada; APK depende da conta Expo |
| 2 | ed37607 | [Rascunhos e fotos](02-rascunhos/README.md) | Implementada |
| 3 | 9eebb44 | [Idempotência da API](03-idempotencia-api/README.md) | Implementada; migration aplicada no PostgreSQL local |
| 4 | e04bf10 | [Confirmação de envio](04-confirmacao-envio/README.md) | Implementada |
| 5 | b603f7c | [CI mobile](05-ci/README.md) | Implementada; execução no GitHub pendente de push |
| 6 | ee16e70 | [Diagnóstico e testes Android](06-validacao-android/README.md) | Diagnóstico implementado; validação física e ajustes pendentes |
| 7 | 3a00751 | [Navegação por abas](07-abas/README.md) | Implementada |
| 8 | f559d00 | [Recuperação de senha](08-recuperacao-senha/README.md) | Implementada; recebimento de e-mail depende do provedor |
| 9 | cc302a2 | [Gerenciamento da conta](09-conta/README.md) | Implementada |
| 10 | Commit desta entrega | [Correção e reenvio](10-correcao-denuncias/README.md) | Implementada |

Use `git log --oneline -10` para identificar também o hash da última entrega. Leia os roteiros na ordem e registre o resultado no seu aparelho; finalizar o código não confirma o teste físico. Para comparar commits, prefira um checkout separado: evite mudar a branch atual com alterações locais.

## Verificações locais

TypeScript, 5 testes de configuração e 63 testes Jest aprovados. Dois testes de leitura do cliente mobile passaram contra a API real com PostgreSQL. Backend: 206 testes aprovados; concorrência de envios confirmada no PostgreSQL com conta temporária removida ao concluir. Expo Doctor: 21/21. Bundles Hermes Android/iOS exportados.

APK/AAB/IPA, instalação física, envio real de e-mail, abertura de custom scheme no aparelho e execução remota do CI permanecem pendentes. A etapa 6 terá ajustes adicionais se os testes físicos revelarem problemas.

## Começar a testar sem conta Expo

Inicie `npm start` em backend (porta 8081) e `npm run start:lan` em mobile (porta 8082). Abra o QR code no Expo Go SDK 57 no mesmo Wi-Fi. API_BASE_URL em mobile/.env.development.local deve apontar para `http://IP_DO_COMPUTADOR:8081`. A configuração local atual usa 192.168.15.16; confirme com ipconfig caso a rede mude.

Para development build/APK, siga a etapa 1 depois de criar a conta Expo. A migration 202610100002-create-report-submissions.js precisa ser aplicada nos outros ambientes antes de usar o envio mobile novo. Execute `npm run db:migrate` no backend e reinicie a API. Os recursos atuais podem ser testados pelo Expo Go enquanto o APK não é gerado.
