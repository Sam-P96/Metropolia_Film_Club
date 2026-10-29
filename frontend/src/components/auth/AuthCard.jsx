import backgroundImage from '../../assets/purple_sparkle_1.gif'

// The signup page's look, for the password reset pages: the sparkle GIF
// behind a dark glass card, a heading with its last words in gold
// (`accent`), and the short gold bar under it.
function AuthCard({ title, accent, children }) {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-8 py-24 text-white">
      <img
        src={backgroundImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-10 h-full w-full object-cover motion-reduce:hidden"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-ink/60 p-8 shadow-xl shadow-black/50 backdrop-blur-xl sm:p-10">
        <h2 className="text-3xl font-bold">
          {title} <span className="text-brand-gold">{accent}</span>
        </h2>

        <div className="mt-4 mb-8 h-1 w-10 rounded-full bg-brand-gold" />

        {children}
      </div>
    </section>
  )
}

export default AuthCard
