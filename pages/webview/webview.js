Page({
  data: { url: '' },

  onLoad(options) {
    const nu = options.nu || '';
    const url = 'https://www.kuaidi100.com/query?type=auto&postid=' + encodeURIComponent(nu);
    this.setData({ url });
  }
});
