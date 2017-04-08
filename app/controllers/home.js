// TODO - isomorphic!
// - just do simple views to experiment with transitions


const express       = require('express');
const router        = express.Router();
const converter     = require('../services/converter');
const Logger        = require('../utils/logger-util');
const DirectoryUtil = require('../utils/dir-util');

// emitted socket.io event keys - shared with client
const CONVERSION_PROGRESS = 'CONVERSION_PROGRESS';
let _si;


// ----------------------------------------------------------------------
//
// pass in express/socket instances
//
// ----------------------------------------------------------------------

module.exports = function(app, io) {
  app.use('/', router);

  // connect/configure socket to dispatch status/progress
  io.on('connection', configureSocket);
};


// ----------------------------------------------------------------------
//
// config socket
//
// ----------------------------------------------------------------------

const configureSocket = socket => {
  _si = socket;
  _si.on('disconnect', () => {
    Logger.trace('home.js: on disconnection');
  });
};


// ----------------------------------------------------------------------
//
// config router
//
// ----------------------------------------------------------------------

// enable CORS requests
router.use(function(req, res, next) {
  var whitelisted = process.env.NODE_ENV !== 'prod' ? '*' : 'plode.com';
  res.header('Access-Control-Allow-Origin', whitelisted);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// conversion request - url to mp3
router.post('/convert',

  // TODO - issue #3, implement oauth
  // useAccessToken,

  (req, res, next) => {
    const body = req.body;
    const params = {
      sessionId: body.sessionId,
      videoId: body.options.videoId,
      videoTitle: body.options.videoTitle,
      // optional
      startTime: body.options.startTime,
      endTime: body.options.endTime,
      title: body.options.title,
      artist: body.options.artist
    };

    const callbacks = {
      onProgress: progress => {
        _si.emit(CONVERSION_PROGRESS, {
          videoId: progress.videoId,
          percentage: progress.progress.percentage
        });
      },
      onComplete: (error, data) => {
        res.json(data);
      },
      onConversionError: (error, data) => {
        Logger.error('conversion error: error, data', error, data);
        res.send(403, { error: error.message });
      },
      onFolderError: error => {
        Logger.error('folder error: error', error);
        res.send(403, { error: error.message });
      }
    };

    // trigger conversion
    converter.convert(params, callbacks);
  }

);

// zip request - array of mp3s to path to zip
router.post('/archive',
  (req, res, next) => {
    // zip up and delete timer
    DirectoryUtil.zip(req.body.sessionId)
    .then( downloadPath => {
      Logger.info('archive', downloadPath);
      res.json({
        message: 'Your archive is ready!',
        downloadPath: 'downloads/' + downloadPath + '.zip' // ie. "2017-04-05/PLV2v9WNyDEGB80tDATwShnqI_P9-biTho-allen stone"
      });
    })
    .catch( err => {
      Logger.error('archive: err:', err);
      res.status(403).send({error: err.message});
    });
  }
);

// // serve up a page
// router.get('/', function (req, res, next) {
//   res.render('index', {
//     title: 'Why are you here? You should be sending a post request.',
//     articles: {
//       title: 'title',
//       url: 'url',
//       text: 'text'
//     }
//   });
// });
