# Wordfeud Hjælper Dansk

A free, fast and offline-capable Wordfeud helper for Danish players.

Live at [wordfeud.jonasvindahl.dev](https://wordfeud.jonasvindahl.dev/)

## Features

**Core Functionality**
- Over 400,000 Danish words with comprehensive inflections
- Wildcard support using `?` for joker tiles
- Pattern matching with `*` and `.` for board positions
- Automatic point calculation based on Wordfeud scoring system
- Sort by points, length, or alphabetically

**Technical**
- Progressive Web App (PWA) - installable on mobile and desktop
- Works completely offline after first load
- Web Workers for optimized search performance
- No frameworks - vanilla JavaScript
- No tracking, no ads, no external dependencies

## How to Use

1. Enter your letters - e.g. `TRÆON`
2. Use wildcards - e.g. `TRÆ?ON` (? = any letter)
3. Specify pattern - e.g. `M*` (words starting with M)
4. Sort and filter - by points, length, or alphabetically

### Pattern Examples

- `M*` - Words starting with M
- `*D` - Words ending with D
- `..A*` - Words where 3rd letter is A
- `M..GE*` - M + 2 letters + GE + optional extra

## Tech Stack

- Vanilla JavaScript (ES6+) with ES modules
- Service Worker for offline functionality
- Web Workers for background search processing
- CSS Custom Properties for theming
- LocalStorage for caching and user preferences
- No build step required

## Project Structure

```
wordfeud-helper-danish/
├── index.html              # Main HTML
├── styles.css              # All styling
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline support
├── searchWorker.js         # Background search
├── src/
│   ├── init.js            # Entry point
│   ├── main.js            # App initialization
│   ├── ui-v2.js           # UI logic (current)
│   ├── searchEngine.js    # Word search algorithm
│   ├── wordlistLoader.js  # Load Danish words
│   ├── utils.js           # Helper functions
│   └── scoring.js         # Point calculation
├── public/
│   └── words.json         # 400k+ Danish words (6MB)
├── og-image.svg           # Social media preview
├── twitter-image.svg      # Twitter card image
├── robots.txt             # SEO
└── sitemap.xml            # SEO
```

## Development

### Running Locally

```bash
# Clone repository
git clone https://github.com/JonasVindahl/wordfeud-helper-danish.git
cd wordfeud-helper-danish

# Start local server
python3 -m http.server 8080
# or
npx serve

# Open browser
open http://localhost:8080
```

No build step required - this is a modern vanilla JavaScript application. Simply open `index.html` in a browser.

## SEO & Performance

- Lighthouse score: 90+
- Mobile-first responsive design
- Structured data with JSON-LD (WebApplication + FAQPage schema)
- Open Graph and Twitter Card meta tags
- Sitemap and robots.txt for search engines
- Optimized for Danish search queries

## Security

See [SECURITY.md](SECURITY.md) for details on:
- Content Security Policy (CSP)
- CORS headers
- XSS protection
- Cloudflare configuration

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

Jonas Vindahl Bang
- Website: [jonasvindahl.dev](https://jonasvindahl.dev/)
- GitHub: [@JonasVindahl](https://github.com/JonasVindahl)

## Acknowledgments

- Word list based on Den Danske Ordbog
- UI inspired by Nordic design principles
- Developed with assistance from Claude AI
