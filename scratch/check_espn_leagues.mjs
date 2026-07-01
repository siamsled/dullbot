async function run() {
  try {
    const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard');
    const data = await res.json();
    const leagues = new Set();
    
    if (data.events) {
      data.events.forEach(e => {
        const comp = e.competitions?.[0];
        const t1 = comp?.competitors?.[0]?.team?.name;
        
        let leagueName = '';
        if (e.season?.slug) leagueName += e.season.slug + " ";
        if (data.leagues) {
          const l = data.leagues.find(l => l.id === e.league?.id || l.uid === e.league?.uid);
          if (l) leagueName += l.name;
        }
        console.log(`${t1}: ${leagueName} | ${e.season?.slug} | ${e.league?.name || e.league?.slug}`);
      });
    }
    
    // Also, let's see if ESPN has a specific URL for FIFA
    const fifaRes = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard');
    const fifaData = await fifaRes.json();
    console.log("FIFA World Cup Endpoint Events:", fifaData.events?.length);
    
  } catch(e) {
    console.error(e);
  }
}
run();
