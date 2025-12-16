# Wordfeud Hjælper Dansk 🇩🇰

Et gratis, hurtigt og offline-klar Wordfeud-værktøj til danske spillere.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://wordfeud.jonasvindahl.dev/)
[![PWA](https://img.shields.io/badge/PWA-enabled-blue)](https://wordfeud.jonasvindahl.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## ✨ Features

- 🔍 **Over 400.000 danske ord** - Omfattende ordliste med bøjninger
- 🃏 **Joker-support** - Brug `?` som wildcard bogstav
- 🎯 **Mønster-søgning** - Find ord med `*` og `.` mønstre
- 📊 **Point-beregning** - Automatisk beregning efter Wordfeud's pointsystem
- 📱 **PWA** - Installer som app på mobil og desktop
- 🚀 **Offline-klar** - Virker uden internetforbindelse
- 🎨 **Modern UI** - Rent Nordic design
- ⚡ **Hurtig** - Web Workers for optimeret søgning
- 🔒 **Privacy-first** - Ingen tracking, ingen ads

## 🚀 Live Demo

Besøg [wordfeud.jonasvindahl.dev](https://wordfeud.jonasvindahl.dev/)

## 📖 Sådan bruges det

1. **Indtast dine bogstaver** - fx `TRÆON`
2. **Brug joker** - fx `TRÆ?ON` (? = vilkårligt bogstav)
3. **Angiv mønster** - fx `M*` (ord der starter med M)
4. **Sorter og filtrer** - efter point, længde eller alfabetisk

### Mønster-eksempler

- `M*` - Ord der starter med M
- `*D` - Ord der slutter på D
- `..A*` - Ord hvor 3. bogstav er A
- `M..GE*` - M + 2 bogstaver + GE + evt. ekstra

## 🛠️ Tech Stack

- **Vanilla JavaScript** (ES6+) - Ingen frameworks
- **PWA** - Service Worker + Manifest
- **Web Workers** - Background search
- **CSS Custom Properties** - Modern styling
- **LocalStorage** - Cache og preferences

## 📂 Projekt Struktur

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

## 🚀 Development

### Kør lokalt

```bash
# Clone repository
git clone https://github.com/JonasVindahl/wordfeud-helper-danish.git
cd wordfeud-helper-danish

# Start local server
python3 -m http.server 8080
# eller
npx serve

# Åbn browser
open http://localhost:8080
```

### Ingen build required!

Dette er en moderne vanilla JavaScript app uden build step. Bare åbn `index.html` i en browser.

## 📊 SEO & Performance

- ✅ **Lighthouse Score**: 90+
- ✅ **Mobile-First**: Responsive design
- ✅ **Structured Data**: JSON-LD (WebApplication + FAQPage)
- ✅ **Meta Tags**: Open Graph + Twitter Cards
- ✅ **Sitemap**: For Google indexing
- ✅ **robots.txt**: Optimeret til crawlers

## 🔒 Security

Se [SECURITY.md](SECURITY.md) for detaljer om:
- Content Security Policy (CSP)
- CORS headers
- XSS protection
- Cloudflare setup

## 🤝 Contributing

Contributions er velkomne!

1. Fork projektet
2. Opret en feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit dine ændringer (`git commit -m 'Add AmazingFeature'`)
4. Push til branch (`git push origin feature/AmazingFeature`)
5. Åbn en Pull Request

## 📝 License

MIT License - se [LICENSE](LICENSE) for detaljer.

## 👤 Author

**Jonas Vindahl Bang**

- Website: [jonasvindahl.dev](https://jonasvindahl.dev/)
- GitHub: [@JonasVindahl](https://github.com/JonasVindahl)

## 🙏 Acknowledgments

- Ordliste baseret på Den Danske Ordbog
- UI inspireret af Nordic design principper
- Udviklet i samarbejde med AI

## 📈 Roadmap

- [ ] Understøtte andre sprog (norsk, svensk)
- [ ] Tilføje anagram-søgning
- [ ] Export til PDF/print
- [ ] Dark mode
- [ ] Ord-historik

---

⭐ **Giv en stjerne** hvis du finder dette projekt nyttigt!
