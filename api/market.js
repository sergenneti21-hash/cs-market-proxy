const RATE = 92;
const STEAM_ITEMS = 'https://steamcommunity.com/market/search/render/?l=russian&appid=730&norender=1&start=0&count=30&sort_column=quantity&sort_dir=desc';
const STEAM_CASES = 'https://steamcommunity.com/market/search/render/?l=russian&appid=730&query=Case&norender=1&start=0&count=15&sort_column=quantity&sort_dir=desc';

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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  try {
    const [itemsRes, casesRes] = await Promise.all([
      fetch(STEAM_ITEMS).then(r => r.json()),
      fetch(STEAM_CASES).then(r => r.json())
    ]);

    res.status(200).json({
      cases: (casesRes.results || [])
        .filter(r => /Case$/i.test(r.name))
        .map(r => map(r, 'Кейсы'))
        .slice(0, 15),
      items: (itemsRes.results || [])
        .filter(r => !/Case$/i.test(r.name))
        .map(r => map(r))
        .slice(0, 30)
    });
  } catch (e) {
    res.status(500).json({ error: 'Steam unreachable', detail: String(e.message || e) });
  }
};
