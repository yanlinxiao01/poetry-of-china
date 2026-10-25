'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Poem } from '@/lib/poems';
import { CJK_CHAR, DYNASTY_CN, POEM_SERIF, nextOnPath } from '@/lib/poem-ui';
import {
  isTtsMuted,
  playChar,
  playLine,
  playLineSequence,
  setTtsMuted,
  stopPlayback,
} from '@/lib/tts';
import {
  loadLocalScores,
  loadNickname,
  normName,
  playerStanding,
  saveLocalScore,
  saveNickname,
  startOfWeek,
} from '@/lib/leaderboard';
import { buildShareText, buildShareUrl, renderShareImage } from '@/lib/share';

const SERIF = POEM_SERIF;
const CJK = CJK_CHAR;

interface PoolTile {
  id: number;
  char: string;
}

export interface GameResult {
  seconds: number;
  mistakes: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function SpeakerIcon({ off, className = 'h-4 w-4' }: { off?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      {off ? (
        <path d="m16.5 9.5 5 5m0-5-5 5" />
      ) : (
        <>
          <path d="M15 8.8a4.4 4.4 0 0 1 0 6.4" />
          <path d="M18 6a8 8 0 0 1 0 12" />
        </>
      )}
    </svg>
  );
}

/** 拼音显隐图标：隐藏态=眼睛（点开可见），显示态=眼睛+斜杠（点可隐藏） */
function EyeIcon({ off, className = 'h-3.5 w-3.5' }: { off?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="m4 4 16 16" />}
    </svg>
  );
}

function MiCell({
  filled,
  shaking,
  onClick,
  children,
}: {
  filled?: boolean;
  shaking?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`relative inline-flex items-center justify-center rounded-[4px] border bg-[#fffdf6] transition-colors
        ${filled ? 'border-accent/60' : 'border-orange-900/25'}
        ${onClick ? 'cursor-pointer hover:border-accent/70' : 'cursor-default'}
      `}
      style={{
        width: 'var(--cell)',
        height: 'var(--cell)',
        animation: shaking ? 'cellShake 0.45s ease-in-out' : undefined,
      }}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line x1="0" y1="0" x2="100" y2="100" stroke="#c2410c" strokeOpacity="0.18" strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="#c2410c" strokeOpacity="0.18" strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1="50" y1="0" x2="50" y2="100" stroke="#c2410c" strokeOpacity="0.18" strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#c2410c" strokeOpacity="0.18" strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <span
        className={`relative font-bold ${filled ? 'text-accent' : 'text-stone-800'}`}
        style={{
          fontFamily: SERIF,
          fontSize: 'calc(var(--cell) * 0.52)',
          lineHeight: 1,
          animation: children ? 'tilePop 0.25s ease-out' : undefined,
        }}
      >
        {children}
      </span>
    </button>
  );
}

