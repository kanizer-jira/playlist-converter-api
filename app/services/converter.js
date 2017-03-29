const fs = require('fs');
const path = require('path');
const Ytdl = require('youtube-mp3-downloader'); // https://goo.gl/KmCO11
const ConverterEmitter = require('./emitter');


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

// TODO - CREATE SEPARATE BRANCHES FOR EACH OF THESE!

// TODO - refactor to allow multiple concurrent conversions
// TODO - need to implement collection for callbacks
// TODO - download multiples and convert to archive
// TODO - delete files after timeout

// TODO - socket.io for progress

// TODO - isomorphic!

// This instance handles downloading from Youtube and handling the conversion requests
// - paths should be to instance on a container or local machine...shouldn't need to change
const config = {
  // Where is the FFmpeg binary located?
  'ffmpegPath': '/usr/local/Cellar/ffmpeg/3.2.4/bin/ffmpeg',
  // Where should the downloaded and encoded files be stored?
  'outputPath': './public/downloads/',
  // What video quality should be used?
  'youtubeVideoQuality': 'highest',
  // How many parallel downloads/encodes should be started?
  'queueParallelism': 2,
  // How long should be the interval of the progress reports
  'progressTimeout': 2000
};
const YD = new Ytdl(config);
// let folderId;

const getMp3 = function(
  folderId,
  videoId,
  name
) {

  makeDestinationFolder(folderId)
  .then( destPath => {

    // Trigger download
    YD.download(videoId, folderId + '/' + name);

    //###########################
    // event handlers/callbacks
    //###########################

    /* completion/error object
      {
        videoId: 'wE46huUs20E',
        stats: {
          transferredBytes: 38985984,
          runtime: 17,
          averageSpeed: 2136218.3
        },
        file: './public/downloads//2017-03-29/Allen Stone - Somebody That I Used To Know (Gotye Cover - Live at Bear Creek Studio).mp3',
        youtubeUrl: 'http://www.youtube.com/watch?v=wE46huUs20E',
        videoTitle: 'Allen Stone - Somebody That I Used To Know (Gotye Cover - Live at Bear Creek Studio)',
        artist: 'Allen Stone',
        title: 'Somebody That I Used To Know (Gotye Cover',
        thumbnail: 'https://i.ytimg.com/vi/wE46huUs20E/hqdefault.jpg'
      }
    */
    YD.on('finished', function(error, data) {
      ConverterEmitter.get(folderId + '-' + videoId)
      .emit('finished', error, data);
    });
    YD.on('error', function(error, data) {
      ConverterEmitter.get(folderId + '-' + videoId)
      .emit('finished', error, data);
    });

    /* progress object
      {
        videoId: 'wE46huUs20E',
        progress: {
          percentage: 100,
          transferred: 38985984,
          length: 38985984,
          remaining: 0,
          eta: 0,
          runtime: 17,
          delta: 812547,
          speed: 2136218.301369863
        }
      }
    */
    YD.on('progress', function(progress) {
      ConverterEmitter.get(folderId + '-' + videoId)
      .emit('progress', progress);
    });

    // just returns an integer for items left in the queue
    YD.on('queueSize', function(size) {
      ConverterEmitter.get(folderId + '-' + videoId)
      .emit('queueSize', size);
    });
  })
  .catch( err => {
    ConverterEmitter.get(folderId)
    .emit('folder-error', err);
  });

};

const makeDestinationFolder = function(folderId) {
  // create a new folder per day
  const outputPathFull = path.resolve(config.outputPath + folderId);

  return new Promise( (resolve, reject) => {
    fs.stat(outputPathFull, (err, stats) => {
      // folder already exists
      if(stats) {
        return resolve(stats);
      }

      // create folder
      return fs.mkdir(outputPathFull, writeErr => {
        if(writeErr) {
          return reject(writeErr);
        }
        return resolve(outputPathFull);
      });
    });
  });

};

module.exports = {
  getMp3: getMp3
};
