// utils/shareConfig.js
// 分成人员配置模块

const SHARE_CONFIG_KEY = 'shareConfig';

// 默认分成人员配置
const DEFAULT_MEMBERS = [
  { id: 'ycl', name: 'ycl', active: true },
  { id: 'wyw', name: 'wyw', active: true },
  { id: 'chz', name: 'chz', active: true }
];

// 获取分成人员配置
function getMembers() {
  try {
    const config = wx.getStorageSync(SHARE_CONFIG_KEY);
    return config && config.length > 0 ? config : DEFAULT_MEMBERS;
  } catch (e) {
    console.error('获取分成配置失败', e);
    return DEFAULT_MEMBERS;
  }
}

// 保存分成人员配置
function saveMembers(members) {
  try {
    wx.setStorageSync(SHARE_CONFIG_KEY, members);
    return true;
  } catch (e) {
    console.error('保存分成配置失败', e);
    return false;
  }
}

// 添加分成人员
function addMember(member) {
  const members = getMembers();
  const newMember = {
    id: member.id || 'member_' + Date.now(),
    name: member.name,
    active: true
  };
  members.push(newMember);
  saveMembers(members);
  return newMember;
}

// 更新分成人员
function updateMember(id, data) {
  const members = getMembers();
  const index = members.findIndex(m => m.id === id);
  if (index !== -1) {
    members[index] = { ...members[index], ...data };
    saveMembers(members);
    return members[index];
  }
  return null;
}

// 删除分成人员（设置为不活跃）
function removeMember(id) {
  const members = getMembers();
  const index = members.findIndex(m => m.id === id);
  if (index !== -1) {
    members[index].active = false;
    saveMembers(members);
    return true;
  }
  return false;
}

// 获取活跃的分成人员
function getActiveMembers() {
  return getMembers().filter(m => m.active);
}

// 重置为默认配置
function resetToDefault() {
  saveMembers(DEFAULT_MEMBERS);
  return DEFAULT_MEMBERS;
}

module.exports = {
  getMembers,
  getActiveMembers,
  saveMembers,
  addMember,
  updateMember,
  removeMember,
  resetToDefault
};
