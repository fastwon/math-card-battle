import { useState } from "react";
import { play, isMuted, setMuted } from "../sfx";
import { isBgmMuted, setBgmMuted } from "../bgm";

// 음표 아이콘 (🎵 이모지는 윈도우에서 어둡게 그려져 잘 안 보여서 직접 그림). off면 회색 + 빨간 사선
function MusicIcon({ off }) {
  const c = off ? "#9ca3af" : "#fff";
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden style={{ filter: off ? "none" : "drop-shadow(0 0 3px rgba(192,132,252,0.9))" }}>
      <path d="M9 18V5l11-2v13" fill="none" stroke={c} strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" fill={c} />
      <circle cx="17" cy="16" r="3" fill={c} />
      {off && <line x1="3" y1="3" x2="21" y2="21" stroke="#f87171" strokeWidth="2.6" strokeLinecap="round" />}
    </svg>
  );
}

// 🎵 배경음악 / 🔊 효과음 각각 켜고 끄기
export default function SoundButtons({ style }) {
  const [sfxMuted, setSfxM] = useState(isMuted());
  const [bgmMuted, setBgmM] = useState(isBgmMuted());
  const btn = { width:30, height:28, borderRadius:10, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.07)", cursor:"pointer", fontSize:13, lineHeight:1, padding:0 };
  function toggleBgm() {
    setBgmMuted(!bgmMuted);
    setBgmM(!bgmMuted);
  }
  function toggleSfx() {
    setMuted(!sfxMuted);
    setSfxM(!sfxMuted);
    if (sfxMuted) play("click");
  }
  return (
    <div style={{ display:"flex", gap:4, ...style }}>
      <button onClick={toggleBgm} title={bgmMuted ? "배경음악 켜기" : "배경음악 끄기"} style={{ ...btn, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <MusicIcon off={bgmMuted} />
      </button>
      <button onClick={toggleSfx} title={sfxMuted ? "효과음 켜기" : "효과음 끄기"} style={btn}>{sfxMuted ? "🔇" : "🔊"}</button>
    </div>
  );
}
