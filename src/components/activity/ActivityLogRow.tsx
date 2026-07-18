import { memo } from 'react'
import type { ActivityLogEvent } from '@/src/hooks/useActivityLogSubscription'

interface ActivityLogRowProps {
  event: ActivityLogEvent
  index: number
  measureElement: (index: number, element: HTMLElement | null) => void
}

export const ActivityLogRow = memo(function ActivityLogRow({ event, index, measureElement }: ActivityLogRowProps) {
  return (
    <li
      ref={(element) => measureElement(index, element)}
      className="grid grid-cols-[5.5rem_5rem_1fr] gap-3 border-b border-table-divider px-3 py-1 text-xs leading-5 text-muted-text"
      data-testid="activity-log-row"
    >
      <time className="font-mono text-muted" dateTime={event.timestamp}>
        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </time>
      <span className="font-semibold text-foreground">{event.nodeId}</span>
      <span className={event.level === 'error' ? 'text-danger' : event.level === 'warning' ? 'text-warning' : ''}>
        {event.message}
      </span>
    </li>
  )
})
