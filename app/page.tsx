'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  HaikuDraft,
  HaikuEntry,
  buildPreview,
  countHaikuChars,
  createEmptyDraft,
  formatDateLabel,
  getTokyoDateKey,
  getTokyoDateParts,
  isValidDateKey,
} from '@/lib/haiku';
import { KigoItem, pickRandomKigo } from '@/lib/kigo';
import { clearDraft, loadDraft, loadEntries, saveDraft, saveEntries } from '@/lib/storage';

type Feedback = {
  type: 'success' | 'error';
  message: string;
};

type ViewMode = 'calendar' | 'list';

type Tab = 'create' | 'view';

const HELP_SEEN_KEY = 'haiku_help_seen_v1';

const TARGETS = {
  kami5: 5,
  naka7: 7,
  shimo5: 5,
};

const countStatus = (count: number, target: number) => {
  if (count > target) return 'over';
  if (count === target) return 'ok';
  return 'warn';
};

const dateKeyFromParts = (year: number, month: number, day: number) => {
  const pad2 = (value: number) => String(value).padStart(2, '0');
  return `${year}-${pad2(month)}-${pad2(day)}`;
};

const validateImport = (payload: unknown): { ok: true; entries: HaikuEntry[] } | { ok: false; error: string } => {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'ファイルの内容が正しくありません。' };
  }

  const entries = (payload as { entries?: unknown }).entries;
  if (!Array.isArray(entries)) {
    return { ok: false, error: '保存データが見つかりません。' };
  }

  const validated: HaikuEntry[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      return { ok: false, error: 'データ形式が正しくありません。' };
    }
    const item = entry as Partial<HaikuEntry>;
    if (
      typeof item.dateKey !== 'string' ||
      !isValidDateKey(item.dateKey) ||
      typeof item.kami5 !== 'string' ||
      typeof item.naka7 !== 'string' ||
      typeof item.shimo5 !== 'string' ||
      typeof item.createdAt !== 'string' ||
      typeof item.updatedAt !== 'string'
    ) {
      return { ok: false, error: 'データ形式が正しくありません。' };
    }
    if (Number.isNaN(Date.parse(item.createdAt)) || Number.isNaN(Date.parse(item.updatedAt))) {
      return { ok: false, error: '日付の形式が正しくありません。' };
    }
    validated.push(item as HaikuEntry);
  }

  return { ok: true, entries: validated };
};

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>('create');
  const [draft, setDraft] = useState<HaikuDraft>(createEmptyDraft());
  const [entries, setEntries] = useState<HaikuEntry[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [kigoSuggestion, setKigoSuggestion] = useState<KigoItem | null>(null);

  const todayParts = getTokyoDateParts();
  const [viewYear, setViewYear] = useState(todayParts.year);
  const [viewMonth, setViewMonth] = useState(todayParts.month);

  useEffect(() => {
    const draftResult = loadDraft();
    if (draftResult.error) {
      setFeedback({ type: 'error', message: draftResult.error });
    }
    setDraft(draftResult.value);

    const entriesResult = loadEntries();
    if (entriesResult.error) {
      setFeedback({ type: 'error', message: entriesResult.error });
    }
    setEntries(entriesResult.value);

    try {
      const seen = window.localStorage.getItem(HELP_SEEN_KEY);
      setHelpVisible(!seen);
    } catch (error) {
      setHelpVisible(true);
    }

    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    const result = saveDraft(draft);
    if (result.error) {
      setFeedback({ type: 'error', message: result.error });
    }
  }, [draft, hasLoaded]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2800);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [entries]);

  const entriesByDate = useMemo(() => {
    return sortedEntries.reduce<Record<string, HaikuEntry>>((acc, entry) => {
      acc[entry.dateKey] = entry;
      return acc;
    }, {});
  }, [sortedEntries]);

  const preview = buildPreview(draft);
  const hasAnyLine = [draft.kami5, draft.naka7, draft.shimo5].some((line) => line.trim().length > 0);

  const todayKey = getTokyoDateKey();

  const handleDraftChange = (field: keyof HaikuDraft) => (event: ChangeEvent<HTMLTextAreaElement>) => {
    setDraft((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSaveToday = () => {
    if (!draft.kami5.trim() && !draft.naka7.trim() && !draft.shimo5.trim()) {
      setFeedback({ type: 'error', message: 'まだ俳句がありません。' });
      return;
    }

    const now = new Date().toISOString();
    const existing = entriesByDate[todayKey];
    if (existing) {
      const ok = window.confirm('今日の句はすでにあります。上書きしますか？');
      if (!ok) return;
    }

    const entry: HaikuEntry = existing
      ? {
          ...existing,
          kami5: draft.kami5,
          naka7: draft.naka7,
          shimo5: draft.shimo5,
          updatedAt: now,
        }
      : {
          dateKey: todayKey,
          kami5: draft.kami5,
          naka7: draft.naka7,
          shimo5: draft.shimo5,
          createdAt: now,
          updatedAt: now,
        };

    const nextEntries = existing
      ? entries.map((item) => (item.dateKey === todayKey ? entry : item))
      : [entry, ...entries];

    setEntries(nextEntries);
    const result = saveEntries(nextEntries);
    if (result.error) {
      setFeedback({ type: 'error', message: result.error });
      return;
    }

    setSelectedDateKey(todayKey);
    setFeedback({ type: 'success', message: '保存しました。' });
  };

  const handleClear = () => {
    const ok = window.confirm('入力中の俳句を消しますか？');
    if (!ok) return;
    setDraft(createEmptyDraft());
    const result = clearDraft();
    if (result.error) {
      setFeedback({ type: 'error', message: result.error });
    } else {
      setFeedback({ type: 'success', message: '下書きを消しました。' });
    }
  };

  const handleExport = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      entries,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = todayKey.replace(/-/g, '');
    link.href = url;
    link.download = `haiku-backup-${dateStamp}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    setFeedback({ type: 'success', message: 'バックアップを書き出しました。' });
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setFeedback({ type: 'error', message: 'ファイルが大きすぎます。' });
      return;
    }

    const ok = window.confirm('今の保存データを上書きします。よろしいですか？');
    if (!ok) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validation = validateImport(parsed);
      if (!validation.ok) {
        setFeedback({ type: 'error', message: validation.error });
        return;
      }
      setEntries(validation.entries);
      const result = saveEntries(validation.entries);
      if (result.error) {
        setFeedback({ type: 'error', message: result.error });
        return;
      }
      setSelectedDateKey(validation.entries[0]?.dateKey ?? null);
      setFeedback({ type: 'success', message: '読み込みました。' });
    } catch (error) {
      setFeedback({ type: 'error', message: '読み込みに失敗しました。' });
    }
  };

  const handleCloseHelp = () => {
    setHelpVisible(false);
    try {
      window.localStorage.setItem(HELP_SEEN_KEY, '1');
    } catch (error) {
      // ignore
    }
  };

  const handlePickKigo = () => {
    const kigo = pickRandomKigo();
    setKigoSuggestion(kigo);
  };

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) return sortedEntries;
    return sortedEntries.filter((entry) => {
      const combined = `${entry.kami5}${entry.naka7}${entry.shimo5}`;
      return combined.includes(query);
    });
  }, [searchQuery, sortedEntries]);

  const listEmptyMessage = searchQuery.trim() ? '一致する句がありません。' : 'まだ俳句がありません。';

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
  const calendarDays = Array.from({ length: firstDay + daysInMonth }, (_, index) => {
    if (index < firstDay) return null;
    return index - firstDay + 1;
  });

  const selectedEntry = selectedDateKey ? entriesByDate[selectedDateKey] : null;

  const renderCreate = () => {
    const kamiCount = countHaikuChars(draft.kami5);
    const nakaCount = countHaikuChars(draft.naka7);
    const shimoCount = countHaikuChars(draft.shimo5);

    const statusKami = countStatus(kamiCount, TARGETS.kami5);
    const statusNaka = countStatus(nakaCount, TARGETS.naka7);
    const statusShimo = countStatus(shimoCount, TARGETS.shimo5);

    return (
      <div className="grid gap-4">
        <section className="surface">
          <h1 className="section-title">今日の俳句を作る</h1>
          <p className="small-note">文字数を見ながら、ゆっくり入力してください。</p>
        </section>

        {helpVisible ? (
          <section className="help-box">
            <div className="section-title">かんたんな使い方</div>
            <p>上五・中七・下五を入力すると、自動で下書き保存されます。</p>
            <p>「今日に保存」を押すと、その日の一句として残ります。</p>
            <p>データはこのスマホの中にだけ保存されます。消えることがあるので、時々バックアップしてください。</p>
            <button className="button muted" onClick={handleCloseHelp} type="button">
              わかった
            </button>
          </section>
        ) : (
          <section className="surface grid gap-3">
            <div className="section-title">季語ガチャ</div>
            <p className="small-note">テーマに迷ったときのヒントです。</p>
            <button className="button muted" type="button" onClick={handlePickKigo}>
              季語ガチャ
            </button>
            <div className="kigo-box">
              {kigoSuggestion ? (
                <>
                  <div className="kigo-word">{kigoSuggestion.word}</div>
                  <div className="kigo-meta">
                    {kigoSuggestion.reading} / {kigoSuggestion.season}
                  </div>
                </>
              ) : (
                'まだ引いていません。'
              )}
            </div>
          </section>
        )}

        <section className="surface grid gap-4">
          <div>
            <label className="label" htmlFor="kami5">
              上五
            </label>
            <textarea
              id="kami5"
              className="textarea"
              rows={2}
              value={draft.kami5}
              onChange={handleDraftChange('kami5')}
              placeholder="ここに上五"
            />
            <div className={`counter ${statusKami}`}>
              {kamiCount}/{TARGETS.kami5} {statusKami === 'ok' ? 'OK' : statusKami === 'over' ? '超過' : '不足'}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="naka7">
              中七
            </label>
            <textarea
              id="naka7"
              className="textarea"
              rows={2}
              value={draft.naka7}
              onChange={handleDraftChange('naka7')}
              placeholder="ここに中七"
            />
            <div className={`counter ${statusNaka}`}>
              {nakaCount}/{TARGETS.naka7} {statusNaka === 'ok' ? 'OK' : statusNaka === 'over' ? '超過' : '不足'}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="shimo5">
              下五
            </label>
            <textarea
              id="shimo5"
              className="textarea"
              rows={2}
              value={draft.shimo5}
              onChange={handleDraftChange('shimo5')}
              placeholder="ここに下五"
            />
            <div className={`counter ${statusShimo}`}>
              {shimoCount}/{TARGETS.shimo5} {statusShimo === 'ok' ? 'OK' : statusShimo === 'over' ? '超過' : '不足'}
            </div>
          </div>
        </section>

        <section className="surface grid gap-3">
          <div className="section-title">プレビュー</div>
          <div className="preview">{hasAnyLine ? preview : 'まだ俳句がありません。'}</div>
        </section>

        <section className="surface">
          <div className="button-row">
            <button className="button primary" type="button" onClick={handleSaveToday}>
              今日に保存
            </button>
            <button className="button muted" type="button" onClick={handleClear}>
              クリア
            </button>
          </div>
          {feedback ? (
            <div className={`feedback ${feedback.type}`} role="status" aria-live="polite">
              {feedback.message}
            </div>
          ) : null}
        </section>
      </div>
    );
  };

  const renderCalendar = () => (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <label className="label" htmlFor="month">
          月を選ぶ
        </label>
        <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <select
            id="year"
            className="select"
            value={viewYear}
            onChange={(event) => setViewYear(Number(event.target.value))}
          >
            {Array.from({ length: 5 }, (_, index) => todayParts.year - 2 + index).map((year) => (
              <option key={year} value={year}>
                {year}年
              </option>
            ))}
          </select>
          <select
            id="month"
            className="select"
            value={viewMonth}
            onChange={(event) => setViewMonth(Number(event.target.value))}
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
              <option key={month} value={month}>
                {month}月
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="calendar">
        {['日', '月', '火', '水', '木', '金', '土'].map((label) => (
          <div key={label} className="calendar-header">
            {label}
          </div>
        ))}
        {calendarDays.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} />;
          }
          const dateKey = dateKeyFromParts(viewYear, viewMonth, day);
          const entry = entriesByDate[dateKey];
          const isActive = selectedDateKey === dateKey;
          return (
            <button
              key={dateKey}
              type="button"
              className={`calendar-cell ${entry ? 'has-entry' : ''} ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedDateKey(dateKey)}
              aria-label={`${day}日${entry ? ' 保存あり' : ''}`}
            >
              <div>{day}</div>
              {entry ? <div className="calendar-dot">●</div> : <div className="calendar-dot">&nbsp;</div>}
            </button>
          );
        })}
      </div>
      <div className="surface">
        <div className="section-title">選んだ日の俳句</div>
        {selectedEntry ? (
          <div className="preview">{[selectedEntry.kami5, selectedEntry.naka7, selectedEntry.shimo5].join('\n')}</div>
        ) : selectedDateKey ? (
          <p className="small-note">その日はまだ保存されていません。</p>
        ) : (
          <p className="small-note">日付を選んでください。</p>
        )}
      </div>
    </div>
  );

  const renderList = () => (
    <div className="grid gap-3">
      {filteredEntries.length === 0 ? (
        <p className="small-note">{listEmptyMessage}</p>
      ) : (
        filteredEntries.map((entry) => (
          <button
            key={entry.dateKey}
            type="button"
            className="list-item"
            onClick={() => setSelectedDateKey(entry.dateKey)}
          >
            <div className="small-note">{formatDateLabel(entry.dateKey)}</div>
            <div className="preview" style={{ fontSize: '1.2rem' }}>
              {[entry.kami5, entry.naka7, entry.shimo5].join('\n')}
            </div>
          </button>
        ))
      )}
    </div>
  );

  const renderView = () => (
    <div className="grid gap-4">
      <section className="surface">
        <h1 className="section-title">俳句を見る</h1>
        <p className="small-note">保存した句をカレンダーや一覧で見返せます。</p>
      </section>

      <section className="surface grid gap-3">
        <label className="label" htmlFor="viewMode">
          表示方法
        </label>
        <select
          id="viewMode"
          className="select"
          value={viewMode}
          onChange={(event) => setViewMode(event.target.value as ViewMode)}
        >
          <option value="calendar">カレンダー</option>
          <option value="list">一覧</option>
        </select>
      </section>

      <section className="surface grid gap-3">
        <label className="label" htmlFor="search">
          キーワード検索
        </label>
        <input
          id="search"
          className="input"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="例: 春"
        />
        <div className="small-note">一致する句が一覧で絞り込まれます。</div>
      </section>

      {viewMode === 'calendar' ? renderCalendar() : renderList()}

      <section className="surface grid gap-3">
        <div className="section-title">バックアップ</div>
        <p className="small-note">端末の故障やデータ削除に備えて、時々保存してください。</p>
        <div className="button-row">
          <button className="button primary" type="button" onClick={handleExport}>
            JSONを書き出す
          </button>
          <button className="button muted" type="button" onClick={() => fileInputRef.current?.click()}>
            JSONを読み込む
          </button>
          <input
            ref={fileInputRef}
            id="import-file"
            type="file"
            accept="application/json"
            onChange={handleImport}
            hidden
          />
        </div>
        {feedback ? (
          <div className={`feedback ${feedback.type}`} role="status" aria-live="polite">
            {feedback.message}
          </div>
        ) : null}
      </section>
    </div>
  );

  return (
    <main className="grid gap-4">
      <section className="surface">
        <div className="section-title">おやの俳句</div>
        <div className="small-note">大きな文字で、今日の一句を残すアプリです。</div>
      </section>

      <div className="tab-bar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'create'}
          className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          作る
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'view'}
          className={`tab-button ${activeTab === 'view' ? 'active' : ''}`}
          onClick={() => setActiveTab('view')}
        >
          見る
        </button>
      </div>

      {activeTab === 'create' ? renderCreate() : renderView()}
    </main>
  );
}
