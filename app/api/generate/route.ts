import { GoogleGenAI } from "@google/genai";
import { readFile } from "fs/promises";
import path from "path";

// ---- Серверный rate-limit: N генераций в день с одного IP ----
// In-memory: на одиночном сервере/next dev работает точно,
// на serverless (Vercel) счётчик свой у каждого инстанса —
// это защита от наивного абьюза, не от ботнета.
// Для строгого лимита на Vercel: заменить Map на @vercel/kv (Upstash).
const RATE_LIMIT_PER_DAY = 10;
const hits = new Map<string, { date: string; count: number }>();

function isRateLimited(ip: string): boolean {
  const today = new Date().toISOString().slice(0, 10);

  // периодическая чистка, чтобы Map не рос бесконечно
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.date !== today) hits.delete(k);
  }

  const rec = hits.get(ip);
  if (!rec || rec.date !== today) {
    hits.set(ip, { date: today, count: 1 });
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_LIMIT_PER_DAY;
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
// ---------------------------------------------------------------

// POST /api/generate
// Тело: { traits?: string, background?: string }  — режим "одень персонажа"
//    или { pfp?: string }                         — режим "stiv-ify мою аватарку" (dataURL)
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (isRateLimited(ip)) {
    return Response.json(
      {
        error:
          "Too many summons from this address — the undying need rest. Try again tomorrow.",
      },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Server misconfigured: GEMINI_API_KEY missing in .env.local" },
      { status: 500 }
    );
  }

  let body: { traits?: string; background?: string; pfp?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { traits, background, pfp } = body;

  if (!traits && !background && !pfp) {
    return Response.json(
      { error: "Give your STIV at least one thing — some traits or a background." },
      { status: 400 }
    );
  }

  // Защита от гигантских тел (dataURL картинки до 5 МБ ≈ 6.7 МБ base64)
  if (pfp && pfp.length > 7_000_000) {
    return Response.json({ error: "Image too large" }, { status: 400 });
  }

  // Базовая картинка: либо загруженная юзером, либо наш персонаж из public/
  let imageBase64: string;
  let mimeType = "image/jpeg";
  if (pfp) {
    const match = pfp.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
    if (!match) {
      return Response.json(
        { error: "pfp должен быть dataURL картинки" },
        { status: 400 }
      );
    }
    mimeType = match[1];
    imageBase64 = match[2];
  } else {
    const buf = await readFile(
      path.join(process.cwd(), "public", "base-character.png")
    );
    imageBase64 = buf.toString("base64");
    mimeType = "image/png";
  }

  const prompt = pfp
    ? "Redraw this avatar as a stylized 3D-render character portrait, keep the composition and colors recognizable."
    : `Edit this character image. Add/change: ${traits || "nothing"}. ` +
      `Background: ${background || "keep as is"}. ` +
      `Keep the exact same character, pose and same 3D render style. Output a square image.`;

  const ai = new GoogleGenAI({ apiKey });

  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.1-flash-image",
      contents: [
        { inlineData: { mimeType, data: imageBase64 } },
        { text: prompt },
      ],
    });

    const parts = res.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p) => p.inlineData?.data);
    if (!imgPart) {
      // Модель могла отказать (safety-фильтры) и вернуть только текст
      const textPart = parts.find((p) => p.text);
      return Response.json(
        {
          error:
            "Model returned no image" +
            (textPart ? `: ${textPart.text?.slice(0, 200)}` : ""),
        },
        { status: 502 }
      );
    }

    const outMime = imgPart.inlineData!.mimeType ?? "image/png";
    return Response.json({
      image: `data:${outMime};base64,${imgPart.inlineData!.data}`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: `Gemini API: ${msg}` }, { status: 502 });
  }
}
