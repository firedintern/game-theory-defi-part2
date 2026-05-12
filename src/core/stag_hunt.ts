import type { Action, GameContext, GameTemplate } from './types'

// Stag Hunt payoffs: coordinate (C,C) for big reward; defect alone (D) for safe small reward
// (C,C) = 4,4  (C,D) = 0,3  (D,C) = 3,0  (D,D) = 3,3
function payoffForPair(a: Action, b: Action): [number, number] {
  if (a === 'C' && b === 'C') return [4, 4]
  if (a === 'C' && b === 'D') return [0, 3]
  if (a === 'D' && b === 'C') return [3, 0]
  return [3, 3]
}

export const stagHunt: GameTemplate = {
  id: 'stag_hunt',
  label: 'Stag Hunt',
  computePayoffs(_ctx: GameContext, actions: Action[]): number[] {
    if (actions.length !== 2) throw new Error('Stag Hunt requires exactly 2 agents')
    const [a0, a1] = actions
    const [p0, p1] = payoffForPair(a0, a1)
    return [p0, p1]
  },
}
