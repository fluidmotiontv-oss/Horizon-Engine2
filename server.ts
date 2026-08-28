import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoints
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "The Horizon Engine" });
  });

  // AI Preset Generator endpoint using Gemini
  app.post("/api/generate-preset", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "GEMINI_API_KEY is not set." });
      }

      const { prompt } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Please provide a valid prompt description." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemInstruction = `You are the master shader and audio stem architect for 'The Horizon Engine'.
Given a creative visual/audio prompt, output optimized numeric parameters and names for the canvas rendering engine, tempo, and audio stems.
Canvas Mode options: 'generative_geometry' (Lotus Sacred Geometry), 'plasma' (Electric Plasma Tendrils), 'tunnel' (3D Neon Tunnel Loop), 'particle_swarm' (Audio Reactive Particle Swarm), 'liquid_aurora' (Liquid Aurora Wave Interference), 'quantum_field' (Quantum Vector Field), 'ice_crystal' (Fractal Dendritic Ice Crystals), 'fire_smoke' (Turbulent Convective Flame & Smoke), 'boiling_fluid' (Thermal Cavitation & Boiling Liquid).
Return valid JSON adhering to the provided schema.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              presetName: { type: Type.STRING, description: "Futuristic 2-3 word preset title" },
              canvasMode: {
                type: Type.STRING,
                description: "Must be 'generative_geometry', 'plasma', 'tunnel', 'particle_swarm', 'liquid_aurora', 'quantum_field', 'ice_crystal', 'fire_smoke', or 'boiling_fluid'",
              },
              hue: { type: Type.NUMBER, description: "Hue angle in degrees 0-360" },
              speed: { type: Type.NUMBER, description: "Animation speed multiplier 0.1 to 5.0" },
              geometryDensity: { type: Type.NUMBER, description: "Petal symmetry or density 3 to 12" },
              overlayVisible: { type: Type.BOOLEAN, description: "Whether matrix HUD overlay is active" },
              bloomIntensity: { type: Type.NUMBER, description: "Glow/Bloom multiplier 0.5 to 3.0" },
              distortionRate: { type: Type.NUMBER, description: "Plasma chaos or warp distortion 0.0 to 1.0" },
              bpm: { type: Type.NUMBER, description: "Master tempo in BPM 60 to 180" },
              audioPitchMultiplier: { type: Type.NUMBER, description: "Audio pitch multiplier 0.5 to 2.0" },
              description: { type: Type.STRING, description: "One sentence atmospheric description of this preset" },
            },
            required: [
              "presetName",
              "canvasMode",
              "hue",
              "speed",
              "geometryDensity",
              "overlayVisible",
              "bloomIntensity",
              "distortionRate",
              "bpm",
              "audioPitchMultiplier",
              "description",
            ],
          },
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response generated from Gemini.");
      }

      const preset = JSON.parse(text);
      res.json({ success: true, preset });
    } catch (err: any) {
      console.error("Error generating preset:", err);
      res.status(500).json({ error: err.message || "Failed to generate AI preset" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Horizon Engine] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
