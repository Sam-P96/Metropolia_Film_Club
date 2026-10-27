import { useRef } from "react";
import { Link } from "react-router-dom";
import ReviewCard from "./ReviewCard";
import ReviewMarquee from "./ReviewMarquee";
import MarqueeArrows from "./MarqueeArrows";
import PillToggle from "../PillToggle";

const SORTS = [
  { value: "recent", label: "Recent" },
  { value: "top", label: "Top" },
  { value: "controversial", label: "Controversial" },
];

// Pass sort and onSortChange to show a Recent / Top / Controversial toggle
// beside the title.
function ReviewSection({
  title,
  reviews,
  layout = "grid",
  backgroundUrl,
  linkTo,
  linkText = "See all reviews",
  emptyMessage = "No reviews here.",
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

          {onSortChange && (
            <PillToggle options={SORTS} value={sort} onChange={onSortChange} label="Sort reviews" />
          )}
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

export default ReviewSection;
