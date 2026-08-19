import { NextResponse } from "next/server";
import { revokeAllShares } from "@/src/lib/shareLinkStore";

export async function POST() {
  revokeAllShares();
  return NextResponse.json({ revoked: true });
}