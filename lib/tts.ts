'use client';

/**
 * 朗读播放：优先播预生成的静态 MP3，缺失/加载失败时退回浏览器自带的 Web Speech。
 * 全站共用同一个 <audio> 元素，重复点击会打断上一段，不会叠加成合唱。
 */

const MUTED_KEY = 'poc-tts-muted';

let mutedCache: boolean | null = null;
let sharedAudio: HTMLAudioElement | null = null;

/** 单字音频路径：纯 ASCII 文件名，个位数码位补零到 4 位，与脚本生成规则一致 */
export function charAudioSrc(ch: string): string {
  const code = ch.codePointAt(0);
  return `/audio/chars/u${(code ?? 0).toString(16).padStart(4, '0')}.mp3`;
}

export function isTtsMuted(): boolean {
  if (typeof window === 'undefined') return true;
  if (mutedCache === null) {
    try {
      // 默认静音：音频是主动求助工具（重听/点字），用户显式打开喇叭才发声
      const stored = window.localStorage.getItem(MUTED_KEY);
      mutedCache = stored === null ? true : stored === '1';
    } catch {
      mutedCache = false;
    }
  }
  return mutedCache;
}

export function setTtsMuted(value: boolean): void {
  mutedCache = value;
  try {
    window.localStorage.setItem(MUTED_KEY, value ? '1' : '0');
  } catch {
    /* 隐私模式下忽略 */
  }
  if (value) stopPlayback();
}

/** 停掉当前播放（关闭弹窗、切行时调用） */
export function stopPlayback(): void {
  if (sharedAudio) {
    try {
      sharedAudio.pause();
    } catch {
      /* ignore */
    }
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function speak(text: string, rate: number, volume: number): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  if (!text) return false;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  utter.rate = rate;
  utter.volume = volume;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
  return true;
}

/**
 * 播一段音频。
 * @returns true = 播到了预生成文件；false = 退回了 Web Speech 或完全播不了
 */
async function playClip(
  src: string,
  fallbackText: string,
  rate: number,
  volume: number
): Promise<boolean> {
  if (isTtsMuted()) return false;

  if (!src) return speak(fallbackText, rate, volume);

  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = 'auto';
  }
  const el = sharedAudio;

  try {
    el.pause();
    el.volume = volume;
    el.src = src;
    await el.play();
    return true;
  } catch {
    // 文件不存在（404）或被浏览器拦截自动播放 → 退回语音合成
    return speak(fallbackText, rate, volume);
  }
}

/** 播放整句（进入某行时自动播、点「重听」时播） */
export function playLine(src: string, text: string): Promise<boolean> {
  return playClip(src, text, 0.85, 1);
}

/** 填字反馈：轻声念出刚放下的那个字，音量压低，不盖过整句 */
export function playChar(ch: string): Promise<boolean> {
  return playClip(charAudioSrc(ch), ch, 0.8, 0.7);
}

/**
 * 顺序连播整句列表（结算页第一幕全诗朗读用）：一句播完自动接下一句。
 * 文件缺失/被拦截时退回 Web Speech。返回取消函数（切幕/关弹窗时调用）。
 */
export function playLineSequence(clips: { src: string; text: string }[]): () => void {
  if (isTtsMuted() || clips.length === 0) return () => {};

  let cancelled = false;
  let i = 0;

  const playNext = (): void => {
    if (cancelled || i >= clips.length) return;
    const clip = clips[i++];
    const el = sharedAudio ?? (sharedAudio = new Audio());

    if (clip.src) {
      try {
        el.pause();
        el.volume = 1;
        el.src = clip.src;
        el.onended = () => {
          el.onended = null;
          playNext();
        };
        el.onerror = () => {
          el.onerror = null;
          playNext();
        };
        const p = el.play();
        if (p) {
          p.catch(() => {
            el.onended = null;
            el.onerror = null;
            speakNext(clip);
          });
        }
        return;
      } catch {
        el.onended = null;
        el.onerror = null;
      }
    }
    speakNext(clip);
  };

  const speakNext = (clip: { src: string; text: string }): void => {
    if (cancelled) return;
    if (typeof window !== 'undefined' && window.speechSynthesis && clip.text) {
      const utter = new SpeechSynthesisUtterance(clip.text);
      utter.lang = 'zh-CN';
      utter.rate = 0.85;
      utter.onend = () => playNext();
      utter.onerror = () => playNext();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } else {
      playNext();
    }
  };

  playNext();

  return () => {
    cancelled = true;
    stopPlayback();
  };
}
