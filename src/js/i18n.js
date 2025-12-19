/**
 * i18n Module
 * Handles language detection, storage, and translation loading
 */

const SUPPORTED_LANGUAGES = ['da', 'en', 'sv', 'no', 'nl', 'pt'];
const DEFAULT_LANGUAGE = 'da';
const LANG_STORAGE_KEY = 'wordfeud_lang';

let currentTranslations = null;

/**
 * Detect current language from:
 * 1. URL path (/en/, /sv/, etc.)
 * 2. LocalStorage (user preference)
 * 3. Browser language
 * 4. Default (Danish)
 */
export function detectLanguage() {
    // 1. Check URL path first (highest priority)
    const pathLang = getLanguageFromPath();
    if (pathLang) {
        return pathLang;
    }

    // 2. Check stored preference
    const storedLang = localStorage.getItem(LANG_STORAGE_KEY);
    if (storedLang && SUPPORTED_LANGUAGES.includes(storedLang)) {
        return storedLang;
    }

    // 3. Check browser language
    const browserLang = navigator.language.split('-')[0];
    if (SUPPORTED_LANGUAGES.includes(browserLang)) {
        return browserLang;
    }

    // 4. Default to Danish
    return DEFAULT_LANGUAGE;
}

/**
 * Extract language from URL path
 * / or /download or /joker → 'da'
 * /en or /en/download → 'en'
 */
function getLanguageFromPath() {
    const path = window.location.pathname;
    const match = path.match(/^\/([a-z]{2})\//);

    if (match && SUPPORTED_LANGUAGES.includes(match[1])) {
        return match[1];
    }

    // Root path = Danish
    if (path === '/' || path.startsWith('/download') || path.startsWith('/joker')) {
        return 'da';
    }

    return null;
}

/**
 * Get base path for current language
 * Used for navigation and resource loading
 */
export function getBasePath() {
    const lang = detectLanguage();
    return lang === 'da' ? '' : `/${lang}`;
}

/**
 * Store user language preference
 */
export function setLanguage(lang) {
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
        throw new Error(`Unsupported language: ${lang}`);
    }
    localStorage.setItem(LANG_STORAGE_KEY, lang);
}

/**
 * Load translation file for current language
 */
export async function loadTranslations() {
    const lang = detectLanguage();

    try {
        const response = await fetch(`/translations/${lang}.json`);

        if (!response.ok) {
            console.error(`Failed to load translations for ${lang}, falling back to Danish`);
            const fallback = await fetch('/translations/da.json');
            currentTranslations = await fallback.json();
            return currentTranslations;
        }

        currentTranslations = await response.json();
        return currentTranslations;
    } catch (error) {
        console.error('Error loading translations:', error);
        // Return minimal fallback
        return {
            meta: { lang: 'da', name: 'Dansk' },
            common: {},
            header: {},
            search: {},
            results: {}
        };
    }
}

/**
 * Get translation for a key using dot notation
 * @param {string} key - Translation key (e.g., 'search.title')
 * @param {Object} params - Optional parameters for interpolation (e.g., {count: 5})
 * @returns {string} Translated text
 */
export function t(key, params = {}) {
    if (!currentTranslations) {
        console.warn('Translations not loaded yet');
        return key;
    }

    const keys = key.split('.');
    let value = currentTranslations;

    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            console.warn(`Translation key not found: ${key}`);
            return key;
        }
    }

    if (typeof value !== 'string') {
        console.warn(`Translation value is not a string: ${key}`);
        return key;
    }

    // Simple interpolation for {{param}} placeholders
    return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? params[paramKey] : match;
    });
}

/**
 * Get current page type (main, download, joker)
 */
function getCurrentPage(path) {
    if (path.includes('/download')) return 'download';
    if (path.includes('/joker')) return 'joker';
    return 'main';
}

/**
 * Build path for language and page
 */
function buildPath(lang, page) {
    const base = lang === 'da' ? '' : `/${lang}`;

    switch (page) {
        case 'download':
            return `${base}/download`;
        case 'joker':
            return `${base}/joker`;
        default:
            return base || '/';
    }
}

/**
 * Initialize language switcher component
 */
export function initLanguageSwitcher() {
    console.log('🌐 Initializing language switcher...');

    const btn = document.getElementById('lang-switcher-btn');
    const dropdown = document.getElementById('lang-dropdown');
    const current = document.getElementById('lang-current');

    console.log('Elements found:', { btn: !!btn, dropdown: !!dropdown, current: !!current });

    if (!btn || !dropdown || !current) {
        console.warn('Language switcher elements not found');
        return;
    }

    console.log('Language switcher elements found, setting up listeners...');

    // Set current language display
    const currentLang = detectLanguage();
    current.textContent = currentLang.toUpperCase();

    // Toggle dropdown
    btn.addEventListener('click', (e) => {
        console.log('🖱️ Language switcher button clicked!');
        e.stopPropagation();
        const isOpen = dropdown.style.display === 'block';
        dropdown.style.display = isOpen ? 'none' : 'block';
        console.log('Dropdown display:', dropdown.style.display);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    // Handle language selection
    dropdown.querySelectorAll('.lang-option').forEach(option => {
        option.addEventListener('click', (e) => {
            console.log('🌍 Language option clicked:', option.dataset.lang);
            e.preventDefault();
            const newLang = option.dataset.lang;
            setLanguage(newLang);

            // Navigate to same page in new language
            const currentPath = window.location.pathname;
            const currentPage = getCurrentPage(currentPath);
            const newPath = buildPath(newLang, currentPage);

            console.log('Navigating to:', newPath);
            window.location.href = newPath;
        });
    });

    console.log('✅ Language switcher initialized successfully');
}
