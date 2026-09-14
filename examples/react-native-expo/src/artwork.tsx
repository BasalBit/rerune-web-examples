import { useId, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Path, Ellipse, Rect, Defs, RadialGradient, Stop, G } from 'react-native-svg'
import type { StoryId } from '../../shared/stories'

type IconName = 'book' | 'library' | 'discover' | 'bookmark' | 'settings' | 'globe' | 'back' | 'arrow' | 'refresh' | 'close'
export function Icon({ name, color = '#A5ADBA', size = 24, filled = false }: { name: IconName; color?: string; size?: number; filled?: boolean }) {
  const paths: Record<IconName, string> = {
    book: 'M3 5c3-1 6-1 9 1v15c-3-2-6-2-9-1V5Zm9 1c3-2 6-2 9-1v15c-3-1-6-1-9 1M15 4v11l4-3V1Z',
    library: 'M7 3h14v16H7zM3 7v16h14M10 7h8M10 11h8M10 15h4',
    discover: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM16 8l-3 5-5 3 3-5 5-3Z',
    bookmark: 'M6 3h12v19l-6-3-6 3V3Z',
    settings: 'M3 6h18M3 12h18M3 18h18M8 3v6M16 9v6M10 15v6',
    globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M4 6h16M4 18h16M12 2c-6 5-6 15 0 20 6-5 6-15 0-20Z',
    back: 'M20 12H4m7-7-7 7 7 7', arrow: 'M4 12h16m-7-7 7 7-7 7',
    refresh: 'M20 8a8 8 0 1 0 0 8M20 3v5h-5', close: 'm6 6 12 12M6 18 18 6',
  }
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}><Path d={paths[name]} fill={filled ? color : 'none'} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
}

export function StoryCover({ id }: { id: StoryId }) {
  const glow = useId().replaceAll(':', '')
  const [aspect, setAspect] = useState(1)
  return <View pointerEvents="none" style={StyleSheet.absoluteFillObject} onLayout={event => {
    const { width, height } = event.nativeEvent.layout
    if (height) setAspect(width / height / 1.5)
  }}><Svg width="100%" height="100%" viewBox="0 0 600 400" preserveAspectRatio="none" accessible={false}>
    {id === 'atlas' && <>
      <Path fill="#D5DCC6" d="M0 0h600v400H0z" />
      {Array.from({ length: 15 }, (_, i) => <Ellipse key={i} cx="484" cy="345" rx={(94 + i * 13) / aspect} ry={94 + i * 13} fill="none" stroke="#708B79" strokeOpacity=".23" strokeWidth="1.3" />)}
      <Ellipse cx="457" cy="157" rx={39 / aspect} ry="39" fill="#D58C4E" />
      <Path d="M0 290C140 340 207 345 348 278C440 231 500 254 600 267V400H0Z" fill="#547D79" />
      <Path d="M0 341C166 379 304 265 600 319V400H0Z" fill="#244E52" />
      <Path d="M0 386C163 315 321 397 600 354V400H0Z" fill="#163A41" />
    </>}
    {id === 'lantern' && <>
      <Path fill="#243E59" d="M0 0h600v400H0z" />
      {Array.from({ length: 28 }, (_, i) => <Ellipse key={i} cx={(i * 97 + 37) % 600} cy={(i * 43 + 27) % 260} rx={(i % 3 === 0 ? 2 : 1) / aspect} ry={i % 3 === 0 ? 2 : 1} fill="#B4CBC9" />)}
      <Ellipse cx="463" cy="113" rx={41 / aspect} ry="41" fill="#F0D6A0" /><Ellipse cx="449" cy="102" rx={37 / aspect} ry="37" fill="#243E59" />
      <Path d="M0 319L141 147L311 339L463 206L600 328V400H0Z" fill="#3B5A69" />
      <Path d="M0 368L207 222L361 373L505 285L600 355V400H0Z" fill="#182C42" />
      <Defs><RadialGradient id={glow}><Stop stopColor="#F4B35A" stopOpacity=".6" /><Stop offset="1" stopColor="#F4B35A" stopOpacity="0" /></RadialGradient></Defs>
      <Ellipse cx="316" cy="316" rx={50 / aspect} ry="50" fill={`url(#${glow})`} />
      <Rect x="307" y="299" width="18" height="30" rx="4" fill="#F4BE69" /><Path d="M308 299a8 8 0 0 1 16 0" fill="none" stroke="#F4BE69" strokeWidth="2" />
    </>}
    {id === 'garden' && <>
      <Path fill="#E8CBAC" d="M0 0h600v400H0z" /><Ellipse cx="468" cy="128" rx={69 / aspect} ry="69" fill="#D99D7E" />
      <Path d="M0 325Q277 244 600 318V400H0Z" fill="#698475" />
      {Array.from({ length: 6 }, (_, i) => {
        const x = 70 + i * 99, y = 240 + (i % 3) * 37
        return <G key={i}>
          <Path d={`M${x} 410Q${x - 18} ${y + 50} ${x} ${y}`} fill="none" stroke="#34584E" strokeWidth="3" />
          {Array.from({ length: 3 }, (_, j) => <G key={j}>
            <Ellipse cx={x - 17} cy={y + 35 + j * 33} rx="17.5" ry="7" fill="#34584E" />
            <Ellipse cx={x + 12} cy={y + 50 + j * 33} rx="15" ry="6.5" fill="#43695A" />
          </G>)}
          <Ellipse cx={x} cy={y} rx={11 / aspect} ry="11" fill="#F2DFB6" /><Ellipse cx={x} cy={y} rx={4 / aspect} ry="4" fill="#BB7456" />
        </G>
      })}
    </>}
  </Svg></View>
}
