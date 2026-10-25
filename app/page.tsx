import { getAllPoems, toClientPoem } from '@/lib/poems';
import { POEM_SERIF, byLearningPath } from '@/lib/poem-ui';
import PoemGrid from '@/components/PoemGrid';
import Leaderboard from '@/components/Leaderboard';

// 全站统一按学习路径排序：难度升 → 同级字数升（分组渲染、Up Next 推荐、下一首流转都基于这个顺序）
const poems = byLearningPath(getAllPoems().map(toClientPoem));

/** 「怎么玩」三步：只留一行说明，详细解释交给实际操作 */
const HOW_STEPS = [
  {
    num: '01',
    cn: '选一首诗',
    en: 'Pick a poem',
    note: '六级难度，由浅入深',
    icon: 'book' as const,
  },
  {
    num: '02',
    cn: '回忆与倾听',
    en: 'Recall & listen',
    note: '听发音、看拼音，随时求助',
    icon: 'sound' as const,
  },
  {
    num: '03',
    cn: '点字填格',
    en: 'Tap the tiles',
    note: '填对即通关，成绩登榜',
    icon: 'grid' as const,
  },
];

function StepIcon({ name }: { name: 'book' | 'sound' | 'grid' }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: 'h-[18px] w-[18px]',
  };
  if (name === 'book') {
    return (
      <svg {...common}>
        <path d="M12 6.5c-1.6-1.3-3.6-2-6-2H4v13h2c2.4 0 4.4.7 6 2 1.6-1.3 3.6-2 6-2h2v-13h-2c-2.4 0-4.4.7-6 2Z" />
        <path d="M12 6.5V19" />
      </svg>
    );
  }
  if (name === 'sound') {
    return (
      <svg {...common}>
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="M15 8.8a4.4 4.4 0 0 1 0 6.4" />
        <path d="M18 6a8 8 0 0 1 0 12" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M3.5 12h17M12 3.5v17M8 8l8 8M16 8l-8 8" strokeOpacity="0.85" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fff7ed] text-stone-900">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-orange-200 bg-white/85 backdrop-blur-md">
        <nav className="shell flex items-center justify-between py-3 md:py-4">
          <a href="#" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full accent-gradient text-lg font-bold text-white shadow-lg shadow-orange-200 md:h-11 md:w-11">
              诗
            </span>
            <span>
              <span className="block text-base font-bold tracking-tight md:text-lg">
                Poetry of China
              </span>
              <span className="block text-[10px] tracking-[0.35em] text-orange-700 md:text-xs">
                诗语中国
              </span>
            </span>
          </a>

          <div className="flex items-center gap-5 text-xs font-medium text-stone-700 md:gap-8 md:text-sm">
            <a href="#" className="group relative font-bold text-orange-600 transition hover:text-orange-700">
              <span>Home</span>
              <span className="absolute -bottom-1 left-1/2 h-[2px] w-6 -translate-x-1/2 bg-orange-600 transition-all duration-300" />
            </a>
            <a href="#poems" className="group relative transition hover:text-orange-600">
              <span>Poems</span>
              <span className="absolute -bottom-1 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-orange-600 transition-all duration-300 group-hover:w-6" />
            </a>
            <a href="#leaderboard" className="group relative transition hover:text-orange-600">
              <span>Leaderboard</span>
              <span className="absolute -bottom-1 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-orange-600 transition-all duration-300 group-hover:w-6" />
            </a>
            <a href="#how" className="group relative transition hover:text-orange-600">
              <span>Getting Started</span>
              <span className="absolute -bottom-1 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-orange-600 transition-all duration-300 group-hover:w-6" />
            </a>
          </div>

          <a
            href="#poems"
            className="hidden rounded-full bg-stone-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-orange-600 md:inline-flex"
          >
            Start Learning
          </a>
        </nav>
      </header>

      <section className="relative flex min-h-[97svh] items-center overflow-hidden pt-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/images/hero-bg.svg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />

        <div className="pointer-events-none absolute right-4 top-[92px] animate-[floatY_4s_ease-in-out_infinite] md:right-[298px] md:top-[120px]">
          <div className="relative flex flex-row items-start gap-0">
            <div className="flex flex-col items-center text-2xl font-bold leading-[1.15] tracking-[0.25em] text-stone-800 md:text-3xl" style={{ fontFamily: '"Noto Serif SC", "Songti SC", Georgia, serif' }}>
              <span>诗</span>
              <span>语</span>
              <span>中</span>
              <span>国</span>
            </div>
            <div className="flex flex-col items-center text-2xl font-bold leading-[1.15] tracking-[0.25em] text-stone-800 md:text-3xl" style={{ fontFamily: '"Noto Serif SC", "Songti SC", Georgia, serif' }}>
              <span>千</span>
              <span>年</span>
              <span>文</span>
              <span>脉</span>
            </div>
            <div className="absolute -bottom-6 -right-2 h-8 w-8 animate-[floatCircle_6s_ease-in-out_infinite] rounded-full border-2 border-orange-600 md:h-10 md:w-10" />
          </div>
        </div>

        <div className="relative shell py-14 md:py-20">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/70 px-4 py-2 text-sm font-medium text-orange-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              Learn Chinese poetry the joyful way — through play
            </div>

            <p className="mb-3 text-lg font-semibold tracking-[0.35em] text-orange-700">
              诗语中国
            </p>

            <h1 className="max-w-3xl text-5xl font-black leading-tight tracking-tight text-stone-950 md:text-7xl">
              Explore China
              <span className="block text-stone-950">
                Through{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      'linear-gradient(90deg, #ea580c, #ef4444, #fb923c, #f97316, #e11d48, #ea580c)',
                    backgroundSize: '300% 100%',
                    animation: 'poetryShimmer 7s ease-in-out infinite',
                  }}
                >
                  Poetry
                </span>
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-700 md:text-xl">
              一字一格，与千年前的句子重逢。
              <br />
              Character by character, meet a line from a thousand years ago.
            </p>

            <div className="mt-9">
              <a
                href="#poems"
                className="float-cta inline-flex items-center justify-center rounded-full accent-gradient px-9 py-4 text-center font-bold text-white shadow-xl shadow-orange-200 transition-shadow duration-300 hover:shadow-2xl hover:shadow-orange-300/70"
              >
                Start Learning
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 入门板块：全宽渐变红底（与排行榜同色），三张卡片讲清上手三步 */}
      <section
        id="how"
        className="relative z-10 w-full scroll-mt-20 border-y border-accent/25 accent-gradient"
      >
        <div className="shell py-12 md:py-16">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/85">
                Getting Started · 入门
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
                Three steps to your first poem
              </h2>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/65">
              No sign-up needed
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:mt-10 md:grid-cols-3 md:gap-5">
            {HOW_STEPS.map((step) => (
              <article
                key={step.num}
                className="group relative overflow-hidden rounded-2xl border border-white/25 bg-white/10 p-6 transition duration-300 hover:-translate-y-1 hover:border-white/45 hover:bg-white/20"
              >
                {/* 背景里的巨型序号，只做纹理不做阅读 */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-2 -top-6 text-[92px] font-black leading-none text-white/10"
                  style={{ fontFamily: POEM_SERIF }}
                >
                  {step.num}
                </span>

                <div className="relative flex items-center justify-between">
                  <span
                    className="text-2xl font-black tracking-tight text-white"
                    style={{ fontFamily: POEM_SERIF }}
                  >
                    {step.num}
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white transition duration-300 group-hover:border-white/60 group-hover:bg-white/20">
                    <StepIcon name={step.icon} />
                  </span>
                </div>

                <h3
                  className="relative mt-6 text-xl font-black tracking-tight text-white"
                  style={{ fontFamily: POEM_SERIF }}
                >
                  {step.cn}
                </h3>
                <p className="relative mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/65">
                  {step.en}
                </p>
                <span className="relative mt-4 block h-px w-9 bg-white/45" />
                <p className="relative mt-3 text-sm leading-6 text-white/80">{step.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="poems" className="relative z-10 shell scroll-mt-20 pb-20 pt-12">
        <div className="mb-8 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-700">
              Poem Library · 诗词库
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-stone-950 md:text-4xl">
              Choose a poem, fill it in
            </h2>
          </div>
          <p className="text-sm text-stone-500">
            Progress is saved in your browser · 进度保存在本地
          </p>
        </div>

        <PoemGrid poems={poems} />
      </section>

      <Leaderboard poems={poems} />

      <footer id="about" className="scroll-mt-20 border-t border-orange-100 bg-white py-10">
        <div className="shell flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="accent-gradient bg-clip-text text-2xl font-black tracking-tight text-transparent">
              Poetry of China
            </p>
            <p className="mt-1 text-lg font-black text-stone-950">诗语中国</p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-stone-500">
              一字一格，与千年前的句子重逢。
            </p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-stone-500">
              Learn and understand classic Chinese poetry through joyful play — one character, one
              rice grid at a time. No sign-up, no cost; your progress stays in your browser.
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-sm font-medium text-stone-600">
            <a href="#poems" className="hover:text-orange-600">
              Poems
            </a>
            <a href="#" className="hover:text-orange-600">
              Back to top
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
