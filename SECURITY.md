# Security Documentation - Wordfeud Helper

## Overview
This document outlines the security measures implemented in the Wordfeud Helper application to protect against common web vulnerabilities.

## Security Improvements Implemented

### 1. **Cross-Site Scripting (XSS) Protection**

#### Fixed Vulnerabilities:
- **DOM-based XSS in Pattern Highlighting** (ui.js)
  - **Before**: Used `innerHTML` to insert user-controlled pattern data
  - **After**: Refactored to use safe DOM API (`createElement`, `textContent`, `createTextNode`)
  - **Location**: `highlightPatternMatch()` function in `src/ui.js:611-651`
  - **Impact**: Prevents malicious HTML/JavaScript injection through board pattern input

#### Implementation:
```javascript
// SECURE: Uses DOM API instead of innerHTML
function highlightPatternMatch(word, pattern, targetElement) {
    const highlightSpan = document.createElement('span');
    highlightSpan.className = 'pattern-match';
    highlightSpan.textContent = matchedPart; // Safe - textContent, not innerHTML
    targetElement.appendChild(highlightSpan);
    targetElement.appendChild(document.createTextNode(rest));
}
```

### 2. **Content Security Policy (CSP)**

#### Enhanced Headers (index.html:11-16):
- **Removed** `'unsafe-inline'` from `script-src`
- **Added** `X-Frame-Options: DENY` for clickjacking protection
- **Added** `upgrade-insecure-requests` to enforce HTTPS
- **Moved** inline scripts to external file (`src/init.js`) for CSP compliance

#### Current CSP (via meta tag):
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
worker-src 'self';
connect-src 'self';
img-src 'self' data:;
font-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests;
```

**Important Notes**:
- `style-src` still allows `'unsafe-inline'` to maintain CSS functionality without breaking the UI
- **`frame-ancestors` cannot be set via meta tag** - Use `X-Frame-Options: DENY` instead (already implemented)
- For full frame protection, set CSP via HTTP headers on your server (see below)

### 3. **Input Validation & Sanitization**

#### Enhanced Validation (utils.js:30-42):
- **Type checking**: Ensures input is a string
- **Length limits**: Maximum 50 characters to prevent DoS
- **Character whitelist**: Only allows Danish letters (A-Å, Æ, Ø, Å) and wildcards (?, _, *, space)
- **Regex validation**: Strict pattern matching

#### Additional Validation in Search (ui.js:441-458):
- Validates letters input length (max 15 characters)
- Validates board pattern characters
- Prevents injection attacks through strict input validation

### 4. **Regular Expression Denial of Service (ReDoS) Protection**

#### Implementation (searchEngine.js:122-166, searchWorker.js:310-352):
- **Pattern length limit**: Maximum 50 characters
- **Wildcard count limit**: Maximum 15 wildcards
- **Try-catch blocks**: Catches regex errors gracefully
- **Escape special characters**: Properly escapes all regex special characters

```javascript
// Security: Limit pattern length to prevent ReDoS
if (trimmed.length > 50) {
    console.warn('Board pattern too long, rejecting');
    return false;
}

// Security: Prevent excessive wildcards that could cause ReDoS
if (wildcardCount > 15) {
    console.warn('Too many wildcards in pattern, rejecting');
    return false;
}
```

### 5. **localStorage Security**

#### Enhanced Validation (ui.js:885-925):
- **Type validation**: Strict type checking for all stored data
- **Input validation**: Validates characters using `isValidInput()`
- **Length enforcement**: Enforces maximum lengths (letters: 15, boardPattern: 50)
- **Timestamp validation**: Ensures timestamps are reasonable (not in far future)
- **Prototype pollution prevention**: Creates new objects with only validated fields
- **Graceful error handling**: Try-catch blocks with corrupted data cleanup

```javascript
// Security: Validate stored data before using
if (!isValidInput(search.letters)) {
    console.warn('Invalid characters detected in stored search letters');
    return null;
}

