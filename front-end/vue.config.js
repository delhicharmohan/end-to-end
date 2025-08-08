module.exports = {
  publicPath: "",
  devServer: {
    proxy: {
      "^/api": {
        target: process.env.VUE_APP_BASE_URL,
        changeOrigin: true,
      },
    },
  },
};
