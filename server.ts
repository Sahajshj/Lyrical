import "dotenv/config";
import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const configuredPort = Number.parseInt(process.env.PORT ?? "3000", 10);
  if (!Number.isInteger(configuredPort) || configuredPort < 1 || configuredPort > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}`);
  }

  app.use(express.json({ limit: "10mb" }));

  // Helper to initialize Gemini SDK safely on server
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing in server environment.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // API Route: Health Check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // API Route: Extract Song with Chords from Web URL
  app.post("/api/import-url", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string" || !url.trim()) {
        return res.status(400).json({ error: "A valid webpage URL is required." });
      }

      const trimmedUrl = url.trim();
      let pageContentSnippet = "";

      // Fetch raw web page content
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const fetchRes = await fetch(trimmedUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (fetchRes.ok) {
          const html = await fetchRes.text();
          // Basic cleanup of HTML script & style tags to extract clean text
          pageContentSnippet = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .slice(0, 15000);
        }
      } catch (e) {
        console.warn("Direct page fetch skipped or failed, relying on AI lookup:", e);
      }

      const ai = getGeminiClient();

      const prompt = `The user wants to extract song chords and lyrics from this website URL: "${trimmedUrl}".
${
  pageContentSnippet
    ? `Here is text content extracted from the webpage:\n"""\n${pageContentSnippet}\n"""`
    : `Please retrieve or parse the chord sheet for this song.`
}

Extract the song title, artist/band name, musical key (e.g., C, G, Am), estimated BPM, and full lyrics with guitar chords inside brackets like [C], [G], [Am], [F] with section headers like [Intro], [Verse 1], [Chorus], [Outro].`;

      const systemInstruction =
        "You are an expert music transcriber and guitar chord sheet parser. Always output clean, complete guitar chord sheets with brackets around chords like [Am] [C] [G] [F] and section headers in brackets like [Intro], [Chorus]. Include title, artist, key, bpm, and full content.";

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Song Title" },
          artist: { type: Type.STRING, description: "Artist or Band Name" },
          key: { type: Type.STRING, description: "Musical Key (e.g. C, G, Am)" },
          bpm: { type: Type.NUMBER, description: "Estimated BPM / Tempo" },
          content: {
            type: Type.STRING,
            description:
              "Complete song lyrics with bracketed chords like [C] [G] [Am] [F] and section headers like [Intro] [Verse 1] [Chorus]",
          },
        },
        required: ["title", "content"],
      };

      let parsedSong: any = null;

      // Call gemini-3.6-flash
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema,
          },
        });
        if (response.text) {
          parsedSong = JSON.parse(response.text);
        }
      } catch (e1: any) {
        console.warn("Gemini call failed:", e1?.message || e1);
        
        // Fallback if rate limited (429) or error but we have scraped page content
        if (pageContentSnippet) {
          parsedSong = {
            title: "Imported Song from Web",
            artist: "Unknown Artist",
            key: "C",
            bpm: 120,
            content: pageContentSnippet.slice(0, 3000),
          };
        } else {
          const errString = JSON.stringify(e1) + " " + (e1?.message || "");
          if (errString.includes("429") || errString.includes("RESOURCE_EXHAUSTED") || errString.includes("quota")) {
            return res.status(429).json({
              error: "Gemini API rate limit reached (429). Please wait a few seconds and try again.",
            });
          }
          throw e1;
        }
      }

      if (!parsedSong || !parsedSong.title) {
        return res.status(500).json({ error: "Could not parse song data from URL." });
      }

      return res.json({
        success: true,
        song: {
          title: parsedSong.title || "Imported Song",
          artist: parsedSong.artist || "Unknown Artist",
          key: parsedSong.key || "C",
          bpm: typeof parsedSong.bpm === "number" ? parsedSong.bpm : 120,
          content: parsedSong.content || "",
        },
      });
    } catch (err: any) {
      console.error("Error in /api/import-url:", err);
      return res.status(500).json({
        error: err?.message || "An error occurred while importing song from URL.",
      });
    }
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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

  const listen = (port: number) => {
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${port}`);
    });

    server.on("error", (error: NodeJS.ErrnoException) => {
      if (
        error.code === "EADDRINUSE" &&
        process.env.NODE_ENV !== "production" &&
        process.env.PORT === undefined &&
        port < 65535
      ) {
        const nextPort = port + 1;
        console.warn(`Port ${port} is already in use; trying ${nextPort}...`);
        server.close(() => listen(nextPort));
        return;
      }

      throw error;
    });
  };

  listen(configuredPort);
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exitCode = 1;
});
