import { useEffect, useState } from 'react';
import { defaultReportImage } from '../utils/defaultReportImage';

export default function ImageCarousel({ images = [], fallback, alt, compact = false, setorResponsavel, categoria }) {
  const uploaded = (Array.isArray(images) ? images : []).filter(Boolean).slice(0, 4);
  if (!uploaded.length && fallback) uploaded.push(fallback);
  const isDefault = !uploaded.length;
  const available = isDefault ? [defaultReportImage(setorResponsavel, categoria)] : uploaded;
  const imageKey = available.join('|');
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [imageKey]);
  const move = direction => setActive(index => (index + direction + available.length) % available.length);
  return <div className={`rc-image-carousel ${compact ? 'is-compact' : ''}`}>
    <img src={available[active] || available[0]} alt={isDefault ? `Ilustração do serviço: ${setorResponsavel && setorResponsavel !== 'A definir' ? setorResponsavel : categoria || 'Serviços públicos'}` : `${alt}${available.length > 1 ? ` — imagem ${active + 1} de ${available.length}` : ''}`} />
    {available.length > 1 && <><button type="button" className="is-prev" onClick={() => move(-1)} aria-label="Imagem anterior"><i className="bi bi-chevron-left" /></button><button type="button" className="is-next" onClick={() => move(1)} aria-label="Próxima imagem"><i className="bi bi-chevron-right" /></button><span className="rc-carousel-counter">{active + 1}/{available.length}</span><div className="rc-carousel-dots">{available.map((_, index) => <button type="button" aria-label={`Ver imagem ${index + 1}`} className={index === active ? 'is-active' : ''} onClick={() => setActive(index)} key={index} />)}</div></>}
  </div>;
}
