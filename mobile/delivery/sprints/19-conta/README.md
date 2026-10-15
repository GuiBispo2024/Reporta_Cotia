# 19 — Conta em duas páginas

A aba Conta concentra nome, foto e saída. O botão Segurança da conta abre outra página com e-mail, senha e exclusão; a seta do cabeçalho retorna ao perfil. A rota só existe com sessão autenticada.

## Testar no Android

1. Abra Conta: confira foto, nome e ausência de campos de senha e exclusão. Altere apenas o nome e salve; confirme o resultado ao reabrir o aplicativo.
2. Use câmera, galeria e remoção de foto. Cancelar a seleção deve preservar a imagem existente.
3. Abra Segurança da conta. Tente alterar e-mail sem senha atual: deve aparecer uma orientação. Informe a senha, salve e confirme o novo e-mail também no perfil ao voltar.
4. Teste nova senha curta, confirmação diferente e depois uma senha válida. Após sucesso, os três campos de senha devem ficar vazios. Saia e entre com a senha nova.
5. Em uma conta descartável, tente excluir sem senha; depois informe a senha e cancele a confirmação. A conta deve permanecer. Confirme a exclusão somente se desejar apagar essa conta e seus dados.
6. Saia da conta: a página de segurança deve desaparecer da navegação. O acesso de visitante pela aba Conta deve continuar oferecendo login e cadastro.

Testes automatizados cobrem navegação para segurança, edição do nome, validação de senha, limpeza dos campos, foto e falha/sucesso de exclusão. Aparência, teclado e navegação física ainda precisam ser conferidos no aparelho.
