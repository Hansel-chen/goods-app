const shareConfig = require('../../utils/shareConfig.js');
const dataManager = require('../../utils/dataManager.js');

const COLORS = ['#07c160', '#1989fa', '#fa5151', '#ff9300', '#7232dd', '#07c160', '#1989fa'];
const API_KEY = 'apiBaseUrl';

Page({
  data: {
    members: [],
    inactiveMembers: [],
    showAddModal: false,
    newMemberName: '',
    avatarColors: COLORS,
    apiUrl: ''
  },

  onLoad() {
    this.loadMembers();
    this.setData({ apiUrl: wx.getStorageSync('apiBaseUrl') || '' });
  },
  onShow() {
    this.loadMembers();
    const url = wx.getStorageSync('apiBaseUrl') || '';
    if (url !== this.data.apiUrl) this.setData({ apiUrl: url });
  },

  loadMembers() {
    const all = shareConfig.getMembers();
    this.setData({
      members: all.filter(m => m.active),
      inactiveMembers: all.filter(m => !m.active)
    });
  },

  toggleMember(e) {
    const id = e.currentTarget.dataset.id;
    const all = [...this.data.members, ...this.data.inactiveMembers];
    const m = all.find(x => x.id === id);
    if (!m) return;
    shareConfig.updateMember(id, { active: !m.active });
    this.loadMembers();
    wx.showToast({ title: m.active ? '已停用' : '已启用', icon: 'success' });
  },

  showAddDialog() { this.setData({ showAddModal: true, newMemberName: '' }); },
  hideAddDialog() { this.setData({ showAddModal: false }); },
  preventBubble() {},

  onNewMemberInput(e) { this.setData({ newMemberName: e.detail.value }); },

  confirmAdd() {
    const name = this.data.newMemberName.trim();
    if (!name) return wx.showToast({ title: '请输入名称', icon: 'none' });

    const all = shareConfig.getMembers();
    const existing = all.find(m => m.name === name);
    if (existing) {
      if (!existing.active) {
        shareConfig.updateMember(existing.id, { active: true });
        wx.showToast({ title: '已重新启用', icon: 'success' });
      } else {
        wx.showToast({ title: '该成员已存在', icon: 'none' });
      }
    } else {
      shareConfig.addMember({ name });
      wx.showToast({ title: '添加成功', icon: 'success' });
    }

    this.hideAddDialog();
    this.loadMembers();
  },

  onApiInput(e) {
    const url = e.detail.value.trim();
    wx.setStorageSync('apiBaseUrl', url);
    dataManager.setApiBase(url);
  },

  syncNow() {
    wx.showLoading({ title: '同步中...' });
    dataManager.syncPull().then(pulled => {
      if (pulled) {
        wx.hideLoading();
        wx.showToast({ title: '已从云端拉取', icon: 'success' });
      } else {
        return dataManager.syncPush().then(pushed => {
          wx.hideLoading();
          if (pushed) wx.showToast({ title: '已推送到云端', icon: 'success' });
          else wx.showToast({ title: '同步失败，检查地址', icon: 'none' });
        });
      }
    });
  },

  resetToDefault() {
    wx.showModal({
      title: '确认重置',
      content: '将重置为 ycl、wyw、chz 三人，确定吗？',
      success: (res) => {
        if (!res.confirm) return;
        shareConfig.resetToDefault();
        this.loadMembers();
        wx.showToast({ title: '已重置', icon: 'success' });
      }
    });
  }
});
