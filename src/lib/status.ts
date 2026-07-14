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

const STATUS_STYLE_CLASSES: Record<ShowStatus, { select: string; dot: string; badge: string }> = {
  WATCHING: { select: 'bg-blue-700/90 border-blue-500/70', dot: 'bg-blue-500', badge: 'bg-blue-600' },
  UP_TO_DATE: { select: 'bg-cyan-700/90 border-cyan-500/70', dot: 'bg-cyan-500', badge: 'bg-cyan-600' },
  COMPLETED: { select: 'bg-green-700/90 border-green-500/70', dot: 'bg-green-500', badge: 'bg-green-600' },
  PLAN_TO_WATCH: { select: 'bg-amber-700/90 border-amber-500/70', dot: 'bg-gray-500', badge: 'bg-yellow-600' },
  DROPPED: { select: 'bg-red-800/90 border-red-600/70', dot: 'bg-red-500', badge: 'bg-red-600' },
}

export const STATUS_SELECT_CLASSES: Record<ShowStatus, string> = Object.fromEntries(
  SHOW_STATUSES.map((status) => [status, STATUS_STYLE_CLASSES[status].select])
) as Record<ShowStatus, string>

export const STATUS_DOT_CLASSES: Record<ShowStatus, string> = Object.fromEntries(
  SHOW_STATUSES.map((status) => [status, STATUS_STYLE_CLASSES[status].dot])
) as Record<ShowStatus, string>

export const STATUS_BADGE_CLASSES: Record<ShowStatus, string> = Object.fromEntries(
  SHOW_STATUSES.map((status) => [status, STATUS_STYLE_CLASSES[status].badge])
) as Record<ShowStatus, string>

export function isShowStatus(value: unknown): value is ShowStatus {
  return typeof value === 'string' && (SHOW_STATUSES as readonly string[]).includes(value)
}
