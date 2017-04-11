const fs       = require('fs');
const path     = require('path');
const mkdirp   = require('mkdirp');
const sanitize = require('sanitize-filename');
const Ytdl     = require('../lib/YoutubeMp3Downloader');
const DateUtil = require('../utils/date-util');
const Logger   = require('../utils/logger-util');


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
  'queueParallelism': 1,
  // How long should be the interval of the progress reports
  'progressTimeout': 1000

  // optional props
  // - startTime
  // - duration
  // - title
  // - artist

};


// ----------------------------------------------------------------------
//
// public
//
// ----------------------------------------------------------------------

const convert = function(params, callbacks) {

  // lazier aggregated params don't enforce order and are simpler to read
  const {
    sessionId,
    videoId,
    videoTitle,

    // optional
    startTime,
    duration,
    songTitle,
    artist
  } = params;

  const {
    onProgress,
    onComplete,
    onConversionError,
    onFolderError
  } = callbacks;

  // designate download folder name by date & session ID
  const folderId = DateUtil.formatDate(new Date()) + '/' + sanitize(sessionId);

  // kickoff conversion
  makeDestinationFolder(folderId)
  .then( destPath => {

    // add optional props
    const conf = Object.assign({}, config, { startTime, duration, songTitle, artist });
    const YD = new Ytdl(conf);

    // TODO - need to check for duplicate, in progress conversions...or maybe existence of target file

    /* schemas:
      completion object:
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

      progress object:
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

    YD.on('progress', onProgress); // progress
    YD.on('finished', onComplete); // error, data
    YD.on('error', onConversionError); // error, data

    // Trigger download
    const videoPath = `${folderId}/${sanitize(videoTitle)}.mp3`;
    YD.download(videoId, videoPath);

  })
  .catch( error => onFolderError );
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
      return mkdirp(outputPathFull, (writeErr) => {
        if(writeErr) {
          return reject(writeErr);
        }
        return resolve(outputPathFull);
      });
    });
  });
};


// ----------------------------------------------------------------------
//
// public interface
//
// ----------------------------------------------------------------------

module.exports = {
  convert
};
