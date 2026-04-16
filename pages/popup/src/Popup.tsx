import './Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { ToggleButton } from '@extension/ui';
import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { extractDomain, extractShowTitle } from './utils';

// Update interface for history items
interface HistoryItem {
  id: string;
  url: string;
  title: string;
  lastVisitTime: number;
}

// Interface for manually saved bookmarks
interface Bookmark {
  id: string;
  url: string;
  title: string;
  showTitle: string;
  domain: string;
  addedAt: number;
  bvId?: string; // extracted BV number for bilibili/video URLs
}

// Update interface for double-grouped history items
interface GroupedGroupedHistory {
  [domain: string]: {
    [showTitle: string]: HistoryItem[];
  };
}

// Add this constant at the top of the file, after the interfaces
const DEFAULT_VIDEO_DOMAINS = ['bilibili.com/bangumi', 'bilibili.com/video', 'iyf.tv/play'];
const HISTORY_DAYS = 60;
const HISTORY_MAX_RESULTS = 5000;

const parseDomainRules = (raw: string): string[] => {
  const rules = raw
    .split(/\r?\n|,/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.replace(/^https?:\/\//, '').replace(/\/$/, ''));

  return Array.from(new Set(rules));
};

// SVG chevron — rotates 90° when open
const ChevronRight = ({ isOpen, className }: { isOpen: boolean; className?: string }) => (
  <svg
    className={`w-3 h-3 flex-shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''} ${className ?? ''}`}
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M4.5 2.5L7.5 6l-3 3.5" />
  </svg>
);

// Format bilibili raw title (e.g. "3_哔哩哔哩_bilibili") → "第 3 集"
const formatEpisodeTitle = (title: string, url: string): string => {
  if (url.includes('bilibili.com/video')) {
    const epMatch = title.match(/^(\d+)_/);
    if (epMatch) return `第 ${epMatch[1]} 集`;
  }
  return title || 'Untitled';
};

// Component for a single history item
const HistoryItemComponent = memo(({ item, isLight }: { item: HistoryItem; isLight: boolean }) => {
  const displayTitle = formatEpisodeTitle(item.title, item.url);
  const d = new Date(item.lastVisitTime);
  const date = d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className={`px-2.5 py-1.5 mb-0.5 rounded-md cursor-pointer flex justify-between items-center
        ${isLight ? 'hover:bg-gray-100 text-gray-800' : 'hover:bg-gray-700/50 text-gray-200'}
        transition-colors duration-100`}
      onClick={() => window.open(item.url, '_blank')}>
      <span className="text-sm truncate">{displayTitle}</span>
      <span className={`text-xs ml-3 flex-shrink-0 tabular-nums ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
        {date} {time}
      </span>
    </div>
  );
});

// Component for a single bookmark item
const BookmarkItemComponent = memo(
  ({ bookmark, isLight, onDelete }: { bookmark: Bookmark; isLight: boolean; onDelete: (id: string) => void }) => {
    const date = new Date(bookmark.addedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
    return (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div
        className={`px-3 py-2.5 mb-1 rounded-md cursor-pointer group
          ${isLight ? 'bg-white border border-gray-200 hover:border-gray-300' : 'bg-gray-800 border border-gray-700/50 hover:border-gray-600'}
          transition-colors duration-100`}
        onClick={() => window.open(bookmark.url, '_blank')}>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium truncate ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
              {bookmark.showTitle}
            </div>
            {bookmark.title && bookmark.title !== bookmark.showTitle && (
              <div className={`text-xs mt-0.5 truncate ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                {bookmark.title}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <span className={`text-xs tabular-nums ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>{date}</span>
            <button
              onClick={e => {
                e.stopPropagation();
                onDelete(bookmark.id);
              }}
              className={`text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-100
                ${isLight ? 'text-red-400 hover:text-red-500' : 'text-red-400/80 hover:text-red-400'}`}>
              删除
            </button>
          </div>
        </div>
      </div>
    );
  },
);

// Component for show title block
const ShowBlock = memo(
  ({
    domain,
    showTitle,
    items,
    isLight,
    isExpanded,
    toggleBlock,
    labelMap,
  }: {
    domain: string;
    showTitle: string;
    items: HistoryItem[];
    isLight: boolean;
    isExpanded: boolean;
    toggleBlock: (domain: string, showTitle: string) => void;
    labelMap?: { [key: string]: string };
  }) => {
    const displayTitle = labelMap?.[showTitle] ?? showTitle;
    const [showAll, setShowAll] = useState(false);
    const displayItems = showAll ? items : items.slice(0, 5);
    const latestDate = items[0]
      ? new Date(items[0].lastVisitTime).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
      : '';

    return (
      <div className="mb-0.5">
        <div
          className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer select-none
            ${isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-700/40'}
            transition-colors duration-100`}
          onClick={e => {
            e.stopPropagation();
            toggleBlock(domain, showTitle);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              toggleBlock(domain, showTitle);
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}>
          <div className="flex items-center gap-2 min-w-0">
            <ChevronRight isOpen={isExpanded} className={isLight ? 'text-gray-400' : 'text-gray-500'} />
            <span className={`text-sm font-medium truncate ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
              {displayTitle}
            </span>
            <span className={`text-xs flex-shrink-0 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
              {items.length}
            </span>
          </div>
          {!isExpanded && latestDate && (
            <span className={`text-xs flex-shrink-0 ml-2 tabular-nums ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
              {latestDate}
            </span>
          )}
        </div>

        {isExpanded && (
          <div className={`ml-4 pl-2.5 border-l ${isLight ? 'border-gray-200' : 'border-gray-700/50'}`}>
            {displayItems.map(item => (
              <HistoryItemComponent key={item.id} item={item} isLight={isLight} />
            ))}
            {items.length > 5 && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setShowAll(!showAll);
                }}
                className={`w-full text-center py-1 mt-1 text-xs rounded transition-colors duration-100
                  ${isLight ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-400'}`}>
                {showAll ? '收起' : `展开全部（还有 ${items.length - 5} 条）`}
              </button>
            )}
          </div>
        )}
      </div>
    );
  },
);

// Component for domain block
const DomainBlock = memo(
  ({
    domain,
    showGroups,
    isLight,
    expandedBlocks,
    toggleBlock,
    labelMap,
  }: {
    domain: string;
    showGroups: { [showTitle: string]: HistoryItem[] };
    isLight: boolean;
    expandedBlocks: { [key: string]: boolean };
    toggleBlock: (domain: string, showTitle?: string) => void;
    labelMap?: { [key: string]: string };
  }) => {
    const isDomainExpanded = !!expandedBlocks[domain];

    const isShowExpanded = useCallback(
      (showTitle: string): boolean => {
        return !!expandedBlocks[`${domain}-${showTitle}`];
      },
      [domain, expandedBlocks],
    );

    // Filter out BV groups that haven't been bookmarked
    const filteredShowGroups = useMemo(() => {
      const bvPattern = /^BV[\w]+$/;
      return Object.fromEntries(
        Object.entries(showGroups).filter(([showTitle]) => {
          if (bvPattern.test(showTitle)) return labelMap && showTitle in labelMap;
          return true;
        }),
      );
    }, [showGroups, labelMap]);

    const totalItems = useMemo(() => Object.values(filteredShowGroups).flat().length, [filteredShowGroups]);

    const showCount = Object.keys(filteredShowGroups).length;

    return (
      <div className="mb-5">
        {/* Domain section label — Linear style */}
        <div
          className={`flex items-center gap-2 px-1.5 py-1 mb-1.5 cursor-pointer select-none group
            transition-colors duration-100`}
          onClick={() => toggleBlock(domain)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') toggleBlock(domain);
          }}
          role="button"
          tabIndex={0}
          aria-expanded={isDomainExpanded}>
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
            alt="domain icon"
            className="w-3.5 h-3.5 opacity-60"
            onError={e => {
              (e.target as HTMLImageElement).src = chrome.runtime.getURL('icon-34.png');
            }}
          />
          <span
            className={`text-xs font-semibold tracking-widest uppercase
              ${isLight ? 'text-gray-400 group-hover:text-gray-600' : 'text-gray-500 group-hover:text-gray-300'}
              transition-colors duration-100`}>
            {domain}
          </span>
          <span className={`text-xs ${isLight ? 'text-gray-300' : 'text-gray-600'}`}>({totalItems})</span>
          <ChevronRight
            isOpen={isDomainExpanded}
            className={isLight ? 'text-gray-300 group-hover:text-gray-500' : 'text-gray-600 group-hover:text-gray-400'}
          />
          {!isDomainExpanded && (
            <span className={`text-xs ml-auto ${isLight ? 'text-gray-300' : 'text-gray-600'}`}>{showCount} 部剧</span>
          )}
        </div>

        {/* Separator */}
        <div className={`h-px mb-2 ${isLight ? 'bg-gray-200' : 'bg-gray-700/50'}`} />

        {isDomainExpanded && (
          <div>
            {Object.entries(filteredShowGroups).map(([showTitle, items]) => (
              <ShowBlock
                key={`${domain}-${showTitle}`}
                domain={domain}
                showTitle={showTitle}
                items={items}
                isLight={isLight}
                isExpanded={isShowExpanded(showTitle)}
                toggleBlock={(d, s) => toggleBlock(d, s)}
                labelMap={labelMap}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const [groupedGroupedHistory, setGroupedGroupedHistory] = useState<GroupedGroupedHistory>({});
  const [expandedBlocks, setExpandedBlocks] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'bookmarks' | 'settings'>('history');
  const [historyDays, setHistoryDays] = useState(HISTORY_DAYS);
  const [historyMaxResults, setHistoryMaxResults] = useState(HISTORY_MAX_RESULTS);
  const [settingsDraft, setSettingsDraft] = useState({ days: HISTORY_DAYS, maxResults: HISTORY_MAX_RESULTS });
  const [videoDomains, setVideoDomains] = useState<string[]>(DEFAULT_VIDEO_DOMAINS);
  const [domainRulesDraft, setDomainRulesDraft] = useState(DEFAULT_VIDEO_DOMAINS.join('\n'));
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({ url: '', title: '', showTitle: '' });

  // Function to toggle block expansion
  const toggleBlock = useCallback((domain: string, showTitle: string = '') => {
    const key = showTitle ? `${domain}-${showTitle}` : domain;
    setExpandedBlocks(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  useEffect(() => {
    chrome.storage.local.get(['bookmarks', 'historySettings', 'videoDomains'], result => {
      if (result.historySettings) {
        const s = result.historySettings as { days: number; maxResults: number };
        setHistoryDays(s.days);
        setHistoryMaxResults(s.maxResults);
        setSettingsDraft(s);
      }

      if (Array.isArray(result.videoDomains)) {
        const loaded = result.videoDomains
          .filter((v: unknown): v is string => typeof v === 'string')
          .map(v => v.trim())
          .filter(Boolean);

        if (loaded.length > 0) {
          setVideoDomains(loaded);
          setDomainRulesDraft(loaded.join('\n'));
        }
      }
    });
  }, []);

  useEffect(() => {
    chrome.storage.local.get('bookmarks', result => {
      const saved: Bookmark[] = result.bookmarks || [];
      // Backfill bvId for bookmarks saved before this field existed
      const backfilled = saved.map(b => {
        if (!b.bvId) {
          const match = b.url.match(/\/video\/(BV[\w]+)/);
          if (match) return { ...b, bvId: match[1] };
        }
        return b;
      });
      const changed = backfilled.some((b, i) => b.bvId !== saved[i].bvId);
      if (changed) chrome.storage.local.set({ bookmarks: backfilled });
      setBookmarks(backfilled);
    });
  }, []);

  const openAddForm = useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    setAddFormData({ url: tab.url || '', title: tab.title || '', showTitle: '' });
    setShowAddForm(true);
  }, []);

  const saveBookmark = useCallback(() => {
    const domain = extractDomain(addFormData.url);
    const bvMatch = addFormData.url.match(/\/video\/(BV[\w]+)/);
    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      url: addFormData.url,
      title: addFormData.title.trim() || addFormData.url,
      showTitle: addFormData.showTitle.trim() || domain,
      domain,
      addedAt: Date.now(),
      bvId: bvMatch ? bvMatch[1] : undefined,
    };
    const updated = [...bookmarks, newBookmark];
    chrome.storage.local.set({ bookmarks: updated });
    setBookmarks(updated);
    setShowAddForm(false);
  }, [addFormData, bookmarks]);

  const deleteBookmark = useCallback(
    (id: string) => {
      const updated = bookmarks.filter(b => b.id !== id);
      chrome.storage.local.set({ bookmarks: updated });
      setBookmarks(updated);
    },
    [bookmarks],
  );

  const groupedBookmarks = useMemo(() => {
    const result: { [domain: string]: { [showTitle: string]: Bookmark[] } } = {};
    bookmarks.forEach(b => {
      if (!result[b.domain]) result[b.domain] = {};
      if (!result[b.domain][b.showTitle]) result[b.domain][b.showTitle] = [];
      result[b.domain][b.showTitle].push(b);
    });
    return result;
  }, [bookmarks]);

  // Map BV ID → user's showTitle from bookmarks, for history tab group labels
  const bvTitleMap = useMemo(() => {
    const map: { [bvId: string]: string } = {};
    bookmarks.forEach(b => {
      if (b.bvId) map[b.bvId] = b.showTitle;
    });
    return map;
  }, [bookmarks]);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);

      try {
        const millisecondsPerDay = 1000 * 60 * 60 * 24;
        const startTime = new Date().getTime() - historyDays * millisecondsPerDay;

        // Let the loading state paint before we do heavier work.
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

        const items = await chrome.history.search({
          text: '', // Search all history
          startTime,
          maxResults: historyMaxResults,
        });

        // Filter out video websites and map to our interface
        const mappedItems: HistoryItem[] = items
          .filter(item => {
            try {
              if (!videoDomains.some(domain => item.url?.includes(domain))) return false;
              // bilibili /video/ URLs must have ?p= to be episodic
              if (item.url?.includes('bilibili.com/video')) {
                return new URL(item.url).searchParams.has('p');
              }
              return true;
            } catch {
              return false;
            }
          })
          .map(item => ({
            id: item.id || '',
            url: item.url || '',
            title: item.title || '',
            lastVisitTime: item.lastVisitTime || 0,
          }));

        // Group the items efficiently
        const grouped = processHistoryItems(mappedItems);
        setGroupedGroupedHistory(grouped);

        // Initialize expanded blocks
        initializeExpandedBlocks(grouped);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [historyDays, historyMaxResults, videoDomains]);

  // Process history items into grouped structure
  const processHistoryItems = (items: HistoryItem[]): GroupedGroupedHistory => {
    // Deduplicate: for all bilibili URLs, key = BV+p param; for others, key = hostname+pathname
    const seen = new Map<string, HistoryItem>();
    items.forEach(item => {
      let dedupeKey: string;
      try {
        const u = new URL(item.url);
        const bvMatch = item.url.match(/\/video\/(BV[\w]+)/);
        if (item.url.includes('bilibili.com/video') && bvMatch) {
          const p = u.searchParams.get('p') || '1';
          dedupeKey = `${bvMatch[1]}?p=${p}`;
        } else {
          dedupeKey = u.hostname + u.pathname;
        }
      } catch {
        dedupeKey = item.url;
      }
      const existing = seen.get(dedupeKey);
      if (!existing || item.lastVisitTime > existing.lastVisitTime) {
        seen.set(dedupeKey, item);
      }
    });

    const grouped: GroupedGroupedHistory = {};

    seen.forEach(item => {
      const domain = extractDomain(item.url);
      const showTitle = extractShowTitle(item.title, domain, item.url);

      if (!grouped[domain]) {
        grouped[domain] = {};
      }

      if (!grouped[domain][showTitle]) {
        grouped[domain][showTitle] = [];
      }

      grouped[domain][showTitle].push(item);
    });

    // Sort items within each show group
    Object.keys(grouped).forEach(domain => {
      Object.keys(grouped[domain]).forEach(showTitle => {
        grouped[domain][showTitle].sort((a, b) => b.lastVisitTime - a.lastVisitTime);
      });
    });

    return grouped;
  };

  // Initialize expanded blocks state
  const initializeExpandedBlocks = (grouped: GroupedGroupedHistory) => {
    const initialExpanded: { [key: string]: boolean } = {};

    // Expand all domains by default
    Object.keys(grouped).forEach(domain => {
      initialExpanded[domain] = true;
    });

    // Expand only the most recent show in each domain
    Object.entries(grouped).forEach(([domain, showGroups]) => {
      let mostRecentShow = '';
      let mostRecentTime = 0;

      Object.entries(showGroups).forEach(([showTitle, items]) => {
        if (items.length > 0 && items[0].lastVisitTime > mostRecentTime) {
          mostRecentTime = items[0].lastVisitTime;
          mostRecentShow = showTitle;
        }
      });

      if (mostRecentShow) {
        initialExpanded[`${domain}-${mostRecentShow}`] = true;
      }
    });

    setExpandedBlocks(initialExpanded);
  };

  // Calculate total items count
  const totalItemsCount = useMemo(
    () => Object.values(groupedGroupedHistory).flatMap(domainGroup => Object.values(domainGroup).flat()).length,
    [groupedGroupedHistory],
  );

  return (
    <div
      className={`App flex flex-col h-screen ${isLight ? 'bg-slate-50 text-gray-900' : 'bg-gray-900 text-gray-100'}`}>
      {/* Header */}
      <header className={`px-4 pt-3 pb-0 sticky top-0 z-10 ${isLight ? 'bg-slate-50' : 'bg-gray-900'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img src={chrome.runtime.getURL('icon-34.png')} alt="icon" className="w-5 h-5" />
            <div>
              <h1 className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>追剧备忘录</h1>
            </div>
          </div>
          <button
            className={`p-1.5 rounded-md transition-colors duration-100
              ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-800 text-gray-400'}`}>
            <ToggleButton className="size-4" />
          </button>
        </div>
        {/* Underline tabs */}
        <div className={`flex border-b ${isLight ? 'border-gray-200' : 'border-gray-700/60'}`}>
          {(['history', 'bookmarks', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-2 text-sm transition-colors duration-150
                ${
                  activeTab === tab
                    ? isLight
                      ? 'text-gray-900 font-medium'
                      : 'text-gray-100 font-medium'
                    : isLight
                      ? 'text-gray-400 hover:text-gray-600'
                      : 'text-gray-500 hover:text-gray-300'
                }`}>
              {tab === 'history' ? '历史记录' : tab === 'bookmarks' ? '我的收藏' : '设置'}
              {activeTab === tab && (
                <span
                  className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-t ${isLight ? 'bg-gray-800' : 'bg-gray-200'}`}
                />
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 pt-3 pb-4">
        {activeTab === 'history' ? (
          isLoading ? (
            <div className="loading-container" aria-live="polite">
              <div className="loading-spinner" aria-hidden="true"></div>
              <div className={`loading-text ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>加载中…</div>
            </div>
          ) : totalItemsCount === 0 ? (
            <div className={`w-full text-center py-12 text-sm ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
              暂无观看记录
            </div>
          ) : (
            Object.entries(groupedGroupedHistory).map(([domain, showGroups]) => (
              <DomainBlock
                key={domain}
                domain={domain}
                showGroups={showGroups}
                isLight={isLight}
                expandedBlocks={expandedBlocks}
                toggleBlock={toggleBlock}
                labelMap={bvTitleMap}
              />
            ))
          )
        ) : activeTab === 'bookmarks' ? (
          <div>
            {/* Add bookmark button / form */}
            {showAddForm ? (
              <div
                className={`rounded-lg p-4 mb-4 ${
                  isLight ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-700/50'
                }`}>
                <h3 className={`text-sm font-semibold mb-3 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                  添加收藏
                </h3>
                <div className="mb-2.5">
                  <label
                    htmlFor="bm-url"
                    className={`text-xs block mb-1 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                    网址
                  </label>
                  <input
                    id="bm-url"
                    className={`w-full px-3 py-1.5 rounded-md text-sm focus:outline-none transition-colors
                      ${isLight ? 'bg-gray-50 border border-gray-300 focus:border-gray-400 text-gray-900' : 'bg-gray-900 border border-gray-600 focus:border-gray-500 text-gray-100'}`}
                    value={addFormData.url}
                    onChange={e => setAddFormData(prev => ({ ...prev, url: e.target.value }))}
                  />
                </div>
                <div className="mb-2.5">
                  <label
                    htmlFor="bm-show"
                    className={`text-xs block mb-1 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                    剧名（用于分组）
                  </label>
                  <input
                    id="bm-show"
                    className={`w-full px-3 py-1.5 rounded-md text-sm focus:outline-none transition-colors
                      ${isLight ? 'bg-gray-50 border border-gray-300 focus:border-gray-400 text-gray-900' : 'bg-gray-900 border border-gray-600 focus:border-gray-500 text-gray-100'}`}
                    placeholder="例：毒枭 第一季"
                    value={addFormData.showTitle}
                    onChange={e => setAddFormData(prev => ({ ...prev, showTitle: e.target.value }))}
                  />
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="bm-title"
                    className={`text-xs block mb-1 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                    进度（看到哪集）
                  </label>
                  <input
                    id="bm-title"
                    className={`w-full px-3 py-1.5 rounded-md text-sm focus:outline-none transition-colors
                      ${isLight ? 'bg-gray-50 border border-gray-300 focus:border-gray-400 text-gray-900' : 'bg-gray-900 border border-gray-600 focus:border-gray-500 text-gray-100'}`}
                    placeholder="例：第 5 集"
                    value={addFormData.title}
                    onChange={e => setAddFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveBookmark}
                    className="px-4 py-1.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors duration-100">
                    保存
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className={`px-4 py-1.5 rounded-md text-sm transition-colors duration-100
                      ${isLight ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-400 hover:bg-gray-700'}`}>
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={openAddForm}
                className={`w-full py-2 mb-4 rounded-md text-sm border transition-colors duration-100
                  ${isLight ? 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50' : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300 hover:bg-gray-800/50'}`}>
                + 收藏当前页面
              </button>
            )}

            {/* Bookmark list */}
            {bookmarks.length === 0 ? (
              <div className={`w-full text-center py-12 text-sm ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                暂无收藏
              </div>
            ) : (
              Object.entries(groupedBookmarks).map(([domain, showGroups]) => (
                <div key={domain} className="mb-5">
                  {/* Domain label */}
                  <div className="flex items-center gap-2 px-1.5 py-1 mb-1.5">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                      alt="domain icon"
                      className="w-3.5 h-3.5 opacity-60"
                      onError={e => {
                        (e.target as HTMLImageElement).src = chrome.runtime.getURL('icon-34.png');
                      }}
                    />
                    <span
                      className={`text-xs font-semibold tracking-widest uppercase ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                      {domain}
                    </span>
                  </div>
                  <div className={`h-px mb-3 ${isLight ? 'bg-gray-200' : 'bg-gray-700/50'}`} />
                  {Object.entries(showGroups).map(([showTitle, items]) => (
                    <div key={showTitle} className="mb-3">
                      <p className={`text-xs px-1 mb-1.5 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                        {showTitle}
                      </p>
                      {items.map(bookmark => (
                        <BookmarkItemComponent
                          key={bookmark.id}
                          bookmark={bookmark}
                          isLight={isLight}
                          onDelete={deleteBookmark}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'settings' ? (
          <div className="py-2">
            <p
              className={`text-xs font-semibold tracking-widest uppercase mb-4 px-1 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
              历史搜索范围
            </p>
            <div
              className={`rounded-lg p-4 ${isLight ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-700/50'}`}>
              <div className="mb-4">
                <label
                  htmlFor="settings-days"
                  className={`text-xs block mb-1.5 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  时间范围（天）
                </label>
                <input
                  id="settings-days"
                  type="number"
                  min={1}
                  max={365}
                  className={`w-full px-3 py-1.5 rounded-md text-sm focus:outline-none transition-colors
                    ${isLight ? 'bg-gray-50 border border-gray-300 focus:border-gray-400 text-gray-900' : 'bg-gray-900 border border-gray-600 focus:border-gray-500 text-gray-100'}`}
                  value={settingsDraft.days}
                  onChange={e => setSettingsDraft(prev => ({ ...prev, days: Number(e.target.value) }))}
                />
                <p className={`text-xs mt-1 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>当前：{historyDays} 天</p>
              </div>
              <div className="mb-4">
                <label
                  htmlFor="settings-max"
                  className={`text-xs block mb-1.5 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  最大条数
                </label>
                <input
                  id="settings-max"
                  type="number"
                  min={100}
                  max={50000}
                  step={100}
                  className={`w-full px-3 py-1.5 rounded-md text-sm focus:outline-none transition-colors
                    ${isLight ? 'bg-gray-50 border border-gray-300 focus:border-gray-400 text-gray-900' : 'bg-gray-900 border border-gray-600 focus:border-gray-500 text-gray-100'}`}
                  value={settingsDraft.maxResults}
                  onChange={e => setSettingsDraft(prev => ({ ...prev, maxResults: Number(e.target.value) }))}
                />
                <p className={`text-xs mt-1 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                  当前：{historyMaxResults} 条
                </p>
              </div>
              <div className="mb-4">
                <label
                  htmlFor="settings-domains"
                  className={`text-xs block mb-1.5 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  站点匹配规则（每行一个，支持逗号分隔）
                </label>
                <textarea
                  id="settings-domains"
                  rows={5}
                  className={`w-full px-3 py-2 rounded-md text-sm focus:outline-none transition-colors resize-y
                    ${isLight ? 'bg-gray-50 border border-gray-300 focus:border-gray-400 text-gray-900' : 'bg-gray-900 border border-gray-600 focus:border-gray-500 text-gray-100'}`}
                  value={domainRulesDraft}
                  onChange={e => setDomainRulesDraft(e.target.value)}
                />
                <p className={`text-xs mt-1 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                  当前生效：{videoDomains.length} 条规则
                </p>
              </div>
              <button
                onClick={() => {
                  const s = { days: settingsDraft.days, maxResults: settingsDraft.maxResults };
                  const parsedDomains = parseDomainRules(domainRulesDraft);
                  const nextDomains = parsedDomains.length > 0 ? parsedDomains : DEFAULT_VIDEO_DOMAINS;
                  chrome.storage.local.set({ historySettings: s });
                  chrome.storage.local.set({ videoDomains: nextDomains });
                  setHistoryDays(s.days);
                  setHistoryMaxResults(s.maxResults);
                  setVideoDomains(nextDomains);
                  setDomainRulesDraft(nextDomains.join('\n'));
                  setActiveTab('history');
                }}
                className="px-4 py-1.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors duration-100">
                保存并刷新
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
