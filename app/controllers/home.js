const fs               = require('fs');
const path             = require('path');
const express          = require('express');
const router           = express.Router();
const rimraf           = require('rimraf');
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

// TODO - socket.io for progress

// TODO - isomorphic!


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
    //   sessionId: 'mock-id',
    //   name: "Allen Stone - Somebody That I Used To Know (Gotye Cover - Live at Bear Creek Studio)",
    //   videoId: "wE46huUs20E"
    // };

    // // initiate conversion
    // initiateConversion(req.body.sessionId, req.body.videoId, req.body.name + '.mp3')
    // .then(data => {
    //   res.json(data);
    // })
    // .catch(err => {
    //   res.send(403, {error: err.message});
    // });

    // initiateConversion('9FBA3vcKdiY', 'the-bed-i-made.mp3')
    // .then(data => {
    //   res.json(data);
    // })
    // .catch(err => {
    //   res.send(403, {error: err.message});
    // });

    // initiateConversion('kqbx7efyTV0', 'contact-high' + '.mp3')
    // .then(data => {
    //   res.json(data);
    // })
    // .catch(err => {
    //   res.send(403, {error: err.message});
    // });

    aggregateFiles(req.body.sessionId)
    .then( downloadPath => {
      startDeleteTimer(downloadPath);
      res.json({
        message: 'Your archive is ready!',
        downloadPath: downloadPath
      });
    })
    .catch( err => {
      res.status(403).send({error: err.message});
    });
  }
);

const initiateConversion = function(sessionId, videoId, videoName) {
  // designate download folder name by date & session ID
  const folderId = DateUtil.formatDate(new Date()) + '/' + sessionId;

  // listen for conversion events
  const emitterKey = `${folderId}-${videoId}`;
  ConverterEmitter.get(folderId)
  .on('folder-error', onFolderErr);

  ConverterEmitter.get(emitterKey)
  .on('progress', onConversionProgress)
  .on('queueSize', onConversionQueueUpdate); // not really relevant to this use case

  // initiate conversion
  return new Promise( (resolve, reject) => {
    converter.getMp3(folderId, videoId, videoName + '.mp3',
      // using a callback for completion to avoid a dangling listener
      // and retain reference to the server response property
      (err, data) => {
        Logger.trace('home.js: completion: err, data:', err, data);
        unbindListeners(folderId, emitterKey);
        return err ? reject(err) : resolve(data);
      }
    );
  });

};

const aggregateFiles = function(sessionId) {
  const folderId = DateUtil.formatDate(new Date()) + '/' + sessionId;
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

const onConversionProgress = progress => {
  Logger.trace('home.js: prog: videoId:', progress.videoId, 'percentage:', progress.progress.percentage);
};

const onConversionQueueUpdate = size => {
  Logger.trace('home.js: queue size:', size);
};

const unbindListeners = (folderId, emitterKey) => {
  // unbind expired listeners
  ConverterEmitter.get(folderId)
  .removeListener(folderId, onFolderErr)
  .removeListener(emitterKey, onConversionProgress)
  .removeListener(emitterKey, onConversionQueueUpdate);
};
