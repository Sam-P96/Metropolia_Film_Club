// The top 5's colours on the Quiz Wheel and their chips on the Quiz
// Leaderboard, in this order: the data-viz reference palette's first five
// categorical hues, its light-surface steps (checked together for
// colour-blind separation), since both sit in the leaderboard's white box.
// Everyone past the top 5 is a quiet grey, each still their own slice.
const COLOURS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4']
const REST = '#d4d2dc'

export const wheelColour = (rank) => COLOURS[rank] ?? REST
