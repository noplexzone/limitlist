'use client'

interface ToggleProps {
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
  label: string
}

export default function Toggle({ checked, disabled, onChange, label }: ToggleProps) {
  return (
    <label className="inline-flex min-h-[44px] items-center gap-3 text-sm text-surface-200 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-2 focus:ring-offset-surface-900 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'border-accent-400 bg-accent-600' : 'border-surface-600 bg-surface-800'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface-50 shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
      <span>{label}</span>
    </label>
  )
}
