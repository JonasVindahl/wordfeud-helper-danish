/**
 * Analytics wrapper for Umami tracking
 * Privacy-friendly, no cookies, no personal data
 *
 * This file MUST stay side-effect free:
 * - No DOM listeners
 * - No imports of app code
 * - Only explicit function calls
 */

/**
 * Check if app is running in standalone mode (PWA)
 */
function isStandalone() {
    // iOS standalone
    if (window.navigator.standalone === true) {
        return true;
    }

    // Android / Desktop PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
    }

    return false;
}

/**
 * Core tracking helper
 * @param {string} eventName
 * @param {Object} data
 */
export function track(eventName, data = {}) {
    if (!window.umami) {
        if (window.__ANALYTICS_DEBUG__ === true) {
            console.warn('[analytics] Umami not loaded, skipping:', eventName);
        }
        return;
    }

    try {
        const payload = {
            ...data,
            standalone: isStandalone(),
            lang: navigator.language,
        };

        window.umami.track(eventName, payload);

        if (window.__ANALYTICS_DEBUG__ === true) {
            console.log('[analytics]', eventName, payload);
        }
    } catch (err) {
        if (window.__ANALYTICS_DEBUG__ === true) {
            console.warn('[analytics] Failed to track', eventName, err);
        }
    }
}

/* -----------------------------
   Domain-specific events
   ----------------------------- */

/**
 * User clicked "solve / find words"
 */
export function trackSolveClicked({ lettersCount, jokerCount, patternUsed }) {
    track('solve_clicked', {
        letters_count: lettersCount,
        joker_count: jokerCount,
        pattern_used: patternUsed,
    });
}

/**
 * Solver finished and results are shown
 */
export function trackSolveCompleted({ resultsCount, solveTimeMs }) {
    track('solve_completed', {
        results_count: resultsCount,
        solve_time_ms: solveTimeMs,
    });
}

/**
 * User copied a word
 */
export function trackWordCopied() {
    track('word_copied');
}

/**
 * Help / guide opened
 */
export function trackHelpOpened() {
    track('help_opened');
}

/**
 * PWA installed
 */
export function trackPWAInstalled() {
    track('pwa_installed');
}

/**
 * Page load (called once from init.js)
 */
export function trackPageLoad() {
    track('page_load', {
        screen_width: window.screen.width,
        screen_height: window.screen.height,
    });
}