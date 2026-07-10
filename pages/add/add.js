const dataManager = require('../../utils/dataManager.js');

Page({
  data: {
    formData: {
      name: '', platform: '', paymentDate: '',
      cost: '', salePrice: '', fee: '', shippingFee: ''
    }
  },

  onLoad() {
    const today = this.formatDate(new Date());
    this.setData({ 'formData.paymentDate': today });
  },

  formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  onPaymentDateChange(e) { this.setData({ 'formData.paymentDate': e.detail.value }); },

  onAmountInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`formData.${field}`]: e.detail.value });
  },

  onSubmit(e) {
    const d = e.detail.value;
    if (!d.name) return wx.showToast({ title: '请输入商品名称', icon: 'none' });
    if (!d.platform) return wx.showToast({ title: '请输入平台', icon: 'none' });
    if (!d.cost || parseFloat(d.cost) <= 0) return wx.showToast({ title: '请输入有效成本', icon: 'none' });
    if (!d.salePrice || parseFloat(d.salePrice) <= 0) return wx.showToast({ title: '请输入有效卖价', icon: 'none' });

    const item = {
      ...d,
      paymentDate: this.data.formData.paymentDate,
      receiptDate: '',
      status: 'unsold',
      statusText: '未售出'
    };

    dataManager.add(item);
    wx.showToast({ title: '添加成功', icon: 'success', duration: 1200 });
    setTimeout(() => wx.navigateBack(), 1200);
  },

  onCancel() { wx.navigateBack(); }
});
