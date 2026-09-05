import { useEffect, useState } from 'react';

const DEFAULTS = { fontScale: 100, contrast: false, readable: false, reducedMotion: false };

export default function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('reportaAccessibility') || '{}') }; }
    catch { return DEFAULTS; }
  });
  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${settings.fontScale}%`;
    root.classList.toggle('rc-high-contrast', settings.contrast);
    root.classList.toggle('rc-readable-font', settings.readable);
    root.classList.toggle('rc-reduced-motion', settings.reducedMotion);
    localStorage.setItem('reportaAccessibility', JSON.stringify(settings));
  }, [settings]);
  useEffect(() => {
    const identifyMain = () => {
      const main = document.querySelector('main');
      if (main) { main.id = 'main-content'; main.tabIndex = -1; }
    };
    identifyMain();
    const observer = new MutationObserver(identifyMain);
    observer.observe(document.getElementById('root'), { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  const toggle = key => setSettings(current => ({ ...current, [key]: !current[key] }));
  return <div className="rc-accessibility"><button className="rc-accessibility-trigger" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label="Abrir recursos de acessibilidade"><i className="bi bi-universal-access" /></button>{open && <section className="rc-accessibility-panel" aria-label="Recursos de acessibilidade"><header><strong>Acessibilidade</strong><button onClick={() => setOpen(false)} aria-label="Fechar"><i className="bi bi-x-lg" /></button></header><div className="rc-font-controls"><span>Tamanho do texto</span><button onClick={() => setSettings(current => ({ ...current, fontScale: Math.max(85, current.fontScale - 10) }))}>A−</button><strong>{settings.fontScale}%</strong><button onClick={() => setSettings(current => ({ ...current, fontScale: Math.min(130, current.fontScale + 10) }))}>A+</button></div><label><input type="checkbox" checked={settings.contrast} onChange={() => toggle('contrast')} /> Alto contraste</label><label><input type="checkbox" checked={settings.readable} onChange={() => toggle('readable')} /> Fonte mais legível</label><label><input type="checkbox" checked={settings.reducedMotion} onChange={() => toggle('reducedMotion')} /> Reduzir animações</label><button className="btn btn-outline-secondary btn-sm w-100 mt-2" onClick={() => setSettings(DEFAULTS)}>Restaurar padrão</button></section>}</div>;
}
