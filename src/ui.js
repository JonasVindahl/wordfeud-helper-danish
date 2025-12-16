/**
 * UI Module
 * Handles all DOM manipulation and user interactions
 */

import { searchWords, validateFilters, passesFilters } from './searchEngine.js';
import { isValidInput, normalizeString, parseLetters, canFormWord, canFormWordWithExtras, buildExtraLettersFromPattern } from './utils.js';
import { getWordlist } from './wordlistLoader.js';

// DOM Elements
let elements = {};

// Pagination state
let currentPage = 1;
let currentResults = [];
const RESULTS_PER_PAGE = 100;

// Web Worker (optional, for performance)
let searchWorker = null;
let useWorker = false;

// Results preview timer
let previewTimer = null;
const PREVIEW_DELAY = 300; // milliseconds

// Recent searches
const MAX_RECENT_SEARCHES = 5;
const RECENT_SEARCHES_KEY = 'wordfeud_recent_searches';

// Initialization flag to prevent multiple initializations
let isInitialized = false;

/**
 * Initialize UI - called after DOM is ready
 */
export function initUI() {
    console.log('🚀 initUI() called');

    // Prevent multiple initializations
    if (isInitialized) {
        console.warn('UI already initialized, skipping duplicate initialization');
        return;
    }
    isInitialized = true;
    // Cache DOM elements
    elements = {
        lettersInput: document.getElementById('letters-input'),
        boardPatternInput: document.getElementById('board-pattern-input'),
        sortSelect: document.getElementById('sort-select'),

        lenModeAll: document.getElementById('len-mode-all'),
        lenModeExact: document.getElementById('len-mode-exact'),
        lenModeRange: document.getElementById('len-mode-range'),
        exactLength: document.getElementById('exact-length'),
        minLength: document.getElementById('min-length'),
        maxLength: document.getElementById('max-length'),

        searchButton: document.getElementById('search-button'),
        searchButtonHint: document.getElementById('search-button-hint'),
        clearButton: document.getElementById('clear-button'),
        clearLettersBtn: document.getElementById('clear-letters-btn'),
        clearBoardBtn: document.getElementById('clear-board-btn'),

        errorMessage: document.getElementById('error-message'),
        searchLoading: document.getElementById('search-loading'),
        resultsPreview: document.getElementById('results-preview'),
        resultsPreviewText: document.getElementById('results-preview-text'),
        inputPreview: document.getElementById('input-preview'),
        recentSearches: document.getElementById('recent-searches'),
        recentSearchesList: document.getElementById('recent-searches-list'),

        resultsSection: document.getElementById('results-section'),
        resultsSummary: document.getElementById('results-summary'),
        resultsBody: document.getElementById('results-body'),

        pagination: document.getElementById('pagination'),
        pageInfo: document.getElementById('page-info'),
        prevPage: document.getElementById('prev-page'),
        nextPage: document.getElementById('next-page')
    };

    // Initialize Web Worker if available
    initWebWorker();

    // Attach event listeners
    attachEventListeners();

    // Initialize UI state
    updateSearchButtonState();
    updateLengthInputsState();
    displayRecentSearches();

    // Initialize guide collapse/expand
    console.log('📘 Initializing guide toggle...');
    initGuideToggle();
}

/**
 * Initialize Web Worker for background search
 */
function initWebWorker() {
    if (typeof Worker !== 'undefined') {
        try {
            searchWorker = new Worker('/searchWorker.js');

            searchWorker.addEventListener('message', (event) => {
                const { type, payload } = event.data;

                if (type === 'searchResult') {
                    handleWorkerSearchResult(payload);
                } else if (type === 'wordlistLoaded') {
                    console.log('Worker: Wordlist loaded');
                }
            });

            searchWorker.addEventListener('error', (error) => {
                console.error('Worker error:', error);
                useWorker = false;
            });

            // Load wordlist into worker
            const wordlist = getWordlist();
            searchWorker.postMessage({
                type: 'loadWordlist',
                payload: wordlist
            });

            useWorker = true;
            console.log('Web Worker initialized');

        } catch (error) {
            console.warn('Failed to initialize Web Worker:', error);
            useWorker = false;
        }
    } else {
        console.log('Web Workers not supported, using main thread');
        useWorker = false;
    }
}


