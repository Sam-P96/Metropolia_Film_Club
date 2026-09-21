import { Link } from "react-router-dom";
import useInView from "../../hooks/useInView";

const points = [
  {
    title: "Open to everyone",
    text: "Metropolia students and anyone else who loves film. No expertise needed, and film snobbery and elitism is frowned upon.",
  },
  {
    title: "Free to join",
    text: "Membership costs nothing. When we go to a theater screening, you just buy your own ticket.",
  },
  {
    title: "Stay in the loop",
    text: "Create an account to follow club events, show other members your favourite films, and share your reviews. Or join our Discord to chat with everyone between meetups.",
  },
];

function AboutClub() {
  const isLoggedIn = false; // Modify this later for login thingies
  const [sectionRef, cardsVisible] = useInView(0.6);

  const primaryButton =
    "rounded-md bg-brand-red px-6 py-3 font-medium text-white transition-colors hover:bg-brand-orange";

  const secondaryButton =
    "rounded-md border border-white/20 bg-white/5 px-6 py-3 font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10";

  return (
    <section
      ref={sectionRef}
      className="border-t border-white/10 bg-linear-to-b from-ink/90 via-ink/60 to-ink/20 text-white backdrop-blur-xl"
    >
      <div className="mx-auto max-w-6xl px-8 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mb-3 text-sm font-semibold tracking-widest text-brand-gold uppercase">
            About the Club
          </h2>
          <p className="text-lg leading-relaxed text-white/70">
            Metropolia Film Club is a place to talk movies, meet people, and
            find someone to watch the next one with. We go to screenings
            together, head to a café afterwards to discuss what we saw, and run
            movie-themed game nights and other get-togethers.
          </p>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {points.map((point, index) => (
            <div
              key={point.title}
              style={{ transitionDelay: `${index * 300}ms` }}
              className={`rounded-xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/30 backdrop-blur-sm transition-all duration-2200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${
                cardsVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              }`}
            >
              <div className="mb-4 h-1 w-10 rounded-full bg-brand-gold" />
              <h3 className="mb-2 text-lg font-semibold">{point.title}</h3>
              <p className="text-sm leading-relaxed text-white/60">
                {point.text}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          {isLoggedIn ? (
            <Link to="/account" className={primaryButton}>
              View your profile
            </Link>
          ) : (
            <Link to="/signup" className={primaryButton}>
              Create an account
            </Link>
          )}

          <a
            href="https://discord.com/"
            target="_blank"
            rel="noopener noreferrer"
            className={secondaryButton}
          >
            Join our Discord
          </a>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/about"
            className="text-sm font-medium text-brand-gold transition-colors hover:text-white"
          >
            Read more about us
          </Link>
        </div>
      </div>
    </section>
  );
}

export default AboutClub;
