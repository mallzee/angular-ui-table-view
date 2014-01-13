/**
 @toc

 @param {Object} scope (attrs that must be defined on the scope (i.e. in the controller) - they can't just be defined in the partial html). REMEMBER: use snake-case when setting these on the partial!
 TODO

 @param {Object} attrs REMEMBER: use snake-case when setting these on the partial! i.e. my-attr='1' NOT myAttr='1'
 TODO

 @dependencies
 TODO

 @usage
 partial / html:
 TODO

 controller / js:
 TODO

 //end: usage
 */

'use strict';

function UITableView(scope, element, attr, $timeout) {
  // TableView object

  var BUFFER_SIZE = 20,
    ROW_HEIGHT = 40,
    ROW_WIDTH = '100%';

  var tv = {},
    container = element,
    wrapper = angular.element(container.children()),
    bufferedItems = element.children().children();

  container.css('overflow', 'auto');
  container.addClass('mlz-ui-table-view');
  wrapper.css('position', 'relative');

  // Model the main container for thew view table
  tv.container = {
    height: container.attr('height') || container.prop('clientHeight'),
    width: container.attr('width') || container.prop('clientWidth')
  };

  // Model the wrapper than will be scrolled by the container
  tv.wrapper = {
    height: 0,
    width: tv.container.width || 0
  };

  // Information about an item
  tv.row = {
    height: +attr.mlzUiTableViewRowHeight || ROW_HEIGHT,
    width: +attr.mlzUiTableViewColumnWidth || ROW_WIDTH
  };

  // The list of items overall
  tv.allItems = scope.$eval(attr.mlzUiTableView) || [];

  // Information about the scroll status
  tv.scroll = {
    // X-Axis
    //_x: 0,
    //x: 0,
    //deltaX: 0, Only dealing with Y for just now

    // Y-Axis
    _y: 0,
    y: 0,
    deltaY: 0,

    // Track which item we are on
    index: 0,
    _index: 0,
    deltaIndex: 0,

    // Which direction was the scroll
    direction: 'down',

    height: 0,
    width: 0
  };

  // Information about the buffer status
  tv.buffer = {
    size: +attr.mlzUiTableViewBufferSize || BUFFER_SIZE,
    visible: 0,
    items: angular.copy(bufferedItems),
    pointer: 0
  };

  // Pointer to the buffered items
  tv.items = tv.buffer.items;

  // Information about the view window status
  tv.window = {
    startIndex: 0,
    startPx: 0,
    endIndex: tv.buffer.size - 1 || BUFFER_SIZE,
    endPx: tv.buffer.size * tv.row.height || BUFFER_SIZE * ROW_HEIGHT
  };

  tv.initialise = function () {
    tv.buffer.visible = Math.ceil(tv.container.height / tv.row.height) + 1;
    //console.log('Visible', tv.buffer.visible, tv.container.height, tv.row.height);
    render();
  };

  tv.setScrollPosition = function (y) {
    // Update the coordinates
    tv.scroll.y = y;
    tv.scroll.deltaY = y - tv.scroll._y;
    tv.scroll._y = y;

    // Update indexes
    tv.scroll.index = Math.abs(Math.floor(y / tv.row.height));
    tv.scroll.deltaIndex = Math.abs(tv.scroll.index - tv.scroll._index);
    tv.scroll._index = tv.scroll.index;

    // Update direction
    tv.scroll.direction = (tv.scroll.deltaY >= 0) ? 'down' : 'up';

    // If we've moved on to a new item. Update the view window
    if (tv.scroll.deltaIndex !== 0) {
      tv.scroll.direction === 'down' ? moveViewWindowDown() : moveViewWindowUp();
    }
  };

  tv.scrollToTop = function () {
    element.animate({scrollTop: 0}, 'slow');
  };

  // Add the metadata required by ng-repeats track by to stop DOM creation/deletion
  tv.updatePositions = function(items) {
    //console.log('Updating positions');
    // Recalculate the virtual wrapper height
    tv.allItems = items;
    tv.wrapper.height = tv.allItems.length * tv.row.height;
    wrapper.css('height', tv.wrapper.height + 'px');

    // Make a copy of the original items so we're not overwriting the master list
    angular.copy(tv.allItems.slice(tv.window.startIndex, tv.window.endIndex + 1), tv.buffer.items);

    //console.log('Wrapper height', tv.wrapper.height, tv.items.length, tv.window.startIndex, tv.window.endIndex, tv.window.startPx, tv.window.endPx, tv.buffer.visible);

    var position = tv.buffer.pointer;
    for (var i = 0; i < tv.buffer.items.length; i++) {
      tv.buffer.items[i].$$position = position++;
      tv.buffer.items[i].height = tv.row.height;
      tv.buffer.items[i].top = (tv.window.startPx + (tv.row.height * i));
      tv.buffer.items[i].$$visible = false;
      if (i < tv.buffer.visible) {
        tv.buffer.items[i].$$visible = true;
      }

      if (position >= tv.buffer.items.length) {
        position = 0;
      }
    }
    //tv.buffer.visible = tv.buffer.items.length;
    $timeout(function () {
      render();
    });
    //console.log('Finished augmenting items with position data', scope.tableViewItems, 'from', scope.list);
  };

  function render() {

    bufferedItems = element.children().children();

    for (var i = 0; i < tv.buffer.items.length; i++) {

      var item = tv.buffer.items[i];
      var bufferedItem = angular.element(bufferedItems[i]);
      //console.log('Buffered item', bufferedItems, item);

      bufferedItem.css({
        position: 'absolute',
        width: '100%',
        height: tv.row.height + 'px',
        webkitTransform: 'translateY(' + item.top + 'px)'
      });
    }
  }

  function moveViewWindowUp() {

    // Counter
    var j = 1;
    // Grab the items from the main list we need to merge with the start of the tableViewItems.
    var newItems = tv.allItems.slice(tv.window.startIndex - tv.scroll.deltaIndex, tv.window.startIndex);

    // console.log('Calculating element', newItems, tv.buffer.pointer, tv.scroll.deltaIndex, tv.window.startIndex, tv.window.endIndex, tv.window.startPx, tv.window.endPx);

    // Iterate through the number of items we've scroll over
    // This is required as the scroll events are scares on mobile
    for (var i = tv.scroll.deltaIndex - 1; i >= 0; i--) {

      // TODO Get a better fix to this issue.
      if (newItems[i] === undefined) {
        //console.log('Over reached with the index delta', newItems.length, indexDelta);
        continue;
      }

      decreaseBufferPointer();

      newItems[i].top = (tv.window.startPx - (tv.row.height * j++));
      angular.extend(tv.buffer.items[tv.buffer.pointer], newItems[i]);

      // Grab the element to update
      var bufferedItem = angular.element(bufferedItems[tv.buffer.pointer]);
      if (bufferedItem) {
        // Move it into position
        //console.log('Calculating element', bufferedItem, tv.buffer.pointer, tv.scroll.deltaIndex, tv.scroll.index, tv.window.startIndex, tv.window.endIndex);
        bufferedItem.css('-webkit-transform', 'translateY(' + newItems[i].top + 'px)');
      }
    }

    // Adjust the window indexes
    tv.window.startIndex -= tv.scroll.deltaIndex;
    tv.window.endIndex -= tv.scroll.deltaIndex;

    updateViewWindow();

  }

  function moveViewWindowDown() {
    // Grab the items from the main list we need to merge with the end of the tableViewItems.
    var newItems = tv.allItems.slice(tv.window.endIndex + 1, tv.window.endIndex + 1 + tv.scroll.deltaIndex);
    //console.log('Calculating element', newItems, tv.buffer.pointer, tv.scroll.deltaIndex, tv.window.startIndex, tv.window.endIndex);

    for (var i = 0; i < tv.scroll.deltaIndex; i++) {

      // TODO Get a better solution than this
      if (newItems[i] === undefined) {
        console.log('Over reached with the index delta', newItems.length, tv.scroll.deltaIndex);
        continue;
      }
      //console.log('Calculating element', tv.buffer.pointer, tv.buffer.visible, bufferedItems.length, newItems.length, tv.scroll.deltaIndex, tv.window.startPx, tv.window.endPx, tv.allItems.length);

      // Copy merge new item into place
      newItems[i].top = (tv.window.endPx + (tv.row.height * i));
      angular.extend(tv.buffer.items[tv.buffer.pointer], newItems[i]);

      // Grab the element to update
      var bufferedItem = angular.element(bufferedItems[tv.buffer.pointer]);
      if (bufferedItem) {
        // Move it into position
        //console.log('Moving to ' + newItems[i].top);
        bufferedItem.css('-webkit-transform', 'translateY(' + newItems[i].top + 'px)');
      }
      increaseBufferPointer();
    }

    // Update the window positions
    tv.window.startIndex += tv.scroll.deltaIndex;
    tv.window.endIndex += tv.scroll.deltaIndex;

    updateViewWindow();

  }

  // Update the pixel positions of the view window
  function updateViewWindow() {
    tv.window.startPx = tv.window.startIndex * tv.row.height;
    tv.window.endPx = (tv.window.endIndex + 1) * tv.row.height;
  }

  // Increase the marker which points to which buffered
  // element is currently the top of the table view view
  function increaseBufferPointer() {
    tv.buffer.pointer++;
    if (tv.buffer.pointer >= tv.buffer.size) {
      tv.buffer.pointer = 0;
    }
  }

  // Decrease the marker which points to which buffered
  // element is currently the top of the table view view
  function decreaseBufferPointer() {
    tv.buffer.pointer--;
    if (tv.buffer.pointer < 0) {
      tv.buffer.pointer = tv.buffer.size - 1;
    }
  }

  return tv;
}

