// app/lib/smtp.ts
import 'server-only'
import nodemailer from 'nodemailer'

/**
 * buildTransporter
 *
 * Builds the SMTP transporter from the env values saved by the SMTP settings page.
 *
 * Encryption is decided by the PORT so a mismatched setting cannot cause the
 * "wrong version number" SSL error:
 *   465          → implicit SSL
 *   anything else → STARTTLS (unless encryption is 'None')
 */
export function buildTransporter() {
  const port = Number(process.env.NEXT_PUBLIC_SMTP_PORT) || 587
  const enc  = process.env.NEXT_PUBLIC_SMTP_ENCRYPTION ?? 'TLS'

  return nodemailer.createTransport({
    host:       process.env.NEXT_PUBLIC_SMTP_HOST,
    port,
    secure:     port === 465,
    requireTLS: port !== 465 && enc !== 'None',
    auth: {
      user: process.env.NEXT_PUBLIC_SMTP_USER,
      pass: process.env.NEXT_SMTP_PASSWORD?.replace(/\\#/g, '#'),
    },
  })
}

/**
 * sendMailSafe
 *
 * Sends an email and never throws. Returns true when sent, false when the
 * send failed (the error is logged). Use for emails that must not break the
 * request they belong to, e.g. the verification email on signup.
 */
export async function sendMailSafe(opts: {
  to:      string
  subject: string
  html:    string
}): Promise<boolean> {
  try {
    await buildTransporter().sendMail({
      from: process.env.NEXT_PUBLIC_SMTP_FROM || 'no-reply@example.com',
      ...opts,
    })
    return true
  } catch (err: any) {
    console.error('[smtp] Send failed:', err?.message)
    return false
  }
}