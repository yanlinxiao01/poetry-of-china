'use client';

/**
 * 分享模块：生成分享文案、深链接、以及 canvas 绘制的成绩分享图。
 * 纯前端实现，无后端依赖；图片即时生成，可离线工作。
 */
import qrcode from 'qrcode-generator';
import type { Poem } from './poems';
import { DYNASTY_CN, POEM_SERIF } from './poem-ui';
import { formatTime } from './leaderboard';

export interface ShareStats {
  seconds: number;
  mistakes: number;
  /** 一次通过的行数 */
  firstTry: number;
  /** 全诗总行数 */
  lines: number;
  /** 全站名次（已上榜时传入，文案更有传播力） */
  rank?: number;
}

/** 带 ?poem= 参数的深链接：接收者点开直接进入这首诗的游戏 */
export function buildShareUrl(poem: Poem): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/?poem=${poem.slug}`;
}

export function buildShareText(poem: Poem, stats: ShareStats): string {
  const rankPart = stats.rank ? ` · 全站第 ${stats.rank} 名` : '';
  const mistakePart = stats.mistakes === 0 ? '零错误' : `修改 ${stats.mistakes} 次`;
  return `我在「诗语中国」背完了《${poem.title}》：用时 ${formatTime(stats.seconds)} · ${mistakePart} · ${stats.firstTry}/${stats.lines} 行一次通过${rankPart}！你能比我快吗？`;
}

/** 画圆角矩形路径 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 主题橙红渐变（与全站 --accent-from/--accent-to 一致） */
function accentGradient(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#f97316');
  g.addColorStop(1, '#f43f5e');
  return g;
}

/**
 * 生成 1080×1320 成绩分享图（竖版，适配微信/WhatsApp/Instagram）。
 * 布局：品牌行 → 「成」字印章 → 诗名+朝代作者 → 大号得分+明细 → 挑战语 → 二维码+短网址。
 */
export async function renderShareImage(poem: Poem, stats: ShareStats): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  // 等页面字体就绪，衬线字在画布上才不至于回退成无衬线
  try {
    await document.fonts.ready;
  } catch {
    /* 字体探测失败不阻塞出图 */
  }

  const W = 1080;
  const H = 1320;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const SERIF = POEM_SERIF;
  const cx = W / 2;
  const url = buildShareUrl(poem);
  const shortUrl = url.replace(/^https?:\/\//, '');

  // 暖米白底 + 顶部渐变带
  ctx.fillStyle = '#fdfaf2';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = accentGradient(ctx, 0, 0, W, 0);
  ctx.fillRect(0, 0, W, 14);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // 品牌行
  ctx.fillStyle = '#d42f22';
  ctx.font = `700 34px ${SERIF}`;
  ctx.fillText('诗 语 中 国 · POETRY OF CHINA', cx, 104);

  // 「成」字印章：圆角红方块，微旋转
  ctx.save();
  ctx.translate(cx, 268);
  ctx.rotate((-6 * Math.PI) / 180);
  ctx.fillStyle = accentGradient(ctx, -95, -95, 95, 95);
  roundRect(ctx, -95, -95, 190, 190, 26);
  ctx.fill();
  ctx.strokeStyle = 'rgba(212,47,34,0.55)';
  ctx.lineWidth = 3;
  roundRect(ctx, -80, -80, 160, 160, 18);
  ctx.stroke();
  ctx.fillStyle = '#fdfaf2';
  ctx.font = `900 124px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillText('成', 0, 44);
  ctx.restore();

  // 诗名 + 朝代作者 + 英译
  ctx.fillStyle = '#1c1917';
  ctx.font = `900 92px ${SERIF}`;
  ctx.fillText(poem.title, cx, 510);
  ctx.fillStyle = '#d42f22';
  ctx.font = `700 40px ${SERIF}`;
  ctx.fillText(`${DYNASTY_CN[poem.dynasty]} · ${poem.authorCn}`, cx, 578);
  ctx.fillStyle = '#78716c';
  ctx.font = `30px ${SERIF}`;
  ctx.fillText(poem.englishTitle, cx, 632);

  // 分隔细线
  ctx.fillStyle = accentGradient(ctx, cx - 170, 0, cx + 170, 0);
  ctx.globalAlpha = 0.35;
  ctx.fillRect(cx - 170, 686, 340, 2);
  ctx.globalAlpha = 1;

  // 大号用时 + 明细（不再打分，主视觉就是「用时」）
  ctx.fillStyle = '#57534e';
  ctx.font = `700 34px ${SERIF}`;
  ctx.fillText('用时 TIME', cx, 792);
  ctx.fillStyle = accentGradient(ctx, cx - 130, 800, cx + 130, 920);
  ctx.font = `900 150px ${SERIF}`;
  ctx.fillText(formatTime(stats.seconds), cx, 910);
  const mistakePart = stats.mistakes === 0 ? '零错误' : `错误 ${stats.mistakes} 次`;
  const rankPart = stats.rank ? ` · 全站第 ${stats.rank} 名` : '';
  ctx.fillStyle = '#57534e';
  ctx.font = `36px ${SERIF}`;
  ctx.fillText(
    `${mistakePart} · 一次通过 ${stats.firstTry}/${stats.lines} 行${rankPart}`,
    cx,
    996
  );

  // 挑战语
  ctx.fillStyle = '#292524';
  ctx.font = `700 44px ${SERIF}`;
  ctx.fillText('你能比我快吗？', cx, 1088);

  // 底部：左二维码，右短网址文字
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const modules = qr.getModuleCount();
  const qrSize = 168;
  const qrX = 130;
  const qrY = H - 130 - qrSize;
  const cell = qrSize / modules;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
  ctx.strokeStyle = 'rgba(120,60,20,0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
  ctx.fillStyle = '#1c1917';
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect(qrX + c * cell, qrY + r * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = '#57534e';
  ctx.font = `700 34px ${SERIF}`;
  ctx.fillText('扫码挑战这首诗', qrX + qrSize + 46, qrY + 66);
  ctx.fillStyle = '#a8a29e';
  ctx.font = `28px ${SERIF}`;
  ctx.fillText(shortUrl, qrX + qrSize + 46, qrY + 114);

  return new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}
