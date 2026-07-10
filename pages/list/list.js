const dataManager = require('../../utils/dataManager.js');

function round2(n) { return Math.round(n * 100 + 0.0001) / 100; }
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

Page({
  data: {
    goodsList: [],
    filteredList: [],
    searchKeyword: '',
    totalProfit: '0.00',
    totalCost: '0.00',
    totalProfitRate: '0.00%',
    dateStart: '',
    dateEnd: ''
  },

  onLoad() {
    this.syncAndLoad();
  },

  onShow() {
    this.syncAndLoad();
  },

  syncAndLoad() {
    dataManager.syncPull().then(() => this.loadData());
  },

  loadData() {
    dataManager.assignOrderNos();
    const list = dataManager.getAll()
      .filter(i => i.status === 'sold')
      .map(item => ({
      ...item,
      profitType: parseFloat(item.profit) > 0 ? 'profit' : (parseFloat(item.profit) < 0 ? 'loss' : 'zero')
    }));
    this.setData({ goodsList: list });
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

  applyFilters() {
    let list = this.data.goodsList;

    const { dateStart, dateEnd } = this.data;
    if (dateStart) list = list.filter(i => (i.receiptDate || i.paymentDate) >= dateStart);
    if (dateEnd) list = list.filter(i => (i.receiptDate || i.paymentDate) <= dateEnd);

    const keyword = this.data.searchKeyword.trim().toLowerCase();
    if (keyword) {
      list = list.filter(item =>
        (item.name && item.name.toLowerCase().includes(keyword)) ||
        (item.platform && item.platform.toLowerCase().includes(keyword)) ||
        (item.orderNo && item.orderNo.includes(keyword))
      );
    }

    list = [...list].sort((a, b) => {
      const da = a.receiptDate || a.paymentDate || '', db = b.receiptDate || b.paymentDate || '';
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da > db ? -1 : 1;
    });
    this.setData({ filteredList: list });
    this.calculateStatistics(list);
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
    this.applyFilters();
  },

  clearSearch() {
    this.setData({ searchKeyword: '' });
    this.applyFilters();
  },

  calculateStatistics(list) {
    list = list || this.data.filteredList;
    let totalProfit = 0, totalCost = 0, totalSalePrice = 0;

    list.forEach(item => {
      totalProfit = round2(totalProfit + (parseFloat(item.profit) || 0));
      totalCost = round2(totalCost + (parseFloat(item.cost) || 0));
      totalSalePrice = round2(totalSalePrice + (parseFloat(item.salePrice) || 0));
    });

    const rateVal = totalSalePrice > 0 ? round2(totalProfit / totalSalePrice * 10000) / 100 : 0;
    const profitRate = rateVal.toFixed(2) + '%';

    this.setData({
      totalProfit: totalProfit.toFixed(2),
      totalCost: totalCost.toFixed(2),
      totalProfitRate: profitRate
    });
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  }
});
