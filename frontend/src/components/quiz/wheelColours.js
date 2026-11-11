// The top 5's colours on the Quiz Wheel and their chips on the Quiz
// Leaderboard, in this order: the data-viz reference palette's first five
// categorical hues, its dark-surface steps (checked together for
// colour-blind separation). Everyone past the top 5 is a quiet grey, each
// still their own slice.
const COLOURS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181']
const REST = 'rgba(255, 255, 255, 0.24)'

export const wheelColour = (rank) => COLOURS[rank] ?? REST
