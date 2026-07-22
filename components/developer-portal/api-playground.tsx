"use client";

import { useState, useEffect } from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

interface ApiPlaygroundProps {
  apiKey: string;
}

export function ApiPlayground({ apiKey }: ApiPlaygroundProps) {
  const [spec, setSpec] = useState<any>(null);

  useEffect(() => {
    // Mock OpenAPI spec - in production, this would be fetched from the API
    const mockSpec = {
      openapi: "3.0.0",
      info: {
        title: "Lumina API",
        version: "1.0.0",
        description: "API for interacting with the Lumina Network",
      },
      servers: [
        {
          url: "https://api.lumina.network/v1",
          description: "Production server",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "API Key",
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
      paths: {
        "/validator/status": {
          get: {
            summary: "Get validator status",
            tags: ["Validator"],
            responses: {
              "200": {
                description: "Successful response",
                content: {
                  "application/json": {
                    example: {
                      status: "active",
                      uptime: "99.9%",
                      last_block: 12345678,
                    },
                  },
                },
              },
            },
          },
        },
        "/network/info": {
          get: {
            summary: "Get network information",
            tags: ["Network"],
            responses: {
              "200": {
                description: "Successful response",
                content: {
                  "application/json": {
                    example: {
                      network_id: "lumina-mainnet",
                      block_height: 12345678,
                      total_validators: 100,
                    },
                  },
                },
              },
            },
          },
        },
        "/staking/pools": {
          get: {
            summary: "List staking pools",
            tags: ["Staking"],
            responses: {
              "200": {
                description: "Successful response",
                content: {
                  "application/json": {
                    example: {
                      pools: [
                        {
                          id: "pool-1",
                          name: "Pool A",
                          apy: "5.5%",
                          total_staked: 1000000,
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        "/staking/delegate": {
          post: {
            summary: "Delegate tokens to a pool",
            tags: ["Staking"],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      pool_id: { type: "string" },
                      amount: { type: "number" },
                    },
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Successful response",
              },
            },
          },
        },
        "/governance/proposals": {
          get: {
            summary: "List governance proposals",
            tags: ["Governance"],
            responses: {
              "200": {
                description: "Successful response",
                content: {
                  "application/json": {
                    example: {
                      proposals: [
                        {
                          id: "prop-1",
                          title: "Protocol Upgrade",
                          status: "active",
                          votes_for: 1000,
                          votes_against: 200,
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    setSpec(mockSpec);
  }, []);

  if (!spec) {
    return (
      <div className="flex h-96 items-center justify-center text-zinc-500 dark:text-zinc-400">
        Loading API documentation...
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <SwaggerUI
        spec={spec}
        requestInterceptor={(request) => {
          if (apiKey) {
            request.headers.Authorization = `Bearer ${apiKey}`;
          }
          return request;
        }}
        docExpansion="list"
        defaultModelsExpandDepth={1}
        persistAuthorization={true}
      />
    </div>
  );
}