/**
 * Attach all event listeners
 */
function attachEventListeners() {
    // Letter input - update UI state
    elements.lettersInput.addEventListener('input', () => {
        updateSearchButtonState();
        updateClearButtonVisibility(elements.lettersInput, elements.clearLettersBtn);
        updateResultsPreview();
    });

    // Board pattern input - update UI state
    elements.boardPatternInput.addEventListener('input', () => {
        updateClearButtonVisibility(elements.boardPatternInput, elements.clearBoardBtn);
    });

    // Clear button for letters input
    elements.clearLettersBtn.addEventListener('click', () => {
        elements.lettersInput.value = '';
        elements.clearLettersBtn.style.display = 'none';
        updateSearchButtonState();
        elements.lettersInput.focus();
    });

    // Clear button for board pattern input
    elements.clearBoardBtn.addEventListener('click', () => {
        elements.boardPatternInput.value = '';
        elements.clearBoardBtn.style.display = 'none';
        elements.boardPatternInput.focus();
    });

    // Quick insert buttons (?, ., *)
    const quickBtns = document.querySelectorAll('.quick-btn');
    console.log('Found quick buttons:', quickBtns.length);
    quickBtns.forEach((btn, index) => {
        console.log(`Button ${index}: char="${btn.dataset.char}" target="${btn.dataset.target}"`);

        // Click handler
        const handleQuickBtnActivate = () => {
            const char = btn.dataset.char;
            const targetId = btn.dataset.target;
            const targetInput = document.getElementById(targetId);

            console.log('Quick button activated:', char, 'target:', targetId, 'found:', targetInput);

            if (targetInput) {
                // Add click animation for scrabble tiles and pattern buttons
                if (btn.classList.contains('scrabble-tile') || btn.classList.contains('pattern-btn')) {
                    btn.classList.add('clicked');
                    setTimeout(() => btn.classList.remove('clicked'), 300);
                }

                insertAtCursor(targetInput, char);

                // Update relevant UI state
                if (targetId === 'letters-input') {
                    updateSearchButtonState();
                    updateClearButtonVisibility(elements.lettersInput, elements.clearLettersBtn);
                    updateResultsPreview();
                } else if (targetId === 'board-pattern-input') {
                    updateClearButtonVisibility(elements.boardPatternInput, elements.clearBoardBtn);
                }
            }
        };

        // Click handler
        btn.addEventListener('click', handleQuickBtnActivate);

        // Keyboard handler (Enter or Space)
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleQuickBtnActivate();
            }
        });
    });

    // Length mode radio buttons - update inputs and trigger search on "Alle længder"
    document.querySelectorAll('input[name="length-mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updateLengthInputsState();
            // Only trigger search when clicking "Alle længder" (len-mode-all)
            if (radio.value === 'all' && radio.checked) {
                handleSearch();
            }
        });
    });

    // Search button
    elements.searchButton.addEventListener('click', handleSearch);

    // Clear button
    elements.clearButton.addEventListener('click', handleClear);

    // Enter key in inputs triggers search (using keydown for better mobile support)
    [
        elements.lettersInput,
        elements.boardPatternInput,
        elements.exactLength,
        elements.minLength,
        elements.maxLength
    ].forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !elements.searchButton.disabled) {
                e.preventDefault(); // Prevent form submission if in a form
                handleSearch();
            }
        });
    });

    // Pagination
    elements.prevPage.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayResultsPage();
        }
    });

    elements.nextPage.addEventListener('click', () => {
        const totalPages = Math.ceil(currentResults.length / RESULTS_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            displayResultsPage();
        }
    });

    // Sort change triggers re-search if results exist
    elements.sortSelect.addEventListener('change', () => {
        if (currentResults.length > 0) {
            handleSearch(); // Re-search with new sort
        }
    });

    // Clear recent searches button
    const clearRecentBtn = document.getElementById('clear-recent-searches');
    if (clearRecentBtn) {
        clearRecentBtn.addEventListener('click', () => {
            try {
                localStorage.removeItem(RECENT_SEARCHES_KEY);
                displayRecentSearches();
            } catch (error) {
                console.error('Error clearing recent searches:', error);
            }
        });
    }
}

