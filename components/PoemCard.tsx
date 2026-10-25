'use client';

import type { Poem } from '@/lib/poems';
import RatingDots from './RatingDots';
import { DYNASTY_CN, LEVEL_LABEL, MAX_LEVEL, POEM_SERIF, poemChars } from '@/lib/poem-ui';
import { formatTime } from '@/lib/leaderboard';

export interface PoemHint {
  seconds: number;
  rank: number;
  total: number;
}

/**
 * 单张诗卡 —— 诗的展示版式集中在这里。
 * 调整卡片样式/字段时只改本文件，所有诗卡（以及未来任何用到诗卡的地方）统一生效。
 */
export default function PoemCard({
  poem,
  done,
  hint,
  upNext,
  onOpen,
}: {
  poem: Poem;
  done?: { seconds: number };
  hint?: PoemHint;
  /** 学习路径上的下一首推荐 */
  upNext?: boolean;
  onOpen: (slug: string) => void;
}) {
  const lineCount = poem.content.original.length;
  const charCount = poemChars(poem);

  return (
    <button
      type="button"
      onClick={() => onOpen(poem.slug)}
      className={`group relative overflow-hidden rounded-[1.75rem] border bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-100 ${
        upNext
          ? 'border-accent/60 ring-1 ring-accent/30 hover:border-accent'
          : 'border-orange-200/70 hover:border-orange-300'
      }`}
    >
      {upNext && (
        <span className="accent-gradient mb-3 inline-block rounded-full px-2.5 py-1 text-[10px] font-black tracking-wide text-white">
          Up Next · 推荐
        </span>
      )}
      {done && (
        /* 线框印章：外圈主题渐变红 + 白底 + 渐变文字；长标题可与印章重叠，不影响阅读 */
        <span
          className="accent-gradient absolute -right-6 -top-6 flex h-24 w-24 rotate-12 items-center justify-center rounded-full p-[3px]"
          style={{ fontFamily: POEM_SERIF }}
          aria-label="通关"
        >
          <span className="flex h-full w-full items-center justify-center rounded-full bg-white">
            <span className="accent-gradient flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full border border-accent/40 bg-clip-text text-xl font-black text-transparent">
              通关
            </span>
          </span>
        </span>
      )}

      {/* 中文题目独占一行，长标题可自然换行，与线框印章重叠也不影响阅读 */}
      <div>
        <h3
          className="text-3xl font-black leading-snug text-stone-950"
          style={{ fontFamily: POEM_SERIF }}
        >
          {poem.title}
        </h3>
        <p className="mt-1 text-sm font-medium text-orange-700">{poem.pinyin}</p>
      </div>

      <p className="mt-3 text-base font-bold text-stone-800">{poem.englishTitle}</p>
      <p className="mt-1.5 text-sm font-bold text-stone-700" style={{ fontFamily: POEM_SERIF }}>
        {DYNASTY_CN[poem.dynasty]} · {poem.authorCn}
      </p>
      <p className="mt-0.5 text-sm text-stone-500">
        {poem.author} · {poem.dynasty}
      </p>

      <div className="mt-4 flex items-center gap-2.5">
        <RatingDots value={poem.difficulty} max={MAX_LEVEL} variant="hollow" />
        <span className="text-[11px] font-bold text-stone-400">
          {LEVEL_LABEL[poem.difficulty] ?? `Lv.${poem.difficulty}`}
        </span>
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t border-orange-100 pt-3">
        <p className="text-xs text-stone-400">
          <span style={{ fontFamily: POEM_SERIF }} className="font-bold">
            {lineCount}
          </span>{' '}
          lines ·{' '}
          <span style={{ fontFamily: POEM_SERIF }} className="font-bold">
            {charCount}
          </span>{' '}
          characters
        </p>
        {done && (
          <p className="text-xs font-bold text-stone-500">
            最佳{' '}
            <span
              style={{ fontFamily: POEM_SERIF }}
              className="text-base font-black text-accent-ink"
            >
              {formatTime(done.seconds)}
            </span>
          </p>
        )}
      </div>

      {hint && (
        <p className="mt-2.5 text-[11px] font-bold text-accent-ink">
          你的最佳 {formatTime(hint.seconds)} · 全站第 {hint.rank}/{hint.total}
        </p>
      )}
    </button>
  );
}
