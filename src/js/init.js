/**
 * Application Initialization Script
 * Moved from inline script to comply with Content Security Policy
 */

// Force reload with timestamp for cache busting
const timestamp = Date.now();
import('./main.js?v=' + timestamp);
