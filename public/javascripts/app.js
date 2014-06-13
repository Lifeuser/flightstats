(function(){
  
  //Main module of the app
  var airport = angular.module('airport', ['ui.bootstrap']);
  

  // DataObject constructor
  function DataObject(type, iataCode, carrierCode) {
    this.type = type;
    this.iataCode = iataCode;
    this.carrierCode = carrierCode;
  }

  function Airplane(destName, flightNumber, airlineName, codesharesStr, date, time, gate, status) {
      this.destName = destName;
      this.flightNumber = flightNumber;
      this.airlineName = airlineName;
      this.codesharesStr = codesharesStr;
      this.date = date;
      this.time = time;
      this.gate = gate;
      this.status = status;
    }

  //Form controller
  airport.controller('requestForm', function($scope, $http) {

    $scope.airplanesWithoutCarrierCode = [];
    $scope.airplanesWithCarrierCode = [];
    $scope.airlines = {};
    $scope.airports = {};

    $scope.details = { type : '', carrierCode : false};


    // Function that creates new dataObject
    $scope.construct = function() {
      if ($scope.radioModel === 'arr'){
        $scope.details.type = 'Arrival';
      } else {
        $scope.details.type = 'Departure';
      }
      if($scope.code) {
        $scope.details.carrierCode = true;
      }
      var dataObject = new DataObject($scope.radioModel, $scope.iata, $scope.code);
      return dataObject;
    }

    // Fuction that actually is doing ajax post reques to our server
    $scope.post = function(dataObject) {
      $scope.airplanesWithoutCarrierCode = [];
      $scope.airplanesWithCarrierCode = [];
      $http.post('/data', JSON.stringify(dataObject)).
      success(function(data) {
        $scope.ready(data);
      }).
      error(function(data, status, headers, config) {
        console.log(data);
      });
    };

    $scope.ready = function(id) {
      $http.post('/ready', {id:id}).
      success(function(data) {
        var result = data.toString();
        if(result === '"done"') {
          $scope.done(id);
        } else {
          window.setTimeout($scope.ready, 2000, id);
        }
      }).
      error(function(data, status, headers, config) {
        console.log(headers);
      });
    }

    $scope.done = function(id) {
      $http.post('/done', {id:id}).
      success(function(data) {
        $scope.prepareResults(data);
      }).
      error(function(data, status, headers, config) {
        console.log(headers);
      });
    }

    $scope.prepareResults = function(data) {
      var prepareAirplanesArray = [];
        for (var i = 0; i < data.length; i++ ){

          addToAirlinesObj(data[i].appendix.airlines);
          addToAirportsObj(data[i].appendix.airports);

          for (var j = 0; j < data[i].flightStatuses.length; j++){
            //cashing in var
            var flight = data[i].flightStatuses[j];
            //destination (from where?)
            var destName = getDestName(flight);
            //flight number (carrierFscode + flightNumber)
            var flightNumber = getFlightNumber(flight);
            //airlineName
            var airlineName = getAirlineName(flight);
            //codeshares
            var codesharesStr = getCodesharesStr(flight);
            //date
            var date = getFlightDate(flight);
            //scheduled time + (actual)
            var time = getFlightTime(flight);
            //gate
            var gate = getGate(flight);
            //status
            var status = getStatus(flight);
            // make aiplane object and push to prepareAirplanesArray
            var airplane = new Airplane(destName, flightNumber, airlineName, codesharesStr, date, time, gate, status);
            prepareAirplanesArray.push(airplane);
          }
        }
        //share result with view
        if($scope.details.carrierCode){
          $scope.airplanesWithCarrierCode = prepareAirplanesArray;
        } else {
          $scope.airplanesWithoutCarrierCode = prepareAirplanesArray;
        } 
    }

    function addToAirlinesObj (airlines) {
      for(var i = 0; i < airlines.length; i++) {
        $scope.airlines[airlines[i].fs] = airlines[i].name;
      }
    }

    function addToAirportsObj (airports) {
      for(var i = 0; i < airports.length; i++) {
        $scope.airports[airports[i].fs] = airports[i].city + ' ' + airports[i].iata;
      }
    }

    function getDestName (flight) {
      if ($scope.details.type === 'Arrival') {
        return $scope.airports[flight.departureAirportFsCode];
      } else {
        return $scope.airports[flight.arrivalAirportFsCode];
      }
    }

    function getFlightNumber (flight) {
      return flight.carrierFsCode + ' ' + flight.flightNumber;
    }

    function getAirlineName (flight) {
      return $scope.airlines[flight.carrierFsCode];
    }

    function getCodesharesStr (flight) {
      var codesharesStr = '';
      if (flight.codeshares) {
        codesharesStr = '('
        for (var k = 0; k < flight.codeshares.length; k++) {
          if (k === (flight.codeshares.length -1)) {
            codesharesStr = codesharesStr + flight.codeshares[k].fsCode + ' ' + flight.codeshares[k].flightNumber + ')';
          } else {
          codesharesStr = codesharesStr + flight.codeshares[k].fsCode + ' ' + flight.codeshares[k].flightNumber + ', '; 
          }
        }
      }
      return codesharesStr;
    }

    function getFlightDate (flight) {
      if ($scope.details.type === 'Arrival') {
        return flight.operationalTimes.scheduledGateArrival.dateLocal.split('T')[0];
      } else {
        return flight.operationalTimes.scheduledGateDeparture.dateLocal.split('T')[0];
      }
    }

    function getFlightTime (flight) {
      if ($scope.details.type === 'Arrival') {
        var time = flight.operationalTimes.scheduledGateArrival.dateLocal.split('T')[1].slice(0, 5);
        if(flight.operationalTimes.actualGateArrival) {
          time = time + ' (' + flight.operationalTimes.actualGateArrival.dateLocal.split('T')[1].slice(0, 5) + ')';
        }
        return time; 
      } else {
        var time = flight.operationalTimes.scheduledGateDeparture.dateLocal.split('T')[1].slice(0, 5);
        if(flight.operationalTimes.actualGateDeparture) {
          time = time + ' (' + flight.operationalTimes.actualGateDeparture.dateLocal.split('T')[1].slice(0, 5) + ')';
        }
        return time; 
      }
    }

    function getGate (flight) {
      var gate = '';
      if(flight.airportResources) {
        if ($scope.details.type === 'Arrival') {
          if (flight.airportResources.arrivalGate){
            gate = flight.airportResources.arrivalGate;
          }
        } else {
          if (flight.airportResources.departureGate){
            gate = flight.airportResources.departureGate;
          }
        }
      }
      return gate;
    }

    function getStatus (flight) {
      return flight.status;
    }

  });
})();
