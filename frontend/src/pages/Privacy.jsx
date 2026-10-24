// User-facing privacy notice. When the text here changes, bump
// PRIVACY_POLICY_VERSION in backend/controllers/userControllers.js.
const LAST_UPDATED = '23 October 2026'

function Privacy() {
  const h2 = 'mt-10 mb-3 text-sm font-semibold tracking-widest text-brand-gold uppercase'
  const p = 'leading-relaxed text-white/70'
  const li = 'leading-relaxed text-white/70'

  return (
    <section className="text-white">
      <div className="mx-auto max-w-3xl px-8 py-20">

        <h1 className="text-3xl font-bold">Privacy policy</h1>
        <p className="mt-2 text-sm text-white/40">Last updated {LAST_UPDATED}</p>

        <p className={`mt-6 ${p}`}>
          Metropolia Film Club ("we") runs this site for members of the club. This
          page explains what personal data we hold, why, and the choices you have.
        </p>

        <h2 className={h2}>What we collect</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li className={li}>Your email address and username, so you can log in and other members can find you.</li>
          <li className={li}>Your password, stored only as a secure hash. We never see it.</li>
          <li className={li}>Profile details you choose to add: bio, avatar, member title, favourite films, review card style, and your privacy setting.</li>
          <li className={li}>Your activity in the club: the films you log, your ratings, the reviews you write, and the reviews you like.</li>
        </ul>

        <h2 className={h2}>Why we hold it</h2>
        <p className={p}>
          We use this data only to run the club site: to sign you in, show your
          profile and reviews to other members according to your privacy setting,
          and keep film lists and leaderboards. We do not sell it or use it for
          advertising.
        </p>

        <h2 className={h2}>Who it is shared with</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li className={li}>Film details come from The Movie Database (TMDB). We send film searches to TMDB but never your personal data.</li>
          <li className={li}>The "add to calendar" links open Google Calendar with the event details. That happens only if you click one.</li>
          <li className={li}>Other members can see your profile and reviews based on your privacy setting.</li>
        </ul>

        <h2 className={h2}>Your rights</h2>
        <p className={p}>
          Under the GDPR you can see, export, and delete your data at any time:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li className={li}>Download a copy of everything we hold from your profile page ("Export my data").</li>
          <li className={li}>Delete your account and all of your reviews and film logs from your profile page. This cannot be undone.</li>
          <li className={li}>Change your profile and privacy setting at any time while editing your profile.</li>
        </ul>

        <h2 className={h2}>How long we keep it</h2>
        <p className={p}>
          We keep your data for as long as your account exists. When you delete
          your account, your profile, reviews, and film logs are removed, and your
          likes are taken off other members' reviews.
        </p>

        <h2 className={h2}>Contact</h2>
        <p className={p}>
          For any question about your data, reach the club committee through the
          channels on our home page.
        </p>

      </div>
    </section>
  )
}

export default Privacy
