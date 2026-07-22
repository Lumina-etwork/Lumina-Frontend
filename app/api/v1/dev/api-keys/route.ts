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

// GET /api/v1/dev/api-keys - List all API keys
export async function GET() {
  return NextResponse.json({ keys: apiKeys });
}

// POST /api/v1/dev/api-keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, scopes } = body;

    if (!name || !scopes || !Array.isArray(scopes)) {
      return NextResponse.json(
        { error: "Name and scopes are required" },
        { status: 400 }
      );
    }

    const newKey: ApiKey = {
      id: Date.now().toString(),
      name,
      key: `lumina_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      scopes,
      createdAt: new Date().toISOString(),
      status: "active",
      rateLimit: { current: 0, limit: 1000 },
    };

    apiKeys.push(newKey);

    return NextResponse.json(newKey, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
