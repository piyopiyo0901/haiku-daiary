#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re
import time
import hashlib
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional

import pyperclip
import keyboard
from janome.tokenizer import Tokenizer


# =========================
# 設定
# =========================

INBOX_DIR = r"C:\Users\zyaga\OneDrive\Documents\ObsidianVault\00_INBOX"

# INBOX用：タグは最大1つ（INBOX or 自動カテゴリ1つ）
PRIMARY_FALLBACK_TAG = "INBOX"

# 左手で届くホットキー
HOTKEY = "ctrl+alt+q"

MIN_CHARS = 3

# 履歴メンテ（肥大化防止）
DEDUPE_MAX_RECORDS = 2000
DEDUPE_HISTORY_FILENAME = "_clip_history.json"

# ファイル名要約の最大長（サニタイズ後）
FILENAME_SUMMARY_MAX = 40

# =========================
# 分類ルール（必要に応じて増やせます）
# =========================

CATEGORY_RULES: Dict[str, Dict[str, List[str]]] = {
    "work": {
        "any": [
            "会議", "議事録", "要件", "設計", "テスト", "障害", "レビュー", "仕様", "課題", "タスク",
            "WBS", "進捗", "顧客", "ユーザ", "問い合わせ", "リリース", "保守", "運用",
            "SVN", "Git", "Bitbucket", "Jira", "Confluence", "SharePoint", "OneNote", "Copilot", "Teams",
            "見積", "稼働", "工数", "PR", "MR", "ブランチ"
        ],
        "all": []
    },
    "shopping": {
        "any": ["買う", "購入", "注文", "Amazon", "楽天", "価格", "セール", "比較", "クーポン", "ポイント", "在庫"],
        "all": []
    },
    "health": {
        "any": ["体重", "筋トレ", "ジム", "パーソナル", "睡眠", "疲れ", "体調", "食事", "PFC", "タンパク", "ダイエット"],
        "all": []
    },
    "game": {
        "any": ["モンハン", "モンハンNOW", "Switch", "Steam", "PS5", "攻略", "周回", "レベル", "ガチャ", "ボス", "クエスト"],
        "all": []
    },
    "travel": {
        "any": ["旅行", "ホテル", "新幹線", "飛行機", "予約", "ルート", "観光", "温泉", "駅", "空港"],
        "all": []
    },
    "finance": {
        "any": ["家計", "税金", "ふるさと納税", "クレカ", "ポイント", "支出", "貯金", "投資"],
        "all": []
    },
    "obsidian": {
        "any": ["Obsidian", "Vault", "Daily", "diary", "リンク", "[[", "タグ", "テンプレ", "Second Brain"],
        "all": []
    },
}

# wikilinkは「本文の読みやすさ優先」で上限つき
MAX_WIKILINKS = 12
BASE_WIKILINK_SEEDS = [
    "Obsidian", "Second Brain", "INBOX", "Daily Note", "ジャーナル", "振り返り",
    "気づきメモ", "タスク管理", "自動化", "Python", "Copilot", "Copilot 365",
]

JP_STOPWORDS = set([
    "こと", "もの", "それ", "これ", "ため", "ところ", "感じ", "自分", "今日", "明日",
    "今回", "一旦", "必要", "可能", "方", "時", "あと", "前", "中", "後", "上", "下",
    "私", "僕", "俺", "あなた", "さん", "的", "他", "など"
])

tokenizer = Tokenizer()


@dataclass
class DedupeRecord:
    sha256: str
    created_at: str
    filename: str


# =========================
# ユーティリティ
# =========================

