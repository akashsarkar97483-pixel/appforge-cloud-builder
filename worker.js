export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return new Response("Use POST", { status: 405, headers: cors });
    }

    try {
      if (!env.GEMINI_API_KEY) {
        return new Response(
          JSON.stringify({ error: "GEMINI_API_KEY secret missing in Cloudflare Worker" }),
          { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      const body = await request.json().catch(() => ({}));
      const prompt = (body.prompt || "").trim();

      if (!prompt) {
        return new Response(
          JSON.stringify({ error: "Prompt is required" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      });

      const data = await res.json();

      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: data?.error?.message || `Gemini API error (${res.status})` }),
          { status: res.status, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!reply) {
        return new Response(
          JSON.stringify({ error: "Empty response from Gemini" }),
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ reply, html: reply }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    } catch (e) {
      return new Response(
        JSON.stringify({ error: e.message || "Worker error" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }
  }
};
