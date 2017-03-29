const express          = require('express');
const router           = express.Router();
const converter        = require('../services/converter');
const ConverterEmitter = require('../services/emitter');
const DateUtil         = require('../utils/date-util');
const Logger           = require('../utils/logger-util');

module.exports = function (app) {
  app.use('/', router);
};

// TODO - issue #2 how to dispatch status/progress
// endpoint to handle conversion request;
// convert array of queue items into an archive of mp3s;
router.get('/', function (req, res, next) {
  res.render('index', {
    title: 'Why are you here? You should be sending a post request.',
    articles: {
      title: 'title',
      url: 'url',
      text: 'text'
    }
  });
});

router.post('/convert',

  // TODO - issue #3, implement oauth
  // useAccessToken,

  (req, res, next) => {

    // console.log(req.body);

    // req.body = {
    //   name: "Allen Stone - Somebody That I Used To Know (Gotye Cover - Live at Bear Creek Studio)",
    //   vidId: "wE46huUs20E"
    // };

    // designate download folder name by date
    const folderId = DateUtil.formatDate(new Date());

    // listen for conversion events
    ConverterEmitter.get(folderId)
    .on('folder-error', err => {
      Logger.trace('home.js: create folder error: err:', err);
    });

    ConverterEmitter.get(folderId + '-' + req.body.vidId)
    .on('finished', (err, data) => {
      Logger.trace('home.js: completion: err, data:', err, data);
      res.json(data);
    })
    .on('progress', progress => {
      Logger.trace('home.js: prog:', {
        videoId: progress.videoId,
        percentage: progress.progress.percentage,
        runtime: progress.progress.runtime
      });
    })
    .on('queueSize', size => {
      Logger.trace('home.js: queue size:', size);
    });

    // initiate conversion
    converter.getMp3(folderId, req.body.vidId, req.body.name + '.mp3');
    // converter.getMp3(folderId, req.body.vidId, req.body.name + '.mp3');
    // converter.getMp3(folderId, req.body.vidId, req.body.name + '.mp3');

  }

);
