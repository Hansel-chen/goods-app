const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// 获取全部商品
app.get('/api/goods', (req, res) => {
  res.json(readData());
});

// 获取单个商品
app.get('/api/goods/:id', (req, res) => {
  const list = readData();
  const item = list.find(i => i.id === req.params.id);
  if (item) res.json(item);
  else res.status(404).json({ error: 'not found' });
});

// 添加商品
app.post('/api/goods', (req, res) => {
  const list = readData();
  list.unshift(req.body);
  writeData(list);
  res.json(req.body);
});

// 更新商品
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

// 删除商品
app.delete('/api/goods/:id', (req, res) => {
  const list = readData();
  const newList = list.filter(i => i.id !== req.params.id);
  writeData(newList);
  res.json({ success: true });
});

// 批量覆盖（用于初始化同步）
app.put('/api/goods', (req, res) => {
  writeData(req.body);
  res.json({ success: true, count: req.body.length });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
