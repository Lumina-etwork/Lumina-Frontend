import { NextRequest, NextResponse } from "next/server";
import { consumeShare } from "@/src/lib/shareLinkStore";

export async function POST(request: NextRequest) {
  try {
    const { token } = (await request.json()) as { token?: unknown };
    if (typeof token !== "string" || token.length < 43) {
      return NextResponse.json({ error: "Invalid shared link" }, { status: 410 });
    }

    const payload = await consumeShare(token);
    if (!payload) return NextResponse.json({ error: "This shared link has expired or was already used" }, { status: 410 });

    const sessionToken = crypto.randomUUID();
    const response = NextResponse.json({ facilityId: payload.facilityId, timeRange: payload.timeRange, permissions: payload.permissions });
    response.cookies.set("lumina-share-session", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid shared link" }, { status: 410 });
  }
}