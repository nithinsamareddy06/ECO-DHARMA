import { useEffect, useState } from "react";
import { api, getToken, setToken, readImage } from "./api.js";

const LABELS = { plastic: "Plastic", paper: "Paper", glass: "Glass", metal: "Metal", organic: "Organic", ewaste: "E-waste", hazardous: "Hazardous" };

function Auth({ onDone }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr("");
    try { const r = await api(`/auth/${mode}`, f); setToken(r.token); onDone(r.user); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <div className="shell">
      <div className="hero"><div className="brand">EcoDharma</div>
        <h1>Put every item in the right bin.</h1>
        <p>Scan or search any household waste item, get disposal steps and reuse ideas, and find recyclers near you.</p></div>
      <form className="card" onSubmit={submit}>
        <h2>{mode === "login" ? "Sign in" : "Create your account"}</h2>
        {mode === "signup" && <><label htmlFor="n">Name</label><input id="n" value={f.name} onChange={set("name")} required /></>}
        <label htmlFor="e">Email</label><input id="e" type="email" value={f.email} onChange={set("email")} required />
        <label htmlFor="p">Password (8+ characters)</label><input id="p" type="password" minLength={8} value={f.password} onChange={set("password")} required />
        {err && <div className="err" role="alert">{err}</div>}
        <div className="row"><button disabled={busy}>{mode === "login" ? "Sign in" : "Create account"}</button>
          <button type="button" className="ghost" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "New here? Sign up" : "Have an account? Sign in"}</button></div>
      </form>
    </div>
  );
}

