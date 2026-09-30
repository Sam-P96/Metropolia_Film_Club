function AboutIntro() {
    return (
        <section className="text-white">
            <div className="mx-auto max-w-2xl px-8 py-24">
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
                        about watching with other people is that they drag you away and into
                        things you'd never have picked yourself.
                    </p>


                        <p className="text-lg leading-relaxed text-white/70">
                        The club is new, started in 2026 by a few students who really liked watching movies together.
                        Everyone is welcome, unless you're a prick.

                        </p>
                </div>
            </div>
        </section>
    )
}

export default AboutIntro