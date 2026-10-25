'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const ease = (t: number) => t * t * (3 - 2 * t);

interface LineDef {
  text: string;
  pinyin: string;
  en: string;
  range: [number, number];
}

const LINES: LineDef[] = [
  {
    text: '床前明月光',
    pinyin: 'Chuáng qián míng yuè guāng',
    en: 'Before my bed, the moonlight gleams,',
    range: [0.14, 0.3],
  },
  {
    text: '疑是地上霜',
    pinyin: 'Yí shì dì shàng shuāng',
    en: 'so bright, I take it for frost on the ground.',
    range: [0.32, 0.46],
  },
  {
    text: '举头望明月',
    pinyin: 'Jǔ tóu wàng míng yuè',
    en: 'I raise my head and gaze at the moon,',
    range: [0.48, 0.62],
  },
  {
    text: '低头思故乡',
    pinyin: 'Dī tóu sī gù xiāng',
    en: 'I lower it, thinking of home.',
    range: [0.64, 0.78],
  },
];

const STARS = [
  { x: '8%', y: '12%', s: 2, d: 0 },
  { x: '18%', y: '28%', s: 1.5, d: 1.2 },
  { x: '30%', y: '8%', s: 2, d: 2.4 },
  { x: '42%', y: '20%', s: 1.5, d: 0.6 },
  { x: '52%', y: '6%', s: 2, d: 1.8 },
  { x: '78%', y: '10%', s: 1.5, d: 0.9 },
  { x: '88%', y: '24%', s: 2, d: 2.1 },
  { x: '68%', y: '4%', s: 1.5, d: 1.5 },
  { x: '36%', y: '34%', s: 1.5, d: 3 },
  { x: '94%', y: '8%', s: 1.5, d: 0.3 },
  { x: '24%', y: '44%', s: 1.5, d: 2.7 },
  { x: '58%', y: '30%', s: 1.5, d: 1.1 },
];

const KEYWORDS = [
  { char: '明月', gloss: 'the bright moon — in Chinese poetry, the moon is the classic symbol of longing for home' },
  { char: '霜', gloss: 'frost — its cold whiteness mirrors the moonlight, and the chill of loneliness' },
  { char: '故乡', gloss: 'hometown — the place the poet has been away from for years' },
];

