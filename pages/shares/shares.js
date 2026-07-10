// pages/shares/shares.js
const dataManager = require('../../utils/dataManager.js');
const shareConfig = require('../../utils/shareConfig.js');

const COLORS = ['#07c160', '#1989fa', '#fa5151', '#ff9300', '#7232dd'];

Page({
  data: {
    shareSummary: [],
    shareMembers: [],
    selectedMemberIndex: 0,
    shareDetails: [],
    allItems: [],
    dateStart: '',
    dateEnd: ''
  },

  onLoad() { this.loadData(); },
  onShow() { this.loadData(); },

  loadData() {
    dataManager.assignOrderNos();
    const allItems = dataManager.getAll();
    const members = shareConfig.getActiveMembers();

    this.setData({
      shareMembers: members,
      allItems,
      selectedMemberIndex: 0,
      selectedMemberName: members.length > 0 ? members[0].name : ''
    });
    this.applyFilters();
  },

  applyFilters() {
    const { allItems, shareMembers, selectedMemberIndex, dateStart, dateEnd } = this.data;
    const members = shareMembers;
    const member = members[selectedMemberIndex];

    // 总分成计算（仅已售出）
    let soldItems = allItems.filter(i => i.status === 'sold');
    if (dateStart) soldItems = soldItems.filter(i => (i.receiptDate || '') >= dateStart);
    if (dateEnd) soldItems = soldItems.filter(i => (i.receiptDate || '') <= dateEnd);

    const shareSummary = members.map((m, i) => {
      let total = 0, count = 0;
      soldItems.forEach(item => {
        const r = parseFloat(item[`${m.id}Ratio`]) || 0;
        if (r > 0) {
          total += parseFloat(item[`${m.id}Share`]) || 0;
          count++;
        }
      });
      return {
        id: m.id, name: m.name,
        total: total.toFixed(2),
        count, color: COLORS[i % COLORS.length],
        index: i
      };
    });

    this.setData({ shareSummary });

    if (member) {
      const details = soldItems
        .filter(item => (parseFloat(item[`${member.id}Ratio`]) || 0) > 0)
        .map(item => {
          const ratio = parseFloat(item[`${member.id}Ratio`]) || 0;
          return {
            id: item.id,
            orderNo: item.orderNo,
            name: item.name,
            receiptDate: item.receiptDate,
            status: item.status,
            statusText: item.statusText,
            profit: parseFloat(item.profit).toFixed(2),
            shareRatio: ratio.toFixed(0) + '%',
            shareAmount: parseFloat(item[`${member.id}Share`] || '0').toFixed(2)
          };
        })
        .sort((a, b) => {
          const da = a.receiptDate || a.paymentDate || '', db = b.receiptDate || b.paymentDate || '';
          if (!da && !db) return 0;
          if (!da) return 1;
          if (!db) return -1;
          return da > db ? -1 : 1;
        });
      this.setData({ shareDetails: details });
    }
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

  selectMember(e) {
    const idx = e.currentTarget.dataset.index;
    const name = this.data.shareMembers[idx]?.name || '';
    this.setData({ selectedMemberIndex: idx, selectedMemberName: name });
    this.applyFilters();
  },

  selectMemberByIndex(e) {
    const idx = e.currentTarget.dataset.index;
    const name = this.data.shareMembers[idx]?.name || '';
    this.setData({ selectedMemberIndex: idx, selectedMemberName: name });
    this.applyFilters();
  }
});
