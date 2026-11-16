// Box Office Scratch's Double Prize Weekend, on its page while it's on
// (shared/events.js): a rainbow frame round a dark sign. The jackpots
// aren't doubled.
export default function DoublePrizeBanner() {
  return (
    <section aria-label="Double Prize Weekend" className="rainbow-frame rounded-2xl p-[2px]">
      <div className="flex flex-col gap-1 rounded-[calc(1rem-2px)] bg-ink/90 px-5 py-4 sm:flex-row sm:items-center sm:gap-5">
        <p className="rainbow-text shrink-0 font-['Bebas_Neue'] text-4xl leading-none tracking-wide sm:whitespace-nowrap">Double Prize Weekend</p>
        <p className="text-sm text-white/80">
          Every prize is <strong className="text-white">doubled</strong> on cards bought this weekend, until Sunday at midnight. The jackpots stay as
          they are.
        </p>
      </div>
    </section>
  )
}
