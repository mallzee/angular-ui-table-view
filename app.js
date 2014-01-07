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
//additional angular modules
'mallzee.ui-table-view'
]).
config(['$routeProvider', '$locationProvider', '$compileProvider', function($routeProvider, $locationProvider, $compileProvider) {
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

}]);