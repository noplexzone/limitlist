export const SHOW_STATUSES = [
  'WATCHING',
  'UP_TO_DATE',
  'COMPLETED',
  'PLAN_TO_WATCH',
  'DROPPED',
] as const

export type ShowStatus = (typeof SHOW_STATUSES)[number]

export const STATUS_LABELS: Record<ShowStatus, string> = {
  WATCHING: 'Watching',
  UP_TO_DATE: 'Up-to-Date',
  COMPLETED: 'Completed',
  PLAN_TO_WATCH: 'Plan to Watch',
  DROPPED: 'Dropped',
}

export function isShowStatus(value: unknown): value is ShowStatus {
  return typeof value === 'string' && (SHOW_STATUSES as readonly string[]).includes(value)
}
