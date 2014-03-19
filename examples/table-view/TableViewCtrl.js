/**
*/

'use strict';

angular.module('AngularUiTableView').controller('TableViewCtrl', ['$scope', 'Restangular', function($scope, Restangular) {

  $scope.list = [];
  $scope.view = {
    rows: 5,
    rowHeight: 455,
    columns: 2
  };

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

  var page = 0, loading = false;
  $scope.changeList = function () {
    console.log('Changing list');
    if (loading) {
      return;
    }
    loading = true;
    products.getList({limit:50, page: page++}).then(function(data) {
      angular.forEach(data, function (item) {
        $scope.list.push(item);
      });
      loading = false;
    });
  };

  $scope.deleteMe = function(index) {
    console.log('Delete Me', index, $scope.list.length);
    $scope.list.splice(index, 1);
  };

  $scope.iCanHazDelete = function(item) {
    console.log('I HAZ DELETE', item);
  };

  console.log('Items now has ' + $scope.list.length + ' element');

}]);