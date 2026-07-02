const BASE_URL = 'https://sports.highfly.dev/eyJpbmNsdWRlU3BvcnRzIjpbImZvb3RiYWxsIl19';
const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const ESPN_STANDINGS_URL = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings';
const ESPN_ALL_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20261231&limit=200';

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

export interface FusedMatch {
  id: string;
  stremioId: string | null;
  status: 'pre' | 'in' | 'post'; // Upcoming, Live, Finished
  statusDetail: string; // e.g. "FT", "75'", "15:00"
  date: string;
  league: string;
  team1: { name: string; logo: string; score: string };
  team2: { name: string; logo: string; score: string };
}

export interface StandingEntry {
  rank: number;
  team: { name: string; logo: string; abbreviation: string; };
  gp: number; w: number; d: number; l: number;
  gf: number; ga: number; gd: string; pts: number;
  advanced: boolean;
}

export interface Group {
  name: string;
  entries: StandingEntry[];
}

export async function getGroupStandings(): Promise<Group[]> {
  try {
    const res = await fetch(ESPN_STANDINGS_URL, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.children || []).map((group: any): Group => ({
      name: group.name,
      entries: (group.standings?.entries || []).map((entry: any): StandingEntry => {
        const stat = (name: string) => entry.stats?.find((s: any) => s.name === name)?.value ?? 0;
        const statStr = (name: string) => entry.stats?.find((s: any) => s.name === name)?.displayValue ?? '0';
        return {
          rank: stat('rank'),
          team: {
            name: entry.team?.displayName || 'Unknown',
            logo: entry.team?.logos?.[0]?.href || '',
            abbreviation: entry.team?.abbreviation || '',
          },
          gp: stat('gamesPlayed'),
          w: stat('wins'),
          d: stat('ties'),
          l: stat('losses'),
          gf: stat('pointsFor'),
          ga: stat('pointsAgainst'),
          gd: statStr('pointDifferential'),
          pts: stat('points'),
          advanced: stat('advanced') === 1,
        };
      }).sort((a: StandingEntry, b: StandingEntry) => a.rank - b.rank),
    }));
  } catch {
    return [];
  }
}

export async function getAllFixtures(): Promise<FusedMatch[]> {
  try {
    const res = await fetch(ESPN_ALL_URL, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    const events = data.events || [];
    return events.map((e: any): FusedMatch => {
      const comp = e.competitions?.[0];
      const t1 = comp?.competitors?.[0];
      const t2 = comp?.competitors?.[1];
      return {
        id: `espn_${e.id}`,
        stremioId: null,
        status: e.status.type.state,
        statusDetail: e.status.type.shortDetail,
        date: e.date,
        league: e.season?.slug || 'fifa-world-cup',
        team1: { name: t1?.team?.name || 'TBD', logo: t1?.team?.logo || '', score: t1?.score || '-' },
        team2: { name: t2?.team?.name || 'TBD', logo: t2?.team?.logo || '', score: t2?.score || '-' },
      };
    });
  } catch {
    return [];
  }
}

// Internal function to get raw Stremio catalogs
async function getRawStremioCatalogs(): Promise<MatchMeta[]> {
  try {
    const [live, today, football] = await Promise.all([
      fetch(`${BASE_URL}/catalog/sport/sports_live.json`, { next: { revalidate: 60 } }).then(r => r.json()).catch(() => ({ metas: [] })),
      fetch(`${BASE_URL}/catalog/sport/sports_today.json`, { next: { revalidate: 60 } }).then(r => r.json()).catch(() => ({ metas: [] })),
      fetch(`${BASE_URL}/catalog/sport/sports_football.json`, { next: { revalidate: 60 } }).then(r => r.json()).catch(() => ({ metas: [] }))
    ]);
    
    // Deduplicate by ID
    const all = [...(live.metas || []), ...(today.metas || []), ...(football.metas || [])];
    const map = new Map<string, MatchMeta>();
    all.forEach(m => map.set(m.id, m));
    return Array.from(map.values());
  } catch (error) {
    return [];
  }
}

// The Fusion Engine
export async function getFusedMatches(): Promise<FusedMatch[]> {
  try {
    const [espnRes, stremioMetas] = await Promise.all([
      fetch(ESPN_URL, { next: { revalidate: 30 } }),
      getRawStremioCatalogs()
    ]);
    
    if (!espnRes.ok) return [];
    const espnData = await espnRes.json();
    const events = espnData.events || [];

    return events.map((e: any): FusedMatch => {
      const comp = e.competitions?.[0];
      const t1 = comp?.competitors?.[0];
      const t2 = comp?.competitors?.[1];

      // Fuzzy matching algorithm using name and aliases
      const aliases: Record<string, string[]> = {
        'united states': ['usa'],
        'england': ['uk', 'great britain', 'britain'],
        'bosnia-herzegovina': ['bosnia', 'bih']
      };

      const t1Name = t1?.team?.name?.toLowerCase() || "";
      const t2Name = t2?.team?.name?.toLowerCase() || "";
      const t1Abbr = t1?.team?.abbreviation?.toLowerCase() || "";
      const t2Abbr = t2?.team?.abbreviation?.toLowerCase() || "";
      
      let matchedStremioId = null;
      for (const meta of stremioMetas) {
        const metaName = meta.name.toLowerCase();
        
        const t1Key = t1Name.split(' ')[0];
        const t2Key = t2Name.split(' ')[0];
        
        const t1AliasMatch = aliases[t1Name]?.some(a => metaName.includes(a));
        const t2AliasMatch = aliases[t2Name]?.some(a => metaName.includes(a));

        const t1Match = metaName.includes(t1Key) || (t1Abbr && metaName.includes(t1Abbr)) || t1AliasMatch;
        const t2Match = metaName.includes(t2Key) || (t2Abbr && metaName.includes(t2Abbr)) || t2AliasMatch;

        if (t1Match && t2Match) {
          matchedStremioId = meta.id;
          break;
        }
      }

      return {
        id: `espn_${e.id}`,
        stremioId: matchedStremioId,
        status: e.status.type.state, // 'pre', 'in', 'post'
        statusDetail: e.status.type.shortDetail, // e.g., 'FT', '45:00', '16:00'
        date: e.date,
        league: e.season?.slug || espnData.leagues?.[0]?.name || 'Football',
        team1: {
          name: t1?.team?.name || 'Unknown',
          logo: t1?.team?.logo || '',
          score: t1?.score || '0'
        },
        team2: {
          name: t2?.team?.name || 'Unknown',
          logo: t2?.team?.logo || '',
          score: t2?.score || '0'
        }
      };
    });
  } catch (error) {
    console.error("Fusion Engine Error:", error);
    return [];
  }
}

// Fetch streams for a specific Stremio match ID
export async function getStreams(stremioId: string): Promise<Stream[]> {
  try {
    const res = await fetch(`${BASE_URL}/stream/sport/${encodeURIComponent(stremioId)}.json`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.streams || [];
  } catch (error) {
    return [];
  }
}

// Fetch single match meta for the player page
export async function getMeta(stremioId: string): Promise<MatchMeta | null> {
  try {
    const res = await fetch(`${BASE_URL}/meta/sport/${encodeURIComponent(stremioId)}.json`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.meta || null;
  } catch (error) {
    return null;
  }
}
