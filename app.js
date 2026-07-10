const dataManager = require('./utils/dataManager.js');

App({
  onLaunch() {
    // 从本地读取已保存的 API 地址
    const savedUrl = wx.getStorageSync('apiBaseUrl') || '';
    dataManager.setApiBase(savedUrl);
    const data = wx.getStorageSync('goodsData');

    // 从云端拉取数据
    if (data && data.length > 0) {
      dataManager.syncPull().then(ok => {
        if (ok) console.log('后端同步完成');
      });
    }

    // v1→v3：比率小数→百分比 + 重算所有分成
    const MIGRATION_KEY = 'dataVersion';
    const version = wx.getStorageSync(MIGRATION_KEY) || 1;
    if (version < 3) {
      if (data && data.length > 0) {
        data.forEach(item => {
          Object.keys(item).forEach(k => {
            if (k.endsWith('Ratio')) {
              const v = parseFloat(item[k]);
              if (!isNaN(v) && v >= 0 && v <= 1) {
                item[k] = Math.round(v * 100);
              }
            }
          });
          const recalc = dataManager.calculateProfitAndShare(item);
          Object.assign(item, recalc);
        });
        wx.setStorageSync('goodsData', data);
        console.log('数据迁移完成 v' + version + '→v3');
      }
      wx.setStorageSync(MIGRATION_KEY, 3);
    }

    // v4→v5：恢复未售出
    if (version < 5) {
      const cur = wx.getStorageSync('goodsData');
      if (cur && cur.length > 0) {
        const unsoldIds = ['imported_59','imported_60','imported_61','imported_62','imported_63','imported_64','imported_65','imported_66','imported_67','imported_68','imported_70','imported_71','imported_72','imported_73','imported_74'];
        cur.forEach(item => {
          if (unsoldIds.includes(item.id) && item.status === 'selling') {
            item.status = 'unsold';
            item.statusText = '未售出';
          }
        });
        wx.setStorageSync('goodsData', cur);
        console.log('数据迁移完成 v4→v5');
      }
      wx.setStorageSync(MIGRATION_KEY, 5);
    }

    // v5→v6：咸鱼→闲鱼
    if (version < 6) {
      const cur = wx.getStorageSync('goodsData');
      if (cur && cur.length > 0) {
        let changed = false;
        cur.forEach(item => {
          ['name', 'platform', 'remark', 'source', 'statusText'].forEach(k => {
            if (item[k] && typeof item[k] === 'string' && item[k].includes('咸鱼')) {
              item[k] = item[k].replace(/咸鱼/g, '闲鱼');
              changed = true;
            }
          });
        });
        if (changed) {
          wx.setStorageSync('goodsData', cur);
          console.log('数据迁移完成 v5→v6');
        }
      }
      wx.setStorageSync(MIGRATION_KEY, 6);
    }

    // 首次启动导入
    const final = wx.getStorageSync('goodsData');
    if (!final || final.length === 0) {
      const initData = require('./utils/initData.js');
      wx.setStorageSync('goodsData', initData.initialData);
      
      const shareConfig = wx.getStorageSync('shareConfig');
      if (!shareConfig) {
        require('./utils/shareConfig.js');
      }
      
      console.log('初始数据已导入：' + initData.initialData.length + '条');
    }
  },

  globalData: {
    userInfo: null
  }
});
