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
    wx.showModal({
      title: '物流查询',
      content: '已复制物流链接，请用浏览器打开查看',
      confirmText: '复制链接',
      success: r => {
        if (r.confirm) wx.setClipboardData({
          data: 'https://www.kuaidi100.com/query?type=auto&postid=' + encodeURIComponent(nu),
          success: () => wx.showToast({ title: '链接已复制', icon: 'success' })
        });
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