def now_str() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def sha256_of(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def atomic_write_text(path: Path, content: str, encoding: str = "utf-8") -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(content, encoding=encoding)
    tmp.replace(path)  # atomic on same filesystem


# =========================
# 履歴（8: 自動メンテ）
# =========================

def load_history(path: Path) -> List[DedupeRecord]:
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        out: List[DedupeRecord] = []
        for item in data.get("records", []):
            sha = item.get("sha256", "")
            if not sha:
                continue
            out.append(DedupeRecord(
                sha256=sha,
                created_at=item.get("created_at", ""),
                filename=item.get("filename", ""),
            ))
        return out
    except Exception:
        # 壊れていても起動は継続（新規履歴扱い）
        return []


def maintenance_history(records: List[DedupeRecord]) -> List[DedupeRecord]:
    """
    - 同一shaの重複排除（最新優先）
    - 上限トリム（末尾が最新になる前提で保持）
    """
    seen = set()
    compacted: List[DedupeRecord] = []
    for r in reversed(records):
        if r.sha256 in seen:
            continue
        seen.add(r.sha256)
        compacted.append(r)
    compacted.reverse()

    if len(compacted) > DEDUPE_MAX_RECORDS:
        compacted = compacted[-DEDUPE_MAX_RECORDS:]
    return compacted


def save_history(path: Path, records: List[DedupeRecord]) -> None:
    records = maintenance_history(records)
    payload = {
        "updated_at": now_str(),
        "records": [r.__dict__ for r in records],
    }
    atomic_write_text(path, json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


# =========================
# 分類・リンク候補
# =========================

def detect_categories(text: str) -> List[str]:
    tags = []
    for tag, rule in CATEGORY_RULES.items():
        any_hits = any(k.lower() in text.lower() for k in rule.get("any", []))
        all_req = rule.get("all", [])
        all_hits = all(k.lower() in text.lower() for k in all_req) if all_req else True
        if any_hits and all_hits:
            tags.append(tag)
    return tags


def choose_primary_tag(auto_categories: List[str]) -> str:
    """
    INBOX用：タグは最大1つ。
    - 自動カテゴリが「1つだけ」出たときだけ採用
    - それ以外は INBOX
    """
    if len(auto_categories) == 1:
        return auto_categories[0]
    return PRIMARY_FALLBACK_TAG


def extract_english_terms(text: str) -> List[str]:
    candidates = re.findall(r"[A-Za-z0-9][A-Za-z0-9\._\-/\+]{1,}", text)
    out = []
    for c in candidates:
        if len(c) < 3:
            continue
        if re.fullmatch(r"\d+", c):
            continue
        out.append(c)
    return out


def extract_japanese_nouns(text: str) -> List[str]:
    out = []
    for token in tokenizer.tokenize(text):
        base = token.base_form
        pos = token.part_of_speech.split(",")
        if pos[0] != "名詞":
            continue
        if pos[1] in ["数", "非自立", "代名詞"]:
            continue
        if not base or base in JP_STOPWORDS:
            continue
        if len(base) <= 1:
            continue
        out.append(base)
    return out


def score_terms(text: str, terms: List[str]) -> List[Tuple[str, int]]:
    scored = {}
    for term in terms:
        freq = len(re.findall(re.escape(term), text))
        if freq <= 0:
            continue
        score = freq * 10 + min(len(term), 12)
        scored[term] = max(scored.get(term, 0), score)
    return sorted(scored.items(), key=lambda x: x[1], reverse=True)


def select_wikilinks(text: str) -> List[str]:
    seeds = [s for s in BASE_WIKILINK_SEEDS if s and s.lower() in text.lower()]
    nouns = extract_japanese_nouns(text)
    eng = extract_english_terms(text)

    candidates = list(set(seeds + nouns + eng))
    ranked = score_terms(text, candidates)

    selected = []
    for term, _score in ranked:
        freq = len(re.findall(re.escape(term), text))

        if term not in seeds:
            if len(term) <= 4:
                continue
            if freq < 2:
                continue

        if term in JP_STOPWORDS:
            continue

        selected.append(term)
        if len(selected) >= MAX_WIKILINKS:
            break

    return sorted(set(selected), key=len, reverse=True)


# =========================
# 10: ファイル名（カテゴリ+要約）
# =========================

SENSITIVE_PATTERNS = [
    (re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}"), "<email>"),
    (re.compile(r"\b0\d{1,3}-\d{2,4}-\d{3,4}\b"), "<phone>"),
    (re.compile(r"\b\d{4,}\b"), "<num>"),
]


def sanitize_filename_part(s: str) -> str:
    s = s.strip()
    s = re.sub(r"[\\/:*?\"<>|]+", "_", s)
    s = re.sub(r"\s+", " ", s).strip()
    s = s.strip(".")
    return s


def redact_sensitive(s: str) -> str:
    out = s
    for pat, rep in SENSITIVE_PATTERNS:
        out = pat.sub(rep, out)
    return out


def make_summary_for_filename(text: str, fallback_terms: Optional[List[str]] = None) -> str:
    t = normalize_text(text)
    lines = [ln.strip() for ln in t.split("\n") if ln.strip()]
    first = lines[0] if lines else ""

    if first:
        if first.startswith("http") or len(first) < 4:
            first = ""
        if re.search(r"https?://", first):
            first = ""

    if first:
        cand = first
    else:
        terms = fallback_terms or (extract_japanese_nouns(t) + extract_english_terms(t))
        ranked = [w for w, _ in score_terms(t, list(set(terms)))]
        cand = " ".join(ranked[:6]) if ranked else "clip"

    cand = redact_sensitive(cand)
    cand = sanitize_filename_part(cand)

    if len(cand) > FILENAME_SUMMARY_MAX:
        cand = cand[:FILENAME_SUMMARY_MAX].rstrip()

    return cand if cand else "clip"


def choose_primary_category(auto_categories: List[str]) -> str:
    return auto_categories[0] if auto_categories else "misc"


# =========================
# ノート本文生成
# =========================

_HEADING_EMOJI_PREFIX = r"[🔁💡🧠🧪📌✅❌⚠️📥]"
_re_step = re.compile(r"^(?:\d+[.)]|[①-⑳]|👉|※|注[:：]|注意[:：])\s*")


def _strip_list_marker(s: str) -> str:
    # "- " "* " "・" などの先頭記号を落とす（ChatGPTコピペ対策）
    s = s.lstrip()
    s = re.sub(r"^(?:-\s+|\*\s+|・\s*)", "", s)
    return s.strip()


def to_bullets(text: str) -> str:
    """
    INBOX用の読みやすさ優先整形（解決策A）

    - 主張/見出し/章タイトル      : `- `
      - 補足説明/ステップ/意味づけ : `  - `
        - 具体例/列挙/手順         : `    - `
    """
    lines = text.split("\n")
    out: List[str] = []

    for line in lines:
        raw0 = line.strip()
        if not raw0:
            continue

        # すでにmarkdown見出しがある場合
        if raw0.startswith("#"):
            title = raw0.lstrip("#").strip()
            if title:
                out.append(f"- {title}")
            continue

        raw = _strip_list_marker(raw0)
        if not raw:
            continue

        # 章っぽい行（短め＋先頭が絵文字/記号）
        if re.match(rf"^{_HEADING_EMOJI_PREFIX}", raw) and len(raw) <= 80:
            out.append(f"- {raw}")
            continue

        # 「結論」「重要」など、単発で区切りになる行を章扱い
        if len(raw) <= 60 and any(k in raw for k in ["結論", "重要", "基本ループ", "大事", "前提", "到達点", "明日やること", "視点"]):
            out.append(f"- {raw}")
            continue

        # ステップ/補足扱い
        if _re_step.match(raw):
            out.append(f"  - {raw}")
            continue

        # それ以外は具体（深め）
        out.append(f"    - {raw}")

    return "\n".join(out) if out else "- "


def build_markdown(raw_text: str, tags: List[str], wikilinks: List[str]) -> str:
    dt = datetime.now()
    date_str = dt.strftime("%Y-%m-%d")
    time_str = dt.strftime("%H:%M:%S")

    clean = normalize_text(raw_text)
    bullets = to_bullets(clean)

    tags_yaml = "\n".join([f"  - {t.lstrip('#')}" for t in tags])

    frontmatter = f"""---
created: {date_str} {time_str}
tags:
{tags_yaml}
source: clipboard
---
"""

    if wikilinks:
        link_lines = "\n".join([f"- [[{w}]]" for w in wikilinks])
    else:
        link_lines = "- "

    body = f"""
# 📥 INBOXクリップ ({date_str})

## 内容
{bullets}

## 🔗 リンク候補
{link_lines}

## メタ
- 保存: {date_str} {time_str}
""".lstrip()

    return frontmatter + "\n" + body


def write_note(inbox_dir: Path, md: str, raw_text: str, category: str, summary: str) -> Path:
    inbox_dir.mkdir(parents=True, exist_ok=True)

    dt = datetime.now()
    ts = dt.strftime("%Y-%m-%d_%H-%M-%S")

    category_part = sanitize_filename_part(category)
    summary_part = sanitize_filename_part(summary)

    filename = f"{ts}_{category_part}_{summary_part}.md"
    path = inbox_dir / filename

    i = 1
    while path.exists():
        path = inbox_dir / f"{ts}_{category_part}_{summary_part}_{i}.md"
        i += 1

    path.write_text(md, encoding="utf-8")
    return path


# =========================
# 実行（グローバルに履歴保持）
# =========================

INBOX_PATH = Path(INBOX_DIR)
HISTORY_PATH = INBOX_PATH / DEDUPE_HISTORY_FILENAME

HISTORY_RECORDS: List[DedupeRecord] = []
HISTORY_HASHES = set()


def init_history():
    global HISTORY_RECORDS, HISTORY_HASHES
    INBOX_PATH.mkdir(parents=True, exist_ok=True)

    HISTORY_RECORDS = load_history(HISTORY_PATH)
    HISTORY_RECORDS = maintenance_history(HISTORY_RECORDS)
    HISTORY_HASHES = set(r.sha256 for r in HISTORY_RECORDS)

    save_history(HISTORY_PATH, HISTORY_RECORDS)


def handle_hotkey():
    global HISTORY_RECORDS, HISTORY_HASHES

    try:
        raw = pyperclip.paste()
    except Exception:
        print("[skip] cannot read clipboard")
        return

    if not isinstance(raw, str):
        print("[skip] clipboard is not text")
        return

    raw_norm = normalize_text(raw)
    if len(raw_norm) < MIN_CHARS:
        print("[skip] too short")
        return

    h = sha256_of(raw_norm)
    if h in HISTORY_HASHES:
        print("[skip] duplicate (already saved)")
        return

    auto_categories = detect_categories(raw_norm)
    category = choose_primary_category(auto_categories)

    # tags: 最大1つ（INBOX or 自動カテゴリ1つ）
    primary_tag = choose_primary_tag(auto_categories)
    tags = [primary_tag]

    wikilinks = select_wikilinks(raw_norm)

    summary = make_summary_for_filename(raw_norm)

    md = build_markdown(raw_norm, tags, wikilinks)
    saved = write_note(INBOX_PATH, md, raw_norm, category, summary)

    rec = DedupeRecord(sha256=h, created_at=now_str(), filename=saved.name)
    HISTORY_RECORDS.append(rec)
    HISTORY_RECORDS = maintenance_history(HISTORY_RECORDS)
    HISTORY_HASHES = set(r.sha256 for r in HISTORY_RECORDS)
    save_history(HISTORY_PATH, HISTORY_RECORDS)

    print(f"[saved] {saved}")


def main():
    init_history()

    print("=== Clipboard -> Obsidian INBOX (Hotkey Save) ===")
    print(f"INBOX_DIR : {INBOX_DIR}")
    print(f"HOTKEY    : {HOTKEY}")
    print(f"History   : {HISTORY_PATH} (max {DEDUPE_MAX_RECORDS})")
    print("ホットキーを押すと、クリップボードのテキストを整形してINBOXに保存します。")
    print("終了は Ctrl+C")
    print("-----------------------------------------------")

    keyboard.add_hotkey(HOTKEY, handle_hotkey)

    try:
        while True:
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\n[exit] bye")


if __name__ == "__main__":
    main()
