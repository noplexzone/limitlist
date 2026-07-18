import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import {
  getEffectiveNotifySmtpHost,
  getEffectiveNotifySmtpPort,
  getEffectiveNotifySmtpFrom,
  getEffectiveNotifySmtpTo,
  getEffectiveNotifySmtpUser,
  getEffectiveNotifySmtpPass,
} from '../settings'
import type { ChannelResult, NotificationPayload } from './types'
import { FETCH_TIMEOUT_MS, isSafeHttpUrl } from './http'

class SmtpTimeoutError extends Error {}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildHtml(payload: NotificationPayload): string {
  const title = escapeHtml(payload.title)
  const body = escapeHtml(payload.body)
  const showTitle = escapeHtml(payload.showTitle)
  const episodeLabel = escapeHtml(payload.episodeLabel)
  const safeUrl = payload.url && isSafeHttpUrl(payload.url) ? payload.url : null
  const safePosterUrl = payload.posterUrl && isSafeHttpUrl(payload.posterUrl) ? payload.posterUrl : null

  let html = `<h2>${title}</h2><p>${body}</p><p><strong>${showTitle}</strong> &mdash; ${episodeLabel}</p>`
  if (safePosterUrl) {
    html += `<p><img src="${escapeHtml(safePosterUrl)}" alt="${showTitle} poster" style="max-width:240px;height:auto"></p>`
  }
  if (safeUrl) {
    html += `<p><a href="${escapeHtml(safeUrl)}">View in LimitList</a></p>`
  }
  return html
}

export async function sendSmtp(payload: NotificationPayload): Promise<ChannelResult> {
  const channel = 'smtp' as const

  try {
    const [host, portRaw, from, to, user, pass] = await Promise.all([
      getEffectiveNotifySmtpHost(),
      getEffectiveNotifySmtpPort(),
      getEffectiveNotifySmtpFrom(),
      getEffectiveNotifySmtpTo(),
      getEffectiveNotifySmtpUser(),
      getEffectiveNotifySmtpPass(),
    ])

    if (!host) return { channel, ok: false, message: 'SMTP host is not configured' }
    if (!from) return { channel, ok: false, message: 'SMTP from address is not configured' }
    if (!to) return { channel, ok: false, message: 'SMTP to address is not configured' }

    const port = portRaw ? parseInt(portRaw, 10) : 587
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return { channel, ok: false, message: 'SMTP port is invalid' }
    }
    if (Boolean(user) !== Boolean(pass)) {
      return { channel, ok: false, message: 'SMTP authentication is incomplete' }
    }

    const secure = port === 465

    const transportOptions: SMTPTransport.Options = {
      host,
      port,
      secure,
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 8_000,
    }

    if (user && pass) {
      transportOptions.auth = { user, pass }
    }

    const transporter = nodemailer.createTransport(transportOptions)

    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        transporter.sendMail({
          from,
          to,
          subject: payload.title,
          text: `${payload.body}\n\n${payload.showTitle} — ${payload.episodeLabel}${payload.url && isSafeHttpUrl(payload.url) ? `\n${payload.url}` : ''}`,
          html: buildHtml(payload),
        }),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new SmtpTimeoutError()), FETCH_TIMEOUT_MS)
        }),
      ])
    } finally {
      if (timeout) clearTimeout(timeout)
      transporter.close()
    }

    return { channel, ok: true, message: 'Notification sent' }
  } catch (err) {
    if (err instanceof SmtpTimeoutError) {
      return { channel, ok: false, message: 'Request timed out' }
    }
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT') || msg.includes('timeout')) {
      return { channel, ok: false, message: 'Connection failed' }
    }
    if (msg.includes('auth') || msg.includes('535') || msg.includes('534') || msg.includes('Username') || msg.includes('Password')) {
      return { channel, ok: false, message: 'Authentication failed' }
    }
    return { channel, ok: false, message: 'Failed to send notification' }
  }
}
