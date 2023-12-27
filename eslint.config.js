const config = require('@antfu/eslint-config')

module.exports = config.default({}, {
  rules: {
    'test/prefer-lowercase-title': 'off',
  },
})
