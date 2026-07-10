const shareConfig = require('./shareConfig.js');

// 规则（2026-06-20）：
// 1. 单人全程：100%
// 2. A付款+B发货：A 80%, B 20%+运费报销
// 3. 挂平台卖出/找到销路：10%
// 4. 找到货源：5%
// 组合规则时，各角色比例相加，剩余归付款方

const PRESETS = [
  { label: '单人全拿', slots: [100] },
  { label: 'A付 80% + B发货 20%', slots: [80, 20] },
  { label: 'A全包 90% + B卖出 10%', slots: [90, 10] },
  { label: 'A全包 95% + B找货源 5%', slots: [95, 5] },
  { label: 'A全包 85% + B卖出10%+找货源5%', slots: [85, 15] },
  { label: 'A付 75% + B发货20%+找货源5%', slots: [75, 25] },
  { label: 'A付 70% + B发货20%+卖出10%', slots: [70, 30] },
  { label: 'A付 65% + B发货20%+卖出10%+找货源5%', slots: [65, 35] },
];

function applyPreset(preset, members, primaryId) {
  const result = {};
  // 所有成员初始化为 0
  members.forEach(m => { result[m.id + 'Ratio'] = 0; });
  const slots = [...preset.slots];
  if (primaryId) {
    // 第一个 slot（最大份）给指定成员
    result[primaryId + 'Ratio'] = slots[0] || 0;
    // 剩余的 slot 按顺序给其他成员
    let si = 1;
    members.forEach(m => {
      if (m.id !== primaryId && si < slots.length) {
        result[m.id + 'Ratio'] = slots[si];
        si++;
      }
    });
  } else {
    // 无指定时按成员顺序分配
    members.forEach((m, i) => {
      result[m.id + 'Ratio'] = i < slots.length ? slots[i] : 0;
    });
  }
  return result;
}

module.exports = { PRESETS, applyPreset };
