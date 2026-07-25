import { NextResponse } from "next/server";
import { redactSecretTelemetry } from "@/src/lib/secretRotation";

export async function POST(request: Request) {
  const payload = redactSecretTelemetry(await request.json());
  return NextResponse.json({ accepted: true, receivedAt: Date.now(), payload });
}
