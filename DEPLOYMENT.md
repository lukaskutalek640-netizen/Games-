# Deployment návod (zdarma)

Tady máš nejjednodušší postup, jak nasadit celý projekt:
- **web (landing page)** zdarma na Cloudflare Pages
- **Discord bot** zdarma na Renderu

---

## 1) Web zdarma (Cloudflare Pages)

### Co potřebuješ
- GitHub účet
- Cloudflare účet (free)
- repo nahrané na GitHub

### Postup
1. Nahraj projekt do GitHub repozitáře.
2. Otevři Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Pages**.
3. Klikni **Connect to Git** a vyber svůj GitHub repo.
4. Build settings:
   - Framework preset: `None`
   - Build command: nech prázdné
   - Build output directory: `/`
5. Klikni **Save and Deploy**.
6. Po deploy dostaneš free URL ve tvaru:
   - `https://<projekt>.pages.dev`

### Doména zdarma
- Okamžitě zdarma funguje subdoména `*.pages.dev`.
- Pokud chceš vlastní doménu, připojíš ji v Pages → Custom domains (doména samotná bývá placená).

---

## 2) Discord bot zdarma (Render)

> Bot běží jako Node proces, proto ho nenasazuješ na Pages, ale na server/runtime hosting.

### Co potřebuješ
- Render účet (free)
- Discord bot token a IDs (viz `discord-bot/.env.example`)

### Postup
1. Na Renderu klikni **New +** → **Web Service**.
2. Propoj GitHub repo.
3. Nastav:
   - Root Directory: `discord-bot`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. V sekci **Environment** přidej proměnné z `.env.example`:
   - `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`, `VERIFIED_ROLE_ID`, `VERIFY_CHANNEL_ID`, `LOG_CHANNEL_ID`, ...
5. Deployni službu.
6. Po startu se bot přihlásí a zaregistruje slash commandy.

### Poznámky k free tieru
- Free instance může po neaktivitě "usnout".
- Pokud se uspí, první reakce může mít pár sekund zpoždění.

---

## 3) Rychlá kontrola po deploy

### Web
- Otevři `https://<projekt>.pages.dev`
- Zkontroluj načtení CSS/JS
- Ověř fungování formuláře a menu/sidebar

### Bot
- Na Discord serveru spusť `/raid-status`
- Spusť `/setup-verify`
- Otestuj verifikační tlačítko a log kanál

---

## 4) Doporučení pro produkci

- V Discord Developer Portal zapni jen potřebné intents.
- Role bota dej **nad** role, které má přidávat/odebírat.
- Zamkni `VERIFY_CHANNEL_ID` právy (jen čtení + tlačítko, bez spamu).
- Log kanál měj pouze pro staff.
