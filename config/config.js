var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'playlist-converter-api'
    },
    port: process.env.PORT || 3800,
  },

  test: {
    root: rootPath,
    app: {
      name: 'playlist-converter-api'
    },
    port: process.env.PORT || 3800,
  },

  production: {
    root: rootPath,
    app: {
      name: 'playlist-converter-api'
    },
    port: process.env.PORT || 3800,
  }
};

module.exports = config[env];
