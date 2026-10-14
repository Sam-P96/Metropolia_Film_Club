import FilmCard from './FilmCard'

function FilmGrid({ films }) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
      {films.map((film) => (
        <FilmCard key={film.tmdbId} film={film} />
      ))}
    </div>
  )
}

export default FilmGrid