const BASE_URL = 'https://sports.highfly.dev/eyJpbmNsdWRlU3BvcnRzIjpbImZvb3RiYWxsIl19';

export interface MatchMeta {
  id: string;
  type: string;
  name: string;
  poster: string;
  posterShape: string;
  background: string;
  genres: string[];
  description: string;
  releaseInfo: string;
}

export interface Stream {
  name: string;
  title: string;
  url: string;
  behaviorHints?: {
    notWebReady?: boolean;
  };
}

// Fetch a specific catalog
export async function getCatalog(catalogId: string): Promise<MatchMeta[]> {
  try {
    const res = await fetch(`${BASE_URL}/catalog/sport/${catalogId}.json`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.metas || [];
  } catch (error) {
    console.error(`Failed to fetch catalog ${catalogId}:`, error);
    return [];
  }
}

// Fetch streams for a specific match
export async function getStreams(matchId: string): Promise<Stream[]> {
  try {
    const res = await fetch(`${BASE_URL}/stream/sport/${encodeURIComponent(matchId)}.json`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.streams || [];
  } catch (error) {
    console.error(`Failed to fetch streams for ${matchId}:`, error);
    return [];
  }
}

// Fetch single match meta
export async function getMeta(matchId: string): Promise<MatchMeta | null> {
  try {
    const res = await fetch(`${BASE_URL}/meta/sport/${encodeURIComponent(matchId)}.json`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.meta || null;
  } catch (error) {
    console.error(`Failed to fetch meta for ${matchId}:`, error);
    return null;
  }
}
