async function fetchESPN() {
  try {
    const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard');
    const data = await res.json();
    console.log("ESPN Events count:", data.events?.length);
    if (data.events && data.events.length > 0) {
      const e = data.events[0];
      console.log("First Event:", {
        id: e.id,
        name: e.name,
        date: e.date,
        status: e.status.type.name, // STATUS_SCHEDULED, STATUS_IN_PROGRESS, STATUS_FINAL
        competitors: e.competitions[0].competitors.map(c => c.team.name)
      });
    }
  } catch(e) {
    console.error("ESPN Fetch error:", e);
  }
}
fetchESPN();
