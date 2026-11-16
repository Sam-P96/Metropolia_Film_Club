import { cosmeticById } from '../../../../shared/cosmetics/catalogue.js'

// The Black Friday Sale on the Black Market page, while it's on (the server
// says: backend/utils/blackMarket.js shopView). White on black, like a
// shop window's sale sign.
export default function BlackFridayBanner({ sale }) {
  const excluded = sale.excluded.map((id) => cosmeticById(id)).filter(Boolean)
  const names = excluded.map((item) => `the ${item.name} ${item.type === 'name' ? 'name style' : 'border'}`)

  return (
    <section
      aria-label="Black Friday Sale"
      className="flex flex-col gap-1 rounded-2xl border-2 border-white bg-black px-5 py-4 text-white shadow-[0_0_24px_rgb(255_255_255/0.25)] sm:flex-row sm:items-center sm:gap-5"
    >
      <p className="font-['Bebas_Neue'] text-4xl leading-none tracking-wide">
        Black Friday <span className="rounded bg-white px-1.5 text-black">Sale</span>
      </p>
      <p className="text-sm text-white/80">
        <strong className="text-white">{sale.discount}% off</strong> everything{names.length ? ` except ${names.join(' and ')}` : ''}, until
        Sunday at midnight.
      </p>
    </section>
  )
}
