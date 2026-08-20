import { NextRequest, NextResponse } from "next/server";
import { createShare } from "@/src/lib/shareLinkStore";

const EXPIRY_HOURS = { "1h": 1, "24h": 24, "7d": 24 * 7 } as const;
type Expiry = keyof typeof EXPIRY_HOURS;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { facilityId?: unknown; expiry?: unknown; timeRange?: unknown };
    const facilityId = typeof body.facilityId === "string" ? body.facilityId.trim() : "";
    const expiry = body.expiry as Expiry;
    const timeRange = typeof body.timeRange === "string" ? body.timeRange.trim() : "last-7-days";

    if (!facilityId || !Object.hasOwn(EXPIRY_HOURS, expiry) || !timeRange) {
      return NextResponse.json({ error: "Facility, expiry, and time range are required" }, { status: 400 });
    }

    const expiresAt = Date.now() + EXPIRY_HOURS[expiry] * 60 * 60 * 1000;
    const token = await createShare({ facilityId, timeRange, expiresAt, permissions: "read-only" });
    const origin = request.nextUrl.origin;

    return NextResponse.json({ url: `${origin}/share/${token}`, expiresAt, remainingUses: 1 }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create shared link" }, { status: 500 });
  }
}