const COLLECTION = 'goods';
let db = null;
let inited = false;

function init(env) {
  if (inited) return;
  wx.cloud.init({ env });
  db = wx.cloud.database();
  inited = true;
}

async function getAll() {
  if (!db) throw new Error('cloudDb not initialized');
  const pageSize = 100;
  let all = [];
  let offset = 0;
  while (true) {
    const res = await db.collection(COLLECTION).skip(offset).limit(pageSize).get();
    all = all.concat(res.data);
    if (res.data.length < pageSize) break;
    offset += pageSize;
  }
  return all.map(doc => {
    const { _id, _openid, ...rest } = doc;
    return { ...rest, id: _id };
  });
}

async function getById(id) {
  if (!db) throw new Error('cloudDb not initialized');
  const res = await db.collection(COLLECTION).doc(id).get();
  if (!res.data) return null;
  const { _id, _openid, ...rest } = res.data;
  return { ...rest, id: _id };
}

async function add(item) {
  if (!db) throw new Error('cloudDb not initialized');
  const { id, ...data } = item;
  if (id) data._id = id;
  const res = await db.collection(COLLECTION).add({ data });
  return { ...item, id: res._id };
}

async function update(id, item) {
  if (!db) throw new Error('cloudDb not initialized');
  const { id: _, ...data } = item;
  await db.collection(COLLECTION).doc(id).update({ data });
}

async function remove(id) {
  if (!db) throw new Error('cloudDb not initialized');
  await db.collection(COLLECTION).doc(id).remove();
}

async function count() {
  if (!db) throw new Error('cloudDb not initialized');
  const res = await db.collection(COLLECTION).count();
  return res.total;
}

module.exports = { init, getAll, getById, add, update, remove, count };
