import type { AgentStrategy, GameContext, GameTemplate, History, RoundHistoryEntry, ScenarioTemplate } from './types'

export interface SimulationConfig {
  game: GameTemplate
  strategies: AgentStrategy[]
  totalRounds: number
  scenario?: ScenarioTemplate
}

export interface SimulationResult {
  history: History
  cumulativePayoffs: number[]
  scenarioStates: Record<string, number | string | boolean>[]
}

export function runSimulation(config: SimulationConfig): SimulationResult {
  const { game, strategies, totalRounds, scenario } = config
  if (strategies.length !== 2) throw new Error('Engine supports exactly 2 agents')

  const cumulative = [0, 0]
  const history: History = []
  const scenarioStates: Record<string, number | string | boolean>[] = []
  let scenarioState = scenario ? scenario.initState() : {}

  for (let round = 1; round <= totalRounds; round++) {
    const ctx: GameContext = {
      gameId: game.id,
      round,
      totalRounds,
      scenarioState,
    }

    const actions = strategies.map((s, idx) => s.chooseAction(ctx, history, idx))
    const basePayoffs = game.computePayoffs(ctx, actions)
    const payoffs = scenario ? scenario.payoffModifier(ctx, basePayoffs) : basePayoffs

    cumulative[0] += payoffs[0]
    cumulative[1] += payoffs[1]

    scenarioStates.push({ ...scenarioState })

    const entry: RoundHistoryEntry = { round, actions, payoffs }
    history.push(entry)

    if (scenario) {
      scenarioState = scenario.updateState(ctx, actions)
    }
  }

  return { history, cumulativePayoffs: [...cumulative], scenarioStates }
}