function Sort({ ai, onEarn }) {
  const [text, setText] = useState(""), [img, setImg] = useState(null), [res, setRes] = useState(null);
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), [done, setDone] = useState("");
  async function run(e) {
    e?.preventDefault(); setBusy(true); setErr(""); setRes(null); setDone("");
    try { setRes(await api("/classify", { text, image: img })); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  async function pick(e) {
    const file = e.target.files[0]; if (!file) return;
    try { setImg(await readImage(file)); } catch (x) { setErr(x.message); }
  }
  async function confirm() {
    try { const r = await api("/scans", res); onEarn(r.user); setDone(`+${r.earned} Eco Points`); setRes(null); setText(""); setImg(null); }
    catch (x) { setErr(x.message); }
  }
  return (<>
    <form className="card" onSubmit={run}>
      <h2>What are you throwing away?</h2>
      <label htmlFor="t">Item name</label>
      <input id="t" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. plastic bottle, old charger" maxLength={100} />
      {ai ? <><label htmlFor="i">Or add a photo</label><input id="i" type="file" accept="image/*" capture="environment" onChange={pick} />
        {img && <img className="preview" src={img} alt="Selected waste item" />}</>
        : <p className="mute">Photo scan is off. Add a GEMINI_API_KEY to the server to turn it on.</p>}
      {err && <div className="err" role="alert">{err}</div>}
      <button disabled={busy || (!text && !img)}>{busy ? "Checking…" : "Check item"}</button>
    </form>
    {done && <div className="card" role="status"><h3>{done}</h3><p className="mute">Nice. Keep your streak going tomorrow.</p></div>}
    {res && <div className="card">
      <h3>{res.item}</h3>
      <div className="bin"><div className="mute">{res.label}</div><b>{res.bin}</b></div>
      <p>{res.tip}</p>
      {res.reuse.length > 0 && <><b>Reuse instead</b><ul>{res.reuse.map((r) => <li key={r}>{r}</li>)}</ul></>}
      <p className="mute">Estimated CO₂e saved: {res.co2} kg</p>
      <button onClick={confirm}>I sorted it (+{res.points} points)</button>
    </div>}
  </>);
}

function Impact() {
  const [d, setD] = useState(null), [lb, setLb] = useState([]), [err, setErr] = useState("");
  useEffect(() => { Promise.all([api("/me"), api("/leaderboard")]).then(([a, b]) => { setD(a); setLb(b); }).catch((x) => setErr(x.message)); }, []);
  if (err) return <div className="err" role="alert">{err}</div>;
  if (!d) return <p className="mute">Loading…</p>;
  const max = Math.max(1, ...Object.values(d.byCategory));
  return (<>
    <div className="grid">
      <div className="card"><div className="stat">{d.user.points}</div><span className="mute">Eco Points</span></div>
      <div className="card"><div className="stat">{d.user.streak}</div><span className="mute">day streak</span></div>
      <div className="card"><div className="stat">{d.totalItems}</div><span className="mute">items sorted</span></div>
      <div className="card"><div className="stat">{d.co2}</div><span className="mute">kg CO₂e saved (est.)</span></div>
    </div>
    <div className="card" style={{ marginTop: 14 }}><h3>Your waste mix</h3>
      {Object.keys(d.byCategory).length === 0 ? <p className="mute">Sort your first item to see this fill up.</p> :
        Object.entries(d.byCategory).map(([c, n]) => <div key={c} style={{ marginBottom: 10 }}><div className="row mute"><span>{LABELS[c]}</span><span>{n}</span></div><div className="bar"><i style={{ width: `${(n / max) * 100}%` }} /></div></div>)}</div>
    <div className="card"><h3>Top sorters</h3>
      {lb.map((u, i) => <div className="row" key={i} style={{ padding: "6px 0" }}><span>{i + 1}. {u.name}</span><b>{u.points}</b></div>)}</div>
  </>);
}

function Find() {
  const [places, setPlaces] = useState(null), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  function locate() {
    setBusy(true); setErr("");
    if (!navigator.geolocation) { setErr("This browser can't share your location."); setBusy(false); return; }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try { setPlaces(await api(`/recyclers?lat=${coords.latitude}&lng=${coords.longitude}&radius=8000`)); }
        catch (x) { setErr(x.message); } finally { setBusy(false); }
      },
      () => { setErr("Location is blocked. Allow it in your browser settings and try again."); setBusy(false); });
  }
  return (<>
    <div className="card"><h2>Recyclers near you</h2>
      <p className="mute">Uses OpenStreetMap data. Coverage varies by area, so call before you go.</p>
      <button onClick={locate} disabled={busy}>{busy ? "Searching…" : "Use my location"}</button>
      {err && <div className="err" role="alert">{err}</div>}</div>
    {places && (places.length === 0 ? <div className="card">Nothing mapped within 8 km. Try a scrap dealer search on Google Maps.</div> :
      <div className="card list">{places.map((p, i) => <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
        <div className="row"><b>{p.name}</b><span className="mute">{p.km} km</span></div>
        {p.accepts.length > 0 && <div className="mute">Accepts: {p.accepts.join(", ")}</div>}
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`} target="_blank" rel="noopener noreferrer">Get directions</a></div>)}</div>)}
  </>);
}

export default function App() {
  const [user, setUser] = useState(null), [ready, setReady] = useState(!getToken()), [tab, setTab] = useState("sort"), [ai, setAi] = useState(false);
  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then((h) => setAi(h.ai)).catch(() => {});
    if (getToken()) api("/me").then((d) => setUser(d.user)).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);
  if (!ready) return null;
  if (!user) return <Auth onDone={setUser} />;
  const tabs = [["sort", "Sort"], ["impact", "Impact"], ["find", "Find"]];
  return (<div className="shell">
    <div className="top"><span className="brand">EcoDharma</span>
      <span><span className="pill">{user.points} pts</span> <button className="ghost" onClick={() => { setToken(null); setUser(null); }}>Sign out</button></span></div>
    {tab === "sort" && <Sort ai={ai} onEarn={setUser} />}
    {tab === "impact" && <Impact key={user.points} />}
    {tab === "find" && <Find />}
    <nav className="tabs" aria-label="Main">{tabs.map(([k, l]) => <button key={k} aria-current={tab === k ? "page" : undefined} onClick={() => setTab(k)}>{l}</button>)}</nav>
  </div>);
}
