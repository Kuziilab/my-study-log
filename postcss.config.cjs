module.exports = {
  plugins: {
    'postcss-px-to-viewport': {
      viewportWidth: 375,
      selectorBlackList: ['van-'],
      exclude: [/node_modules\/vant/],
    },
  },
}
