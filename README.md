
[![Build Status](https://travis-ci.org/mallzee/angular-ui-table-view.png?branch=master)](https://travis-ci.org/mallzee/angular-ui-table-view)[ ![Codeship Status for mallzee/angular-ui-table-view](https://www.codeship.io/projects/6e488550-7091-0131-b629-6a793a0a9a66/status?branch=master)](https://www.codeship.io/projects/13414)

# AngularJS UITableView - WIP

### An AngularJS Directive to mimic iOS UITableView to give a fast unlimited length list if items on mobile using ng-repeat

Scrolling on mobile is a pain. Infinite scrolling and large lists are a massive pain! Which is why there is no perfect solution out there, especially in the Angular world. So we developed our own. The core value of the project is to be as simple to utilise as possible while turning long lists of data into seamless, jank free, scrolling lists on mobile. Which in turn means they run shit hot on the desktop.

## Demo
http://angular-ui-table-view.mallzee.com

## How do we get this beast running?

If you are using bower, which we highly recommend, Just run the following.

	bower install angular-ui-table-view --save-dev
	
Add the required files to your projects `index.html` file

```HTML
<link rel="stylesheet" href="bower_components/angular-ui-table-view/dist/ui-table-view.css" />
<script src="bower_components/angular-ui-table-view/dist/ui-table-view.min.js"></script>
```

Add the `mallzee.ui-table-view` module to your application

    angular.module('myApp', ['mallzee.ui-table-view']);
    
Use the following directive to turn your ng-repeats into super performant lists. Instead of using your big array in the ng-repeat directive. Use it as a parameter to the mlz-ui-table-view directive. 

This then generates a small list of items (the size of the buffer set) that it will manage and keep track of so it doesn't kill the performance of your device. It creates an array called `tableView.buffer.items` which you should use in your ng-repeat directive and track by the $$position variable. This is to stop the DOM elements switching out when items are replaced in the array. 

```HTML
<div mlz-ui-table-view="items" mlz-ui-table-view-row-height="100" mlz-ui-table-view-buffer="20">
    <div class="mlz-ui-table-view-wrapper">
        <div ng-repeat="item in tableView.buffer.items track by item.$$position">
            <dt ng-bind="item.name"></dt>
            <dd ng-bind="item.details"></dd>
        </div>
    </div>
</div>
```

# How does it work?

The mlz-ui-table-view directive watches over your big list of items. It creates a subset of the items based on the window parameters currently give. These parameters are updated when the scroll position of wrapper changes.

DOM elements are limited to the buffer size and are never destroyed or created after initialisation. This is what makes the list highly performant. They are moved into the correct place in the list ,using 3d transforms, based on the item index and scroll position and are injected with the correct information from the larger array.
