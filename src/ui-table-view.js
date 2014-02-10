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

function UITableView (scope, element, attr, $timeout, $log) {
  // TableView object

  // Constants used within the table view
  var BUFFER_SIZE = 200,
    ROW_HEIGHT = 40,
    ROW_WIDTH = '100%',
    EDGE_TOP = 'top',
    EDGE_BOTTOM = 'bottom',
    SCROLL_UP = 'up',
    SCROLL_DOWN = 'down',
    TRIGGER_DISTANCE = 3;


  var tv = {},
    container = element,
    wrapper = angular.element(container.children());

  container.css('overflow', 'auto');
  container.addClass('mlz-ui-table-view');
  wrapper.css('position', 'relative');

  // Model the main container for the view table
  tv.container = {
    height: container.attr('height') || container.prop('clientHeight'),
    width: container.attr('width') || container.prop('clientWidth')
  };

  // Model the wrapper that will hold the buffer and be scrolled by the container
  tv.wrapper = {
    height: 0,
    width: tv.container.width || 0
  };

  // Model a row
  tv.row = {
    height: +attr.mlzUiTableViewRowHeight || ROW_HEIGHT,
    width: +attr.mlzUiTableViewColumnWidth || ROW_WIDTH
  };

  tv.trigger = {
    distance: TRIGGER_DISTANCE
  };

  // Information about the scroll status
  // _ indicates the value of that item on the previous tick
  tv.scroll = {
    // X-Axis
    x: 0, //TODO: Support x axis
    xDelta: 0, //TODO: Support x axis
    xIndex: 0, //TODO: Support x axis
    xDistance: 0,
    xChange: false,

    //Only dealing with Y for just now
    // Y-Axis
    y: 0,
    yDelta: 0,
    yIndex: 0,
    yDistance: 0,
    yChange: false, // Marks when we have scrolled to a new index

    // Track which item we are on
    // topIndex: 0, // Mark the topIndex we are heading for
    // _topIndex: 0, // Last ticks topIndex so we can get the delta

    // topIndexDelta: 0, // How many indexes have we moved this tick?

    // bottomIndex: 0,
    // _bottomIndex: 0,
    // bottomIndexDelta: 0,

    pointer: 0, // Mark where we are in the big list while adjusting the window.

    // Which direction was the scroll
    direction: SCROLL_DOWN,
    directionChange: false
  };
  tv._scroll = angular.copy(tv.scroll);


  tv.metadata = {
    $$position: 0,
    $$visible: true,
    $$top: 0,
    $$height: 0
  };

  tv.view = {
    top: 0,
    bottom: 0,
    left: 0, //TODO: Support x axis
    right: 0, //TODO: Support x axis
    items: [],
    size: 0,
    yTop: 0,
    yBottom: 0,
    atEdge: EDGE_TOP,
    deadZone: EDGE_TOP,
    deadZoneChange: false
  };
  tv._view = angular.copy(tv.view);


  // Information about the buffer status
  tv.buffer = {
    size: +attr.mlzUiTableViewBufferSize || BUFFER_SIZE, // The buffer size, i.e. how many DOM elements we'll track
    items: [], // The items data that are in the current buffer
    elements: [], // Reference to that actual DOM elements that make up the buffer //TODO: Remove this from the scope some how
    top: 0, // Index position of the top of the buffer.
    bottom: 0, // Index position of the bottom of the buffer.
    left: 0, //TODO: Support x axis
    right: 0, //TODO: Support x axis

    yTop: 0, // Pixel position of the top of buffer.
    yBottom: 0, // Pixel position of the bottom of the buffer.

    atEdge: EDGE_TOP, // Marks if the buffer is at an edge, and if so, which one.
    pointer: 0,      // Marks the current element at the top of the table
    distance: 0,    // How many elements of the buffer are out of view. Used to calculate the distance moved on a direction change
    reset: false
  };
  tv._buffer = angular.copy(tv.buffer);


  /**
   * Initialise the scroll view window, based on the container it's been given.
   * This should be called whenever the containing elements size has changed
   */
  tv.initialise = function () {

    updateContainer();
    updateWrapper();

    // Calculate the number of items that can be visible at a given time
    tv.view.size = Math.ceil(tv.container.height / tv.row.height) + 1;
    tv.buffer.bottom = tv.buffer.size - 1 || BUFFER_SIZE - 1;
    tv.buffer.yBottom = tv.buffer.size * tv.row.height || BUFFER_SIZE * ROW_HEIGHT;
    tv.buffer.distance = tv.buffer.size - tv.view.size;

    positionElements();

    $log.debug('Scroller initialised', tv.container.height, tv.buffer.size, tv.buffer.distance, tv.view.size,
      tv.row.height, scope.items.length, tv.buffer.items.length);
  };

  /**
   * Move the scroller back to the top.
   */
  tv.scrollToTop = function () {
    element.animate({scrollTop: 0}, 'slow');
  };

  /**
   * Calculate the size of the container used by the scroller
   */
  function updateContainer() {
    // Get the containing dimensions to base our calculations from.
    tv.container.height = +container.attr('height') || container.prop('clientHeight');
    tv.container.width = +container.attr('width') || container.prop('clientWidth');
  }

  /**
   * Calculate the wrapper size based on the current items list
   */
  function updateWrapper() {
    // Recalculate the virtual wrapper height
    tv.wrapper.height = scope.items.length * tv.row.height;
    wrapper.css('height', tv.wrapper.height + 'px');
  }
  /**
   * Add the metadata required by ng-repeats track by to stop DOM creation/deletion
   *
   * @param items
   * @returns {boolean}
   */
  tv.initialiseBuffer = function () {

    if (!scope.items) {
      return false;
    }

    angular.copy(scope.items.slice(tv.buffer.top, tv.buffer.bottom + 1), tv.buffer.items);

    for (var i = 0; i < tv.buffer.items.length; i++) {
      tv.buffer.items[i].$$position = i;
      console.log('Adding position', tv.buffer.items[i].$$position)
    }

    tv.drawBuffer();

    $timeout(function () {
      tv.initialise();
    });

    // We've made changes to the models so we must update the deltas
    setupNextTick();
  };

  tv.drawBuffer = function() {

    if (scope.items.length <= 0 || tv.buffer.items.length <= 0) {
      return false;
    }
    // Make a copy of the original items so we're not overwriting the master list
    //var tempItems = scope.items.slice(tv.buffer.top, tv.buffer.bottom + 1);
    //angular.copy(scope.items.slice(tv.buffer.top, tv.buffer.bottom + 1), tv.buffer.items);

    var position = tv.getRelativeBufferPosition(tv.buffer.top);
    console.log('Drawing list from', position, tv.buffer.top, tv.buffer.bottom);

    for (var i = tv.buffer.top; i <= tv.buffer.bottom; i++) {
      var pos = tv.getRelativeBufferPosition(i);

      console.log('Extending', pos, tv.buffer.items[pos], scope.items[i]);
      angular.extend(tv.buffer.items[pos], scope.items[i]);

      tv.buffer.items[pos].$$index = i;
      tv.buffer.items[pos].$$height = tv.row.height;
      tv.buffer.items[pos].$$top = tv.row.height * i;
      tv.buffer.items[pos].$$visible = false;
      tv.buffer.items[pos].$$position = pos;

      if (i < tv.view.size) {
        tv.buffer.items[i].$$visible = true;
      }

      position++;
      if (position >= tv.buffer.items.length) {
        position = 0;
      }
    }
  };

  /**
   * Update model variables for delta tracking
   */
  function setupNextTick () {
    angular.extend(tv._scroll, tv.scroll);
    angular.extend(tv._view, tv.view);
    angular.extend(tv._buffer, tv.buffer);
    $log.debug('Setup next tick', tv.scroll.y, tv.buffer.top, tv.buffer.bottom, tv.buffer.yTop, tv.buffer.yBottom);
  }

  /**
   * Setup the buffered elements ready for manipulating
   */
  function positionElements () {

    tv.buffer.elements = element.children().children();
    for (var i = 0; i < tv.buffer.items.length; i++) {

      var item = tv.buffer.items[i];
      var el = angular.element(tv.buffer.elements[i]);
      el.css({
        position: 'absolute',
        width: '100%',
        height: tv.row.height + 'px',
        webkitTransform: 'translateY(' + item.$$top + 'px)'
      });
    }
  }

  function validateBuffer() {
    // If we're breaking the boundaries
    // we need to adjust the buffer accordingly
    if (tv.buffer.top < 0) {
      tv.buffer.top = 0;
      tv.buffer.bottom = tv.buffer.size - 1;
    } else if (tv.buffer.bottom >= scope.items.length) {
      tv.buffer.top = scope.items.length - tv.buffer.size;
      tv.buffer.bottom = scope.items.length - 1;
    }

    // Update the extra properties of the buffer
    tv.buffer.yTop = tv.buffer.top * tv.row.height;
    tv.buffer.yBottom = (tv.buffer.bottom + 1) * tv.row.height;
    tv.buffer.atEdge = (tv.buffer.top <= 0) ? EDGE_TOP : (tv.buffer.bottom >= scope.items.length - 1) ? EDGE_BOTTOM : false;
  }

  /**
   * Returns which element position should be used for a given index
   * from the main array
   * @param index
   */
  tv.getRelativeBufferPosition = function (index) {
    return index % tv.buffer.size;
  };

  /**
   * Calculates if a render is required.
   */
  function isRenderRequired () {
    $log.debug('Render required?', tv.scroll.direction, tv.scroll.directionChange,
      tv.view.deadZone, tv.view.deadZoneChange, tv.buffer.atEdge, tv.view.ytChange,
      tv.view.ybChange);

    return(
      ((tv.scroll.direction === SCROLL_UP && tv.buffer.atEdge !== EDGE_TOP && tv.view.deadZone === false) && (tv.scroll.directionChange || tv.view.ytChange)) ||
      ((tv.scroll.direction === SCROLL_DOWN && tv.buffer.atEdge !== EDGE_BOTTOM && tv.view.deadZone === false) && (tv.scroll.directionChange || tv.view.ybChange)) ||
      !(tv.view.deadZone !== false && tv.view.deadZoneChange === false)
    );
  }

  function isTriggerRequired () {
    $log.debug('Trigger required?', tv.view.triggerZone, tv.view.triggerZoneChange);
    return (
      (tv.view.triggerZone !== false && tv.view.triggerZoneChange)
    );
  }

  /**
   * Update the scroll model base on the current scroll position
   * @param y
   */
  function updateScrollModel (y) {
    // Update the coordinates
    tv.scroll.y = y;
    tv.scroll.yDelta = y - tv._scroll.y;

    // Update indexes
    tv.scroll.yIndex = Math.floor(y / tv.row.height);

    if (tv.scroll.yIndex < 0) {
      tv.scroll.yIndex = 0;
    }

    console.log('Scroll update', tv);
    if (tv.scroll.yIndex >= scope.items.length) {
      tv.scroll.yIndex = scope.items.length - 1;
    }

    tv.scroll.yDistance = Math.abs(tv.scroll.yIndex - tv._scroll.yIndex);
    tv.scroll.yChange = (tv.scroll.yDistance > 0);

    // tv.scroll.bottomIndex = Math.abs(Math.floor((tv.container.height + y) / tv.row.height));

    // Update direction
    tv.scroll.direction = (tv.scroll.yDelta >= 0) ? SCROLL_DOWN : SCROLL_UP;
    tv.scroll.directionChange = (tv.scroll.direction !== tv._scroll.direction);

    // Check if we should reset the buffer this tick
    tv.buffer.reset = tv.scroll.yDistance > tv.buffer.size;
  }

  /**
   * Update the view model based on the current scroll model
   * TODO: Experiment with watchers to handle the delta changes
   */
  function updateViewModel () {

    //tv.view.bottom = tv.scroll.yIndex + tv.view.size - 1;
    tv.view.yTop = tv.scroll.y;
    tv.view.yBottom = tv.scroll.y + tv.container.height;
    tv.view.top = tv.scroll.yIndex;
    tv.view.bottom = Math.floor(tv.view.yBottom / tv.row.height);
    tv.view.atEdge = !(tv.view.top > 0 && tv.view.bottom < scope.items.length - 1);

    // Calculate if we're in a trigger zone and if there's been a change.
    tv.view.triggerZone = (tv.view.yTop < tv.trigger.distance * tv.row.height) ? EDGE_TOP : tv.view.yBottom > ((scope.items.length - tv.trigger.distance - 1) * tv.row.height) ? EDGE_BOTTOM : false;
    tv.view.triggerZoneChange = (tv.view.triggerZone !== tv._view.triggerZone);

    // Calculate if we're in a dead zone and if there's been a change.
    tv.view.deadZone = (tv.view.yTop < tv.row.height) ? EDGE_TOP : tv.view.yBottom > ((scope.items.length - 1) * tv.row.height) ? EDGE_BOTTOM : false;
    tv.view.deadZoneChange = (tv.view.deadZone !== tv._view.deadZone);

    // Calculate if there have been index changes on either side of the view
    tv.view.ytChange = (tv.view.top !== tv._view.top);
    tv.view.ybChange = (tv.view.bottom !== tv._view.bottom);

    $log.debug('Updated view model', tv.view.yTop, tv.view.yBottom, tv.container.height, tv.scroll.y);
  }

  /**
   * Set the buffer to an index.
   *
   * @param edge
   */
  function setBufferToIndex (index) {
    $log.debug('Setting buffer to index', index);
    tv.buffer.top = index;
    tv.buffer.bottom = tv.buffer.top + tv.buffer.size;
    validateBuffer();
  }

  /**
   * Update the buffer model based on the current scroll model
   *
   * @param index
   * @param direction
   * @param distance
   */
  function updateBufferModel () {

    var index = tv.scroll.yIndex,
      direction = tv.scroll.direction,
      distance = tv.buffer.distance;

    // Based on the scroll direction, update the buffer model
    switch (direction) {
      case SCROLL_UP:
        tv.buffer.top = index - distance;
        tv.buffer.bottom = (index - distance) + (tv.buffer.size - 1);
        break;
      case SCROLL_DOWN:
        tv.buffer.top = index;
        tv.buffer.bottom = index + tv.buffer.size - 1;
        break;
      default:
        $log.debug('We only know how to deal with scrolling on the y axis for now');
        break;
    }
    validateBuffer();
    $log.debug('Updated buffer model', tv.buffer.top, tv.buffer.bottom, tv.buffer.atEdge);
  }

  function scrollingUp (start, end) {

    var items = scope.items.slice(start, end + 1),
      px = start * tv.row.height;
    $log.debug('Slicing up', start, end, tv.getRelativeBufferPosition(end), px, items.length);

    for (var i = items.length - 1; i >= 0; i--) {
      var position = tv.getRelativeBufferPosition(end),
        top = px + (tv.row.height * i);

      items[i].$$top = top;
      items[i].$$index = end--;
      $log.debug('Extending', position, top, tv.buffer.items[position], 'with', items[i]);
      angular.extend(tv.buffer.items[position], items[i]);
      tv.setElementPosition(position, top);
    }

  }

  function scrollingDown (start, end) {

    var items = scope.items.slice(start, end + 1),
      px = start * tv.row.height;

    $log.debug('Slicing down', start, end, tv.getRelativeBufferPosition(start), px, items.length);

    for (var i = 0; i < items.length; i++) {
      var position = tv.getRelativeBufferPosition(start + i),
        top = px + (tv.row.height * i);

      items[i].$$top = top;
      items[i].$$index = start + i;
      $log.debug('Extending', position, top, tv.buffer.items[position], 'with', items[i]);
      angular.extend(tv.buffer.items[position], items[i]);
      tv.setElementPosition(position, top);
    }
  }

  /**
   * Update the scroll model with a scroll offset.
   */
  tv.setScrollPosition = function (x, y) {

    //TODO: Support x axis
    if (y === undefined) {
      y = x;
    }

    // Alright lets update the scroll model to where we're at now
    updateScrollModel(y);

    // Lets move the view as well
    updateViewModel();

    // We're going to scroll right passed the limits of our buffer.
    // We may as well just redraw from the new index
    if (tv.buffer.reset) {
      switch(tv.scroll.direction) {
        case SCROLL_UP:
          setBufferToIndex(tv.view.bottom - tv.buffer.size);
          break;
        case SCROLL_DOWN:
          setBufferToIndex(tv.view.top);
          break;
      }
    }

    // Update the buffer model
    updateBufferModel();

    // Update the DOM based on the models
    if (isRenderRequired()) {
      render();
    }

    // Do we need to call one of the edge trigger because we're in the zone?
    if (isTriggerRequired()) {
      trigger();
    }

    // Prep for the next pass
    setupNextTick();
  };

  /**
   * Update the DOM and based on the current state of the models
   */
  function render () {

    var start, end;

    if (tv.buffer.reset) {
      // Reset the buffer to this ticks window
      start = tv.buffer.top;
      end = tv.buffer.bottom;

      // If we've changed the scroll direction.
      // Update the buffer to reflect the direction.
      switch (tv.scroll.direction) {
        case SCROLL_UP:
          scrollingUp(start, end);
          break;
        case SCROLL_DOWN:
          scrollingDown(start, end);
          break;
      }
    } else {
      // If we've changed the scroll direction.
      // Update the buffer to reflect the direction.
      switch (tv.scroll.direction) {
        case SCROLL_UP:
          start = tv.buffer.top;
          end = tv._buffer.top - 1;
          scrollingUp(start, end);
          break;
        case SCROLL_DOWN:
          start = tv._buffer.bottom + 1;
          end = tv.buffer.bottom;
          scrollingDown(start, end);
          break;
      }
    }
  }

  /**
   * Trigger a function supplied to the directive
   */
  function trigger() {
    switch (tv.view.triggerZone) {
      case EDGE_TOP:
        if (attr.mlzUiTableViewTriggerTop) {
          scope.$eval(attr.mlzUiTableViewTriggerTop);
        }
        break;
      case EDGE_BOTTOM:
        if (attr.mlzUiTableViewTriggerBottom) {
          scope.$eval(attr.mlzUiTableViewTriggerBottom);
        }
        break;
      default:
        $log.debug('Zone ' + tv.view.triggerZone + ' is not supported');
    }
  }

  /**
   * Set the scroller to the given items index.
   * @param index
   */
  tv.setScrollYIndex = function (index) {
    var y = index * tv.row.height;

    container.prop('scrollTop', y);
    tv.setScrollPosition(y);
  };

  /**
   * Set the scroller to the given y coordinate.
   * @param y
   */
  tv.setScrollYPosition = function (y) {
    container.prop('scrollTop', y);
    tv.setScrollPosition(y);
  };

  /**
   * Process a scroll event to update the scroll model
   *
   * @param e
   * @param distance
   */
  tv.processScrollEvent = function (e, distance) {
    tv.setScrollPosition(distance);
  };


  tv.deleteItem = function (index) {
    console.log('Deleting item @', index);
    scope.items.splice(index, 1);

    // TODO: Move buffer window up if we're at the end of the items list
    //angular.copy(scope.items.slice(tv.buffer.top, tv.buffer.bottom + 1), tv.buffer.items);

    // If the buffer is at the bottom and there is a deletion
    // We need to slide the buffer up one item to compensate for
    // the removal
    if (tv.buffer.atEdge === EDGE_BOTTOM) {
      tv.buffer.top--;
      tv.buffer.bottom--;
    }

    tv.drawBuffer();
    positionElements();
    updateWrapper();
  };

  /**
   * Update a buffered elements coordinates
   * @param index
   * @param y
   * @returns {boolean}
   */
  tv.setElementPosition = function (index, y) {
    var el = angular.element(tv.buffer.elements[index]);
    if (el) {
      // Move it into position. Hide the element first to stop any janky behaviour with items being moved
      el.css('display', 'none');
      el.css('-webkit-transform', 'translateY(' + y + 'px)');
      el.css('display', 'block');
      return true;
    }
    return false;
  }

  return tv;
}

