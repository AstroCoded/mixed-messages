// Mixed Messages — POC (React)
// Cumulative phrase build, reverse-stagger phrase fade-out (<=1s), configurable next-phrase delay

import React, { useEffect, useMemo, useRef, useState } from 'react'

// ------------ Config ------------
const ROWS = 8
const COLS = 12
const POT_PX = 100 // circle size
const GAP_PX = 12

// timings (ms)
const FADE_MS = 1500 // visual fade duration for each circle/text
const HOLD_MS = 2500 // how long the last-added word stays fully visible before phrase fade-out
const BUILD_STEP_MS = 1000 // spacing between each word's fade-in
const NEXT_PHRASE_DELAY_MS = 2000 // wait after phrase fully faded out (stagger finished) before next phrase starts

// 20 motivational phrases (3–8 words each)
const PHRASES = [
  'START SMALL SHINE BRIGHT',
  'CHOOSE JOY THEN BUILD BRAVELY',
  'LEAD WITH KINDNESS AND COURAGE',
  'LIGHT THE PATH FOR OTHERS',
  'MAKE SPACE FOR WONDER',
  'ONE TEAM LIFT EACH OTHER',
  'CELEBRATE SMALL WINS DAILY',
  'LISTEN DEEPLY THEN MOVE FORWARD',
  'CURIOUS MINDS CREATE BETTER FUTURES',
  'BRAVE IDEAS BLOOM WITH CARE',
  'SPARK HOPE THROUGH CLEAR ACTIONS',
  'KEEP GOING YOU ARE GROWING',
  'SHARE CREDIT OWN THE CHALLENGE',
  'PAUSE BREATHE FOCUS THEN ACT',
  'SET KIND BOUNDARIES PROTECT FOCUS',
  'WRITE IT DOWN MAKE IT REAL',
  'ASK GOOD QUESTIONS FIND NEW LIGHT',
  'SAY THANK YOU MEAN IT',
  'BUILD TRUST WITH EVERY TOUCHPOINT',
  'PROGRESS WITH PLAYFUL POSITIVE ENERGY',
]

// Whimsical filler words
const FILLER = [
  'SUNBEAM',
  'BREEZE',
  'STARDUST',
  'TWINKLE',
  'GIGGLE',
  'CONFETTI',
  'BUBBLE',
  'FEATHER',
  'MEADOW',
  'SKYLARK',
  'RAINBOW',
  'MOONBEAM',
  'WHIMSY',
  'WONDER',
  'CHEER',
  'BRIGHT',
  'PLAYFUL',
  'UPLIFT',
  'LILT',
  'LIGHTNESS',
  'MAGIC',
  'MARVEL',
  'SMILE',
  'BLOSSOM',
  'HEARTEN',
  'ZENITH',
  'ZEST',
  'GLOW',
  'GLIMMER',
  'SHIMMER',
  'SERENE',
  'BREEZY',
  'SUNLIT',
  'HOPE',
  'KINDNESS',
  'GRACE',
  'HARMONY',
  'LUCKY',
  'SPIRIT',
  'BOLD',
  'BRIGHTEN',
  'SOAR',
  'LIFT',
  'RADIANT',
  'TRUST',
  'PEACE',
  'UNITY',
  'CALM',
  'JOYFUL',
  'SPARKLE',
  'COURAGE',
  'CURIOUS',
  'DREAM',
  'KIND',
  'MIRTH',
  'CHEERY',
  'HUG',
  'RIPPLE',
  'SING',
  'SWAY',
]

// Pastel color palette for fade-in
const PASTEL_COLORS = [
  '#F8BBD0',
  '#E1BEE7',
  '#BBDEFB',
  '#B2EBF2',
  '#C8E6C9',
  '#FFF9C4',
  '#FFCCBC',
  '#D7CCC8',
  '#F0F4C3',
  '#DCEDC8',
  '#FFE0B2',
  '#D1C4E9',
  '#B3E5FC',
  '#C5CAE9',
  '#FFECB3',
  '#F48FB1',
  '#80CBC4',
  '#A5D6A7',
  '#FFAB91',
  '#B39DDB',
]

