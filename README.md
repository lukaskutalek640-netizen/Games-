# Oasis Community

Kompletní projekt obsahuje:
- **Discord landing page od začátku** s bočním panelem (`index.html`, `styles.css`, `script.js`)
- **Discord anti-raid + verify bot** (`discord-bot/`)

## Web (landing page)

```bash
python3 -m http.server 4173
```

Otevři: `http://localhost:4173`

## Discord bot

```bash
cd discord-bot
cp .env.example .env
npm install
npm start
```

## Nasazení zdarma (web + doména/subdoména + bot)

Podrobný návod je v souboru:

- [`DEPLOYMENT.md`](./DEPLOYMENT.md)
