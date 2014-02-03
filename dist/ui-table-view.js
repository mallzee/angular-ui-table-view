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
    SCROLL_DOWN = 'down';


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

  // The list of all items
  tv.items = scope.$eval(attr.mlzUiTableView) || [];

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
    // Get the containing dimensions to base our calculations from.
    tv.container.height = +container.attr('height') || container.prop('clientHeight');
    tv.container.width = +container.attr('width') || container.prop('clientWidth');

    // Calculate the number of items that can be visible at a given time
    tv.view.size = Math.ceil(tv.container.height / tv.row.height) + 1;
    tv.buffer.bottom = tv.buffer.size - 1 || BUFFER_SIZE - 1;
    tv.buffer.yBottom = tv.buffer.size * tv.row.height || BUFFER_SIZE * ROW_HEIGHT;
    tv.buffer.distance = tv.buffer.size - tv.view.size;
    initialiseElements();
    $log.debug('Scroller initialised', tv.container.height, tv.buffer.size, tv.buffer.distance, tv.view.size,
      tv.row.height, tv.buffer.bottom);
  };

  /**
   * Move the scroller back to the top.
   */
  tv.scrollToTop = function () {
    element.animate({scrollTop: 0}, 'slow');
  };

  /**
   * Add the metadata required by ng-repeats track by to stop DOM creation/deletion
   *
   * @param items
   * @returns {boolean}
   */
  tv.updatePositions = function (items) {

    tv.items = items;

    if (!tv.items) {
      return false;
    }

    // Recalculate the virtual wrapper height
    tv.wrapper.height = tv.items.length * tv.row.height;
    wrapper.css('height', tv.wrapper.height + 'px');

    // Make a copy of the original items so we're not overwriting the master list
    angular.copy(tv.items.slice(tv.buffer.top, tv.buffer.bottom + 1), tv.buffer.items);

    var position = 0;

    for (var i = 0; i < tv.buffer.items.length; i++) {
      tv.buffer.items[i].$$position = position++;
      tv.buffer.items[i].$$height = tv.row.height;
      tv.buffer.items[i].$$top = (tv.buffer.yTop + (tv.row.height * i));
      tv.buffer.items[i].$$visible = false;

      if (i < tv.view.size) {
        tv.buffer.items[i].$$visible = true;
      }

      if (position >= tv.buffer.items.length) {
        position = 0;
      }
    }

    $timeout(function () {
      tv.initialise();
    });

    // We've made changes to the models so we must update the deltas
    setupNextTick();
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
  function initialiseElements () {

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

  /**
   * Detects if this move will cause the buffer to hit an edge.
   *
   * @param index
   * @param distance
   * @param direction
   * @returns {boolean}
   */
  function willBufferHitEdge () {

    var index = tv.scroll.yIndex;
    var dir = tv.scroll.direction;
    var dist = tv.scroll.yDistance;

    if (direction)
      if (
        (dir === SCROLL_UP && (index - dist) <= 0) ||
          (dir === SCROLL_DOWN && (index + tv.buffer.size + dist) >= (tv.items.length - 1))
        ) {
        return true;
      }
    return false;
  }

  function validateBuffer() {
    // If we're breaking the boundaries
    // we need to adjust the buffer accordingly
    if (tv.buffer.top < 0) {
      tv.buffer.top = 0;
      tv.buffer.bottom = tv.buffer.size - 1;
    } else if (tv.buffer.bottom >= tv.items.length) {
      tv.buffer.top = tv.items.length - tv.buffer.size;
      tv.buffer.bottom = tv.items.length - 1;
    }

    // Update the extra properties of the buffer
    tv.buffer.yTop = tv.buffer.top * tv.row.height;
    tv.buffer.yBottom = (tv.buffer.bottom + 1) * tv.row.height;
    tv.buffer.atEdge = (tv.buffer.top <= 0) ? EDGE_TOP : (tv.buffer.bottom >= tv.items.length - 1) ? EDGE_BOTTOM : false;
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
    console.log('Render required?', tv.scroll.direction, tv.scroll.directionChange, tv.view.deadZone, tv.view.deadZoneChange, tv.buffer.atEdge, tv.view.ytChange, tv.view.ybChange);
    return(
      ((tv.scroll.direction === SCROLL_UP && tv.buffer.atEdge !== EDGE_TOP && tv.view.deadZone === false) && (tv.scroll.directionChange || tv.view.ytChange)) ||
      ((tv.scroll.direction === SCROLL_DOWN && tv.buffer.atEdge !== EDGE_BOTTOM && tv.view.deadZone === false) && (tv.scroll.directionChange || tv.view.ybChange)) ||
      !(tv.view.deadZone !== false && tv.view.deadZoneChange === false)
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
    console.log('Updating scroll model', y, tv.scroll.yIndex);
    if (tv.scroll.yIndex < 0) {
      tv.scroll.yIndex = 0;
    }

    if (tv.scroll.yIndex >= tv.items.length) {
      tv.scroll.yIndex = tv.items.length - 1;
    }

    tv.scroll.yDistance = Math.abs(tv.scroll.yIndex - tv._scroll.yIndex);
    tv.scroll.yChange = (tv.scroll.yDistance > 0);

    // tv.scroll.bottomIndex = Math.abs(Math.floor((tv.container.height + y) / tv.row.height));

    // Update direction
    console.log('Updating scroll model', y, tv._scroll.y, tv.scroll.yIndex, tv.scroll.yDelta);
    tv.scroll.direction = (tv.scroll.yDelta >= 0) ? SCROLL_DOWN : SCROLL_UP;
    tv.scroll.directionChange = (tv.scroll.direction !== tv._scroll.direction);

    // Check if we should reset the buffer this tick
    tv.buffer.reset = tv.scroll.yDistance > tv.buffer.size;
  }

  /**
   * Update the view model based on the current scroll model
   */
  function updateViewModel () {

    //tv.view.bottom = tv.scroll.yIndex + tv.view.size - 1;
    tv.view.yTop = tv.scroll.y;
    tv.view.yBottom = tv.scroll.y + tv.container.height;
    tv.view.top = tv.scroll.yIndex;
    tv.view.bottom = Math.floor(tv.view.yBottom / tv.row.height);
    tv.view.atEdge = !(tv.view.top > 0 && tv.view.bottom < tv.items.length - 1);

    tv.view.deadZone = (tv.view.yTop < tv.row.height) ? EDGE_TOP : tv.view.yBottom > ((tv.items.length - 1) * tv.row.height) ? EDGE_BOTTOM : false;
    tv.view.deadZoneChange = (tv.view.deadZone !== tv._view.deadZone);

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

    var items = tv.items.slice(start, end + 1),
      px = start * tv.row.height;
    $log.debug('Slicing up', start, end, tv.getRelativeBufferPosition(end), px, items.length);

    for (var i = items.length - 1; i >= 0; i--) {
      var position = tv.getRelativeBufferPosition(end--),
        top = px + (tv.row.height * i);

      items[i].$$top = top;
      $log.debug('Extending', position, top, tv.buffer.items[position], 'with', items[i]);
      angular.extend(tv.buffer.items[position], items[i]);
      tv.setElementPosition(position, top);
    }

  }

  function scrollingDown (start, end) {

    var items = tv.items.slice(start, end + 1),
      px = start * tv.row.height;

    $log.debug('Slicing down', start, end, tv.getRelativeBufferPosition(start), px, items.length);

    for (var i = 0; i < items.length; i++) {
      var position = tv.getRelativeBufferPosition(start + i),
        top = px + (tv.row.height * i);

      items[i].$$top = top;
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

    // If the buffer is at an edge, and we're scrolling towards that edge.
    // We don't need to make any updates to the buffer
    /*if (isBufferUpdateRequired() === false) {
      $log.debug('Buffer updates not required');
      setupNextTick();
      return;
    }*/

    // We're going to scroll right passed the limits of our buffer.
    // We may as well just redraw from the new index and direction
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


  /**
   * Update a buffered elements coordinates
   * @param index
   * @param y
   * @returns {boolean}
   */
  tv.setElementPosition = function (index, y) {
    var el = angular.element(tv.buffer.elements[index]);
    if (el) {
      // Move it into position
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
      transclude: false,
      scope: true,
      link: function (scope, element, attributes) {

        // TODO: Passing all this stuff seems wrong. Clean this up
        scope.tableView = new UITableView(scope, element, attributes, $timeout, $log);
        scope.tableView.initialise();

        // The master list of items has changed. Recalculate the virtual list
        scope.$watchCollection(attributes.mlzUiTableView, function (items) {
          scope.tableView.updatePositions(items);
        });

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