angular.module('mallzee.ui-table-view', [])

  .filter('slice', function () {
    return function (arr, start, end) {
      return arr.slice(start, end);
    };
  })
  .directive('mlzUiTableView', ['$window', '$timeout', function ($window, $timeout) {
    return {
      restrict: 'A',
      transclude: false,
      scope: true,
      link: function (scope, element, attributes) {

        scope.tableView = new UITableView(scope, element, attributes, $timeout);
        scope.tableView.initialise();

        // Workout if our saved DOM elements are actually shown
        function isDomInView () {

          var i;

          // Nothing to do here
          if (scope.tableViewItems.length === 0) {
            return false;
          }

          // Hide all the elements for now
          for (i = 0; i < scope.tableViewItems.length; i++) {
            scope.tableViewItems[i].inView = false;
          }

          // Enable the ones in view
          for (i = 0; i < scope.itemsInView; i++) {
            var relPosition = (i + scope.itemScrollIndex) % scope.tableViewItems.length;
            scope.tableViewItems[relPosition].inView = true;
          }
        }

        // The master list of items has changed. Recalculate the virtual list
        scope.$watchCollection('tableView.allItems', function (items) {
          scope.tableView.updatePositions(items);
        });

        // The status bar has been tapped. To the top with ye!
        $window.addEventListener('statusTap', function () {
          scope.tableView.scrollToTop();
        });

        //
        element.on('scroll', function (e) {
          scope.$apply(function () {
            scope.tableView.setScrollPosition(element[0].scrollTop);
          });
        });
      }
    };
  }]);