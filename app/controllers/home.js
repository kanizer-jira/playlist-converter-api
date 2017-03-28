var express = require('express');
var router = express.Router();
var converter = require('../services/converter');

module.exports = function (app) {
  app.use('/', router);
};

// TODO - issue #4 add linting to project

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

    converter.getMp3(req.body.vidId, req.body.name,
      function(err, data) {
        console.log('home.js: completion: err, data:', err, data);
        res.json(data);
      },
      function(progress) {
        console.log('home.js: prog:', progress);
      },
      function(size) {
        console.log('home.js: queue size:', size);
      }
    );

  }

);
