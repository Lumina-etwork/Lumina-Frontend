'use client'

import { useState, useMemo, useCallback } from 'react'
import { NodeCard } from '@/src/components/network/NodeCard'
import type { NodePosition } from '@/src/types/network'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NodeListProps {
  nodes: NodePosition[]
  selectedNodeId?: string | null
  onNodeClick?: (node: NodePosition) => void
  onNodeDismiss?: (nodeId: string) => void
  /** Maximum number of nodes to display (default: 50) */
  maxDisplay?: number
  className?: string
}

// ---------------------------------------------------------------------------
// NodeList
// ---------------------------------------------------------------------------

/**
 * NodeList renders a scrollable, search-filterable list of NodeCard components.
 *
 * Each NodeCard internally applies `sanitizeNodeString` to all on-chain
 * string fields, providing a consistent XSS defence layer for the entire
 * node list rendered from Soroban contract data.
 */
export function NodeList({
  nodes,
  selectedNodeId,
  onNodeClick,
  onNodeDismiss,
  maxDisplay = 50,
  className = '',
}: NodeListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'label' | 'id'>('label')

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value)
    },
    [],
  )

  const filtered = useMemo(() => {
    let list = [...nodes]

    // Filter by search query (case-insensitive)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (n) =>
          (n.label ?? n.id).toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q),
      )
    }

    // Sort
    list.sort((a, b) => {
      const aVal = sortBy === 'label' ? (a.label ?? a.id) : a.id
      const bVal = sortBy === 'label' ? (b.label ?? b.id) : b.id
      return aVal.localeCompare(bVal)
    })

    return list
  }, [nodes, searchQuery, sortBy])

  const displayed = filtered.slice(0, maxDisplay)
  const isTruncated = filtered.length > maxDisplay

  if (nodes.length === 0) {
    return (
      <div
        data-testid="node-list-empty"
        className={`rounded-lg border border-border bg-surface px-5 py-8 text-center text-sm text-muted ${className}`}
      >
        No nodes available.
      </div>
    )
  }

  return (
    <div
      data-testid="node-list"
      className={`rounded-lg border border-border bg-surface ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Nodes</h2>
          <p className="mt-0.5 text-xs text-muted">
            {displayed.length} of {nodes.length} node{nodes.length !== 1 ? 's' : ''}
            {searchQuery ? ' (filtered)' : ''}
          </p>
        </div>

        {/* Sort toggle */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.08em] text-muted">Sort</span>
          <button
            type="button"
            className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
              sortBy === 'label'
                ? 'bg-primary text-primary-text'
                : 'bg-background text-muted hover:bg-surface-alt'
            }`}
            onClick={() => setSortBy('label')}
          >
            Name
          </button>
          <button
            type="button"
            className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
              sortBy === 'id'
                ? 'bg-primary text-primary-text'
                : 'bg-background text-muted hover:bg-surface-alt'
            }`}
            onClick={() => setSortBy('id')}
          >
            ID
          </button>
        </div>
      </div>

      {/* Search bar (always shown when nodes exist) */}
      <div className="border-b border-table-divider px-5 py-2">
        <input
          type="text"
          data-testid="node-list-search"
          className="w-full rounded-md border border-border-light bg-surface-alt px-3 py-1.5 text-xs text-foreground placeholder-placeholder transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Filter nodes by name or ID…"
          value={searchQuery}
          onChange={handleSearchChange}
          aria-label="Filter nodes"
        />
      </div>

      {/* Node list */}
      <div
        data-testid="node-list-container"
        className="max-h-96 divide-y divide-background overflow-y-auto"
      >
        {displayed.map((node) => (
          <div key={node.id} className="px-3 py-2">
            <NodeCard
              node={node}
              isSelected={node.id === selectedNodeId}
              onClick={onNodeClick}
              onDismiss={onNodeDismiss}
            />
          </div>
        ))}
      </div>

      {/* Truncation notice */}
      {isTruncated && (
        <div className="border-t border-table-divider px-5 py-2 text-center text-[10px] text-muted">
          Showing {maxDisplay} of {filtered.length} matching nodes.
          Use search to find specific nodes.
        </div>
      )}
    </div>
  )
}
