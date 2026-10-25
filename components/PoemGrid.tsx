'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Poem } from '@/lib/poems';
import PoemGame, { type GameResult } from './PoemGame';
import PoemCard, { type PoemHint } from './PoemCard';
import RatingDots from './RatingDots';
import { LEVEL_LABEL, MAX_LEVEL } from '@/lib/poem-ui';
import {
  loadLocalScores,
  loadNickname,
  poemRank,
  SCORES_UPDATED_EVENT,
} from '@/lib/leaderboard';

const STORAGE_KEY = 'poc-progress';

interface ProgressEntry {
  seconds: number;
}

/** 诗卡网格编排：按学习路径分难度组展示、进度读取、名次小字、打开游戏弹窗。单张卡的版式见 PoemCard */
export default function PoemGrid({ poems }: { poems: Poem[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, ProgressEntry>>({});
  const [hints, setHints] = useState<Record<string, PoemHint>>({});

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<
        string,
        { score?: number; stars?: number; seconds: number }
      >;
      // 评分体系已废弃：旧数据只保留最佳用时，score/stars 直接忽略
      const migrated: Record<string, ProgressEntry> = {};
      for (const [slug, e] of Object.entries(raw)) {
        if (typeof e.seconds === 'number') migrated[slug] = { seconds: e.seconds };
      }
      setProgress(migrated);
    } catch {
      /* ignore */
    }
  }, []);

  // 分享深链接：?poem=slug 直达某首诗的游戏弹窗
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('poem');
    if (slug && poems.some((p) => p.slug === slug)) setOpenSlug(slug);
  }, [poems]);

  // 弹窗一旦关闭（任何路径：换一首/返回选诗/看排行榜），抹掉 ?poem= 参数，避免刷新页面又弹出游戏
  useEffect(() => {
    if (openSlug !== null) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('poem')) return;
    url.searchParams.delete('poem');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, [openSlug]);

  // 诗卡上的「你的最佳成绩 + 名次」小字
  useEffect(() => {
    const compute = () => {
      const name = loadNickname();
      if (!name) {
        setHints({});
        return;
      }
      const all = loadLocalScores();
      const next: Record<string, PoemHint> = {};
      for (const p of poems) {
        const r = poemRank(all, p, name);
        if (r) next[p.slug] = { seconds: r.seconds, rank: r.rank, total: r.total };
      }
      setHints(next);
    };
    compute();
    window.addEventListener(SCORES_UPDATED_EVENT, compute);
    return () => window.removeEventListener(SCORES_UPDATED_EVENT, compute);
  }, [poems]);

  useEffect(() => {
    document.body.style.overflow = openSlug ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [openSlug]);

  const handleFinished = (slug: string, result: GameResult) => {
    setProgress((prev) => {
      const old = prev[slug];
      const next = {
        ...prev,
        [slug]: {
          seconds: old ? Math.min(old.seconds, result.seconds) : result.seconds,
        },
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // 按难度分组（入参已按学习路径排序，同级天然相邻）
  const groups = useMemo(() => {
    const out: { level: number; poems: Poem[] }[] = [];
    for (const p of poems) {
      const last = out[out.length - 1];
      if (last && last.level === p.difficulty) last.poems.push(p);
      else out.push({ level: p.difficulty, poems: [p] });
    }
    return out;
  }, [poems]);

  // Up Next：路径上第一首尚未通关的诗
  const upNextSlug = useMemo(
    () => poems.find((p) => !progress[p.slug])?.slug ?? null,
    [poems, progress]
  );

  const openPoem = poems.find((p) => p.slug === openSlug) ?? null;

  return (
    <>
      {groups.map((g) => {
        const doneCount = g.poems.filter((p) => progress[p.slug]).length;
        return (
          <section key={g.level} className="mb-10 last:mb-0">
            <header className="mb-5 flex items-center gap-3 border-b border-accent/25 pb-2.5">
              <RatingDots value={g.level} max={MAX_LEVEL} variant="hollow" />
              <h3
                className="text-sm font-black tracking-wide text-stone-800 md:text-base"
              >
                L{g.level} · {LEVEL_LABEL[g.level] ?? `Lv.${g.level}`}
              </h3>
              <span className="ml-auto text-xs font-bold text-stone-400">
                已通关 <span className="text-accent-ink">{doneCount}</span>/{g.poems.length}
              </span>
            </header>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {g.poems.map((poem) => (
                <PoemCard
                  key={poem.slug}
                  poem={poem}
                  done={progress[poem.slug]}
                  hint={hints[poem.slug]}
                  upNext={poem.slug === upNextSlug}
                  onOpen={setOpenSlug}
                />
              ))}
            </div>
          </section>
        );
      })}

      {openPoem && (
        <PoemGame
          key={openPoem.slug}
          poem={openPoem}
          allPoems={poems}
          onClose={() => setOpenSlug(null)}
          onFinished={handleFinished}
          onSwitch={(slug) => setOpenSlug(slug)}
        />
      )}
    </>
  );
}
