import ReviewCard from './ReviewCard'

function ReviewMarquee({ reviews }) {
  const looped = [...reviews, ...reviews]

  return (
    <div className="overflow-hidden py-14">
      <div className="flex w-max animate-[marquee-left_180s_linear_infinite] has-[.review-slide:hover]:[animation-play-state:paused] motion-reduce:animate-none">
        {looped.map((review, index) => (
          <div key={`${review._id}-${index}`} className="shrink-0 pr-6">
            <div className="review-slide relative w-120 transition-transform duration-300 ease-out hover:z-10 hover:scale-130">
              <ReviewCard review={review} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ReviewMarquee