/**
 * TODO: Add in some docs on how to use this angular module and publish them on GitHub pages.
 */
angular.module('mallzee.ui-table-view', [])
  .directive('mlzUiTableView', ['$window', '$timeout', '$log', function ($window, $timeout, $log) {
    return {
      restrict: 'A',
      transclude: true,
      /*scope: {
        items: '='
      },*/
      replace: false,
      /*controller: ['$scope', function ($scope) {

      }],*/
      template: '<div class="mlz-ui-table-view-wrapper" ng-transclude></div>',
      link: function (scope, element, attributes) {
        // TODO: Passing all this stuff seems wrong. Clean this up
        scope.tableView = UITableView(scope, element, attributes, $timeout, $log);
        scope.tableView.initialise();
        scope.tableView.initialiseBuffer();

        scope.items = scope.$eval(attributes.items);

        // The master list of items has changed. Recalculate the virtual list
        scope.$watchCollection('items', function (items, old) {

          scope.tableView.drawBuffer();
          console.log('Items changed', items.length, old.length, scope.tableView.buffer.items);

        });

        scope.addItem = function(item, index) {
          console.log('Adding item', item, index);
        };

        // The status bar has been tapped. To the top with ye!
        $window.addEventListener('statusTap', function () {
          scope.tableView.scrollToTop();
        });

        // When we scroll. Lets work some magic.
        element.on('scroll', function (e) {
          scope.$apply(function () {
            scope.tableView.processScrollEvent(e, element[0].scrollTop);
          });
        });
      }
    };
  }]);