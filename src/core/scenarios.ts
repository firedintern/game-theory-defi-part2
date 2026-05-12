import type { Action, GameContext, ScenarioTemplate } from './types'

export const noScenario: ScenarioTemplate = {
  id: 'none',
  label: 'Standard (no scenario)',
  description: 'Plain repeated game with fixed payoffs.',
  gameId: 'repeated_pd',
  initState: () => ({}),
  updateState: (_ctx, _actions) => ({}),
  payoffModifier: (_ctx, payoffs) => payoffs,
}

// Depeg panic: panic rises each round; defecting becomes more tempting as panic grows
export const depegPanic: ScenarioTemplate = {
  id: 'depeg_panic',
  label: 'Stablecoin Depeg Panic',
  description: 'Panic rises each round. Defecting (redeeming early) yields a growing bonus while the peg holds, but if both defect the peg breaks and everyone loses.',
  gameId: 'repeated_pd',
  initState: () => ({ panic: 0 }),
  updateState(ctx, actions) {
    const bothDefected = actions[0] === 'D' && actions[1] === 'D'
    const prevPanic = Number(ctx.scenarioState.panic ?? 0)
    return { panic: Math.min(1, prevPanic + (bothDefected ? 0.15 : 0.05)) }
  },
  payoffModifier(ctx, payoffs) {
    const panic = Number(ctx.scenarioState.panic ?? 0)
    // Defectors get a bonus proportional to panic (front-running reward)
    // But if panic > 0.7 the system collapses: everyone takes a penalty
    const collapse = panic > 0.7
    return payoffs.map((p, i) => {
      if (collapse) return Math.max(0, p - 2)
      return p + (panic * 1.5)
    })
  },
}

// Yield war: LPs compete; defecting (exiting pool) triggers a fee spike that hurts the stayer
export const yieldWar: ScenarioTemplate = {
  id: 'yield_war',
  label: 'DeFi Yield War',
  description: 'Two LPs decide each round whether to stay (C) or rotate to a rival pool (D). Rotating hurts the stayer via IL, but if both rotate the pool collapses.',
  gameId: 'repeated_pd',
  initState: () => ({ tvl: 1.0, round: 0 }),
  updateState(ctx, actions) {
    const exits = actions.filter((a: Action) => a === 'D').length
    const prevTvl = Number(ctx.scenarioState.tvl ?? 1)
    const newTvl = Math.max(0.1, prevTvl - exits * 0.1)
    return { tvl: newTvl, round: ctx.round }
  },
  payoffModifier(ctx, payoffs) {
    const tvl = Number(ctx.scenarioState.tvl ?? 1)
    // Low TVL amplifies IL: staying becomes riskier, payoffs shrink proportionally
    return payoffs.map((p) => Math.round(p * tvl * 10) / 10)
  },
}

// Governance vote: coordination game variant — cooperation = vote YES on a long-term proposal
export const governanceCoordination: ScenarioTemplate = {
  id: 'governance',
  label: 'Governance Coordination',
  description: 'Agents vote YES (C) or NO/abstain (D) on a protocol upgrade. Quorum requires both to vote yes; partial participation is penalized.',
  gameId: 'stag_hunt',
  initState: () => ({ quorumMet: false, round: 0 }),
  updateState(ctx, actions) {
    const quorumMet = actions[0] === 'C' && actions[1] === 'C'
    return { quorumMet, round: ctx.round }
  },
  payoffModifier(ctx, payoffs) {
    const quorumMet = Boolean(ctx.scenarioState.quorumMet)
    if (quorumMet) return payoffs.map((p) => p + 2)
    return payoffs
  },
}

export const ALL_SCENARIOS: ScenarioTemplate[] = [
  noScenario,
  depegPanic,
  yieldWar,
  governanceCoordination,
]
