import { NextResponse } from "next/server";
import { telemetryLogger } from "@/src/lib/logging";
import type { UnknownErrorTelemetryPayload } from "@/src/utils/errorDecoder";

export async function POST(request: Request) {
  const payload = (await request.json()) as UnknownErrorTelemetryPayload & {
    reportedAt?: string;
  };

  telemetryLogger.warn("stellar.error.unknown", {
    "error.type": payload.code,
    "stellar.error.code": payload.code,
    "stellar.operation": payload.context?.operation,
    "user.id": payload.context?.userId,
    "event.domain": "stellar",
    reportedAt: payload.reportedAt,
  });

  return NextResponse.json({ ok: true });
}
