const users = [
  {
    _id: 'u1',
    username: 'sam_p',
    memberTitle: 'Club Founder',
    bio: 'Mostly here for the arguments afterwards. Will defend Paddington 2 to anyone.',
    avatarUrl: null,
    reviewCardBanner: { type: 'color', value: '#821131' },
    privacy: 'public',
    joinedAt: '2026-09-01T12:00:00+03:00',
    favouriteFilms: [
      { tmdbId: 10494, title: 'Perfect Blue', posterPath: null },
      { tmdbId: 1091, title: 'The Thing', posterPath: null },
      { tmdbId: 666277, title: 'Past Lives', posterPath: null },
      { tmdbId: 346648, title: 'Paddington 2', posterPath: null },
    ],
  },
  {
    _id: 'u2',
    username: 'aino.watches',
    memberTitle: 'Member',
    bio: 'New to the club. Say hi.',
    avatarUrl: null,
    reviewCardBanner: { type: 'color', value: '#2D1B47' },
    privacy: 'public',
    joinedAt: '2026-09-14T12:00:00+03:00',
    favouriteFilms: [],
  },
  {
    _id: 'u3',
    username: 'kasper_frames',
    memberTitle: 'Event Organiser',
    bio: '',
    avatarUrl: null,
    reviewCardBanner: { type: 'image', value: '/banners/neon-city.gif' },
    privacy: 'private',
    joinedAt: '2026-09-05T12:00:00+03:00',
    favouriteFilms: [
      { tmdbId: 496243, title: 'Parasite', posterPath: null },
      { tmdbId: 1091, title: 'The Thing', posterPath: null },
    ],
  },
]

export default users