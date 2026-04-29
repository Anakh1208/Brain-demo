'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import WeeklyRecap from '../components/WeeklyRecap'
import DemoButton from '../components/DemoButton'
import RemindersTab from '../components/RemindersTab'

// ── Color maps ──────────────────────────────────────────────────────────────
const TOPIC_COLORS_DARK = {
  placements:    { bg: '#1A1550', border: '#7B6EFF', text: '#A89FFF', bubble: '#7B6EFF' },
  exams:         { bg: '#3A2800', border: '#F5A433', text: '#FFC266', bubble: '#F5A433' },
  fitness:       { bg: '#003D30', border: '#00C99A', text: '#00E5B0', bubble: '#00C99A' },
  money:         { bg: '#3A1500', border: '#E8607A', text: '#FF8FA3', bubble: '#E8607A' },
  health:        { bg: '#003D30', border: '#00C99A', text: '#00E5B0', bubble: '#00C99A' },
  relationships: { bg: '#3A0F18', border: '#E8607A', text: '#FF8FA3', bubble: '#E8607A' },
  work:          { bg: '#1A1550', border: '#7B6EFF', text: '#A89FFF', bubble: '#7B6EFF' },
  default:       { bg: '#16163A', border: '#444466', text: '#8888B0', bubble: '#666688' },
}
const TOPIC_COLORS_LIGHT = {
  placements:    { bg: '#EEEEFF', border: '#5A51F5', text: '#3A31C5', bubble: '#5A51F5' },
  exams:         { bg: '#FDF2E0', border: '#C47A10', text: '#8A5208', bubble: '#C47A10' },
  fitness:       { bg: '#E0F8F2', border: '#008F6D', text: '#006050', bubble: '#008F6D' },
  money:         { bg: '#FDE8ED', border: '#C5334D', text: '#9E2038', bubble: '#C5334D' },
  health:        { bg: '#E0F8F2', border: '#008F6D', text: '#006050', bubble: '#008F6D' },
  relationships: { bg: '#FDE8ED', border: '#C5334D', text: '#9E2038', bubble: '#C5334D' },
  work:          { bg: '#EEEEFF', border: '#5A51F5', text: '#3A31C5', bubble: '#5A51F5' },
  default:       { bg: '#F0F0FA', border: '#888890', text: '#444468', bubble: '#888890' },
}
function getColor(topic, isDark) {
  const map = isDark ? TOPIC_COLORS_DARK : TOPIC_COLORS_LIGHT
  return map[topic?.toLowerCase()] || map.default
}

function getToday() { return new Date().toISOString().split('T')[0] }
function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().split('T')[0]
  })
}
function dayLabel(dateStr) {
  return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][new Date(dateStr + 'T12:00:00').getDay()]
}

