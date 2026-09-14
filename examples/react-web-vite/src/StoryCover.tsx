import { useEffect, useId, useRef, useState } from 'react'
import type { StoryId } from '../../shared/stories'

// Original Flutter cover geometry, ported to SVG. Text and controls are separate.
export function StoryCover({ id }: { id: StoryId }) {
  const glow = useId()
  const svg = useRef<SVGSVGElement>(null)
  const [aspect, setAspect] = useState(1)
  useEffect(() => {
    if (!svg.current || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.height) setAspect(entry.contentRect.width / entry.contentRect.height / 1.5)
    })
    observer.observe(svg.current)
    return () => observer.disconnect()
  }, [])
  return <svg ref={svg} className="cover-art" viewBox="0 0 600 400" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    {id === 'atlas' && <>
      <path fill="#D5DCC6" d="M0 0h600v400H0z" />
      {Array.from({ length: 15 }, (_, i) => <ellipse key={i} cx="484" cy="345" rx={(94 + i * 13) / aspect} ry={94 + i * 13} fill="none" stroke="#708B79" strokeOpacity=".23" strokeWidth="1.3" />)}
      <ellipse cx="457" cy="157" rx={39 / aspect} ry="39" fill="#D58C4E" />
      <path d="M0 290C140 340 207 345 348 278C440 231 500 254 600 267V400H0Z" fill="#547D79" />
      <path d="M0 341C166 379 304 265 600 319V400H0Z" fill="#244E52" />
      <path d="M0 386C163 315 321 397 600 354V400H0Z" fill="#163A41" />
    </>}
    {id === 'lantern' && <>
      <path fill="#243E59" d="M0 0h600v400H0z" />
      {Array.from({ length: 28 }, (_, i) => <ellipse key={i} cx={(i * 97 + 37) % 600} cy={(i * 43 + 27) % 260} rx={(i % 3 === 0 ? 2 : 1) / aspect} ry={i % 3 === 0 ? 2 : 1} fill="#B4CBC9" />)}
      <ellipse cx="463" cy="113" rx={41 / aspect} ry="41" fill="#F0D6A0" /><ellipse cx="449" cy="102" rx={37 / aspect} ry="37" fill="#243E59" />
      <path d="M0 319L141 147L311 339L463 206L600 328V400H0Z" fill="#3B5A69" />
      <path d="M0 368L207 222L361 373L505 285L600 355V400H0Z" fill="#182C42" />
      <defs><radialGradient id={glow}><stop stopColor="#F4B35A" stopOpacity=".6" /><stop offset="1" stopColor="#F4B35A" stopOpacity="0" /></radialGradient></defs>
      <ellipse cx="316" cy="316" rx={50 / aspect} ry="50" fill={`url(#${glow})`} />
      <rect x="307" y="299" width="18" height="30" rx="4" fill="#F4BE69" /><path d="M308 299a8 8 0 0 1 16 0" fill="none" stroke="#F4BE69" strokeWidth="2" />
    </>}
    {id === 'garden' && <>
      <path fill="#E8CBAC" d="M0 0h600v400H0z" /><ellipse cx="468" cy="128" rx={69 / aspect} ry="69" fill="#D99D7E" />
      <path d="M0 325Q277 244 600 318V400H0Z" fill="#698475" />
      {Array.from({ length: 6 }, (_, i) => {
        const x = 70 + i * 99, y = 240 + (i % 3) * 37
        return <g key={i}>
          <path d={`M${x} 410Q${x - 18} ${y + 50} ${x} ${y}`} fill="none" stroke="#34584E" strokeWidth="3" />
          {Array.from({ length: 3 }, (_, j) => <g key={j}>
            <ellipse cx={x - 17} cy={y + 35 + j * 33} rx="17.5" ry="7" fill="#34584E" />
            <ellipse cx={x + 12} cy={y + 50 + j * 33} rx="15" ry="6.5" fill="#43695A" />
          </g>)}
          <ellipse cx={x} cy={y} rx={11 / aspect} ry="11" fill="#F2DFB6" /><ellipse cx={x} cy={y} rx={4 / aspect} ry="4" fill="#BB7456" />
        </g>
      })}
    </>}
  </svg>
}
