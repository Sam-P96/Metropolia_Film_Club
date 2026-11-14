// Each slice of the movie wheel's colour, by its place round the wheel, for
// the wheel (WheelSvg) and the list of films beside it (MovieWheel). Its own
// file, so the components' files only export components.
export const sliceColor = (i) => `hsl(${(i * 47) % 360} 55% ${i % 2 ? 42 : 34}%)`;
