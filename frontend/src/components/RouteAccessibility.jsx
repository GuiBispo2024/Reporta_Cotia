import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function RouteAccessibility() {
  const { pathname, hash } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (!main) return;
    const changed = previousPath.current !== pathname;
    previousPath.current = pathname;
    if (changed && !hash) main.focus({ preventScroll: true });
    const updateTitle = () => {
      const title = main.querySelector('h1')?.textContent?.trim();
      document.title = title ? `${title} | Reporta Cotia` : 'Reporta Cotia';
    };
    updateTitle();
    const observer = new MutationObserver(updateTitle);
    observer.observe(main, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [pathname, hash]);
  return null;
}