/**
 * Insert character at cursor position
 */
function insertAtCursor(input, char) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;

    input.value = text.substring(0, start) + char + text.substring(end);
    input.selectionStart = input.selectionEnd = start + 1;
    input.focus();
}

/**
 * Update search button enabled/disabled state and hint visibility
 */
function updateSearchButtonState() {
    const hasInput = elements.lettersInput.value.trim().length > 0;
    elements.searchButton.disabled = !hasInput;

    // Show/hide hint based on button state
    if (elements.searchButtonHint) {
        elements.searchButtonHint.style.display = hasInput ? 'none' : 'block';
    }
}

/**
 * Update clear button visibility based on input value
 */
function updateClearButtonVisibility(inputElement, clearButton) {
    if (inputElement.value.length > 0) {
        clearButton.style.display = 'block';
    } else {
        clearButton.style.display = 'none';
    }
}

/**
 * Update input preview to highlight wildcards and special characters
 */
function updateInputPreview() {
    const value = elements.lettersInput.value.toUpperCase();

    if (!value) {
        elements.inputPreview.style.display = 'none';
        return;
    }

    // Clear preview
    elements.inputPreview.innerHTML = '';

    // Create visual representation safely
    value.split('').forEach(char => {
        const span = document.createElement('span');
        span.className = 'char';

        if (char === '?') {
            span.className += ' wildcard';
        } else if (char === '.' || char === '*') {
            span.className += ' special';
        }

        span.textContent = char;
        elements.inputPreview.appendChild(span);
    });

    elements.inputPreview.style.display = 'flex';
}

/**
 * Update results preview with estimated count
 */
function updateResultsPreview() {
    // Clear existing timer
    if (previewTimer) {
        clearTimeout(previewTimer);
    }

    const lettersString = elements.lettersInput.value.trim();

    // Hide preview if no input
    if (!lettersString || !isValidInput(lettersString)) {
        elements.resultsPreview.style.display = 'none';
        return;
    }

    // Debounce the preview calculation
    previewTimer = setTimeout(() => {
        try {
            // Quick count without full scoring
            const { letterCounts, wildcards } = parseLetters(lettersString);
            const wordlist = getWordlist();
            const filters = getFilters();
            const extraLetters = buildExtraLettersFromPattern(filters.boardPattern);

            let count = 0;
            for (const word of wordlist) {
                const { canForm } =
                    extraLetters && extraLetters.size > 0
                        ? canFormWordWithExtras(word, letterCounts, wildcards, extraLetters)
                        : canFormWord(word, letterCounts, wildcards);

                if (canForm && passesFilters(word, filters)) {
                    count++;
                }

                // Stop counting at a reasonable limit for performance
                if (count > 999) break;
            }

            // Display preview
            if (count > 0) {
                const countText = count > 999 ? '999+' : count;
                elements.resultsPreviewText.textContent = `~${countText} mulige ord`;
                elements.resultsPreview.style.display = 'flex';
            } else {
                elements.resultsPreview.style.display = 'none';
            }
        } catch (error) {
            // Silently fail for preview
            elements.resultsPreview.style.display = 'none';
        }
    }, PREVIEW_DELAY);
}

/**
 * Update length input fields based on selected mode
 */
function updateLengthInputsState() {
    const mode = document.querySelector('input[name="length-mode"]:checked').value;

    elements.exactLength.disabled = mode !== 'exact';
    elements.minLength.disabled = mode !== 'range';
    elements.maxLength.disabled = mode !== 'range';
}

/**
 * Handle search button click
 */
