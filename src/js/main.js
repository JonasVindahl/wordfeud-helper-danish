/**
 * Main Application Entry Point
 * Initializes the Wordfeud Helper app
 */

import { loadWordlist } from './wordlistLoader.js';
import { initUI, showAppContent, updateLoadingProgress, showLoadingError } from './ui-v2.js';
import { trackPWAInstalled, trackPageLoad } from './analytics.js';
import { loadTranslations, detectLanguage } from './i18n.js';

// App version - synced with service worker cache name
export const APP_VERSION = 'v33';
export const APP_VERSION_DATE = '2025-12-16';

/**
 * Apply translations to the page
 */
async function applyTranslations() {
    const lang = detectLanguage();

    // Only apply translations for non-Danish languages
    if (lang === 'da') {
        return;
    }

    try {
        const t = await loadTranslations();
        console.log('📝 Applying translations for:', lang);

        // Update page title
        document.title = t.header.title;

        // Update header
        const h1 = document.querySelector('header h1');
        if (h1) h1.textContent = t.header.title;

        const subtitle = document.querySelector('header .subtitle');
        if (subtitle) subtitle.textContent = t.header.subtitle;

        // Update badges
        const badges = document.querySelectorAll('.badge');
        if (badges[0]) badges[0].textContent = t.header.badgeDictionary;
        if (badges[1]) badges[1].textContent = t.header.badgeOffline;

        // Update loading text - safely update without innerHTML
        const loadingText = document.querySelector('#wordlist-loading p');
        if (loadingText) {
            const progressSpan = loadingText.querySelector('#loading-progress');
            loadingText.textContent = t.wordlist.loading + ' ';
            if (progressSpan) {
                loadingText.appendChild(progressSpan);
                progressSpan.textContent = '0%';
            }
        }

        const loadingSubtext = document.querySelector('.loading-subtext');
        if (loadingSubtext) loadingSubtext.textContent = t.wordlist.firstTimeNote;

        console.log('✅ Translations applied successfully');
    } catch (error) {
        console.error('Failed to apply translations:', error);
    }
}

/**
 * Initialize the application
 */
async function init() {
    try {
        // Display version in footer
        displayVersion();

        // Apply translations before loading wordlist
        await applyTranslations();

        // Load the wordlist with progress tracking
        await loadWordlist((percent) => {
            updateLoadingProgress(percent);
        });

        // Initialize UI
        initUI();

        // Show app content
        showAppContent();

        // Track page load
        trackPageLoad();

        console.log('Wordfeud Hjælper initialized successfully');

    } catch (error) {
        console.error('Failed to initialize app:', error);
        showLoadingError(error);
    }
}

/**
 * Display app version in footer
 */
function displayVersion() {
    const versionElement = document.getElementById('version-number');
    if (versionElement) {
        versionElement.textContent = `${APP_VERSION} (${APP_VERSION_DATE})`;
    }
}

// Register service worker for offline support
// DEVELOPMENT MODE: Set to true to disable caching during development
const DISABLE_SERVICE_WORKER = false; // Change to true for development

if ('serviceWorker' in navigator && !DISABLE_SERVICE_WORKER) {
    let refreshing = false;

    // Detect controller change and reload page
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        console.log('🔄 Controller changed, reloading page...');
        window.location.reload();
    });

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/src/workers/service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker registered:', registration.scope);

                // Check for updates immediately on load
                registration.update();

                // Check for updates every 30 seconds (more frequent)
                setInterval(() => {
                    console.log('🔍 Checking for updates...');
                    registration.update();
                }, 30000);

                // Listen for new service worker waiting to activate
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 New Service Worker found, installing...');

                    newWorker.addEventListener('statechange', () => {
                        console.log('📊 Service Worker state:', newWorker.state);

                        if (newWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // New service worker available, prompt user to reload
                                console.log('✨ New version available!');
                                showUpdateNotification(registration);
                            } else {
                                // First install
                                console.log('✅ Service Worker installed for first time');
                            }
                        }
                    });
                });

                // Check if there's already a waiting worker
                if (registration.waiting) {
                    console.log('⚠️ Service Worker already waiting, showing notification...');
                    showUpdateNotification(registration);
                }
            })
            .catch(error => {
                console.log('❌ Service Worker registration failed:', error);
            });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'SW_UPDATED') {
                console.log('✅ Service Worker updated to:', event.data.version);
            }
        });
    });
} else if (DISABLE_SERVICE_WORKER) {
    console.log('⚠️ Service Worker DISABLED for development');

    // Unregister any existing service workers
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) {
                registration.unregister();
                console.log('🗑️ Unregistered old service worker');
            }
        });
    }
}

