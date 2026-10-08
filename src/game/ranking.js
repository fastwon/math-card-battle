// 랭킹 (Supabase rankings 테이블) 조회·등록
import { supabase } from "../supabase";

// 점수는 소수 둘째 자리까지 저장
export function roundScore(v) {
  return Math.round(v * 100) / 100;
}

// 라운드 우선, 같은 라운드면 점수 순
export function fetchRankings(difficulty, limit, nicknameQuery = "") {
  let req = supabase.from("rankings").select("*")
    .eq("difficulty", difficulty).order("round", { ascending: false }).order("score", { ascending: false }).limit(limit);
  if (nicknameQuery.trim() !== "") req = req.ilike("nickname", `%${nicknameQuery.trim()}%`);
  return req;
}

// 등록 전 예상 순위: 나보다 라운드가 높거나, 같은 라운드에서 점수가 높은 기록 수 + 1
export async function fetchPreRank(score, difficulty, round) {
  const finalScore = roundScore(score);
  const { count } = await supabase
    .from("rankings").select("*", { count: "exact", head: true })
    .eq("difficulty", difficulty)
    .or(`round.gt.${round},and(round.eq.${round},score.gt.${finalScore})`);
  return (count ?? 0) + 1;
}

export function insertRanking({ nickname, score, difficulty, round }) {
  return supabase.from("rankings").insert([{ nickname, score, difficulty, round }]);
}
