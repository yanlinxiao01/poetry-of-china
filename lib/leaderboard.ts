import type { Poem } from './poems';

/** 单条成绩记录：某个昵称在某首诗上的一次通关。原始学习数据如实落库，不再折算分数 */
export interface ScoreEntry {
  id: string;
  poemSlug: string;
  nickname: string;
  seconds: number;
  mistakes: number;
  /** 听整句次数（旧数据缺省视为 0） */
  replays?: number;
  /** 展开拼音次数 */
  hints?: number;
  /** 点单字发音次数 */
  charTaps?: number;
  /** 一次通过的行数（未求助、未改错即过的行） */
  firstTry?: number;
  /** 该诗总行数 */
  lines?: number;
  createdAt: number;
}

/** 汇总后的玩家档案：用于全站榜，全部为可理解的原始统计 */
export interface PlayerSummary {
  nickname: string;
  /** 通关首数 */
  completed: number;
  /** 平均每首用时（秒） */
  avgSeconds: number;
  /** 累计用时（秒） */
  totalSeconds: number;
  /** 累计错误次数 */
  totalMistakes: number;
  /** 一次通过率 0~1：Σ一次通过行 / Σ总行 */
  firstTryRate: number;
  /** 累计求助次数（听整句 + 看拼音 + 点单字） */
  totalHelps: number;
  lastPlayed: number;
}

export const LOCAL_SCORES_KEY = 'poc-scores';
export const NICKNAME_KEY = 'poc-nickname';
export const SCORES_UPDATED_EVENT = 'poc-scores-updated';

const MAX_LOCAL = 400;

/** 昵称归一化：去首尾空格 + 小写，作为玩家唯一身份（Tom / tom /  Tom 视为同一人） */
export function normName(n: string): string {
  return n.trim().toLowerCase();
}

/** 单条记录的求助总数 */
function helps(e: ScoreEntry): number {
  return (e.replays ?? 0) + (e.hints ?? 0) + (e.charTaps ?? 0);
}

/** 单首诗内的透明阶梯：错误少 → 用时短 → 求助少 → 早提交。返回负数表示 a 更好 */
function betterEntry(a: ScoreEntry, b: ScoreEntry): number {
  return (
    a.mistakes - b.mistakes ||
    a.seconds - b.seconds ||
    helps(a) - helps(b) ||
    a.createdAt - b.createdAt
  );
}

/** 同一昵称在同一首诗只保留最好的一条（按透明阶梯） */
export function bestPerPoem(entries: ScoreEntry[], poems: Poem[]): ScoreEntry[] {
  const bySlug = new Map(poems.map((p) => [p.slug, p]));
  const map = new Map<string, ScoreEntry>();

  for (const e of entries) {
    if (!bySlug.has(e.poemSlug)) continue;
    const key = `${normName(e.nickname)}|${e.poemSlug}`;
    const cur = map.get(key);
    if (!cur || betterEntry(e, cur) < 0) {
      map.set(key, e);
    }
  }
  return [...map.values()];
}

/** 把一组成绩聚合成玩家档案：通关数、一次通过率、平均/累计用时、累计错误与求助 */
export function aggregatePlayers(entries: ScoreEntry[], poems: Poem[]): PlayerSummary[] {
  const best = bestPerPoem(entries, poems);
  const acc = new Map<
    string,
    PlayerSummary & { firstTrySum: number; linesSum: number }
  >();

  for (const e of best) {
    const key = normName(e.nickname);
    const p =
      acc.get(key) ??
      ({
        nickname: e.nickname,
        completed: 0,
        avgSeconds: 0,
        totalSeconds: 0,
        totalMistakes: 0,
        firstTryRate: 0,
        totalHelps: 0,
        lastPlayed: 0,
        firstTrySum: 0,
        linesSum: 0,
      } as PlayerSummary & { firstTrySum: number; linesSum: number });
    p.completed += 1;
    p.totalSeconds += e.seconds;
    p.totalMistakes += e.mistakes;
    p.totalHelps += helps(e);
    p.firstTrySum += e.firstTry ?? 0;
    p.linesSum += e.lines ?? 0;
    p.lastPlayed = Math.max(p.lastPlayed, e.createdAt);
    acc.set(key, p);
  }

  return [...acc.values()].map((p) => ({
    nickname: p.nickname,
    completed: p.completed,
    avgSeconds: Math.round(p.totalSeconds / Math.max(1, p.completed)),
    totalSeconds: p.totalSeconds,
    totalMistakes: p.totalMistakes,
    firstTryRate: p.linesSum > 0 ? p.firstTrySum / p.linesSum : 0,
    totalHelps: p.totalHelps,
    lastPlayed: p.lastPlayed,
  }));
}

/** 全站榜透明阶梯：通关多 → 一次通过率高 → 平均用时短 → 求助少 → 更早开始优先 */
export function rankPlayers(list: PlayerSummary[]): PlayerSummary[] {
  return [...list].sort(
    (a, b) =>
      b.completed - a.completed ||
      b.firstTryRate - a.firstTryRate ||
      a.avgSeconds - b.avgSeconds ||
      a.totalHelps - b.totalHelps ||
      a.lastPlayed - b.lastPlayed
  );
}

/** 单首诗内排序：错误少 → 用时短 → 求助少 → 早提交 */
export function rankScores(entries: ScoreEntry[], _poems: Poem[]): ScoreEntry[] {
  return [...entries].sort(betterEntry);
}

/** 某人在某首诗上的名次（诗卡上的小字用） */
export function poemRank(
  entries: ScoreEntry[],
  poem: Poem,
  nickname: string
): { rank: number; total: number; seconds: number; mistakes: number } | null {
  const ranked = rankScores(
    bestPerPoem(entries.filter((e) => e.poemSlug === poem.slug), [poem]),
    [poem]
  );
  const idx = ranked.findIndex((e) => normName(e.nickname) === normName(nickname));
  if (idx < 0) return null;
  const hit = ranked[idx];
  return {
    rank: idx + 1,
    total: ranked.length,
    seconds: hit.seconds,
    mistakes: hit.mistakes,
  };
}

/** 某个昵称在全站榜上的名次 */
export function playerStanding(
  entries: ScoreEntry[],
  poems: Poem[],
  nickname: string
): { rank: number; total: number; summary: PlayerSummary; pct: number } | null {
  const ranked = rankPlayers(aggregatePlayers(entries, poems));
  const idx = ranked.findIndex((p) => normName(p.nickname) === normName(nickname));
  if (idx < 0) return null;
  return {
    rank: idx + 1,
    total: ranked.length,
    summary: ranked[idx],
    pct: ranked.length > 0 ? Math.round((1 - idx / ranked.length) * 100) : 100,
  };
}

/** 本周起点（周一 00:00） */
export function startOfWeek(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.getTime();
}

export function loadLocalScores(): ScoreEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_SCORES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScoreEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalScore(entry: ScoreEntry): void {
  if (typeof window === 'undefined') return;
  try {
    const all = [entry, ...loadLocalScores()].slice(0, MAX_LOCAL);
    window.localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event(SCORES_UPDATED_EVENT));
  } catch {
    /* 隐私模式等场景忽略 */
  }
}

export function loadNickname(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(NICKNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveNickname(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NICKNAME_KEY, name);
  } catch {
    /* ignore */
  }
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
