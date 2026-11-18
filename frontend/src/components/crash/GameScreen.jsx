import { CRASH_BACKDROP, CrashTitle } from './CrashChrome'
import * as crashSound from './feedback'
import { FrameBackdrop } from '../GameBackdrop'
import SoundToggle from '../SoundToggle'
import useGameFrame from '../../hooks/useGameFrame'

// Box Office Crash's game screen, filling what's under the nav bar without
// scrolling, on a phone too: a header (`back`, the title, `status`,
// `extras`, and the sound button), an optional `notice`, the `stage`
// (CrashStage.jsx) taking all the room it can, and under it the panel
// (`children`). A room (pages/Crash.jsx RoomScreen) and the dev climb
// simulator (DevClimb.jsx) both use it, so they're always the same shape.
export default function GameScreen({ back, status, extras, notice, stage, children }) {
  const frame = useGameFrame()
  return (
    <>
      <FrameBackdrop top={frame.top} to={CRASH_BACKDROP} className="z-39" />
      {/* Fits the screen when it can; on a short phone it scrolls, from a
          finger anywhere on it, the chart included. */}
      <div className="fixed inset-x-0 z-40 flex flex-col overflow-y-auto overscroll-contain bg-[#04140F]" style={{ top: frame.top, height: frame.height }}>
        <header className="relative z-10 flex shrink-0 items-center gap-2 px-3 py-1.5">
          {back}
          <h1 className="hidden font-['Bebas_Neue'] text-2xl leading-none tracking-wide text-white sm:block">
            <CrashTitle />
          </h1>
          <p className="min-w-0 flex-1 truncate text-center text-xs text-white/70 sm:text-sm">{status}</p>
          {extras}
          <SoundToggle sound={crashSound} className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs text-white/80 transition-colors hover:bg-white/10 sm:text-sm" />
        </header>
        {notice && <div className="shrink-0 px-3 pb-1">{notice}</div>}
        <div className="min-h-48 flex-1 px-2 sm:px-4">{stage}</div>
        <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-2 px-3 pt-2 pb-3">{children}</div>
      </div>
    </>
  )
}
