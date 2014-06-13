var express = require('express');
var fsRequest = require('flightstats-request');
var router = express.Router();


/* GET home page. */
router.get('/', function(req, res) {
  res.render('index');
});

router.post('/data', function(req,res) {
  //Makes use of flightstats-request module's function to create request to FlightStats
  var id = fsRequest.createFlightStatsApiRequest(req.body);
  fsRequest.sendFlightStatsApiRequests(id);
  res.status(200).json(id);
});

router.post('/ready', function(req,res) {
  res.status(200).json(fsRequest.getStatusById(req.body.id));
})

router.post('/done', function(req,res) {
  res.status(200).json(fsRequest.getResultsById(req.body.id));
})

module.exports = router;
