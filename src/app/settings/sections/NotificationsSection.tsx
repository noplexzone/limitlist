'use client'

import { useEffect, useState } from 'react'
import type { SettingsState } from '../types'

type Channel = 'discord' | 'ntfy' | 'gotify' | 'smtp'
type Trigger = 'episode-aired' | 'aired-unwatched'

type Draft = {
  notifyEnabled: boolean
  notifyTrigger: Trigger
  notifyDiscordEnabled: boolean
  notifyDiscordWebhook: string
  notifyNtfyEnabled: boolean
  notifyNtfyUrl: string
  notifyNtfyToken: string
  notifyGotifyEnabled: boolean
  notifyGotifyUrl: string
  notifyGotifyToken: string
  notifySmtpEnabled: boolean
  notifySmtpHost: string
  notifySmtpPort: string
  notifySmtpUser: string
  notifySmtpPass: string
  notifySmtpFrom: string
  notifySmtpTo: string
}

function fromSettings(settings: SettingsState): Draft {
  return {
    notifyEnabled: settings.notifyEnabled.value,
    notifyTrigger: settings.notifyTrigger.value,
    notifyDiscordEnabled: settings.notifyDiscordEnabled.value,
    notifyDiscordWebhook: '',
    notifyNtfyEnabled: settings.notifyNtfyEnabled.value,
    notifyNtfyUrl: settings.notifyNtfyUrl.value,
    notifyNtfyToken: '',
    notifyGotifyEnabled: settings.notifyGotifyEnabled.value,
    notifyGotifyUrl: settings.notifyGotifyUrl.value,
    notifyGotifyToken: '',
    notifySmtpEnabled: settings.notifySmtpEnabled.value,
    notifySmtpHost: settings.notifySmtpHost.value,
    notifySmtpPort: settings.notifySmtpPort.value,
    notifySmtpUser: settings.notifySmtpUser.value,
    notifySmtpPass: '',
    notifySmtpFrom: settings.notifySmtpFrom.value,
    notifySmtpTo: settings.notifySmtpTo.value,
  }
}

function Toggle({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="inline-flex items-center gap-3 text-sm text-surface-200">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'border-accent-400 bg-accent-600' : 'border-surface-600 bg-surface-800'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface-50 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
      <span>{label}</span>
    </label>
  )
}

