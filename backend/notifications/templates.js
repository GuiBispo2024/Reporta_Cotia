const templates = Object.freeze({
  aprovada: { title: 'Denúncia aprovada', body: 'Sua denúncia foi aprovada e está visível para a comunidade.' },
  rejeitada: { title: 'Atualização da sua denúncia', body: 'Sua denúncia foi rejeitada. Consulte o motivo no aplicativo.' },
  em_andamento: { title: 'Atendimento iniciado', body: 'Sua denúncia está em andamento.' },
  resolvida: { title: 'Denúncia resolvida', body: 'Sua denúncia foi marcada como resolvida.' }
});
module.exports = templates;
