const dataManager = require('../../utils/dataManager.js');
const shareConfig = require('../../utils/shareConfig.js');
const ratioRules = require('../../utils/ratioRules.js');

function round2(n) { return Math.round(n * 100 + 0.0001) / 100; }

Page({
  data: {
    platformOptions: ['抖音', '淘宝', '闲鱼', '拼多多', ''],
    formData: {
      name: '', platform: '', paymentDate: '',
      cost: '', salePrice: '', fee: '', shippingFee: ''
    },
    calculatedProfit: '0.00',
    calculatedProfitRate: '0.00%',
    shareMembers: [],
    calculatedShares: {},
    presets: [],
    pendingSlots: null,
    assignTarget: ''
  },

  onLoad() {
    const today = this.formatDate(new Date());
    this.setData({
      'formData.paymentDate': today,
      shareMembers: shareConfig.getActiveMembers(),
      presets: ratioRules.PRESETS
    });
  },

  formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  onPaymentDateChange(e) { this.setData({ 'formData.paymentDate': e.detail.value }); },

  selectPlatform(e) {
    this.setData({ 'formData.platform': e.currentTarget.dataset.platform });
  },

  onAmountInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`formData.${field}`]: e.detail.value });
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.calculate(), 200);
  },

  onRatioInput(e) {
    const field = e.currentTarget.dataset.field;
    const val = e.detail.value;
    this.setData({ [`formData.${field}`]: val });
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.validateAndCalculate(field), 200);
  },

  onPresetSelect(e) {
    const idx = e.currentTarget.dataset.index;
    const preset = this.data.presets[idx];
    if (!preset) return;
    const formData = { ...this.data.formData };
    this.data.shareMembers.forEach(m => { formData[m.id + 'Ratio'] = ''; });
    this.setData({
      formData,
      pendingSlots: [...preset.slots],
      assignTarget: preset.label
    });
    wx.showToast({ title: `点击成员依次分配：${preset.label}`, icon: 'none', duration: 2000 });
    this.calculate();
  },

  assignSlot(e) {
    const id = e.currentTarget.dataset.id;
    const { pendingSlots, formData } = this.data;
    if (!pendingSlots || pendingSlots.length === 0) return;
    if (parseFloat(formData[id + 'Ratio'] || '0') > 0) return;
    const slot = pendingSlots[0];
    const assigned = this.data.shareMembers
      .map(m => parseFloat(formData[m.id + 'Ratio']) || 0)
      .filter(v => v > 0);
    if (assigned.length > 0) {
      const minAssigned = Math.min(...assigned);
      if (slot > minAssigned) {
        wx.showToast({ title: `后面的人不能超过${minAssigned}%`, icon: 'none' });
        return;
      }
    }
    const remaining = [...pendingSlots];
    formData[id + 'Ratio'] = remaining.shift().toString();
    this.setData({ formData: { ...formData }, pendingSlots: remaining });
    this.calculate();
    if (remaining.length === 0) {
      wx.showToast({ title: '分配完成', icon: 'success' });
      this.setData({ pendingSlots: null, assignTarget: '' });
    }
  },

  cancelAssign() {
    this.setData({ pendingSlots: null, assignTarget: '' });
  },

  validateAndCalculate(changedField) {
    const { shareMembers, formData } = this.data;
    const total = shareMembers.reduce((s, m) => s + (parseFloat(formData[m.id + 'Ratio']) || 0), 0);
    if (total > 100) {
      const others = shareMembers.filter(m => m.id + 'Ratio' !== changedField);
      const used = others.reduce((s, m) => s + (parseFloat(formData[m.id + 'Ratio']) || 0), 0);
      const maxVal = Math.max(0, 100 - used);
      formData[changedField] = maxVal > 0 ? maxVal.toString() : '0';
      this.setData({ formData: { ...formData } });
      wx.showToast({ title: `比例总和不能超过100%，已调整为${maxVal}%`, icon: 'none' });
    }
    this.calculate();
  },

  calculate() {
    const { cost, salePrice, fee, shippingFee } = this.data.formData;
    const c = round2(parseFloat(cost) || 0);
    const s = round2(parseFloat(salePrice) || 0);
    const f = round2(parseFloat(fee) || 0);
    const sf = round2(parseFloat(shippingFee) || 0);
    const profit = round2(s - c - f - sf);
    const rate = s > 0 ? (profit / s * 100).toFixed(2) + '%' : '0.00%';

    let total = 0;
    const raw = {};
    this.data.shareMembers.forEach(m => {
      const r = parseFloat(this.data.formData[`${m.id}Ratio`]) || 0;
      raw[m.id] = r;
      total += r;
    });
    const norm = total > 0 ? 100 / total : 0;
    const calculatedShares = {};
    this.data.shareMembers.forEach(m => {
      const pct = round2(raw[m.id] * norm) / 100;
      calculatedShares[m.id] = round2(profit * pct).toFixed(2);
    });
    this.setData({ calculatedProfit: profit.toFixed(2), calculatedProfitRate: rate, calculatedShares });
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
