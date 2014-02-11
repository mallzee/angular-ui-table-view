/**
*/

'use strict';

angular.module('AngularUiTableView').controller('TableViewCtrl', ['$scope', function($scope) {

  $scope.list = [];

  console.log('Populating items');

  for (var i = 0; i < 1000; i++) {
    $scope.list.push({
      id: i,
      name: 'Name ' + i,
      detail: 'Detail ' + i
    });
  }

  $scope.deleteMe = function(index) {
    console.log('Delete Me', index);
      $scope.list.splice(index, 1);
  };

  console.log('Items now has ' + $scope.list.length + ' element');

}]);