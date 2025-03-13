import '@src/Popup.css';
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

// Update interface for double-grouped history items
interface GroupedGroupedHistory {
  [domain: string]: {
    [showTitle: string]: HistoryItem[];
  };
}

// Add this constant at the top of the file, after the interfaces
const VIDEO_DOMAINS = ['bilibili.com/bangumi', 'iyf.tv/play'];

// Component for a single history item
const HistoryItemComponent = memo(({ item, isLight }: { item: HistoryItem; isLight: boolean }) => (
  <div className={`p-2 mb-1 rounded ${isLight ? 'bg-white shadow-sm' : 'bg-gray-700'}`}>
    <div className="font-medium truncate">{item.title || 'Untitled'}</div>
    <div className="flex justify-between text-xs">
      <a href={item.url} target="_blank" className="truncate cursor-pointer flex text-blue-400 hover:underline">
        {item.url}
      </a>
      <span className="text-gray-400 whitespace-nowrap ml-2">{new Date(item.lastVisitTime).toLocaleString()}</span>
    </div>
  </div>
));

// Component for show title block
const ShowBlock = memo(
  ({
    domain,
    showTitle,
    items,
    isLight,
    isExpanded,
    toggleBlock,
  }: {
    domain: string;
    showTitle: string;
    items: HistoryItem[];
    isLight: boolean;
    isExpanded: boolean;
    toggleBlock: (domain: string, showTitle: string) => void;
  }) => {
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
            {showTitle} ({items.length})
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
  }: {
    domain: string;
    showGroups: { [showTitle: string]: HistoryItem[] };
    isLight: boolean;
    expandedBlocks: { [key: string]: boolean };
    toggleBlock: (domain: string, showTitle?: string) => void;
  }) => {
    const isDomainExpanded = !!expandedBlocks[domain];

    const isShowExpanded = useCallback(
      (showTitle: string): boolean => {
        return !!expandedBlocks[`${domain}-${showTitle}`];
      },
      [domain, expandedBlocks],
    );

    const totalItems = useMemo(() => Object.values(showGroups).flat().length, [showGroups]);

    const showCount = Object.keys(showGroups).length;

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
            {Object.entries(showGroups).map(([showTitle, items]) => (
              <ShowBlock
                key={`${domain}-${showTitle}`}
                domain={domain}
                showTitle={showTitle}
                items={items}
                isLight={isLight}
                isExpanded={isShowExpanded(showTitle)}
                toggleBlock={(d, s) => toggleBlock(d, s)}
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

  // Function to toggle block expansion
  const toggleBlock = useCallback((domain: string, showTitle: string = '') => {
    const key = showTitle ? `${domain}-${showTitle}` : domain;
    setExpandedBlocks(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);

      try {
        const millisecondsPerYear = 1000 * 60 * 60 * 24 * 365; // milliseconds in a year
        const oneYearAgo = new Date().getTime() - millisecondsPerYear;

        const items = await chrome.history.search({
          text: '', // Search all history
          startTime: oneYearAgo,
          maxResults: 100000,
        });

        // Filter out video websites and map to our interface
        const mappedItems: HistoryItem[] = items
          .filter(item => {
            try {
              return VIDEO_DOMAINS.some(domain => item.url!.includes(domain));
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
    const grouped: GroupedGroupedHistory = {};

    items.forEach(item => {
      const domain = extractDomain(item.url);
      const showTitle = extractShowTitle(item.title, domain);

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
      className={`App flex flex-col h-screen ${
        isLight ? 'bg-slate-50 text-gray-900 light-theme' : 'bg-gray-800 text-gray-100 dark-theme'
      }`}>
      <header
        className={`flex items-center justify-between p-2 sticky top-0 z-10 ${
          isLight ? 'bg-slate-50' : 'bg-gray-800'
        }`}>
        <h2 className="text-lg font-bold">Recent History ({totalItemsCount})</h2>
        <div className="hover:bg-slate-500/20 rounded-full p-1 leading-none">
          <ToggleButton className="size-5"></ToggleButton>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-2">
        {isLoading ? (
          <div className="w-full text-center py-8">Loading history...</div>
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
            />
          ))
        )}
      </main>
      <footer className="py-2 text-center text-xs opacity-50">
        {!isLoading && totalItemsCount > 0 && `Showing ${totalItemsCount} history items`}
      </footer>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
