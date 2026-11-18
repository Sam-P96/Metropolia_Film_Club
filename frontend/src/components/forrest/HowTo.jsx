import { SETS, TIERS, TIER_COLORS } from '../../../../shared/forrest/rules.js'

const FRUIT = SETS[0].fruit

// How to play, in four lines: on the game's menu (sized to the stage) and in
// the How to Play box on the start page.
export function HowToText({ className = '' }) {
  return (
    <div className={`text-left text-[#d6efd0] ${className}`}>
      <p>
        👆 <b>Tap, click or Space:</b> the buddy on the branch drops onto the seesaw and launches the other up to the far tree.
      </p>
      <p>
        🤸 <b>Tap again mid-air</b> for a flipping double jump. You still land in the same spot.
      </p>
      <p>🍎 Time your jumps so the arcs pass through fruit. The higher it floats, the more it&apos;s worth.</p>
      <p>
        ✴️ Shurikens fly straight across and hit anyone. <b>One hit ends the run</b>, unless you&apos;re holding a 💖: now and then a glowing heart flies by
        instead (hold up to 3). Watch for the red <b>!</b>.
      </p>
    </div>
  )
}

// The fruit and what each is worth, in their colours.
export function FruitLegend({ className = '' }) {
  return (
    <div className={`flex flex-wrap justify-center ${className}`}>
      {FRUIT.map((emoji, i) => (
        <span key={emoji} style={{ color: TIER_COLORS[i] }}>
          {emoji} ×{TIERS[i].m}
        </span>
      ))}
    </div>
  )
}
