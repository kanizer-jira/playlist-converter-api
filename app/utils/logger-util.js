const Stream = require('stream');
const bunyan = require('bunyan'); // nodejs logger
const chalk  = require('chalk');

const legend = {
  10: {
    label: 'TRACE',
    color: chalk.blue
  },
  20: {
    label: 'DEBUG',
    color: chalk.blue
  },
  30: {
    label: 'INFO',
    color: chalk.blue
  },
  40: {
    label: 'WARN',
    color: chalk.yellow
  },
  50: {
    label: 'ERROR',
    color: chalk.red
  },
  60: {
    label: 'FATAL',
    color: chalk.bold.black.bgRed
  }
};

var msgObj;
var msg;
var stream = new Stream();
stream.writable = true;
stream.write = function(obj) {
  msgObj = legend[obj.level];
  msg = obj.msg === '' ? 'YOU NEED TO ADD A LABEL TO YOUR CONSOLE LOG' : obj.msg;
  console.log(msgObj.color(`[${msgObj.label}] ${msg}`));
};

var Logger = bunyan.createLogger({
  name: 'bb-api',
  streams: [{
    type: 'raw',
    stream: stream
  }],
  level: 'trace'
});

// Logger.trace('Logger.js > test');
// Logger.debug('Logger.js > test');
// Logger.info('Logger.js > test');
// Logger.warn('Logger.js > test');
// Logger.error('Logger.js > test');
// Logger.fatal('Logger.js > test');

module.exports = Logger;
