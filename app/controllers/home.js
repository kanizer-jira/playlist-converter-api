const fs               = require('fs');
const path             = require('path');
const rimraf           = require('rimraf');
const express          = require('express');
const router           = express.Router();
const converter        = require('../services/converter');
const ConverterEmitter = require('../services/emitter');
const DateUtil         = require('../utils/date-util');
const Logger           = require('../utils/logger-util');
const ArchiveUtil      = require('../utils/archive-util');


// TODO - issue #5, fork YoutubeMp3Downloader to inject
// start time / duration into fluent-ffmpeg instance

/*
  // github reference points:
  // https://goo.gl/5N2BNT
  // https://goo.gl/0sZNYY

  // just implement timestamp version - who would re-calculate duration?

  start time:
  ffmpeg('path').seekInput(134.5); // number in seconds
  ffmpeg('path').seekInput('2:14.500'); // timestamp string

  duration:
  ffmpeg('path').duration(134.5); // number in seconds
  ffmpeg('path').duration('2:14.500'); // timestamp string
*/

// TODO - isomorphic!
// - just do simple views to experiment with transitions

// emitted socket.io event keys - shared with client
const CONVERSION_PROGRESS = 'CONVERSION_PROGRESS';
let _si;

module.exports = function(app, io) {
  app.use('/', router);

  // TODO - issue #2 how to dispatch status/progress
  // connect/configure socket
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
    //   sessionId: 'mock-id',
    //   name: "Allen Stone - Somebody That I Used To Know (Gotye Cover - Live at Bear Creek Studio)",
    //   videoId: "wE46huUs20E"
    // };

    // initiate conversion
    initiateConversion(
      req.body.sessionId,
      req.body.videoIndex,
      req.body.videoId,
      req.body.videoTitle + '.mp3'
    )
    .then(data => {
      Logger.info('conversion complete', data.videoId);
      res.json(data);
    })
    .catch(err => {
      Logger.error('conversion error', err);
      res.send(403, {error: err.message});
    });

  }
);

router.post('/archive',
  (req, res, next) => {
    // zip up and delete timer
    aggregateFiles(req.body.sessionId)
    .then( downloadPath => {
      Logger.info('archive', downloadPath);
      startDeleteTimer(downloadPath);
      res.json({
        message: 'Your archive is ready!',
        downloadPath: 'downloads/' + downloadPath + '.zip' // ie. "2017-04-05/PLV2v9WNyDEGB80tDATwShnqI_P9-biTho-allen stone"
      });
    })
    .catch( err => {
      Logger.error('archive', err);
      res.status(403).send({error: err.message});
    });
  }
);


// ----------------------------------------------------------------------
//
// conversion/file system methods
//
// ----------------------------------------------------------------------

const initiateConversion = function(sessionId, videoIndex, videoId, videoName) {
  // designate download folder name by date & session ID
  const folderId = DateUtil.formatDate(new Date()) + '/' + sessionId;

  // listen for conversion events
  const emitterKey = `${videoIndex}::${videoId}::${folderId}`;
  Logger.info('EMITTERKEY!!!!', emitterKey);

  // unsubscribe listeners on completion/error
  unbindListeners(folderId, emitterKey);

  if(!ConverterEmitter.getKeys().includes(folderId)) {
    ConverterEmitter.get(folderId)
    .on('folder-error', onFolderErr);
  }

  if(!ConverterEmitter.getKeys().includes(emitterKey)) {
    ConverterEmitter.get(emitterKey)
    .on('progress', progress => {
      onConversionProgress(progress);
    });
  }

  // initiate conversion
  return new Promise( (resolve, reject) => {
    converter.getMp3(emitterKey, folderId, videoIndex, videoId, videoName + '.mp3',
      // using a callback for completion to avoid a dangling listener
      // and retain reference to the server response property
      (err, data) => {
        // Logger.trace('home.js: completion: err, data:', err, data);
        unbindListeners(folderId, emitterKey);
        return err ? reject(err) : resolve(data);
      }
    );
  });

};

const aggregateFiles = function(sessionId) {
  const folderId = DateUtil.formatDate(new Date()) + '/' + sessionId;
  Logger.info('aggregateFiles', folderId);
  return new Promise((resolve, reject) => {
    ArchiveUtil.zip(folderId,
      err => {
        if(err) {
          Logger.info('aggregateFiles: ERROR!', err);
          return reject(err);
        }
        Logger.info('aggregateFiles: ARCHIVE!');
        return resolve(folderId);
      }
    );
  });
};

// TODO - this is pretty ghetto
const startDeleteTimer = downloadPath => {
  const fullPath = path.resolve(`./public/downloads/${downloadPath}`);
  const deleteTimer = setTimeout( () => {
    rimraf(fullPath, () => {
      fs.unlink(`${fullPath}.zip`, err => {
        if(err) {
          // TODO - this is sort of an orphaned completion event...
          Logger.error('startDeleteTimer: unlink err:', err);
          return;
        }
        Logger.info('startDeleteTimer: Deletion complete.');
        clearTimeout(deleteTimer);
      });
    });
  }, 3600000);
};


// ----------------------------------------------------------------------
//
// conversion event handlers
//
// ----------------------------------------------------------------------

const onFolderErr = (err, folderId) => {
  Logger.trace('home.js: create folder error: err:', err);

  // unbind expired listeners
  ConverterEmitter.get(folderId)
  .removeListener('folder-error', onFolderErr);
};

const onConversionProgress = (progress) => {
  // Logger.trace('home.js: prog: videoId:', progress.videoId, 'percentage:', progress.progress.percentage);

  _si.emit(CONVERSION_PROGRESS, {
    videoId: progress.videoId,
    percentage: progress.progress.percentage
  });
};

const unbindListeners = (folderId, emitterKey) => {
  // unbind expired listeners
  ConverterEmitter.get(folderId)
  .removeListener(folderId, onFolderErr)
  .removeListener(emitterKey, onConversionProgress);

  ConverterEmitter.remove(folderId);
  ConverterEmitter.remove(emitterKey);
};
