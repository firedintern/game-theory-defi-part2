import type { Action, AgentStrategy, GameContext, History } from './types'

function lastOpponentAction(history: History, selfIndex: number): Action | null {
  if (history.length === 0) return null
  const last = history[history.length - 1]
  const otherIndex = selfIndex === 0 ? 1 : 0
  return last.actions[otherIndex]
}

function opponentEverDefected(history: History, selfIndex: number): boolean {
  const otherIndex = selfIndex === 0 ? 1 : 0
  return history.some((h) => h.actions[otherIndex] === 'D')
}

export const alwaysCooperate: AgentStrategy = {
  id: 'always_c',
  label: 'Always Cooperate',
  description: 'Always plays C regardless of history.',
  chooseAction(_ctx: GameContext, _history: History, _selfIndex: number): Action {
    return 'C'
  },
}

export const alwaysDefect: AgentStrategy = {
  id: 'always_d',
  label: 'Always Defect',
  description: 'Always plays D regardless of history.',
  chooseAction(_ctx: GameContext, _history: History, _selfIndex: number): Action {
    return 'D'
  },
}

export const titForTat: AgentStrategy = {
  id: 'tit_for_tat',
  label: 'Tit-for-Tat',
  description: "Start with C, then copy the opponent's last move.",
  chooseAction(_ctx: GameContext, history: History, selfIndex: number): Action {
    const last = lastOpponentAction(history, selfIndex)
    if (!last) return 'C'
    return last
  },
}

export const grimTrigger: AgentStrategy = {
  id: 'grim_trigger',
  label: 'Grim Trigger',
  description: 'Cooperate until the opponent defects once, then defect forever.',
  chooseAction(_ctx: GameContext, history: History, selfIndex: number): Action {
    const betrayed = opponentEverDefected(history, selfIndex)
    if (betrayed) return 'D'
    return 'C'
  },
}

export const noisyCooperator: AgentStrategy = {
  id: 'noisy_cooperator',
  label: 'Noisy Cooperator',
  description: 'Usually cooperates, but defects with a small random chance.',
  chooseAction(_ctx: GameContext, _history: History, _selfIndex: number): Action {
    const r = Math.random()
    return r < 0.85 ? 'C' : 'D'
  },
}

export const pavlov: AgentStrategy = {
  id: 'pavlov',
  label: 'Pavlov (Win-Stay, Lose-Shift)',
  description: 'Repeats last action if it paid off (≥ R), otherwise switches.',
  chooseAction(_ctx: GameContext, history: History, selfIndex: number): Action {
    if (history.length === 0) return 'C'
    const last = history[history.length - 1]
    const myLastAction = last.actions[selfIndex]
    const myLastPayoff = last.payoffs[selfIndex]
    return myLastPayoff >= 3 ? myLastAction : (myLastAction === 'C' ? 'D' : 'C')
  },
}

export const randomAgent: AgentStrategy = {
  id: 'random',
  label: 'Random',
  description: 'Picks C or D with equal probability each round.',
  chooseAction(_ctx: GameContext, _history: History, _selfIndex: number): Action {
    return Math.random() < 0.5 ? 'C' : 'D'
  },
}

export const suspiciousTFT: AgentStrategy = {
  id: 'suspicious_tft',
  label: 'Suspicious Tit-for-Tat',
  description: 'Like Tit-for-Tat but opens with D instead of C.',
  chooseAction(_ctx: GameContext, history: History, selfIndex: number): Action {
    if (history.length === 0) return 'D'
    return lastOpponentAction(history, selfIndex) ?? 'D'
  },
}

export const gradualStrategy: AgentStrategy = {
  id: 'gradual',
  label: 'Gradual',
  description: 'Punishes each defection with D for N rounds (N = defection count), then forgives with 2 Cs.',
  chooseAction(_ctx: GameContext, history: History, selfIndex: number): Action {
    const otherIndex = selfIndex === 0 ? 1 : 0
    const defCount = history.filter((h) => h.actions[otherIndex] === 'D').length
    if (defCount === 0) return 'C'
    // Count punishment rounds issued so far by examining own recent Ds after defections
    // Simple approximation: punish for defCount rounds after last defection, then 2 Cs
    const lastDefIdx = [...history].reverse().findIndex((h) => h.actions[otherIndex] === 'D')
    const roundsSinceLastDef = lastDefIdx === -1 ? Infinity : lastDefIdx
    if (roundsSinceLastDef < defCount) return 'D'
    if (roundsSinceLastDef < defCount + 2) return 'C'
    return 'C'
  },
}

export const ALL_STRATEGIES: AgentStrategy[] = [
  alwaysCooperate,
  alwaysDefect,
  titForTat,
  grimTrigger,
  noisyCooperator,
  pavlov,
  randomAgent,
  suspiciousTFT,
  gradualStrategy,
]
