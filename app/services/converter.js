const fs = require('fs');
const path = require('path');
const YoutubeMp3Downloader = require('youtube-mp3-downloader');

let config = {
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

const getMp3 = function(
  videoId,
  name,
  callback,
  progressCallback,
  queueCallback,
  customConfig
) {

  // use timestamp as id for folder
  const folderId = new Date().valueOf().toString();
  config.outputPath += folderId;
  const outputPathFull = path.resolve(config.outputPath);
  if(!fs.existsSync(outputPathFull)) {
    fs.mkdir(outputPathFull, err => {
      if(err) {
        console.log('converter.js: mkdir callback: err:', err);
      }
    });
  }

  // should allow adding custom config props
  if(customConfig) {
    config = Object.assign({}, config, customConfig);
  }

  // Configure YoutubeMp3Downloader with your settings
  const YD = new YoutubeMp3Downloader(config);

  // Trigger download
  YD.download(videoId, name);

  // event handlers/callbacks
  YD.on('finished', function(error, data) {
    callback(error, data);
  });

  YD.on('error', function(error, data) {
    callback(error, data);
  });

  YD.on('progress', function(progress) {
    if(progressCallback) {
      progressCallback(progress);
    }
  });

  YD.on('queueSize', function(size) {
    if(queueCallback) {
      queueCallback(size);
    }
  });

};

module.exports = {
  getMp3: getMp3
};
