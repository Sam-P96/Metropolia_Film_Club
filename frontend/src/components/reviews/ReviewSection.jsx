import { Link } from "react-router-dom";
import ReviewCard from "./ReviewCard";
import ReviewMarquee from "./ReviewMarquee";

function ReviewSection({
  title,
  reviews,
  layout = "grid",
  backgroundUrl,
  linkTo,
  linkText = "See all reviews",
  emptyMessage = "No reviews yet. Be the first to write one.",
}) {
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
        <div className="mx-auto max-w-6xl px-8">
          <h2 className="text-sm font-semibold tracking-widest text-brand-gold uppercase">
            {title}
          </h2>
        </div>

        {reviews.length === 0 && (
          <div className="mx-auto max-w-6xl px-8 pt-8">
            <p className="text-white/60">{emptyMessage}</p>
          </div>
        )}

        {reviews.length > 0 && layout === "marquee" && (
          <ReviewMarquee reviews={reviews} />
        )}

        {reviews.length > 0 && layout === "grid" && (
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-8 pt-8 lg:grid-cols-2">
            {reviews.map((review) => (
              <ReviewCard key={review._id} review={review} />
            ))}
          </div>
        )}

        {linkTo && (
          <div className="mx-auto flex max-w-6xl justify-end px-8 pt-6">
            <Link
              to={linkTo}
              className="font-medium text-brand-gold transition-colors hover:text-white"
            >
              {linkText}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export default ReviewSection;
