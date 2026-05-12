import type { Action, GameContext, GameTemplate } from './types'

// Canonical PD payoffs: T > R > P > S
const T = 5
const R = 3
const P = 1
const S = 0

function payoffForPair(a: Action, b: Action): [number, number] {
  if (a === 'C' && b === 'C') return [R, R]
  if (a === 'C' && b === 'D') return [S, T]
  if (a === 'D' && b === 'C') return [T, S]
  return [P, P]
}

export const repeatedPD: GameTemplate = {
  id: 'repeated_pd',
  label: "Repeated Prisoner's Dilemma",
  computePayoffs(_ctx: GameContext, actions: Action[]): number[] {
    if (actions.length !== 2) {
      throw new Error('This PD template currently assumes exactly 2 agents')
    }
    const [a0, a1] = actions
    const [p0, p1] = payoffForPair(a0, a1)
    return [p0, p1]
  },
}
