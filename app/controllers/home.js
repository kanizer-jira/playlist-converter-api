const express         = require('express');
const router          = express.Router();
const ConnectionModel = require('../models/connectionmodel');
const ConversionModel = require('../models/conversionmodel');
const converter       = require('../services/converter');
const Logger          = require('../utils/logger-util');
const DirectoryUtil   = require('../utils/dir-util');

// emitted socket.io event keys - shared with client
const CONVERSION_PROGRESS = 'CONVERSION_PROGRESS';
const SOCKET_ERROR = 'SOCKET_ERROR';


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
const _connectionModel = new ConnectionModel();

const configureSocket = socket => {
  // index each socket connection
  let token = socket.handshake.query.token;
  _connectionModel.add(token, { socket, conversionModel: new ConversionModel() })
    .then( connection => {
      Logger.info('home.js: on connection: token:', token);

      // bubble to promise chain
      return new Promise( (resolve, reject) => {
        // connection.socket === socket
        socket.on('disconnect', () => {
          Logger.info('home.js: on disconnection: token - this should be unique', token);

          // interrupt / correct converter instance
          return converter.cancelAll(_connectionModel, token)
            .then(resolve)
            .catch(reject);
        });
      });
    })
    .then( _ => {
      Logger.info('home.js: connection broken; all converters cancelled', token);
    })
    .catch( error => {
      socket.emit(SOCKET_ERROR, { error });
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
      model: _connectionModel,
      socketToken: body.socketToken, // key for conversionModel
      sessionId: body.sessionId, // folder name
      videoId: body.options.videoId,
      videoTitle: body.options.videoTitle,
      thumbnail: body.options.thumbnail,
      // optional
      startTime: body.options.startTime,
      duration: body.options.duration,
      songTitle: body.options.songTitle,
      artist: body.options.artist
    };

    const callbacks = {
      onProgress: progress => {
        _connectionModel
          .search(params.socketToken)
          .then( connection =>
            connection.socket.emit(CONVERSION_PROGRESS, {
              videoId: progress.videoId,
              percentage: progress.percentage
            })
          )
          // 400 - bad request
          // 418 - I'm a teapot
          .catch( error => res.status(400).send({ error: error.message }) );
      },
      onComplete: (error, data) => {
        res.json(data);
      },
      onError: (error, data) => {
        Logger.error('conversion error: error, data', error, data);
        res.status(400).send({ error: error.message });
      }
    };

    // trigger conversion
    converter.convert(params, callbacks);
  }

);

// cancel in progress conversion
router.post('/cancel',
  (req, res, next) => {
    const {
      socketToken,
      sessionId,
      videoId
    } = req.body;

    // interrupt / correct converter instance
    if(!sessionId) {
      return converter.cancelAll(_connectionModel, socketToken)
        .then( _ => res.json({ msg: `${socketToken} - all converters cancelled.`}) )
        .catch( error => res.status(400).send({ error: error.message }) );
    }

    const conversionKey = `${sessionId}-${videoId}`;
    return converter.cancel(_connectionModel, socketToken, conversionKey)
      .then( _ => res.json({ msg: `${videoId} - converter cancelled.`}) )
      .catch( error => res.status(400).send({ error: error.message }) );
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
      res.status(400).send({error: err.message});
    });
  }
);

// serve up a page
router.get('/',
  (req, res, next) => {
    res.render('index', {
      title: 'Why are you here? You should be sending a post request.',
      articles: {
        title: 'title',
        url: 'url',
        text: 'text'
      }
    });
  });
