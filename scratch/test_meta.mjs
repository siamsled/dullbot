async function run() {
  const matchId = 'streamed:belgium-vs-senegal-2503392';
  const metaUrl = `https://sports.highfly.dev/eyJpbmNsdWRlU3BvcnRzIjpbImZvb3RiYWxsIl19/meta/sport/${encodeURIComponent(matchId)}.json`;
  console.log("Fetching:", metaUrl);
  const res = await fetch(metaUrl);
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Body:", text.slice(0, 500));
}
run();
