"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Key } from "lucide-react";
import { format } from "date-fns";

export type ApiScope = "validator:read" | "network:read" | "staking:read" | "staking:write" | "governance:read" | "governance:write";

export interface ApiKey {
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

interface ApiKeyListProps {
  keys: ApiKey[];
  onRevoke: (id: string) => void;
}

export function ApiKeyList({ keys, onRevoke }: ApiKeyListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          API Keys
        </h2>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {keys.length} key{keys.length !== 1 ? "s" : ""}
        </span>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Scopes</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Rate Limit</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-zinc-500 dark:text-zinc-400">
                No API keys found. Create your first key to get started.
              </TableCell>
            </TableRow>
          ) : (
            keys.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-zinc-400" />
                    {key.name}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {key.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-zinc-500 dark:text-zinc-400">
                  {format(new Date(key.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      key.status === "active"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {key.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    {key.rateLimit.current}/{key.rateLimit.limit} req/min
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {key.status === "active" && (
                    <Button
                      onClick={() => onRevoke(key.id)}
                      className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
