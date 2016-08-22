module.exports = function(wallaby) {
  return {
    files: [
      'src/**/*.js',
      '!src/**/*.spec.js'
    ],

    tests: [
      'src/**/*.spec.js'
    ],

    compilers: {
      'src/**/*.js': wallaby.compilers.babel()
    },

    env: {
      type: 'node'
    },

    /* parallelism may break some tests due to db consistency */
    workers: {
      initial: 1, regular: 1
    }
  };
};