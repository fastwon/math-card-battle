export const SITE_URL = "https://math-card-battle.vercel.app";

// 텍스트 복사 (clipboard API가 막힌 환경 대비 fallback 포함)
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { /* 무시 */ }
    ta.remove();
    return ok;
  }
}

// 휴대폰: 기기 공유 창(카톡·문자 등) / PC: 클립보드 복사
// 반환: "shared" | "aborted" | "copied" | "failed"
export async function shareOrCopy(text) {
  const isTouch = window.matchMedia?.("(pointer: coarse)").matches;
  if (isTouch && navigator.share) {
    try {
      await navigator.share({ title: "수학 카드 배틀", text, url: SITE_URL });
      return "shared";
    } catch (e) {
      if (e?.name === "AbortError") return "aborted"; // 사용자가 공유 창을 닫음
    }
  }
  return (await copyText(`${text}\n👉 ${SITE_URL}`)) ? "copied" : "failed";
}
