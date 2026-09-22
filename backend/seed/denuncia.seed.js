const { Denuncia } = require('../models/rel');
const DenunciaService = require('../services/DenunciaService');

// Dados fictícios para demonstração; não representam ocorrências reais.
const scenarios = [
  { key: 'obras', titulo: 'Buraco próximo ao ponto de ônibus', categoria: 'Buraco e pavimentação', localizacao: 'Rua Exemplo, 120 — Centro, Cotia', descricao: 'A pavimentação cedeu junto ao ponto e dificulta o embarque dos passageiros.', setor: 'Secretaria de Infraestrutura e Obras', andamento: 'em_andamento' },
  { key: 'iluminacao', titulo: 'Postes apagados na praça do bairro', categoria: 'Iluminação pública', localizacao: 'Praça Exemplo — Jardim dos Ipês, Cotia', descricao: 'Dois postes permanecem apagados à noite, deixando a passagem de pedestres escura.', setor: 'Serviço de Iluminação Pública', andamento: 'resolvida' },
  { key: 'limpeza', titulo: 'Descarte irregular de resíduos na calçada', categoria: 'Limpeza urbana', localizacao: 'Rua Modelo, 45 — Granja Viana, Cotia', descricao: 'Sacos de lixo e entulho estão bloqueando parte da calçada.', setor: 'Limpeza Urbana e Zeladoria' },
  { key: 'saneamento', titulo: 'Bueiro obstruído após chuva', categoria: 'Saneamento', localizacao: 'Rua Demonstração, 80 — Caucaia do Alto, Cotia', descricao: 'A água se acumula na esquina porque o bueiro está obstruído.' },
  { key: 'agua', titulo: 'Vazamento de água junto ao meio-fio', categoria: 'Água e esgoto', localizacao: 'Rua Modelo, 210 — Centro, Cotia', descricao: 'Há vazamento contínuo de água na via desde a manhã.', status: 'pendente' },
  { key: 'transito', titulo: 'Faixa de pedestres com pintura apagada', categoria: 'Trânsito e sinalização', localizacao: 'Rua Exemplo, 300 — Granja Viana, Cotia', descricao: 'A faixa em frente ao ponto de ônibus está pouco visível.', setor: 'Secretaria de Mobilidade e Trânsito', andamento: 'em_andamento' },
  { key: 'arvore', titulo: 'Galho caído sobre passagem de pedestres', categoria: 'Árvore e área verde', localizacao: 'Praça Modelo — Caucaia do Alto, Cotia', descricao: 'Um galho de grande porte caiu e ocupa a passagem da praça.', setor: 'Secretaria do Verde e Meio Ambiente', andamento: 'resolvida' },
  { key: 'outros', titulo: 'Estrutura com risco de queda', categoria: 'Outros', localizacao: 'Rua Demonstração, 15 — Centro, Cotia', descricao: 'Uma estrutura junto à calçada apresenta inclinação e precisa de avaliação.', setor: 'Defesa Civil' },
  { key: 'rejeitada', titulo: 'Problema na rua sem referência de localização', categoria: 'Outros', localizacao: 'Cotia, sem indicação de rua', descricao: 'Existe um problema na rua, mas ainda não informei o endereço.', status: 'rejeitada', motivo: 'Informe a rua e um ponto de referência para que o serviço responsável possa localizar o problema.' },
  { key: 'censura', titulo: 'Lixo acumulado precisa de avaliação', categoria: 'Limpeza urbana', localizacao: 'Rua Exemplo, 500 — Centro, Cotia', descricao: 'Esta merda de lixo está bloqueando a calçada há dias.', status: 'pendente' }
];

const neighborhoods = {
  obras: 'Centro',
  iluminacao: 'Jardim dos Ipês',
  limpeza: 'Granja Viana',
  saneamento: 'Caucaia do Alto',
  agua: 'Centro',
  transito: 'Granja Viana',
  arvore: 'Caucaia do Alto',
  outros: 'Centro',
  censura: 'Centro'
};

module.exports = async ({ users }) => {
  const reports = {};
  for (const [index, scenario] of scenarios.entries()) {
    const { key, setor, andamento, status = 'aprovada', motivo, ...data } = scenario;
    const author = index % 2 ? users.neighbor : users.citizen;
    let report = await Denuncia.findOne({ where: { userId: author.id, titulo: data.titulo } });
    if (!report) {
      ({ denuncia: report } = await DenunciaService.create({ ...data, bairro: neighborhoods[key] || null, imageUrl: null, imageUrls: [] }, author));
      if (status !== 'pendente') await DenunciaService.moderar(report.id, status, motivo, users.moderator.id);
      if (setor) {
        await DenunciaService.atualizarResolucao(report.id, andamento ? 'em_andamento' : 'aberta', { setorResponsavel: setor }, users.moderator.id);
        if (andamento === 'resolvida') await DenunciaService.atualizarResolucao(report.id, 'resolvida', { setorResponsavel: setor }, users.moderator.id);
      }
      await report.reload();
    }
    reports[key] = report;
  }
  return reports;
};
