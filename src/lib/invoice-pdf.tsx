import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'

// ── Styles ─────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#222',
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 50,
  },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  companyLogo: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1e3a8a' },
  tagline: { fontSize: 8, color: '#888', marginTop: 2 },
  headerRight: { fontSize: 8, color: '#888', textAlign: 'right' },

  // Absenderzeile
  senderLine: {
    fontSize: 7, color: '#555', borderBottomWidth: 0.5,
    borderBottomColor: '#aaa', paddingBottom: 4, marginBottom: 12,
  },

  // Adress + Info Block
  addrRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  addrBlock: { width: '55%' },
  addrName: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  addrLine: { fontSize: 9, marginBottom: 1 },
  addrVat: { fontSize: 8, color: '#555', marginTop: 4 },

  infoBlock: { width: '40%' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  infoLabel: { fontSize: 8.5, color: '#555' },
  infoValue: { fontSize: 8.5 },
  infoValueBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1e3a8a' },

  // Titel
  invoiceTitle: {
    fontSize: 13, fontFamily: 'Helvetica-Bold',
    marginBottom: 16, color: '#1e3a8a',
  },

  // Tabelle
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#1e3a8a',
    paddingVertical: 5, paddingHorizontal: 8,
    color: '#fff', fontSize: 8.5, fontFamily: 'Helvetica-Bold',
    marginBottom: 0,
  },
  tableRow: {
    flexDirection: 'row', paddingVertical: 7,
    paddingHorizontal: 8, borderBottomWidth: 0.5,
    borderBottomColor: '#ddd', fontSize: 9,
  },
  colNr:    { width: '8%' },
  colDesc:  { width: '50%' },
  colQty:   { width: '10%', textAlign: 'right' },
  colPrice: { width: '16%', textAlign: 'right' },
  colVat:   { width: '8%', textAlign: 'right' },
  colTotal: { width: '18%', textAlign: 'right' },

  // Summen
  totalsBlock: {
    marginTop: 20, alignSelf: 'flex-end', width: '45%',
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 3, fontSize: 9,
  },
  totalRowBold: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 5, fontSize: 11,
    fontFamily: 'Helvetica-Bold', borderTopWidth: 1.5,
    borderTopColor: '#1e3a8a', marginTop: 4, color: '#1e3a8a',
  },
  totalLabel: { color: '#555' },

  // Hinweis
  paymentNote: { marginTop: 40, fontSize: 9, color: '#444' },

  // Footer
  footer: {
    position: 'absolute', bottom: 30, left: 50, right: 50,
    borderTopWidth: 0.5, borderTopColor: '#bbb',
    paddingTop: 6, fontSize: 7, color: '#777',
    flexDirection: 'row', justifyContent: 'space-between',
  },
})

// ── Types ──────────────────────────────────────────────────────────────────────

export type InvoiceData = {
  invoiceNr:        string
  invoiceDate:      string   // DD.MM.YYYY
  packageName:      string
  packageDesc:      string
  amountNetCents:   number
  amountVatCents:   number
  amountGrossCents: number
  billingType:      'company' | 'private'
  company?:         string
  vatId?:           string
  firstName?:       string
  lastName?:        string
  street:           string
  zip:              string
  city:             string
  country:          string
  email:            string
}

// ── Helper ─────────────────────────────────────────────────────────────────────

function fmt(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',') + ' EUR'
}

