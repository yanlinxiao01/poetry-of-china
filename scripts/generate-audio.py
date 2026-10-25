#!/usr/bin/env python3
"""批量生成诗词朗读音频（edge-tts，免费）。

两种模式：
    python scripts/generate-audio.py                      # 全部诗的「单字」音频
    python scripts/generate-audio.py --lines              # 全部诗的「整句」音频
    python scripts/generate-audio.py --poem jing-ye-si    # 只做某一首（单字）
    python scripts/generate-audio.py --lines --poem jing-ye-si

输出路径：
    单字 → public/audio/chars/u{codepoint}.mp3（纯 ASCII 文件名，跨平台无编码问题）
    整句 → 诗数据 audio.lines 里声明的路径，如 public/audio/poems/jing-ye-si/line-1.mp3

整句必须单独合成，不能用单字拼接——拼接结果没有连读和语调。
已存在的文件会跳过，重复运行安全。以后新增诗只需重跑一次。
"""

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
POEMS_DIR = ROOT / "data" / "poems"
PUBLIC = ROOT / "public"
CHARS_DIR = PUBLIC / "audio" / "chars"

# 发音人：晓晓（女声，自然清晰，适合学习场景）。可换 zh-CN-YunjianNeural（男声）
VOICE = "zh-CN-XiaoxiaoNeural"
# 单字放慢 15%，学习者更容易听清声调
CHAR_RATE = "-15%"
# 整句只轻微放慢，保留自然的语调起伏
LINE_RATE = "-10%"

CJK = re.compile(r"[\u4e00-\u9fff]")


def load_poems(slug: str | None) -> list[dict]:
    out = []
    for path in sorted(POEMS_DIR.glob("*.json")):
        if slug and path.stem != slug:
            continue
        out.append(json.loads(path.read_text(encoding="utf-8")))
    return out


def collect_chars(poems: list[dict]) -> list[str]:
    """去重汉字（保持出现顺序），跨诗共享一份字库。"""
    chars: list[str] = []
    seen: set[str] = set()
    for poem in poems:
        for line in poem["content"]["original"]:
            for ch in line:
                if CJK.match(ch) and ch not in seen:
                    seen.add(ch)
                    chars.append(ch)
    return chars


def collect_lines(poems: list[dict]) -> list[tuple[str, Path]]:
    """(整句文本, 输出路径)。路径优先取诗数据里 audio.lines 的声明。"""
    jobs: list[tuple[str, Path]] = []
    for poem in poems:
        slug = poem["slug"]
        declared = poem.get("audio", {}).get("lines") or []
        for i, text in enumerate(poem["content"]["original"]):
            rel = (
                declared[i]
                if i < len(declared)
                else f"/audio/poems/{slug}/line-{i + 1}.mp3"
            )
            jobs.append((text, PUBLIC / rel.lstrip("/")))
    return jobs


def char_filename(ch: str) -> str:
    return f"u{ord(ch):04x}.mp3"


async def synth(jobs: list[tuple[str, Path]], rate: str) -> None:
    todo = [(t, p) for t, p in jobs if not p.exists()]
    print(f"共 {len(jobs)} 段，待生成 {len(todo)}，跳过已存在 {len(jobs) - len(todo)}")
    if not todo:
        print("无需生成 →", todo and "" or POEMS_DIR.parent)
        return

    sem = asyncio.Semaphore(4)  # 并发 4 路，避免触发限流
    errors: list[str] = []

    async def one(text: str, path: Path) -> None:
        async with sem:
            try:
                path.parent.mkdir(parents=True, exist_ok=True)
                await edge_tts.Communicate(text, VOICE, rate=rate).save(str(path))
            except Exception as e:  # noqa: BLE001
                errors.append(f"{text} → {path.name}: {e}")

    await asyncio.gather(*(one(t, p) for t, p in todo))
    if errors:
        print("失败：", *errors, sep="\n  ")
        sys.exit(1)
    print(f"完成 {len(todo)} 段")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--poem", help="只处理指定 slug 的诗")
    ap.add_argument(
        "--lines", action="store_true", help="生成整句音频（默认生成单字）"
    )
    args = ap.parse_args()

    poems = load_poems(args.poem)
    if not poems:
        print("没有找到诗（检查 --poem 参数）")
        sys.exit(1)

    if args.lines:
        jobs = collect_lines(poems)
        asyncio.run(synth(jobs, LINE_RATE))
        for text, path in jobs:
            print(f"  {text}  →  {path.relative_to(ROOT)}")
    else:
        chars = collect_chars(poems)
        jobs = [(c, CHARS_DIR / char_filename(c)) for c in chars]
        asyncio.run(synth(jobs, CHAR_RATE))
