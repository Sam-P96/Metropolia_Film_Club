// Every picture in assets/SECRETpfp, found when the site is built, so adding
// one to the folder adds a card. Nothing links here: it's only at /SECRETpfp.
const IMAGES = import.meta.glob('../assets/SECRETpfp/*.{png,jpg,jpeg,gif,webp}', {
  eager: true,
  import: 'default',
})

// { name, src } for each, A to Z. The name is the file name without its
// extension.
const PICTURES = Object.entries(IMAGES)
  .map(([path, src]) => ({ name: path.split('/').pop().replace(/\.[^.]+$/, ''), src }))
  .sort((a, b) => a.name.localeCompare(b.name))

// A card with a review card's look and proportions, but standing upright
// (5 wide to 7 tall): the picture in a circle, and its name along the bottom.
function PictureCard({ name, src }) {
  return (
    <article className="flex aspect-5/7 w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-plum/40 text-white shadow-xl shadow-black/40 backdrop-blur-md">
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <img
          src={src}
          alt={name}
          className="aspect-square w-full rounded-full bg-white object-cover shadow-xl shadow-black/40 ring-4 ring-white/20"
        />
      </div>

      <div className="border-t border-white/10 bg-ink/40 px-5 py-4 text-center">
        <p className="truncate font-semibold">{name}</p>
      </div>
    </article>
  )
}

function SecretPfp() {
  return (
    <section className="text-white">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <h1 className="sr-only">Secret profile pictures</h1>

        {/* One a row on phones, two on tablets, three from 1024px up. */}
        <div className="grid grid-cols-1 justify-items-center gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {PICTURES.map((picture) => (
            <PictureCard key={picture.name} {...picture} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default SecretPfp
