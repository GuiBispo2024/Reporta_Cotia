# Etapa 4 — envio seguro

1. Com a migration aplicada e a API reiniciada, envie normalmente e confira um protocolo.
2. Prepare uma denúncia, desconecte a rede antes de enviar e tente enviar. Os campos ficam preservados e bloqueados enquanto o resultado estiver incerto.
3. Feche/reabra o app, recupere a rede e toque "Confirmar envio pendente". Deve existir somente um protocolo em "Minhas denúncias".
4. Para simular resposta perdida depois da gravação, use um proxy de desenvolvimento que interrompa a resposta de POST /denuncia. Ao confirmar, o app deve recuperar o protocolo existente, sem criar outro.
5. Uma rejeição 400 de validação permite corrigir os campos. Erros de rede/servidor preservam a chave e exigem confirmação. Se um anexo pendente desaparecer, o app consulta o comprovante, mas não reenvia conteúdo diferente.

O identificador e as fotos são gravados antes da requisição. Não desinstale nem limpe os dados do app com um envio pendente: isso remove a chave local; consulte "Minhas denúncias" antes de começar outro envio.

[Voltar ao índice](../README.md)
