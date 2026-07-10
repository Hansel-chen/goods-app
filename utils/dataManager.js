const STORAGE_KEY = 'goodsData';
const shareConfig = require('./shareConfig.js');
const cloudDb = require('./cloudDb.js');

let cloudReady = false;

function round2(num) {
  return Math.round(num * 100 + (num >= 0 ? 0.0001 : -0.0001)) / 100;
}

function toFixed2(num) {
  return round2(num).toFixed(2);
}

function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function calculateProfitAndShare(item) {
  const cost = round2(parseFloat(item.cost) || 0);
  const salePrice = round2(parseFloat(item.salePrice) || 0);
  const fee = round2(parseFloat(item.fee) || 0);
  const shippingFee = round2(parseFloat(item.shippingFee) || 0);
  
  const profit = round2(salePrice - cost - fee - shippingFee);
  const profitRate = salePrice > 0 ? round2(profit / salePrice * 10000) / 10000 : 0;
  
  const members = shareConfig.getActiveMembers();
  
  let totalRatio = 0;
  const rawRatios = {};
  members.forEach(m => {
    const r = parseFloat(item[`${m.id}Ratio`]) || 0;
    rawRatios[m.id] = r;
    totalRatio += r;
  });
  
  const norm = totalRatio > 0 ? 100 / totalRatio : 0;
  const shares = {};
  members.forEach(member => {
    const shareKey = `${member.id}Share`;
    const ratioKey = `${member.id}Ratio`;
    const normalized = round2(rawRatios[member.id] * norm);
    const ratioDecimal = normalized / 100;
    shares[shareKey] = toFixed2(profit * ratioDecimal);
    shares[ratioKey] = normalized;
  });
  
  return {
    profit: toFixed2(profit),
    profitRate: (profitRate * 100).toFixed(2) + '%',
    ...shares
  };
}

function getAll() {
  try {
    const data = wx.getStorageSync(STORAGE_KEY);
    return data || [];
  } catch (e) {
    return [];
  }
}

function getById(id) {
  const list = getAll();
  return list.find(item => item.id === id);
}

function saveAll(list) {
  try {
    wx.setStorageSync(STORAGE_KEY, list);
    return true;
  } catch (e) {
    return false;
  }
}

function add(item) {
  const list = getAll();
  
  const members = shareConfig.getActiveMembers();
  const hasRatio = members.some(m => item[`${m.id}Ratio`] !== undefined);
  if (!hasRatio) {
    members.forEach((m, i) => {
      item[`${m.id}Ratio`] = i === 0 ? 100 : 0;
    });
  }
  
  const calculated = calculateProfitAndShare(item);
  
  const newItem = {
    ...item,
    ...calculated,
    id: generateId(),
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString()
  };
  list.unshift(newItem);
  saveAll(list);
  if (cloudReady) cloudDb.add(newItem).catch(() => {});
  return newItem;
}

function update(id, item) {
  const list = getAll();
  const index = list.findIndex(i => i.id === id);
  if (index !== -1) {
    const mergedItem = {
      ...list[index],
      ...item,
    };
    const calculated = calculateProfitAndShare(mergedItem);
    
    list[index] = {
      ...mergedItem,
      ...calculated,
      id: id,
      updateTime: new Date().toISOString()
    };
    saveAll(list);
    if (cloudReady) cloudDb.update(id, list[index]).catch(() => {});
    return list[index];
  }
  return null;
}

function deleteItem(id) {
  const list = getAll();
  const newList = list.filter(item => item.id !== id);
  saveAll(newList);
  if (cloudReady) cloudDb.remove(id).catch(() => {});
  return true;
}

async function syncFromCloud() {
  try {
    const cloudData = await cloudDb.getAll();
    if (cloudData.length === 0) {
      const local = getAll();
      if (local.length > 0) {
        for (const item of local) {
          await cloudDb.add(item).catch(() => {});
        }
      }
    } else {
      saveAll(cloudData);
    }
    cloudReady = true;
  } catch (e) {
    cloudReady = false;
  }
}

function initCloud(env) {
  cloudDb.init(env);
  return syncFromCloud();
}

function clear() {
  try {
    wx.removeStorageSync(STORAGE_KEY);
    cloudReady = false;
    return true;
  } catch (e) {
    return false;
  }
}

function search(keyword) {
  const list = getAll();
  if (!keyword) return list;
  
  const lowerKeyword = keyword.toLowerCase();
  return list.filter(item => {
    return (item.name && item.name.toLowerCase().includes(lowerKeyword)) ||
           (item.platform && item.platform.toLowerCase().includes(lowerKeyword));
  });
}

function exportData() {
  return getAll();
}

function importData(data) {
  if (Array.isArray(data)) {
    saveAll(data);
    return true;
  }
  return false;
}

function assignOrderNos() {
  const list = getAll();
  const needOrder = list.filter(i => !i.orderNo);
  if (needOrder.length === 0) return;

  const groups = {};
  needOrder.sort((a, b) => (a.paymentDate || '') < (b.paymentDate || '') ? -1 : 1);
  needOrder.forEach(item => {
    const d = item.paymentDate || '';
    const yy = d ? d.slice(2, 4) : '00';
    const mm = d ? d.slice(5, 7) : '00';
    const key = yy + mm;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  let changed = false;
  Object.keys(groups).sort().forEach(key => {
    groups[key].forEach((item, idx) => {
      item.orderNo = key + String(idx + 1).padStart(3, '0');
    });
    changed = true;
  });

  if (changed) {
    saveAll(list);
    if (cloudReady) {
      list.forEach(item => {
        cloudDb.update(item.id, { orderNo: item.orderNo }).catch(() => {});
      });
    }
  }
}

module.exports = {
  getAll,
  getById,
  add,
  update,
  delete: deleteItem,
  clear,
  search,
  exportData,
  importData,
  calculateProfitAndShare,
  assignOrderNos,
  initCloud,
  syncFromCloud,
  cloudReady
};
