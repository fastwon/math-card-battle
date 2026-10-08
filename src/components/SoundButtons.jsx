import { useState } from "react";
import { play, isMuted, setMuted } from "../sfx";
import { isBgmMuted, setBgmMuted } from "../bgm";

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
      <button onClick={toggleBgm} title={bgmMuted ? "배경음악 켜기" : "배경음악 끄기"} style={{ ...btn, opacity: bgmMuted ? 0.4 : 1, textDecoration: bgmMuted ? "line-through" : "none" }}>🎵</button>
      <button onClick={toggleSfx} title={sfxMuted ? "효과음 켜기" : "효과음 끄기"} style={btn}>{sfxMuted ? "🔇" : "🔊"}</button>
    </div>
  );
}
