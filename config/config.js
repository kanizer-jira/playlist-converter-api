const path     = require('path');
const rootPath = path.normalize(__dirname + '/..');
const env      = process.env.NODE_ENV || 'development';

const config = {
  development: {
    root: rootPath,
    app: {
      name: 'playlist-converter-api'
    },
    port: process.env.PORT || 3800,
    io: process.env.IO || 3838
  },

  test: {
    root: rootPath,
    app: {
      name: 'playlist-converter-api'
    },
    port: process.env.PORT || 3800,
    io: process.env.IO || 3838
  },

  production: {
    root: rootPath,
    app: {
      name: 'playlist-converter-api'
    },
    port: process.env.PORT || 3800,
    io: process.env.IO || 3838
  }
};

module.exports = config[env];
