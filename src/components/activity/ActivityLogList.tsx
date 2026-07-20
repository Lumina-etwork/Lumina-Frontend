'use client'

import { memo, useMemo } from 'react'
import { ActivityLogRow } from '@/src/components/activity/ActivityLogRow'
import type { ActivityLogEvent } from '@/src/hooks/useActivityLogSubscription'
import { useVirtualList } from '@/src/lib/virtualScroll/useVirtualList'

interface ActivityLogListProps {
  events: ActivityLogEvent[]
}

const VisibleRows = memo(function VisibleRows({
  events,
  start,
  measureElement,
}: {
  events: readonly ActivityLogEvent[]
  start: number
  measureElement: (index: number, element: HTMLElement | null) => void
}) {
  return events.map((event, offset) => (
    <ActivityLogRow key={event.id} event={event} index={start + offset} measureElement={measureElement} />
  ))
})

export function ActivityLogList({ events }: ActivityLogListProps) {
  const orderedEvents = useMemo(() => events, [events])
  const virtualList = useVirtualList(orderedEvents, {
    totalCount: orderedEvents.length,
    estimatedRowHeight: 32,
    overscanScreens: 3,
    maxRenderedItems: 100,
    preserveKey: 'facility-activity-log',
  })

  return (
    <section className="rounded-lg border border-border bg-surface" aria-labelledby="activity-log-heading">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 id="activity-log-heading" className="text-sm font-semibold text-foreground">Node Activity Log</h2>
        <span className="text-xs text-muted">{events.length.toLocaleString()} events</span>
      </div>
      <div ref={virtualList.containerRef} className="h-[420px] overflow-y-auto" data-testid="activity-log-scrollport">
        <div ref={virtualList.topSentinelRef} aria-hidden="true" />
        <ul style={{ paddingTop: virtualList.paddingTop, paddingBottom: virtualList.paddingBottom }}>
          <VisibleRows events={virtualList.visibleItems} start={virtualList.start} measureElement={virtualList.measureElement} />
        </ul>
        <div ref={virtualList.bottomSentinelRef} aria-hidden="true" />
      </div>
    </section>
  )
}
