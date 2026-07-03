import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'src/data/captains.json');

// Ensure directory exists
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

// Load existing data
let captainsMap = {};
if (fs.existsSync(DATA_FILE)) {
  captainsMap = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

const ESPN_ALL_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

async function fetchTeams() {
  const res = await fetch(ESPN_ALL_URL);
  const data = await res.json();
  const teams = new Set();
  
  if (!data.events) return [];
  
  for (const event of data.events) {
    const comp = event.competitions?.[0];
    if (comp?.competitors) {
      for (const t of comp.competitors) {
        if (t.team?.displayName) {
          teams.add(t.team.displayName);
        }
      }
    }
  }
  return Array.from(teams);
}

async function getCaptainNameFromWiki(teamName) {
  // Format team name for Wikipedia (e.g. "United States" -> "United_States_men's_national_soccer_team")
  let wikiTitle = `${teamName.replace(/\s+/g, '_')}_national_football_team`;
  if (teamName === 'United States' || teamName === 'USA') wikiTitle = "United_States_men's_national_soccer_team";
  if (teamName === 'Australia') wikiTitle = "Australia_men's_national_soccer_team";
  if (teamName === 'Canada') wikiTitle = "Canada_men's_national_soccer_team";
  
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&titles=${wikiTitle}&format=json`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') return null; // Page not found
    
    const content = pages[pageId].revisions[0]['*'];
    const match = content.match(/\|\s*captain\s*=\s*(?:\[\[)?([^\]\|<]+)/i);
    return match ? match[1].trim() : null;
  } catch (err) {
    console.error(`Wiki Error for ${teamName}:`, err.message);
    return null;
  }
}

async function getFotMobId(playerName) {
  const url = `https://apigw.fotmob.com/searchapi/suggest?term=${encodeURIComponent(playerName)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.squadMemberSuggest && data.squadMemberSuggest.length > 0) {
      const options = data.squadMemberSuggest[0].options;
      if (options.length > 0 && options[0].payload) {
        return options[0].payload.id;
      }
    }
    return null;
  } catch (err) {
    console.error(`Fotmob Error for ${playerName}:`, err.message);
    return null;
  }
}

async function getTheSportsDbCutout(playerName) {
  const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(playerName)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.player && data.player.length > 0) {
      // Find the first player that actually plays Soccer to avoid collisions (e.g. Mathew Ryan -> Ryan Mathews (NFL))
      const soccerPlayer = data.player.find(p => p.strSport === 'Soccer');
      if (soccerPlayer && soccerPlayer.strCutout) {
        return soccerPlayer.strCutout;
      }
    }
  } catch (err) {
    console.error(`TheSportsDB Error for ${playerName}:`, err.message);
  }
  return null;
}

async function run() {
  console.log('Fetching upcoming matches from ESPN...');
  const teams = await fetchTeams();
  console.log(`Found ${teams.length} teams.`);
  
  let newAdditions = 0;
  
  for (const team of teams) {
    if (captainsMap[team]) {
      console.log(`Skipping ${team}, already have captain.`);
      continue;
    }
    
    console.log(`Processing ${team}...`);
    const captainName = await getCaptainNameFromWiki(team);
    
    if (captainName) {
      console.log(`  -> Found captain on Wiki: ${captainName}`);
      
      const cutout = await getTheSportsDbCutout(captainName);
      if (cutout) {
        console.log(`  -> Found TheSportsDB cutout!`);
        captainsMap[team] = cutout;
        newAdditions++;
      } else {
        const fotmobId = await getFotMobId(captainName);
        if (fotmobId) {
          console.log(`  -> Found FotMob ID fallback: ${fotmobId}`);
          captainsMap[team] = fotmobId;
          newAdditions++;
        } else {
          console.log(`  -> Could not find image for captain.`);
        }
      }
    } else {
      console.log(`  -> Could not find captain on Wiki.`);
    }
    
    // Sleep to avoid rate limits
    await new Promise(r => setTimeout(r, 1000));
  }
  
  fs.writeFileSync(DATA_FILE, JSON.stringify(captainsMap, null, 2));
  console.log(`Update complete. Added ${newAdditions} new captains.`);
}

run();
