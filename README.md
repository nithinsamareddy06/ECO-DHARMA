# EcoDharma

AI-powered waste management for households and communities. Snap or type any waste item and get the right bin, how to prepare it, and reuse ideas. Find recyclers nearby, build a daily streak, and see your impact.

Built with the MERN stack and the Gemini API. Started for Smart India Hackathon 2025 (Problem Statement 25060, Clean & Green Technology) by team Nexus Thinkers.

## Why it exists

India generates roughly 1.5 to 1.7 lakh tonnes of municipal solid waste every day (CPCB), and much of it is mixed at home, which makes recycling harder downstream. EcoDharma helps people sort correctly at the source, using India's wet / dry / hazardous bin system.

## Features

- **Waste classification:** photo (Gemini vision) or text. Seven categories: plastic, paper, glass, metal, organic, e-waste, hazardous.
- **Disposal and reuse guidance:** the right bin, a one-line prep tip, and up to three reuse ideas.
- **Recycler finder:** nearby recycling points and scrap dealers from OpenStreetMap, with Google Maps directions. No Maps API key needed.
- **Eco Points and streaks:** points are calculated on the server, with a bonus for consecutive days.
- **Impact dashboard:** items sorted, waste mix, estimated CO₂e saved, leaderboard.
- **Works without AI:** if no Gemini key is set, text search runs on built-in rules, so anyone can run it for free.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, plain CSS |
| Backend | Node.js, Express, JWT auth, bcrypt, rate limiting |
| Database | MongoDB with Mongoose |
| AI | Google Gemini API (`@google/generative-ai`) |
| Maps data | OpenStreetMap Overpass API |

## Run locally

Requirements: Node 18+, MongoDB (local or Atlas).

```bash
git clone https://github.com/<nithinsamareddy06>/EcoDharma.git
cd EcoDharma
npm run install:all
cp server/.env.example server/.env   # then edit the values
npm run dev:server                   # terminal 1, http://localhost:5000
npm run dev:client                   # terminal 2, http://localhost:5173
```

Get a free Gemini key at https://aistudio.google.com/apikey and put it in `GEMINI_API_KEY` to enable photo scan.

### Environment variables (`server/.env`)

| Name | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Long random string for signing tokens |
| `GEMINI_API_KEY` | no | Enables photo scan and AI text classification |
| `GEMINI_MODEL` | no | Defaults to `gemini-2.5-flash` |
| `CLIENT_ORIGIN` | no | Allowed CORS origin, defaults to `http://localhost:5173` |
| `PORT` | no | Defaults to 5000 |

## API

All routes except health and auth need `Authorization: Bearer <token>`.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Status and whether AI is on |
| POST | `/api/auth/signup`, `/api/auth/login` | Create account, sign in |
| POST | `/api/classify` | `{ text?, image? }` returns category, bin, tip, reuse ideas |
| POST | `/api/scans` | Save a confirmed sort, award points |
| GET | `/api/me` | Stats, waste mix, recent scans |
| GET | `/api/leaderboard` | Top 10 users |
| GET | `/api/recyclers?lat=&lng=&radius=` | Nearby recycling points |

## Project structure

```
server/src/   index.js (routes), ai.js (Gemini + fallback), waste.js (categories, rules), models.js
client/src/   App.jsx (screens), api.js (fetch + image resize), styles.css
```

## Troubleshooting

- **Restart the server after editing `.env`.** It does not reload environment variables on its own.
- **`model ... is no longer available` (404):** Google retires model names. Pick a current Flash model id from https://aistudio.google.com and set `GEMINI_MODEL`.
- **503 or 429 from Gemini:** temporary overload or free-tier rate limit. The server retries, then falls back to the offline rules for text items.
- **`EADDRINUSE :5000`:** another copy of the server is running. Stop it, or change `PORT`.
- **MongoDB auth or timeout errors:** check the password in `MONGODB_URI` and that your IP is allowed in Atlas Network Access.

## Limitations

- CO₂e savings are rough estimates, not audited figures.
- AI classification can be wrong. Always check the bin guidance for hazardous items.
- OpenStreetMap coverage of Indian recyclers is incomplete in some areas.
- Photos are sent to Gemini for analysis and are not stored by this app.

## Roadmap

- Community challenges and weekly goals
- Multi-language support (Telugu, Hindi)
- Waste collection scheduling
- NGO and municipality dashboards
- Installable PWA

## Contributing

Issues and pull requests are welcome. To add an item to the offline rules, edit `server/src/waste.js`.

## License

MIT. See [LICENSE](LICENSE).
