'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { HaikuDraft, HaikuEntry, HaikuSeason, createEmptyDraft, formatDateTime, seasonLabel, seasonOptions } from '@/lib/haiku';
import { KigoItem, pickRandomKigo } from '@/lib/kigo';
import { countReadingChars } from '@/lib/reading';
import { clearDraft, loadDraft, loadEntries, saveDraft, saveEntries } from '@/lib/storage';

type Feedback = {
  type: 'success' | 'error';
  message: string;
};

type Screen = 'list' | 'edit';

const makeId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>('list');
  const [draft, setDraft] = useState<HaikuDraft>(createEmptyDraft());
  const [entries, setEntries] = useState<HaikuEntry[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<HaikuSeason | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [kigoSuggestion, setKigoSuggestion] = useState<KigoItem | null>(null);

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
    const timer = window.setTimeout(() => setFeedback(null), 2500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim();
    return sortedEntries.filter((entry) => {
      if (seasonFilter !== 'all' && entry.season !== seasonFilter) return false;
      if (!query) return true;
      const combined = `${entry.text}${entry.yomi}`;
      return combined.includes(query);
    });
  }, [searchQuery, seasonFilter, sortedEntries]);

  const handleDraftChange = (field: keyof HaikuDraft) => (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement>) => {
    setDraft((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleCreateNew = () => {
    setEditingId(null);
    setDraft(createEmptyDraft());
    setScreen('edit');
  };

  const handleEditEntry = (entry: HaikuEntry) => {
    setEditingId(entry.id);
    setDraft({ text: entry.text, yomi: entry.yomi, season: entry.season });
    setScreen('edit');
  };

  const handleSave = () => {
    if (!draft.text.trim()) {
      setFeedback({ type: 'error', message: '俳句を入力してください。' });
      return;
    }

    const now = new Date().toISOString();
    const nextEntries = editingId
      ? entries.map((entry) =>
          entry.id === editingId
            ? { ...entry, text: draft.text, yomi: draft.yomi, season: draft.season, updatedAt: now }
            : entry,
        )
      : [
          {
            id: makeId(),
            text: draft.text,
            yomi: draft.yomi,
            season: draft.season,
            createdAt: now,
            updatedAt: now,
          },
          ...entries,
        ];

    setEntries(nextEntries);
    const result = saveEntries(nextEntries);
    if (result.error) {
      setFeedback({ type: 'error', message: result.error });
      return;
    }

    setFeedback({ type: 'success', message: '保存しました。' });
    setEditingId(null);
    setDraft(createEmptyDraft());
    setScreen('list');
  };

  const handleDelete = () => {
    if (!editingId) return;
    const ok = window.confirm('この俳句を削除しますか？');
    if (!ok) return;

    const nextEntries = entries.filter((entry) => entry.id !== editingId);
    setEntries(nextEntries);
    const result = saveEntries(nextEntries);
    if (result.error) {
      setFeedback({ type: 'error', message: result.error });
      return;
    }

    setFeedback({ type: 'success', message: '削除しました。' });
    setEditingId(null);
    setDraft(createEmptyDraft());
    setScreen('list');
  };

  const handleBack = () => {
    setEditingId(null);
    setScreen('list');
  };

  const handleClearDraft = () => {
    const ok = window.confirm('入力中の内容を消しますか？');
    if (!ok) return;
    setDraft(createEmptyDraft());
    const result = clearDraft();
    if (result.error) {
      setFeedback({ type: 'error', message: result.error });
    }
  };

  const handlePickKigo = () => {
    const kigo = pickRandomKigo();
    setKigoSuggestion(kigo);
  };

  const reading = countReadingChars(draft.text, draft.yomi);

  return (
    <main className="grid gap-4">
      <section className="surface">
        <div className="section-title">おやの俳句メモ</div>
        <div className="small-note">俳句をためて見返すシンプルなメモアプリです。</div>
      </section>

      {screen === 'list' ? (
        <div className="grid gap-4">
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
            <label className="label" htmlFor="season-filter">
              季節フィルタ
            </label>
            <select
              id="season-filter"
              className="select"
              value={seasonFilter}
              onChange={(event) => setSeasonFilter(event.target.value as HaikuSeason | 'all')}
            >
              <option value="all">すべて</option>
              {seasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button className="button primary" type="button" onClick={handleCreateNew}>
              新しく作る
            </button>
          </section>

          <section className="grid gap-3">
            {filteredEntries.length === 0 ? (
              <p className="small-note">俳句がありません。</p>
            ) : (
              filteredEntries.map((entry) => (
                <button key={entry.id} type="button" className="list-item" onClick={() => handleEditEntry(entry)}>
                  <div className="small-note">{formatDateTime(entry.createdAt)}</div>
                  <div className="preview" style={{ fontSize: '1.2rem' }}>
                    {entry.text}
                  </div>
                  <div className="small-note">季節: {seasonLabel(entry.season)}</div>
                </button>
              ))
            )}
          </section>
        </div>
      ) : (
        <div className="grid gap-4">
          <section className="surface grid gap-3">
            <h1 className="section-title">俳句を編集</h1>
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
            <label className="label" htmlFor="text">
              俳句本文
            </label>
            <textarea
              id="text"
              className="textarea"
              rows={4}
              value={draft.text}
              onChange={handleDraftChange('text')}
              placeholder="俳句を入力"
            />

            <label className="label" htmlFor="yomi">
              よみ (ひらがな推奨)
            </label>
            <input
              id="yomi"
              className="input"
              value={draft.yomi}
              onChange={handleDraftChange('yomi')}
              placeholder="よみを入力すると正確に数えられます"
            />

            <label className="label" htmlFor="season">
              季節
            </label>
            <select id="season" className="select" value={draft.season} onChange={handleDraftChange('season')}>
              {seasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="counter ok">
              読み文字数: {reading.count} ({reading.source === 'yomi' ? 'よみ入力' : '本文から仮計算'})
            </div>
            <div className="small-note">空白や記号は数えません。</div>
          </section>

          <section className="surface">
            <div className="button-row">
              <button className="button primary" type="button" onClick={handleSave}>
                保存
              </button>
              <button className="button muted" type="button" onClick={handleClearDraft}>
                クリア
              </button>
              {editingId ? (
                <button className="button muted" type="button" onClick={handleDelete}>
                  削除
                </button>
              ) : null}
              <button className="button outline" type="button" onClick={handleBack}>
                一覧に戻る
              </button>
            </div>
            {feedback ? (
              <div className={`feedback ${feedback.type}`} role="status" aria-live="polite">
                {feedback.message}
              </div>
            ) : null}
          </section>
        </div>
      )}
    </main>
  );
}
