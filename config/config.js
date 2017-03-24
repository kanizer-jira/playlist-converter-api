var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'playlist-converter-api'
    },
    port: process.env.PORT || 3000,
    db: 'postgres://localhost/playlist-converter-api-development'
  },

  test: {
    root: rootPath,
    app: {
      name: 'playlist-converter-api'
    },
    port: process.env.PORT || 3000,
    db: 'postgres://localhost/playlist-converter-api-test'
  },

  production: {
    root: rootPath,
    app: {
      name: 'playlist-converter-api'
    },
    port: process.env.PORT || 3000,
    db: 'postgres://localhost/playlist-converter-api-production'
  }
};

module.exports = config[env];
