/**
 * Download Page - PWA Install Logic
 * Handles the install prompt on the /download page
 */

import { initLanguageSwitcher } from './i18n.js';

let deferredPrompt;
const installButton = document.getElementById('install-app-button');
const installInstructions = document.getElementById('install-instructions');
const alreadyInstalledMessage = document.getElementById('already-installed-message');
const manualInstructions = document.getElementById('manual-instructions');

// Initialize language switcher on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanguageSwitcher);
} else {
    initLanguageSwitcher();
}

// Check if app is already installed
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
  alreadyInstalledMessage.style.display = 'block';
  installInstructions.style.display = 'none';
} else {
  manualInstructions.style.display = 'block';
}

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent default mini-infobar
  e.preventDefault();
  // Store the event for later use
  deferredPrompt = e;
  // Show install button
  installButton.style.display = 'inline-block';
  manualInstructions.style.display = 'none';
});

// Handle install button click
installButton.addEventListener('click', async () => {
  if (!deferredPrompt) {
    return;
  }

  // Show the install prompt
  deferredPrompt.prompt();

  // Wait for the user's response
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === 'accepted') {
    console.log('User accepted the install prompt');
    // Track install event
    if (window.umami) {
      window.umami.track('pwa_installed_from_download_page');
    }
  }

  // Clear the deferredPrompt
  deferredPrompt = null;
  installButton.style.display = 'none';
});

// Listen for successful installation
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  alreadyInstalledMessage.style.display = 'block';
  installButton.style.display = 'none';
  installInstructions.style.display = 'none';
  manualInstructions.style.display = 'none';
});
