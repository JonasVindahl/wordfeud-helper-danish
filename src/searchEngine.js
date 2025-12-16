/**
 * Search Engine
 * Core word search logic with filters and sorting
 */

import { getWordlist } from './wordlistLoader.js';
import { scoreWord } from './scoring.js';
import {
    parseLetters,
    canFormWord,
    compareDanish,
    normalizeString,
    buildExtraLettersFromPattern,
    canFormWordWithExtras
} from './utils.js';


/**
 * Search for words matching the given letters and filters
 * @param {string} lettersString - User's letters (e.g., "MAND?E")
 * @param {Object} filters - Filter configuration
 * @returns {Array<Object>} Array of { word, score, length, usedJokers }
 */
export function searchWords(lettersString, filters = {}) {
    const startTime = performance.now();

    // Parse available letters and wildcards
    const { letterCounts, wildcards } = parseLetters(lettersString);

    // Ekstra bogstaver fra "På bordet"-mønsteret
    const extraLetters = buildExtraLettersFromPattern(filters.boardPattern);

    // Get all words from wordlist
    const allWords = getWordlist();

    // Filter and score words (using Set to avoid duplicates)
    const results = [];
    const seenWords = new Set();

    for (const word of allWords) {
        // Normalize word for duplicate checking
        const normalizedWord = word.toUpperCase().trim();

        // Skip if we've already added this word
        if (seenWords.has(normalizedWord)) {
            continue;
        }

        // Check if word can be formed from available letters
        const { canForm, wildcardsUsed, usedUserLetters } =
            extraLetters && extraLetters.size > 0
                ? canFormWordWithExtras(word, letterCounts, wildcards, extraLetters)
                : canFormWord(word, letterCounts, wildcards);
        if (!canForm) {
            continue;
        }

        // MUST use at least one user letter (not just board letters and jokers)
        if (!usedUserLetters) {
            continue;
        }

        // Apply filters
        if (!passesFilters(word, filters)) {
            continue;
        }

        // Calculate score
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

    // Sort results
    sortResults(results, filters.sortBy || 'score');

    const elapsedMs = Math.round(performance.now() - startTime);

    return {
        results,
        elapsedMs,
        totalFound: results.length
    };
}

/**
 * Check if a word passes all filters
 * @param {string} word
 * @param {Object} filters
 * @returns {boolean}
 */
export function passesFilters(word, filters) {
    const wordUpper = word.toUpperCase();

    // "På bordet" mønster
    if (filters.boardPattern) {
        const pattern = normalizeString(filters.boardPattern);
        if (pattern && !matchesBoardPattern(wordUpper, pattern)) {
            return false;
        }
    }

    // Længde-filter (uændret)
    if (!passesLengthFilter(word.length, filters)) {
        return false;
    }

    return true;
}

/**
 * Matcher et ord mod "På bordet"-mønsteret.
 * - Bogstav = skal matche det bogstav
 * - '.'     = præcis ét vilkårligt bogstav
 * - '*'     = 0 eller flere vilkårlige bogstaver
 * Der matches på HELE ordet (^)...($).
 * Security: Enhanced regex validation to prevent ReDoS attacks
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
            // ignorer mellemrum
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
        // Security: Catch any regex errors
        console.error('Invalid regex pattern:', e);
        return false;
    }
}

/**
 * Check if word length passes the length filter
 * @param {number} length
 * @param {Object} filters
 * @returns {boolean}
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
 * Sort results array in-place
 * @param {Array<Object>} results
 * @param {string} sortBy - 'score', 'length', or 'alpha'
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
            // Descending by length, then by score descending
            results.sort((a, b) => {
                if (b.length !== a.length) {
                    return b.length - a.length;
                }
                return b.score - a.score;
            });
            break;

        case 'alpha':
            // Alphabetical A-Å (Danish alphabet order)
            results.sort((a, b) => compareDanish(a.word, b.word));
            break;

        default:
            // Default to score
            results.sort((a, b) => b.score - a.score);
    }
}

/**
 * Validate filter configuration
 * @param {Object} filters
 * @returns {Object} { valid: boolean, error: string }
 */
export function validateFilters(filters) {
    if (filters.lengthMode === 'exact') {
        const exact = filters.exactLength;
        if (exact != null && (exact < 2 || exact > 15)) {
            return {
                valid: false,
                error: 'Præcis længde skal være mellem 2 og 15'
            };
        }
    }

    if (filters.lengthMode === 'range') {
        const min = filters.minLength;
        const max = filters.maxLength;

        if (min != null && (min < 2 || min > 15)) {
            return {
                valid: false,
                error: 'Min længde skal være mellem 2 og 15'
            };
        }

        if (max != null && (max < 2 || max > 15)) {
            return {
                valid: false,
                error: 'Max længde skal være mellem 2 og 15'
            };
        }

        if (min != null && max != null && min > max) {
            return {
                valid: false,
                error: 'Min længde kan ikke være større end max længde'
            };
        }
    }

    return { valid: true };
}