async function handleSearch() {
    // Hide previous results and errors
    hideError();
    elements.resultsSection.style.display = 'none';

    // Get input value
    const lettersString = elements.lettersInput.value.trim();

    if (!lettersString) {
        showError('Indtast venligst dine bogstaver');
        return;
    }

    // Security: Validate input length to prevent DoS
    if (lettersString.length > 15) {
        showError('Maksimalt 15 bogstaver tilladt');
        return;
    }

    // Security: Validate input characters (prevent injection attacks)
    if (!isValidInput(lettersString)) {
        showError('Ugyldige tegn. Brug kun A-Å, Æ, Ø, Å og ? (joker)');
        return;
    }

    // Security: Validate board pattern if provided
    const boardPattern = elements.boardPatternInput.value.trim();
    if (boardPattern && !isValidInput(boardPattern)) {
        showError('Ugyldige tegn i "På bordet" felt');
        return;
    }

    // Get filters
    const filters = getFilters();

    // Validate filters
    const validation = validateFilters(filters);
    if (!validation.valid) {
        showError(validation.error);
        return;
    }

    // Show loading and disable button
    elements.searchLoading.style.display = 'flex';
    elements.searchButton.disabled = true;
    elements.searchButton.classList.add('loading');
    elements.resultsPreview.style.display = 'none';

    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 10));

    try {
        // Use Web Worker if available, otherwise main thread
        if (useWorker && searchWorker) {
            // Send search request to worker
            searchWorker.postMessage({
                type: 'search',
                payload: {
                    lettersString,
                    filters
                }
            });
            // Results will be handled in handleWorkerSearchResult
        } else {
            // Perform search in main thread
            const { results, elapsedMs, totalFound } = searchWords(lettersString, filters);

            // Hide loading and re-enable button
            elements.searchLoading.style.display = 'none';
            elements.searchButton.disabled = false;
            elements.searchButton.classList.remove('loading');

            // Check if no results
            if (results.length === 0) {
                showError('Ingen ord fundet med de givne bogstaver og filtre');
                return;
            }

            // Display results
            currentResults = results;
            currentPage = 1;
            displayResults(results, elapsedMs);

            // Save to recent searches
            saveRecentSearch(lettersString, filters);
        }

    } catch (error) {
        elements.searchLoading.style.display = 'none';
        elements.searchButton.disabled = false;
        elements.searchButton.classList.remove('loading');
        showError(`Fejl ved søgning: ${error.message}`);
        console.error('Search error:', error);
    }
}

/**
 * Handle search result from Web Worker
 */
function handleWorkerSearchResult(payload) {
    const { results, elapsedMs } = payload;

    // Hide loading and re-enable button
    elements.searchLoading.style.display = 'none';
    elements.searchButton.disabled = false;
    elements.searchButton.classList.remove('loading');

    // Check if no results
    if (results.length === 0) {
        showError('Ingen ord fundet med de givne bogstaver og filtre');
        return;
    }

    // Display results
    currentResults = results;
    currentPage = 1;
    displayResults(results, elapsedMs);

    // Save to recent searches - get current values from DOM
    const lettersString = elements.lettersInput.value.trim();
    const filters = getFilters();
    saveRecentSearch(lettersString, filters);
}

/**
 * Get current filter configuration
 */
function getFilters() {
    const lengthMode = document.querySelector('input[name="length-mode"]:checked').value;

    const filters = {
        boardPattern: elements.boardPatternInput.value.trim(),
        sortBy: elements.sortSelect.value,
        lengthMode
    };

    if (lengthMode === 'exact') {
        const exact = parseInt(elements.exactLength.value);
        if (!isNaN(exact)) {
            filters.exactLength = exact;
        }
    }

    if (lengthMode === 'range') {
        const min = parseInt(elements.minLength.value);
        const max = parseInt(elements.maxLength.value);
        if (!isNaN(min)) filters.minLength = min;
        if (!isNaN(max)) filters.maxLength = max;
    }

    return filters;
}

/**
 * Display search results
 */
function displayResults(results, elapsedMs) {
    // Update summary
    elements.resultsSummary.textContent = `Fandt ${results.length} ord på ${elapsedMs} ms`;

    // Display first page
    displayResultsPage();

    // Show results section with fade-in animation
    elements.resultsSection.style.display = 'block';
    elements.resultsSection.classList.remove('results-enter');
    // Trigger reflow
    void elements.resultsSection.offsetWidth;
    elements.resultsSection.classList.add('results-enter');

    // Auto-focus letters input for easy next search
    setTimeout(() => {
        elements.lettersInput.focus();
        elements.lettersInput.select();
    }, 100);
}

