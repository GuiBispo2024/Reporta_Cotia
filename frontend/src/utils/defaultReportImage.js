const sectorImages = {
  'Secretaria de Infraestrutura e Obras': 'obras',
  'Secretaria de Mobilidade e Trânsito': 'transito',
  'Secretaria do Verde e Meio Ambiente': 'meio-ambiente',
  'Secretaria de Saúde': 'saude',
  'Secretaria de Educação': 'educacao',
  'Secretaria de Segurança Pública': 'seguranca',
  'Serviço de Iluminação Pública': 'iluminacao',
  'Limpeza Urbana e Zeladoria': 'limpeza',
  'Defesa Civil': 'defesa-civil'
};

const categoryImages = {
  'Buraco e pavimentação': 'obras',
  'Iluminação pública': 'iluminacao',
  'Limpeza urbana': 'limpeza',
  'Saneamento': 'saneamento',
  'Água e esgoto': 'saneamento',
  'Trânsito e sinalização': 'transito',
  'Árvore e área verde': 'meio-ambiente'
};

export function defaultReportImage(setorResponsavel, categoria) {
  const name = sectorImages[setorResponsavel] || categoryImages[categoria] || 'servicos-publicos';
  const apiUrl = (process.env.REACT_APP_API_URL || '').replace(/\/+$/, '');
  return `${apiUrl}/imagens_padrao/${name}.svg`;
}
