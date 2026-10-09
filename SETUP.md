# EcoDharma: Setup Guide

Follow these steps to run EcoDharma on your own computer. It takes about 10 minutes. You need your own free database, because the author's database is private.

## 1. Install the tools

| Tool | Why | Download |
|---|---|---|
| Node.js 18 or newer (LTS) | Runs the server and the website | https://nodejs.org |
| Git | Downloads the project | https://git-scm.com |
| VS Code (optional) | Easier to edit files | https://code.visualstudio.com |

Check the install by opening a terminal and running `node -v` and `git --version`. Both should print a version number.

## 2. Get the code

```bash
git clone https://github.com/<nithinsamareddy06>/EcoDharma.git
cd EcoDharma
npm run install:all
```

## 3. Create a free MongoDB database (Atlas)

1. Sign up at https://www.mongodb.com/atlas and create a **free (M0)** cluster.
2. When asked, create a **database user**. Choose a password with letters and numbers only. Save it.
3. Under **Network Access**, add your current IP address. If you move to a different network later, add that IP too.
4. Click **Connect > Drivers > Node.js** and copy the connection string. It looks like `mongodb+srv://user:<db_password>@cluster0.xxxxx.mongodb.net/`.
5. Replace `<db_password>` with your password (no `<` `>` brackets) and add the database name `ecodharma` after `.mongodb.net/`:
   ```
   mongodb+srv://user:YourPassword@cluster0.xxxxx.mongodb.net/ecodharma?appName=Cluster0
   ```

Prefer a local database? Install MongoDB Community Server and use `mongodb://127.0.0.1:27017/ecodharma`.

## 4. Configure the server

Copy the example settings file.

- Windows: `copy server\.env.example server\.env`
- Mac or Linux: `cp server/.env.example server/.env`

Open `server/.env` and fill in:

```
MONGODB_URI=<your connection string from step 3>
JWT_SECRET=<any long random text>
GEMINI_API_KEY=<optional, see below>
GEMINI_MODEL=<optional, see below>
```

**Never share or upload `.env`.** It holds your secrets and is already excluded from Git.

### Optional: turn on photo scan and AI recognition

1. Create a free key at https://aistudio.google.com/apikey.
2. Paste it after `GEMINI_API_KEY=`.
3. Check the current model names in https://aistudio.google.com and set `GEMINI_MODEL` to a current Flash model. Google retires old names, so the default in `.env.example` may be out of date.

Without a key, the app still works for typed items using built-in rules, but photo scan is off and fewer items are recognised.

## 5. Run it

Open **two terminals** in the project folder and keep both running.

Terminal 1 (server):
```bash
npm run dev:server
```
You should see `EcoDharma API on :5000 (AI on)` or `(AI off)` if you skipped the key.

Terminal 2 (website):
```bash
npm run dev:client
```

Open **http://localhost:5173**, create an account, and try an item such as "plastic bottle".

If you change `server/.env`, stop the server with Ctrl+C and start it again. It does not reload settings by itself.

## 6. Using the app

- **Sort:** type an item or upload a photo. You get the right bin, a prep tip and reuse ideas. Press "I sorted it" to earn Eco Points.
- **Impact:** points, streak, items sorted, estimated CO₂e saved and the leaderboard.
- **Find:** allow location access to see nearby recycling points and scrap dealers, with directions in Google Maps.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Could not read package.json` | You are in the wrong folder. `cd` into the folder that contains `client`, `server` and `package.json`. |
| `Set JWT_SECRET and MONGODB_URI` | `server/.env` is missing or in the wrong place. It must be inside `server`. |
| `Authentication failed` | The database password in `MONGODB_URI` is wrong. Copy it again from Atlas. |
| MongoDB timeout or cannot connect | Your IP is not allowed. Add it under Atlas > Network Access. |
| `EADDRINUSE :5000` | The server is already running in another terminal. Close it, or change `PORT` in `.env`. |
| Gemini 404 "model not found" | Set `GEMINI_MODEL` to a current model name, then restart the server. |
| Gemini 503 or 429 | Temporary overload or free-tier limit. Wait a minute and retry. |
| Recycler search is empty | Allow location in your browser. OpenStreetMap coverage is incomplete in some areas. |

## Run your own online copy (optional)

To let others use your own copy without installing anything, deploy the server on a host such as Render or Railway, and the `client` folder on Vercel or Netlify. Set the same variables from `.env` in the host's dashboard. The client calls `/api`, so point it at your server URL (for example with a proxy or rewrite rule) when you deploy.
