import os
import re
from datetime import datetime

try:
    import pyperclip
except ImportError:
    print("❌ エラー: pyperclip ライブラリがインストールされていません。")
    print("以下のコマンドを実行してください:")
    print("  pip install pyperclip")
    input("\nEnter キーを押して終了...")
    exit(1)


def sanitize_filename(text):
    """
    ファイル名に使えない文字を _ に置き換える
    """
    # Windows で使えない文字: / \ : * ? " < > |
    invalid_chars = r'[/\\:*?"<>|]'
    return re.sub(invalid_chars, '_', text)


def get_first_line(text):
    """
    テキストの先頭行を取得（空行はスキップ）
    """
    for line in text.split('\n'):
        stripped = line.strip()
        if stripped:
            return stripped
    return "untitled"


def create_note_from_clipboard():
    """
    クリップボードの内容から Obsidian ノートを作成
    """
    # INBOX フォルダのパス
    inbox_folder = r"C:\Users\zyaga\OneDrive\Documents\ObsidianVault\00_INBOX"
    
    # フォルダが存在するか確認
    if not os.path.exists(inbox_folder):
        print(f"❌ エラー: フォルダが見つかりません: {inbox_folder}")
        print("パスを確認してください。")
        input("Enter キーを押して終了...")
        return
    
    print("=" * 60)
    print("📋 クリップボード → Obsidian INBOX")
    print("=" * 60)
    print()
    
    # クリップボードからテキストを取得
    try:
        clipboard_content = pyperclip.paste()
    except Exception as e:
        print(f"❌ クリップボードの読み取りに失敗しました: {e}")
        input("Enter キーを押して終了...")
        return
    
    # クリップボードが空かチェック
    if not clipboard_content or not clipboard_content.strip():
        print("❌ クリップボードが空です。")
        print("テキストをコピー（Ctrl+C）してから実行してください。")
        input("\nEnter キーを押して終了...")
        return
    
    # デフォルトのタイトル候補（先頭行を使用）
    default_title = get_first_line(clipboard_content)
    
    # タイトル長が長すぎる場合は切り詰める
    if len(default_title) > 50:
        default_title = default_title[:50] + "..."
    
    print(f"📝 クリップボードの内容を取得しました（{len(clipboard_content)} 文字）")
    print()
    print(f"デフォルトのタイトル: {default_title}")
    print()
    
    # タイトルを入力
    title_input = input("タイトルを入力してください（Enter でデフォルト使用）: ").strip()
    
    # タイトル決定
    if title_input:
        title = title_input
    else:
        title = default_title
        print(f"→ デフォルトタイトルを使用: {title}")
    
    # ファイル名を生成（YYYY-MM-DD_HHMM_タイトル.md）
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")
    safe_title = sanitize_filename(title)
    filename = f"{timestamp}_{safe_title}.md"
    filepath = os.path.join(inbox_folder, filename)
    
    # Markdown ファイルを作成
    markdown_content = f"# {title}\n\n{clipboard_content}\n"
    
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        
        print()
        print("=" * 60)
        print("✅ ノートを作成しました！")
        print(f"📁 ファイル名: {filename}")
        print(f"📂 保存先: {inbox_folder}")
        print("=" * 60)
    
    except Exception as e:
        print()
        print(f"❌ ファイル作成中にエラーが発生しました: {e}")
    
    input("\nEnter キーを押して終了...")


if __name__ == "__main__":
    create_note_from_clipboard()
