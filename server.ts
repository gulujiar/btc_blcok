import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Pine Script to TypeScript Converter API
  app.post("/api/convert-pine", async (req, res) => {
    const { code, scriptName } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Pine Script code is required" });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Translate the following TradingView Pine Script into a TypeScript function that takes an array of Klines and returns an array of indicator values.
        
        The input Kline type is:
        interface Kline {
          time: number;
          open: number;
          high: number;
          low: number;
          close: number;
          volume: number;
        }

        The output should be a JSON object containing:
        1. "logic": A string containing the TypeScript function body (or multiple functions).
        2. "indicatorName": A suggested name for the indicator.
        3. "description": A brief description of what it does.
        4. "visualConfig": A JSON object describing how to draw it (lines, markers, or histogram).
        
        Pine Script Code:
        ${code}
        
        Important: 
        - The function must be pure and handle the array of Klines correctly.
        - Ensure it doesn't use external libraries other than standard Math.
        - The logic should be efficient.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              logic: { type: Type.STRING },
              indicatorName: { type: Type.STRING },
              description: { type: Type.STRING },
              visualConfig: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: "line, marker, or histogram" },
                  colors: { type: Type.ARRAY, items: { type: Type.STRING } },
                  lineWidth: { type: Type.NUMBER }
                }
              }
            },
            required: ["logic", "indicatorName", "description", "visualConfig"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("Gemini Conversion Error:", error);
      res.status(500).json({ error: error.message || "Failed to convert script" });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
