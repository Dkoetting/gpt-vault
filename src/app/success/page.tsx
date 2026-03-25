import styles from './page.module.css'
import { getGptVaultDownloadUrl } from '@/lib/gpt-vault-download'

const TEAMVIEWER_LINK  = process.env.TEAMVIEWER_LINK   ?? 'https://get.teamviewer.com/dirkkötting'
const BOOKING_URL      = 'https://terminbuchung-ten.vercel.app/?type=session&topic=GPT+Vault+Session'
const PHONE_NUMBER     = process.env.CONTACT_PHONE    ?? '+49 173 37 48 296'
const CONTACT_EMAIL    = 'dkoetting@edvkonzepte.de'

interface Props {
  searchParams: Promise<{ package?: string }>
}

export default async function GptVaultSuccessPage({ searchParams }: Props) {
  const params    = await searchParams
  const packageId = params.package ?? ''
  const isSession = packageId === 'session'
  const downloadUrl = getGptVaultDownloadUrl()

  return (
    <main className={styles.page}>
      <div className={styles.card}>

        <div className={styles.icon}>✅</div>
        <h1 className={styles.title}>Kauf erfolgreich!</h1>

        {isSession ? (
          /* ── TeamViewer Session ── */
          <>
            <p className={styles.sub}>
              Vielen Dank! Ich melde mich so schnell wie möglich bei dir.<br />
              Du erhältst außerdem eine Bestätigung per E-Mail.
            </p>

            <div className={styles.steps}>
              <h2 className={styles.stepsTitle}>So geht es weiter:</h2>

              <div className={styles.step}>
                <span className={styles.stepNum}>1</span>
                <div>
                  <strong>E-Mail prüfen</strong>
                  <p>Du erhältst gleich eine Bestätigung mit allen Details.</p>
                </div>
              </div>

              <div className={styles.step}>
                <span className={styles.stepNum}>2</span>
                <div>
                  <strong>TeamViewer bereithalten</strong>
                  <p>
                    Falls noch nicht installiert – hier herunterladen:
                  </p>
                  <a
                    href={TEAMVIEWER_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.downloadLink}
                  >
                    → TeamViewer herunterladen / starten
                  </a>
                </div>
              </div>

              <div className={styles.step}>
                <span className={styles.stepNum}>3</span>
                <div>
                  <strong>Termin buchen</strong>
                  <p>
                    Buche direkt einen Termin für die geführte Session – oder ich melde mich bei dir.
                  </p>
                  <a
                    href={BOOKING_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.downloadLink}
                  >
                    → Termin für TeamViewer-Session buchen
                  </a>
                  <p className={styles.contactLine}>
                    📞 <a href={`tel:${PHONE_NUMBER.replace(/\s/g, '')}`}>{PHONE_NUMBER}</a>
                    &nbsp;&nbsp;·&nbsp;&nbsp;
                    ✉️ <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ── GPT Vault Software ── */
          <>
            <p className={styles.sub}>
              Vielen Dank – dein Aktivierungs-Token ist unterwegs.
            </p>

            <div className={styles.steps}>
              <h2 className={styles.stepsTitle}>So geht es weiter:</h2>

              <div className={styles.step}>
                <span className={styles.stepNum}>1</span>
                <div>
                  <strong>E-Mail prüfen</strong>
                  <p>Du erhältst gleich eine E-Mail mit deinem Aktivierungs-Token.</p>
                </div>
              </div>

              <div className={styles.step}>
                <span className={styles.stepNum}>2</span>
                <div>
                  <strong>GPT Vault herunterladen</strong>
                  <p>Lade die aktuelle Version herunter und entpacke das ZIP auf deinem PC.</p>
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.downloadLink}
                  >
                    → GPT Vault herunterladen
                  </a>
                </div>
              </div>

              <div className={styles.step}>
                <span className={styles.stepNum}>3</span>
                <div>
                  <strong>Starten &amp; Token eingeben</strong>
                  <p>
                    Starte <code>start.bat</code> (Windows) oder <code>start.sh</code> (Mac),
                    gib deinen Token ein – fertig.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        <div className={styles.hint}>
          <p>Keine E-Mail erhalten? Spam-Ordner prüfen oder schreib uns:</p>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </div>

        <a href="/" className={styles.backLink}>← Zurück zur Übersicht</a>

      </div>
    </main>
  )
}