function shuffle(arr, rng = Math.random) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Choose one index per word in phrase order; keep row-major progression when possible
export function chooseOrderedIndices(words, indexMap) {
  const sortedMap = {}
  for (const w of words) {
    sortedMap[w] = (indexMap[w] || []).slice().sort((a, b) => a - b)
  }
  const picks = []
  let last = -1
  for (const w of words) {
    const pool = sortedMap[w]
    if (!pool || pool.length === 0) continue
    let pick = pool.find((idx) => idx > last)
    if (pick === undefined) pick = pool[0]
    picks.push(pick)
    last = pick
  }
  return picks
}

export default function MixedMessagesPOC() {
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [order, setOrder] = useState(() =>
    shuffle([...Array(PHRASES.length).keys()])
  )
  const [orderPos, setOrderPos] = useState(0)
  const [phraseIdx, setPhraseIdx] = useState(
    () => shuffle([...Array(PHRASES.length).keys()])[0]
  )
  const [lit, setLit] = useState(new Set())
  const [circleColors, setCircleColors] = useState({})

  const timerRef = useRef(null)
  const buildTimersRef = useRef([])
  const phraseIndicesRef = useRef([]) // track indices lit for current phrase (in order)

  const { gridWords, wordIndex } = useMemo(() => {
    const phraseWords = PHRASES.map((p) => p.toUpperCase().split(/\s+/))
    const vocabSet = new Set(phraseWords.flat())
    const vocab = Array.from(vocabSet)

    const cellCount = ROWS * COLS
    const wordsForGrid = []

    for (const w of shuffle(vocab)) wordsForGrid.push(w)

    let fillerPool = FILLER.slice()
    while (wordsForGrid.length < cellCount) {
      if (fillerPool.length === 0) fillerPool = FILLER.slice()
      wordsForGrid.push(
        fillerPool[Math.floor(Math.random() * fillerPool.length)]
      )
    }

    const shuffled = shuffle(wordsForGrid)

    const map = {}
    shuffled.forEach((w, i) => {
      if (!map[w]) map[w] = []
      map[w].push(i)
    })

    return { gridWords: shuffled, wordIndex: map }
  }, [])

  const allPhraseWords = useMemo(
    () => PHRASES.map((p) => p.toUpperCase().split(/\s+/)),
    []
  )

  // ------------ Phrase scheduling (cumulative build + reverse-stagger fade-out) ------------
  useEffect(() => {
    function clearAllTimers() {
      for (const id of buildTimersRef.current) window.clearTimeout(id)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      buildTimersRef.current = []
      timerRef.current = null
    }

    function startSequence() {
      clearAllTimers()

      const baseWords = allPhraseWords[phraseIdx] || []
      const displayWords = baseWords.slice(0, 8) // clamp to 8 max
      const indices = chooseOrderedIndices(displayWords, wordIndex)

      // speed-scaled delay (your normal timing)
      const addDelay = (t, fn) => {
        const id = window.setTimeout(fn, Math.max(1, t / speed))
        buildTimersRef.current.push(id)
      }
      // real-time (unscaled) delay: ensures stagger finishes within ~1s regardless of speed slider
      const addDelayNoScale = (t, fn) => {
        const id = window.setTimeout(fn, Math.max(1, t))
        buildTimersRef.current.push(id)
      }

      let t = 0
      const WORD_STEP_MS = BUILD_STEP_MS

      // Fade in the first word
      addDelay(t, () => {
        const firstIdx = indices[0]
        if (typeof firstIdx === 'number') {
          const color =
            PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)]
          setCircleColors((prev) => ({ ...prev, [firstIdx]: color }))
          setLit((prev) => {
            const next = new Set(prev)
            next.add(firstIdx)
            return next
          })
          phraseIndicesRef.current = [firstIdx]
        } else {
          phraseIndicesRef.current = []
        }
      })

      // Fade in remaining words cumulatively (no per-word fade-out)
      for (let k = 1; k < indices.length; k++) {
        const idx = indices[k]
        t += WORD_STEP_MS
        addDelay(t, () => {
          const color =
            PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)]
          setCircleColors((prev) => ({ ...prev, [idx]: color }))
          setLit((prev) => {
            const next = new Set(prev)
            next.add(idx)
            return next
          })
          phraseIndicesRef.current = [...phraseIndicesRef.current, idx]
        })
      }

      // After last word is built, hold, then reverse-stagger fade-out the entire phrase
      const phraseBuiltAt = t // time when last word started
      const afterHold = phraseBuiltAt + HOLD_MS

      addDelay(afterHold, () => {
        const current = (phraseIndicesRef.current || []).slice().reverse() // reverse order
        if (current.length === 0) return

        const totalStagger = 1000 // <=1s total
        const step = Math.max(1, Math.floor(totalStagger / current.length))

        current.forEach((cellIdx, j) => {
          addDelayNoScale(step * j, () => {
            setLit((prev) => {
              const next = new Set(prev)
              next.delete(cellIdx)
              return next
            })
          })
        })

        // After stagger finished, wait extra gap, then advance to next phrase
        addDelayNoScale(totalStagger + NEXT_PHRASE_DELAY_MS, () => {
          setOrderPos((pos) => {
            const nextPos = pos + 1
            if (nextPos < order.length) {
              setPhraseIdx(order[nextPos])
              return nextPos
            } else {
              const newOrder = shuffle([...Array(PHRASES.length).keys()])
              setOrder(newOrder)
              setPhraseIdx(newOrder[0])
              return 0
            }
          })
        })
      })
    }

    if (playing) {
      startSequence()
      return clearAllTimers
    } else {
      clearAllTimers()
    }
  }, [playing, phraseIdx, allPhraseWords, wordIndex, speed])

  // ------------ Layout sizes ------------
  const wallW = COLS * POT_PX + (COLS - 1) * GAP_PX
  const wallH = ROWS * POT_PX + (ROWS - 1) * GAP_PX

  // ------------ Render ------------
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#0f0f10',
        color: '#e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 16px',
      }}
    >
      {/* Header / Controls */}
      <div
        style={{
          width: '100%',
          maxWidth: 1100,
          padding: '0 8px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}
        >
          Mixed Messages — POC
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setPlaying((p) => !p)}
            style={{
              padding: '8px 12px',
              borderRadius: 16,
              border: '1px solid #3f3f46',
              background: 'transparent',
              color: '#e5e7eb',
              cursor: 'pointer',
            }}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Speed</span>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            style={{ width: 180 }}
          />
          <span
            style={{
              width: 36,
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
              fontSize: 12,
            }}
          >
            {speed.toFixed(1)}×
          </span>
        </div>
      </div>

      {/* Grid Wall */}
      <div
        style={{
          background: '#0b0b0c',
          border: '1px solid #1f2024',
          borderRadius: 24,
          padding: 24,
          boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, ${POT_PX}px)`,
            gridAutoRows: `${POT_PX}px`,
            gap: `${GAP_PX}px`,
            width: wallW,
            height: wallH,
          }}
        >
          {gridWords.map((word, i) => {
            const isLit = lit.has(i)
            const color = circleColors[i] || '#2a2b30'
            return (
              <div
                key={i}
                style={{
                  position: 'relative',
                  width: POT_PX,
                  height: POT_PX,
                  display: 'grid',
                  placeItems: 'center',
                  transition: `all ${FADE_MS}ms ease`,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    backgroundColor: isLit ? color : '#2a2b30',
                    boxShadow: isLit
                      ? '0 0 24px rgba(255,255,255,0.15) inset, 0 0 24px rgba(255,255,255,0.12)'
                      : 'none',
                    opacity: isLit ? 1 : 0.4, // visual clarity on fade
                    transition: `opacity ${FADE_MS}ms ease, background-color ${FADE_MS}ms ease, box-shadow ${FADE_MS}ms ease`,
                  }}
                />
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    fontWeight: 700,
                    userSelect: 'none',
                    color: isLit ? '#000000' : '#5f6066',
                    fontSize: 14,
                    letterSpacing: 0.2,
                    textAlign: 'center',
                    lineHeight: 1,
                    transition: `color ${FADE_MS}ms ease`,
                  }}
                >
                  {word}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
