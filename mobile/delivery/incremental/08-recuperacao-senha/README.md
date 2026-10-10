# Etapa 8 — senha

Em Entrar, use Esqueci minha senha. Solicite as instruções, copie o link do e-mail e use Já recebi o link para colá-lo no app. Informe e confirme a nova senha. Teste senha divergente, link expirado e reutilização do link; depois entre com a nova senha. A senha antiga e as sessões antigas devem ser recusadas.

O mesmo e-mail permite redefinir pelo site; o app extrai somente o token, sem abrir ou requisitar a URL colada. O development build aceita `reportacotia-development://redefinir-senha?token=...` (produção: reportacotia), mas o e-mail atual continua com o link web. Custom scheme exige app instalado; o fluxo de copiar/colar também funciona no Expo Go. Não há associação de Universal/App Links nesta etapa.

O backend já usa token de 30 minutos, hash no banco e uso único. Configure RESEND_API_KEY, RESET_EMAIL_FROM e FRONTEND_URL corretos no backend para receber o e-mail, inclusive em desenvolvimento. Sem provedor, a resposta permanece genérica e a falha fica no histórico administrativo, sem imprimir link/token no console. O envio real de e-mail depende dessa configuração e ainda precisa ser conferido; nos testes isolados o token é fornecido apenas em NODE_ENV=test.

[Voltar ao índice](../README.md)
