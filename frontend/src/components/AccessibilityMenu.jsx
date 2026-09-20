import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'reportaAccessibility';
const DEFAULTS = { fontScale: 100, contrast: false, darkMode: false, readable: false, reducedMotion: false };
const systemDefaults = () => ({ ...DEFAULTS,
  darkMode: window.matchMedia?.('(prefers-color-scheme: dark)')?.matches || false,
  reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false
});

export function normalizeAccessibility(value, fallback = DEFAULTS) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...fallback };
  const result = { ...fallback };
  for (const key of ['contrast', 'darkMode', 'readable', 'reducedMotion']) {
    if (typeof value[key] === 'boolean') result[key] = value[key];
  }
  if (typeof value.fontScale === 'number' && Number.isFinite(value.fontScale)) {
    result.fontScale = Math.min(200, Math.max(100, Math.round(value.fontScale / 10) * 10));
  }
  if (result.contrast) result.darkMode = false;
  return result;
}

function readSettings() {
  try { return normalizeAccessibility(JSON.parse(localStorage.getItem(STORAGE_KEY)), systemDefaults()); }
  catch { return systemDefaults(); }
}

export default function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(readSettings);
  const [notice, setNotice] = useState('');
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const close = () => { setOpen(false); triggerRef.current?.focus(); };

  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${settings.fontScale}%`;
    root.classList.toggle('rc-large-text', settings.fontScale > 100);
    root.classList.toggle('rc-high-contrast', settings.contrast);
    root.classList.toggle('rc-dark', settings.darkMode);
    root.classList.toggle('rc-readable-font', settings.readable);
    root.classList.toggle('rc-reduced-motion', settings.reducedMotion);
    root.dataset.rcMotion = settings.reducedMotion ? 'reduced' : 'full';
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }
    catch { setNotice('Ajustes aplicados. Este navegador não permite salvá-los para a próxima visita.'); }
  }, [settings]);

  useEffect(() => {
    const sync = event => {
      if (event.key === STORAGE_KEY || event.key === null) setSettings(readSettings());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    if (open) panelRef.current?.querySelector('button')?.focus();
  }, [open]);

  const toggle = key => setSettings(current => {
    const next = { ...current, [key]: !current[key] };
    if (key === 'darkMode' && next.darkMode) next.contrast = false;
    if (key === 'contrast' && next.contrast) next.darkMode = false;
    return next;
  });

  return <div className="rc-accessibility" onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); close(); }
  }}>
    <button ref={triggerRef} type="button" className="rc-accessibility-trigger" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="accessibility-panel" aria-label={open ? 'Fechar recursos de acessibilidade' : 'Abrir recursos de acessibilidade'}><i className="bi bi-universal-access" aria-hidden="true" /></button>
    {open && <section ref={panelRef} id="accessibility-panel" className="rc-accessibility-panel" aria-labelledby="accessibility-title">
      <header><h2 id="accessibility-title">Acessibilidade</h2><button type="button" onClick={close} aria-label="Fechar painel de acessibilidade"><i className="bi bi-x-lg" aria-hidden="true" /></button></header>
      <p className="rc-accessibility-help">Ajuste a leitura em todas as páginas. Suas preferências ficam salvas neste navegador.</p>
      <div className="rc-font-controls" role="group" aria-label="Tamanho do texto">
        <span>Tamanho do texto</span>
        <button type="button" aria-label="Diminuir texto" disabled={settings.fontScale <= 100} onClick={() => setSettings(current => ({ ...current, fontScale: Math.max(100, current.fontScale - 10) }))}>A−</button>
        <output aria-live="polite" aria-label="Tamanho atual do texto">{settings.fontScale}%</output>
        <button type="button" aria-label="Aumentar texto" disabled={settings.fontScale >= 200} onClick={() => setSettings(current => ({ ...current, fontScale: Math.min(200, current.fontScale + 10) }))}>A+</button>
      </div>
      <label><input type="checkbox" checked={settings.contrast} onChange={() => toggle('contrast')} /><span>Alto contraste<small>Texto preto, fundo branco e links destacados.</small></span></label>
      <label><input type="checkbox" checked={settings.darkMode} onChange={() => toggle('darkMode')} /><span>Modo escuro<small>Fundos escuros para uma leitura confortável.</small></span></label>
      <p className="rc-accessibility-help">Modo escuro e alto contraste são alternativas: ativar um desativa o outro.</p>
      <label><input type="checkbox" checked={settings.readable} onChange={() => toggle('readable')} /><span>Facilitar a leitura<small>Fonte simples e mais espaço entre linhas.</small></span></label>
      <label><input type="checkbox" checked={settings.reducedMotion} onChange={() => toggle('reducedMotion')} /><span>Reduzir animações<small>Suaviza movimentos e desativa a rolagem animada.</small></span></label>
      <button type="button" className="btn btn-outline-secondary w-100 mt-2" onClick={() => { setSettings(systemDefaults()); setNotice('Preferências restauradas. Tema e animações seguem as preferências do dispositivo.'); }}>Restaurar preferências</button>
      <p className="rc-accessibility-help mb-0 mt-2" role="status" aria-label="Avisos de acessibilidade">{notice || 'Use Tab para navegar e Esc para fechar este painel.'}</p>
    </section>}
  </div>;
}
