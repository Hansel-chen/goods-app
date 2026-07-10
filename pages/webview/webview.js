Page({
  data: { url: '' },

  onLoad(options) {
    const nu = options.nu || '';
    this.setData({ url: 'https://www.kuaidi100.com/chaxun?nu=' + encodeURIComponent(nu) });
  }
});
