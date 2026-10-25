import type { Poem } from './poems';

/**
 * 诗的展示层共享常量与工具 —— 客户端安全（不依赖 fs/path）。
 * 诗卡、填字游戏、排行榜等所有涉及诗的版式都从这里取，改版式只改这一处。
 */

/** 中文衬线字体栈：诗题、诗句、数字（通关/计时）统一使用 */
export const POEM_SERIF = '"Noto Serif SC", "Songti SC", "STSong", "SimSun", serif';

/** 单个汉字判定 */
export const CJK_CHAR = /[一-鿿]/;

/** 该诗的汉字总数（不含标点），用于字数统计与速度基准 */
export function poemChars(poem: Poem): number {
  return poem.content.original.reduce(
    (n, line) => n + Array.from(line).filter((c) => CJK_CHAR.test(c)).length,
    0
  );
}

/** 难度等级数（圆点上限），与诗词 difficulty 字段的取值范围一致 */
export const MAX_LEVEL = 6;

/** 难度等级文案（中英双语），1 最易 ~ 6 最难 */
export const LEVEL_LABEL: Record<number, string> = {
  1: 'Starter · 启蒙',
  2: 'Beginner · 入门',
  3: 'Intermediate · 进阶',
  4: 'Upper · 提高',
  5: 'Advanced · 挑战',
  6: 'Master · 巅峰',
};

/** 朝代中文名 */
export const DYNASTY_CN: Record<Poem['dynasty'], string> = {
  Tang: '唐',
  Song: '宋',
  'Five Dynasties': '五代',
  Yuan: '元',
  Qing: '清',
};

/**
 * 学习路径排序：难度升序 → 同级字数升序 → slug 字典序（稳定兜底）。
 * 诗库排列、难度分组、「下一首」流转都遵循这条路径。
 */
export function byLearningPath(poems: Poem[]): Poem[] {
  return [...poems].sort(
    (a, b) =>
      a.difficulty - b.difficulty ||
      poemChars(a) - poemChars(b) ||
      a.slug.localeCompare(b.slug)
  );
}

/** 路径上的下一首（入参需已按学习路径排序）；已是末首返回 null */
export function nextOnPath(poems: Poem[], slug: string): Poem | null {
  const idx = poems.findIndex((p) => p.slug === slug);
  return idx >= 0 && idx + 1 < poems.length ? poems[idx + 1] : null;
}
