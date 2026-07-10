// pages/settings/settings.js
const shareConfig = require('../../utils/shareConfig.js');

const COLORS = ['#07c160', '#1989fa', '#fa5151', '#ff9300', '#7232dd', '#07c160', '#1989fa'];

Page({
  data: {
    members: [],
    inactiveMembers: [],
    showAddModal: false,
    newMemberName: '',
    avatarColors: COLORS
  },

  onLoad() { this.loadMembers(); },
  onShow() { this.loadMembers(); },

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
