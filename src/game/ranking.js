// 랭킹 (Supabase rankings 테이블) 조회·등록
import { supabase } from "../supabase";

// 점수는 소수 둘째 자리까지 저장
export function roundScore(v) {
  return Math.round(v * 100) / 100;
}

// 시즌: 새 시즌을 열 때 CURRENT_SEASON을 올리고 SEASONS에 추가 (DB rankings.season 기본값도 함께 변경)
export const CURRENT_SEASON = 2;
export const SEASONS = [2, 1]; // 최신 시즌부터

// 라운드 우선, 같은 라운드면 점수 순
export function fetchRankings(difficulty, limit, nicknameQuery = "", season = CURRENT_SEASON) {
  let req = supabase.from("rankings").select("*")
    .eq("season", season).eq("difficulty", difficulty).order("round", { ascending: false }).order("score", { ascending: false }).limit(limit);
  if (nicknameQuery.trim() !== "") req = req.ilike("nickname", `%${nicknameQuery.trim()}%`);
  return req;
}

// 등록 전 예상 순위: 나보다 라운드가 높거나, 같은 라운드에서 점수가 높은 기록 수 + 1
export async function fetchPreRank(score, difficulty, round) {
  const finalScore = roundScore(score);
  const { count } = await supabase
    .from("rankings").select("*", { count: "exact", head: true })
    .eq("season", CURRENT_SEASON).eq("difficulty", difficulty)
    .or(`round.gt.${round},and(round.eq.${round},score.gt.${finalScore})`);
  return (count ?? 0) + 1;
}

// loadout: 게임오버 시점의 조합·패시브 키를 쉼표로 이은 문자열 (예: "goldenHand,hourglass,opSense")
export async function insertRanking({ nickname, score, difficulty, round, loadout }) {
  const row = { nickname, score, difficulty, round, season: CURRENT_SEASON };
  const res = await supabase.from("rankings").insert([loadout ? { ...row, loadout } : row]);
  // DB에 loadout 칸이 아직 없을 때를 대비: 아이콘 정보만 빼고 다시 등록
  if (res.error && loadout && /loadout/i.test(res.error.message || "")) {
    return supabase.from("rankings").insert([row]);
  }
  return res;
}
