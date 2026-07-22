import { NextRequest, NextResponse } from "next/server";

// In-memory storage for received webhooks (in production, use a database or message queue)
let receivedWebhooks: any[] = [];

// POST /api/v1/dev/webhook-test - Test endpoint for receiving webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers = Object.fromEntries(request.headers.entries());

    const webhookData = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      headers,
      body,
      method: request.method,
      url: request.url,
    };

    receivedWebhooks.push(webhookData);

    // Keep only the last 50 webhooks to prevent memory issues
    if (receivedWebhooks.length > 50) {
      receivedWebhooks = receivedWebhooks.slice(-50);
    }

    return NextResponse.json({
      message: "Webhook received successfully",
      webhookId: webhookData.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// GET /api/v1/dev/webhook-test - Retrieve received webhooks
export async function GET() {
  return NextResponse.json({
    webhooks: receivedWebhooks,
    count: receivedWebhooks.length,
  });
}
