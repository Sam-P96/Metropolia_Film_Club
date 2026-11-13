import '@fontsource/bebas-neue'
import { Link } from 'react-router-dom'

import useApi from '../hooks/useApi'
import { getUser } from '../services/users'
import { getCurrentUserId } from '../utils/currentUser'
import { SECRET_PAGES, isSecretKeeper } from '../utils/secretPages'

const SECTIONS = [
  { key: 'admin', title: 'Admin Required', pages: SECRET_PAGES.filter((page) => page.adminOnly) },
  { key: 'regular', title: 'Regular SECRET', pages: SECRET_PAGES.filter((page) => !page.adminOnly) },
]

function PageLink({ page }) {
  return (
    <li>
      <Link
        to={page.path}
        className="group flex h-full flex-col gap-1 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-brand-gold/60 hover:bg-white/10"
      >
        <span className="font-semibold text-white transition-colors group-hover:text-brand-gold">{page.name}</span>
        <span className="font-mono text-xs text-brand-gold/80">{page.path}</span>
        <span className="text-sm text-white/60">{page.about}</span>
        <span className="mt-auto pt-1 text-xs text-white/40">{page.who}</span>
      </Link>
    </li>
  )
}

// /SECRET: every SECRET page, for admins (whatever their name). The admin
// panel (/admin) lists them too. Who's looking is checked
// against their profile from the server, not the stored login. Anyone else
// sees nothing here. Not linked from anywhere else.
export default function SecretIndex() {
  const me = useApi(() => getUser(getCurrentUserId()), [])

  if (me.loading) return <section className="px-8 py-24 text-center text-white/50">Loading…</section>

  if (!isSecretKeeper(me.data)) {
    return <section className="mx-auto w-full max-w-3xl px-4 py-12 text-white/70">Nothing here.</section>
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 text-white sm:py-12">
      <h1 className="font-['Bebas_Neue'] text-5xl leading-none tracking-wide">
        SECRET <span className="text-brand-gold">pages</span>
      </h1>
      <p className="mt-2 text-white/60">Every page that isn&apos;t linked from anywhere else.</p>

      {SECTIONS.map((section) => (
        <div key={section.key} className="mt-8">
          <h2 className="text-xs font-semibold tracking-widest text-white/50 uppercase">{section.title}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {section.pages.map((page) => (
              <PageLink key={page.path} page={page} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
