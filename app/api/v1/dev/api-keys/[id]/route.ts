import { NextRequest, NextResponse } from "next/server";

type ApiScope = "validator:read" | "network:read" | "staking:read" | "staking:write" | "governance:read" | "governance:write";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  scopes: ApiScope[];
  createdAt: string;
  status: "active" | "revoked";
  rateLimit: {
    current: number;
    limit: number;
  };
}

// In-memory storage (in production, use a database)
let apiKeys: ApiKey[] = [
  {
    id: "1",
    name: "Development Key",
    key: "lumina_dev123456789",
    scopes: ["validator:read", "network:read"],
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    status: "active",
    rateLimit: { current: 450, limit: 1000 },
  },
];

// DELETE /api/v1/dev/api-keys/[id] - Revoke an API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const keyIndex = apiKeys.findIndex((k) => k.id === id);

  if (keyIndex === -1) {
    return NextResponse.json(
      { error: "API key not found" },
      { status: 404 }
    );
  }

  apiKeys[keyIndex].status = "revoked";

  return NextResponse.json({ message: "API key revoked successfully" });
}