function recipientName(d: InvoiceData) {
  if (d.billingType === 'company') return d.company ?? ''
  return `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim()
}

// ── Component ──────────────────────────────────────────────────────────────────

export function InvoicePDF({ d }: { d: InvoiceData }) {
  const name = recipientName(d)

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* Header */}
        <View style={S.header}>
          <View>
            <Text style={S.companyLogo}>k &amp; n edv konzepte gmbh</Text>
            <Text style={S.tagline}>Management by Ratio</Text>
          </View>
          <Text style={S.headerRight}>Management by Ratio</Text>
        </View>

        {/* Absenderzeile */}
        <Text style={S.senderLine}>
          k&n EDV Konzepte GmbH · Flurweg 14 · D 83646 Bad Tölz
        </Text>

        {/* Adresse + Rechnungsinfo */}
        <View style={S.addrRow}>
          <View style={S.addrBlock}>
            <Text style={S.addrName}>{name}</Text>
            <Text style={S.addrLine}>{d.street}</Text>
            <Text style={S.addrLine}>{d.zip} {d.city}</Text>
            {d.country !== 'DE' && <Text style={S.addrLine}>{d.country}</Text>}
            {d.vatId && <Text style={S.addrVat}>UST-ID: {d.vatId}</Text>}
          </View>

          <View style={S.infoBlock}>
            <View style={S.infoRow}>
              <Text style={S.infoLabel}>Lieferdatum</Text>
              <Text style={S.infoValue}>{d.invoiceDate}</Text>
            </View>
            <View style={S.infoRow}>
              <Text style={S.infoLabel}>Datum</Text>
              <Text style={S.infoValue}>{d.invoiceDate}</Text>
            </View>
            <View style={S.infoRow}>
              <Text style={S.infoLabel}>Seite</Text>
              <Text style={S.infoValue}>1</Text>
            </View>
            <View style={S.infoRow}>
              <Text style={S.infoLabel}>Rechnung Nr.</Text>
              <Text style={S.infoValueBold}>{d.invoiceNr}</Text>
            </View>
          </View>
        </View>

        {/* Titel */}
        <Text style={S.invoiceTitle}>Rechnung {d.invoiceNr}</Text>

        {/* Tabelle Header */}
        <View style={S.tableHeader}>
          <Text style={S.colNr}>Nr.</Text>
          <Text style={S.colDesc}>Beschreibung</Text>
          <Text style={S.colQty}>Anzahl</Text>
          <Text style={S.colPrice}>Preis</Text>
          <Text style={S.colVat}>USt.</Text>
          <Text style={S.colTotal}>Gesamtpreis</Text>
        </View>

        {/* Tabelle Zeile */}
        <View style={S.tableRow}>
          <Text style={S.colNr}>1</Text>
          <View style={[S.colDesc, { flexDirection: 'column' }]}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{d.packageName}</Text>
            <Text style={{ color: '#555', fontSize: 8, marginTop: 2 }}>{d.packageDesc}</Text>
          </View>
          <Text style={S.colQty}>1</Text>
          <Text style={S.colPrice}>{fmt(d.amountNetCents)}</Text>
          <Text style={S.colVat}>19 %</Text>
          <Text style={S.colTotal}>{fmt(d.amountNetCents)}</Text>
        </View>

        {/* Summen */}
        <View style={S.totalsBlock}>
          <View style={S.totalRow}>
            <Text style={S.totalLabel}>Summe Netto:</Text>
            <Text>{fmt(d.amountNetCents)}</Text>
          </View>
          <View style={S.totalRow}>
            <Text style={S.totalLabel}>zzgl. 19 % USt.:</Text>
            <Text>{fmt(d.amountVatCents)}</Text>
          </View>
          <View style={S.totalRowBold}>
            <Text>Gesamtbetrag:</Text>
            <Text>{fmt(d.amountGrossCents)}</Text>
          </View>
        </View>

        {/* Zahlungshinweis */}
        <Text style={S.paymentNote}>
          Vielen Dank für Ihren Kauf. Die Zahlung wurde via Stripe verarbeitet.
        </Text>

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text>K &amp; N EDV-Konzepte GmbH · Flurweg 14 · D 83646 Bad Tölz</Text>
          <Text>Tel: +49 8041 44 05 149 · dkoetting@edvkonzepte.de</Text>
          <Text>IBAN: DE64700543060055119002 · USt-ID: DE812463437</Text>
        </View>

      </Page>
    </Document>
  )
}