export default function JingYeSiExperience() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const el = trackRef.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      setProgress(clamp01(-el.getBoundingClientRect().top / total));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // 叙事阶段
  const moonIn = ease(seg(progress, 0.02, 0.1)); // 月亮亮起
  const beamIn = ease(seg(progress, 0.15, 0.24)); // 月光洒落（第一句）
  const frostIn = ease(seg(progress, 0.33, 0.44)); // 地上霜（第二句）
  const tiltUp = ease(seg(progress, 0.48, 0.62)); // 举头
  const tiltDown = ease(seg(progress, 0.64, 0.78)); // 低头
  const finale = ease(seg(progress, 0.82, 0.93)); // 尾声

  // 镜头运动：举头时画面整体下沉（视线抬升），低头时上移
  const camY = tiltUp * 90 - tiltDown * 110;

  const moonScale = 1 + tiltUp * 0.28 - tiltDown * 0.18;
  const moonOpacity = moonIn * (1 - tiltDown * 0.35) * (1 - finale * 0.6);

  const introOpacity = ease(seg(progress, 0.02, 0.07)) * (1 - ease(seg(progress, 0.09, 0.13)));
  const hintOpacity = progress < 0.03 ? 1 : Math.max(0, 1 - seg(progress, 0.03, 0.06));

  return (
    <div ref={trackRef} className="relative bg-[#0a1120]" style={{ height: '620vh' }}>
      <style>{`
        .jys-serif { font-family: "Noto Serif SC", "Songti SC", "STSong", "SimSun", Georgia, serif; }
        .jys-char {
          display: inline-block;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity .7s ease, transform .7s ease;
        }
        .jys-line-active .jys-char { opacity: 1; transform: none; }
        @keyframes jysTwinkle { 0%,100% { opacity: .2 } 50% { opacity: .85 } }
        @keyframes jysMistDrift { 0% { transform: translateX(-2.5%) } 50% { transform: translateX(2.5%) } 100% { transform: translateX(-2.5%) } }
        @keyframes jysHalo { 0%,100% { opacity: .3; transform: scale(1) } 50% { opacity: .5; transform: scale(1.07) } }
        @keyframes jysHint { 0%,100% { transform: translateY(0); opacity: .45 } 50% { transform: translateY(8px); opacity: 1 } }
        @keyframes jysSway { 0%,100% { transform: rotate(-0.7deg) } 50% { transform: rotate(0.7deg) } }
        @media (prefers-reduced-motion: reduce) {
          .jys-anim { animation: none !important; }
          .jys-char { transition: none; }
        }
      `}</style>

      <div className="sticky top-0 h-svh overflow-hidden">
        {/* 夜空 */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, #060b18 0%, #0d1930 55%, #14223e 100%)',
          }}
        />

        {/* 星星 */}
        <div className="absolute inset-0" style={{ transform: `translateY(${camY * 0.05}px)`, opacity: moonIn }}>
          {STARS.map((s, i) => (
            <span
              key={i}
              className="jys-anim absolute rounded-full bg-[#e8e2d0]"
              style={{
                left: s.x,
                top: s.y,
                width: s.s,
                height: s.s,
                animation: `jysTwinkle ${4 + s.d}s ease-in-out ${s.d}s infinite`,
              }}
            />
          ))}
        </div>

        {/* 月亮 */}
        <div
          className="absolute"
          style={{
            left: '62%',
            top: '14%',
            transform: `translateY(${camY * 0.12 - tiltDown * 60}px) scale(${moonScale})`,
            opacity: moonOpacity,
            transformOrigin: 'center',
          }}
        >
          <div
            className="jys-anim absolute rounded-full"
            style={{
              width: '34vmin',
              height: '34vmin',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(242,227,182,0.35) 0%, rgba(242,227,182,0) 65%)',
              animation: 'jysHalo 7s ease-in-out infinite',
            }}
          />
          <div
            className="relative rounded-full"
            style={{
              width: '17vmin',
              height: '17vmin',
              background: 'radial-gradient(circle at 38% 35%, #f8eecb 0%, #f2e3b6 55%, #e6d199 100%)',
              boxShadow: '0 0 60px 12px rgba(242,227,182,0.22)',
            }}
          />
        </div>

        {/* 远山（水墨笔触边缘） */}
        <div className="absolute inset-0" style={{ transform: `translateY(${camY * 0.25}px)`, opacity: moonIn }}>
          <svg className="h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden>
            <defs>
              <filter id="jysInkFar" x="-5%" y="-15%" width="110%" height="130%">
                <feTurbulence type="fractalNoise" baseFrequency="0.011 0.028" numOctaves="3" seed="7" result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="34" />
                <feGaussianBlur stdDeviation="1.2" />
              </filter>
            </defs>
            <path
              d="M0 640 L160 520 L320 600 L500 470 L690 590 L880 500 L1080 610 L1260 530 L1440 590 L1440 900 L0 900 Z"
              fill="#1c2c50"
              opacity="0.8"
              filter="url(#jysInkFar)"
            />
          </svg>
        </div>

        {/* 雾 */}
        <div
          className="absolute inset-x-0"
          style={{
            top: '58%',
            height: '18%',
            transform: `translateY(${camY * 0.4}px)`,
            opacity: moonIn,
          }}
        >
          <div
            className="jys-anim absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, rgba(232,226,208,0.09) 45%, rgba(232,226,208,0.05) 70%, transparent 100%)',
              filter: 'blur(6px)',
              animation: 'jysMistDrift 26s ease-in-out infinite',
            }}
          />
        </div>

        {/* 近山（水墨笔触边缘） */}
        <div className="absolute inset-0" style={{ transform: `translateY(${camY * 0.55}px)`, opacity: moonIn }}>
          <svg className="h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden>
            <defs>
              <filter id="jysInkNear" x="-5%" y="-15%" width="110%" height="130%">
                <feTurbulence type="fractalNoise" baseFrequency="0.016 0.035" numOctaves="3" seed="21" result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="22" />
                <feGaussianBlur stdDeviation="0.8" />
              </filter>
            </defs>
            <path
              d="M0 740 L190 630 L370 720 L560 620 L760 730 L980 640 L1200 740 L1440 670 L1440 900 L0 900 Z"
              fill="#0a1428"
              filter="url(#jysInkNear)"
            />
          </svg>
        </div>

        {/* 月光束（第一句） */}
        <div
          className="absolute inset-0"
          style={{
            opacity: beamIn * (1 - finale),
            background:
              'linear-gradient(115deg, transparent 42%, rgba(242,227,182,0.10) 58%, rgba(242,227,182,0.16) 68%, rgba(242,227,182,0.06) 80%, transparent 92%)',
          }}
        />

        {/* 地面霜色（第二句） */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: '34%',
            opacity: frostIn * (1 - finale * 0.5),
            transform: `translateY(${Math.max(0, camY) * 0.7}px)`,
            background: 'linear-gradient(180deg, transparent 0%, rgba(232,226,208,0.13) 100%)',
          }}
        />

        {/* 诗人（矢量插画层） */}
        <div
          className="absolute bottom-0"
          style={{
            left: 'clamp(8%, 16vw, 24%)',
            height: '72vh',
            transform: `translateY(${camY * 0.8}px)`,
            opacity: moonIn * (1 - finale * 0.85),
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/poet-figure.svg"
            alt=""
            className="jys-anim h-full w-auto"
            style={{
              transformOrigin: '50% 100%',
              animation: 'jysSway 9s ease-in-out infinite',
              filter: 'drop-shadow(0 0 24px rgba(242,227,182,0.12))',
            }}
          />
        </div>

        {/* 窗棂前景 */}
        <div className="absolute inset-0" style={{ transform: `translateY(${camY}px)`, opacity: moonIn }}>
          <svg className="h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden>
            <path
              fillRule="evenodd"
              d="M0 0 H130 V900 H0 Z M26 70 H104 V210 H26 Z M26 260 H104 V400 H26 Z M26 450 H104 V590 H26 Z M26 640 H104 V780 H26 Z"
              fill="#04080f"
            />
            <rect x="0" y="845" width="1440" height="55" fill="#04080f" opacity="0.92" />
          </svg>
        </div>

        {/* 两侧收光：视线聚焦中央 */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(6,11,24,0.85) 0%, rgba(6,11,24,0.28) 16%, transparent 32%, transparent 68%, rgba(6,11,24,0.28) 84%, rgba(6,11,24,0.85) 100%)',
          }}
        />

        {/* 场景压暗（尾声） */}
        <div className="absolute inset-0 bg-[#070d1a]" style={{ opacity: finale * 0.9 }} />

        {/* 宣纸颗粒 */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: 0.05,
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'2\'/%3E%3C/filter%3E%3Crect width=\'160\' height=\'160\' filter=\'url(%23n)\' opacity=\'0.6\'/%3E%3C/svg%3E")',
          }}
        />

        {/* 品牌 */}
        <div className="absolute left-6 top-6 z-20 md:left-10 md:top-8" style={{ opacity: moonIn }}>
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="jys-serif flex h-8 w-8 items-center justify-center rounded-full border border-[#f2e3b6]/30 text-sm text-[#f2e3b6]/80 transition group-hover:border-[#f2e3b6]/60">
              诗
            </span>
            <span className="text-xs tracking-[0.3em] text-[#e8e2d0]/50 transition group-hover:text-[#e8e2d0]/80">
              诗语中国
            </span>
          </Link>
        </div>

        {/* 进度点 */}
        <div className="absolute right-6 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-4 md:right-10" style={{ opacity: moonIn }}>
          {LINES.map((line, i) => {
            const active = progress >= line.range[0] - 0.02 && progress < line.range[1] + 0.04;
            return (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full transition-all duration-500"
                style={{
                  background: active ? '#f2e3b6' : 'rgba(232,226,208,0.25)',
                  transform: active ? 'scale(1.6)' : 'scale(1)',
                }}
              />
            );
          })}
        </div>

        {/* 开场 */}
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center"
          style={{ opacity: introOpacity, pointerEvents: 'none' }}
        >
          <p className="jys-serif text-sm tracking-[0.4em] text-[#e8e2d0]/55 md:text-base">
            Chang&apos;an · Year 726 · 3 AM
          </p>
          <p className="jys-serif mt-6 max-w-xl px-6 text-2xl leading-relaxed text-[#efe6cf] md:text-3xl">
            A sleepless night.
            <br />
            A bright moon.
          </p>
        </div>

        {/* 滚动提示 */}
        <div
          className="absolute inset-x-0 bottom-10 z-10 flex flex-col items-center gap-3"
          style={{ opacity: hintOpacity, pointerEvents: 'none' }}
        >
          <span className="text-[11px] tracking-[0.35em] text-[#e8e2d0]/50">SCROLL</span>
          <span className="jys-anim text-[#e8e2d0]/60" style={{ animation: 'jysHint 2.2s ease-in-out infinite' }}>
            ↓
          </span>
        </div>

        {/* 四句诗 */}
        {LINES.map((line, li) => {
          const [a, b] = line.range;
          const lineOpacity = ease(seg(progress, a, a + 0.04)) * (1 - ease(seg(progress, b, b + 0.05)));
          const active = progress >= a - 0.005 && progress < b + 0.05;
          return (
            <div
              key={li}
              className={`absolute z-10 ${active ? 'jys-line-active' : ''}`}
              style={{
                left: 'max(clamp(100px, 20vw, 320px), calc(50% - 340px))',
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: lineOpacity,
                pointerEvents: 'none',
              }}
            >
              <p className="jys-serif text-[clamp(2rem,7vw,5rem)] font-bold leading-none tracking-[0.12em] text-[#f3ead2]">
                {line.text.split('').map((ch, ci) => (
                  <span key={ci} className="jys-char" style={{ transitionDelay: `${ci * 130}ms` }}>
                    {ch}
                  </span>
                ))}
              </p>
              <p
                className="jys-serif mt-6 text-sm tracking-[0.18em] text-[#e8e2d0]/60 md:text-base"
                style={{
                  opacity: active ? 1 : 0,
                  transform: active ? 'none' : 'translateY(10px)',
                  transition: 'opacity .8s ease .7s, transform .8s ease .7s',
                }}
              >
                {line.pinyin}
              </p>
              <p
                className="jys-serif mt-3 max-w-md text-base italic leading-relaxed text-[#e8e2d0]/85 md:text-lg"
                style={{
                  opacity: active ? 1 : 0,
                  transform: active ? 'none' : 'translateY(10px)',
                  transition: 'opacity .8s ease 1s, transform .8s ease 1s',
                }}
              >
                {line.en}
              </p>
            </div>
          );
        })}

        {/* 尾声：全诗呈现 */}
        <div
          className="absolute inset-0 z-30 flex items-center justify-center"
          style={{ opacity: finale, pointerEvents: finale > 0.6 ? 'auto' : 'none' }}
        >
          <div className="flex flex-col-reverse items-center gap-12 px-6 md:flex-row md:gap-24">
            {/* 英文侧 */}
            <div className="max-w-sm text-center md:text-left">
              <p className="jys-serif text-xs tracking-[0.4em] text-[#e8e2d0]/50">LI BAI · TANG DYNASTY</p>
              <h2 className="jys-serif mt-4 text-2xl text-[#f3ead2] md:text-3xl">Quiet Night Thoughts</h2>
              <div className="jys-serif mt-6 space-y-1.5 text-sm italic leading-relaxed text-[#e8e2d0]/75">
                {LINES.map((l, i) => (
                  <p key={i}>{l.en}</p>
                ))}
              </div>
              <div className="mt-7 space-y-3 border-t border-[#e8e2d0]/15 pt-6 text-left">
                {KEYWORDS.map((k) => (
                  <p key={k.char} className="text-xs leading-relaxed text-[#e8e2d0]/55">
                    <span className="jys-serif mr-2 text-sm text-[#f2e3b6]/90">{k.char}</span>
                    {k.gloss}
                  </p>
                ))}
              </div>
              <p className="jys-serif mt-7 text-sm italic text-[#e8e2d0]/70">
                Every Chinese child knows this poem by heart.
                <br />
                Now you do, too.
              </p>
              <div className="mt-8">
                <Link
                  href="/"
                  className="inline-block rounded-full border border-[#f2e3b6]/35 px-6 py-2.5 text-xs tracking-[0.2em] text-[#f2e3b6]/85 transition hover:border-[#f2e3b6]/70 hover:text-[#f2e3b6]"
                >
                  BACK TO THE GALLERY
                </Link>
              </div>
            </div>

            {/* 竖排全诗 */}
            <div className="flex flex-row-reverse items-start gap-6 md:gap-9" style={{ height: 'min(52vh, 460px)' }}>
              <div
                className="jys-serif text-[clamp(1.4rem,3vw,2rem)] font-bold tracking-[0.35em] text-[#f2e3b6]"
                style={{ writingMode: 'vertical-rl' }}
              >
                静夜思
              </div>
              {LINES.map((l, i) => (
                <div
                  key={i}
                  className="jys-serif text-[clamp(1.6rem,3.4vw,2.4rem)] tracking-[0.3em] text-[#f3ead2]"
                  style={{
                    writingMode: 'vertical-rl',
                    opacity: finale,
                    transform: `translateY(${(1 - finale) * 24}px)`,
                    transition: `opacity .9s ease ${i * 0.15}s, transform .9s ease ${i * 0.15}s`,
                  }}
                >
                  {l.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
