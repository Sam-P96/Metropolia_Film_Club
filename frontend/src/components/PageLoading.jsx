// What shows while a page's file loads the first time it's opened (App.jsx
// loads every page but Home that way): a small gold spinner in the middle,
// a screen tall so the footer doesn't jump up in the meantime.
function PageLoading() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-screen items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-brand-gold motion-reduce:animate-none" />
    </div>
  )
}

export default PageLoading
