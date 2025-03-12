/**
 * Extract domain from a URL
 */
export const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Get the base domain without subdomains (e.g., "youtube.com" from "www.youtube.com")
    const hostParts = urlObj.hostname.split('.');
    const domain =
      hostParts.length >= 2 ? `${hostParts[hostParts.length - 2]}.${hostParts[hostParts.length - 1]}` : urlObj.hostname;
    return domain;
  } catch {
    return 'unknown';
  }
};

/**
 * Extract show title from page title based on domain
 */
export const extractShowTitle = (title: string, domain: string): string => {
  if (!title) return 'Unknown';

  // Different extraction logic based on domain
  if (domain === 'bilibili.com') {
    // For bilibili, show titles typically appear before the episode info
    const showMatch = title.match(/^(.+?)\s*第[一二三四五六七八九十百千]+[季集]/);
    if (showMatch) return showMatch[1].trim();

    // If it's a movie
    if (title.includes('-电影-')) {
      return title.split('-')[0].trim();
    }
  } else if (domain === 'iyf.tv') {
    // For iyf.tv, show titles typically appear at the beginning
    const match = title.match(/^(.+?)[-－](\d+)/);
    if (match) return match[1].trim();
  }

  // Default fallback
  // Split by common separators and take the first part
  const parts = title.split(/[-–—:：]/);
  return parts[0].trim() || 'Unknown';
};