/**
 * Show update notification to user
 */
function showUpdateNotification(registration) {
    // Remove any existing notification first
    const existingNotification = document.getElementById('update-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification banner using CSS classes
    const notification = document.createElement('div');
    notification.id = 'update-notification';
    notification.innerHTML = `
        <div class="update-title">Ny version tilgængelig! 🎉</div>
        <div class="update-actions">
            <button id="update-reload-btn">Genindlæs nu</button>
            <button id="update-later-btn">Senere</button>
        </div>
    `;
    document.body.appendChild(notification);

    // Add event listeners
    document.getElementById('update-reload-btn').addEventListener('click', () => {
        console.log('🔄 User clicked reload, activating new service worker...');

        // Tell the waiting service worker to take over
        if (registration && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
            // Fallback: just reload
            window.location.reload();
        }
    });

    document.getElementById('update-later-btn').addEventListener('click', () => {
        notification.remove();
    });
}

// PWA Install Prompt - Smart detection for iOS & Chromium
let deferredPrompt;
const installPrompt = document.getElementById('install-prompt');
const installButton = document.getElementById('install-button');
const installDismiss = document.getElementById('install-dismiss');
const iosInstallPrompt = document.getElementById('ios-install-prompt');
const iosInstallDismiss = document.getElementById('ios-install-dismiss');

/**
 * Detect if device is iOS
 */
function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Check if app is running in standalone mode (already installed)
 */
function isAppInstalled() {
    // Check if running in standalone mode (iOS)
    if (window.navigator.standalone === true) {
        return true;
    }

    // Check if running in standalone mode (Android/Desktop)
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
    }

    // Check if running in fullscreen mode
    if (window.matchMedia('(display-mode: fullscreen)').matches) {
        return true;
    }

    return false;
}

/**
 * Hide all install prompts and adjust layout
 */
function hideAllInstallPrompts() {
    if (installPrompt) installPrompt.style.display = 'none';
    if (iosInstallPrompt) iosInstallPrompt.style.display = 'none';

    console.log('Install prompts hidden');

    // Remove bottom padding from container since prompt is hidden
    const container = document.querySelector('.container');
    if (container) {
        container.style.paddingBottom = 'var(--space-lg)';
    }
}

// Check if app is already installed on page load
if (isAppInstalled()) {
    hideAllInstallPrompts();
} else {
    // Not installed - show appropriate banner
    const ios = isIOS();

    if (ios) {
        // iOS device - check if dismissed before
        const iosDismissed = localStorage.getItem('ios-install-dismissed');
        if (!iosDismissed && iosInstallPrompt) {
            iosInstallPrompt.style.display = 'block';
            console.log('Showing iOS install guide');
        }
    }
    // For Chromium: wait for beforeinstallprompt event
}

// Chromium: beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    console.log('Install prompt available (Chromium)');

    // Show the install prompt (only if not already installed and not dismissed)
    const dismissed = localStorage.getItem('chromium-install-dismissed');
    if (!isAppInstalled() && !dismissed && installPrompt) {
        installPrompt.style.display = 'block';
    }
});

// Chromium: Install button click
if (installButton) {
    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) {
            alert('Installation ikke tilgængelig lige nu.');
            return;
        }

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // Clear the deferredPrompt
        deferredPrompt = null;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }
    });
}

// Chromium: Dismiss button click
if (installDismiss) {
    installDismiss.addEventListener('click', () => {
        if (installPrompt) {
            installPrompt.style.display = 'none';
            localStorage.setItem('chromium-install-dismissed', 'true');
            console.log('Chromium install prompt dismissed');

            // Adjust padding
            const container = document.querySelector('.container');
            if (container) {
                container.style.paddingBottom = 'var(--space-lg)';
            }
        }
    });
}

// iOS: Dismiss button click
if (iosInstallDismiss) {
    iosInstallDismiss.addEventListener('click', () => {
        if (iosInstallPrompt) {
            iosInstallPrompt.style.display = 'none';
            localStorage.setItem('ios-install-dismissed', 'true');
            console.log('iOS install guide dismissed');

            // Adjust padding
            const container = document.querySelector('.container');
            if (container) {
                container.style.paddingBottom = 'var(--space-lg)';
            }
        }
    });
}

// Detect if app is installed (after user accepts)
window.addEventListener('appinstalled', () => {
    console.log('PWA was installed successfully');

    // Track PWA installation
    trackPWAInstalled();

    deferredPrompt = null;

    // Hide all install prompts
    hideAllInstallPrompts();
});

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
