/**
 * Analytics wrapper for Umami tracking
 * NO DOM, NO listeners, NO state
 */

function isStandalone() {
  if (window.navigator.standalone === true) return true;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  return false;
}

export function track(eventName, data = {}) {
  if (!window.umami) return;

  const payload = {
    ...data,
    standalone: isStandalone(),
    lang: navigator.language,
  };

  window.umami.track(eventName, payload);

  if (window.__ANALYTICS_DEBUG__ === true) {
    console.log('[analytics]', eventName, payload);
  }
}

export function trackPageLoad() {
  track('page_load', {
    screen_width: window.screen.width,
    screen_height: window.screen.height,
  });
}

// (valgfrie domæne-events)
export const trackSolveClicked = (d) => track('solve_clicked', d);
export const trackSolveCompleted = (d) => track('solve_completed', d);
export const trackWordCopied = () => track('word_copied');
export const trackHelpOpened = () => track('help_opened');
export const trackPWAInstalled = () => track('pwa_installed');