// Security: Return new object to prevent prototype pollution
return {
    letters: search.letters.substring(0, 15),
    boardPattern: (search.boardPattern || '').substring(0, 50),
    timestamp: search.timestamp || Date.now()
};
```

### 6. **Service Worker Security**

#### Enhanced Security (service-worker.js):
- **Origin validation**: Only serves requests from same origin
- **Method restriction**: Only handles GET requests (prevents cache poisoning)
- **URL validation**: Try-catch for URL parsing
- **Suspicious pattern blocking**: Blocks requests with dangerous patterns
- **Content-type validation**: Only caches safe MIME types
- **Updated cache version**: `v7-secure` to include new security updates

```javascript
// Security: Block requests with suspicious patterns
const suspiciousPatterns = /<script|javascript:|data:text\/html|vbscript:|file:/i;
if (suspiciousPatterns.test(requestUrl.href)) {
    console.warn('Service Worker: Blocked suspicious request', requestUrl.href);
    return;
}
```

### 7. **Web Worker Security**

#### Input Validation (searchWorker.js:64-79):
- **Type validation**: Validates payload types
- **Length limits**: Enforces maximum input length
- **Graceful error handling**: Returns early on invalid input

## Security Headers Summary

### Current Headers (via meta tags):
| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | See above | XSS protection |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `X-Frame-Options` | `DENY` | Clickjacking protection |
| `Referrer-Policy` | `no-referrer` | Privacy protection |

### Recommended Server-Side Headers:

**🚀 For Nginx/Apache + Cloudflare setup, see `CLOUDFLARE-SETUP.md` for detailed deployment instructions.**

If you're hosting this on a web server (Apache, Nginx, etc.), add these HTTP headers for enhanced security:

**Apache (.htaccess or httpd.conf):**
```apache
Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
Header always set X-Frame-Options "DENY"
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "no-referrer"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
```

**Nginx (nginx.conf or site config):**
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

**Netlify (_headers file):**
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Vercel (vercel.json):**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "no-referrer"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=()"
        }
      ]
    }
  ]
}
```

## Limitations of Meta-Tag Security Headers

### What Works via Meta Tags:
✅ `Content-Security-Policy` (most directives)
✅ `X-Content-Type-Options`
✅ `Referrer-Policy`
✅ `X-Frame-Options` (limited browser support)

### What DOESN'T Work via Meta Tags:
❌ `frame-ancestors` (CSP directive - requires HTTP header)
❌ `Strict-Transport-Security` (HSTS - requires HTTP header)
❌ `Permissions-Policy` (requires HTTP header)
❌ `report-uri` / `report-to` (CSP reporting - requires HTTP header)

**Why This Matters**:
- Meta tags are parsed after the HTML starts loading
- HTTP headers are sent before any content is loaded
- Some security features require HTTP header delivery for proper enforcement

**Current Implementation**: We use `X-Frame-Options: DENY` via meta tag for clickjacking protection, which works in most browsers but is less robust than `frame-ancestors` via HTTP header.

## Remaining Considerations

### Recommended if You Have Server Access:
1. **HSTS Header**: Set `Strict-Transport-Security` via HTTP header for HTTPS enforcement
2. **frame-ancestors**: Set via HTTP header CSP for stronger clickjacking protection
3. **Permissions-Policy**: Disable unnecessary browser features via HTTP header
4. **CSP Reporting**: Enable CSP violation reporting for monitoring

### Low Priority Items:
1. **Subresource Integrity (SRI)**: Not applicable - no external resources
2. **Rate Limiting**: Client-side app - rate limiting should be handled server-side if API is added

### Future Recommendations:
1. **Move styles to hash-based CSP**: Remove `'unsafe-inline'` from `style-src` CSP directive
2. **Add server-side validation**: If backend API is added, validate all inputs server-side
3. **Implement CSP reporting**: Add `report-uri` or `report-to` for CSP violations (requires HTTP headers)
4. **Add integrity checks**: If external CDN resources are added, use SRI

## Testing Recommendations

### Security Testing Checklist:
- [ ] Test XSS payloads in all input fields
- [ ] Verify CSP blocks inline scripts
- [ ] Test localStorage injection attempts
- [ ] Verify ReDoS protection with complex patterns
- [ ] Test clickjacking protection (X-Frame-Options)
- [ ] Validate input sanitization with special characters

### Example XSS Test Payloads (Should be blocked):
```
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
javascript:alert('XSS')
"><script>alert('XSS')</script>
```

## Security Contact
For security concerns or vulnerability reports, please contact the developer through the repository.

## Changelog

### 2025-12-13 - Security Hardening Release
- Fixed DOM-based XSS vulnerability in pattern highlighting
- Strengthened Content Security Policy
- Enhanced input validation and sanitization
- Added ReDoS protection for regex patterns
- Improved localStorage security
- Enhanced service worker security
- Added comprehensive security documentation

---
**Last Updated**: 2025-12-13
**Security Review**: Complete
**Status**: Production Ready
