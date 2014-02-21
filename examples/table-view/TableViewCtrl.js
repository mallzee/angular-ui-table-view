/**
*/

'use strict';

angular.module('AngularUiTableView').controller('TableViewCtrl', ['$scope', 'Restangular', function($scope, Restangular) {

  $scope.list = [];

  $scope.generateArray = function () {
    console.log('Generate array');
    $scope.list.length = 0;
    for (var i = 0; i < 1000; i++) {
      $scope.list.push({
        id: i,
        name: 'Name ' + i,
        detail: 'Detail ' + i
      });
    }
  };

  var products = Restangular.all('products');

  $scope.changeList = function () {
    console.log('Changing list');
    products.getList().then(function(data) {
      $scope.list = data;
    });
  };

  $scope.deleteMe = function(index) {
    console.log('Delete Me', index);
      $scope.list.splice(index, 1);
  };

  console.log('Items now has ' + $scope.list.length + ' element');

}]);