function TextField({ label, value, disabled, placeholder, type = 'text', onChange }: { label: string; value: string; disabled?: boolean; placeholder?: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-surface-300">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-surface-100 outline-none placeholder:text-surface-600 focus:border-accent-500 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  )
}

function SecretField({ label, value, disabled, configured, masked, onChange }: { label: string; value: string; disabled: boolean; configured: boolean; masked: string | null; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-surface-300">{label}</span>
      <div className="flex gap-2">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          disabled={disabled}
          autoComplete="off"
          placeholder={disabled ? 'Set in environment' : ''}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-surface-100 outline-none placeholder:text-surface-600 focus:border-accent-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="button"
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          title={visible ? 'Hide' : 'Show'}
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
          className="rounded-lg border border-surface-700 bg-surface-900 px-3 text-surface-300 hover:border-accent-500 hover:text-accent-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
        </button>
      </div>
      <span className="mt-1 block text-xs text-surface-500">
        {configured ? `Currently configured${masked ? ` (${masked})` : ''}; leave blank to keep it.` : 'Not configured.'}
      </span>
    </label>
  )
}

function Card({ title, description, enabled, locked, onEnabledChange, children, actions }: { title: string; description: string; enabled: boolean; locked: boolean; onEnabledChange: (value: boolean) => void; children: React.ReactNode; actions: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-surface-800 bg-surface-900/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-surface-100">{title}</h3>
          <p className="mt-1 text-sm text-surface-400">{description}</p>
        </div>
        <Toggle checked={enabled} disabled={locked} onChange={onEnabledChange} label={`Enable ${title}`} />
      </div>
      <div className="mt-4 space-y-4">{children}</div>
      <div className="mt-5">{actions}</div>
    </section>
  )
}

export default function NotificationsSection({ settings, onSettingsChange }: { settings: SettingsState; onSettingsChange: (settings: SettingsState) => void }) {
  const [draft, setDraft] = useState(() => fromSettings(settings))
  const [busy, setBusy] = useState<string | null>(null)
  const [results, setResults] = useState<Partial<Record<Channel | 'preferences', { ok: boolean; message: string }>>>({})

  useEffect(() => setDraft(fromSettings(settings)), [settings])
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  async function save(label: Channel | 'preferences', payload: Record<string, unknown>) {
    setBusy(`save-${label}`)
    setResults((current) => ({ ...current, [label]: undefined }))
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save notification settings')
      onSettingsChange(data as SettingsState)
      setResults((current) => ({ ...current, [label]: { ok: true, message: 'Saved.' } }))
    } catch (error) {
      setResults((current) => ({ ...current, [label]: { ok: false, message: error instanceof Error ? error.message : 'Could not save notification settings' } }))
    } finally {
      setBusy(null)
    }
  }

  async function sendTest(channel: Channel, dirty: boolean) {
    if (dirty) {
      setResults((current) => ({ ...current, [channel]: { ok: false, message: 'Save this channel before sending a test.' } }))
      return
    }
    setBusy(`test-${channel}`)
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      })
      const data = await response.json()
      setResults((current) => ({ ...current, [channel]: { ok: Boolean(data.ok), message: data.message || (response.ok ? 'Test sent.' : 'Test failed.') } }))
    } catch {
      setResults((current) => ({ ...current, [channel]: { ok: false, message: 'Could not send the test notification.' } }))
    } finally {
      setBusy(null)
    }
  }

  const preferenceDirty = draft.notifyEnabled !== settings.notifyEnabled.value || draft.notifyTrigger !== settings.notifyTrigger.value
  const discordDirty = draft.notifyDiscordEnabled !== settings.notifyDiscordEnabled.value || Boolean(draft.notifyDiscordWebhook)
  const ntfyDirty = draft.notifyNtfyEnabled !== settings.notifyNtfyEnabled.value || draft.notifyNtfyUrl !== settings.notifyNtfyUrl.value || Boolean(draft.notifyNtfyToken)
  const gotifyDirty = draft.notifyGotifyEnabled !== settings.notifyGotifyEnabled.value || draft.notifyGotifyUrl !== settings.notifyGotifyUrl.value || Boolean(draft.notifyGotifyToken)
  const smtpDirty = draft.notifySmtpEnabled !== settings.notifySmtpEnabled.value || draft.notifySmtpHost !== settings.notifySmtpHost.value || draft.notifySmtpPort !== settings.notifySmtpPort.value || draft.notifySmtpUser !== settings.notifySmtpUser.value || Boolean(draft.notifySmtpPass) || draft.notifySmtpFrom !== settings.notifySmtpFrom.value || draft.notifySmtpTo !== settings.notifySmtpTo.value
  const plexConfigured = settings.plexBaseUrl.configured && settings.plexToken.configured

  const feedback = (key: Channel | 'preferences') => results[key] ? (
    <p role="status" className="mt-3 rounded-lg border border-accent-700/50 bg-accent-950/40 px-3 py-2 text-sm text-accent-200">
      {results[key]!.ok ? 'Success: ' : 'Failed: '}{results[key]!.message}
    </p>
  ) : null
  const actions = (channel: Channel, dirty: boolean, savePayload: Record<string, unknown>) => (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy !== null || !dirty} onClick={() => save(channel, savePayload)} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-surface-50 hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50">{busy === `save-${channel}` ? 'Saving…' : 'Save channel'}</button>
        <button type="button" disabled={busy !== null || dirty} onClick={() => sendTest(channel, dirty)} className="rounded-lg border border-surface-700 bg-surface-900 px-4 py-2 text-sm font-medium text-surface-200 hover:border-accent-500 hover:text-accent-300 disabled:cursor-not-allowed disabled:opacity-50">{busy === `test-${channel}` ? 'Sending…' : 'Send test'}</button>
      </div>
      {dirty && <p className="mt-2 text-xs text-surface-500">Save changes before sending a test.</p>}
      {feedback(channel)}
    </>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-surface-100">Notifications</h2>
        <p className="mt-1 text-sm text-surface-400">Send new-episode alerts through any combination of delivery channels.</p>
      </div>

      <section className="rounded-xl border border-surface-800 bg-surface-900/50 p-5 space-y-4">
        <Toggle checked={draft.notifyEnabled} disabled={settings.notifyEnabled.lockedByEnvironment} onChange={(value) => set('notifyEnabled', value)} label="Enable episode notifications" />
        <fieldset disabled={settings.notifyTrigger.lockedByEnvironment} className="space-y-2">
          <legend className="text-sm font-medium text-surface-200">Notify me</legend>
          <label className="flex items-start gap-2 text-sm text-surface-300"><input type="radio" name="notify-trigger" checked={draft.notifyTrigger === 'episode-aired'} onChange={() => set('notifyTrigger', 'episode-aired')} className="mt-0.5 accent-accent-500" /><span>When an episode airs</span></label>
          <label className="flex items-start gap-2 text-sm text-surface-300"><input type="radio" name="notify-trigger" checked={draft.notifyTrigger === 'aired-unwatched'} onChange={() => set('notifyTrigger', 'aired-unwatched')} className="mt-0.5 accent-accent-500" /><span>When an episode airs and I haven&apos;t watched it</span></label>
        </fieldset>
        {draft.notifyTrigger === 'aired-unwatched' && !plexConfigured && <p className="text-sm text-accent-300">This trigger needs Plex configured and synced to know which episodes you have watched. Manual episode watch marks also count.</p>}
        <button type="button" disabled={busy !== null || !preferenceDirty} onClick={() => save('preferences', { notifyEnabled: draft.notifyEnabled, notifyTrigger: draft.notifyTrigger })} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-surface-50 hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50">{busy === 'save-preferences' ? 'Saving…' : 'Save notification preferences'}</button>
        {feedback('preferences')}
      </section>

      <Card title="Discord webhook" description="Post a rich embed to a Discord channel webhook." enabled={draft.notifyDiscordEnabled} locked={settings.notifyDiscordEnabled.lockedByEnvironment} onEnabledChange={(value) => set('notifyDiscordEnabled', value)} actions={actions('discord', discordDirty, { notifyDiscordEnabled: draft.notifyDiscordEnabled, notifyDiscordWebhook: draft.notifyDiscordWebhook })}>
        <SecretField label="Webhook URL" value={draft.notifyDiscordWebhook} disabled={settings.notifyDiscordWebhook.lockedByEnvironment} configured={settings.notifyDiscordWebhook.configured} masked={settings.notifyDiscordWebhook.masked} onChange={(value) => set('notifyDiscordWebhook', value)} />
      </Card>

      <Card title="ntfy" description="Publish to an ntfy topic, with an optional bearer token." enabled={draft.notifyNtfyEnabled} locked={settings.notifyNtfyEnabled.lockedByEnvironment} onEnabledChange={(value) => set('notifyNtfyEnabled', value)} actions={actions('ntfy', ntfyDirty, { notifyNtfyEnabled: draft.notifyNtfyEnabled, notifyNtfyUrl: draft.notifyNtfyUrl, notifyNtfyToken: draft.notifyNtfyToken })}>
        <TextField label="Topic URL" value={draft.notifyNtfyUrl} disabled={settings.notifyNtfyUrl.lockedByEnvironment} placeholder="https://ntfy.sh/my-topic" onChange={(value) => set('notifyNtfyUrl', value)} />
        <SecretField label="Auth token (optional)" value={draft.notifyNtfyToken} disabled={settings.notifyNtfyToken.lockedByEnvironment} configured={settings.notifyNtfyToken.configured} masked={settings.notifyNtfyToken.masked} onChange={(value) => set('notifyNtfyToken', value)} />
      </Card>

      <Card title="Gotify" description="Send through a Gotify application token." enabled={draft.notifyGotifyEnabled} locked={settings.notifyGotifyEnabled.lockedByEnvironment} onEnabledChange={(value) => set('notifyGotifyEnabled', value)} actions={actions('gotify', gotifyDirty, { notifyGotifyEnabled: draft.notifyGotifyEnabled, notifyGotifyUrl: draft.notifyGotifyUrl, notifyGotifyToken: draft.notifyGotifyToken })}>
        <TextField label="Server URL" value={draft.notifyGotifyUrl} disabled={settings.notifyGotifyUrl.lockedByEnvironment} placeholder="https://gotify.example.com" onChange={(value) => set('notifyGotifyUrl', value)} />
        <SecretField label="App token" value={draft.notifyGotifyToken} disabled={settings.notifyGotifyToken.lockedByEnvironment} configured={settings.notifyGotifyToken.configured} masked={settings.notifyGotifyToken.masked} onChange={(value) => set('notifyGotifyToken', value)} />
      </Card>

      <Card title="SMTP email" description="Send an HTML email through your SMTP server." enabled={draft.notifySmtpEnabled} locked={settings.notifySmtpEnabled.lockedByEnvironment} onEnabledChange={(value) => set('notifySmtpEnabled', value)} actions={actions('smtp', smtpDirty, { notifySmtpEnabled: draft.notifySmtpEnabled, notifySmtpHost: draft.notifySmtpHost, notifySmtpPort: draft.notifySmtpPort, notifySmtpUser: draft.notifySmtpUser, notifySmtpPass: draft.notifySmtpPass, notifySmtpFrom: draft.notifySmtpFrom, notifySmtpTo: draft.notifySmtpTo })}>
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]"><TextField label="Host" value={draft.notifySmtpHost} disabled={settings.notifySmtpHost.lockedByEnvironment} onChange={(value) => set('notifySmtpHost', value)} /><TextField label="Port" type="number" value={draft.notifySmtpPort} disabled={settings.notifySmtpPort.lockedByEnvironment} placeholder="587" onChange={(value) => set('notifySmtpPort', value)} /></div>
        <TextField label="Username (optional)" value={draft.notifySmtpUser} disabled={settings.notifySmtpUser.lockedByEnvironment} onChange={(value) => set('notifySmtpUser', value)} />
        <SecretField label="Password" value={draft.notifySmtpPass} disabled={settings.notifySmtpPass.lockedByEnvironment} configured={settings.notifySmtpPass.configured} masked={settings.notifySmtpPass.masked} onChange={(value) => set('notifySmtpPass', value)} />
        <div className="grid gap-4 sm:grid-cols-2"><TextField label="From address" type="email" value={draft.notifySmtpFrom} disabled={settings.notifySmtpFrom.lockedByEnvironment} onChange={(value) => set('notifySmtpFrom', value)} /><TextField label="To address" type="email" value={draft.notifySmtpTo} disabled={settings.notifySmtpTo.lockedByEnvironment} onChange={(value) => set('notifySmtpTo', value)} /></div>
      </Card>

      <p className="rounded-lg border border-surface-800 bg-surface-900/40 p-4 text-sm text-surface-400">Notification delivery uses the <code className="text-accent-300">notify</code> scheduled task. Set its frequency in <a href="/settings?section=tasks" className="font-medium text-accent-300 hover:text-accent-200">Tasks settings</a>.</p>
    </div>
  )
}
