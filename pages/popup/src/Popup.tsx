import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { t } from '@extension/i18n';
import { ToggleButton } from '@extension/ui';
import { useState, useEffect } from 'react';

// Add interface for history items
interface HistoryItem {
  id: string;
  url: string;
  title: string;
  lastVisitTime: number;
}

const notificationOptions = {
  type: 'basic',
  iconUrl: chrome.runtime.getURL('icon-34.png'),
  title: 'Injecting content script error',
  message: 'You cannot inject script here!',
} as const;

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    // Fetch last 10 history items from the past 24 hours
    const fetchHistory = async () => {
      const millisecondsPerHour = 1000 * 60 * 60;
      const oneDayAgo = new Date().getTime() - millisecondsPerHour * 24;

      try {
        const items = await chrome.history.search({
          text: '', // Search all history
          startTime: oneDayAgo,
          maxResults: 10,
        });
        // Map Chrome history items to our HistoryItem interface
        const mappedItems: HistoryItem[] = items.map(item => ({
          id: item.id || '',
          url: item.url || '',
          title: item.title || '',
          lastVisitTime: item.lastVisitTime || 0,
        }));
        setHistory(mappedItems);
      } catch (error) {
        console.error('Error fetching history:', error);
      }
    };

    fetchHistory();
  }, []);

  const injectContentScript = async () => {
    const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });

    if (tab.url!.startsWith('about:') || tab.url!.startsWith('chrome:')) {
      chrome.notifications.create('inject-error', notificationOptions);
    }

    await chrome.scripting
      .executeScript({
        target: { tabId: tab.id! },
        files: ['/content-runtime/index.iife.js'],
      })
      .catch(err => {
        // Handling errors related to other paths
        if (err.message.includes('Cannot access a chrome:// URL')) {
          chrome.notifications.create('inject-error', notificationOptions);
        }
      });
  };

  return (
    <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <header className={`App-header ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <h2 className="text-lg font-bold mb-4">Recent History</h2>

        <div className="w-full max-h-60 overflow-y-auto mb-4 text-sm">
          {history.map(item => (
            <div key={item.id} className={`p-2 mb-2 rounded ${isLight ? 'bg-white shadow-sm' : 'bg-gray-700'}`}>
              <div className="font-medium truncate">{item.title || 'Untitled'}</div>
              <div className="text-xs opacity-75 truncate">{item.url}</div>
              <div className="text-xs opacity-75">{new Date(item.lastVisitTime).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <button
          className={
            'font-bold mt-4 py-1 px-4 rounded shadow hover:scale-105 ' +
            (isLight ? 'bg-blue-200 text-black' : 'bg-gray-700 text-white')
          }
          onClick={injectContentScript}>
          Click to inject Content Script
        </button>
        <ToggleButton>{t('toggleTheme')}</ToggleButton>
      </header>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
