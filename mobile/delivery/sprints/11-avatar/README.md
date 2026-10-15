# 11 — Foto do perfil

Na aba Conta, escolha uma foto pela galeria ou câmera. Cancele e confira que a foto anterior permanece. Envie, confira a imagem, saia e entre novamente. Substitua a imagem e depois remova confirmando o diálogo. Negue permissões e corte a rede: a tela deve explicar a falha e permitir nova tentativa. Atualizar perfil consulta a foto atual na API caso a resposta de uma alteração tenha sido perdida.

Fotos usam o processamento JPEG do app e o upload validado do backend. Perfil e access token continuam apenas em memória; somente a credencial de renovação é persistida no SecureStore. Testes em Android físico pendentes.
