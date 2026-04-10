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
const VIDEO_DOMAINS = ['bilibili.com/bangumi', 'bilibili.com/video', 'iyf.tv/play', 'zxzjhd.com/video'];
const HISTORY_DAYS = 60;
const HISTORY_MAX_RESULTS = 5000;

// Component for a single history item
const HistoryItemComponent = memo(({ item, isLight }: { item: HistoryItem; isLight: boolean }) => {
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className={`p-2 mb-1 rounded ${isLight ? 'bg-white shadow-sm hover:bg-blue-50' : 'bg-gray-700 hover:bg-gray-600'} 
      transition-colors duration-150 cursor-pointer group`}
      onClick={() => window.open(item.url, '_blank')}>
      <div className="font-medium truncate flex justify-between">
        <span>{item.title || 'Untitled'}</span>
      </div>
      <div className="flex justify-between text-xs mt-1">
        <a
          href={item.url}
          target="_blank"
          className="truncate text-blue-400 hover:underline"
          onClick={e => e.stopPropagation()}>
          {item.url}
        </a>
        <span className="text-gray-400 whitespace-nowrap ml-2">{new Date(item.lastVisitTime).toLocaleString()}</span>
      </div>
    </div>
  );
});

// Component for a single bookmark item
const BookmarkItemComponent = memo(
  ({ bookmark, isLight, onDelete }: { bookmark: Bookmark; isLight: boolean; onDelete: (id: string) => void }) => {
    return (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div
        className={`p-2 mb-1 rounded ${
          isLight ? 'bg-white shadow-sm hover:bg-blue-50' : 'bg-gray-700 hover:bg-gray-600'
        } transition-colors duration-150 cursor-pointer`}
        onClick={() => window.open(bookmark.url, '_blank')}>
        <div className="font-medium truncate flex justify-between items-center">
          <span>{bookmark.showTitle}</span>
          <button
            onClick={e => {
              e.stopPropagation();
              onDelete(bookmark.id);
            }}
            className="ml-2 flex-shrink-0 text-xs text-red-400 hover:text-red-300">
            删除
          </button>
        </div>
        {bookmark.title && bookmark.title !== bookmark.showTitle && (
          <div className="text-xs opacity-70 truncate mt-0.5">{bookmark.title}</div>
        )}
        <div className="flex justify-between text-xs mt-1">
          <a
            href={bookmark.url}
            target="_blank"
            className="truncate text-blue-400 hover:underline"
            onClick={e => e.stopPropagation()}>
            {bookmark.url}
          </a>
          <span className="text-gray-400 whitespace-nowrap ml-2">
            {new Date(bookmark.addedAt).toLocaleDateString()}
          </span>
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

    return (
      <div className="mb-3">
        <div
          className={`flex items-center justify-between p-1.5 ${
            isLight ? 'bg-gray-100' : 'bg-gray-600'
          } rounded-t cursor-pointer hover:bg-opacity-80`}
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
          <h4 className="font-medium flex items-center">
            <span className="mr-1 text-xs">{isExpanded ? '▼' : '►'}</span>
            {displayTitle} ({items.length})
          </h4>
          {!isExpanded && items.length > 0 && (
            <span className="text-xs opacity-70">Latest: {new Date(items[0].lastVisitTime).toLocaleDateString()}</span>
          )}
        </div>

        {isExpanded && (
          <div className="p-1">
            {displayItems.map(item => (
              <HistoryItemComponent key={item.id} item={item} isLight={isLight} />
            ))}
            {items.length > 5 && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setShowAll(!showAll);
                }}
                className={`w-full text-center py-1 mt-2 text-sm rounded ${
                  isLight ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-600 hover:bg-gray-500'
                }`}>
                {showAll ? 'Show Less' : `Show All (${items.length - 5} more)`}
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
      <div className="mb-6">
        <div
          className={`flex items-center p-2 ${
            isLight ? 'bg-gray-300' : 'bg-gray-600'
          } rounded-t cursor-pointer hover:bg-opacity-90`}
          onClick={() => toggleBlock(domain)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') toggleBlock(domain);
          }}
          role="button"
          tabIndex={0}
          aria-expanded={isDomainExpanded}>
          <span className="mr-1 text-xs">{isDomainExpanded ? '▼' : '►'}</span>
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
            alt="domain icon"
            className="w-5 h-5 mr-2"
            onError={e => {
              (e.target as HTMLImageElement).src = chrome.runtime.getURL('icon-34.png');
            }}
          />
          <h3 className="font-bold">
            {domain} ({totalItems})
          </h3>

          {!isDomainExpanded && <span className="text-xs opacity-70 ml-auto">{showCount} shows</span>}
        </div>

        {isDomainExpanded && (
          <div className={`rounded-b ${isLight ? 'bg-gray-200' : 'bg-gray-700'} p-2 mb-2`}>
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
  const [activeTab, setActiveTab] = useState<'history' | 'bookmarks'>('history');
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
        const startTime = new Date().getTime() - HISTORY_DAYS * millisecondsPerDay;

        // Let the loading state paint before we do heavier work.
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

        const items = await chrome.history.search({
          text: '', // Search all history
          startTime,
          maxResults: HISTORY_MAX_RESULTS,
        });

        // Filter out video websites and map to our interface
        const mappedItems: HistoryItem[] = items
          .filter(item => {
            try {
              if (!VIDEO_DOMAINS.some(domain => item.url?.includes(domain))) return false;
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
  }, []);

  // Process history items into grouped structure
  const processHistoryItems = (items: HistoryItem[]): GroupedGroupedHistory => {
    // Deduplicate: for bilibili/video, key = BV+p param; for others, key = URL (stripped of tracking params)
    const seen = new Map<string, HistoryItem>();
    items.forEach(item => {
      let dedupeKey: string;
      try {
        const u = new URL(item.url);
        if (item.url.includes('bilibili.com/video')) {
          const bvMatch = item.url.match(/\/video\/(BV[\w]+)/);
          const p = u.searchParams.get('p') || '1';
          dedupeKey = bvMatch ? `${bvMatch[1]}?p=${p}` : item.url;
        } else {
          // Strip common tracking params and use pathname+essential params as key
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

    // Sort items within each show group and dedup by p-param within BV groups
    Object.keys(grouped).forEach(domain => {
      Object.keys(grouped[domain]).forEach(showTitle => {
        grouped[domain][showTitle].sort((a, b) => b.lastVisitTime - a.lastVisitTime);
        // Secondary dedup within each group by episode number (p param)
        if (/^BV[\w]+$/.test(showTitle)) {
          const seenEpisodes = new Set<string>();
          grouped[domain][showTitle] = grouped[domain][showTitle].filter(item => {
            try {
              const p = new URL(item.url).searchParams.get('p') || '1';
              if (seenEpisodes.has(p)) return false;
              seenEpisodes.add(p);
              return true;
            } catch {
              return true;
            }
          });
        }
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
      className={`App flex flex-col h-screen ${
        isLight ? 'bg-slate-50 text-gray-900 light-theme' : 'bg-gray-800 text-gray-100 dark-theme'
      }`}>
      <header className={`flex flex-col p-2 sticky top-0 z-10 ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {activeTab === 'history' ? `历史记录 (${totalItemsCount})` : `我的收藏 (${bookmarks.length})`}
          </h2>
          <div className="hover:bg-slate-500/20 rounded-full p-1 leading-none">
            <ToggleButton className="size-5"></ToggleButton>
          </div>
        </div>
        <div className="flex mt-1.5 gap-2">
          <button
            className={`flex-1 py-1 text-sm rounded ${
              activeTab === 'history'
                ? isLight
                  ? 'bg-gray-300 font-bold'
                  : 'bg-gray-500 font-bold'
                : isLight
                  ? 'bg-gray-100'
                  : 'bg-gray-700'
            }`}
            onClick={() => setActiveTab('history')}>
            历史记录
          </button>
          <button
            className={`flex-1 py-1 text-sm rounded ${
              activeTab === 'bookmarks'
                ? isLight
                  ? 'bg-gray-300 font-bold'
                  : 'bg-gray-500 font-bold'
                : isLight
                  ? 'bg-gray-100'
                  : 'bg-gray-700'
            }`}
            onClick={() => setActiveTab('bookmarks')}>
            我的收藏
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-2">
        {activeTab === 'history' ? (
          isLoading ? (
            <div className="loading-container" aria-live="polite">
              <div className="loading-spinner" aria-hidden="true"></div>
              <div className="loading-text">Loading history...</div>
            </div>
          ) : totalItemsCount === 0 ? (
            <div className="w-full text-center py-8">No video history found</div>
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
        ) : (
          <div className="mt-2">
            {showAddForm ? (
              <div className={`p-3 mb-3 rounded ${isLight ? 'bg-gray-100' : 'bg-gray-700'}`}>
                <h3 className="font-bold mb-2">添加收藏</h3>
                <div className="mb-2">
                  <label htmlFor="bm-url" className="text-xs opacity-70 block mb-1">
                    网址
                  </label>
                  <input
                    id="bm-url"
                    className={`w-full p-1.5 rounded text-sm ${
                      isLight ? 'bg-white border border-gray-300' : 'bg-gray-600 border-0'
                    }`}
                    value={addFormData.url}
                    onChange={e => setAddFormData(prev => ({ ...prev, url: e.target.value }))}
                  />
                </div>
                <div className="mb-2">
                  <label htmlFor="bm-show" className="text-xs opacity-70 block mb-1">
                    剧名（用于分组）
                  </label>
                  <input
                    id="bm-show"
                    className={`w-full p-1.5 rounded text-sm ${
                      isLight ? 'bg-white border border-gray-300' : 'bg-gray-600 border-0'
                    }`}
                    placeholder="例：毒枭 第一季"
                    value={addFormData.showTitle}
                    onChange={e => setAddFormData(prev => ({ ...prev, showTitle: e.target.value }))}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="bm-title" className="text-xs opacity-70 block mb-1">
                    标题（当前看到哪集）
                  </label>
                  <input
                    id="bm-title"
                    className={`w-full p-1.5 rounded text-sm ${
                      isLight ? 'bg-white border border-gray-300' : 'bg-gray-600 border-0'
                    }`}
                    placeholder="例：第5集"
                    value={addFormData.title}
                    onChange={e => setAddFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveBookmark}
                    className="flex-1 py-1.5 rounded bg-blue-500 hover:bg-blue-400 text-white text-sm">
                    保存
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className={`flex-1 py-1.5 rounded text-sm ${
                      isLight ? 'bg-gray-200 hover:bg-gray-300' : 'bg-gray-600 hover:bg-gray-500'
                    }`}>
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={openAddForm}
                className={`w-full py-2 mb-3 rounded text-sm ${
                  isLight ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-700 hover:bg-gray-600'
                }`}>
                + 收藏当前页面
              </button>
            )}
            {bookmarks.length === 0 ? (
              <div className="w-full text-center py-8 opacity-50">暂无收藏</div>
            ) : (
              Object.entries(groupedBookmarks).map(([domain, showGroups]) => (
                <div key={domain} className="mb-6">
                  <div className={`flex items-center p-2 ${isLight ? 'bg-gray-300' : 'bg-gray-600'} rounded-t`}>
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                      alt="domain icon"
                      className="w-5 h-5 mr-2"
                      onError={e => {
                        (e.target as HTMLImageElement).src = chrome.runtime.getURL('icon-34.png');
                      }}
                    />
                    <h3 className="font-bold">{domain}</h3>
                  </div>
                  <div className={`rounded-b ${isLight ? 'bg-gray-200' : 'bg-gray-700'} p-2 mb-2`}>
                    {Object.entries(showGroups).map(([showTitle, items]) => (
                      <div key={showTitle} className="mb-3">
                        <h4 className={`font-medium p-1.5 ${isLight ? 'bg-gray-100' : 'bg-gray-600'} rounded-t mb-1`}>
                          {showTitle}
                        </h4>
                        <div className="p-1">
                          {items.map(bookmark => (
                            <BookmarkItemComponent
                              key={bookmark.id}
                              bookmark={bookmark}
                              isLight={isLight}
                              onDelete={deleteBookmark}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
      <footer className="py-2 text-center text-xs opacity-50">
        {!isLoading && totalItemsCount > 0 && `Showing ${totalItemsCount} history items`}
      </footer>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
