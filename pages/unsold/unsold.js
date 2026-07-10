const dataManager = require('../../utils/dataManager.js');

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function round2(n) { return Math.round(n * 100 + 0.0001) / 100; }
function validDate(d) { return d && d !== '-1' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : ''; }

Page({
  data: {
    unsoldList: [],
    filteredList: [],
    searchKeyword: '',
    stats: { unsold: 0, selling: 0, sold: 0, totalCost: 0, totalCostText: '0', expectedProfit: 0, expectedProfitText: '0' },
    statusFilter: 'all',
    filterIndex: 0,
    filterOptions: [
      { value: 'all', text: '全部' },
      { value: 'unsold', text: '未售出' },
      { value: 'selling', text: '在售中' },
      { value: 'shipping', text: '运输中' },
      { value: 'sold', text: '已售出' }
    ],
    batchMode: false,
    selectedIds: [],
    selectableCount: 0,
    showStatusModal: false,
    batchStatus: 'selling',
    statusOptions: [
      { value: 'unsold', text: '未售出' },
      { value: 'selling', text: '在售中' },
      { value: 'shipping', text: '运输中' },
      { value: 'sold', text: '已售出' }
    ],
    batchOptions: [
      { value: 'unsold', text: '未售出' },
      { value: 'selling', text: '在售中' },
      { value: 'shipping', text: '运输中' },
      { value: 'sold', text: '已售出' }
    ],
    dateStart: '',
    dateEnd: '',
    showTrackingModal: false,
    trackingItemId: '',
    trackingNo: '',
    showSoldModal: false,
    soldItemId: '',
    soldReceiptDate: '',
    soldPaymentDate: '',
    soldDateInValid: false
  },

  onLoad() {
    this.setData({ filterIndex: this.data.filterOptions.findIndex(o => o.value === this.data.statusFilter) });
    this.syncAndLoad();
  },
  onShow() { this.syncAndLoad(); },

  syncAndLoad() {
    dataManager.syncPull().then(() => this.loadData());
  },

  loadData() {
    dataManager.assignOrderNos();
    const unsoldList = dataManager.getAll().map(i => this.enrich(i));

    this.setData({ unsoldList });
    this.calcStats();
    this.applyFilters();
  },

  enrich(item) {
    const cost = round2(parseFloat(item.cost) || 0);
    const ep = round2(parseFloat(item.expectedPrice) || parseFloat(item.salePrice) || cost * 1.1);
    const fee = round2(parseFloat(item.fee) || 0);
    const sf = round2(parseFloat(item.shippingFee) || 0);
    const expProfit = round2(ep - cost - fee - sf);
    const expRate = ep > 0 ? (expProfit / ep * 100).toFixed(2) + '%' : '0.00%';
    const displayDate = validDate(item.receiptDate || item.paymentDate) || '未设置';
    const daysBase = item.receiptDate || item.paymentDate || '';
    let days = 0;
    if (daysBase) {
      const target = item.receiptDate ? new Date(item.receiptDate) : new Date();
      days = Math.floor((target - new Date(item.paymentDate)) / 86400000);
    }
    return { ...item, expectedPrice: ep, expectedProfit: expProfit.toFixed(2), expectedRate: expRate, holdDays: days, displayDate };
  },

  calcStats() {
    const stats = { unsold: 0, selling: 0, sold: 0, totalCost: 0, expectedProfit: 0 };
    this.data.unsoldList.forEach(i => {
      if (i.status === 'unsold') stats.unsold++;
      if (i.status === 'selling' || i.status === 'shipping') stats.selling++;
      if (i.status === 'sold') stats.sold++;
      stats.totalCost = round2(stats.totalCost + (parseFloat(i.cost) || 0));
      stats.expectedProfit = round2(stats.expectedProfit + (parseFloat(i.expectedProfit) || 0));
    });
    this.setData({
      stats: {
        ...stats,
        totalCostText: stats.totalCost.toFixed(0),
        expectedProfitText: stats.expectedProfit.toFixed(0)
      }
    });
  },

  filterByStat(e) {
    const status = e.currentTarget.dataset.status;
    const idx = this.data.filterOptions.findIndex(o => o.value === status);
    const updates = { statusFilter: status, filterIndex: idx >= 0 ? idx : 0 };
    if (status === 'all' || status === 'sold') updates.batchMode = false;
    this.setData(updates);
    this.applyFilters();
  },

  setStatusFilter(e) {
    const idx = parseInt(e.detail.value);
    const val = this.data.filterOptions[idx].value;
    const updates = { statusFilter: val, filterIndex: idx };
    if (val === 'all' || val === 'sold') updates.batchMode = false;
    this.setData(updates);
    this.applyFilters();
  },

  applyFilters() {
    const { statusFilter, unsoldList, dateStart, dateEnd, searchKeyword } = this.data;
    let filtered = unsoldList;
    if (statusFilter !== 'all') {
      filtered = filtered.filter(i => statusFilter === 'selling' ? (i.status === 'selling' || i.status === 'shipping') : i.status === statusFilter);
    }
    if (dateStart) filtered = filtered.filter(i => (i.paymentDate || '') >= dateStart);
    if (dateEnd) filtered = filtered.filter(i => (i.paymentDate || '') <= dateEnd);

    const keyword = searchKeyword.trim().toLowerCase();
    if (keyword) filtered = filtered.filter(i =>
      (i.name && i.name.toLowerCase().includes(keyword)) ||
      (i.orderNo && i.orderNo.includes(keyword))
    );

    const sortOrder = { selling: 0, shipping: 0, unsold: 1, sold: 2 };
    filtered = [...filtered].sort((a, b) => {
      const statusDiff = (sortOrder[a.status] ?? 3) - (sortOrder[b.status] ?? 3);
      if (statusDiff !== 0) return statusDiff;
      const da = validDate(a.receiptDate || a.paymentDate), db = validDate(b.receiptDate || b.paymentDate);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da > db ? -1 : 1;
    });

    const validIds = this.data.selectedIds.filter(id => filtered.some(i => i.id === id));
    const marked = filtered.map(i => ({ ...i, _sel: validIds.includes(i.id) }));
    this.setData({ filteredList: marked, selectableCount: marked.filter(i => i.status !== 'sold').length, selectedIds: validIds });
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
    this.applyFilters();
  },

  clearSearch() {
    this.setData({ searchKeyword: '' });
    this.applyFilters();
  },

  onDateStartChange(e) {
    this.setData({ dateStart: e.detail.value });
    this.applyFilters();
  },

  onDateEndChange(e) {
    this.setData({ dateEnd: e.detail.value });
    this.applyFilters();
  },

  clearDateFilter() {
    this.setData({ dateStart: '', dateEnd: '' });
    this.applyFilters();
  },

  onStatusChange(e) {
    const id = e.currentTarget.dataset.id;
    const idx = parseInt(e.detail.value);
    const opt = this.data.statusOptions[idx];
    if (opt.value === 'sold') {
      const item = dataManager.getById(id);
      if (!item) return;
      const today = fmtDate(new Date());
      this.setData({
        showSoldModal: true,
        soldItemId: id,
        soldReceiptDate: item.receiptDate || today,
        soldPaymentDate: item.paymentDate || '',
        soldDateInValid: false,
        soldDateFuture: false
      });
    } else if (opt.value === 'shipping') {
      const item = dataManager.getById(id);
      this.setData({
        showTrackingModal: true,
        trackingItemId: id,
        trackingNo: item.trackingNo || ''
      });
    } else {
      const updates = { status: opt.value, statusText: opt.text, receiptDate: '' };
      dataManager.update(id, updates);
      this.loadData();
      wx.showToast({ title: '已改为' + opt.text, icon: 'success' });
    }
  },

  onExpectedPriceInput(e) {
    const id = e.currentTarget.dataset.id;
    const v = parseFloat(e.detail.value) || 0;
    dataManager.update(id, { expectedPrice: v });
    this.loadData();
  },

  cancelTracking() { this.setData({ showTrackingModal: false }); },

  onTrackingInput(e) { this.setData({ trackingNo: e.detail.value }); },

  confirmTracking() {
    const no = this.data.trackingNo.trim();
    if (!no) return wx.showToast({ title: '请输入物流单号', icon: 'none' });
    dataManager.update(this.data.trackingItemId, {
      status: 'shipping',
      statusText: '运输中',
      trackingNo: no
    });
    this.setData({ showTrackingModal: false });
    this.loadData();
    wx.showToast({ title: '已标记为运输中', icon: 'success' });
  },

  cancelSold() { this.setData({ showSoldModal: false }); },

  onSoldDateChange(e) {
    const d = e.detail.value;
    const today = fmtDate(new Date());
    const future = d > today;
    const invalid = !future && !!(this.data.soldPaymentDate && d < this.data.soldPaymentDate);
    this.setData({ soldReceiptDate: d, soldDateInValid: invalid, soldDateFuture: future });
  },

  confirmSold() {
    const { soldItemId, soldReceiptDate, soldPaymentDate, soldDateFuture } = this.data;
    if (soldDateFuture) return;
    if (soldPaymentDate && soldReceiptDate < soldPaymentDate) {
      this.setData({ soldDateInValid: true });
      return;
    }
    dataManager.update(soldItemId, { receiptDate: soldReceiptDate, status: 'sold', statusText: '已售出' });
    this.setData({ showSoldModal: false });
    this.loadData();
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  toggleBatch() {
    this.setData({ batchMode: !this.data.batchMode, selectedIds: [] });
  },

  toggleSelect(e) {
    const id = e.currentTarget.dataset.id;
    let ids = this.data.selectedIds;
    const wasSelected = ids.includes(id);
    ids = wasSelected ? ids.filter(i => i !== id) : [...ids, id];
    const list = this.data.filteredList.map(i => i.id === id ? { ...i, _sel: !wasSelected } : i);
    this.setData({ selectedIds: ids, filteredList: list });
  },

  selectAll() {
    const { selectedIds, filteredList } = this.data;
    const allIds = filteredList.filter(i => i.status !== 'sold').map(i => i.id);
    const allSelected = allIds.every(i => selectedIds.includes(i));
    const newIds = allSelected ? [] : allIds;
    const list = filteredList.map(i => ({ ...i, _sel: newIds.includes(i.id) }));
    this.setData({ selectedIds: newIds, filteredList: list });
  },

  showStatusDialog() {
    if (this.data.selectedIds.length === 0) {
      wx.showToast({ title: '请先选择商品', icon: 'none' });
      return;
    }
    this.setData({ showStatusModal: true, batchStatus: 'selling' });
  },
  hideStatusDialog() { this.setData({ showStatusModal: false }); },
  preventBubble() {},
  setBatchStatus(e) { this.setData({ batchStatus: e.currentTarget.dataset.status }); },

  confirmBatchUpdate() {
    const { selectedIds, batchStatus } = this.data;
    const text = this.data.batchOptions.find(o => o.value === batchStatus).text;
    selectedIds.forEach(id => dataManager.update(id, { status: batchStatus, statusText: text }));
    this.setData({ showStatusModal: false, batchMode: false, selectedIds: [] });
    this.loadData();
    const msg = batchStatus === 'shipping' ? `已更新 ${selectedIds.length} 条，请逐一添加物流单号` : `已更新 ${selectedIds.length} 条`;
    wx.showToast({ title: msg, icon: 'none', duration: 2000 });
  },

  viewTracking(e) {
    const nu = e.currentTarget.dataset.nu;
    const apiUrl = dataManager.getApiBase();
    if (!apiUrl) {
      wx.setClipboardData({ data: nu, success: () => wx.showToast({ title: '物流单号已复制', icon: 'success' }) });
      return;
    }
    wx.showLoading({ title: '查询中...' });
    wx.request({
      url: apiUrl + '/api/tracking?nu=' + encodeURIComponent(nu),
      timeout: 10000,
      success: res => {
        wx.hideLoading();
        const d = res.data;
        if (res.statusCode !== 200) {
          wx.showModal({ title: '查询失败', content: '后端返回 ' + res.statusCode + '，可能未部署最新代码', showCancel: false });
        } else if (d && d.data && d.data.length > 0) {
          const logs = d.data.map(item => item.context || item.ftime || '').join('\n');
          wx.showModal({ title: '物流轨迹', content: logs, showCancel: false });
        } else {
          wx.showModal({ title: '暂无轨迹', content: d.message || '未查询到物流信息', showCancel: false });
        }
      },
      fail: err => {
        wx.hideLoading();
        wx.showModal({ title: '查询失败', content: '请检查：\n1. 设置页的服务器地址是否正确\n2. 后端是否已部署最新代码\n3. 网络是否正常', showCancel: false });
      }
    });
  },

  goToEdit(e) {
    wx.navigateTo({ url: `/pages/edit/edit?id=${e.currentTarget.dataset.id}` });
  },

  deleteItem(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          dataManager.delete(id);
          this.loadData();
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  goToAdd() {
    wx.navigateTo({ url: '/pages/add/add' });
  }
});
