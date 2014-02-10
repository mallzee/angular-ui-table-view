/**
*/

'use strict';

angular.module('AngularUiTableView').controller('TableViewCtrl', ['$scope', function($scope) {

  $scope.items = [];

  console.log('Populating items');

  for (var i = 0; i < 1000; i++) {
    $scope.items.push({
      id: i,
      name: 'Name ' + i,
      detail: 'Detail ' + i
    });
  }

  $scope.deleteMe = function(index) {
    console.log('Delete Me', index);
      $scope.items.splice(index, 1);
  };

  console.log('Items now has ' + $scope.items.length + ' element');

}]);