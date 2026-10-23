import { useRef } from "react";
import { Link } from "react-router-dom";
import ReviewCard from "./ReviewCard";
import ReviewMarquee from "./ReviewMarquee";
import MarqueeArrows from "./MarqueeArrows";

const SORTS = [
  { value: "recent", label: "Recent" },
  { value: "top", label: "Top" },
];

// Pass sort and onSortChange to show a Recent / Top toggle beside the title.
function ReviewSection({
  title,
  reviews,
  layout = "grid",
  backgroundUrl,
  linkTo,
  linkText = "See all reviews",
  emptyMessage = "No reviews yet. Be the first to write one.",
  sort,
  onSortChange,
}) {
  const marqueeRef = useRef(null);
  const showMarquee = reviews.length > 0 && layout === "marquee";

  return (
    <section className="relative border-t border-white/10 py-20 text-white">
      {backgroundUrl && (
        <img
          src={backgroundUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
        />
      )}

      <div className="absolute inset-0 bg-linear-to-b from-ink/90 via-ink/40 to-ink/90" />

      <div className="relative">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-8">
          <h2 className="text-sm font-semibold tracking-widest text-brand-gold uppercase">
            {title}
          </h2>

          {onSortChange && <SortToggle sort={sort} onChange={onSortChange} />}
        </div>

        {reviews.length === 0 && (
          <div className="mx-auto max-w-6xl px-8 pt-8">
            <p className="text-white/60">{emptyMessage}</p>
          </div>
        )}

        {showMarquee && <ReviewMarquee ref={marqueeRef} reviews={reviews} />}

        {reviews.length > 0 && layout === "grid" && (
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-8 pt-8 lg:grid-cols-2">
            {reviews.map((review) => (
              <ReviewCard key={review._id} review={review} />
            ))}
          </div>
        )}

        {(showMarquee || linkTo) && (
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-8 pt-6">
            {showMarquee && (
              <MarqueeArrows
                onJump={(direction) => marqueeRef.current?.jump(direction)}
                onHold={(direction) => marqueeRef.current?.hold(direction)}
              />
            )}

            {linkTo && (
              <Link
                to={linkTo}
                className="ml-auto font-medium text-brand-gold transition-colors hover:text-white"
              >
                {linkText}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// A small dark glass pill: "Recent | Top".
function SortToggle({ sort, onChange }) {
  return (
    <div
      role="group"
      aria-label="Sort reviews"
      className="flex rounded-full border border-white/15 bg-ink/60 p-0.5 backdrop-blur-md"
    >
      {SORTS.map((option) => {
        const active = sort === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold ${
              active ? "bg-brand-gold text-ink" : "text-white/60 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default ReviewSection;
