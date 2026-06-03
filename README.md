# ⛳ The Last Par

A mobile-first Progressive Web App (PWA) for playing **The Last Par** golf pot game.

## 🏌️ How to Play

- Every time any player makes a **net par**, all players put **$1** into the pot
- Every **net birdie** → **$2** per player
- Every **net eagle** → **$3** per player
- Every **net double eagle** → **$4** per player
- **Whoever makes the very last qualifying score wins the whole pot**
- On the same hole, a birdie beats a par (eagle beats birdie, etc.)
- A birdie on hole 17 does **not** beat a par on hole 18

## ♿ Handicap Support

Full USGA-style handicap strokes applied per hole:
- Enter each player's handicap index
- Enter each hole's HCP rating (1 = hardest, 18 = easiest)
- Strokes are awarded automatically — net scores determine all payouts

## 📱 Installing the App

1. Open the app link in **Safari (iPhone)** or **Chrome (Android)**
2. Tap **Share → Add to Home Screen**
3. The app installs and works offline — perfect for the course!

## 🌐 Live App

> `https://YOUR-USERNAME.github.io/the-last-par/`

## 🚀 Deploying Your Own Copy

1. Fork or clone this repo
2. In your GitHub repo settings → **Pages** → set source to **GitHub Actions**
3. Push to `main` — the app deploys automatically
4. Update the `start_url` in `manifest.json` to match your GitHub Pages URL

```json
"start_url": "/the-last-par/"
```

Replace `the-last-par` with your actual repository name.

## 🛠️ Tech Stack

- Vanilla HTML/CSS/JavaScript — no build tools, no dependencies
- PWA with service worker for offline play
- localStorage for round persistence (close and reopen mid-round)
- GitHub Actions for automatic deployment

## 📁 File Structure

```
├── index.html      — App shell and all screens
├── styles.css      — All styles
├── app.js          — Game logic, state management, rendering
├── sw.js           — Service worker (offline support)
├── manifest.json   — PWA manifest
└── .github/
    └── workflows/
        └── deploy.yml — GitHub Pages auto-deploy
```

---

Built for the group. Enjoy the round. 🏌️‍♂️
