// Double or Nothing's picture on the Games page: the member's standing, in
// big letters, as tall as the other games' pictures (the Box Office Scratch
// strip). Each looks different in more than colour: AVAILABLE is a solid
// filled box, in dark emerald that glows a little, IN QUEUE a dashed
// outline, BANNED an outline with diagonal stripes and the word struck
// through.
const LOOKS = {
  AVAILABLE:
    'border-emerald-700 bg-emerald-950/80 text-emerald-600 shadow-[0_0_12px_rgb(5_150_105/0.35)] [text-shadow:0_0_8px_rgb(16_185_129/0.55)]',
  'IN QUEUE': 'border-dashed border-brand-gold bg-transparent text-brand-gold',
  BANNED:
    'border-brand-red bg-[repeating-linear-gradient(135deg,rgb(199_37_62/0.28)_0_8px,transparent_8px_16px)] text-red-200 line-through decoration-2',
}

// `status` is null while it loads.
export default function StatusBadge({ status }) {
  return (
    <div
      className={`flex h-10 items-center rounded-lg border-2 px-3 font-['Bebas_Neue'] text-2xl leading-none tracking-widest ${
        status ? LOOKS[status] : 'w-32 animate-pulse justify-center border-white/15 text-white/30'
      }`}
    >
      {status ?? '…'}
    </div>
  )
}
