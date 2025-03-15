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
    // Handle movie format
    if (title.includes('-电影-')) {
      return title.split('-')[0].trim();
    }

    // For bilibili TV shows, extract title before season/episode info
    const seasonEpisodePattern = /^(.*?)\s*(?:第[\u4e00-\u9fa5]+季)?第[\u4e00-\u9fa5\d]+集/;
    const showMatch = title.match(seasonEpisodePattern);
    if (showMatch) return showMatch[1].trim();
  } else if (domain === 'iyf.tv') {
    // For iyf.tv, show titles typically include season in the title
    // Example: "别对我说谎第3季-04-免费在线观看-爱壹帆"
    const match = title.match(/^(.*?)(?:-\d+)?-/);
    if (match) return match[1].trim();
  } else if (domain === 'zxzjhd.com') {
    // For zxzjhd.com, titles are often in format: "《Show Title》第X集在线观看- Site"
    // Extract content within 《》 brackets if present
    const bracketMatch = title.match(/《(.*?)》/);
    if (bracketMatch) return bracketMatch[0]; // Return with brackets

    // Fallback for zxzjhd.com if no brackets
    const episodeMatch = title.match(/^(.*?)第[\u4e00-\u9fa5\d]+集/);
    if (episodeMatch) return episodeMatch[1].trim();
  }

  // Default fallback - more aggressive splitting to handle various formats
  // Try common separators
  const separators = ['-', '–', '—', ':', '：'];
  for (const separator of separators) {
    if (title.includes(separator)) {
      const parts = title.split(separator);
      // Return first non-empty part
      const firstPart = parts[0].trim();
      if (firstPart) return firstPart;
    }
  }

  // If no separators found, try to identify episodes with regex
  const episodeMatch = title.match(/^(.*?)(?:\s+第[\u4e00-\u9fa5\d]+[季集话部])/);
  if (episodeMatch) return episodeMatch[1].trim();

  // Last resort - return the whole title or first 30 chars if very long
  return title.length > 30 ? title.substring(0, 30) + '...' : title;
};
