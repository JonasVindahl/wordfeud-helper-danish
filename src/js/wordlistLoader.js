/**
 * Wordlist Loader
 * Handles loading and managing word lists for multiple languages
 */

import { detectLanguage } from './i18n.js';

let wordlist = [];
let wordSet = null;

/**
 * Get wordlist path for current language
 * @returns {string} Path to wordlist file
 */
function getWordlistPath() {
    const lang = detectLanguage();

    if (lang === 'da') {
        // Danish at root (existing path)
        return '/public/words.json';
    }

    // Other languages at language-specific path
    return `/${lang}/public/words-${lang}.json`;
}

/**
 * Load wordlist from JSON file
 * @param {Function} progressCallback - Called with progress percentage (0-100)
 * @returns {Promise<Array<string>>}
 */
export async function loadWordlist(progressCallback) {
    try {
        progressCallback?.(0);

        const wordlistPath = getWordlistPath();
        const lang = detectLanguage();

        console.log(`Loading wordlist for language: ${lang} from ${wordlistPath}`);

        const response = await fetch(wordlistPath);

        if (!response.ok) {
            throw new Error(`Failed to load wordlist: ${response.status}`);
        }

        progressCallback?.(30);

        const data = await response.json();

        progressCallback?.(60);

        // Normalize all words to uppercase and remove duplicates in one pass
        // Skip sorting as search results are sorted anyway - saves ~100ms
        wordSet = new Set();
        for (let i = 0; i < data.length; i++) {
            wordSet.add(data[i].toUpperCase());
        }

        progressCallback?.(80);

        // Convert to array for indexed access
        wordlist = Array.from(wordSet);

        progressCallback?.(100);

        console.log(`Loaded ${wordlist.length} words for ${lang}`);

        return wordlist;
    } catch (error) {
        console.error('Error loading wordlist:', error);
        throw error;
    }
}

/**
 * Check if a word exists in the wordlist
 * @param {string} word
 * @returns {boolean}
 */
export function wordExists(word) {
    if (!wordSet) {
        throw new Error('Wordlist not loaded');
    }
    return wordSet.has(word.toUpperCase());
}

/**
 * Get all words from the wordlist
 * @returns {Array<string>}
 */
export function getWordlist() {
    return wordlist;
}

/**
 * Get wordlist statistics
 * @returns {Object}
 */
export function getStats() {
    return {
        totalWords: wordlist.length,
        loaded: wordSet !== null
    };
}
