// 모바일에서 확대(핀치 줌)된 상태를 원래 배율로 되돌림.
// SPA라 화면이 바뀌어도 페이지를 새로 불러오지 않아 확대 상태가 그대로 남기 때문에, 화면 전환 시 호출.
// viewport에 잠깐 maximum-scale=1을 걸어 배율을 1로 맞춘 뒤 원래대로 돌려놓음 → 이후에도 사용자는 다시 확대 가능
let originalContent = null; // 처음 한 번만 저장 (연달아 호출돼도 수정된 값을 원본으로 착각하지 않게)
let restoreTimer = null;

export function resetZoom() {
  window.scrollTo(0, 0);
  const vv = window.visualViewport;
  if (!vv || vv.scale <= 1.01) return;
  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  if (originalContent === null) originalContent = meta.getAttribute("content");
  meta.setAttribute("content", `${originalContent}, maximum-scale=1`);
  clearTimeout(restoreTimer);
  restoreTimer = setTimeout(() => meta.setAttribute("content", originalContent), 300);
}
