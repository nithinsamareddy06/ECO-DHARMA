import { GoogleGenerativeAI } from "@google/generative-ai";
import { CATEGORIES, build, ruleClassify } from "./waste.js";

const PROMPT = `You are a waste-sorting expert for Indian households. Identify the main waste item.
Reply with JSON only: {"item": string, "category": one of ${Object.keys(CATEGORIES).join("|")},
"tip": one short sentence on how to prepare it for disposal, "reuse": up to 3 short reuse/DIY ideas (empty if unsafe),
"co2": estimated kg CO2e saved by correct disposal, number}.
If the image or text is not waste, use {"item":"unknown","category":"plastic","tip":"Not recognised.","reuse":[],"co2":0}.`;

let model;
const getModel = () =>
  (model ??= process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" },
      })
    : null);

export const aiEnabled = () => Boolean(process.env.GEMINI_API_KEY);

// Retry briefly on temporary Google errors (503 overloaded, 429 rate limit).
async function generate(m, parts, tries = 3) {
  for (let i = 1; ; i++) {
    try { return (await m.generateContent(parts)).response.text(); }
    catch (e) {
      if (i >= tries || !/50\d|429|overloaded|demand/i.test(e.message)) throw e;
      await new Promise((r) => setTimeout(r, 800 * i));
    }
  }
}

export async function classify({ text, image }) {
  const m = getModel();
  if (!m) {
    if (image) throw Object.assign(new Error("Photo scan needs GEMINI_API_KEY on the server."), { status: 503 });
    const r = ruleClassify(text);
    if (!r) throw Object.assign(new Error("Item not recognised. Try a simpler name like 'plastic bottle'."), { status: 404 });
    return r;
  }
  const parts = [PROMPT];
  if (text) parts.push(`Item described by user: ${text}`);
  if (image) {
    const match = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(image);
    if (!match) throw Object.assign(new Error("Invalid image."), { status: 400 });
    parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
  }
  let out;
  try {
    out = JSON.parse(await generate(m, parts));
  } catch (e) {
    // Gemini unavailable or returned bad JSON: fall back to the offline rules for text.
    const r = !image && ruleClassify(text);
    if (r) return r;
    const busy = /50\d|429|quota|overloaded|demand/i.test(e.message);
    throw Object.assign(new Error(busy ? "The AI is busy right now. Try again in a moment, or type a simpler item name." : "Could not identify that item. Try a clearer photo or name."), { status: busy ? 503 : 422 });
  }
  const category = CATEGORIES[out.category] ? out.category : "plastic";
  return build(String(out.item || text || "item").slice(0, 80), category, String(out.tip || "").slice(0, 200),
    (out.reuse || []).slice(0, 3).map(String), Math.max(0, Number(out.co2) || 0));
}
