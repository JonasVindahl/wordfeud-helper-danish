/**
 * Analytics wrapper for Umami tracking
 * Privacy-friendly, no cookies, no personal data
 */

/**
 * Check if app is running in standalone mode (PWA)
 */
function isStandalone() {
    // iOS standalone mode
    if (window.navigator.standalone === true) {
        return true;
    }

    // Android/Desktop standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
    }

    return false;
}

/**
 * Track an event with Umami
 * @param {string} eventName - Name of the event (e.g., 'solve_clicked')
 * @param {Object} data - Additional data to track (optional)
 */
export function track(eventName, data = {}) {
    // Check if Umami is loaded
    if (!window.umami) {
        console.warn('Umami not loaded, skipping event:', eventName);
        return;
    }

    try {
        // Add common metadata to all events
        const eventData = {
            ...data,
            standalone: isStandalone(),
            lang: navigator.language
        };

        window.umami.track(eventName, eventData);
        console.log('Analytics event tracked:', eventName, eventData);
    } catch (error) {
        // Fail silently - analytics should never break the app
        console.warn('Failed to track event:', eventName, error);
    }
}

/**
 * Track when a search is initiated
 * @param {number} lettersCount - Number of letters entered
 * @param {number} jokerCount - Number of jokers used
 * @param {boolean} patternUsed - Whether a board pattern was used
 */
export function trackSolveClicked(lettersCount, jokerCount, patternUsed) {
    track('solve_clicked', {
        letters_count: lettersCount,
        joker_count: jokerCount,
        pattern_used: patternUsed
    });
}

/**
 * Track when search results are displayed
 * @param {number} resultsCount - Number of results found
 * @param {number} solveTimeMs - Time taken to solve in milliseconds
 */
export function trackSolveCompleted(resultsCount, solveTimeMs) {
    track('solve_completed', {
        results_count: resultsCount,
        solve_time_ms: solveTimeMs
    });
}

/**
 * Track when a word is copied
 */
export function trackWordCopied() {
    track('word_copied');
}

/**
 * Track when help/guide is opened
 */
export function trackHelpOpened() {
    track('help_opened');
}

/**
 * Track PWA installation
 */
export function trackPWAInstalled() {
    track('pwa_installed');
}

/**
 * Track page load with device info
 */
export function trackPageLoad() {
    track('page_load', {
        standalone: isStandalone(),
        screen_width: window.screen.width,
        screen_height: window.screen.height
    });
}
