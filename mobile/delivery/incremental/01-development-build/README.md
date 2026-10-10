# Etapa 1 — o que muda

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

[Voltar ao índice](../README.md)
