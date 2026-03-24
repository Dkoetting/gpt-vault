# GPT Vault – DE/EN Language Toggle Design
**Date:** 2026-03-16
**Status:** Approved

## Summary
Add DE/EN language toggle to the GPT Vault landing page (`/gpt-vault`). All page texts, inquiry form labels, and transactional emails switch between German and English. Language preference is persisted in `localStorage`.

## Decisions
- **Approach:** Translation Object in `page.tsx` (no i18n library)
- **Scope:** Landing page + all emails (notification + confirmation)
- **Persistence:** `localStorage` key `gpt-vault-lang`, default `de`
- **Toggle position:** Fixed/sticky top-right corner, always visible

## Architecture

### 1. `translations` Object (`page.tsx`)
```ts
const translations = {
  de: { heroTitle: '...', heroSubtitle: '...', ... },
  en: { heroTitle: '...', heroSubtitle: '...', ... },
}
type Lang = 'de' | 'en'
```
All static text on the page references `t.key` via `const t = translations[lang]`.

### 2. `useLang` State
```ts
const [lang, setLang] = useState<Lang>(() => {
  if (typeof window === 'undefined') return 'de'
  return (localStorage.getItem('gpt-vault-lang') as Lang) ?? 'de'
})
const toggleLang = (l: Lang) => {
  setLang(l)
  localStorage.setItem('gpt-vault-lang', l)
}
```

### 3. Language Toggle Button (sticky)
```tsx
<div className={styles.langToggle}>
  <button onClick={() => toggleLang('de')} className={lang === 'de' ? styles.active : ''}>🇩🇪 DE</button>
  <button onClick={() => toggleLang('en')} className={lang === 'en' ? styles.active : ''}>🇬🇧 EN</button>
</div>
```
CSS: `position: fixed; top: 1rem; right: 1rem; z-index: 999`

### 4. Inquiry Form – `lang` Field
The form sends `lang: 'de' | 'en'` in the POST body to `/api/gpt-vault/inquiry`.

### 5. Email Route (`inquiry/route.ts`)
```ts
const emailTexts = {
  de: { subject: '...', greeting: '...', body: '...' },
  en: { subject: '...', greeting: '...', body: '...' },
}
const txt = emailTexts[lang ?? 'de']
```
Both emails (admin notification + customer confirmation) use the chosen language texts.

## Files Changed
| File | Change |
|---|---|
| `src/app/gpt-vault/page.tsx` | Add `translations`, `useLang`, lang toggle button, replace all hardcoded strings |
| `src/app/gpt-vault/page.module.css` | Add `.langToggle`, `.active` styles |
| `src/app/api/gpt-vault/inquiry/route.ts` | Accept `lang` field, bilingual email texts |

## Text Scope (DE → EN)
- Hero section (title, subtitle, CTA buttons)
- Features section (title, 4 feature cards)
- Workflow gallery (section title, 10 step captions)
- Pricing/packages section (labels, CTA)
- FAQ section (questions + answers)
- About section (text, button label)
- Inquiry form (labels, placeholders, submit button, success/error messages)
- Footer (tagline, links)
- Email: subject, greeting, body paragraphs, signature

## Success Criteria
- Toggle switches all visible text instantly (no page reload)
- `localStorage` persists choice across sessions
- Emails arrive in the language the user selected
- No layout breaks in either language
