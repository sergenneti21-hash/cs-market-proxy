const RATE = 92;
const STEAM_ITEMS = 'https://steamcommunity.com/market/search/render/?l=russian&appid=730&norender=1&start=0&count=30&sort_column=quantity&sort_dir=desc';
const STEAM_CASES = 'https://steamcommunity.com/market/search/render/?l=russian&appid=730&query=Case&norender=1&start=0&count=15&sort_column=quantity&sort_dir=desc';
const PROXY = 'https://api.allorigins.win/raw?url=';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8'
};

let cache = { data: null, ts: 0 };
const TTL = 5 * 60 * 1000;

function map(r, forceCat) {
  const a = r.asset_description || {};
  return {
    n: r.name,
    price: Math.round((+r.sell_price || 0) / 100 * RATE),
    img: 'https://community.cloudflare.steamstatic.com/economy/image/' + (a.icon_url || '') + '/132fx132f',
    t: forceCat || (a.type || ''),
    wear: (r.name.match(/\(([^)]+)\)/) || [])[1] || ''
  };
}

async function getResults(url) {
  try {
    const r = await fetch(url, { headers: HEADERS });
    if (r.ok) {
      const j = await r.json();
      if (j && j.results) return j.results;
    }
  } catch (e) {}
  const r2 = await fetch(PROXY + encodeURIComponent(url));
  if (!r2.ok) throw new Error('Steam and proxy unavailable');
  const j2 = await r2.json();
  if (!j2 || !j2.results) throw new Error('Empty response from Steam');
  return j2.results;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  if (cache.data && Date.now() - cache.ts < TTL) {
    return res.status(200).json(cache.data);
  }

  try {
    const [items, cases] = await Promise.all([
      getResults(STEAM_ITEMS),
      getResults(STEAM_CASES)
    ]);

    const data = {
      cases: cases.filter(r => /Case$/i.test(r.name)).map(r => map(r, 'Кейсы')).slice(0, 15),
      items: items.filter(r => !/Case$/i.test(r.name)).map(r => map(r)).slice(0, 30)
    };

    cache = { data, ts: Date.now() };
    res.status(200).json(data);
  } catch (e) {
    res.status(503).json({ error: 'Steam unreachable', detail: String((e && e.message) || e) });
  }
};
