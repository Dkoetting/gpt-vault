import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getGptVaultDownloadUrl } from '@/lib/gpt-vault-download'
import { generatePlainToken, hashToken } from '@/lib/tokens'
import { InvoicePDF, type InvoiceData } from '@/lib/invoice-pdf'

export const runtime = 'nodejs'

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateLicenseKey(): string {
  const hex = randomUUID().replace(/-/g, '').toUpperCase()
  return `GV-${hex.slice(0, 6)}-${hex.slice(6, 12)}-${hex.slice(12, 18)}`
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const TTL_HOURS = Number(process.env.ACCESS_LINK_TTL_HOURS ?? 72)

// ── POST /api/webhook ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const stripeKey     = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_GPT_VAULT

  if (!stripeKey || !webhookSecret) {
    console.error('[webhook] Stripe-Konfiguration fehlt')
    return NextResponse.json({ error: 'server_config' }, { status: 500 })
  }

  // 1. Stripe Signatur prüfen
  const stripe    = new Stripe(stripeKey)
  const body      = await request.text()
  const signature = request.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[webhook] Signaturprüfung fehlgeschlagen', err)
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session

  // 2. Metadaten lesen
  const packageId = session.metadata?.package_id ?? ''
  const invoiceId = session.metadata?.invoice_id ?? ''
  const invoiceNr = session.metadata?.invoice_nr ?? ''
  const maxGpts   = parseInt(session.metadata?.max_gpts ?? '0', 10)
  const email     = (session.customer_details?.email ?? session.customer_email ?? '').toLowerCase().trim()
  const fullName  = session.customer_details?.name ?? ''

  if (!email || !packageId) {
    console.error('[webhook] Fehlende Metadaten', { email, packageId })
    return NextResponse.json({ error: 'missing_metadata' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const nowIso   = new Date().toISOString()
  const today    = formatDate(new Date())

  // 3. hub_invoices: status → paid
  if (invoiceId) {
    await supabase
      .from('hub_invoices')
      .update({ status: 'paid', stripe_session_id: session.id })
      .eq('id', invoiceId)
  }

  // 4. Rechnung aus DB laden (für PDF)
  let invoiceData: InvoiceData | null = null
  if (invoiceId) {
    const { data: inv } = await supabase
      .from('hub_invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (inv) {
      invoiceData = {
        invoiceNr:         inv.invoice_nr,
        invoiceDate:       today,
        packageName:       `GPT Vault – ${inv.package_id}`,
        packageDesc:       `Digitale Lizenz · Digital license`,
        amountNetCents:    inv.amount_net_cents,
        amountVatCents:    inv.amount_vat_cents,
        amountGrossCents:  inv.amount_gross_cents,
        billingType:       inv.billing_type,
        company:           inv.company ?? undefined,
        vatId:             inv.vat_id ?? undefined,
        firstName:         inv.first_name ?? undefined,
        lastName:          inv.last_name ?? undefined,
        street:            inv.street,
        zip:               inv.zip,
        city:              inv.city,
        country:           inv.country,
        email:             inv.email,
      }
    }
  }

  // 5. PDF generieren
  let pdfBuffer: Buffer | null = null
  if (invoiceData) {
    try {
      const elem = React.createElement(InvoicePDF, { d: invoiceData })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pdfBuffer = Buffer.from(await renderToBuffer(elem as any))
    } catch (err) {
      console.error('[webhook] PDF-Generierung fehlgeschlagen', err)
    }
  }

  // 6. Registrierung anlegen
  let registration: { id: string } | null = null

  const { data: newReg, error: regError } = await supabase
    .from('hub_registrations')
    .insert({
      email:            email,
      email_normalized: email,
      full_name:        fullName || null,
      app_id:           'gpt-vault',
      app_name:         'GPT Vault',
      app_price_cents:  session.amount_total ?? 0,
      app_currency:     'EUR',
      status:           'active',
    })
    .select('id')
    .single()

  if (regError?.code === '23505') {
    const { data: existing } = await supabase
      .from('hub_registrations')
      .select('id')
      .eq('email_normalized', email)
      .eq('app_id', 'gpt-vault')
      .single()
    registration = existing
  } else if (regError || !newReg) {
    console.error('[webhook] Registrierung fehlgeschlagen', regError)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  } else {
    registration = newReg
  }

  if (!registration) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  // 7. Lizenz anlegen
  const licenseKey = generateLicenseKey()
  await supabase.from('hub_licenses').insert({
    registration_id: registration.id,
    license_key:     licenseKey,
    max_gpts:        maxGpts,
    status:          'active',
  })

  // 8. Aktivierungs-Token
  const plainToken = generatePlainToken()
  const tokenHash  = hashToken(plainToken)
  const expiresAt  = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000)

  await supabase.from('hub_access_links').insert({
    registration_id: registration.id,
    token_hash:      tokenHash,
    expires_at:      expiresAt.toISOString(),
  })

  // 9. Events loggen
  void supabase.from('hub_access_events').insert([
    {
      registration_id: registration.id,
      event_type:      'stripe_payment_completed',
      metadata: { stripe_session_id: session.id, package_id: packageId, amount_total: session.amount_total },
    },
    {
      registration_id: registration.id,
      event_type:      'license_created',
      metadata: { license_key: licenseKey, max_gpts: maxGpts },
    },
  ])

  // 10. E-Mail senden (mit PDF-Anhang)
  const resendKey     = process.env.RESEND_API_KEY
  const fromEmail     = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  const baseUrl       = process.env.NEXT_PUBLIC_HUB_BASE_URL ?? 'https://gpt-vault-theta.vercel.app'
  const downloadUrl   = getGptVaultDownloadUrl()
  const activationUrl = `${baseUrl}/access?token=${encodeURIComponent(plainToken)}`
  const name          = fullName ? ` ${fullName}` : ''

  if (resendKey) {
    const resend = new Resend(resendKey)

    const attachments = pdfBuffer ? [{
      filename: `Rechnung_${invoiceNr || invoiceId}_GPT-Vault.pdf`,
      content:  pdfBuffer,
    }] : []

    await resend.emails.send({
      from:    fromEmail,
      to:      email,
      subject: `GPT Vault – Aktivierungscode & Rechnung / Activation code & Invoice`,
      attachments,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#222;">
          <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:24px 32px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:22px;">🗄️ GPT Vault</h1>
            <p style="color:#bfdbfe;margin:6px 0 0;font-size:14px;">Vielen Dank für deinen Kauf! / Thank you for your purchase!</p>
          </div>
          <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">

            <p>Hallo${name} / Hello${name},</p>

            <p><strong>Schritt 1 / Step 1 – Download GPT Vault:</strong></p>
            <p><a href="${downloadUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">→ GPT Vault herunterladen / Download</a></p>

            <p style="margin-top:24px;"><strong>Schritt 2 / Step 2 – Aktivierungscode / Activation code:</strong></p>
            <p style="font-family:monospace;font-size:18px;background:#f3f4f6;padding:14px 18px;border-radius:8px;letter-spacing:0.05em;">${plainToken}</p>
            <p><a href="${activationUrl}" style="color:#2563eb;">→ Direkt aktivieren / Activate directly</a></p>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
            <p style="color:#6b7280;font-size:12px;">
              Paket / Package: GPT Vault – ${packageId}<br/>
              Rechnung / Invoice: ${invoiceNr || '–'}<br/>
              ${pdfBuffer ? 'Rechnung als PDF im Anhang / Invoice PDF attached.<br/>' : ''}
              Fragen? / Questions? dkoetting@edvkonzepte.de
            </p>
          </div>
        </div>
      `,
    }).catch((err) => console.error('[webhook] E-Mail fehlgeschlagen', err))
  }

  return NextResponse.json({ received: true })
}
