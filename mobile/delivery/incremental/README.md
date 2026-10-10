# Entregas incrementais do mobile — roteiro de testes

Cada etapa tem seu commit e instruções de teste. As implementações seguem em sequência, conforme a preferência escolhida, e podem ser conferidas por funcionalidade ou pelo commit correspondente. Geração de APK e testes físicos são registrados separadamente das verificações locais.

| Etapa | Entrega | Estado |
| --- | --- | --- |
| 1 | Development build e perfis de distribuição | Configuração, Expo Doctor e Prebuild Android aprovados; APK pendente |
| 2 | Rascunhos persistentes com fotos | Implementada; testar fechamento e reabertura no Android |
| 3 | Idempotência no backend | Planejada |
| 4 | Envio mobile com prevenção de duplicidade | Planejada |
| 5 | Verificações mobile no CI | Planejada |
| 6 | Ajustes após testes em aparelhos | Depende dos testes reais |
| 7 | Navegação por abas | Planejada |
| 8 | Recuperação de senha | Planejada |
| 9 | Gerenciamento e exclusão da conta | Planejada |
| 10 | Edição e reenvio de denúncias rejeitadas | Planejada |

## Etapa 1 — o que muda

O app pode ser instalado como development build com seu próprio nome e identificador, usando `expo-dev-client`. Esse build abre o launcher e carrega o código do Metro. A tela e os recursos existentes continuam iguais nesta etapa. A configuração foi preparada conforme https://docs.expo.dev/develop/development-builds/introduction/.

Os perfis estão em `mobile/eas.json`:

- `development`: app de desenvolvimento para celular Android/iOS; Android gera APK debug.
- `development-simulator`: development build para simulador iOS, separado do celular físico.
- `staging`: distribuição interna com bundle embarcado, sem depender do Metro; exige API HTTPS de homologação.
- `production`: artefato para as lojas; Android AAB.

Staging e production usam numeração de build gerenciada pelo EAS e incremento automático. Isso não altera a versão pública `0.1.0`.

## Preparar a conta e gerar o APK

Na pasta `mobile`, execute:

```powershell
npx eas-cli login
npx eas-cli init
```

Como `app.config.js` é dinâmico, o EAS pode pedir para incluir manualmente o `projectId` em `extra.eas`. Use somente o ID real retornado pelo comando. Não envie senha ou token pelo chat. A conta do Expo é separada da conta de cidadão do Reporta Cotia.

Configure `API_BASE_URL` no ambiente EAS `development` com o endereço alcançável pelo celular. Para a rede local atual, a API foi configurada como `http://192.168.15.16:8081`; confirme o IP com `ipconfig`. Arquivos `.env.development.local` não são enviados para o build remoto. Essa URL é pública, nunca use JWT ou senha nela.

```powershell
npx eas-cli env:create --environment development --name API_BASE_URL --value http://192.168.15.16:8081 --visibility plaintext
npx eas-cli build --platform android --profile development
```

O build remoto usa a conta e os limites do EAS. A geração ainda não foi iniciada nesta entrega. Após terminar, abra o link fornecido pelo EAS no Android e instale o APK.

## Testar o development build no Android

1. Inicie o backend com `npm start` em `backend`.
2. Na pasta `mobile`, execute `npm run start:dev-client`.
3. Deixe o celular e o computador na mesma rede Wi-Fi. Abra o app instalado **Reporta Cotia (development)** e use o QR code do terminal; no launcher também é possível informar `http://IP_DO_COMPUTADOR:8082`.
4. Confira lista pública, login e "Minhas denúncias". Teste câmera e localização com permissão aceita e negada. Para enviar dados, use o banco de desenvolvimento.
5. Feche e reabra o app e confira a restauração da sessão; depois saia da conta.

Registre o modelo do Android, a versão do sistema e o resultado de cada item. Logs devem ser compartilhados sem tokens, senhas ou dados pessoais.

## Continuar testando com Expo Go

Se ainda não tiver o APK, use `npm run start:lan` e abra `exp://IP_DO_COMPUTADOR:8082` no Expo Go SDK 57. Não execute os dois comandos de Metro simultaneamente na porta 8082. Novas dependências nativas em etapas futuras podem exigir gerar um novo APK de desenvolvimento.

## Critério para concluir a etapa 1

A configuração e as verificações locais devem passar; o APK deve ser gerado, instalado e abrir o app no aparelho real. Configurar perfis ou exportar bundles não comprova compilação nativa. iOS físico exige assinatura Apple; a validação inicial deste roteiro é Android.

## Etapa 2 — rascunhos

1. Entre, abra nova denúncia, preencha textos e coordenadas, adicione uma foto e espere "Rascunho salvo".
2. Volte à lista e reabra a criação. Depois feche o app pelo Android e reabra: confira todos os campos e a foto.
3. Saia da conta e entre em outra: o rascunho anterior não deve aparecer. Retorne à primeira conta para recuperá-lo.
4. Use "Descartar rascunho", confirme e confira os campos vazios. Envie uma denúncia válida: após confirmação do protocolo, o rascunho deve ser removido.
5. Se faltar espaço ou uma foto ficar indisponível, confira o aviso; não trate o aviso como confirmação de envio.

Há um rascunho por conta/API no aparelho. Ele contém textos, coordenadas e fotos no armazenamento privado do aplicativo, sem senha ou token. Desinstalar o aplicativo ou limpar seus dados remove os rascunhos. Dependências nativas adicionadas: expo-file-system e expo-crypto; gere novo development build quando já tiver a conta EAS.
