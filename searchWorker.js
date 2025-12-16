/**
 * Search Web Worker
 * Performs word search in a background thread to prevent UI blocking
 */

// Import scoring logic
const LETTER_VALUES = {
    'A': 1, 'E': 1, 'N': 1, 'R': 1,
    'D': 2, 'L': 2, 'O': 2, 'S': 2, 'T': 2,
    'B': 3, 'F': 3, 'G': 3, 'I': 3, 'K': 3, 'U': 3,
    'H': 4, 'J': 4, 'M': 4, 'P': 4, 'V': 4, 'Y': 4, 'Æ': 4, 'Ø': 4, 'Å': 4,
    'C': 8, 'X': 8,
    'Z': 9
};

const WILDCARD_CHARS = ['?', '_', '*', ' '];
const DANISH_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ';

let wordlist = [];
let wordSet = null;

// Listen for messages from main thread
self.addEventListener('message', (event) => {
    const { type, payload } = event.data;

    switch (type) {
        case 'loadWordlist':
            handleLoadWordlist(payload);
            break;

        case 'search':
            handleSearch(payload);
            break;

        default:
            console.error('Unknown message type:', type);
    }
});

/**
 * Handle wordlist loading
 */
function handleLoadWordlist(words) {
    // Normalize to uppercase and remove duplicates
    const uppercaseWords = words.map(w => w.toUpperCase());
    wordSet = new Set(uppercaseWords);
    wordlist = Array.from(wordSet);

    // Sort alphabetically for consistent ordering
    wordlist.sort();

    self.postMessage({
        type: 'wordlistLoaded',
        payload: {
            count: wordlist.length
        }
    });
}

/**
 * Handle search request
 * Security: Validates all inputs before processing
 */
function handleSearch(payload) {
    const startTime = performance.now();

    const { lettersString, filters } = payload;

    // Security: Validate input types
    if (typeof lettersString !== 'string' || typeof filters !== 'object') {
        console.error('Invalid search payload');
        return;
    }

    // Security: Validate input length
    if (lettersString.length > 15) {
        console.error('Letters string too long');
        return;
    }

    // Parse letters
    const { letterCounts, wildcards } = parseLetters(lettersString);
    const extraLetters = buildExtraLettersFromPattern(filters.boardPattern);

    // Search (using Set to avoid duplicates)
    const results = [];
    const seenWords = new Set();

    for (const word of wordlist) {
        // Normalize word for duplicate checking
        const normalizedWord = word.toUpperCase().trim();

        // Skip if we've already added this word
        if (seenWords.has(normalizedWord)) {
            continue;
        }

        const { canForm, wildcardsUsed, usedUserLetters } =
            extraLetters && extraLetters.size > 0
                ? canFormWordWithExtras(word, letterCounts, wildcards, extraLetters)
                : canFormWord(word, letterCounts, wildcards);

        if (!canForm) continue;

        // MUST use at least one user letter (not just board letters and jokers)
        if (!usedUserLetters) continue;

        if (!passesFilters(word, filters)) continue;

        const score = scoreWord(word, wildcardsUsed);

        results.push({
            word,
            score,
            length: word.length,
            usedJokers: wildcardsUsed
        });

        // Mark word as seen (using normalized version)
        seenWords.add(normalizedWord);
    }

    // Sort
    sortResults(results, filters.sortBy || 'score');

    const elapsedMs = Math.round(performance.now() - startTime);

    self.postMessage({
        type: 'searchResult',
        payload: {
            results,
            elapsedMs,
            totalFound: results.length
        }
    });
}

/**
 * Parse letters from input string
 */
