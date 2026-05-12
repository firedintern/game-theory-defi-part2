import React, { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { repeatedPD } from './core/pd'
import { stagHunt } from './core/stag_hunt'
import { ALL_STRATEGIES, alwaysCooperate, titForTat } from './core/strategies'
import { ALL_SCENARIOS, noScenario } from './core/scenarios'
import { runSimulation, type SimulationResult } from './core/simulation'
import type { AgentStrategy, GameTemplate, ScenarioTemplate } from './core/types'

const DEFAULT_ROUNDS = 20
const GAME_MAP: Record<string, GameTemplate> = {
  repeated_pd: repeatedPD,
  stag_hunt: stagHunt,
}

function findStrategy(id: string): AgentStrategy {
  const found = ALL_STRATEGIES.find((s) => s.id === id)
  if (!found) throw new Error(`Unknown strategy: ${id}`)
  return found
}

function actionBadge(a: string) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 7px',
      borderRadius: 6,
      fontSize: '0.75rem',
      fontWeight: 600,
      background: a === 'C' ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)',
      color: a === 'C' ? '#4ade80' : '#f87171',
      border: `1px solid ${a === 'C' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
    }}>{a === 'C' ? 'Coop' : 'Defect'}</span>
  )
}

const App: React.FC = () => {
  const [rounds, setRounds] = useState(DEFAULT_ROUNDS.toString())
  const [strategyAId, setStrategyAId] = useState<string>(alwaysCooperate.id)
  const [strategyBId, setStrategyBId] = useState<string>(titForTat.id)
  const [scenarioId, setScenarioId] = useState<string>(noScenario.id)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [hasRun, setHasRun] = useState(false)
  const [tab, setTab] = useState<'table' | 'chart'>('chart')

  const totalRounds = useMemo(() => {
    const n = Number(rounds)
    if (!Number.isFinite(n) || n < 1) return DEFAULT_ROUNDS
    return Math.min(Math.max(Math.round(n), 1), 200)
  }, [rounds])

  const scenario: ScenarioTemplate = useMemo(
    () => ALL_SCENARIOS.find((s) => s.id === scenarioId) ?? noScenario,
    [scenarioId]
  )

  const game: GameTemplate = useMemo(
    () => GAME_MAP[scenario.gameId] ?? repeatedPD,
    [scenario]
  )

  const handleRun = () => {
    const strategies: AgentStrategy[] = [findStrategy(strategyAId), findStrategy(strategyBId)]
    const sim = runSimulation({ game, strategies, totalRounds, scenario: scenario.id === 'none' ? undefined : scenario })
    setResult(sim)
    setHasRun(true)
  }

  const stratA = findStrategy(strategyAId)
  const stratB = findStrategy(strategyBId)

  const winnerSummary = useMemo(() => {
    if (!result) return null
    const [aTotal, bTotal] = result.cumulativePayoffs
    if (aTotal === bTotal) {
      return { title: "It's a draw.", line: `${stratA.label} and ${stratB.label} tie with ${aTotal} pts over ${totalRounds} rounds.`, winner: 'tie' }
    }
    const isAWinner = aTotal > bTotal
    return {
      title: `${isAWinner ? stratA.label : stratB.label} wins.`,
      line: `${isAWinner ? stratA.label : stratB.label} ends at ${isAWinner ? aTotal : bTotal} vs ${isAWinner ? stratB.label : stratA.label} at ${isAWinner ? bTotal : aTotal} over ${totalRounds} rounds.`,
      winner: isAWinner ? 'A' : 'B',
    }
  }, [result, stratA, stratB, totalRounds])

  const chartData = useMemo(() => {
    if (!result) return []
    let cumA = 0
    let cumB = 0
    return result.history.map((h) => {
      cumA += h.payoffs[0]
      cumB += h.payoffs[1]
      return { round: h.round, [stratA.label]: cumA, [stratB.label]: cumB }
    })
  }, [result, stratA, stratB])

  const scenarioNotice = scenario.id !== 'none' && scenario.gameId !== game.id ? null : (
    scenario.id !== 'none' ? (
      <div className="scenario-badge">
        <span className="scenario-dot" />
        {scenario.label}
      </div>
    ) : null
  )

  return (
    <div className="app-root">
      <div className="app-shell">
        <div className="header">
          <div className="header-left">
            <div className="title">Agent vs Agent</div>
            <div className="subtitle">Game theory sandbox — pick strategies, run rounds, see who survives.</div>
          </div>
        </div>

        <div className="main-layout">
          {/* LEFT: controls */}
          <div className="sidebar">
            <div className="panel">
              <div className="panel-label">Scenario</div>
              <div className="field">
                <label htmlFor="scenario">Episode</label>
                <select id="scenario" value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
                  {ALL_SCENARIOS.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              {scenario.id !== 'none' && (
                <div className="scenario-desc">{scenario.description}</div>
              )}
              <div className="field" style={{ marginTop: 8 }}>
                <label>Game</label>
                <div className="game-badge">{game.label}</div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-label">Agents</div>
              <div className="agent-row">
                <div className="agent-color agent-a" />
                <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <label htmlFor="strategyA">Agent A</label>
                  <select id="strategyA" value={strategyAId} onChange={(e) => setStrategyAId(e.target.value)}>
                    {ALL_STRATEGIES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="strategy-desc">{stratA.description}</div>

              <div className="agent-row" style={{ marginTop: 10 }}>
                <div className="agent-color agent-b" />
                <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <label htmlFor="strategyB">Agent B</label>
                  <select id="strategyB" value={strategyBId} onChange={(e) => setStrategyBId(e.target.value)}>
                    {ALL_STRATEGIES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="strategy-desc">{stratB.description}</div>
            </div>

            <div className="panel">
              <div className="panel-label">Settings</div>
              <div className="field">
                <label htmlFor="rounds">Rounds (1–200)</label>
                <input
                  id="rounds"
                  type="number"
                  value={rounds}
                  onChange={(e) => setRounds(e.target.value)}
                  min={1}
                  max={200}
                />
              </div>
              <button className="button" onClick={handleRun}>
                Run simulation
              </button>
            </div>
          </div>

          {/* RIGHT: results */}
          <div className="results-area">
            {!hasRun && (
              <div className="empty-state">
                <div className="empty-icon">⚔</div>
                <div className="empty-title">No simulation yet</div>
                <div className="empty-sub">Configure agents and click Run simulation.</div>
              </div>
            )}

            {result && winnerSummary && (
              <>
                <div className="winner-card">
                  <div className="winner-scores">
                    <div className="score-block score-a">
                      <div className="score-name">{stratA.label}</div>
                      <div className="score-val">{result.cumulativePayoffs[0]}</div>
                      <div className="score-label">pts</div>
                    </div>
                    <div className="score-vs">vs</div>
                    <div className="score-block score-b">
                      <div className="score-name">{stratB.label}</div>
                      <div className="score-val">{result.cumulativePayoffs[1]}</div>
                      <div className="score-label">pts</div>
                    </div>
                  </div>
                  <div className="winner-verdict">
                    <span className="winner-title-text">{winnerSummary.title}</span>
                    <span className="winner-sub-text">{winnerSummary.line}</span>
                  </div>
                  {scenarioNotice}
                </div>

                <div className="tab-bar">
                  <button className={`tab-btn ${tab === 'chart' ? 'active' : ''}`} onClick={() => setTab('chart')}>Score chart</button>
                  <button className={`tab-btn ${tab === 'table' ? 'active' : ''}`} onClick={() => setTab('table')}>Round log</button>
                </div>

                {tab === 'chart' && (
                  <div className="chart-panel">
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(55,65,81,0.5)" />
                        <XAxis dataKey="round" stroke="#6b7280" tick={{ fontSize: 11 }} label={{ value: 'Round', position: 'insideBottomRight', offset: -4, fill: '#6b7280', fontSize: 11 }} />
                        <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: '#9ca3af' }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey={stratA.label} stroke="#60a5fa" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey={stratB.label} stroke="#f472b6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {tab === 'table' && (
                  <div className="results-table-wrapper">
                    <table className="results-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>A action</th>
                          <th>B action</th>
                          <th>A payoff</th>
                          <th>B payoff</th>
                          <th>A total</th>
                          <th>B total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.history.map((h, idx) => {
                          const cumA = result.cumulativePayoffs[0] -
                            result.history.slice(idx + 1).reduce((acc, e) => acc + e.payoffs[0], 0)
                          const cumB = result.cumulativePayoffs[1] -
                            result.history.slice(idx + 1).reduce((acc, e) => acc + e.payoffs[1], 0)
                          return (
                            <tr key={h.round}>
                              <td style={{ color: '#6b7280' }}>{h.round}</td>
                              <td>{actionBadge(h.actions[0])}</td>
                              <td>{actionBadge(h.actions[1])}</td>
                              <td>{h.payoffs[0].toFixed(1)}</td>
                              <td>{h.payoffs[1].toFixed(1)}</td>
                              <td style={{ color: '#60a5fa' }}>{cumA.toFixed(1)}</td>
                              <td style={{ color: '#f472b6' }}>{cumB.toFixed(1)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
