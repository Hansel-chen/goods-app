const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 数据保存在内存中（容器不重启就不会丢，手机端有本地数据兜底）
let memData = [];

function readData() { return memData; }
function writeData(data) { memData = data; }

// ---------- 路由 ----------

app.get('/', (req, res) => {
  res.json({ ok: true, count: readData().length });
});

app.get('/api/goods', (req, res) => {
  res.json(readData());
});

app.get('/api/goods/:id', (req, res) => {
  const list = readData();
  const item = list.find(i => i.id === req.params.id);
  if (item) res.json(item);
  else res.status(404).json({ error: 'not found' });
});

app.post('/api/goods', (req, res) => {
  const list = readData();
  list.unshift(req.body);
  writeData(list);
  res.json(req.body);
});

app.put('/api/goods/:id', (req, res) => {
  const list = readData();
  const idx = list.findIndex(i => i.id === req.params.id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...req.body, id: req.params.id };
    writeData(list);
    res.json(list[idx]);
  } else {
    res.status(404).json({ error: 'not found' });
  }
});

app.delete('/api/goods/:id', (req, res) => {
  const list = readData();
  const newList = list.filter(i => i.id !== req.params.id);
  writeData(newList);
  res.json({ success: true });
});

app.put('/api/goods', (req, res) => {
  writeData(req.body);
  res.json({ success: true, count: req.body.length });
});

// 物流查询（代理快递100公开接口）
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    https.get({ hostname: opts.hostname, path: opts.pathname + opts.search, headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve({ error: 'parse error', raw: data.slice(0, 500) }); }
      });
    }).on('error', reject);
  });
}

app.get('/api/tracking', async (req, res) => {
  const nu = req.query.nu;
  if (!nu) return res.json({ error: 'missing nu' });
  try {
    const data = await httpsGet(`https://www.kuaidi100.com/query?type=auto&postid=${encodeURIComponent(nu)}`);
    res.json(data);
  } catch (e) {
    res.json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
