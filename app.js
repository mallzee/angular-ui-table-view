/**
@toc
1. setup - whitelist, appPath, html5Mode
*/

'use strict';

angular.module('AngularUiTableView', [
'ngRoute',
'ngSanitize',
'ngTouch',
'ngAnimate',
'restangular',
//additional angular modules
'mallzee.ui-table-view'
]).
config(['$routeProvider', '$locationProvider', '$compileProvider', 'RestangularProvider', function($routeProvider, $locationProvider, $compileProvider, RestangularProvider) {
	/**
	setup - whitelist, appPath, html5Mode
	@toc 1.
	*/
	$locationProvider.html5Mode(false);		//can't use this with github pages / if don't have access to the server

  var staticPath = '/';
	//var staticPath;
	//staticPath ='/angular-directives/angular-ui-table-view/';		//local
	// staticPath ='/angular-ui-table-view/';		//gh-pages
	var appPathRoute = '/';
	var pagesPath = staticPath+'examples/';


	$routeProvider.when(appPathRoute+'home', {templateUrl: 'examples/table-view/table-view.html'});

	$routeProvider.otherwise({redirectTo: appPathRoute+'home'});

    RestangularProvider.setBaseUrl('http://staging.api.mallzee.com');
    RestangularProvider.setRestangularFields({
      id: "_id"
    });

    // Now let's configure the response extractor for each request
    RestangularProvider.setResponseExtractor(function(response) {
      if (response.records) {
        var newResponse = response.records;
        newResponse.originalElement = angular.copy(response);
        return newResponse;
      }
      return response;
    });

}]);