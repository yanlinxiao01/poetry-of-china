#!/usr/bin/env python3
"""校验 data/poems/*.json 的字段完整性与数据一致性。

诗库扩容后最容易出错的是「逐字拼音」：汉字数、拼音音节数、英译行数三者必须对齐；
其次是音频路径写错或漏生成。这个脚本在构建前跑一次即可挡住大部分低级错误。

用法：
    python scripts/validate-poems.py            # 校验数据，音频缺失只提示
    python scripts/validate-poems.py --strict   # 音频缺失也算错误（发版前用）

退出码：0 = 全部通过，1 = 存在错误。
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POEMS_DIR = ROOT / "data" / "poems"
PUBLIC = ROOT / "public"

DYNASTIES = {"Tang", "Song", "Five Dynasties", "Yuan", "Qing"}

REQUIRED_TEXT = [
    "slug",
    "title",
    "pinyin",
    "englishTitle",
    "author",
    "authorPinyin",
    "authorCn",
]

CJK = re.compile(r"[\u4e00-\u9fff]")
# 原文允许保留的全角标点（部分词作按分句保留逗号）
ALLOWED_PUNCT = set("，。、；：！？·「」《》〈〉—…")
# 允许带声调的拼音音节（含 ü / ê / 鼻音 n、m）
SYLLABLE = re.compile(r"^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüêńňǹḿ]+$")

# 由 --strict 开关决定：音频缺失算错误还是仅提示
STRICT = False


def check_poem(path: Path, errors: list[str], warnings: list[str]) -> None:
    name = path.name

    try:
        poem = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"{name}: JSON 解析失败 — {exc}")
        return

    for key in REQUIRED_TEXT:
        if not str(poem.get(key, "")).strip():
            errors.append(f"{name}: 缺少字段 {key}")

    if poem.get("slug") != path.stem:
        errors.append(f"{name}: slug（{poem.get('slug')}）与文件名不一致")

    dynasty = poem.get("dynasty")
    if dynasty not in DYNASTIES:
        errors.append(f"{name}: dynasty 非法（{dynasty}），可选 {sorted(DYNASTIES)}")

    difficulty = poem.get("difficulty")
    if not isinstance(difficulty, int) or not 1 <= difficulty <= 6:
        errors.append(f"{name}: difficulty 必须是 1~6 的整数（当前 {difficulty}）")

    content = poem.get("content") or {}
    original = content.get("original") or []
    translation = content.get("translation") or []
    pinyin_lines = content.get("pinyinLines") or []

    if not original:
        errors.append(f"{name}: content.original 为空")
        return

    if len(translation) != len(original):
        errors.append(
            f"{name}: 英译 {len(translation)} 行 ≠ 原文 {len(original)} 行"
        )
    if len(pinyin_lines) != len(original):
        errors.append(
            f"{name}: 拼音 {len(pinyin_lines)} 行 ≠ 原文 {len(original)} 行"
        )

    for i, line in enumerate(original):
        chars = [c for c in line if CJK.match(c)]
        if not chars:
            errors.append(f"{name}: 第 {i + 1} 行没有汉字")
            continue
        unexpected = [c for c in line if not CJK.match(c) and c not in ALLOWED_PUNCT]
        if unexpected:
            warnings.append(
                f"{name}: 第 {i + 1} 行含非常规字符 {''.join(unexpected)}（{line}）"
            )
        if i < len(pinyin_lines):
            py = pinyin_lines[i]
            if len(py) != len(chars):
                errors.append(
                    f"{name}: 第 {i + 1} 行「{line}」汉字 {len(chars)} 个，"
                    f"拼音 {len(py)} 个"
                )
            for syl in py:
                if not SYLLABLE.match(str(syl)):
                    errors.append(f"{name}: 第 {i + 1} 行拼音非法音节「{syl}」")

    audio = poem.get("audio") or {}
    lines = audio.get("lines") or []
    if len(lines) != len(original):
        errors.append(
            f"{name}: audio.lines {len(lines)} 条 ≠ 原文 {len(original)} 行"
        )
    for rel in lines:
        if not rel.startswith("/audio/poems/"):
            errors.append(f"{name}: 音频路径不规范（{rel}）")
        elif not (PUBLIC / rel.lstrip("/")).exists():
            msg = f"{name}: 缺少整句音频 {rel}"
            (errors if STRICT else warnings).append(msg)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--strict",
        action="store_true",
        help="音频缺失也视为错误（默认仅提示）",
    )
    args = parser.parse_args()

    global STRICT
    STRICT = args.strict

    files = sorted(POEMS_DIR.glob("*.json"))
    if not files:
        print("未找到任何诗词数据文件")
        return 1

    errors: list[str] = []
    warnings: list[str] = []
    for path in files:
        check_poem(path, errors, warnings)

    print(f"检查 {len(files)} 首诗词")
    for w in warnings:
        print(f"  · 提示：{w}")
    for e in errors:
        print(f"  × 错误：{e}")

    if errors:
        print(f"\n失败：{len(errors)} 个错误，{len(warnings)} 个提示")
        return 1

    print(f"\n通过：数据一致，{len(warnings)} 个提示")
    return 0


if __name__ == "__main__":
    sys.exit(main())