/**
 * Sanitize text for safe HTML insertion
 * Prevents XSS by escaping HTML special characters
 * @param {string} text - Text to sanitize
 * @returns {string} HTML-escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Highlight pattern match in word - SECURE VERSION
 * @param {string} word - The word to highlight
 * @param {string} pattern - The pattern to match (e.g., "a*", "m..e*")
 * @param {HTMLElement} targetElement - The DOM element to populate (avoids innerHTML)
 * @returns {void} - Populates targetElement with safe DOM nodes
 */
function highlightPatternMatch(word, pattern, targetElement) {
    // Clear target element
    targetElement.textContent = '';

    if (!pattern) {
        targetElement.textContent = word;
        return;
    }

    // Convert pattern to regex
    // Replace * with .* and . with single char
    const regexPattern = pattern
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
        .replace(/\\\*/g, '.*') // * becomes .*
        .replace(/\\\./g, '.'); // . becomes single char

    try {
        const regex = new RegExp(`^(${regexPattern})`, 'i');
        const match = word.match(regex);

        if (match && match[1]) {
            const matchedPart = match[1];
            const rest = word.substring(matchedPart.length);

            // Create elements safely using DOM API instead of innerHTML
            const highlightSpan = document.createElement('span');
            highlightSpan.className = 'pattern-match';
            highlightSpan.textContent = matchedPart; // Safe - uses textContent, not innerHTML

            targetElement.appendChild(highlightSpan);
            targetElement.appendChild(document.createTextNode(rest)); // Safe - text node
            return;
        }
    } catch (e) {
        // Invalid regex, return word as-is
        console.warn('Invalid pattern for highlighting:', pattern, e);
    }

    // Fallback: set as plain text (safe)
    targetElement.textContent = word;
}

/**
 * Display current page of results
 */
function displayResultsPage() {
    const totalPages = Math.ceil(currentResults.length / RESULTS_PER_PAGE);
    const start = (currentPage - 1) * RESULTS_PER_PAGE;
    const end = Math.min(start + RESULTS_PER_PAGE, currentResults.length);
    const pageResults = currentResults.slice(start, end);

    // Clear table
    elements.resultsBody.innerHTML = '';

    // Find max score for color coding
    const maxScore = currentResults.length > 0 ? currentResults[0].score : 0;

    // Add rows
    pageResults.forEach(result => {
        const row = document.createElement('tr');

        // Color code by score (relative to max)
        const scorePercent = maxScore > 0 ? (result.score / maxScore) * 100 : 0;
        if (scorePercent >= 70) {
            row.classList.add('score-excellent');
        } else if (scorePercent >= 40) {
            row.classList.add('score-good');
        } else {
            row.classList.add('score-average');
        }

        // Word cell with pattern highlighting and wildcard indicator
        const wordCell = document.createElement('td');

        // Highlight pattern match if there's a board pattern (SECURE - no innerHTML)
        const boardPattern = elements.boardPatternInput.value.trim();
        if (boardPattern) {
            highlightPatternMatch(result.word, boardPattern, wordCell);
        } else {
            wordCell.textContent = result.word;
        }

        // Add wildcard indicator if jokers were used
        if (result.usedJokers && result.usedJokers > 0) {
            const wildcardSpan = document.createElement('span');
            wildcardSpan.className = 'wildcard-indicator';
            wildcardSpan.title = `Bruger ${result.usedJokers} joker${result.usedJokers > 1 ? 'e' : ''}`;
            wildcardSpan.textContent = `×${result.usedJokers}`;
            wordCell.appendChild(wildcardSpan);
        }

        // Score cell with points per letter (improved layout)
        const scoreCell = document.createElement('td');

        const scoreContainer = document.createElement('div');
        scoreContainer.className = 'score-container';

        const mainScore = document.createElement('div');
        mainScore.className = 'main-score';
        mainScore.textContent = result.score;

        const pointsPerLetter = document.createElement('div');
        pointsPerLetter.className = 'points-per-letter';
        pointsPerLetter.textContent = `${(result.score / result.length).toFixed(1)} / bogst.`;

        scoreContainer.appendChild(mainScore);
        scoreContainer.appendChild(pointsPerLetter);
        scoreCell.appendChild(scoreContainer);

        // Length cell
        const lengthCell = document.createElement('td');
        lengthCell.textContent = result.length;

        // Add click handler for copy
        row.addEventListener('click', () => {
            // Copy word to clipboard
            navigator.clipboard.writeText(result.word).then(() => {
                // Add copied animation
                row.classList.add('copied');
                setTimeout(() => row.classList.remove('copied'), 1500);
            }).catch(err => {
                console.error('Failed to copy:', err);
            });
        });

        row.appendChild(wordCell);
        row.appendChild(scoreCell);
        row.appendChild(lengthCell);

        elements.resultsBody.appendChild(row);
    });

    // Update pagination
    if (totalPages > 1) {
        elements.pagination.style.display = 'flex';
        elements.pageInfo.textContent = `Side ${currentPage} af ${totalPages}`;
        elements.prevPage.disabled = currentPage === 1;
        elements.nextPage.disabled = currentPage === totalPages;
    } else {
        elements.pagination.style.display = 'none';
    }
}

