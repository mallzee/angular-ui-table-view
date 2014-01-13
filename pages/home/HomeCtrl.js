/**
*/

'use strict';

angular.module('myApp').controller('HomeCtrl', ['$scope', '$timeout', function($scope, $timeout) {

  $scope.items = [];

  function populateTableView () {
    console.log('Populating items');
     for (var i = 0; i < 50000; i++) {
       $scope.items.push({
         id: i,
         name: 'Name ' + i,
         detail: 'Detail ' + i
       });
     }
    console.log('Items now has ' + $scope.items.length + ' element');
  }
  // TODO: Get rid of this timeout
  $timeout(function () {
    populateTableView();
  });
}]);