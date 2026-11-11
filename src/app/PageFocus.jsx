import { useEffect } from 'react';

/** Presenta cada vista nueva sin robar foco durante actualizaciones o diálogos. */
export default function PageFocus() {
  useEffect(() => {
    const root = document.getElementById('root') || document.body;
    let lastHeading = null, timer;
    function focusHeading() {
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      const heading = root.querySelector('main h1') || root.querySelector('h1');
      if (!heading || heading === lastHeading) return;
      lastHeading = heading;
      if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
      heading.focus();
    }
    const schedule = () => { clearTimeout(timer); timer = setTimeout(focusHeading, 0); };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    schedule();
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, []);
  return null;
}
