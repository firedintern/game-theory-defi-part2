# Design Notes – Agent vs Agent Lab

## Intent

This repo is a minimal, opinionated starting point for an "Agent vs Agent Game Theory Lab" focused on repeated games. The intent is to keep the core logic small and readable so you can let AI/code assistants extend it toward DeFi / governance scenarios.

## Architecture

- **Core engine (`src/core`)**
  - Pure TypeScript modules, no React imports.
  - `types.ts` defines the basic primitives: actions, context, history, templates, strategies.
  - `pd.ts` encodes a canonical repeated Prisoner's Dilemma.
  - `strategies.ts` defines a handful of baseline strategies.
  - `simulation.ts` runs a repeated game for N rounds and returns history + cumulative scores.

- **UI (`src/App.tsx`)**
  - Thin React wrapper around the engine.
  - Holds the selected strategies + rounds in local state.
  - Calls `runSimulation` and renders the log + winner card.

## Extension path

1. **Add more games**
   - Create new templates implementing `GameTemplate` for:
     - Stag Hunt / coordination game.
     - Simple discrete auction game.
   - Add a game selector to the UI and switch which template is passed into `runSimulation`.

2. **Add scenarios and evolving context**
   - Extend `GameContext` with richer `scenarioState` fields.
   - Add a small `scenarios.ts` that updates `scenarioState` each round (e.g., increase "panic" over time in a depeg scenario).
   - Let `computePayoffs` depend on this state.

3. **Richer strategies**
   - Strategies can look at context and history, so you can implement:
     - Risk-averse vs risk-seeking agents.
     - Agents that react to volatility or governance turnout.
     - Agents that occasionally explore (epsilon-greedy).

4. **Spectator UX**
   - Replace the raw table with a more visual timeline or chart.
   - Style the winner card as a screenshot-ready share object with key numbers.
   - Add a textual summary per episode ("Grim Trigger punished early defection and dominated overall").

This structure keeps the lab small enough to understand at a glance, while giving you clear seams to plug in real crypto data and more intricate game-theoretic setups.
