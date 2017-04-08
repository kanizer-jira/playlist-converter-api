  // TODO - issue #5
/*
  forked YoutubeMp3Downloader to inject
  - start time / duration into fluent-ffmpeg instance
  - artist / title

  github reference points:
  https://goo.gl/5N2BNT
  https://goo.gl/0sZNYY
*/

var os = require('os');
var util = require('util');
var EventEmitter = require("events").EventEmitter;
var ffmpeg = require('fluent-ffmpeg');
var ytdl = require('ytdl-core');
var async = require('async');
var progress = require('progress-stream');
const Logger   = require('../utils/logger-util');

function YoutubeMp3Downloader(options) {

  var self = this;

  self.youtubeBaseUrl = 'http://www.youtube.com/watch?v=';
  self.youtubeVideoQuality = (options && options.youtubeVideoQuality ? options.youtubeVideoQuality : 'highest');
  self.outputPath = (options && options.outputPath ? options.outputPath : (os.platform() === 'win32' ? 'C:/Windows/Temp' : '/tmp'));
  self.queueParallelism = (options && options.queueParallelism ? options.queueParallelism : 1);
  self.progressTimeout = (options && options.progressTimeout ? options.progressTimeout : 1000);
  self.fileNameReplacements = [[/"/g, ''], [/'/g, ''], [/\//g, ''], [/\?/g, ''], [/:/g, ''], [/;/g, '']];

  if (options && options.ffmpegPath) {
    ffmpeg.setFfmpegPath(options.ffmpegPath);
  }

  // adding in/out time trimming options
  self.startTime = '0';

  if (options && (options.startTime || options.endTime)) {
    self.startTime = options.startTime || self.startTime;
    if (options.endTime) {
      self.endTime = options.endTime;
    }
  }

  // adding user input title/artist
  if (options) {
    if (options.title) {
      self.title = options.title;
    }

    if (options.artist) {
      self.artist = options.artist;
    }
  }

  Logger.info('youtube');
  Logger.info('-------------------------------');
  Logger.info('options', options);
  Logger.info('self.startTime', self.startTime);
  Logger.info('self.endTime', self.endTime);
  Logger.info('self.title', self.title);
  Logger.info('self.artist', self.artist);


  //Async download/transcode queue
  self.downloadQueue = async.queue(function (task, callback) {

    self.emit("queueSize", self.downloadQueue.running() + self.downloadQueue.length());

    self.performDownload(task, function(err, result) {
      callback(err, result);
    });

  }, self.queueParallelism);

}

util.inherits(YoutubeMp3Downloader, EventEmitter);

YoutubeMp3Downloader.prototype.cleanFileName = function(fileName) {
  var self = this;

  self.fileNameReplacements.forEach(function(replacement) {
    fileName = fileName.replace(replacement[0], replacement[1]);
  });

  return fileName;
};

YoutubeMp3Downloader.prototype.download = function(videoId, fileName) {

  var self = this;
  var task = {
    videoId: videoId,
    fileName: fileName
  };

  self.downloadQueue.push(task, function (err, data) {

    self.emit("queueSize", self.downloadQueue.running() + self.downloadQueue.length());

    if (err) {
      self.emit("error", err, data);
    } else {
      self.emit('finished', err, data);
    }
  });

};

YoutubeMp3Downloader.prototype.performDownload = function(task, callback) {

  var self = this;
  var videoUrl = self.youtubeBaseUrl+task.videoId;
  var resultObj = {
    videoId: task.videoId
  };

  ytdl.getInfo(videoUrl, function(err, info){

    if (err) {
      callback(err.message, resultObj);
    } else {
      var videoTitle = self.cleanFileName(info.title);
      var artist = "Unknown";
      var title = "Unknown";
      var thumbnail = info.iurlhq || null;

      if (videoTitle.indexOf("-") > -1) {
        var temp = videoTitle.split("-");
        if (temp.length >= 2) {
          artist = temp[0].trim();
          title = temp[1].trim();
        }
      } else {
        title = videoTitle;
      }

      //Overwrite artist / title fields if provided
      artist = self.artist || artist;
      title = self.title || title;

      //Derive file name, if given, use it, if not, from video title
      var fileName = (task.fileName ? self.outputPath + '/' + task.fileName : self.outputPath + '/' + videoTitle + '.mp3');

      ytdl.getInfo(videoUrl, { quality: self.youtubeVideoQuality }, function(err, info) {

        //Stream setup
        var stream = ytdl.downloadFromInfo(info, {
          quality: self.youtubeVideoQuality
        });

        stream.on("response", function(httpResponse) {

          //Setup of progress module
          var str = progress({
            length: parseInt(httpResponse.headers['content-length']),
            time: self.progressTimeout
          });

          //Add progress event listener
          str.on('progress', function(progress) {
            if (progress.percentage === 100) {
              resultObj.stats= {
                transferredBytes: progress.transferred,
                runtime: progress.runtime,
                averageSpeed: parseFloat(progress.speed.toFixed(2))
              }
            }
            self.emit("progress", {videoId: task.videoId, progress: progress});
          });

          //Configure encoding
          var proc = new ffmpeg({
            source: stream.pipe(str)
          })
          .audioBitrate(info.formats[0].audioBitrate)
          .withAudioCodec('libmp3lame')
          .toFormat('mp3')
          .seekInput(self.startTime) // time trim entry point timestamp string
          .outputOptions('-id3v2_version', '4')
          .outputOptions('-metadata', 'title=' + title)
          .outputOptions('-metadata', 'artist=' + artist)
          .on('error', function(err) {
            callback(err.message, null);
          })
          .on('end', function() {
            resultObj.file =  fileName;
            resultObj.youtubeUrl = videoUrl;
            resultObj.videoTitle = videoTitle;
            resultObj.artist = artist;
            resultObj.title = title;
            resultObj.thumbnail = thumbnail;
            callback(null, resultObj);
          });

          if(self.endTime) {
            proc.duration(self.endTime); // time trim exit point timestamp string
          }

          //Start encoding
          proc.saveToFile(fileName);

        });

      });
    }

  });

};

module.exports = YoutubeMp3Downloader;
