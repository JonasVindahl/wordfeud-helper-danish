/**
 * Scoring System
 * Wordfeud letter values and point calculation
 */

// Wordfeud letter values (from points.txt)
export const LETTER_VALUES = {
    'A': 1, 'E': 1, 'N': 1, 'R': 1,
    'D': 2, 'L': 2, 'O': 2, 'S': 2, 'T': 2,
    'B': 3, 'F': 3, 'G': 3, 'I': 3, 'K': 3, 'U': 3,
    'H': 4, 'J': 4, 'M': 4, 'P': 4, 'V': 4, 'Y': 4, 'Æ': 4, 'Ø': 4, 'Å': 4,
    'C': 8, 'X': 8,
    'Z': 9
};

// Wildcard characters give 0 points
export const WILDCARD_CHARS = ['?', '_', '*', ' '];

/**
 * Get the point value for a single letter
 * @param {string} letter - Single letter (A-Å)
 * @returns {number} Point value
 */
export function getLetterValue(letter) {
    const upper = letter.toUpperCase();
    return LETTER_VALUES[upper] || 0;
}

/**
 * Calculate the score for a word
 * @param {string} word - The word to score
 * @param {number} jokersUsed - Number of jokers/wildcards used in this word
 * @returns {number} Total score
 */
export function scoreWord(word, jokersUsed = 0) {
    if (!word || jokersUsed < 0) {
        return 0;
    }

    // Calculate total points for all letters
    let totalPoints = 0;
    const letterPoints = [];

    for (let i = 0; i < word.length; i++) {
        const letter = word[i];
        const points = getLetterValue(letter);
        totalPoints += points;
        letterPoints.push({ letter, points });
    }

    // If wildcards were used, subtract the highest value letters
    // (wildcards give 0 points, so we use them for the most expensive letters)
    if (jokersUsed > 0 && jokersUsed <= word.length) {
        // Sort by points descending to find the most expensive letters
        letterPoints.sort((a, b) => b.points - a.points);

        // Subtract the points of the most expensive letters (these are covered by jokers)
        for (let i = 0; i < jokersUsed; i++) {
            totalPoints -= letterPoints[i].points;
        }
    }

    return totalPoints;
}

/**
 * Calculate detailed scoring information
 * @param {string} word
 * @param {number} jokersUsed
 * @returns {Object} Detailed score information
 */
export function getDetailedScore(word, jokersUsed = 0) {
    const letters = word.split('').map(letter => ({
        letter,
        value: getLetterValue(letter)
    }));

    const baseScore = letters.reduce((sum, l) => sum + l.value, 0);
    const finalScore = scoreWord(word, jokersUsed);

    return {
        word,
        letters,
        baseScore,
        jokersUsed,
        jokerPenalty: baseScore - finalScore,
        finalScore
    };
}
