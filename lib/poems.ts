import fs from 'fs';
import path from 'path';

export interface Poem {
  slug: string;
  title: string;
  pinyin: string;
  englishTitle: string;
  author: string;
  authorPinyin: string;
  /** 中文作者名，用于中文界面展示 */
  authorCn: string;
  /** 朝代：唐诗、宋词，以及少量五代/元/清名篇 */
  dynasty: 'Tang' | 'Song' | 'Five Dynasties' | 'Yuan' | 'Qing';
  /** 难度等级 1（最易）~ 6（最难），手工标定 */
  difficulty: number;
  themes: string[];
  featured: boolean;
  audio: {
    full: string;
    lines: string[];
  };
  content: {
    original: string[];
    translation: string[];
    pinyinLines: string[][];
  };
  annotations: Record<string, string>;
  appreciation: string;
  relatedCulture: string[];
}

const poemsDirectory = path.join(process.cwd(), 'data', 'poems');

function getPoemFiles(): string[] {
  try {
    return fs.readdirSync(poemsDirectory).filter((file) => file.endsWith('.json'));
  } catch {
    return [];
  }
}

function getPoemBySlug(slug: string): Poem | null {
  try {
    const filePath = path.join(poemsDirectory, `${slug}.json`);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent) as Poem;
  } catch {
    return null;
  }
}

/**
 * 精简客户端载荷：annotations / appreciation / relatedCulture 等字段目前 UI 未使用，
 * 但会随 RSC 序列化一并下发。首页传给客户端组件前先剥掉，诗库扩容时不至于把页面撑大。
 */
export function toClientPoem(poem: Poem): Poem {
  return {
    ...poem,
    themes: [],
    featured: false,
    annotations: {},
    appreciation: '',
    relatedCulture: [],
  };
}

export function getAllPoems(): Poem[] {
  const files = getPoemFiles();
  const poems: Poem[] = [];

  for (const file of files) {
    const slug = file.replace('.json', '');
    const poem = getPoemBySlug(slug);
    if (poem) {
      poems.push(poem);
    }
  }

  return poems;
}

export function getFeaturedPoems(): Poem[] {
  return getAllPoems().filter((poem) => poem.featured);
}

export function getPoemsByDynasty(dynasty: Poem['dynasty']): Poem[] {
  return getAllPoems().filter((poem) => poem.dynasty === dynasty);
}

export function getPoemsByDifficulty(difficulty: number): Poem[] {
  return getAllPoems().filter((poem) => poem.difficulty === difficulty);
}

export function getPoemsByTheme(theme: string): Poem[] {
  return getAllPoems().filter((poem) =>
    poem.themes.some((t) => t.toLowerCase() === theme.toLowerCase())
  );
}
