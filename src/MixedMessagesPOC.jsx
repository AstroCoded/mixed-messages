// Mixed Messages — Web POC (React)
// FADE_MS=1500; random pastel per fade-in; single-word mode; 100px circles; 1.5s phrase pause

import React, { useEffect, useMemo, useRef, useState } from 'react'

// ------------ Config ------------
const ROWS = 8
const COLS = 12
const POT_PX = 100 // circle size
const GAP_PX = 12

// timings (ms)
const FADE_MS = 1500 // fade duration
const HOLD_MS = 1800 // how long a single word stays fully visible
const BUILD_STEP_MS = 1000 // time between word starts; next starts when prev is 75% faded
const PHRASE_PAUSE_MS = 1500 // pause between phrases

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

  function clearTimers() {
    for (const id of buildTimersRef.current) window.clearTimeout(id)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    buildTimersRef.current = []
    timerRef.current = null
  }

  function advancePhrase() {
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
  }

  useEffect(() => {
    function startSequence() {
      clearTimers()
      setLit(new Set())

      const baseWords = allPhraseWords[phraseIdx] || []
      const displayWords = baseWords.slice(0, 8)
      const indices = chooseOrderedIndices(displayWords, wordIndex)

      const addDelay = (t, fn) => {
        const id = window.setTimeout(fn, Math.max(1, t / speed))
        buildTimersRef.current.push(id)
      }

      let t = 0
      const fadeOverlapStart = HOLD_MS
      const nextStartOffset = HOLD_MS + 0.75 * FADE_MS

      indices.forEach((idx) => {
        addDelay(t, () => {
          const color =
            PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)]
          setCircleColors((prev) => ({ ...prev, [idx]: color }))
          setLit(new Set([idx]))
        })
        addDelay(t + fadeOverlapStart, () => setLit(new Set()))
        t += nextStartOffset
      })

      const totalTime =
        (indices.length - 1) * nextStartOffset +
        fadeOverlapStart +
        FADE_MS +
        PHRASE_PAUSE_MS
      addDelay(totalTime, advancePhrase)
    }

    if (playing) {
      startSequence()
      return clearTimers
    } else {
      clearTimers()
    }
  }, [playing, phraseIdx, allPhraseWords, wordIndex, speed])

  const wallW = COLS * POT_PX + (COLS - 1) * GAP_PX
  const wallH = ROWS * POT_PX + (ROWS - 1) * GAP_PX

  return (
    <div
      className="min-h-screen w-full text-zinc-200 flex flex-col items-center py-10"
      style={{ backgroundColor: '#0f0f10' }}
    >
      <div className="w-full max-w-5xl px-4 mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          Mixed Messages — Web POC
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="px-3 py-1.5 rounded-2xl shadow-sm border border-zinc-700 hover:border-zinc-500 transition"
            style={{ background: 'transparent' }}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <label className="text-sm opacity-80">Speed</label>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-40"
          />
          <div className="w-10 text-right tabular-nums text-sm">
            {speed.toFixed(1)}×
          </div>
        </div>
      </div>

      <div
        className="rounded-3xl shadow-2xl p-6"
        style={{ background: '#0b0b0c', border: '1px solid #1f2024' }}
      >
        <div
          className="grid"
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
                  position: 'relative', // 👈 no Tailwind; inline instead
                  width: POT_PX,
                  height: POT_PX, // or: aspectRatio: '1 / 1' (either is fine)
                  display: 'grid',
                  placeItems: 'center', // centers the text
                  transition: `all ${FADE_MS}ms ease`,
                }}
              >
                <div
                  style={{
                    position: 'absolute', // 👈 no Tailwind; inline instead
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%', // hard circle
                    backgroundColor: isLit ? color : '#2a2b30',
                    boxShadow: isLit
                      ? '0 0 24px rgba(255,255,255,0.15) inset, 0 0 24px rgba(255,255,255,0.12)'
                      : 'none',
                    transition: `all ${FADE_MS}ms ease`,
                  }}
                />
                <div
                  style={{
                    position: 'relative', // stays above the circle
                    zIndex: 1,
                    fontWeight: 700,
                    userSelect: 'none',
                    color: isLit ? '#000000' : '#5f6066',
                    fontSize: 14,
                    letterSpacing: 0.2,
                    textAlign: 'center',
                    transition: `color ${FADE_MS}ms ease`,
                    lineHeight: 1,
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
