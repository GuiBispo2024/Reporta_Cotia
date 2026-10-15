# 16 — Curtidas

Abra uma denúncia aprovada sem login: o contador aparece, mas a ação exige login. Entre, curta e confira o novo contador e o botão Descurtir. Reabra a tela e confirme que o estado persiste. Descurta. Faça o mesmo com outra conta para conferir o contador agregado.

Teste toque repetido e perda de rede: não há incremento otimista nem requisições simultâneas pela tela. Em falha, Atualizar curtidas consulta o estado verdadeiro no servidor antes de decidir repetir. O backend já possui unicidade por conta/denúncia; uma resposta ALREADY_LIKED é reconciliada com a API. Pendentes/rejeitadas não oferecem interações públicas. Validação Android físico pendente.
