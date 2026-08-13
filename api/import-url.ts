import { GoogleGenAI, Type } from '@google/genai';

type ApiRequest = {
  method?: string;
  body?: { url?: unknown };
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const url = req.body?.url;
    if (typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'A valid webpage URL is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'Song import is not configured on this deployment. Add GEMINI_API_KEY in Vercel Environment Variables and redeploy.',
      });
    }

    const trimmedUrl = url.trim();
    let pageContentSnippet = '';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(trimmedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ChordFlow/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const html = await response.text();
        pageContentSnippet = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .slice(0, 15000);
      }
    } catch (error) {
      console.warn('Direct page fetch failed; continuing with the URL:', error);
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Extract a guitar chord sheet from this URL: "${trimmedUrl}".\n${
        pageContentSnippet ? `Extracted webpage text:\n${pageContentSnippet}` : 'Use the URL as context.'
      }`,
      config: {
        systemInstruction: 'Return a clean guitar chord sheet with title, artist, key, BPM, bracketed chords, and section headers.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            artist: { type: Type.STRING },
            key: { type: Type.STRING },
            bpm: { type: Type.NUMBER },
            content: { type: Type.STRING },
          },
          required: ['title', 'content'],
        },
      },
    });

    if (!response.text) {
      return res.status(502).json({ error: 'The AI service returned an empty response.' });
    }

    const song = JSON.parse(response.text);
    return res.status(200).json({
      success: true,
      song: {
        title: song.title || 'Imported Song',
        artist: song.artist || 'Unknown Artist',
        key: song.key || 'C',
        bpm: typeof song.bpm === 'number' ? song.bpm : 120,
        content: song.content || '',
        original_chord_sheet_url: trimmedUrl,
      },
    });
  } catch (error: any) {
    console.error('Import URL function failed:', error);
    const message = error?.message || 'An error occurred while importing the song.';
    const rateLimited = /429|RESOURCE_EXHAUSTED|quota/i.test(message);
    return res.status(rateLimited ? 429 : 500).json({
      error: rateLimited ? 'Gemini API rate limit reached. Please wait and try again.' : message,
    });
  }
}
