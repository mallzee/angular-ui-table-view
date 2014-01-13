/**
*/

'use strict';

angular.module('myApp').controller('HomeCtrl', ['$scope', function($scope) {

  $scope.items = [];

  console.log('Populating items');

   for (var i = 0; i < 1000; i++) {
     $scope.items.push({
       id: i,
       name: 'Name ' + i,
       detail: 'Detail ' + i
     });
   }

  console.log('Items now has ' + $scope.items.length + ' element');

}]);