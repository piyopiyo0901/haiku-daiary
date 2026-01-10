import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'おやの俳句',
  description: '大きな文字で毎日の俳句を記録するシンプルなアプリ。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="app">{children}</div>
      </body>
    </html>
  );
}