/**
 * Handle clear button click - nulstiller ALLE felter og states
 */
function handleClear() {
    // Clear all text inputs
    elements.lettersInput.value = '';
    elements.boardPatternInput.value = '';
    elements.exactLength.value = '';
    elements.minLength.value = '';
    elements.maxLength.value = '';

    // Hide clear buttons (the small X buttons)
    elements.clearLettersBtn.style.display = 'none';
    elements.clearBoardBtn.style.display = 'none';

    // Reset radio buttons to defaults
    elements.lenModeAll.checked = true;

    // Reset sorting to default
    elements.sortSelect.value = 'score';

    // Update length inputs state (disable exact and range inputs)
    updateLengthInputsState();

    // Hide results section
    elements.resultsSection.style.display = 'none';

    // Hide error messages
    hideError();

    // Hide results preview
    elements.resultsPreview.style.display = 'none';

    // Hide input preview
    elements.inputPreview.style.display = 'none';

    // Hide search loading indicator
    elements.searchLoading.style.display = 'none';

    // Clear any pending preview timers
    if (previewTimer) {
        clearTimeout(previewTimer);
        previewTimer = null;
    }

    // Reset results state
    currentResults = [];
    currentPage = 1;

    // Clear results table body
    elements.resultsBody.innerHTML = '';

    // Update search button state (should disable it)
    updateSearchButtonState();

    // Re-enable search button if it was disabled
    elements.searchButton.disabled = true;
    elements.searchButton.classList.remove('loading');

    // Focus on main input for next search
    elements.lettersInput.focus();

    console.log('All fields cleared successfully');
}

/**
 * Show error message
 */
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
}

/**
 * Hide error message
 */
function hideError() {
    elements.errorMessage.style.display = 'none';
}

/**
 * Show app content (called after wordlist loads)
 */
export function showAppContent() {
    document.getElementById('wordlist-loading').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    elements.lettersInput.focus();
}

/**
 * Update loading progress
 */
export function updateLoadingProgress(percent) {
    const progressElement = document.getElementById('loading-progress');
    if (progressElement) {
        progressElement.textContent = `${percent}%`;
    }
}

/**
 * Show loading error
 */
export function showLoadingError(error) {
    const loadingContainer = document.getElementById('wordlist-loading');

    // Clear container safely
    loadingContainer.innerHTML = '';

    // Create error message element safely
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.display = 'block';

    const strong = document.createElement('strong');
    strong.textContent = 'Fejl ved indlæsning af ordliste:';

    const br = document.createElement('br');

    const messageText = document.createTextNode(error.message);

    errorDiv.appendChild(strong);
    errorDiv.appendChild(br);
    errorDiv.appendChild(messageText);

    loadingContainer.appendChild(errorDiv);
}

