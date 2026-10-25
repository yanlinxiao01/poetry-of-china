'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Poem } from '@/lib/poems';
import { POEM_SERIF } from '@/lib/poem-ui';
import {
  aggregatePlayers,
  formatTime,
  loadLocalScores,
  loadNickname,
  normName,
  rankPlayers,
  startOfWeek,
  SCORES_UPDATED_EVENT,
  type ScoreEntry,
} from '@/lib/leaderboard';

const CJK_SERIF = POEM_SERIF;

type BoardWindow = 'week' | 'all';

function Segmented<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const idx = Math.max(
    0,
    items.findIndex((i) => i.key === value)
  );

  return (
    <div
      className="relative inline-grid rounded-full border border-white/30 bg-white/15 p-1 text-sm font-bold"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1 left-1 rounded-full bg-white shadow-sm transition-transform duration-300 ease-out"
        style={{
          width: `calc(${100 / items.length}% - 0.25rem)`,
          transform: `translateX(${idx * 100}%)`,
        }}
      />
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={`relative z-10 whitespace-nowrap rounded-full px-4 py-2 transition-colors duration-300 ${
            item.key === value ? 'text-accent-ink' : 'text-white/85 hover:text-white'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default function Leaderboard({ poems }: { poems: Poem[] }) {
  const [mounted, setMounted] = useState(false);
  const [boardWindow, setBoardWindow] = useState<BoardWindow>('week');
  const [localScores, setLocalScores] = useState<ScoreEntry[]>([]);
  const [myName, setMyName] = useState('');

  useEffect(() => {
    setMounted(true);
    setLocalScores(loadLocalScores());
    setMyName(loadNickname());

    const refresh = () => {
      setLocalScores(loadLocalScores());
      setMyName(loadNickname());
    };
    window.addEventListener(SCORES_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(SCORES_UPDATED_EVENT, refresh);
  }, [poems]);

  const windowItems: { key: BoardWindow; label: string }[] = [
    { key: 'week', label: 'This Week · 本周' },
    { key: 'all', label: 'All Time · 永久' },
  ];

  // 只展示真实成绩（本机提交的），不再混入演示假用户
  const ranked = useMemo(() => {
    const scoped =
      boardWindow === 'week'
        ? localScores.filter((s) => s.createdAt >= startOfWeek(Date.now()))
        : localScores;
    return rankPlayers(aggregatePlayers(scoped, poems));
  }, [localScores, boardWindow, poems]);

  const board = ranked.slice(0, 10);

  const myIdx = useMemo(
    () => (myName ? ranked.findIndex((p) => normName(p.nickname) === normName(myName)) : -1),
    [ranked, myName]
  );
  const me = myIdx >= 0 ? ranked[myIdx] : null;

  const podium = ['#ffeccd', '#ffeccd', '#ffeccd'];

  return (
    <section id="leaderboard" className="relative z-10 scroll-mt-20 bg-stone-950 py-16 md:py-20">
      <div className="absolute inset-x-0 top-0 h-1 accent-gradient" aria-hidden="true" />
      <div className="shell">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/85">
              Leaderboard · 排行榜
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
              Top scholars
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              排名依据 · 通关 → 通过率 → 用时 → 求助
              <br />
              Ranked by poems, then first-try rate, speed, helps
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Segmented items={windowItems} value={boardWindow} onChange={setBoardWindow} />
          </div>
        </div>

        {/* 榜单：无外框，仅细分隔线 */}
        <div className="mt-8">
          <div className="flex items-baseline justify-between gap-3 border-b border-white/25 px-1 pb-2">
            <span className="text-sm font-bold text-white" style={{ fontFamily: CJK_SERIF }}>
              全站
              <span className="ml-2 text-xs font-medium text-white/65">
                {poems.length} poems · {boardWindow === 'week' ? 'this week' : 'all time'}
              </span>
            </span>
            <span className="hidden text-[11px] font-bold uppercase tracking-[0.2em] text-white/65 sm:block">
              Poems · First-try · Avg
            </span>
          </div>

          {!mounted ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-5 animate-pulse rounded bg-white/20" />
              ))}
            </div>
          ) : board.length === 0 ? (
            <p className="border-b border-white/20 py-10 text-center text-sm text-white/80">
              尚无排名 — 通关任意一首诗，成为第一个上榜的人 · No rankings yet — finish any poem to
              claim the first spot
            </p>
          ) : (
            <ol>
              {board.map((player, i) => {
                const isMe = myName !== '' && normName(player.nickname) === normName(myName);
                return (
                  <li
                    key={player.nickname}
                    className={`flex items-center gap-3 border-b border-white/20 px-1 py-3 last:border-b-0 ${
                      isMe ? 'bg-white/10' : ''
                    }`}
                  >
                    <span
                      className="w-5 shrink-0 text-right text-sm font-black tabular-nums"
                      style={{ color: i < 3 ? podium[i] : 'rgba(255, 255, 255, 0.55)' }}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                      {player.nickname}
                      {isMe && (
                        <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-accent-ink">
                          You
                        </span>
                      )}
                    </span>
                    <span
                      className="w-10 shrink-0 text-right text-sm font-black tabular-nums text-white"
                      title="Poems completed"
                    >
                      {player.completed}
                    </span>
                    <span
                      className="w-12 shrink-0 text-right text-sm tabular-nums text-white/75"
                      title="First-try rate"
                    >
                      {Math.round(player.firstTryRate * 100)}%
                    </span>
                    <span
                      className="w-12 shrink-0 text-right text-sm font-bold tabular-nums text-white/85"
                      style={{ fontFamily: CJK_SERIF }}
                      title="Average time per poem"
                    >
                      {formatTime(player.avgSeconds)}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* 我的数据 */}
        {mounted && myName && (
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm">
            <span className="font-bold text-white">{myName}</span>
            {me ? (
              <>
                <span className="text-white/80">
                  全站第 <span className="font-black text-white">{myIdx + 1}</span> 名 / 共{' '}
                  {ranked.length} 人
                </span>
                <span className="text-white/80">
                  通关{' '}
                  <span className="font-bold text-white">
                    {me.completed}/{poems.length}
                  </span>{' '}
                  首
                </span>
                <span className="text-white/80">
                  总用时{' '}
                  <span className="font-bold text-white">{formatTime(me.totalSeconds)}</span>
                </span>
                <span className="text-white/80">
                  累计错误 <span className="font-bold text-white">{me.totalMistakes}</span> 次
                </span>
                <span className="text-white/80">
                  累计求助 <span className="font-bold text-white">{me.totalHelps}</span> 次
                </span>
              </>
            ) : (
              <span className="text-white/80">
                你还没上过榜 · 通关任意一首即可上榜
              </span>
            )}
          </div>
        )}

        <p className="mt-4 text-center text-xs text-white/65">
          成绩保存在本机，接入云存储后全站互通 · Scores are stored on this device for now
        </p>
      </div>
    </section>
  );
}
