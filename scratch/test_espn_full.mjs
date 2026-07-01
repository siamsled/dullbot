async function run() {
  try {
    const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard');
    const data = await res.json();
    if (data.events && data.events.length > 0) {
      const e = data.events[0];
      const comp = e.competitions[0];
      const t1 = comp.competitors[0];
      const t2 = comp.competitors[1];
      
      console.log("Status:", e.status.type);
      console.log("Team 1:", t1.team.name, t1.team.logo, "Score:", t1.score);
      console.log("Team 2:", t2.team.name, t2.team.logo, "Score:", t2.score);
      console.log("League:", e.season?.slug || data.leagues?.[0]?.name);
    }
  } catch(e) {
    console.error(e);
  }
}
run();
