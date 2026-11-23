// Netlify Function: pH webhook
//   POST /ph-data  {"ph": 7.02, "voltage": 2.751}  -> stores the reading
//   GET  /ph-data                                  -> latest reading + recent history
import { getStore } from "@netlify/blobs";

const HISTORY_LENGTH = 60; // keep the last 60 readings (1 hour at one per minute)

const CORS = {
  "Access-Control-Allow-Origin": "*", // lets the GitHub Pages site read it
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const store = getStore("ph-data");

  if (req.method === "POST") {
    let data;
    try {
      data = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const ph = num(data.ph);
    if (ph === null || ph < 0 || ph > 14) {
      return json({ error: "ph must be a number between 0 and 14" }, 400);
    }

    const reading = {
      ph: Math.round(ph * 100) / 100,
      voltage: num(data.voltage),
      receivedAt: new Date().toISOString(),
    };

    const history = (await store.get("history", { type: "json" })) ?? [];
    history.push({ ph: reading.ph, t: reading.receivedAt });
    while (history.length > HISTORY_LENGTH) history.shift();

    await Promise.all([
      store.setJSON("latest", reading),
      store.setJSON("history", history),
    ]);

    console.log("Received pH data:", reading);
    return json({ ok: true });
  }

  if (req.method === "GET") {
    const [latest, history] = await Promise.all([
      store.get("latest", { type: "json" }),
      store.get("history", { type: "json" }),
    ]);
    if (!latest) return json({ error: "No data yet" }, 404);
    return json({ ...latest, history: history ?? [] });
  }

  return json({ error: "Method not allowed" }, 405);
};

const store = getStore({ name: "ph-data", consistency: "strong" });
