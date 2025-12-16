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

  // Respect Do Not Track
  const DNT = (navigator.doNotTrack === '1' || window.doNotTrack === '1');
// Don't early-return — just skip sending

  // Never track anything inside results areas (prevents accidental word/board leakage)
  const RESULTS_EXCLUDE_SELECTOR = '#results-section, #results-table, [data-analytics-exclude="results"]';

function safeTrack(name, props) {
  if (DNT) return;
  track(name, props);
}

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
    // Prefer explicit tracking label (you control this)
    const ds = el?.dataset?.track;
    if (typeof ds === 'string' && ds.trim()) return ds.trim().slice(0, 60);

    // Then id / aria-label (also under your control)
    const id = el?.id;
    if (typeof id === 'string' && id.trim()) return id.trim().slice(0, 60);

    const aria = el?.getAttribute?.('aria-label');
    if (typeof aria === 'string' && aria.trim()) return aria.trim().slice(0, 60);

    // Never fall back to textContent (could contain suggested words)
    return 'unlabeled';
  }

  async function setupGlobalAnalytics() {
    // Mark session start (general usage)
    safeTrack('session_start', {
      path: window.location.pathname,
    });

    // One-time page load event (flush queue right after)
    try { trackPageLoad(); } catch {}

    // Track that the app is visible (general usage)
    safeTrack('page_visible', { path: window.location.pathname });

    // Track all button clicks + link clicks (delegated)
    document.addEventListener(
      'click',
      (e) => {
        const target = e.target;
        if (!target) return;

        // Never track clicks inside results
        if (target.closest?.(RESULTS_EXCLUDE_SELECTOR)) return;

        const btn = target.closest('button');
        if (btn) {
          const label = getClickableLabel(btn);
          if (label !== 'unlabeled') {
            safeTrack('button_clicked', { button: label });
          }
          return;
        }

        const a = target.closest('a');
        if (a) {
          const label = getClickableLabel(a);
          if (label !== 'unlabeled') {
            let path;
            try {
              path = new URL(a.href, window.location.href).pathname;
            } catch {
              path = undefined;
            }

            safeTrack('link_clicked', {
              link: label,
              path,
            });
          }
        }
      },
      { passive: true, capture: true }
    );

    // Track safe text inputs by length only (debounced)
    const inputTimers = new Map();

    document.addEventListener(
      'input',
      (e) => {
        const t = e.target;
        if (!t) return;

        // Never track typing inside results
        if (t.closest?.(RESULTS_EXCLUDE_SELECTOR)) return;

        let fieldId = null;
        let length = null;

        if (t.tagName === 'INPUT') {
          const type = (t.getAttribute('type') || 'text').toLowerCase();
          const isTextLike = type === 'text' || type === 'search';
          if (isTextLike && SAFE_TEXT_INPUT_IDS.has(t.id)) {
            fieldId = t.id;
            length = String(t.value || '').length;
          }
        } else if (t.tagName === 'TEXTAREA' && SAFE_TEXT_INPUT_IDS.has(t.id)) {
          fieldId = t.id;
          length = String(t.value || '').length;
        }

        if (!fieldId) return;

        // Debounce per field
        if (inputTimers.has(fieldId)) {
          clearTimeout(inputTimers.get(fieldId));
        }

        inputTimers.set(
          fieldId,
          setTimeout(() => {
            safeTrack('text_input_changed', {
              field: fieldId,
              length,
            });
            inputTimers.delete(fieldId);
          }, 600)
        );
      },
      { passive: true }
    );

    // Track safe selects + toggles
    document.addEventListener(
      'change',
      (e) => {
        const t = e.target;
        if (!t) return;

        if (t.closest?.(RESULTS_EXCLUDE_SELECTOR)) return;

        if (t.tagName === 'SELECT' && SAFE_SELECT_IDS.has(t.id)) {
          safeTrack('select_changed', {
            field: t.id,
            value: String(t.value).slice(0, 60),
          });
        }

        if (t.tagName === 'INPUT') {
          const type = (t.getAttribute('type') || '').toLowerCase();
          if ((type === 'checkbox' || type === 'radio') && t.id) {
            safeTrack('toggle_changed', {
              field: t.id,
              checked: !!t.checked,
            });
          }
        }
      },
      { passive: true }
    );

    // Visibility tracking (general usage)
    document.addEventListener('visibilitychange', () => {
      safeTrack(document.hidden ? 'page_hidden' : 'page_visible', {
        path: window.location.pathname,
      });
    });

    // Basic error signals (helps you see broken sessions)
    window.addEventListener('error', (evt) => {
      try {
        safeTrack('js_error', {
          message: String(evt?.message || '').slice(0, 120),
          source: String(evt?.filename || '').slice(0, 120),
        });
      } catch {}
    });

    window.addEventListener('unhandledrejection', (evt) => {
      try {
        const reason = evt?.reason;
        safeTrack('promise_rejection', {
          message: String(reason?.message || reason || '').slice(0, 120),
        });
      } catch {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { void setupGlobalAnalytics(); }, { once: true });
  } else {
    void setupGlobalAnalytics();
  }
})();