function parseLetters(lettersString) {
    const normalized = lettersString.trim().toUpperCase().replace(/\s+/g, ' ');
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
 */
function buildExtraLettersFromPattern(pattern) {
    const extra = new Map();
    if (!pattern) return extra;

    const normalized = pattern.trim().toUpperCase();

    for (const ch of normalized) {
        if (DANISH_ALPHABET.includes(ch)) {
            extra.set(ch, (extra.get(ch) || 0) + 1);
        }
    }

    return extra;
}

/**
 * Som canFormWord, men med ekstra bræt-bogstaver.
 */
function canFormWordWithExtras(word, availableLetters, availableWildcards, extraLetters) {
    const wordLetters = new Map();

    for (const letter of word) {
        wordLetters.set(letter, (wordLetters.get(letter) || 0) + 1);
    }

    if (extraLetters) {
        for (const [letter, extraCount] of extraLetters) {
            const current = wordLetters.get(letter);
            if (!current) continue;

            const remaining = current - extraCount;
            wordLetters.set(letter, remaining > 0 ? remaining : 0);
        }
    }

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

    const canForm = wildcardsNeeded <= availableWildcards;

    return {
        canForm,
        wildcardsUsed: canForm ? wildcardsNeeded : 0,
        usedUserLetters
    };
}

/**
 * Check if word can be formed
 */
function canFormWord(word, availableLetters, availableWildcards, extraLetters = null) {
    const wordLetters = new Map();

    // Count all letters in the candidate word
    for (const letter of word) {
        wordLetters.set(letter, (wordLetters.get(letter) || 0) + 1);
    }

    // Subtract fixed board letters (from prefix/contains/suffix) so they
    // do NOT need to come from the rack
    if (extraLetters) {
        for (const [letter, extraCount] of extraLetters) {
            const current = wordLetters.get(letter);
            if (!current) continue;

            const remaining = current - extraCount;
            wordLetters.set(letter, remaining > 0 ? remaining : 0);
        }
    }

    // Now see what must come from rack + jokers
    let wildcardsNeeded = 0;
    let usedUserLetters = false;

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

    const canForm = wildcardsNeeded <= availableWildcards;

    return {
        canForm,
        wildcardsUsed: canForm ? wildcardsNeeded : 0,
        usedUserLetters
    };
}

/**
 * Build extra letter counts from fixed board fields:
 * prefix (starter med), contains (indeholder), suffix (slutter med).
 * These letters are on the board already and must NOT be taken from the rack.
 */
function buildExtraLetters(filters = {}) {
    const extra = new Map();

    const addFrom = (value) => {
        if (!value) return;
        const normalized = value.toUpperCase();

        for (const ch of normalized) {
            // Only count actual letters in our Danish alphabet
            if (DANISH_ALPHABET.includes(ch)) {
                extra.set(ch, (extra.get(ch) || 0) + 1);
            }
        }
    };

    addFrom(filters.prefix);
    addFrom(filters.contains);
    addFrom(filters.suffix);

    return extra;
}

/**
 * Check if word passes filters
 */
function passesFilters(word, filters) {
    const wordUpper = word.toUpperCase();

    if (filters.boardPattern) {
        const pattern = filters.boardPattern.trim().toUpperCase();
        if (pattern && !matchesBoardPattern(wordUpper, pattern)) {
            return false;
        }
    }

    if (!passesLengthFilter(word.length, filters)) {
        return false;
    }

    return true;
}
/**
 * Check length filter
 */
function passesLengthFilter(length, filters) {
    const mode = filters.lengthMode || 'all';

    switch (mode) {
        case 'all':
            return length >= 2 && length <= 15;
        case 'exact':
            if (filters.exactLength == null) return true;
            return length === filters.exactLength;
        case 'range':
            const min = filters.minLength ?? 2;
            const max = filters.maxLength ?? 15;
            return length >= min && length <= max;
        default:
            return true;
    }
}

/**
 * Security: Enhanced pattern matching with ReDoS protection
 */
function matchesBoardPattern(wordUpper, pattern) {
    const trimmed = pattern.trim().toUpperCase();
    if (!trimmed) return true;

    // Security: Limit pattern length to prevent ReDoS
    if (trimmed.length > 50) {
        console.warn('Board pattern too long, rejecting');
        return false;
    }

    let regexSource = '';
    let wildcardCount = 0;

    const escapeRegexChar = (ch) => ch.replace(/[-/\\^$+?()[\]{}|]/g, '\\$&');

    for (const ch of trimmed) {
        if (ch === '.') {
            regexSource += '.';
            wildcardCount++;
        } else if (ch === '*') {
            regexSource += '.*';
            wildcardCount++;
        } else if (ch === ' ') {
            continue;
        } else {
            regexSource += escapeRegexChar(ch);
        }
    }

    // Security: Prevent excessive wildcards that could cause ReDoS
    if (wildcardCount > 15) {
        console.warn('Too many wildcards in pattern, rejecting');
        return false;
    }

    try {
        const regex = new RegExp(`^${regexSource}$`);
        return regex.test(wordUpper);
    } catch (e) {
        console.error('Invalid regex pattern:', e);
        return false;
    }
}

/**
 * Pattern matcher for "Indeholder":
 * - Normal tekst => helt almindelig substring-søgning
 * - '.'          => præcis ét vilkårligt bogstav
 * - '*'          => 0 eller flere vilkårlige bogstaver (typisk i slutningen, fx "m..ge*")
 */
function matchesPattern(wordUpper, pattern) {
    const trimmed = pattern.trim().toUpperCase();
    if (!trimmed) return true;

    // Hvis der ikke er specielle wildcards, brug normal substring
    if (!trimmed.includes('.') && !trimmed.includes('*')) {
        return wordUpper.includes(trimmed);
    }

    // Byg et regex hvor:
    //  - normale tegn escapes
    //  - '.' => '.' (et vilkårligt bogstav)
    //  - '*' => '.*' (0+ vilkårlige bogstaver)
    let regexSource = '';

    const escapeRegexChar = (ch) => ch.replace(/[-/\\^$+?()[\]{}|]/g, '\\$&');

    for (const ch of trimmed) {
        if (ch === '.') {
            regexSource += '.';
        } else if (ch === '*') {
            regexSource += '.*';
        } else {
            regexSource += escapeRegexChar(ch);
        }
    }

    const regex = new RegExp(regexSource);
    return regex.test(wordUpper);
}

/**
 * Calculate word score
 */
function scoreWord(word, jokersUsed = 0) {
    if (!word || jokersUsed < 0) return 0;

    let totalPoints = 0;
    const letterPoints = [];

    for (let i = 0; i < word.length; i++) {
        const letter = word[i];
        const points = LETTER_VALUES[letter] || 0;
        totalPoints += points;
        letterPoints.push({ letter, points });
    }

    if (jokersUsed > 0 && jokersUsed <= word.length) {
        letterPoints.sort((a, b) => b.points - a.points);

        for (let i = 0; i < jokersUsed; i++) {
            totalPoints -= letterPoints[i].points;
        }
    }

    return totalPoints;
}

/**
 * Sort results
 */
function sortResults(results, sortBy) {
    switch (sortBy) {
        case 'score':
            // 1) Descending by score, 2) fewest jokers used, 3) points per letter (efficiency)
            results.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                // If same score, prefer fewer jokers (ascending)
                if (a.usedJokers !== b.usedJokers) {
                    return a.usedJokers - b.usedJokers;
                }
                // If same score and jokers, prefer higher points per letter (efficiency)
                const aEfficiency = a.score / a.length;
                const bEfficiency = b.score / b.length;
                return bEfficiency - aEfficiency;
            });
            break;

        case 'length':
            results.sort((a, b) => {
                if (b.length !== a.length) return b.length - a.length;
                return b.score - a.score;
            });
            break;

        case 'alpha':
            results.sort((a, b) => compareDanish(a.word, b.word));
            break;

        default:
            results.sort((a, b) => b.score - a.score);
    }
}

/**
 * Compare strings in Danish alphabet order
 */
function compareDanish(a, b) {
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