/**
 * Validate and sanitize a search object
 * Enhanced security: strict validation to prevent injection attacks
 */
function validateSearchObject(search) {
    if (!search || typeof search !== 'object') {
        return null;
    }

    // Security: Validate letters field with strict checks
    if (typeof search.letters !== 'string' || search.letters.length > 15) {
        return null;
    }

    // Security: Only allow valid characters in letters (no HTML, no scripts)
    if (!isValidInput(search.letters)) {
        console.warn('Invalid characters detected in stored search letters');
        return null;
    }

    // Security: Validate boardPattern field
    if (search.boardPattern !== undefined) {
        if (typeof search.boardPattern !== 'string' || search.boardPattern.length > 50) {
            return null;
        }
        // Security: Validate boardPattern contains only safe characters
        if (search.boardPattern && !isValidInput(search.boardPattern)) {
            console.warn('Invalid characters detected in stored search boardPattern');
            return null;
        }
    }

    // Security: Validate timestamp
    if (search.timestamp !== undefined &&
        (typeof search.timestamp !== 'number' || search.timestamp < 0 || search.timestamp > Date.now() + 86400000)) {
        return null;
    }

    // Security: Return a new object with only validated fields (prevent prototype pollution)
    return {
        letters: search.letters.substring(0, 15), // Enforce length limit
        boardPattern: (search.boardPattern || '').substring(0, 50), // Enforce length limit
        timestamp: search.timestamp || Date.now()
    };
}

/**
 * Get recent searches from localStorage
 */
function getRecentSearches() {
    try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (!stored) {
            return [];
        }

        const parsed = JSON.parse(stored);

        // Validate that it's an array
        if (!Array.isArray(parsed)) {
            console.warn('Invalid recent searches data, resetting');
            localStorage.removeItem(RECENT_SEARCHES_KEY);
            return [];
        }

        // Validate and sanitize each search object
        const validated = parsed
            .map(validateSearchObject)
            .filter(search => search !== null)
            .slice(0, MAX_RECENT_SEARCHES);

        return validated;
    } catch (error) {
        console.error('Error loading recent searches:', error);
        // Clear corrupted data
        try {
            localStorage.removeItem(RECENT_SEARCHES_KEY);
        } catch (e) {
            // Ignore if we can't clear
        }
        return [];
    }
}

/**
 * Save a search to recent searches
 */
function saveRecentSearch(lettersString, filters) {
    try {
        // Validate input before saving
        if (!lettersString || typeof lettersString !== 'string' || lettersString.length > 15) {
            console.warn('Invalid letters string, not saving to recent searches');
            return;
        }

        const searches = getRecentSearches();
        const newSearch = {
            letters: lettersString,
            boardPattern: (filters.boardPattern || '').substring(0, 50), // Limit length
            timestamp: Date.now()
        };

        // Validate the new search object
        const validated = validateSearchObject(newSearch);
        if (!validated) {
            console.warn('Failed to validate new search, not saving');
            return;
        }

        // Remove duplicate if exists
        const filtered = searches.filter(s =>
            s.letters !== validated.letters || s.boardPattern !== validated.boardPattern
        );

        // Add to beginning
        filtered.unshift(validated);

        // Keep only max number
        const trimmed = filtered.slice(0, MAX_RECENT_SEARCHES);

        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(trimmed));
        displayRecentSearches();
    } catch (error) {
        console.error('Error saving recent search:', error);
        // Don't throw - just fail silently
    }
}

/**
 * Display recent searches
 */
