import { NextRequest, NextResponse } from "next/server";
import { RoastRequest, RoastResponse } from "@/types";

export async function POST(req: NextRequest) {
  const body: RoastRequest = await req.json();

  if (!body.resumeText?.trim()) {
    return NextResponse.json({ error: "Resume text is required" }, { status: 400 });
  }

  // TODO: integrate AI roasting logic here
  const response: RoastResponse = {
    roast: "Your resume is so generic it could be used as a sleep aid.",
    score: 42,
    feedback: ["Add measurable achievements", "Remove the objective section", "Tailor to the job description"],
  };

  return NextResponse.json(response);
}
