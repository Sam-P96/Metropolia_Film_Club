import { CardFace } from './cards'

const HAND = ['Ts', 'Js', 'Qs', 'Ks', 'As']
const ANGLE = 9 // degrees between one card and the next

// Kino Poker's picture: a royal flush fanned out. "md" is for the Games
// card, exactly as tall as the other games' pictures (40px) so the titles
// line up; "lg" is for the intro. The outer cards lean out past their own
// edges, so the fan is inset by that much: its leftmost corner lines up
// with everything else on the card instead of poking out to the left.
export default function PokerLogo({ size = 'md' }) {
  // A card's height is 1.4 widths, plus 0.17 for the dip: 40px in all on the Games card.
  const width = size === 'lg' ? 54 : 40 / 1.57
  const height = width * 1.4
  const spread = width * 0.4
  const lean = width * 0.5 // how far the outer cards' top corners reach out
  const drop = width * 0.17 // and how far their bottom corners dip
  return (
    <div className="relative shrink-0 self-start" style={{ width: spread * 4 + width + lean * 2, height: height + drop }} aria-hidden="true">
      {HAND.map((code, index) => (
        <div
          key={code}
          className="absolute rounded-[10%] shadow-[0_3px_8px_rgba(0,0,0,0.5)]"
          style={{
            width,
            height,
            left: lean + index * spread,
            bottom: drop,
            transform: `rotate(${(index - 2) * ANGLE}deg)`,
            transformOrigin: '50% 120%',
          }}
        >
          <CardFace code={code} width={width} />
        </div>
      ))}
    </div>
  )
}
