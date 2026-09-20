import { useEffect, useRef } from 'react';

const focusableSelector = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export default function useDialogAccessibility(open, onClose) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const background = [];
    // Isolate only siblings, preserving the dialog and any parent overlay.
    let current = dialog;
    while (current.parentElement && current !== document.body) {
      for (const sibling of current.parentElement.children) {
        if (sibling !== current && !['SCRIPT', 'STYLE'].includes(sibling.tagName)) {
          background.push([sibling, sibling.hasAttribute('inert')]);
          sibling.setAttribute('inert', '');
        }
      }
      current = current.parentElement;
    }
    document.body.style.overflow = 'hidden';
    const controls = () => [...dialog.querySelectorAll(focusableSelector)].filter(el => !el.closest('[hidden], [inert], .d-none') && getComputedStyle(el).display !== 'none');
    (controls()[0] || dialog).focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current?.(); }
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0], last = items[items.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener('keydown', keydown);
    return () => {
      dialog.removeEventListener('keydown', keydown);
      background.forEach(([element, wasInert]) => { if (!wasInert) element.removeAttribute('inert'); });
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);
  return dialogRef;
}
