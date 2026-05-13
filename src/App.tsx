import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
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

// Animated counter that counts up to a target value
function AnimatedScore({ value }: { value: number }) {
  const motionVal = useMotionValue(0)
  const spring = useSpring(motionVal, { stiffness: 60, damping: 18 })
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    motionVal.set(value)
  }, [value, motionVal])

  useEffect(() => {
    const unsub = spring.on('change', (v) => {
      setDisplay(Number.isInteger(value) ? Math.round(v).toString() : v.toFixed(1))
    })
    return unsub
  }, [spring, value])

  return <span>{display}</span>
}

function ActionBadge({ action, delay }: { action: string; delay: number }) {
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20, delay }}
      style={{
        display: 'inline-block',
        padding: '1px 7px',
        borderRadius: 6,
        fontSize: '0.75rem',
        fontWeight: 600,
        background: action === 'C' ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)',
        color: action === 'C' ? '#4ade80' : '#f87171',
        border: `1px solid ${action === 'C' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
      }}
    >
      {action === 'C' ? 'Coop' : 'Defect'}
    </motion.span>
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
  const [running, setRunning] = useState(false)
  const [runKey, setRunKey] = useState(0) // forces re-mount of results to re-trigger animations
  const buttonRef = useRef<HTMLButtonElement>(null)

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
    setRunning(true)
    // Small delay so the button animation plays
    setTimeout(() => {
      const strategies: AgentStrategy[] = [findStrategy(strategyAId), findStrategy(strategyBId)]
      const sim = runSimulation({ game, strategies, totalRounds, scenario: scenario.id === 'none' ? undefined : scenario })
      setResult(sim)
      setHasRun(true)
      setRunning(false)
      setRunKey((k) => k + 1)
    }, 120)
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
      return { round: h.round, [stratA.label]: parseFloat(cumA.toFixed(2)), [stratB.label]: parseFloat(cumB.toFixed(2)) }
    })
  }, [result, stratA, stratB])

  const scenarioNotice = scenario.id !== 'none' ? (
    <motion.div
      className="scenario-badge"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6 }}
    >
      <span className="scenario-dot" />
      {scenario.label}
    </motion.div>
  ) : null

  const isAWinner = winnerSummary?.winner === 'A'
  const isBWinner = winnerSummary?.winner === 'B'

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
              <AnimatePresence mode="wait">
                {scenario.id !== 'none' && (
                  <motion.div
                    key={scenario.id}
                    className="scenario-desc"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {scenario.description}
                  </motion.div>
                )}
              </AnimatePresence>
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
              <motion.button
                ref={buttonRef}
                className="button"
                onClick={handleRun}
                disabled={running}
                whileTap={{ scale: 0.95 }}
                animate={running ? { opacity: 0.7 } : { opacity: 1 }}
              >
                <AnimatePresence mode="wait">
                  {running ? (
                    <motion.span
                      key="running"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="btn-shimmer"
                    >
                      Simulating…
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      Run simulation
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>

          {/* RIGHT: results */}
          <div className="results-area">
            <AnimatePresence mode="wait">
              {!hasRun ? (
                <motion.div
                  key="empty"
                  className="empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                >
                  <div className="empty-icon">⚔</div>
                  <div className="empty-title">No simulation yet</div>
                  <div className="empty-sub">Configure agents and click Run simulation.</div>
                </motion.div>
              ) : (
                <motion.div
                  key={`results-${runKey}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                >
                  {result && winnerSummary && (
                    <>
                      {/* Winner card */}
                      <motion.div
                        className="winner-card"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                      >
                        <div className="winner-scores">
                          {/* Score A */}
                          <motion.div
                            className={`score-block score-a ${isAWinner ? 'score-winner' : isBWinner ? 'score-loser' : ''}`}
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 18 }}
                          >
                            {isAWinner && <WinnerGlow color="#60a5fa" />}
                            <div className="score-name">{stratA.label}</div>
                            <div className="score-val">
                              <AnimatedScore value={result.cumulativePayoffs[0]} />
                            </div>
                            <div className="score-label">pts</div>
                          </motion.div>

                          <div className="score-vs">vs</div>

                          {/* Score B */}
                          <motion.div
                            className={`score-block score-b ${isBWinner ? 'score-winner' : isAWinner ? 'score-loser' : ''}`}
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 18 }}
                          >
                            {isBWinner && <WinnerGlow color="#f472b6" />}
                            <div className="score-name">{stratB.label}</div>
                            <div className="score-val">
                              <AnimatedScore value={result.cumulativePayoffs[1]} />
                            </div>
                            <div className="score-label">pts</div>
                          </motion.div>
                        </div>

                        <motion.div
                          className="winner-verdict"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.45 }}
                        >
                          <span className="winner-title-text">{winnerSummary.title}</span>
                          <span className="winner-sub-text">{winnerSummary.line}</span>
                        </motion.div>
                        {scenarioNotice}
                      </motion.div>

                      {/* Tab bar */}
                      <motion.div
                        className="tab-bar"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <button className={`tab-btn ${tab === 'chart' ? 'active' : ''}`} onClick={() => setTab('chart')}>Score chart</button>
                        <button className={`tab-btn ${tab === 'table' ? 'active' : ''}`} onClick={() => setTab('table')}>Round log</button>
                      </motion.div>

                      <AnimatePresence mode="wait">
                        {tab === 'chart' && (
                          <motion.div
                            key="chart"
                            className="chart-panel"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                          >
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
                                <Line type="monotone" dataKey={stratA.label} stroke="#60a5fa" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={900} animationEasing="ease-out" />
                                <Line type="monotone" dataKey={stratB.label} stroke="#f472b6" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={900} animationEasing="ease-out" />
                              </LineChart>
                            </ResponsiveContainer>
                          </motion.div>
                        )}

                        {tab === 'table' && (
                          <motion.div
                            key="table"
                            className="results-table-wrapper"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                          >
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
                                    <motion.tr
                                      key={h.round}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: idx * 0.025, duration: 0.18 }}
                                    >
                                      <td style={{ color: '#6b7280' }}>{h.round}</td>
                                      <td><ActionBadge action={h.actions[0]} delay={idx * 0.025} /></td>
                                      <td><ActionBadge action={h.actions[1]} delay={idx * 0.025 + 0.04} /></td>
                                      <td>{h.payoffs[0].toFixed(1)}</td>
                                      <td>{h.payoffs[1].toFixed(1)}</td>
                                      <td style={{ color: '#60a5fa' }}>{cumA.toFixed(1)}</td>
                                      <td style={{ color: '#f472b6' }}>{cumB.toFixed(1)}</td>
                                    </motion.tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

// Animated winner glow ring
function WinnerGlow({ color }: { color: string }) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: -1,
        borderRadius: 10,
        border: `2px solid ${color}`,
        pointerEvents: 'none',
      }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: [0, 1, 0.6, 1], scale: [0.92, 1.02, 1] }}
      transition={{ duration: 0.6, delay: 0.3, times: [0, 0.4, 0.7, 1] }}
    />
  )
}

export default App
