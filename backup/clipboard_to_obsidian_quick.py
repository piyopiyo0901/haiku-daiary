import os
import re
import sys
from datetime import datetime

try:
    import pyperclip
except ImportError:
    print("❌ エラー: pyperclip ライブラリがインストールされていません。")
    print("以下のコマンドを実行してください:")
    print("  pip install pyperclip")
    sys.exit(1)


def sanitize_filename(text):
    """
    ファイル名に使えない文字を _ に置き換える
    """
    # Windows で使えない文字: / \ : * ? " < > |
    invalid_chars = r'[/\\:*?"<>|]'
    return re.sub(invalid_chars, '_', text)


def get_title_from_text(text):
    """
    テキストから自動的にタイトルを生成する
    先頭行または先頭30文字を使用
    """
    # 先頭行を取得（空行はスキップ）
    first_line = ""
    for line in text.split('\n'):
        stripped = line.strip()
        if stripped:
            first_line = stripped
            break
    
    # 先頭行がない場合は先頭30文字を使用
    if not first_line:
        first_line = text.strip()[:30]
    
    # 長すぎる場合は30文字に切り詰める
    if len(first_line) > 30:
        title = first_line[:30]
    else:
        title = first_line
    
    # タイトルが空の場合は "untitled" を使用
    if not title:
        title = "untitled"
    
    return title


def quick_save_from_clipboard():
    """
    クリップボードの内容を即座に Obsidian INBOX に保存
    """
    # INBOX フォルダのパス
    inbox_folder = r"C:\Users\zyaga\OneDrive\Documents\ObsidianVault\00_INBOX"
    
    # フォルダが存在するか確認
    if not os.path.exists(inbox_folder):
        print(f"❌ エラー: フォルダが見つかりません: {inbox_folder}")
        sys.exit(1)
    
    # クリップボードからテキストを取得
    try:
        clipboard_content = pyperclip.paste()
    except Exception as e:
        print(f"❌ クリップボードの読み取りに失敗しました: {e}")
        sys.exit(1)
    
    # クリップボードが空かチェック
    if not clipboard_content or not clipboard_content.strip():
        print("❌ クリップボードにテキストがありません。")
        sys.exit(1)
    
    # 自動的にタイトルを生成
    title = get_title_from_text(clipboard_content)
    
    # 現在の日時を取得
    now = datetime.now()
    timestamp = now.strftime("%Y-%m-%d_%H%M")
    datetime_str = now.strftime("%Y-%m-%d %H:%M")
    
    # ファイル名を生成
    safe_title = sanitize_filename(title)
    filename = f"{timestamp}_{safe_title}.md"
    filepath = os.path.join(inbox_folder, filename)
    
    # Markdown ファイルの内容を作成
    markdown_content = f"""# {title}
作成日時: {datetime_str}

---

{clipboard_content}
"""
    
    # ファイルを保存
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        
        print(f"✅ ノートを作成しました: {filename}")
        sys.exit(0)
    
    except Exception as e:
        print(f"❌ ファイル作成中にエラーが発生しました: {e}")
        sys.exit(1)


if __name__ == "__main__":
    quick_save_from_clipboard()