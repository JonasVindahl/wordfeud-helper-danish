/**
 * Application Initialization Script
 * Moved from inline script to comply with Content Security Policy
 */


// Force reload with timestamp for cache busting
const timestamp = Date.now();
import('./main.js?v=' + timestamp);

// -------------------------------------------------
// Global analytics bootstrap (Umami) — privacy safe
// -------------------------------------------------
// Notes:
// - No user-entered text is ever sent; only lengths/booleans/enums.
// - Uses delegated listeners so new buttons/features are tracked automatically.
// - Runs regardless of whether the user has adblock; analytics.js is a no-op if Umami isn't loaded.

(async () => {
  const { track, trackPageLoad } = await import('./analytics.js');

  // Track only whitelisted text inputs by length (never content)
  const SAFE_TEXT_INPUT_IDS = new Set([
    'letters-input',
    'board-pattern-input',
  ]);

  // Track select changes where values are safe enums (update ids as needed)
  const SAFE_SELECT_IDS = new Set([
    'sort-select',
  ]);

  function getClickableLabel(el) {
    // Prefer explicit tracking label
    const ds = el?.dataset?.track;
    if (typeof ds === 'string' && ds.trim()) return ds.trim().slice(0, 60);

    // Then id / aria-label
    const id = el?.id;
    if (typeof id === 'string' && id.trim()) return id.trim().slice(0, 60);

    const aria = el?.getAttribute?.('aria-label');
    if (typeof aria === 'string' && aria.trim()) return aria.trim().slice(0, 60);

    // Finally visible text
    const text = el?.textContent;
    if (typeof text === 'string') {
      const t = text.trim().replace(/\s+/g, ' ');
      if (t) return t.slice(0, 60);
    }

    return 'unknown';
  }

  function setupGlobalAnalytics() {
    // One-time page load event
    trackPageLoad();

    // Track all button clicks + link clicks (delegated)
    document.addEventListener(
      'click',
      (e) => {
        const btn = e.target.closest('button');
        if (btn) {
          track('button_clicked', { button: getClickableLabel(btn) });
          return;
        }

        const a = e.target.closest('a');
        if (a) {
          let path;
          try {
            path = new URL(a.href, window.location.href).pathname;
          } catch {
            path = undefined;
          }

          track('link_clicked', {
            link: getClickableLabel(a),
            path,
          });
        }
      },
      { passive: true }
    );

    // Track safe text inputs by length only
    document.addEventListener(
      'input',
      (e) => {
        const t = e.target;
        if (!t) return;

        if (t.tagName === 'INPUT') {
          const type = (t.getAttribute('type') || 'text').toLowerCase();
          const isTextLike = type === 'text' || type === 'search';
          if (isTextLike && SAFE_TEXT_INPUT_IDS.has(t.id)) {
            track('text_input_changed', {
              field: t.id,
              length: String(t.value || '').length,
            });
          }
        } else if (t.tagName === 'TEXTAREA' && SAFE_TEXT_INPUT_IDS.has(t.id)) {
          track('text_input_changed', {
            field: t.id,
            length: String(t.value || '').length,
          });
        }
      },
      { passive: true }
    );

    // Track safe selects + toggles
    document.addEventListener(
      'change',
      (e) => {
        const t = e.target;
        if (!t) return;

        if (t.tagName === 'SELECT' && SAFE_SELECT_IDS.has(t.id)) {
          track('select_changed', {
            field: t.id,
            value: String(t.value).slice(0, 60),
          });
        }

        if (t.tagName === 'INPUT') {
          const type = (t.getAttribute('type') || '').toLowerCase();
          if ((type === 'checkbox' || type === 'radio') && t.id) {
            track('toggle_changed', {
              field: t.id,
              checked: !!t.checked,
            });
          }
        }
      },
      { passive: true }
    );

    // Basic error signals (helps you see broken sessions)
    window.addEventListener('error', (evt) => {
      try {
        track('js_error', {
          message: String(evt?.message || '').slice(0, 120),
          source: String(evt?.filename || '').slice(0, 120),
        });
      } catch {}
    });

    window.addEventListener('unhandledrejection', (evt) => {
      try {
        const reason = evt?.reason;
        track('promise_rejection', {
          message: String(reason?.message || reason || '').slice(0, 120),
        });
      } catch {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupGlobalAnalytics, { once: true });
  } else {
    setupGlobalAnalytics();
  }
})();
