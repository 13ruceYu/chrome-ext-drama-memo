# Chrome Web Store 发布文案

## Single Purpose Description（单一用途描述）

> Track your video watching progress across streaming sites (Bilibili, IYF.tv, ZXZJHD) — see what you've watched and jump back in instantly.

---

## Privacy Practices — Permission Justifications

### `history`

**Justification:**
> The extension reads the user's browsing history solely to identify video pages visited on supported streaming sites (Bilibili, IYF.tv, ZXZJHD.com). This data is used exclusively to display a grouped, deduplicated watch history within the extension popup, so the user can quickly see their progress and resume playback. No history data is transmitted off-device or stored outside the browser's local storage.

---

### Host Permissions (`<all_urls>`)

**Justification:**
> Host permissions are required to match and filter browsing history entries across supported streaming domains (bilibili.com, iyf.tv, zxzjhd.com). The extension uses these permissions only to identify video URLs within the user's local history; it does not inject scripts into pages, make network requests to external servers, or collect any user data.

---

### `notifications`

**Justification:**
> The notifications permission is declared for potential future use in alerting the user when new episodes of bookmarked shows become available. It is not actively used in the current version. No notifications are sent without explicit user interaction.

**Note:** 如果确认当前版本完全未使用，建议直接从 `manifest.ts` 的 `permissions` 中移除 `notifications`，以简化审核。

---

### Remote Code

**Justification:**
> This extension does not execute any remote code. All JavaScript is bundled at build time and included in the extension package. No `eval`, `new Function`, or dynamic script loading from remote sources is used.

---

### `scripting`

**Justification:**
> The scripting permission is declared to support potential future content script injection on streaming pages. In the current version, it is not actively invoked — no scripts are injected into any page programmatically. A static content script (content.css) is registered via `content_scripts` in the manifest solely to reset default page styles within the extension's own popup.

**Note:** 如果当前版本确实不需要动态注入，建议移除 `scripting` 权限，仅保留 manifest 中的静态 `content_scripts`。

---

### `storage`

**Justification:**
> The extension uses `chrome.storage.local` to persist:
>
> 1. Manually added bookmarks (URL, show title, episode progress) created by the user
> 2. User-configured history search settings (time range and max result count)
> 3. The UI theme preference (light/dark mode)
>
> All stored data remains on the user's device and is never transmitted externally.

---

### `tabs`

**Justification:**
> The tabs permission is used solely to read the URL and title of the currently active tab when the user clicks "Bookmark current page" in the extension popup. This allows the form to be pre-filled with the current page's information for convenience. No tab data is stored or transmitted beyond what the user explicitly saves as a bookmark.

---

## 其他发布信息参考

| 字段 | 内容 |
|---|---|
| **Extension name** | 追剧备忘录 (Drama Memo) |
| **Short description** (132 chars max) | Track your video watch history across streaming sites. See what you've watched, pick up where you left off. |
| **Category** | Productivity |
| **Language** | Chinese (Simplified) |
| **Screenshots needed** | History tab, Bookmarks tab, Settings tab (light + dark mode recommended) |