function displayRecentSearches() {
    const searches = getRecentSearches();

    if (searches.length === 0) {
        elements.recentSearches.style.display = 'none';
        return;
    }

    // Clear previous items
    elements.recentSearchesList.innerHTML = '';

    // Create items as modern chips
    searches.forEach((search, index) => {
        const chip = document.createElement('div');
        chip.className = 'recent-search-chip';
        chip.dataset.index = index;

        // Main text
        const textSpan = document.createElement('span');
        textSpan.className = 'chip-text';

        // Format display
        if (search.boardPattern) {
            const lettersSpan = document.createElement('strong');
            lettersSpan.textContent = search.letters;
            textSpan.appendChild(lettersSpan);
            textSpan.appendChild(document.createTextNode(' → '));
            const patternSpan = document.createElement('code');
            patternSpan.textContent = search.boardPattern;
            textSpan.appendChild(patternSpan);
        } else {
            textSpan.textContent = search.letters;
        }

        chip.appendChild(textSpan);

        // Add click handler to restore search
        chip.addEventListener('click', () => {
            applyRecentSearch(search);
        });

        elements.recentSearchesList.appendChild(chip);
    });

    elements.recentSearches.style.display = 'block';
}

/**
 * Apply a recent search
 */
function applyRecentSearch(search) {
    elements.lettersInput.value = search.letters;
    elements.boardPatternInput.value = search.boardPattern || '';

    updateSearchButtonState();
    updateClearButtonVisibility(elements.lettersInput, elements.clearLettersBtn);
    updateClearButtonVisibility(elements.boardPatternInput, elements.clearBoardBtn);
    updateInputPreview();

    // Trigger search
    handleSearch();
}

/**
 * Remove a recent search
 */
function removeRecentSearch(index) {
    try {
        const searches = getRecentSearches();
        searches.splice(index, 1);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
        displayRecentSearches();
    } catch (error) {
        console.error('Error removing recent search:', error);
    }
}

/**
 * Initialize guide collapse/expand functionality
 */
function initGuideToggle() {
    const guideToggle = document.getElementById('guide-toggle');
    const guideContent = document.getElementById('guide-content');

    if (!guideToggle || !guideContent) {
        console.warn('Guide toggle elements not found:', { guideToggle: !!guideToggle, guideContent: !!guideContent });
        return;
    }

    const guideToggleIcon = guideToggle.querySelector('.guide-toggle-icon');

    // Check localStorage for saved state (default: expanded on first visit)
    const isCollapsed = localStorage.getItem('guide-collapsed') === 'true';

    // Set initial state
    if (isCollapsed) {
        guideContent.style.display = 'none';
        guideToggle.setAttribute('aria-expanded', 'false');
        if (guideToggleIcon) guideToggleIcon.textContent = '▶';
    } else {
        guideContent.style.display = 'block';
        guideToggle.setAttribute('aria-expanded', 'true');
        if (guideToggleIcon) guideToggleIcon.textContent = '▼';
    }

    // Toggle handler with smooth animation
    guideToggle.addEventListener('click', () => {
        console.log('Guide toggle clicked!');
        const isCurrentlyExpanded = guideToggle.getAttribute('aria-expanded') === 'true';

        if (isCurrentlyExpanded) {
            // Collapse with animation
            guideContent.style.maxHeight = guideContent.scrollHeight + 'px';
            // Trigger reflow
            void guideContent.offsetHeight;
            guideContent.classList.add('collapsing');
            guideContent.style.maxHeight = '0';

            setTimeout(() => {
                guideContent.style.display = 'none';
                guideContent.classList.remove('collapsing');
            }, 300); // Match CSS transition duration

            guideToggle.setAttribute('aria-expanded', 'false');
            if (guideToggleIcon) guideToggleIcon.textContent = '▶';
            localStorage.setItem('guide-collapsed', 'true');
        } else {
            // Expand with animation
            guideContent.style.display = 'block';
            guideContent.style.maxHeight = '0';
            guideContent.classList.add('expanding');

            // Trigger reflow
            void guideContent.offsetHeight;

            guideContent.style.maxHeight = guideContent.scrollHeight + 'px';

            setTimeout(() => {
                guideContent.style.maxHeight = 'none';
                guideContent.classList.remove('expanding');
            }, 300); // Match CSS transition duration

            guideToggle.setAttribute('aria-expanded', 'true');
            if (guideToggleIcon) guideToggleIcon.textContent = '▼';
            localStorage.setItem('guide-collapsed', 'false');
        }
    });

    console.log('✅ Guide toggle initialized successfully');
}
