import { useEffect, useState } from 'react';

export default function ImageCarousel({ images = [], fallback, alt, compact = false }) {
  const available = (Array.isArray(images) && images.length ? images : [fallback]).filter(Boolean).slice(0, 4);
  const imageKey = available.join('|');
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [imageKey]);
  if (!available.length) return null;
  const move = direction => setActive(index => (index + direction + available.length) % available.length);
  return <div className={`rc-image-carousel ${compact ? 'is-compact' : ''}`}>
    <img src={available[active]} alt={`${alt}${available.length > 1 ? ` — imagem ${active + 1} de ${available.length}` : ''}`} />
    {available.length > 1 && <><button type="button" className="is-prev" onClick={() => move(-1)} aria-label="Imagem anterior"><i className="bi bi-chevron-left" /></button><button type="button" className="is-next" onClick={() => move(1)} aria-label="Próxima imagem"><i className="bi bi-chevron-right" /></button><span className="rc-carousel-counter">{active + 1}/{available.length}</span><div className="rc-carousel-dots">{available.map((_, index) => <button type="button" aria-label={`Ver imagem ${index + 1}`} className={index === active ? 'is-active' : ''} onClick={() => setActive(index)} key={index} />)}</div></>}
  </div>;
}
