// Netlify Function: POST stores the latest reading, GET returns it.
// Replaces functions/webhook.js (delete the old Express version).
import { getStore } from "@netlify/blobs";

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

  const store = getStore("sensor-data");

  if (req.method === "POST") {
    let data;
    try {
      data = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const reading = {
      pressure: num(data.pressure),
      temperature: num(data.temperature),
      humidity: num(data.humidity),
      receivedAt: new Date().toISOString(),
    };

    await store.setJSON("latest", reading);
    console.log("Received sensor data:", reading);
    return json({ ok: true });
  }

  if (req.method === "GET") {
    const latest = await store.get("latest", { type: "json" });
    return latest ? json(latest) : json({ error: "No data yet" }, 404);
  }

  return json({ error: "Method not allowed" }, 405);
};

// Serves the function directly at /sensor-data (no redirect needed)
export const config = { path: "/sensor-data" };
