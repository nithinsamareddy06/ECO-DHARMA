import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, Scan } from "./models.js";
import { classify, aiEnabled } from "./ai.js";
import { CATEGORIES, build } from "./waste.js";

const { JWT_SECRET, MONGODB_URI, PORT = 5000, CLIENT_ORIGIN = "http://localhost:5173" } = process.env;
if (!JWT_SECRET || !MONGODB_URI) { console.error("Set JWT_SECRET and MONGODB_URI in server/.env"); process.exit(1); }

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: "8mb" }));
app.use("/api", rateLimit({ windowMs: 60_000, limit: 60 }));

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => res.status(e.status || 500).json({ error: e.status ? e.message : "Server error" }));
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const token = (u) => jwt.sign({ id: u._id }, JWT_SECRET, { expiresIn: "14d" });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, points: u.points, streak: u.streak });

function requireAuth(req, res, next) {
  try { req.uid = jwt.verify((req.headers.authorization || "").replace("Bearer ", ""), JWT_SECRET).id; next(); }
  catch { res.status(401).json({ error: "Please sign in." }); }
}

app.get("/api/health", (_, res) => res.json({ ok: true, ai: aiEnabled() }));

app.post("/api/auth/signup", wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !/^\S+@\S+\.\S+$/.test(email || "") || (password || "").length < 8) fail(400, "Enter a name, a valid email and a password of 8+ characters.");
  if (await User.findOne({ email: email.toLowerCase() })) fail(409, "That email is already registered.");
  const u = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: token(u), user: pub(u) });
}));

app.post("/api/auth/login", wrap(async (req, res) => {
  const u = await User.findOne({ email: (req.body.email || "").toLowerCase() });
  if (!u || !(await bcrypt.compare(req.body.password || "", u.passwordHash))) fail(401, "Wrong email or password.");
  res.json({ token: token(u), user: pub(u) });
}));

app.post("/api/classify", requireAuth, wrap(async (req, res) => {
  const { text, image } = req.body;
  if (!text && !image) fail(400, "Describe the item or upload a photo.");
  res.json(await classify({ text: text?.slice(0, 100), image }));
}));

// Save a confirmed sort: awards points and updates the daily streak.
app.post("/api/scans", requireAuth, wrap(async (req, res) => {
  const b = req.body;
  if (!CATEGORIES[b.category]) fail(400, "Unknown category.");
  // Points and bin come from the server's table, never from the client.
  const r = build(String(b.item || "item").slice(0, 80), b.category, String(b.tip || "").slice(0, 200),
    (b.reuse || []).slice(0, 3).map(String), Math.min(Math.max(Number(b.co2) || 0, 0), 10));
  const u = await User.findById(req.uid);
  const today = new Date().toISOString().slice(0, 10);
  if (u.lastDay !== today) {
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    u.streak = u.lastDay === y ? u.streak + 1 : 1;
    u.lastDay = today;
  }
  const points = r.points + Math.min(u.streak, 7);
  u.points += points;
  await u.save();
  await Scan.create({ user: u._id, item: r.item, category: r.category, bin: r.bin, tip: r.tip, reuse: r.reuse, points, co2: r.co2 });
  res.status(201).json({ user: pub(u), earned: points });
}));

app.get("/api/me", requireAuth, wrap(async (req, res) => {
  const [u, scans] = await Promise.all([User.findById(req.uid), Scan.find({ user: req.uid }).sort("-createdAt").limit(200)]);
  const byCategory = {};
  scans.forEach((s) => (byCategory[s.category] = (byCategory[s.category] || 0) + 1));
  res.json({ user: pub(u), totalItems: scans.length, co2: +scans.reduce((a, s) => a + (s.co2 || 0), 0).toFixed(2), byCategory, recent: scans.slice(0, 8) });
}));

app.get("/api/leaderboard", requireAuth, wrap(async (_, res) => {
  res.json(await User.find().sort("-points").limit(10).select("name points streak -_id"));
}));

// Nearby recycling points from OpenStreetMap (no API key needed).
app.get("/api/recyclers", requireAuth, wrap(async (req, res) => {
  const lat = Number(req.query.lat), lng = Number(req.query.lng), radius = Math.min(Number(req.query.radius) || 5000, 20000);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) fail(400, "lat and lng are required.");
  const q = `[out:json][timeout:20];(nwr["amenity"="recycling"](around:${radius},${lat},${lng});nwr["shop"="scrap"](around:${radius},${lat},${lng});nwr["amenity"="waste_disposal"](around:${radius},${lat},${lng}););out center 40;`;
  const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  if (!r.ok) fail(502, "Map data is busy. Try again in a minute.");
  const rad = (d) => (d * Math.PI) / 180;
  const km = (a, b) => 6371 * 2 * Math.asin(Math.sqrt(Math.sin(rad(a - lat) / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(a)) * Math.sin(rad(b - lng) / 2) ** 2));
  const places = (await r.json()).elements.map((e) => {
    const la = e.lat ?? e.center?.lat, lo = e.lon ?? e.center?.lon, t = e.tags || {};
    const accepts = Object.keys(t).filter((k) => k.startsWith("recycling:") && t[k] === "yes").map((k) => k.slice(10));
    return { name: t.name || (t.shop === "scrap" ? "Scrap dealer" : "Recycling point"), lat: la, lng: lo, accepts, km: +km(la, lo).toFixed(1) };
  }).filter((p) => p.lat != null).sort((a, b) => a.km - b.km);
  res.json(places);
}));

mongoose.connect(MONGODB_URI).then(() => app.listen(PORT, () => console.log(`EcoDharma API on :${PORT} (AI ${aiEnabled() ? "on" : "off"})`)))
  .catch((e) => { console.error("MongoDB connection failed:", e.message); process.exit(1); });
