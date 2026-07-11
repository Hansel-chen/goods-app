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
    const apiUrl = dataManager.getApiBase();
    const reqUrl = apiUrl ? apiUrl + '/api/tracking?nu=' : 'https://www.kuaidi100.com/query?type=auto&postid=';
    wx.showLoading({ title: '查询中...' });
    wx.request({
      url: reqUrl + encodeURIComponent(nu),
      timeout: 10000,
      success: res => {
        wx.hideLoading();
        const d = res.data;
        if (d && d.data && d.data.length > 0) {
          const logs = d.data.map(item => item.context || item.ftime || '').join('\n');
          wx.showModal({ title: '物流轨迹', content: logs, showCancel: false });
        } else {
          wx.showModal({ title: '暂无轨迹', content: d.message || '未查询到物流信息', showCancel: false });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.setClipboardData({ data: nu, success: () => wx.showToast({ title: '查询失败，单号已复制', icon: 'none' }) });
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
