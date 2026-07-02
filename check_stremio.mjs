

const BASE_URL = 'https://sports.highfly.dev/eyJpbmNsdWRlU3BvcnRzIjpbImZvb3RiYWxsIl19';

async function check() {
    const live = await fetch(`${BASE_URL}/catalog/sport/sports_live.json`).then(r => r.json());
    console.log(live.metas.map(m => ({ id: m.id, name: m.name })));
}

check();
