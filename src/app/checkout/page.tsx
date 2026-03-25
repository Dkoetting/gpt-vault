'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './checkout.module.css'
import packages from '@/config/packages.json'

function CheckoutForm() {
  const searchParams = useSearchParams()
  const packageId = searchParams.get('package') ?? 'starter'
  const projectCount = parseInt(searchParams.get('count') ?? '1')

  // ── Order summary ──────────────────────────────────────────────────────────
  const pkg = packages.find((p) => p.id === packageId)

  let grossCents: number
  let lineDesc: string

  if (packageId === 'projects') {
    grossCents = projectCount * 120
    lineDesc = `GPT Vault – Projekte (${projectCount})`
  } else {
    grossCents = pkg?.priceCents ?? 0
    lineDesc = `GPT Vault – ${pkg?.name} (bis zu ${pkg?.gpts} GPTs)`
  }

  const netCents = Math.round(grossCents / 1.19)
  const vatCents = grossCents - netCents
  const fmt = (c: number) => (c / 100).toFixed(2).replace('.', ',') + ' €'

  // ── Form state ─────────────────────────────────────────────────────────────
  const [type, setType] = useState<'company' | 'private'>('company')
  const [form, setForm] = useState({
    company: '', vatId: '',
    firstName: '', lastName: '',
    street: '', zip: '', city: '', country: 'DE', email: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId,
          projectCount: packageId === 'projects' ? projectCount : undefined,
          email: form.email,
          billing: { type, ...form },
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? 'Fehler beim Checkout')
      }
    } catch {
      setError('Verbindungsfehler. Bitte versuche es erneut.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <a href="/" className={styles.back}>← Zurück</a>

      <div className={styles.layout}>

        {/* ── Bestellübersicht ── */}
        <div className={styles.summary}>
          <h2 className={styles.summaryTitle}>Bestellübersicht</h2>
          <p className={styles.summaryLine}>{lineDesc}</p>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryRow}>
            <span>Netto</span><span>{fmt(netCents)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>zzgl. 19 % USt.</span><span>{fmt(vatCents)}</span>
          </div>
          <div className={styles.summaryTotal}>
            <span>Gesamtbetrag</span><strong>{fmt(grossCents)}</strong>
          </div>
          <p className={styles.summaryNote}>
            Nach der Zahlung erhältst du deinen Aktivierungscode und eine Rechnung per E-Mail.
          </p>
        </div>

        {/* ── Rechnungsadresse ── */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <h2 className={styles.formTitle}>Rechnungsadresse</h2>

          {/* Toggle Firma / Privat */}
          <div className={styles.toggle}>
            <button
              type="button"
              className={[styles.toggleBtn, type === 'company' ? styles.toggleActive : ''].join(' ')}
              onClick={() => setType('company')}
            >Firma</button>
            <button
              type="button"
              className={[styles.toggleBtn, type === 'private' ? styles.toggleActive : ''].join(' ')}
              onClick={() => setType('private')}
            >Privatperson</button>
          </div>

          {type === 'company' ? (
            <>
              <label className={styles.label}>
                Firmenname *
                <input required className={styles.input} value={form.company}
                  onChange={(e) => set('company', e.target.value)} placeholder="Musterfirma GmbH" />
              </label>
              <label className={styles.label}>
                USt-ID <span className={styles.optional}>(optional)</span>
                <input className={styles.input} value={form.vatId}
                  onChange={(e) => set('vatId', e.target.value)} placeholder="DE123456789" />
              </label>
            </>
          ) : (
            <div className={styles.row}>
              <label className={styles.label}>
                Vorname *
                <input required className={styles.input} value={form.firstName}
                  onChange={(e) => set('firstName', e.target.value)} placeholder="Max" />
              </label>
              <label className={styles.label}>
                Nachname *
                <input required className={styles.input} value={form.lastName}
                  onChange={(e) => set('lastName', e.target.value)} placeholder="Mustermann" />
              </label>
            </div>
          )}

          <label className={styles.label}>
            Straße & Hausnummer *
            <input required className={styles.input} value={form.street}
              onChange={(e) => set('street', e.target.value)} placeholder="Musterstraße 42" />
          </label>

          <div className={styles.row}>
            <label className={styles.label} style={{ flex: '0 0 110px' }}>
              PLZ *
              <input required className={styles.input} value={form.zip}
                onChange={(e) => set('zip', e.target.value)} placeholder="80331" maxLength={10} />
            </label>
            <label className={styles.label}>
              Ort *
              <input required className={styles.input} value={form.city}
                onChange={(e) => set('city', e.target.value)} placeholder="München" />
            </label>
          </div>

          <label className={styles.label}>
            Land *
            <select required className={styles.input} value={form.country}
              onChange={(e) => set('country', e.target.value)}>
              <option value="DE">Deutschland</option>
              <option value="AT">Österreich</option>
              <option value="CH">Schweiz</option>
              <option value="OTHER">Anderes Land</option>
            </select>
          </label>

          <label className={styles.label}>
            E-Mail-Adresse *
            <input required type="email" className={styles.input} value={form.email}
              onChange={(e) => set('email', e.target.value)} placeholder="max@beispiel.de" />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? 'Weiterleitung zu Stripe…' : 'Jetzt kaufen →'}
          </button>

          <p className={styles.secure}>🔒 Sichere Zahlung via Stripe · Rechnung per E-Mail</p>
        </form>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutForm />
    </Suspense>
  )
}