export default function PoemGame({
  poem,
  allPoems,
  onClose,
  onFinished,
  onSwitch,
}: {
  poem: Poem;
  allPoems: Poem[];
  onClose: () => void;
  onFinished: (slug: string, result: GameResult) => void;
  /** 结算页「下一首」：不关弹窗直接切换（外层用 key 重置整局状态） */
  onSwitch: (slug: string) => void;
}) {
  const lineChars = useMemo(
    () => poem.content.original.map((l) => Array.from(l).filter((c) => CJK.test(c))),
    [poem]
  );
  const totalLines = lineChars.length;

  const [lineIdx, setLineIdx] = useState(0);
  const [slots, setSlots] = useState<(PoolTile | null)[]>([]);
  const [pool, setPool] = useState<PoolTile[]>([]);
  const [wrongIdx, setWrongIdx] = useState<number[]>([]);
  const [glow, setGlow] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [mounted, setMounted] = useState(false);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastManualScroll = useRef(0);
  const [nickname, setNickname] = useState('');
  const [boardResult, setBoardResult] = useState<{
    rank: number;
    total: number;
    completed: number;
    firstTryRate: number;
  } | null>(null);
  // 分享按钮状态：working=生成图片中，done=桌面降级已完成（下载图片+复制链接）
  const [shareState, setShareState] = useState<'idle' | 'working' | 'done'>('idle');

  // 听写相关状态
  const [revealed, setRevealed] = useState(false); // 当前行拼音是否展开
  const [replays, setReplays] = useState(0); // 本局听发音次数
  const [hintCount, setHintCount] = useState(0); // 本局展开拼音次数
  const [charTaps, setCharTaps] = useState(0); // 本局点单字（落子）次数
  const [firstTryCount, setFirstTryCount] = useState(0); // 一次通过的行数
  const firstTryRef = useRef(0); // 同步镜像，check 的延时回调里也能读到最新值
  const failedLineRef = useRef(false); // 当前行是否校验失败过
  const [muted, setMuted] = useState(() => isTtsMuted());
  const [armGiveUp, setArmGiveUp] = useState(false); // 「换一首」两步确认：第一次点击只进入待确认态
  const armGiveUpRef = useRef(false); // 同步镜像，避免快速连点读到陈旧闭包

  // 结算两幕：1=全诗回顾（横排+拼音英译），2=成绩数据
  const [act, setAct] = useState<1 | 2>(1);
  const seqCancelRef = useRef<(() => void) | null>(null); // 全诗连播取消函数
  const [totals, setTotals] = useState<{ completed: number; week: number } | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => setMuted(isTtsMuted()), []);

  useEffect(() => setNickname(loadNickname()), []);

  // per-line setup
  useEffect(() => {
    if (finished) return;
    const chars = lineChars[lineIdx];
    setSlots(new Array(chars.length).fill(null));
    setPool(shuffle(chars.map((c, i) => ({ id: i, char: c }))));
    setWrongIdx([]);
    setGlow(false);
    setWrongCount(0);
    setRevealed(false);
    failedLineRef.current = false;
  }, [lineIdx, lineChars, finished]);

  // 整句音频不再自动播放（母语者听音即知答案，没有挑战）；需要时用户手动点「听发音」

  // 同一行连续错 2 次 → 自动展开拼音（安全网：给的是拼音，不直接给答案）
  useEffect(() => {
    if (wrongCount >= 2 && !revealed) {
      setRevealed(true);
      setHintCount((n) => n + 1);
    }
  }, [wrongCount, revealed]);

  // timer
  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [finished]);

  // 用户手动滚动时记录时间，自动滚动在 1.5s 内让位，避免和用户抢滚动条
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const mark = () => {
      lastManualScroll.current = Date.now();
    };
    el.addEventListener('wheel', mark, { passive: true });
    el.addEventListener('touchmove', mark, { passive: true });
    return () => {
      el.removeEventListener('wheel', mark);
      el.removeEventListener('touchmove', mark);
    };
  }, [mounted]);

  // 换行后把当前句滚到视口垂直居中（内容不足一屏时天然不滚动）
  useEffect(() => {
    if (finished) return;
    const t = setTimeout(() => {
      const scroller = scrollerRef.current;
      const line = lineRefs.current[lineIdx];
      if (!scroller || !line) return;
      if (Date.now() - lastManualScroll.current < 1500) return;
      const target = line.offsetTop - (scroller.clientHeight - line.offsetHeight) / 2;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      scroller.scrollTo({ top: Math.max(0, target), behavior: reduce ? 'auto' : 'smooth' });
    }, 1150);
    return () => clearTimeout(t);
  }, [lineIdx, finished]);

  // 关闭请求：通关后直接关闭；未通关时需二次确认。唯一退出入口是「放弃」按钮，背景点击/Esc 均不可退出
  const requestClose = () => {
    if (finished || armGiveUpRef.current) {
      onClose();
      return;
    }
    armGiveUpRef.current = true;
    setArmGiveUp(true);
    timeouts.current.push(
      setTimeout(() => {
        armGiveUpRef.current = false;
        setArmGiveUp(false);
      }, 2600)
    );
  };

  // cleanup pending timeouts
  useEffect(
    () => () => {
      timeouts.current.forEach(clearTimeout);
      stopPlayback();
    },
    []
  );

  const tapTile = (tile: PoolTile) => {
    if (glow || finished) return;
    const idx = slots.findIndex((s) => s === null);
    if (idx === -1) return;
    const next = [...slots];
    next[idx] = tile;
    setSlots(next);
    setPool((p) => p.filter((t) => t.id !== tile.id));
    setCharTaps((n) => n + 1);
    playChar(tile.char);
  };

  const tapSlot = (i: number) => {
    if (glow || finished) return;
    const tile = slots[i];
    if (!tile) return;
    const next = [...slots];
    next[i] = null;
    setSlots(next);
    setPool((p) => [...p, tile]);
    playChar(tile.char);
  };

  const sayLine = () => {
    const src = poem.audio?.lines?.[lineIdx] ?? '';
    return playLine(src, lineChars[lineIdx]?.join('') ?? '');
  };

  const replayLine = () => {
    setReplays((n) => n + 1);
    sayLine();
  };

  const toggleHint = () => {
    if (!revealed) setHintCount((n) => n + 1);
    setRevealed((r) => !r);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setTtsMuted(next);
    if (!next) {
      // 取消静音时顺手播一次当前句，让用户确认真的开了声音
      sayLine();
    }
  };

  const check = () => {
    if (glow || finished || slots.some((s) => s === null)) return;
    const chars = lineChars[lineIdx];
    const wrong = slots
      .map((s, i) => (s!.char === chars[i] ? -1 : i))
      .filter((i) => i >= 0);

    if (wrong.length === 0) {
      if (!failedLineRef.current) {
        firstTryRef.current += 1;
        setFirstTryCount(firstTryRef.current);
      }
      setGlow(true);
      timeouts.current.push(
        setTimeout(() => {
          if (lineIdx + 1 >= totalLines) {
            setFinished(true);
            onFinished(poem.slug, { seconds, mistakes });
          } else {
            setLineIdx((i) => i + 1);
          }
        }, 1100)
      );
    } else {
      failedLineRef.current = true;
      const wrongTiles = wrong.map((i) => slots[i]!).filter(Boolean);
      setMistakes((m) => m + 1);
      setWrongCount((w) => w + 1);
      setWrongIdx(wrong);
      timeouts.current.push(
        setTimeout(() => {
          setSlots((prev) => {
            const next = [...prev];
            wrong.forEach((i) => {
              next[i] = null;
            });
            return next;
          });
          setPool((p) => [...p, ...wrongTiles]);
          setWrongIdx([]);
        }, 600)
      );
    }
  };

  const replay = () => {
    setLineIdx(0);
    setMistakes(0);
    setSeconds(0);
    setBoardResult(null);
    setFinished(false);
    setReplays(0);
    setHintCount(0);
    setRevealed(false);
    setAct(1);
    setCharTaps(0);
    setFirstTryCount(0);
    firstTryRef.current = 0;
    failedLineRef.current = false;
  };

  const submitToBoard = () => {
    const name = nickname.trim().slice(0, 12);
    if (!name) return;
    // 同名（忽略大小写/首尾空格）视为同一人，沿用首次输入的写法，避免榜单出现 Tom / tom 两行
    const existing = loadLocalScores().find((e) => normName(e.nickname) === normName(name));
    const finalName = existing?.nickname ?? name;
    const entry = {
      id: `me-${Date.now()}`,
      poemSlug: poem.slug,
      nickname: finalName,
      seconds,
      mistakes,
      replays,
      hints: hintCount,
      charTaps,
      firstTry: firstTryRef.current,
      lines: totalLines,
      createdAt: Date.now(),
    };
    saveLocalScore(entry);
    saveNickname(finalName);

    const all = loadLocalScores();
    const standing = playerStanding(all, allPoems, finalName);
    if (!standing) return;
    setBoardResult({
      rank: standing.rank,
      total: standing.total,
      completed: standing.summary.completed,
      firstTryRate: standing.summary.firstTryRate,
    });
  };

  /**
   * 分享成绩：优先生成成绩图走系统分享面板（图+文+链接一起发出）；
   * 不支持文件分享时退化为纯文字链接分享；桌面端再降级为「下载图片+复制链接」。
   */
  const share = async () => {
    if (shareState === 'working') return;
    setShareState('working');
    const stats = {
      seconds,
      mistakes,
      firstTry: firstTryRef.current,
      lines: totalLines,
      rank: boardResult?.rank,
    };
    const url = buildShareUrl(poem);
    const text = buildShareText(poem, stats);
    try {
      const blob = await renderShareImage(poem, stats);
      const file = blob
        ? new File([blob], `${poem.slug}-score.png`, { type: 'image/png' })
        : null;
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (file && nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text, url });
      } else if (typeof navigator.share === 'function') {
        await navigator.share({ title: `${poem.title} · 诗语中国`, text, url });
      } else {
        if (blob && file) {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(a.href);
        }
        await navigator.clipboard?.writeText(`${text} ${url}`).catch(() => {});
        setShareState('done');
        setTimeout(() => setShareState('idle'), 2600);
        return;
      }
      setShareState('idle');
    } catch {
      // 用户取消系统分享面板也会进 catch，静默复位即可
      setShareState('idle');
    }
  };

  const mm = String(Math.floor(seconds / 60)).padStart(1, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  // 全诗连播的剪辑清单（第一幕「听全诗」/通关自动朗读用）
  const fullClips = useMemo(
    () =>
      poem.content.original.map((_, i) => ({
        src: poem.audio?.lines?.[i] ?? '',
        text: lineChars[i]?.join('') ?? '',
      })),
    [poem, lineChars]
  );

  // 学习路径上的下一首（allPoems 已按路径排序）；末首时为 null
  const nextPoem = nextOnPath(allPoems, poem.slug);

  // 第一幕：通关且未静音时自动连播全诗；取消函数挂 ref，手动播放/关闭时可打断
  useEffect(() => {
    if (!finished || act !== 1 || muted) return;
    const cancel = playLineSequence(fullClips);
    seqCancelRef.current = cancel;
    return () => {
      cancel();
      seqCancelRef.current = null;
    };
  }, [finished, act, muted, fullClips]);

  // 累计数据：总通关（progress keys ∪ 当前首）与本周通关（本昵称本周去重诗数）
  useEffect(() => {
    if (!finished && !boardResult) return;
    let completed = 1;
    try {
      const raw = localStorage.getItem('poc-progress');
      const progress = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      const slugs = new Set(Object.keys(progress));
      slugs.add(poem.slug);
      completed = slugs.size;
    } catch {
      /* 忽略解析失败，按 1 计 */
    }
    let week = 0;
    const name = loadNickname();
    if (name) {
      const weekStart = startOfWeek(Date.now());
      const mine = loadLocalScores().filter(
        (e) => e.createdAt >= weekStart && normName(e.nickname) === normName(name)
      );
      week = new Set(mine.map((e) => e.poemSlug)).size;
    }
    setTotals({ completed, week });
  }, [finished, boardResult, poem.slug]);

  const startFullPoem = () => {
    if (muted) {
      setMuted(false);
      setTtsMuted(false);
    }
    seqCancelRef.current?.();
    seqCancelRef.current = playLineSequence(fullClips);
  };

  // 渲染到 body：逃离祖先的层叠上下文（如 section 的 z-10），避免被固定导航栏遮挡
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 top-[65px] z-[200] flex items-center justify-center md:top-[77px]"
      style={{ animation: 'overlayIn 0.25s ease-out' }}
    >
      {/* backdrop — 仅压暗，不响应点击；退出只能走「放弃」按钮，防止误触。只压暗不做模糊，模糊交给面板本身，避免双层 backdrop-filter 掉帧 */}
      <div className="absolute inset-0 bg-[#241812]/30" aria-hidden="true" />

      {/* panel：磨砂玻璃（暖白 78% + blur），米字格保持接近实白以保证笔画清晰 */}
      <div
        className="relative flex h-[95%] w-[95vw] flex-col overflow-hidden rounded-[1.5rem] shadow-2xl ring-1 ring-orange-900/15 md:rounded-[2rem]"
        style={{
          backgroundColor: 'rgba(253, 250, 242, 0.78)',
          backgroundImage:
            'radial-gradient(circle at 20% 12%, rgba(234,88,12,0.07), transparent 42%), radial-gradient(circle at 85% 82%, rgba(194,65,12,0.07), transparent 46%)',
          backdropFilter: 'blur(20px) saturate(1.15)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.15)',
          ['--cell' as string]: 'clamp(38px, 9.5vw, 56px)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={poem.title}
      >
        {/* top bar：左侧标题块 + 右列（静音按钮 + 大号计时）；关闭入口移到「放弃」按钮 */}
        <header
          className="shrink-0 border-b border-orange-900/10 px-4 pb-3.5 pt-5 md:px-6 md:pt-6"
          style={{
            backgroundImage:
              'linear-gradient(rgba(253, 250, 242, 0.72), rgba(253, 250, 242, 0.72)), url(/images/hero-bg.svg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 42%',
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                className="text-3xl font-black tracking-[0.12em] text-stone-900 md:text-4xl"
                style={{ fontFamily: SERIF }}
              >
                {poem.title}
              </h2>
              <p
                className="mt-1.5 text-sm font-bold text-accent-ink"
                style={{ fontFamily: SERIF }}
              >
                {DYNASTY_CN[poem.dynasty]} · {poem.authorCn}
                <span className="mx-2 font-normal text-stone-300">|</span>
                <span className="font-medium text-stone-500">
                  {poem.dynasty} · {poem.author}
                </span>
              </p>
              <p className="mt-1 text-[11px] tracking-wide text-stone-500">
                {poem.pinyin} · {poem.englishTitle}
              </p>
            </div>
            {/* 右列：静音按钮 + 大号计时 */}
            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? 'Unmute' : 'Mute'}
                title={muted ? '打开声音' : '静音'}
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition md:h-12 md:w-12 ${
                  muted
                    ? 'border-stone-300 bg-white/60 text-stone-400 hover:border-stone-400 hover:text-stone-500'
                    : 'border-accent/40 bg-white/80 text-accent-ink shadow-sm shadow-accent/20 hover:bg-white'
                }`}
              >
                <SpeakerIcon off={muted} className="h-5 w-5 md:h-6 md:w-6" />
              </button>
              <span
                className="text-lg font-bold tabular-nums text-orange-900/80 md:text-xl"
                style={{ fontFamily: SERIF }}
              >
                {mm}:{ss}
              </span>
            </div>
          </div>
          <div
            className="mt-2.5 text-xs font-bold text-orange-900/70"
            style={{ fontFamily: SERIF }}
          >
            {finished ? totalLines : Math.min(lineIdx + 1, totalLines)}/{totalLines}
          </div>
        </header>

        {/* scrollable play area — 实色暖白底，不再透出背板磨砂，保证米字格阅读清晰 */}
        <main
          ref={scrollerRef}
          className={`relative flex-1 bg-[#fdfaf2] ${
            finished && act === 1 ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          {!finished ? (
            <div className="mx-auto max-w-4xl pb-8 pt-2 md:pt-3">
              {lineChars.map((chars, li) => {
                const state =
                  li < lineIdx || (glow && li === lineIdx)
                    ? 'done'
                    : li === lineIdx
                      ? 'active'
                      : 'locked';
                return (
                  <div key={li} ref={(el) => { lineRefs.current[li] = el; }}>
                    {/* 淡朱红分隔线 */}
                    {li > 0 && (
                      <div
                        className="mx-4 h-px md:mx-6"
                        style={{ backgroundColor: 'var(--accent)', opacity: 0.18 }}
                      />
                    )}
                    <div
                      className={`relative px-4 py-5 md:px-6 md:py-6 ${
                        state === 'active' ? 'pl-6 md:pl-8' : ''
                      }`}
                      style={
                        state === 'done'
                          ? { animation: 'sealBloom 1.2s ease-out both' }
                          : undefined
                      }
                    >
                      {/* 当前行：左侧朱红竖条，实色滑块自上而下循环滚动 */}
                      {state === 'active' && (
                        <span
                          className="absolute bottom-5 left-2 top-5 w-[2px] overflow-hidden rounded-full md:bottom-6 md:top-6"
                          style={{ backgroundColor: 'rgba(244, 63, 94, 0.18)' }}
                        >
                          <span
                            className="block h-1/4 w-full rounded-full bg-accent"
                            style={{ animation: 'lineScroll 1.8s linear infinite' }}
                          />
                        </span>
                      )}
                      <div className="grid gap-2.5 md:grid-cols-[150px_1fr] md:gap-5">
                        {/* English hint */}
                        <div>
                          <p
                            className="text-xs font-bold text-orange-900/60"
                            style={{ fontFamily: SERIF }}
                          >
                            Line {li + 1}
                          </p>
                          <p className="mt-1 text-[13px] leading-5 text-stone-600">
                            {poem.content.translation[li]}
                          </p>
                          {state === 'active' && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={replayLine}
                                className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-white/70 px-2.5 py-1 text-[11px] font-bold text-accent-ink transition hover:-translate-y-0.5 hover:bg-white"
                              >
                                <SpeakerIcon />
                                听发音 Listen
                              </button>
                              <button
                                type="button"
                                onClick={toggleHint}
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition hover:-translate-y-0.5 ${
                                  revealed
                                    ? 'border-accent/30 bg-accent/10 text-accent-ink'
                                    : 'border-orange-900/20 bg-white/70 text-stone-600 hover:bg-white'
                                }`}
                              >
                                <EyeIcon off={revealed} />
                                {revealed ? '隐藏拼音 Hide' : '显示拼音 Pinyin'}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* cells：靠分隔线右对齐 */}
                        <div className="flex flex-wrap items-start justify-end gap-x-2 gap-y-3">
                          {chars.map((c, ci) => {
                            const py = poem.content.pinyinLines[li]?.[ci] ?? '';
                            const slotTile = li === lineIdx ? slots[ci] : null;
                            const showChar = state === 'done' ? c : slotTile ? slotTile.char : '';
                            // 拼音默认隐藏：只有已完成的行、或当前行点了「拼音」才显示。
                            // 隐藏时用不换行空格占位，展开不会把版面顶动。
                            const showPy = state === 'done' || (state === 'active' && revealed);
                            return (
                              <div key={ci} className="flex flex-col items-center gap-1">
                                <span
                                  className={`text-[10px] leading-none md:text-[11px] ${
                                    showPy ? 'text-orange-900/60' : 'text-transparent'
                                  }`}
                                  aria-hidden={!showPy}
                                >
                                  {showPy ? py : '\u00A0'}
                                </span>
                                {state === 'active' ? (
                                  <MiCell
                                    filled={!!slotTile}
                                    shaking={wrongIdx.includes(ci)}
                                    onClick={slotTile ? () => tapSlot(ci) : undefined}
                                  >
                                    {showChar}
                                  </MiCell>
                                ) : (
                                  <MiCell filled={state === 'done'}>{showChar}</MiCell>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : act === 1 ? (
            /* 第一幕：全诗回顾 —— 横排诗句，拼音在上、英译在下，句间细分隔线；诗句区滚动，按钮固定底部 */
            <div className="flex h-full flex-col">
              <div className="flex-1 overflow-y-auto">
                <div className="flex min-h-full flex-col justify-center px-4 py-6 md:py-8">
                  <div className="mx-auto w-full max-w-xl">
                    {poem.content.original.map((line, i) => (
                      <div
                        key={i}
                        className="border-t border-accent/20 py-4 first:border-t-0"
                        style={{
                          animation: 'sealBloom 0.8s ease-out both',
                          animationDelay: `${i * 150}ms`,
                        }}
                      >
                        <p className="text-center text-[11px] leading-4 tracking-[0.08em] text-orange-900/60">
                          {poem.content.pinyinLines[i]?.join(' ')}
                        </p>
                        <p
                          className="mt-1.5 text-center text-2xl font-bold tracking-[0.2em] text-stone-900 md:text-3xl"
                          style={{ fontFamily: SERIF }}
                        >
                          {line}
                        </p>
                        <p className="mt-2 text-center text-xs leading-5 text-stone-500">
                          {poem.content.translation[i]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-accent/15 bg-[#fdfaf2] px-4 py-3.5">
                <div className="mx-auto flex max-w-xl flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={startFullPoem}
                    className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-white/70 px-4 py-2.5 text-sm font-bold text-accent-ink transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    <SpeakerIcon className="h-4 w-4" />
                    听全诗 · Listen
                  </button>
                  <button
                    type="button"
                    onClick={() => setAct(2)}
                    className="accent-gradient rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-accent/30 transition hover:-translate-y-0.5"
                  >
                    查看成绩 · View Results →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* 第二幕：成绩数据 —— 如实展示原始学习数据，不打分 */
            <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-4 py-6 md:py-8">
              <div className="w-full max-w-md">
                {[
                  { zh: '用时', en: 'Time', value: `${mm}:${ss}` },
                  { zh: '错误', en: 'Mistakes', value: `${mistakes} 次` },
                  { zh: '听句', en: 'Listens', value: `${replays} 次` },
                  { zh: '拼音', en: 'Pinyin', value: `${hintCount} 次` },
                  { zh: '单字', en: 'Taps', value: `${charTaps} 次` },
                  {
                    zh: '一遍',
                    en: 'First-try',
                    value: `${firstTryCount}/${totalLines} 行`,
                  },
                ].map((row) => (
                  <div
                    key={row.zh}
                    className="flex items-center gap-3 border-b border-accent/15 py-3 last:border-b-0"
                  >
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-accent/60 text-xs font-black text-accent-ink"
                      style={{ fontFamily: SERIF }}
                    >
                      {row.zh}
                    </span>
                    <span className="text-xs text-stone-400">{row.en}</span>
                    <span
                      className="ml-auto text-2xl font-black text-stone-800"
                      style={{ fontFamily: SERIF }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {totals && (
                <p className="mt-4 text-xs text-stone-500">
                  已累计通关 {totals.completed}/{allPoems.length} 首 · This week: {totals.week}{' '}
                  poems
                </p>
              )}

              {/* 上榜 */}
              <div className="mt-5 w-full max-w-sm">
                {boardResult ? (
                  <div className="rounded-xl border border-accent/25 bg-white/70 px-4 py-3">
                    <p className="text-sm font-bold text-accent-ink" style={{ fontFamily: SERIF }}>
                      全站第 {boardResult.rank} 名 / 共 {boardResult.total} 人
                    </p>
                    <p className="mt-1 text-xs text-stone-600">
                      通关 {boardResult.completed} 首 · 一次通过率{' '}
                      {Math.round(boardResult.firstTryRate * 100)}%
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      maxLength={12}
                      placeholder="Your nickname · 昵称"
                      aria-label="Nickname"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitToBoard();
                      }}
                      className="min-w-0 flex-1 rounded-full border border-orange-200 bg-white/70 px-4 py-2.5 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-accent/50"
                    />
                    <button
                      type="button"
                      onClick={submitToBoard}
                      disabled={!nickname.trim()}
                      className={`rounded-full px-6 py-2.5 text-sm font-bold transition ${
                        nickname.trim()
                          ? 'accent-gradient text-white shadow-md shadow-accent/30 hover:-translate-y-0.5'
                          : 'cursor-not-allowed bg-stone-300/70 text-stone-500'
                      }`}
                    >
                      上榜 · Submit
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-7 flex w-full max-w-2xl flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={share}
                  disabled={shareState === 'working'}
                  className={`whitespace-nowrap rounded-full border px-4 py-3 text-sm font-bold transition sm:flex-1 ${
                    shareState === 'working'
                      ? 'cursor-wait border-stone-300 bg-stone-100/60 text-stone-400'
                      : 'border-accent/40 bg-white/70 text-accent-ink hover:-translate-y-0.5 hover:bg-white'
                  }`}
                >
                  {shareState === 'working'
                    ? '生成图片中… · Preparing'
                    : shareState === 'done'
                      ? '已保存图片并复制链接 ✓'
                      : '分享成绩 · Share'}
                </button>
                <button
                  type="button"
                  onClick={replay}
                  className="whitespace-nowrap rounded-full border border-accent/40 bg-white/70 px-4 py-3 text-sm font-bold text-accent-ink transition hover:-translate-y-0.5 hover:bg-white sm:flex-1"
                >
                  Play Again · 再来一次
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="whitespace-nowrap rounded-full border border-stone-300 bg-white/60 px-4 py-3 text-sm font-bold text-stone-600 transition hover:-translate-y-0.5 hover:bg-white sm:flex-1"
                >
                  Choose a Poem · 选诗
                </button>
                {nextPoem ? (
                  <button
                    type="button"
                    onClick={() => onSwitch(nextPoem.slug)}
                    className="accent-gradient whitespace-nowrap rounded-full px-4 py-3 text-sm font-bold text-white shadow-lg shadow-accent/30 transition hover:-translate-y-0.5 sm:flex-1"
                  >
                    下一首 · Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setTimeout(
                        () =>
                          document
                            .getElementById('leaderboard')
                            ?.scrollIntoView({ behavior: 'smooth' }),
                        50
                      );
                    }}
                    className="accent-gradient whitespace-nowrap rounded-full px-4 py-3 text-sm font-bold text-white shadow-lg shadow-accent/30 transition hover:-translate-y-0.5 sm:flex-1"
                  >
                    查看排行榜 · Leaderboard
                  </button>
                )}
              </div>
            </div>
          )}
        </main>

        {/* pool panel pinned at panel bottom */}
        {!finished && (
          <footer className="shrink-0 border-t border-accent/15 bg-[#fdfaf2]">
            <div className="mx-auto max-w-4xl px-4 py-3.5">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {pool.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => tapTile(t)}
                    className="flex items-center justify-center rounded-lg border border-orange-900/20 bg-white font-bold text-stone-800 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/60 hover:text-accent active:translate-y-0"
                    style={{
                      width: 'calc(var(--cell) * 0.9)',
                      height: 'calc(var(--cell) * 0.9)',
                      fontFamily: SERIF,
                      fontSize: 'calc(var(--cell) * 0.46)',
                      animation: 'tilePop 0.2s ease-out',
                    }}
                  >
                    {t.char}
                  </button>
                ))}
                {pool.length === 0 && (
                  <span className="py-2 text-sm text-stone-400">All tiles placed · 已全部放置</span>
                )}
              </div>
              <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-orange-900/10 pt-3.5">
                <button
                  type="button"
                  onClick={requestClose}
                  className={`rounded-full border px-5 py-3 text-sm font-bold transition ${
                    armGiveUp
                      ? 'border-red-400/70 bg-red-50/80 text-red-600'
                      : 'border-stone-300/80 bg-white/50 text-stone-500 hover:border-stone-400 hover:text-stone-700'
                  }`}
                >
                  {armGiveUp ? '确认换一首？本首进度不记录' : '换一首 · Switch'}
                </button>
                <button
                  type="button"
                  onClick={check}
                  disabled={slots.some((s) => s === null) || glow}
                  className={`rounded-full px-10 py-3 font-bold transition ${
                    slots.some((s) => s === null) || glow
                      ? 'cursor-not-allowed bg-stone-300/60 text-stone-500'
                      : 'accent-gradient text-white shadow-lg shadow-accent/30 hover:-translate-y-0.5'
                  }`}
                >
                  Confirm · 确定
                </button>
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
