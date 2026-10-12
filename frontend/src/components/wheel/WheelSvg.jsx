const SIZE = 400;
const C = SIZE / 2;
const R = C - 8;

// angle is degrees clockwise from the top, where the pointer sits
const point = (angle, radius = R) => {
  const rad = (angle * Math.PI) / 180;
  return [C + radius * Math.sin(rad), C - radius * Math.cos(rad)];
};

const slicePath = (i, seg) => {
  const [x1, y1] = point(i * seg);
  const [x2, y2] = point((i + 1) * seg);
  return `M${C},${C} L${x1},${y1} A${R},${R} 0 ${seg > 180 ? 1 : 0} 1 ${x2},${y2} Z`;
};

export const sliceColor = (i) => `hsl(${(i * 47) % 360} 55% ${i % 2 ? 42 : 34}%)`;
const clip = (s, n = 16) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export default function WheelSvg({ items, rotation, spinning, spinMs = 5500 }) {
  const seg = 360 / items.length;

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1" aria-hidden="true">
        <div className="h-0 w-0 border-x-14 border-t-26 border-x-transparent border-t-amber-300 drop-shadow" />
      </div>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Wheel with ${items.length} items`}
        className="w-full"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning
            ? `transform ${spinMs}ms cubic-bezier(0.12, 0.6, 0.1, 1)`
            : "none",
        }}
      >
        {items.length === 1 ? (
          <circle cx={C} cy={C} r={R} fill={sliceColor(0)} />
        ) : (
          items.map((item, i) => (
            <path key={item.id} d={slicePath(i, seg)} fill={sliceColor(i)} stroke="#0a0a0a" strokeWidth="2" />
          ))
        )}

        {items.map((item, i) => {
          const mid = items.length === 1 ? 0 : (i + 0.5) * seg;
          const [tx, ty] = point(mid, R - 14);
          return (
            <text
              key={item.id}
              x={tx}
              y={ty}
              fill="white"
              fontSize={items.length > 14 ? 10 : 13}
              fontWeight="600"
              textAnchor="end"
              dominantBaseline="middle"
              transform={`rotate(${mid - 90} ${tx} ${ty})`}
            >
              {clip(item.title)}
            </text>
          );
        })}

        <circle cx={C} cy={C} r="18" fill="#0a0a0a" stroke="#fcd34d" strokeWidth="3" />
      </svg>
    </div>
  );
}