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
var EventEmitter = require('events').EventEmitter;
var ffmpeg = require('fluent-ffmpeg');
var ytdl = require('ytdl-core');
var async = require('async');
var progress = require('progress-stream');
var Logger = require('../utils/logger-util');

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
  self.startTime = 0;

  if (options && (options.startTime || options.duration)) {
    self.startTime = options.startTime || self.startTime;
    if (options.duration) {
      self.duration = options.duration;
    }
  }

  // adding user input songTitle/artist
  if (options) {
    if (options.songTitle) {
      self.songTitle = options.songTitle;
    }

    if (options.artist) {
      self.artist = options.artist;
    }
  }

  //Async download/transcode queue
  self.downloadQueue = async.queue(function (task, callback) {

    self.emit("queueSize", self.downloadQueue.running() + self.downloadQueue.length());

    self.performDownload(task, function(err, result) {
      callback(err, result);
    });

  }, self.queueParallelism);

  self.downloadQueue.drain = error => {
    Logger.info('YoutubeMp3Downloader.js: drain:', error ? error : '');
  };
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
      // var thumbnail = info.iurlhq || null;
      var thumbnail = info.thumbnail_url || info.player_response.videoDetails.thumbnail.thumbnails.shift().url;

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
      title = self.songTitle || title;

      //Derive file name, if given, use it, if not, from video title
      var fileName = (task.fileName ? self.outputPath + '/' + task.fileName : self.outputPath + '/' + videoTitle + '.mp3');

      // not sure how else to interrupt an async.queue task
      if(self.cancelled) return;

      ytdl.getInfo(videoUrl, {
        begin: self.startTime + 's',
        quality: self.youtubeVideoQuality
      }, function(err, info) {

        // get length to modify download percentage against strimmed values
        var fullLengthSeconds = info.length_seconds;
        var duration = (!self.duration && self.startTime)
        ? fullLengthSeconds - self.startTime
        : self.duration;
        var trimmedPercentage = duration ? Math.floor(duration/fullLengthSeconds * 100) : 100;

        //Stream setup
        self.currentStream = ytdl.downloadFromInfo(info, {
          quality: self.youtubeVideoQuality
        });

        self.currentStream.on("response", function(httpResponse) {
          //Setup of progress module
          var str = progress({
            length: parseInt(httpResponse.headers['content-length']),
            time: self.progressTimeout
          });

          //Add progress event listener
          str.on('progress', function(progress) {
            // NOTE! this will not fire for trimmed vids
            if (progress.percentage === 100) {
              resultObj.stats = {
                transferredBytes: progress.transferred,
                runtime: progress.runtime,
                averageSpeed: parseFloat(progress.speed.toFixed(2))
              }
            }

            self.emit("progress", {
              videoId: task.videoId,
              percentage: progress.percentage / trimmedPercentage
              // progress: progress
            });
          });

          //Configure encoding
          var proc = new ffmpeg({
            source: self.currentStream.pipe(str)
          })
          .audioBitrate(info.formats[0].audioBitrate)
          .withAudioCodec('libmp3lame')
          .toFormat('mp3');

          // clipping beginnings of tracks a bit
          if(self.startTime !== 0) {
            proc.seekInput(self.startTime); // time trim entry point timestamp string
          }

          proc
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

            self.emit("progress", {
              videoId: task.videoId,
              percentage: 1
            });

            callback(null, resultObj);
          });

          if(self.duration) {
            proc.duration(self.duration); // time trim exit point timestamp string
          }

          //Start encoding
          proc.saveToFile(fileName);

        });

      });
    }

  });

};

YoutubeMp3Downloader.prototype.destroy = function() {
  // destroy in progress stream { Readable } from 'stream'
  if(this.currentStream) {
    this.currentStream.destroy();
  }

  if(this.downloadQueue) {
    // this doesn't appear to affect the currently executing task!
    this.downloadQueue.kill();
    // soooooo....
    this.cancelled = true;
  }
};

module.exports = YoutubeMp3Downloader;