export default function Home() {
  const [isDark, setIsDark] = useState(true)

  // Core data
  const [rantText, setRantText]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [aiReply, setAiReply]       = useState(null)
  const [worries, setWorries]       = useState([])
  const [habits,  setHabits]        = useState([])
  const [events,  setEvents]        = useState([])
  const [selectedBubble, setSelectedBubble] = useState(null)
  const [toast,   setToast]         = useState(null)
  const [userEmail, setUserEmail]   = useState('')
  const [nudgeEmail,    setNudgeEmail]    = useState('')
  const [nudgeSentMap,  setNudgeSentMap]  = useState({})

  // Focus timer
  const [activeTopic,   setActiveTopic]  = useState(null)
  const [timeLeft,      setTimeLeft]     = useState(0)
  const [isRunning,     setIsRunning]    = useState(false)
  const [timerMinutes,  setTimerMinutes] = useState(25)
  const intervalRef = useRef(null)

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const T = isDark ? {
    bg:         '#07071a',
    surface:    '#0c0c22',
    card:       '#0f0f2a',
    card2:      '#13133a',
    border:     '#1e1e45',
    divider:    '#181838',
    text:       '#e8e8ff',
    muted:      '#5a5a90',
    faint:      '#16163a',
    inputBg:    '#090918',
    accent:     '#7b6eff',
    green:      '#00c99a',
    amber:      '#f5a433',
    coral:      '#e8607a',
    accentGlow: 'rgba(123,110,255,0.12)',
    gridOpacity: 0.5,
  } : {
    bg:         '#f2f2fc',
    surface:    '#ffffff',
    card:       '#f8f8ff',
    card2:      '#f0f0fa',
    border:     '#ddddf0',
    divider:    '#eaeaf5',
    text:       '#0e0e30',
    muted:      '#666690',
    faint:      '#e8e8f8',
    inputBg:    '#f5f5fd',
    accent:     '#5a51f5',
    green:      '#008f6d',
    amber:      '#c47a10',
    coral:      '#c5334d',
    accentGlow: 'rgba(90,81,245,0.08)',
    gridOpacity: 0.4,
  }

  const suggestions = [
    "I'm stressed about exams",
    "I'm worried about placements",
    "I'm procrastinating a lot",
    "I don't have a proper routine",
  ]

  // ── Data helpers ──────────────────────────────────────────────────────────
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2800) }

  const loadData = useCallback(async () => {
    try {
      const [w, h, e] = await Promise.all([
        fetch('/api/worries').then(r => r.json()),
        fetch('/api/habits').then(r => r.json()),
        fetch('/api/events').then(r => r.json()),
      ])
      if (Array.isArray(w)) setWorries(w)
      if (Array.isArray(h)) setHabits(h)
      if (Array.isArray(e)) setEvents(e)
    } catch (err) { console.error('Load error', err) }
  }, [])

  useEffect(() => {
    loadData()
    const saved = localStorage.getItem('3b_email')
    if (saved) { setUserEmail(saved); setNudgeEmail(saved) }
  }, [loadData])

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleRant() {
    if (!rantText.trim()) return
    setLoading(true); setAiReply(null)
    try {
      const classRes = await fetch('/api/classify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rantText }),
      })
      const { data } = await classRes.json()
      if (!data) throw new Error('No classification returned')

      const worryRes = await fetch('/api/worries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rantText, topic: data.topic }),
      })
      const worry = await worryRes.json()

      if (data.habits?.length) {
        await Promise.all(data.habits.map(h =>
          fetch('/api/habits', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: h.name, topic: data.topic, worry_id: worry.id }),
          })
        ))
      }
      if (data.events?.length) {
        await Promise.all(data.events.map(ev =>
          fetch('/api/events', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: ev.name, topic: data.topic, deadline: ev.deadline, worry_id: worry.id }),
          })
        ))
      }

      try {
        const ragRes = await fetch('/api/rag-pattern', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: rantText, user_id: 'demo' }),
        })
        const ragData = await ragRes.json()
        if (ragData.pattern_detected && ragData.insight) {
          data.pattern_insight = ragData.insight
          data.repeat_count    = ragData.repeat_count
        }
      } catch (_) {}

      if (userEmail) {
        try {
          const rRes = await fetch('/api/reminders', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: rantText, email: userEmail }),
          })
          const rData = await rRes.json()
          if (rData.has_reminder && rData.reminder) data._reminder = rData.reminder
        } catch (_) {}
      }

      setAiReply(data); setRantText('')
      await loadData(); showToast('Plan generated ✓')
    } catch (err) { console.error(err); showToast('Error: ' + err.message) }
    finally { setLoading(false) }
  }

  async function toggleHabit(habitId) {
    await fetch('/api/habits', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habit_id: habitId, completed_date: getToday() }),
    })
    await loadData()
  }

  async function toggleEvent(eventId, currentDone) {
    await fetch('/api/events', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: eventId, done: !currentDone }),
    })
    await loadData()
  }

  async function deleteHabit(id) {
    if (!confirm('Remove this habit?')) return
    await fetch('/api/habits', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await loadData(); showToast('Habit removed')
  }

  async function deleteEvent(id) {
    if (!confirm('Remove this event?')) return
    await fetch('/api/events', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await loadData(); showToast('Event removed')
  }

  async function deleteWorry(id) {
    if (!confirm('Remove this worry?')) return
    await fetch('/api/worries', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await loadData(); showToast('Worry removed')
  }

  async function sendBubbleNudge(topic, email) {
    if (!email || !email.trim()) { showToast('Enter your email first'); return }
    try {
      const res  = await fetch('/api/reminders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `remind me to work on my ${topic} concern`, email }),
      })
      const data = await res.json()
      if (data.has_reminder) {
        setNudgeSentMap(p => ({ ...p, [topic]: true }))
        showToast(`Nudge set for "${topic}" ✓`)
      } else {
        showToast('Nudge scheduled ✓')
      }
    } catch (_) { showToast('Could not set nudge') }
  }

  // ── Timer ─────────────────────────────────────────────────────────────────
  function startTimer() {
    if (isRunning) return
    const start = timeLeft > 0 ? timeLeft : timerMinutes * 60
    setTimeLeft(start); setIsRunning(true)
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current); setIsRunning(false); return 0 }
        return prev - 1
      })
    }, 1000)
  }
  function pauseTimer() { if (intervalRef.current) clearInterval(intervalRef.current); setIsRunning(false) }
  function resetTimer()  { if (intervalRef.current) clearInterval(intervalRef.current); setIsRunning(false); setTimeLeft(0) }
  const fmt = s => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  // ── Computed ──────────────────────────────────────────────────────────────
  const topicMap = {}
  worries.forEach(w => {
    const t = w.topic || 'other'
    if (!topicMap[t]) topicMap[t] = { count: 0, habits: [], events: [], worries: [] }
    topicMap[t].count++; topicMap[t].worries.push(w)
  })
  habits.forEach(h => { const t = h.topic || 'other'; if (topicMap[t]) topicMap[t].habits.push(h) })
  events.forEach(e => { const t = e.topic || 'other'; if (topicMap[t]) topicMap[t].events.push(e) })
  const topics = Object.entries(topicMap).sort((a, b) => b[1].count - a[1].count)

  const totalWorries     = worries.length
  const totalActionsDone = events.filter(e => e.done).length +
    habits.reduce((acc, h) => acc + (h.habit_completions?.length || 0), 0)
  const gapScore = totalWorries > 0
    ? Math.max(0, Math.round(100 - (totalActionsDone / Math.max(totalWorries, 1)) * 50))
    : 0

  function getWeekDone(habit) {
    const days = getLast7Days()
    const completedSet = new Set((habit.habit_completions || []).map(c => c.completed_date))
    return days.map(d => ({ date: d, done: completedSet.has(d) }))
  }
  function getStreak(habit) {
    const completedSet = new Set((habit.habit_completions || []).map(c => c.completed_date))
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      if (completedSet.has(d.toISOString().split('T')[0])) streak++
      else if (i > 0) break
    }
    return streak
  }

  // ── Gap ring ─────────────────────────────────────────────────────────────
  const circumference = 352
  const ringOffset = circumference - (gapScore / 100) * circumference
  const ringColor = gapScore > 70 ? T.coral : gapScore > 40 ? T.amber : T.green

  // ── Shared styles ──────────────────────────────────────────────────────────
  const card = {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 16,
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  }
  const cardGlow = {
    ...card,
    boxShadow: isDark ? `inset 0 0 40px ${T.accentGlow}` : 'none',
  }
  const sectionLabel = {
    fontFamily: "'Syne', sans-serif",
    fontSize: 9, fontWeight: 700, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: T.muted, marginBottom: 16,
    display: 'flex', alignItems: 'center', gap: 7,
  }
  const sectionLabelLine = {
    flex: 1, height: 1, background: T.divider,
  }
  const emptyBox = {
    fontSize: 12, color: T.muted, textAlign: 'center',
    padding: '24px 0', border: `1.5px dashed ${T.border}`,
    borderRadius: 10, marginBottom: 12, lineHeight: 1.6,
  }
  const delBtn = {
    width: 20, height: 20, borderRadius: '50%', background: 'transparent',
    border: `1px solid ${T.border}`, cursor: 'pointer', color: T.muted,
    fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'all 0.15s',
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text }}>

      {/* ── Global CSS ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;600;700&display=swap');
        @keyframes fadeDown { from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn    { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
        @keyframes shimmer  { 0%,100%{opacity:0.5} 50%{opacity:1} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.faint}; border-radius: 2px; }
        textarea, input, select { font-family: 'DM Sans', sans-serif; }
        textarea:focus, input:focus { outline: none; }
        .body-grid::before {
          content: ''; position: fixed; inset: 0; z-index: 0;
          background-image: radial-gradient(circle, ${T.border} 1px, transparent 1px);
          background-size: 28px 28px; opacity: ${T.gridOpacity}; pointer-events: none;
        }
        @media (max-width: 900px) {
          .grid-2col { grid-template-columns: 1fr !important; }
          .grid-3col { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .main-pad { padding: 12px !important; }
          .header-stats { display: none !important; }
        }
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 999,
          background: T.green, color: '#fff', padding: '10px 20px',
          borderRadius: 20, fontSize: 12, fontWeight: 700,
          boxShadow: `0 8px 24px ${T.green}40`,
          animation: 'fadeUp 0.22s ease',
          display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
        }}>
          <span>✓</span>{toast}
        </div>
      )}

      {/* ══════════════════════════
          HEADER
      ══════════════════════════ */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 60,
        background: isDark ? 'rgba(12,12,34,0.88)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${T.border}`,
        padding: '0 28px', height: 58,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: T.faint, border: `1px solid ${T.accent}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="4" r="2" stroke={T.accent} strokeWidth="1.5"/>
              <circle cx="3" cy="12" r="2" stroke={T.accent} strokeWidth="1.5"/>
              <circle cx="13" cy="12" r="2" stroke={T.accent} strokeWidth="1.5"/>
              <line x1="8" y1="6" x2="3" y2="10" stroke={T.accent} strokeWidth="1" strokeDasharray="2 1"/>
              <line x1="8" y1="6" x2="13" y2="10" stroke={T.green} strokeWidth="1" strokeDasharray="2 1"/>
              <line x1="5" y1="12" x2="11" y2="12" stroke={T.green} strokeWidth="1" strokeDasharray="2 1"/>
            </svg>
          </div>
          <span style={{
            fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 800,
            background: `linear-gradient(135deg, ${T.text} 30%, ${T.accent})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>3rd Brain</span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            color: isDark ? '#a89fff' : '#3a31c5',
            background: T.faint,
            border: `1px solid ${T.accent}40`,
            padding: '4px 11px', borderRadius: 20,
          }}>gap · {gapScore}</span>
        </div>

        {/* Stats */}
        <div className="header-stats" style={{ display: 'flex', gap: 12, fontSize: 11, color: T.muted }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.accent, display: 'inline-block' }} />
            {worries.length} worries
          </span>
          <span style={{ color: T.border }}>·</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.green, display: 'inline-block' }} />
            {habits.length} habits
          </span>
          <span style={{ color: T.border }}>·</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.amber, display: 'inline-block' }} />
            {events.length} events
          </span>
        </div>

        <DemoButton onDemoLogin={id => console.log('demo:', id)} />

        <button
          onClick={() => setIsDark(d => !d)}
          title={isDark ? 'Light mode' : 'Dark mode'}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: T.card, border: `1px solid ${T.border}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, transition: 'all 0.25s',
            color: isDark ? T.amber : T.accent,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.transform = 'rotate(20deg)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = 'rotate(0)' }}
        >
          {isDark ? '☀' : '☾'}
        </button>
      </header>

      {/* ══════════════════════════
          MAIN
      ══════════════════════════ */}
      <div className="body-grid" style={{ position: 'relative' }}>
        <main className="main-pad" style={{ padding: '22px 28px', maxWidth: 1380, margin: '0 auto', position: 'relative', zIndex: 1 }}>

          {/* ── ROW 1 : Rant + Concern Map ── */}
          <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* ─── RANT CARD ─── */}
            <div style={cardGlow}>
              <div style={sectionLabel}>
                unload your mind
                <span style={sectionLabelLine}></span>
              </div>

              <textarea
                value={rantText}
                onChange={e => setRantText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handleRant()}
                placeholder="i have exams next week and haven't studied. also terrified about placements..."
                rows={5}
                style={{
                  width: '100%', background: T.inputBg,
                  border: `1.5px solid ${T.border}`, borderRadius: 12,
                  padding: '14px 16px', fontSize: 13, color: T.text,
                  resize: 'none', lineHeight: 1.8, marginBottom: 10,
                  transition: 'border-color 0.25s, box-shadow 0.25s',
                }}
                onFocus={e  => { e.target.style.borderColor = T.accent + '80'; e.target.style.boxShadow = `0 0 0 3px ${T.accent}10` }}
                onBlur={e   => { e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none' }}
              />

              {/* Suggestions */}
              {!rantText && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => setRantText(s)} style={{
                      padding: '5px 12px', fontSize: 11, borderRadius: 20,
                      background: 'transparent', border: `1px solid ${T.border}`,
                      color: T.muted, cursor: 'pointer', transition: 'all 0.15s', fontWeight: 500,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; e.currentTarget.style.background = T.faint }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; e.currentTarget.style.background = 'transparent' }}
                    >{s}</button>
                  ))}
                </div>
              )}

              <button
                onClick={handleRant}
                disabled={loading || !rantText.trim()}
                style={{
                  width: '100%', padding: '13px',
                  background: loading || !rantText.trim()
                    ? T.faint
                    : `linear-gradient(135deg, ${T.accent}, ${isDark ? '#9b90ff' : '#7b73ff'})`,
                  border: 'none', borderRadius: 12, color: loading || !rantText.trim() ? T.muted : '#fff',
                  fontSize: 13, fontWeight: 700, cursor: loading || !rantText.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s', letterSpacing: '0.03em',
                  fontFamily: "'Syne', sans-serif",
                }}
                onMouseEnter={e => { if (!loading && rantText.trim()) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${T.accent}40` }}}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
              >{loading ? 'analyzing...' : 'unload it →'}</button>

              {/* AI Reply */}
              {aiReply && (
                <div style={{
                  marginTop: 14, background: T.card,
                  border: `1px solid ${T.border}`, borderRadius: 12, padding: 16,
                  animation: 'fadeUp 0.25s ease',
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: T.accent, marginBottom: 10,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontFamily: "'Syne', sans-serif",
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, display: 'inline-block', animation: 'shimmer 2s infinite' }}></span>
                    {aiReply.topic} · classified
                  </div>
                  <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.75, marginBottom: 12 }}>{aiReply.summary}</p>

                  {aiReply.habits?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, color: T.green, marginBottom: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Syne', sans-serif" }}>habits suggested</div>
                      {aiReply.habits.map((h, i) => (
                        <div key={i} style={{ fontSize: 12, color: T.text, padding: '3px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.green, flexShrink: 0 }} />
                          {h.name}
                        </div>
                      ))}
                    </div>
                  )}

                  {aiReply.events?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, color: T.amber, marginBottom: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Syne', sans-serif" }}>events suggested</div>
                      {aiReply.events.map((e, i) => (
                        <div key={i} style={{ fontSize: 12, color: T.text, padding: '3px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.amber, flexShrink: 0 }} />
                          {e.name}{e.deadline && <span style={{ color: T.muted, fontSize: 11, marginLeft: 4 }}>· {e.deadline}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {aiReply.gap && (
                    <div style={{ background: T.faint, borderRadius: 9, padding: '9px 13px', fontSize: 12, color: isDark ? '#a89fff' : '#3a31c5', lineHeight: 1.6, border: `1px solid ${T.accent}20` }}>
                      {aiReply.gap}
                    </div>
                  )}
                  {aiReply.pattern_insight && (
                    <div style={{ background: isDark ? '#3a2800' : '#fdf2e0', borderRadius: 9, padding: '9px 13px', fontSize: 12, color: isDark ? '#ffc266' : '#8a5208', marginTop: 6, lineHeight: 1.5 }}>
                      repeated pattern ({aiReply.repeat_count}×) — {aiReply.pattern_insight}
                    </div>
                  )}
                  {aiReply._reminder && (
                    <div style={{ background: isDark ? '#003d30' : '#e0f8f2', border: `1px solid ${T.green}30`, borderRadius: 9, padding: '9px 13px', fontSize: 12, color: isDark ? '#00e5b0' : '#006050', marginTop: 6 }}>
                      nudge set for <strong>{aiReply._reminder.title}</strong>
                    </div>
                  )}

                  <button onClick={() => document.getElementById('plan-section')?.scrollIntoView({ behavior: 'smooth' })} style={{
                    marginTop: 10, width: '100%', padding: '8px', background: 'transparent',
                    border: `1px solid ${T.border}`, borderRadius: 9, color: T.muted,
                    fontSize: 11, cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted }}
                  >view full plan ↓</button>
                </div>
              )}

              {/* Recent worries */}
              {worries.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ ...sectionLabel, marginBottom: 10 }}>
                    recent worries<span style={sectionLabelLine}></span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {worries.slice(0, 7).map(w => {
                      const c = getColor(w.topic, isDark)
                      return (
                        <span key={w.id} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '5px 11px', background: c.bg,
                          border: `1px solid ${c.border}40`, borderRadius: 16,
                          fontSize: 11, color: c.text, fontWeight: 500, transition: 'transform 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: c.bubble }} />
                          {w.topic || 'worry'}
                          <button onClick={e => { e.stopPropagation(); deleteWorry(w.id) }}
                            style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 13, paddingLeft: 4, fontWeight: 700 }}>×</button>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ─── CONCERN MAP CARD ─── */}
            <div style={card}>
              <div style={sectionLabel}>
                concern map<span style={sectionLabelLine}></span>
              </div>

              {topics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', color: T.muted, fontSize: 13 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ opacity: 0.3 }}>
                      <circle cx="20" cy="10" r="5" stroke={T.muted} strokeWidth="2"/>
                      <circle cx="8" cy="30" r="5" stroke={T.muted} strokeWidth="2"/>
                      <circle cx="32" cy="30" r="5" stroke={T.muted} strokeWidth="2"/>
                      <line x1="20" y1="15" x2="8" y2="25" stroke={T.muted} strokeWidth="1.5" strokeDasharray="3 2"/>
                      <line x1="20" y1="15" x2="32" y2="25" stroke={T.muted} strokeWidth="1.5" strokeDasharray="3 2"/>
                    </svg>
                  </div>
                  rant first to see your concern bubbles
                </div>
              ) : (
                <>
                  {/* Bubble canvas */}
                  <div style={{
                    position: 'relative', height: 240, marginBottom: 14,
                    borderRadius: 12, overflow: 'hidden',
                    border: `1px solid ${T.border}`,
                    background: isDark
                      ? `radial-gradient(ellipse at 30% 40%, ${T.accent}08 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, ${T.green}06 0%, transparent 50%), ${T.card}`
                      : `radial-gradient(ellipse at 30% 40%, ${T.accent}06 0%, transparent 60%), ${T.card}`,
                  }}>
                    {topics.slice(0, 7).map(([topic, data], i) => {
                      const c       = getColor(topic, isDark)
                      const max     = topics[0][1].count
                      const size    = 54 + (data.count / max) * 70
                      const POSITIONS = [
                        { left: '12%', top: '15%' }, { left: '55%', top: '12%' },
                        { left: '30%', top: '55%' }, { left: '65%', top: '52%' },
                        { left: '42%', top: '28%' }, { left: '8%',  top: '65%' },
                        { left: '75%', top: '30%' },
                      ]
                      const pos      = POSITIONS[i % POSITIONS.length]
                      const selected = selectedBubble === topic
                      return (
                        <div key={topic}
                          onClick={() => setSelectedBubble(selected ? null : topic)}
                          style={{
                            position: 'absolute', left: pos.left, top: pos.top,
                            width: size, height: size, borderRadius: '50%',
                            background: c.bg,
                            border: `${selected ? 2 : 1.5}px solid ${selected ? c.bubble : c.border}`,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            transform: selected ? 'scale(1.14)' : 'scale(1)',
                            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            zIndex: selected ? 3 : 1,
                            boxShadow: selected ? `0 0 24px ${c.bubble}40` : 'none',
                          }}
                          onMouseEnter={e => { if (!selected) e.currentTarget.style.transform = 'scale(1.08)' }}
                          onMouseLeave={e => { if (!selected) e.currentTarget.style.transform = 'scale(1)' }}
                        >
                          <span style={{ fontSize: Math.max(9, size * 0.14), fontWeight: 600, color: c.text, textAlign: 'center', padding: '0 5px', lineHeight: 1.2 }}>{topic}</span>
                          <span style={{ fontSize: 9, color: c.bubble, marginTop: 2, fontWeight: 700 }}>{data.count}×</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Selected bubble detail */}
                  {selectedBubble && topicMap[selectedBubble] && (
                    <div style={{
                      background: T.card2,
                      border: `1px solid ${getColor(selectedBubble, isDark).border}`,
                      borderRadius: 12, padding: 14, marginBottom: 12,
                      animation: 'popIn 0.22s ease',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: "'Syne', sans-serif" }}>{selectedBubble}</span>
                        <span style={{
                          fontSize: 9, padding: '3px 9px', borderRadius: 10, fontWeight: 700,
                          background: topicMap[selectedBubble].count >= 4
                            ? (isDark ? '#3a0f18' : '#fde8ed')
                            : topicMap[selectedBubble].count >= 2
                            ? (isDark ? '#3a2800' : '#fdf2e0')
                            : (isDark ? '#003d30' : '#e0f8f2'),
                          color: topicMap[selectedBubble].count >= 4
                            ? (isDark ? '#ff8fa3' : '#9e2038')
                            : topicMap[selectedBubble].count >= 2
                            ? (isDark ? '#ffc266' : '#8a5208')
                            : (isDark ? '#00e5b0' : '#006050'),
                        }}>
                          {topicMap[selectedBubble].count >= 4 ? 'high gap' : topicMap[selectedBubble].count >= 2 ? 'med gap' : 'low gap'}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>
                        {topicMap[selectedBubble].count} worries · {topicMap[selectedBubble].habits.length} habits · {topicMap[selectedBubble].events.length} events
                      </div>
                      {topicMap[selectedBubble].habits.slice(0, 3).map(h => (
                        <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: `1px solid ${T.divider}`, fontSize: 12, color: T.muted }}>
                          <span style={{ width: 3, height: 3, borderRadius: '50%', background: T.green, flexShrink: 0 }} />
                          <span style={{ flex: 1 }}>{h.name}</span>
                          <span style={{ fontSize: 9, color: T.muted }}>habit</span>
                          <button onClick={() => deleteHabit(h.id)} style={delBtn}>×</button>
                        </div>
                      ))}
                      {topicMap[selectedBubble].events.slice(0, 3).map(e => (
                        <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: `1px solid ${T.divider}`, fontSize: 12, color: e.done ? T.muted : T.text, textDecoration: e.done ? 'line-through' : 'none' }}>
                          <span style={{ width: 3, height: 3, borderRadius: '50%', background: T.accent, flexShrink: 0 }} />
                          <span style={{ flex: 1 }}>{e.name}</span>
                          {e.deadline && <span style={{ fontSize: 9, color: T.muted }}>· {e.deadline}</span>}
                          <button onClick={() => deleteEvent(e.id)} style={delBtn}>×</button>
                        </div>
                      ))}

                      {/* Nudge inline */}
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.divider}` }}>
                        <div style={{ fontSize: 9, color: T.muted, marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Syne', sans-serif" }}>
                          schedule a nudge for this
                        </div>
                        {nudgeSentMap[selectedBubble] ? (
                          <div style={{ fontSize: 11, color: T.green, fontWeight: 600, padding: '6px 0' }}>
                            nudge scheduled ✓ — check your inbox
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input
                              type="email"
                              placeholder="your email"
                              value={nudgeEmail}
                              onChange={e => setNudgeEmail(e.target.value)}
                              style={{
                                flex: 1, background: T.inputBg,
                                border: `1.5px solid ${T.border}`, borderRadius: 8,
                                padding: '8px 10px', fontSize: 12, color: T.text,
                              }}
                              onFocus={e  => { e.target.style.borderColor = T.accent + '80'; e.target.style.boxShadow = `0 0 0 3px ${T.accent}10` }}
                              onBlur={e   => { e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none' }}
                            />
                            <button
                              onClick={() => sendBubbleNudge(selectedBubble, nudgeEmail)}
                              style={{
                                padding: '8px 14px',
                                background: nudgeEmail ? T.green : T.faint,
                                border: 'none', borderRadius: 8, color: nudgeEmail ? '#fff' : T.muted,
                                fontSize: 11, fontWeight: 700,
                                cursor: nudgeEmail ? 'pointer' : 'not-allowed',
                                whiteSpace: 'nowrap', transition: 'all 0.2s',
                              }}
                            >nudge me</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Topic list */}
                  <div style={{ maxHeight: 210, overflowY: 'auto' }}>
                    {topics.map(([topic, data]) => {
                      const c          = getColor(topic, isDark)
                      const actionsDone = data.events.filter(e => e.done).length
                      const actionsTotal = data.habits.length + data.events.length
                      const isSelected  = selectedBubble === topic
                      return (
                        <div key={topic}
                          onClick={() => setSelectedBubble(isSelected ? null : topic)}
                          style={{
                            background: c.bg,
                            border: `1.5px solid ${isSelected ? c.bubble : c.border}`,
                            borderRadius: 10, padding: '10px 12px', marginBottom: 6,
                            cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = c.bubble; e.currentTarget.style.transform = 'translateX(2px)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = isSelected ? c.bubble : c.border; e.currentTarget.style.transform = 'translateX(0)' }}
                        >
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: c.text, fontFamily: "'Syne', sans-serif" }}>{topic}</span>
                            <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                              {data.count} worries · {actionsDone}/{actionsTotal} done
                            </div>
                          </div>
                          <span style={{ fontSize: 22, fontWeight: 800, color: c.bubble, opacity: 0.8, fontFamily: "'Syne', sans-serif" }}>{data.count}×</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── ROW 2 : My Plan + Gap Score + Focus Timer ── */}
          <div
            id="plan-section"
            className="grid-3col"
            style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 16 }}
          >

            {/* ─── MY PLAN ─── */}
            <div style={{ ...card, background: T.surface, boxShadow: isDark ? `inset 0 0 40px ${T.green}05` : 'none' }}>
              <div style={sectionLabel}>
                my plan<span style={sectionLabelLine}></span>
              </div>

              {/* Habits */}
              <div style={{ fontSize: 11, color: T.green, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'Syne', sans-serif" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="1,6 4,9 11,2" stroke="currentColor" strokeWidth="2"/></svg>
                habits ({habits.length})
              </div>
              {habits.length === 0
                ? <div style={emptyBox}>no habits yet — rant to generate some</div>
                : (
                  <div style={{ marginBottom: 18 }}>
                    {habits.map(habit => {
                      const streak   = getStreak(habit)
                      const week     = getWeekDone(habit)
                      const c        = getColor(habit.topic, isDark)
                      const todayDone = week.find(d => d.date === getToday())?.done
                      return (
                        <div key={habit.id} style={{
                          background: T.card,
                          border: `1.5px solid ${todayDone ? T.green + '60' : T.border}`,
                          borderRadius: 12, padding: '13px 15px', marginBottom: 8, transition: 'border-color 0.2s',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>{habit.name}</div>
                              <span style={{ fontSize: 9, color: c.text, background: c.bg, padding: '2px 8px', borderRadius: 8, fontWeight: 600, border: `1px solid ${c.border}` }}>{habit.topic}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {streak > 0 && (
                                <span style={{ fontSize: 10, color: isDark ? '#ffc266' : '#8a5208', background: isDark ? '#3a2800' : '#fdf2e0', padding: '3px 8px', borderRadius: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                                  🔥 {streak}
                                </span>
                              )}
                              <button onClick={() => toggleHabit(habit.id)} style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: todayDone ? T.green : 'transparent',
                                border: `2px solid ${todayDone ? T.green : T.border}`,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s', flexShrink: 0,
                              }}
                              onMouseEnter={e => { if (!todayDone) e.currentTarget.style.borderColor = T.green }}
                              onMouseLeave={e => { if (!todayDone) e.currentTarget.style.borderColor = T.border }}>
                                {todayDone && <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="#fff" strokeWidth="2" fill="none" /></svg>}
                              </button>
                              <button onClick={() => deleteHabit(habit.id)} style={delBtn}>×</button>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {week.map(({ date, done }) => (
                              <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                <div style={{ fontSize: 8, color: T.muted }}>{dayLabel(date)}</div>
                                <div style={{
                                  width: '100%', height: 22, borderRadius: 5,
                                  background: done
                                    ? T.green
                                    : date === getToday()
                                    ? T.faint
                                    : T.faint,
                                  border: `1px solid ${date === getToday() ? T.accent + '50' : 'transparent'}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.2s',
                                }}>
                                  {done && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

              {/* Events */}
              <div style={{ fontSize: 11, color: T.accent, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'Syne', sans-serif" }}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="1" y="2" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><line x1="1" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1"/><line x1="3.5" y1="1" x2="3.5" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="7.5" y1="1" x2="7.5" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                events ({events.length})
              </div>
              {events.length === 0
                ? <div style={emptyBox}>no events yet — rant to generate some</div>
                : events.map(event => (
                  <div key={event.id} style={{
                    background: T.card, border: `1px solid ${T.border}`,
                    borderRadius: 10, padding: '10px 13px', marginBottom: 6,
                    display: 'flex', gap: 10, alignItems: 'center',
                    opacity: event.done ? 0.5 : 1, transition: 'opacity 0.2s',
                  }}>
                    <button onClick={() => toggleEvent(event.id, event.done)} style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: event.done ? T.accent : 'transparent',
                      border: `2px solid ${event.done ? T.accent : T.border}`,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (!event.done) e.currentTarget.style.borderColor = T.accent }}
                    onMouseLeave={e => { if (!event.done) e.currentTarget.style.borderColor = T.border }}>
                      {event.done && <svg width="9" height="9" viewBox="0 0 9 9"><polyline points="2,4.5 3.5,6 7,2.5" stroke="#fff" strokeWidth="2" fill="none" /></svg>}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: event.done ? T.muted : T.text, textDecoration: event.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {event.name}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
                        {event.deadline && <span style={{ fontSize: 9, color: T.muted }}>📆 {event.deadline}</span>}
                        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6, background: getColor(event.topic, isDark).bg, color: getColor(event.topic, isDark).text, border: `1px solid ${getColor(event.topic, isDark).border}` }}>{event.topic}</span>
                      </div>
                    </div>
                    <button onClick={() => deleteEvent(event.id)} style={delBtn}>×</button>
                  </div>
                ))
              }
            </div>

            {/* ─── GAP SCORE ─── */}
            <div style={card}>
              <div style={sectionLabel}>
                gap score<span style={sectionLabelLine}></span>
              </div>

              <WeeklyRecap userId="demo" />

              {/* Circular ring */}
              <div style={{ textAlign: 'center', padding: '14px 0 8px', position: 'relative' }}>
                <svg width="140" height="140" viewBox="0 0 140 140" style={{ display: 'block', margin: '0 auto' }}>
                  <circle cx="70" cy="70" r="56" fill="none" stroke={T.faint} strokeWidth="10"/>
                  <circle cx="70" cy="70" r="56" fill="none" stroke={ringColor} strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${circumference}`}
                    strokeDashoffset={`${ringOffset}`}
                    transform="rotate(-90 70 70)"
                    style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  fontFamily: "'Syne', sans-serif", fontSize: 48, fontWeight: 800, lineHeight: 1,
                  color: ringColor, marginTop: 14,
                }}>{gapScore}</div>
              </div>
              <div style={{ fontSize: 11, color: T.muted, textAlign: 'center', lineHeight: 1.5, marginBottom: 12 }}>
                {gapScore > 70 ? '— high, take action' : gapScore > 40 ? '— medium, keep going' : "— low, you're crushing it"}
              </div>

              <div style={{ borderTop: `1px solid ${T.divider}`, paddingTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, textAlign: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: T.accent, fontFamily: "'Syne', sans-serif" }}>{totalWorries}</div>
                  <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>worries</div>
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: T.green, fontFamily: "'Syne', sans-serif" }}>{totalActionsDone}</div>
                  <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>actions</div>
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: T.amber, fontFamily: "'Syne', sans-serif" }}>
                    {Math.round(totalWorries > 0 ? (totalActionsDone / totalWorries) * 100 : 0)}%
                  </div>
                  <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>progress</div>
                </div>
              </div>

              <div style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 9, color: T.accent, fontWeight: 700, marginBottom: 8, fontFamily: "'Syne', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>close the gap</div>
                {['complete daily habits', 'check off events on time', 'break worries into small steps', 'revisit your plan often'].map((tip, i) => (
                  <div key={i} style={{ fontSize: 11, color: T.muted, padding: '3px 0', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <span style={{ color: T.accent, flexShrink: 0 }}>→</span>{tip}
                  </div>
                ))}
              </div>
            </div>

            {/* ─── FOCUS TIMER ─── */}
            <div style={card}>
              <div style={sectionLabel}>
                focus timer<span style={sectionLabelLine}></span>
              </div>

              {topics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 10px', color: T.muted, fontSize: 12 }}>
                  rant to unlock focus bubbles
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                    {topics.map(([topic, data]) => {
                      const c        = getColor(topic, isDark)
                      const isActive = activeTopic === topic
                      return (
                        <button key={topic}
                          onClick={() => setActiveTopic(isActive ? null : topic)}
                          style={{
                            padding: '5px 11px', borderRadius: 20,
                            background: c.bg, border: `${isActive ? 2 : 1.5}px solid ${isActive ? c.bubble : c.border}`,
                            color: c.text, fontSize: 11, fontWeight: isActive ? 700 : 500,
                            cursor: 'pointer', transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', gap: 5,
                          }}
                        >
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.bubble }} />
                          {topic}
                          <span style={{ fontSize: 9, color: c.bubble }}>({data.count})</span>
                        </button>
                      )
                    })}
                  </div>

                  {activeTopic && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 46, fontWeight: 700,
                        color: T.text, background: T.inputBg,
                        padding: '16px 10px', borderRadius: 12, marginBottom: 12,
                        letterSpacing: '4px', border: `1px solid ${T.border}`,
                        position: 'relative', overflow: 'hidden',
                      }}>
                        {isRunning && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: T.green, animation: 'shimmer 1.5s infinite' }}></div>}
                        {fmt(timeLeft > 0 ? timeLeft : timerMinutes * 60)}
                      </div>

                      {!isRunning && timeLeft === 0 && (
                        <select value={timerMinutes} onChange={e => setTimerMinutes(parseInt(e.target.value))} style={{
                          width: '100%', background: T.inputBg, border: `1px solid ${T.border}`,
                          borderRadius: 8, padding: '8px 10px', color: T.text,
                          fontSize: 12, marginBottom: 10,
                        }}>
                          {[5, 10, 15, 20, 25, 30].map(m => <option key={m} value={m}>{m} minutes</option>)}
                        </select>
                      )}

                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 14 }}>
                        <button onClick={isRunning ? pauseTimer : startTimer} style={{
                          padding: '9px 24px',
                          background: isRunning ? T.amber : T.green,
                          border: 'none', borderRadius: 20, color: '#fff',
                          fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 16px ${isRunning ? T.amber : T.green}40` }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
                          {isRunning ? 'pause' : 'start'}
                        </button>
                        <button onClick={resetTimer} style={{
                          padding: '9px 14px', background: 'transparent',
                          border: `1px solid ${T.border}`, borderRadius: 20,
                          color: T.muted, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = T.muted; e.currentTarget.style.color = T.text }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted }}>reset</button>
                      </div>

                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 9, color: T.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>related worries</div>
                        <div style={{ maxHeight: 140, overflowY: 'auto' }}>
                          {topicMap[activeTopic]?.worries.slice(0, 4).map(w => (
                            <div key={w.id} style={{ fontSize: 11, color: T.muted, padding: '6px 0', borderBottom: `1px solid ${T.divider}`, lineHeight: 1.5, fontStyle: 'italic' }}>
                              "{w.text.length > 72 ? w.text.slice(0, 72) + '...' : w.text}"
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {!activeTopic && (
                    <div style={{ fontSize: 12, color: T.muted, textAlign: 'center', paddingTop: 10 }}>
                      select a concern above to start focusing
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── ROW 3 : Scheduled Nudges ── */}
          <div style={card}>
            <div style={sectionLabel}>
              scheduled nudges<span style={sectionLabelLine}></span>
            </div>
            <RemindersTab
              userEmail={userEmail}
              onEmailSave={em => {
                setUserEmail(em)
                setNudgeEmail(em)
                localStorage.setItem('3b_email', em)
              }}
            />
          </div>

        </main>
      </div>
    </div>
  )
}