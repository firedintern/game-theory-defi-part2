export type Action = 'C' | 'D'

export type GameId = 'repeated_pd' | 'stag_hunt'

export interface GameContext {
  gameId: GameId
  round: number
  totalRounds: number
  scenarioState: Record<string, number | string | boolean>
}

export interface ScenarioTemplate {
  id: string
  label: string
  description: string
  gameId: GameId
  initState(): Record<string, number | string | boolean>
  updateState(ctx: GameContext, actions: Action[]): Record<string, number | string | boolean>
  payoffModifier(ctx: GameContext, basePayoffs: number[]): number[]
}

export interface RoundHistoryEntry {
  round: number
  actions: Action[]
  payoffs: number[]
}

export type History = RoundHistoryEntry[]

export interface GameTemplate {
  id: GameId
  label: string
  computePayoffs(ctx: GameContext, actions: Action[]): number[]
}

export interface AgentStrategy {
  id: string
  label: string
  description: string
  chooseAction(ctx: GameContext, history: History, selfIndex: number): Action
}
