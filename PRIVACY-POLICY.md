# Privacy Policy — 追剧备忘录 (Drama Memo)

**Last updated: April 11, 2026**

---

## Overview

追剧备忘录 (Drama Memo) is a Chrome extension that helps you track your video watching progress across streaming sites. This policy explains what data the extension accesses and how it is handled.

---

## Data We Access

### Browsing History

The extension reads your local browser history solely to identify video pages you have visited on supported streaming sites (bilibili.com, iyf.tv, zxzjhd.com). This data is:

- Processed entirely on your device
- Never transmitted to any external server
- Never shared with any third party
- Used only to display your watch history within the extension popup

### Tab Information

When you use the "Bookmark current page" feature, the extension reads the URL and title of your currently active tab to pre-fill the bookmark form. This data is:

- Used only at the moment you click the button
- Stored locally on your device if you choose to save the bookmark
- Never transmitted externally

---

## Data We Store

All data is stored locally on your device using `chrome.storage.local`. This includes:

- **Bookmarks** you manually add (URL, show title, episode progress)
- **Settings** you configure (history time range, max result count)
- **Theme preference** (light or dark mode)

No data is uploaded to any server or shared with any third party.

---

## Data We Do NOT Collect

- Personally identifiable information
- Health or financial information
- Authentication credentials
- Location data
- User activity (clicks, keystrokes, mouse position)
- Website content

---

## Third-Party Services

The extension fetches favicon images from `https://www.google.com/s2/favicons` to display site icons in the UI. This is a standard image request and does not transmit any user data beyond what a normal browser image request would include (your IP address, as with any HTTP request). No browsing history or personal data is included in this request.

---

## Data Retention

All locally stored data (bookmarks, settings, theme preference) remains on your device until you uninstall the extension or manually delete it. The extension does not control how long Chrome retains your browser history — that is managed by your own Chrome settings.

---

## Changes to This Policy

If the extension is updated in a way that changes data handling, this policy will be updated accordingly. The "Last updated" date at the top will reflect the most recent revision.

---

## Contact

If you have any questions about this privacy policy, please open an issue on the project repository:
[https://github.com/13ruceYu/chrome-ext-drama-memo](https://github.com/13ruceYu/chrome-ext-drama-memo)
