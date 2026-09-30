import aboutImage from '../../assets/purple_sparkle_1.gif'

function AboutIntro() {
  return (
    <section className="relative overflow-hidden">
      <img
        src={aboutImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
      />

      <div className="absolute inset-0 bg-ink/50" />

      <div className="relative mx-auto max-w-6xl px-8 py-28">
        <div className="rounded-lg border border-white/10 bg-ink/60 p-10 text-white shadow-xl shadow-black/50 backdrop-blur-md sm:p-14">

          <h1 className="text-5xl font-bold">
            About <span className="text-brand-gold">Us</span>
          </h1>

          <div className="mt-5 mb-10 h-1 w-10 rounded-full bg-brand-gold" />

          <div className="space-y-6">
            <p className="text-xl leading-relaxed text-white/80">
              Metropolia Film Club is a student-run club for people who like watching
              films and talking about them afterwards. We meet a few times a month,
              go to screenings together, and hang around long enough to argue about
              what we just saw.
            </p>

            <p className="text-lg leading-relaxed text-white/70">
              Watching alone, it's easy to stay inside your own bubble. The best thing
              about watching with other people is that they drag you out of your comfort zone, and into
              things you'd never have watched yourself.
            </p>

            <p className="text-lg leading-relaxed text-white/70">
              The club is new, started in 2026 by a few students who really liked
              watching movies together. <br />Everyone is welcome, unless you're a prick.
            </p>
          </div>

        </div>
      </div>
    </section>
  )
}

export default AboutIntro