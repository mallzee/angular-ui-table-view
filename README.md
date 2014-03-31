
[ ![Codeship Status for mallzee/angular-ui-table-view](https://www.codeship.io/projects/6e488550-7091-0131-b629-6a793a0a9a66/status?branch=master)](https://www.codeship.io/projects/13414)

# AngularJS UITableView - WIP

### An AngularJS Directive to mimic iOS UITableView to give a fast unlimited length list if items on mobile using ng-repeat

Scrolling on mobile is a pain. Infinite scrolling and large lists are a massive pain! Which is why there is no perfect solution out there, especially in the Angular world. So we developed our own. The core value of the project is to be as simple to utilise as possible while turning long lists of data into seamless, jank free, scrolling lists on mobile. Which in turn means they run shit hot on the desktop too!

## Demo
http://angular-ui-table-view.mallzee.com

## How do we get this beast running?

If you are using bower, which we highly recommend, Just run the following.

	bower install angular-ui-table-view --save-dev
	
Add the required files to your projects `index.html` file

```HTML
<link rel="stylesheet" href="bower_components/angular-ui-table-view/dist/ui-table-view.css" />
<script src="bower_components/angular-ui-table-view/dist/ui-table-view.js"></script>
```

Add the `mallzee.ui-table-view` module to your application

    angular.module('myApp', ['mallzee.ui-table-view']);
    
Use the following directive to turn your regular joe lists into super performant lists.

Here's some sample markup to turn your list into a super list
```HTML
<mlz-ui-table-view list="list" view-params="{rows:10, rowHeight: 100}">
    <div class="item">
        <dt ng-bind="item.name"></dt>
        <dd ng-bind="item.details"></dd>
    </div>
</mlz-ui-table-view>
```

# How does it work?

The mlz-ui-table-view directive watches over your big list of items. It creates a subset of the items based the viewport size. You can override the calculated values with a view object. It then injects the correct data from your full list into the correct DOM elements and moves them into position to create the illusion of a stream of items. This is required when displaying large lists to avoid killing the performance of your app, or crashing it all together.
  
# Why is this different

A lot of solutions out there rely on keeping DOM elements to a minimum, but create and destroy them as is necessary, which is expensive. Here, DOM elements are limited to the buffer size and are only ever destroyed or created after initialisation when the list becomes smaller than the buffer size, or grows towards the buffer limit. This is what makes the list highly performant. They are moved into the correct place in the list using 3d transforms based on the item index and elements scope is injected with the correct information from the larger array.

# Attributes

The following attributes are supported by mlz-ui-table-view

###list
The array given to the list to enhance. This will be monitored for changes so that the heights of the wrapper can be adjusted if items are added or removed from this array. 

If you are removing items from the current items in view. You should make use of the provided directive functions deleteItem($index). This allows the table to quickly workout how to redraw the table.

###item-name
By default, the list will copy the given view and inject in a scope with the correct item from the big list. This is given the scope property name of `item` by default. You can rename this to anything you want if item doesn't suit. Think of this as the equivalent to item in this ng-repeat expression `item in items`

###view-params
Eventually the view will do it's best to calculate the view parameters. Until then you have to specify these parameters in a view object. This object is watched, so the view can be updated by manipulating this object.

 * **rows** - Default: 10 - This is the number of elements you are going to keep in the buffer. Generally this is the containers height / row height + 1
 * **columns** - Default: 1 - This table view will handle columns of items.
 * **rowHeight** - Default: 100 - Specify the row height so the items can be positioned correctly.
 * **triggerDistance** - Default: 0 - If you want to trigger the edge before hitting it, set the number of items before the edge you want to concider the trigger zone. A value of zero means when the edge is touched. (i.e. a value of three means when the third item from the edge comes into view, the trigger zone for that edge will be triggered)

*Example object*

```
var view = {
   rows: 10,
   rowHeight: 100,
   columns: 1,
   triggerDistance: 0
}
```

###trigger-top
###trigger-bottom
Functions that will be called when the trigger zone is entered at the top or bottom of the list based on the views `triggerDistance` parameter



