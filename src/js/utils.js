/**
 * Utility Functions
 */

// Valid wildcard characters
export const WILDCARD_CHARS = ['?', '_', '*', ' '];

// Danish alphabet order for sorting
const DANISH_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ';

/**
 * Normalize input string (uppercase, trim, collapse spaces)
 * @param {string} str
 * @returns {string}
 */
export function normalizeString(str) {
    if (!str) return '';
    return str
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ' '); // Collapse multiple spaces
}

/**
 * Validate that string contains only allowed characters
 * Enhanced security: strict validation with length limits
 * @param {string} str
 * @returns {boolean}
 */
export function isValidInput(str) {
    if (!str) return false;

    // Security: Enforce strict type checking
    if (typeof str !== 'string') return false;

    // Security: Enforce maximum length to prevent DoS
    if (str.length > 50) return false;

    // Security: Only allow Danish letters, wildcards, and spaces
    const validChars = /^[A-ZÆØÅ?_* ]+$/;
    return validChars.test(str.toUpperCase());
}

/**
 * Parse letters and wildcards from input string
 * @param {string} lettersString - Input like "MAND?E"
 * @returns {Object} { letterCounts: Map, wildcards: number }
 */
export function parseLetters(lettersString) {
    const normalized = normalizeString(lettersString);
    const letterCounts = new Map();
    let wildcards = 0;

    for (const char of normalized) {
        if (WILDCARD_CHARS.includes(char)) {
            wildcards++;
        } else if (char !== ' ') {
            letterCounts.set(char, (letterCounts.get(char) || 0) + 1);
        }
    }

    return { letterCounts, wildcards };
}

/**
 * Byg ekstra bogstaver ud fra "På bordet"-mønsteret.
 * Alle bogstaver i mønstret (A-Å) tæller som bræt-bogstaver
 * og skal IKKE tages fra spillerens egne bogstaver.
 */
export function buildExtraLettersFromPattern(pattern) {
    const extra = new Map();
    if (!pattern) return extra;

    const normalized = normalizeString(pattern);

    for (const ch of normalized) {
        // Kun rigtige bogstaver – ikke . eller *
        if (DANISH_ALPHABET.includes(ch)) {
            extra.set(ch, (extra.get(ch) || 0) + 1);
        }
    }

    return extra;
}

/**
 * Check if a word can be formed from available letters and wildcards
 * @param {string} word
 * @param {Map} availableLetters - Map of letter -> count
 * @param {number} availableWildcards
 * @returns {Object} { canForm: boolean, wildcardsUsed: number, usedUserLetters: boolean }
 */
export function canFormWord(word, availableLetters, availableWildcards) {
    const wordLetters = new Map();

    // Count letters in the word
    for (const letter of word) {
        wordLetters.set(letter, (wordLetters.get(letter) || 0) + 1);
    }

    let wildcardsNeeded = 0;
    let usedUserLetters = false;

    // Check if we have enough of each letter
    for (const [letter, count] of wordLetters) {
        const available = availableLetters.get(letter) || 0;
        const shortfall = count - available;

        if (shortfall > 0) {
            wildcardsNeeded += shortfall;
        }

        // Track if we used at least one user letter (not joker)
        if (available > 0) {
            usedUserLetters = true;
        }
    }

    // Jokers should also count as "my letters"
    if (wildcardsNeeded > 0) {
        usedUserLetters = true;
    }

    const canForm = wildcardsNeeded <= availableWildcards;

    return {
        canForm,
        wildcardsUsed: canForm ? wildcardsNeeded : 0,
        usedUserLetters
    };
}

/**
 * Som canFormWord, men tager højde for ekstra bræt-bogstaver.
 * @param {string} word
 * @param {Map} availableLetters - spillerens bogstaver
 * @param {number} availableWildcards - antal jokere
 * @param {Map} extraLetters - bogstaver, der allerede ligger på brættet
 * @returns {Object} { canForm: boolean, wildcardsUsed: number, usedUserLetters: boolean }
 */
export function canFormWordWithExtras(word, availableLetters, availableWildcards, extraLetters) {
    const wordLetters = new Map();

    // Tæl bogstaver i ordet
    for (const letter of word) {
        wordLetters.set(letter, (wordLetters.get(letter) || 0) + 1);
    }

    // Træk bræt-bogstaver fra ordet
    if (extraLetters) {
        for (const [letter, extraCount] of extraLetters) {
            const current = wordLetters.get(letter);
            if (!current) continue;

            const remaining = current - extraCount;
            wordLetters.set(letter, remaining > 0 ? remaining : 0);
        }
    }

    // Resten skal dækkes af rack + jokere
    let wildcardsNeeded = 0;
    let usedUserLetters = false;

    for (const [letter, count] of wordLetters) {
        if (count === 0) continue; // Already covered by board letters

        const available = availableLetters.get(letter) || 0;
        const shortfall = count - available;

        if (shortfall > 0) {
            wildcardsNeeded += shortfall;
        }

        // Track if we used at least one user letter (not joker or board letter)
        if (available > 0) {
            usedUserLetters = true;
        }
    }

    // Jokers should also count as "my letters"
    if (wildcardsNeeded > 0) {
        usedUserLetters = true;
    }

    const canForm = wildcardsNeeded <= availableWildcards;

    return {
        canForm,
        wildcardsUsed: canForm ? wildcardsNeeded : 0,
        usedUserLetters
    };
}

/**
 * Compare strings according to Danish alphabet order
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareDanish(a, b) {
    const aUpper = a.toUpperCase();
    const bUpper = b.toUpperCase();

    const len = Math.min(aUpper.length, bUpper.length);

    for (let i = 0; i < len; i++) {
        const aIndex = DANISH_ALPHABET.indexOf(aUpper[i]);
        const bIndex = DANISH_ALPHABET.indexOf(bUpper[i]);

        if (aIndex !== bIndex) {
            return aIndex - bIndex;
        }
    }

    return aUpper.length - bUpper.length;
}

/**
 * Debounce function
 * @param {Function} func
 * @param {number} wait
 * @returns {Function}
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
