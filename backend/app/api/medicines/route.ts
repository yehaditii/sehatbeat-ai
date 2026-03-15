import { NextResponse } from "next/server";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function jsonWithCors(body: object): NextResponse {
  const res = NextResponse.json(body);
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

const GEMINI_PROMPT = `Generate a JSON array of 25 common medicines available in India. Each item must have: name (brand name), genericName, category (e.g. Antibiotic, Painkiller, Antacid, Antihistamine, Vitamin), uses (array of 2-3 use cases), dosage (standard adult dose), sideEffects (array of 2-3), price (in INR, realistic), requiresPrescription (boolean), manufacturer (Indian pharma company). Return ONLY valid JSON array starting with [ and ending with ]. No markdown.`;

export async function GET(): Promise<NextResponse> {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return jsonWithCors({ medicines: [] });
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: GEMINI_PROMPT }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      return jsonWithCors({ medicines: [] });
    }

    const data = await geminiRes.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : "[]";
    const medicines = JSON.parse(jsonStr);
    return jsonWithCors({ medicines: Array.isArray(medicines) ? medicines : [] });
  } catch {
    return jsonWithCors({ medicines: [] });
  }
}
