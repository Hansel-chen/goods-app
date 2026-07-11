// pages/detail/detail.js
const dataManager = require('../../utils/dataManager.js');
const shareConfig = require('../../utils/shareConfig.js');

Page({
  data: { id: '', item: {}, shareMembers: [], profitType: 'zero' },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadData();
    }
  },

  onShow() {
    if (this.data.id) this.loadData();
  },

  viewTracking(e) {
    const nu = e.currentTarget.dataset.nu;
    wx.navigateTo({ url: '/pages/webview/webview?nu=' + encodeURIComponent(nu) });
      }
    });
  },

  loadData() {
    const item = dataManager.getById(this.data.id);
    if (!item) {
      wx.showToast({ title: '数据不存在', icon: 'none' });
      return setTimeout(() => wx.navigateBack(), 1500);
    }

    const members = shareConfig.getActiveMembers();
    const totalRatio = members.reduce((sum, m) => sum + (parseFloat(item[`${m.id}Ratio`]) || 0), 0);

    const shareMembers = members.map(m => {
      const ratio = parseFloat(item[`${m.id}Ratio`]) || 0;
      return {
        id: m.id,
        name: m.name,
        ratio: ratio.toFixed(0) + '%',
        ratioNum: totalRatio > 0 ? (ratio / totalRatio * 100).toFixed(0) : 0,
        share: item[`${m.id}Share`] || '0.00'
      };
    });

    const profitVal = parseFloat(item.profit);
    const profitType = profitVal > 0 ? 'profit' : (profitVal < 0 ? 'loss' : 'zero');

    this.setData({ item: { ...item, profitType }, shareMembers });
  },

});
