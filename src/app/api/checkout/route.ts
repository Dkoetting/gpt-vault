import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'

import packagesRaw from '@/config/packages.json'
import { supabase } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

type Package = {
  id: string
  name: string
  gpts: number | null
  priceCents: number | null
  currency: string
  description: string
  contactOnly?: boolean
  sessionOnly?: boolean
}

const packages = packagesRaw as Package[]

// ── Schema ─────────────────────────────────────────────────────────────────────

const billingSchema = z.object({
  type:      z.enum(['company', 'private']),
  company:   z.string().max(200).optional(),
  vatId:     z.string().max(50).optional(),
  firstName: z.string().max(100).optional(),
  lastName:  z.string().max(100).optional(),
  street:    z.string().min(1).max(200),
  zip:       z.string().min(1).max(20),
  city:      z.string().min(1).max(100),
  country:   z.string().length(2).default('DE'),
  email:     z.string().email().max(320),
})

const requestSchema = z.object({
  packageId:    z.string().min(1).max(32),
  projectCount: z.number().int().min(1).max(500).optional(),
  email:        z.string().email().max(320).optional(),
  billing:      billingSchema.optional(),
})

// ── Helper: Rechnungsnummer ────────────────────────────────────────────────────

async function nextInvoiceNr(): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('hub_invoices')
    .select('*', { count: 'exact', head: true })
  const nr = String((count ?? 0) + 1).padStart(5, '0')
  return `${year}${nr}`
}

// ── POST /api/checkout ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // 1. Parse body
  let body: z.infer<typeof requestSchema>
  try {
    body = requestSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  // 2. Preis & Beschreibung bestimmen
  const PRICE_PER_PROJECT_CENTS = 120

  let lineItemName:  string
  let lineItemDesc:  string
  let priceCents:    number
  let metaPackageId: string
  let currency = 'eur'

  if (body.packageId === 'projects') {
    const count   = body.projectCount ?? 1
    priceCents    = count * PRICE_PER_PROJECT_CENTS
    lineItemName  = `GPT Vault – Projekte (${count})`
    lineItemDesc  = `Backup von ${count} ChatGPT-Projekt${count === 1 ? '' : 'en'} · 1,20 € / Projekt`
    metaPackageId = 'projects'
  } else {
    const pkg = packages.find((p) => p.id === body.packageId)
    if (!pkg || pkg.contactOnly || pkg.priceCents === null) {
      return NextResponse.json({ error: 'unknown_package' }, { status: 400 })
    }
    priceCents    = pkg.priceCents
    currency      = pkg.currency.toLowerCase()
    lineItemName  = `GPT Vault – ${pkg.name}`
    lineItemDesc  = pkg.description
    metaPackageId = pkg.id
  }

  // 3. MwSt berechnen (Preise sind Netto)
  const amountNet   = priceCents
  const amountVat   = Math.round(priceCents * 0.19)
  const amountGross = amountNet + amountVat

  // 4. Billing-Daten in hub_invoices speichern
  const billing   = body.billing
  const email     = billing?.email ?? body.email ?? ''
  const invoiceNr = await nextInvoiceNr()

  const { data: invoice, error: dbError } = await supabase
    .from('hub_invoices')
    .insert({
      invoice_nr:          invoiceNr,
      status:              'pending_payment',
      billing_type:        billing?.type ?? 'private',
      company:             billing?.company ?? null,
      vat_id:              billing?.vatId ?? null,
      first_name:          billing?.firstName ?? null,
      last_name:           billing?.lastName ?? null,
      street:              billing?.street ?? '',
      zip:                 billing?.zip ?? '',
      city:                billing?.city ?? '',
      country:             billing?.country ?? 'DE',
      email,
      package_id:          metaPackageId,
      amount_net_cents:    amountNet,
      amount_vat_cents:    amountVat,
      amount_gross_cents:  amountGross,
    })
    .select('id')
    .single()

  if (dbError) {
    console.error('[checkout] Supabase error', dbError)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  // 5. Stripe Session erstellen
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'server_config' }, { status: 500 })
  }
  const stripe  = new Stripe(stripeKey)
  const baseUrl = process.env.NEXT_PUBLIC_HUB_BASE_URL ?? 'http://localhost:3010'

  try {
    const session = await stripe.checkout.sessions.create({
      mode:                 'payment',
      payment_method_types: ['card'],
      customer_email:       email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency,
          unit_amount:  amountGross,          // Kunde zahlt Brutto
          product_data: {
            name:        lineItemName,
            description: lineItemDesc,
          },
        },
      }],
      metadata: {
        app_id:     'gpt-vault',
        package_id: metaPackageId,
        invoice_id: invoice.id,
        invoice_nr: invoiceNr,
      },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${baseUrl}/`,
    })

    // Stripe Session ID in hub_invoices speichern
    await supabase
      .from('hub_invoices')
      .update({ stripe_session_id: session.id })
      .eq('id', invoice.id)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[checkout] Stripe error', msg)
    return NextResponse.json({ error: 'stripe_error', detail: msg }, { status: 500 })
  }
}
