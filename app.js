const config  = require('./config/config');
const express = require('express');
const app     = express();
const Logger  = require('./app/utils/logger-util');

module.exports = require('./config/express')(app, config);

app.listen(config.port, () => {
  Logger.trace('Express server listening on port ' + config.port);
});
