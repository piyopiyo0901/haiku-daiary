import os
from datetime import datetime

def create_obsidian_note():
    """
    Obsidian の INBOX フォルダに Markdown ファイルを作成するスクリプト
    """
    # INBOX フォルダのパス
    inbox_folder = r"C:\Users\zyaga\OneDrive\Documents\ObsidianVault\00_INBOX"
    
    # フォルダが存在するか確認
    if not os.path.exists(inbox_folder):
        print(f"❌ エラー: フォルダが見つかりません: {inbox_folder}")
        print("パスを確認してください。")
        input("Enter キーを押して終了...")
        return
    
    print("=" * 50)
    print("📝 Obsidian ノート作成ツール")
    print("=" * 50)
    print()
    
    # タイトルを入力
    title = input("ノートのタイトルを入力してください: ").strip()
    if not title:
        print("❌ タイトルが空です。終了します。")
        input("Enter キーを押して終了...")
        return
    
    print()
    print("本文を入力してください（入力後、Ctrl+Z を押してから Enter で完了）:")
    print("-" * 50)
    
    # 本文を複数行入力（Ctrl+Z で終了）
    lines = []
    try:
        while True:
            line = input()
            lines.append(line)
    except EOFError:
        pass
    
    content = "\n".join(lines).strip()
    
    if not content:
        print("❌ 本文が空です。終了します。")
        input("Enter キーを押して終了...")
        return
    
    # ファイル名を生成（YYYY-MM-DD_HHMM_タイトル.md）
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")
    # ファイル名に使えない文字を削除
    safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_', '（', '）', '「', '」')).strip()
    filename = f"{timestamp}_{safe_title}.md"
    filepath = os.path.join(inbox_folder, filename)
    
    # Markdown ファイルを作成
    markdown_content = f"# {title}\n\n{content}\n"
    
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        
        print()
        print("=" * 50)
        print("✅ ノートを作成しました！")
        print(f"📁 保存先: {filepath}")
        print("=" * 50)
    
    except Exception as e:
        print()
        print(f"❌ エラーが発生しました: {e}")
    
    input("\nEnter キーを押して終了...")

if __name__ == "__main__":
    create_obsidian_note()
