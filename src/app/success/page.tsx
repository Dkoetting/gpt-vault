import styles from './page.module.css'
import { getGptVaultDownloadUrl } from '@/lib/gpt-vault-download'
import { getGptVaultProjectDownloadUrl } from '@/lib/gpt-vault-project-download'

const TEAMVIEWER_LINK = process.env.TEAMVIEWER_LINK ?? 'https://get.teamviewer.com/dirkkoetting'
const BOOKING_URL = 'https://terminbuchung-ten.vercel.app/?type=session&topic=GPT+Vault+Session'
const PHONE_NUMBER = process.env.CONTACT_PHONE ?? '+49 173 37 48 296'
const CONTACT_EMAIL = 'dkoetting@edvkonzepte.de'

interface Props {
  searchParams: Promise<{ package?: string }>
}

export default async function GptVaultSuccessPage({ searchParams }: Props) {
  const params = await searchParams
  const packageId = params.package ?? ''
  const isSession = packageId === 'session'
  const isProjects = packageId === 'projects'
  const downloadUrl = isProjects ? getGptVaultProjectDownloadUrl() : getGptVaultDownloadUrl()
  const productLabel = isProjects ? 'GPT Vault Projects' : 'GPT Vault'

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>OK</div>
        <h1 className={styles.title}>Kauf erfolgreich!</h1>

        {isSession ? (
          <>
            <p className={styles.sub}>
              Vielen Dank! Ich melde mich so schnell wie moeglich bei dir.
              <br />
              Du erhaeltst ausserdem eine Bestaetigung per E-Mail.
            </p>

            <div className={styles.steps}>
              <h2 className={styles.stepsTitle}>So geht es weiter:</h2>

              <div className={styles.step}>
                <span className={styles.stepNum}>1</span>
                <div>
                  <strong>E-Mail pruefen</strong>
                  <p>Du erhaeltst gleich eine Bestaetigung mit allen Details.</p>
                </div>
              </div>

              <div className={styles.step}>
                <span className={styles.stepNum}>2</span>
                <div>
                  <strong>TeamViewer bereithalten</strong>
                  <p>Falls noch nicht installiert - hier herunterladen:</p>
                  <a
                    href={TEAMVIEWER_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.downloadLink}
                  >
                    -&gt; TeamViewer herunterladen / starten
                  </a>
                </div>
              </div>

              <div className={styles.step}>
                <span className={styles.stepNum}>3</span>
                <div>
                  <strong>Termin buchen</strong>
                  <p>Buche direkt einen Termin fuer die gefuehrte Session - oder ich melde mich bei dir.</p>
                  <a
                    href={BOOKING_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.downloadLink}
                  >
                    -&gt; Termin fuer TeamViewer-Session buchen
                  </a>
                  <p className={styles.contactLine}>
                    <a href={`tel:${PHONE_NUMBER.replace(/\s/g, '')}`}>{PHONE_NUMBER}</a>
                    {'  '}·{'  '}
                    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className={styles.sub}>Vielen Dank - dein Aktivierungs-Token ist unterwegs.</p>

            <div className={styles.steps}>
              <h2 className={styles.stepsTitle}>So geht es weiter:</h2>

              <div className={styles.step}>
                <span className={styles.stepNum}>1</span>
                <div>
                  <strong>E-Mail pruefen</strong>
                  <p>Du erhaeltst gleich eine E-Mail mit deinem Aktivierungs-Token.</p>
                </div>
              </div>

              <div className={styles.step}>
                <span className={styles.stepNum}>2</span>
                <div>
                  <strong>{productLabel} herunterladen</strong>
                  <p>Lade die aktuelle Version herunter und entpacke das ZIP auf deinem PC.</p>
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.downloadLink}
                  >
                    {isProjects ? '-> GPT Vault Projects herunterladen' : '-> GPT Vault herunterladen'}
                  </a>
                </div>
              </div>

              <div className={styles.step}>
                <span className={styles.stepNum}>3</span>
                <div>
                  <strong>Starten und Token eingeben</strong>
                  <p>
                    Starte <code>start.bat</code> (Windows) oder <code>start.sh</code> (Mac/Linux),
                    gib deinen Token ein - fertig.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        <div className={styles.hint}>
          <p>Keine E-Mail erhalten? Spam-Ordner pruefen oder schreib uns:</p>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </div>

        <a href="/" className={styles.backLink}>
          &lt;- Zurueck zur Uebersicht
        </a>
      </div>
    </main>
  )
}
