/**
 * Wordlist Loader
 * Handles loading and managing the Danish word list
 */

let wordlist = [];
let wordSet = null;

/**
 * Load wordlist from JSON file
 * @param {Function} progressCallback - Called with progress percentage (0-100)
 * @returns {Promise<Array<string>>}
 */
export async function loadWordlist(progressCallback) {
    try {
        progressCallback?.(0);

        const response = await fetch('public/words.json');

        if (!response.ok) {
            throw new Error(`Failed to load wordlist: ${response.status}`);
        }

        progressCallback?.(30);

        const data = await response.json();

        progressCallback?.(60);

        // Normalize all words to uppercase and remove duplicates
        const uppercaseWords = data.map(word => word.toUpperCase());

        progressCallback?.(70);

        // Remove duplicates by using a Set
        wordSet = new Set(uppercaseWords);

        progressCallback?.(80);

        // Convert back to array for indexed access
        wordlist = Array.from(wordSet);

        progressCallback?.(90);

        // Sort alphabetically for consistent ordering
        wordlist.sort();

        progressCallback?.(100);

        console.log(`Loaded ${wordlist.length} words`);

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
