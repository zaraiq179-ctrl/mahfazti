// محفظتي: price alerts that run in the background (Capacitor Background Runner).
// Uses only Binance's public price endpoint. No API keys ever reach this file.

function load() {
  try {
    const r = CapacitorKV.get('cfg');
    const v = r && typeof r === 'object' ? r.value : r;
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null;
  }
}

function store(cfg) {
  CapacitorKV.set('cfg', JSON.stringify(cfg));
}

const pct = (n) => (n >= 0 ? '+' : '') + (n * 100).toFixed(1) + '%';
const money = (n) => '$' + (n >= 100 ? n.toFixed(2) : n >= 1 ? n.toFixed(3) : n.toPrecision(4));

// The app sends the current holdings; keep the reference price of symbols we already watch,
// unless the user changed the thresholds (reset).
addEventListener('setConfig', (resolve, reject, args) => {
  try {
    const next = (args && args.cfg) || {};
    const old = load();
    const keep = {};
    if (old && old.items && !(args && args.reset)) old.items.forEach((i) => (keep[i.sym] = i.ref));
    next.items = (next.items || []).map((i) => ({ sym: i.sym, n: i.n, ref: keep[i.sym] || i.ref }));
    store(next);
    resolve();
  } catch (e) {
    reject(e);
  }
});

addEventListener('checkPrices', (resolve, reject) => {
  const cfg = load();
  if (!cfg || !cfg.on || !cfg.items || !cfg.items.length) {
    resolve();
    return;
  }
  const syms = cfg.items.map((i) => i.sym);
  const url = 'https://api.binance.com/api/v3/ticker/price?symbols=' + encodeURIComponent(JSON.stringify(syms));
  fetch(url)
    .then((r) => r.json())
    .then((arr) => {
      const P = {};
      (Array.isArray(arr) ? arr : []).forEach((t) => (P[t.symbol] = +t.price));
      const up = (+cfg.up || 10) / 100;
      const dn = (+cfg.dn || 10) / 100;
      const out = [];
      cfg.items.forEach((i, k) => {
        const p = P[i.sym];
        if (!p || !i.ref) return;
        const ch = p / i.ref - 1;
        if (ch >= up || ch <= -dn) {
          out.push({
            id: 600 + k,
            title: i.n + (ch > 0 ? ' صعد ' : ' نزل ') + pct(ch),
            body: 'هسه ' + money(p) + ' · كان ' + money(i.ref) + '. القرار إلك.',
          });
          i.ref = p;
        }
      });
      if (out.length) CapacitorNotifications.schedule(out);
      store(cfg);
      resolve();
    })
    .catch((e) => reject(e));
});
