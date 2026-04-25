import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractText } from "unpdf";
import { RoastResponse } from "@/types";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a brutally honest, witty resume critic. Roast resumes with sharp humor while delivering genuinely useful feedback. Be funny but not cruel.

Respond ONLY with a valid JSON object in exactly this shape — no markdown fences, no extra text:
{
  "roast": "<one punchy, memorable roast line about the resume overall>",
  "score": {
    "overall": <integer 1-100>,
    "breakdown": {
      "clarity": <integer 1-100>,
      "impact": <integer 1-100>,
      "formatting": <integer 1-100>,
      "relevance": <integer 1-100>,
      "conciseness": <integer 1-100>
    }
  },
  "improvements": [
    { "before": "<exact or representative phrase from the resume>", "after": "<improved version>" },
    { "before": "...", "after": "..." },
    { "before": "...", "after": "..." },
    { "before": "...", "after": "..." },
    { "before": "...", "after": "..." }
  ],
  "vibe": "<one short sentence capturing the overall personality/vibe of this resume — make it punchy>"
}

Rules:
- Exactly 5 improvements.
- Score honestly: 1-40 weak, 41-70 mediocre, 71-100 solid.
- Each improvement must quote or closely paraphrase something real from the resume, then show a concrete rewrite.
- Output ONLY the JSON object.`;

async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const bytes = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".txt")) {
    return bytes.toString("utf-8");
  }

  if (name.endsWith(".pdf")) {
    const { text } = await extractText(new Uint8Array(bytes));
    if (!text.trim()) {
      throw new Error("Could not extract text from this PDF. Try saving it as a TXT file.");
    }
    return text;
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: bytes });
    if (!value.trim()) {
      throw new Error("Could not extract text from this DOCX. Try saving it as a TXT file.");
    }
    return value;
  }

  if (name.endsWith(".doc")) {
    throw new Error(".doc files are not supported. Please save as .docx, .pdf, or .txt.");
  }

  throw new Error(`Unsupported file type. Please upload PDF, DOCX, or TXT.`);
}

export async function POST(req: NextRequest) {
  let file: File;

  try {
    const form = await req.formData();
    const raw = form.get("file");
    if (!raw || typeof raw === "string") {
      return NextResponse.json({ error: "A file is required." }, { status: 400 });
    }
    file = raw as File;
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 10 MB limit." }, { status: 413 });
  }

  let resumeText: string;
  try {
    resumeText = await extractText(file);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to read the file.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  if (!resumeText.trim()) {
    return NextResponse.json({ error: "The file appears to be empty." }, { status: 422 });
  }

  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-7",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Resume to roast:\n\n${resumeText.trim()}`,
        },
      ],
    });

    const message = await stream.finalMessage();

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No text response from model." }, { status: 502 });
    }

    let parsed: RoastResponse;
    try {
      parsed = JSON.parse(textBlock.text) as RoastResponse;
    } catch {
      return NextResponse.json(
        { error: "Model returned malformed JSON.", raw: textBlock.text },
        { status: 502 },
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Invalid or missing Anthropic API key." }, { status: 401 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again shortly." }, { status: 429 });
    }
    if (err instanceof Anthropic.BadRequestError) {
      return NextResponse.json({ error: "Bad request to AI model.", detail: err.message }, { status: 400 });
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: "AI service error.", detail: err.message }, { status: 502 });
    }

    console.error("[/api/roast] unexpected error", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
