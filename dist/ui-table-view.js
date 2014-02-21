/**
 * UITableView
 */

(function (window, angular, undefined) {
  'use strict';

  /**
   * TODO: Add in some docs on how to use this angular module and publish them on GitHub pages.
   */
  angular.module('mallzee.ui-table-view', [])
    .directive('mlzUiTableView', ['$window', '$timeout', '$log', function ($window, $timeout, $log) {

      var BUFFER_ROWS = 10,
        COLUMNS = 1,
        ROW_HEIGHT = 40,
        ROW_WIDTH = '100%',
        EDGE_TOP = 'top',
        EDGE_BOTTOM = 'bottom',
        SCROLL_UP = 'up',
        SCROLL_DOWN = 'down',
        TRIGGER_DISTANCE = 5;

      var list = [], items = [],

      // Model the main container for the view table
        container = {
          height: 0, //container.attr('height') || container.prop('clientHeight'),
          width: 0, //container.attr('width') || container.prop('clientWidth')
          el: undefined
        },

      // Model the wrapper that will hold the buffer and be scrolled by the container
        wrapper = {
          height: 0,
          width: 0,
          rows: 0,
          el: undefined
        },

        elements,

      // Model a row
        row = {
          height: ROW_HEIGHT,
          width: ROW_WIDTH
        },

        columns = COLUMNS,

        trigger = {
          distance: TRIGGER_DISTANCE
        },

      // Information about the scroll status
      // _ indicates the value of that item on the previous tick
        scroll = {
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
          yDistance: 0,
          yChange: false, // Marks when we have scrolled to a new index
          row: 0, // Which row we are currently on

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
        },
        _scroll, // Previous tick data

        metadata = {
          $$position: 0,
          $$visible: true,
          $$top: 0,
          $$height: 0
        },

        view = {
          top: 0,
          bottom: 0,
          left: 0, //TODO: Support x axis
          right: 0, //TODO: Support x axis
          items: [],
          size: 0,
          rows: 0,
          yTop: 0,
          yBottom: 0,
          atEdge: EDGE_TOP,
          deadZone: EDGE_TOP,
          deadZoneChange: false
        },
        _view, // Previous tick data

      // Information about the buffer status
        buffer = {
          rows: BUFFER_ROWS,
          size: BUFFER_ROWS * COLUMNS, // The buffer size, i.e. how many DOM elements we'll track
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
          reset: false,
          refresh: false
        },
        _buffer; // Previous tick data


      return {
        restrict: 'E',
        transclude: true,
        replace: false,
        template: '<div class="mlz-ui-table-view-wrapper" ng-transclude></div>',
        link: function (scope, element, attributes) {

          // Save references to the elements we need access to
          container.el = element;
          wrapper.el = element.children();
          elements = element.children().children();

          // Make a copy of the main list for extracting data from
          list = scope.$eval(attributes.list);

          // Make the buffered items available on the scope
          scope.items = items;

          scope.deleteItem = function (index) {
            //console.log('Deleting ' + index, buffer);
            // Remove the item from the list
            list.splice(index, 1);

            // If we're at the bottom edge of the buffer.
            // We need to reduce the buffer indexes by the amount deleted
            if (buffer.atEdge === EDGE_BOTTOM) {
              //console.log('Delete on bottom edge');
              buffer.top--;
              buffer.bottom--;
            }
          };

          wrapper.el.css('position', 'relative');

          // Setup the table view
          initialise(scope, attributes);

          // The master list of items has changed. Recalculate the virtual list
          scope.$watchCollection('list', function (newList) {
            console.log('List changed');
            if (newList) {
              list = newList;
            } else {
              $log.warn('Trying to remove the list completely');
            }

            if (list.length > 0) {
console.log('Drawing buffer after list change');
              updateBuffer();
            }
          });

          // The status bar has been tapped. To the top with ye!
          $window.addEventListener('statusTap', function () {
            scrollToTop();
          });

          // When we scroll. Lets work some magic.
          container.el.on('scroll', function () {
            scope.$apply(function () {
              setScrollPosition(container.el.prop('scrollTop'));
            });
          });

          // TODO: Experiment with watching scrollTop and intervals
          // to mirror multiple scroll events.
          /*scope.$watch(function () {
           return container.el[0].scrollTop;
           }, function(y) {
           $log.debug('Watching scrollTop', y);
           });*/
        }
      };

      /* * * * * * * * * * * * * * * */
      /* Helper functions            */
      /* * * * * * * * * * * * * * * */

      /**
       * Copy the current models so we can create a delta from them
       */
      function initialise (scope, attributes) {
        _scroll = angular.copy(scroll);
        _view = angular.copy(view);
        _buffer = angular.copy(buffer);

        if (attributes.rowHeight) {
          row.height = +attributes.rowHeight;
        }

        if (attributes.columns) {
          columns = +attributes.columns;
        }

        if (attributes.rows) {
          buffer.rows = +attributes.rows;
          buffer.size = buffer.rows * columns;
        }

        // Setup trigger functions for the directive
        if (attributes.triggerTop) {
          triggerTop = function () {
            scope.$eval(attributes.triggerTop);
          };
        }

        // Setup trigger functions for the directive
        if (attributes.triggerBottom) {
          triggerBottom = function () {
            scope.$eval(attributes.triggerBottom);
          };
        }

        calculateContainer();


        if (list.length > 0) {
console.log('Drawing buffer on initialisation');
          updateBuffer();
        }
      }

      function updateBuffer() {
        calculateDimensions();

        createBuffer();

        positionElements();
      }

      /**
       * Move the scroller back to the top.
       */
      function scrollToTop () {
        container.el.animate({scrollTop: 0}, 'slow');
      }

      /**
       * Add the metadata required by ng-repeats track by to stop DOM creation/deletion
       *
       * @param items
       * @returns {boolean}
       */
      function createBuffer () {

        if (!list) {
          return false;
        }

        angular.copy(list.slice(itemIndexFromRow(buffer.top), itemIndexFromRow(buffer.bottom)), items);
console.log(list.length, itemIndexFromRow(buffer.top), itemIndexFromRow(buffer.bottom), items);
        for (var i = 0; i < items.length; i++) {
          items[i].$$position = i;
        }

        drawBuffer();

        // We've made changes to the models so we must update the deltas
        setupNextTick();
      }

      function drawBuffer () {

        if (list.length <= 0 || items.length <= 0) {
          return false;
        }

        var p, x, y, el, e, r = buffer.top - 1;

        for (var i = 0; i < buffer.size; i++) {

          e = itemIndexFromRow(buffer.top) + i;
          p = getRelativeBufferPosition(e);

          (p % columns === 0) ? r++ : null ;

          x = (p % columns) * (container.width / columns);
          y = r * row.height;
          el = angular.element(elements[p]);

          if (e >= list.length) {
            hideElement(p);
          } else {
            showElement(p);
          }
console.log('Merging', e, list[e], 'with', p, items[p], y);
          angular.extend(items[p], list[e]);

          items[p].$$index = e;
          items[p].$$height = row.height;
          items[p].$$top = y;
          items[p].$$visible = false;
          //items[pos].$$position = pos;

          renderElement(p, x, y);

          if (i < view.rows) {
            items[i].$$visible = true;
          }
        }
        calculateWrapper();
      }

      /**
       * Update the scroll model with a scroll offset.
       */
      function setScrollPosition (x, y) {

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
        if (buffer.reset || buffer.refresh) {
          switch (scroll.direction) {
            case SCROLL_UP:
              setBufferToIndex(view.bottom - buffer.size);
              break;
            case SCROLL_DOWN:
              setBufferToIndex(view.top);
              break;
          }
        }

        // Update the buffer model
        updateBufferModel();

        // Render the current buffer
        render();

        // Do we need to call one of the edge trigger because we're in the zone?
        if (isTriggerRequired()) {
          triggerEdge();
        }

        // Prep for the next pass
        setupNextTick();
      }

      /**
       * Returns which element position should be used for a given index
       * from the main array
       * @param index
       */
      function getRelativeBufferPosition (index) {
        return index % buffer.size;
      }

      /**
       * Calculate the starting index of an item in a row
       * @param row
       * @returns {number}
       */
      function itemIndexFromRow (row) {
        return row * columns;
      }


      /**
       * Update model variables for delta tracking
       */
      function setupNextTick () {
        angular.extend(_scroll, scroll);
        angular.extend(_view, view);
        angular.extend(_buffer, buffer);
      }

      /**
       * Setup the buffered elements ready for manipulating
       */
      function positionElements () {

        if (elements.length > 0) {
          return;
        }

        $timeout(function () {
          elements = container.el.children().children();

          var p, x, y, el, r = buffer.top - 1;

          for (var i = itemIndexFromRow(buffer.top); i < (itemIndexFromRow(buffer.top) + buffer.size); i++) {

            p = getRelativeBufferPosition(i);

            (p % columns === 0) ? r++ : null ;

            x = (p % columns) * (container.width / columns);
            y = r * row.height;
            el = angular.element(elements[p]);
            console.log('Positioning elements', buffer.top, p, x, y);
            el.css({
                position: 'absolute',
                height: row.height + 'px',
                webkitTransform: 'translate3d(' + x + 'px, ' + y + 'px, 0px)'
            });

          }
        });
      }

      function validateBuffer () {
        // If we're breaking the boundaries
        // we need to adjust the buffer accordingly
        if (buffer.top < 0) {
          buffer.top = 0;
          buffer.bottom = buffer.rows;
        } else if (buffer.bottom >= list.length) {
          buffer.top = (wrapper.rows - buffer.rows);
          buffer.bottom = wrapper.rows;
        }

        // Update the extra properties of the buffer
        buffer.yTop = buffer.top * row.height;
        buffer.yBottom = buffer.bottom * row.height;
        buffer.atEdge = (buffer.top <= 0) ? EDGE_TOP : (buffer.bottom >= wrapper.rows) ? EDGE_BOTTOM : false;
      }

      /**
       * Calculates if a render is required.
       */
      function isRenderRequired () {
        //console.log('Render required?', (scroll.direction === SCROLL_DOWN && buffer.atEdge !== EDGE_BOTTOM && view.deadZone === false) && (scroll.directionChange || view.ytChange), !(view.deadZone !== false && view.deadZoneChange === false), view.deadZone, view.deadZoneChange);
        return(
          ((scroll.direction === SCROLL_UP && buffer.atEdge !== EDGE_TOP && view.deadZone === false) && (scroll.directionChange || view.ytChange)) ||
            ((scroll.direction === SCROLL_DOWN && buffer.atEdge !== EDGE_BOTTOM && view.deadZone === false) && (scroll.directionChange || view.ytChange)) || !(view.deadZone !== false && view.deadZoneChange === false)
          );
      }

      function isTriggerRequired () {
        return (view.triggerZone !== false && view.triggerZoneChange);
      }

      /**
       * Update the scroll model base on the current scroll position
       * @param y
       */
      function updateScrollModel (y) {
        // Update the coordinates
        scroll.y = y;
        scroll.yDelta = y - _scroll.y;

        // Update indexes
        scroll.row = Math.floor(y / row.height);

        if (scroll.row < 0) {
          scroll.row = 0;
        }

        if (scroll.row >= wrapper.rows) {
          scroll.row = wrapper.rows - 1;
        }

        scroll.yDistance = Math.abs(scroll.row - _scroll.row);
        scroll.yChange = (scroll.yDistance > 0);

        // scroll.bottomIndex = Math.abs(Math.floor((container.height + y) / row.height));

        // Update direction
        scroll.direction = (scroll.yDelta >= 0) ? SCROLL_DOWN : SCROLL_UP;
        scroll.directionChange = (scroll.direction !== _scroll.direction);

        // Check if we should reset the buffer this tick
        buffer.reset = scroll.yDistance > buffer.rows;
      }

      /**
       * Update the view model based on the current scroll model
       * TODO: Experiment with watchers to handle the delta changes
       */
      function updateViewModel () {

        //view.bottom = scroll.row + view.rows - 1;
        view.yTop = scroll.y;
        view.yBottom = scroll.y + container.height;
        view.top = scroll.row;
        view.bottom = Math.floor(view.yBottom / row.height);
        view.atEdge = !(view.top > 0 && view.bottom < list.length - 1);

        // Calculate if we're in a trigger zone and if there's been a change.
        view.triggerZone = (view.yTop < trigger.distance * row.height) ? EDGE_TOP : view.yBottom > ((list.length - trigger.distance - 1) * row.height) ? EDGE_BOTTOM : false;
        view.triggerZoneChange = (view.triggerZone !== _view.triggerZone);

        // Calculate if we're in a dead zone and if there's been a change.
        view.deadZone = (view.yTop < row.height) ? EDGE_TOP : view.yBottom > ((list.length - 1) * row.height) ? EDGE_BOTTOM : false;
        view.deadZoneChange = (view.deadZone !== _view.deadZone);

        // Calculate if there have been index changes on either side of the view
        view.ytChange = (view.top !== _view.top);
        view.ybChange = (view.bottom !== _view.bottom);
        //console.log('View model', view.top, view.bottom, view.rows, buffer.size);
      };

      /**
       * Set the buffer to an index.
       *
       * @param edge
       */
      function setBufferToIndex (index) {
        buffer.top = index;
        buffer.bottom = buffer.top + buffer.rows;
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

        var index = scroll.row,
          direction = scroll.direction,
          distance = buffer.distance;
console.log(direction, distance, index, buffer.size);
        // Based on the scroll direction, update the buffer model
        switch (direction) {
          case SCROLL_UP:
            buffer.top = index - distance;
            buffer.bottom = (index - distance) + buffer.rows;
            break;
          case SCROLL_DOWN:
            buffer.top = index;
            buffer.bottom = index + buffer.rows;
            break;
          default:
            $log.warn('We only know how to deal with scrolling on the y axis for now');
            break;
        }
        validateBuffer();
      }


      /**
       * Perform the scrolling up action by updating the required elements
       * @param start
       * @param end
       */
      function scrollingUp (start, distance) {

        var itemsToMerge = list.slice((start * columns), (start * columns) + distance),
          end = (start + distance) - 1;

        var p, x, y, r = start + (distance / columns) - 1;

        for (var i = itemsToMerge.length - 1; i >= 0; i--) {


          p = getRelativeBufferPosition((start * columns) + i);


          x = (p % columns) * (container.width / columns);
          y = r * row.height;

          /*var position = getRelativeBufferPosition(end),
            y = px + (row.height * (i - position % columns)),
            x = (position % columns) * (container.width / columns);*/
//console.log('Scrolling up', end, distance, p, i, r, x, y, buffer.distance, view.rows);

          itemsToMerge[i].$$top = y;
          itemsToMerge[i].$$index = start * columns + i;

          angular.extend(items[p], itemsToMerge[i]);
          renderElement(p, x, y);

          (p % columns === 0) ? r-- : null ;

        }
      }

      /**
       * Perform the scrolling down action by updating the required elements
       * @param start
       * @param end
       */
      function scrollingDown (start, distance) {

        var itemsToMerge = list.slice((start * columns), (start * columns) + distance);
        var p, x, y, r = start - 1;

        for (var i = 0; i < itemsToMerge.length; i++) {

          p = getRelativeBufferPosition((start * columns) + i);

          (p % columns === 0) ? r++ : null ;

          x = (p % columns) * (container.width / columns);
          y = r * row.height;

//console.log('Scrolling down', start, distance, p, i, x, y, r);

          itemsToMerge[i].$$top = y;
          itemsToMerge[i].$$index = start * columns + i;
          //console.log('Merging', itemsToMerge[i], 'with', items[p]);

          angular.extend(items[p], itemsToMerge[i]);
          renderElement(p, x, y);
        }
      }

      /**
       * Update the DOM and based on the current state of the models
       */
      function render () {

        var start, end, distance;


        // Update the DOM based on the models
        if (!isRenderRequired()) {
          return;
        }

        if (buffer.reset || buffer.refresh) {
          // Reset the buffer to this ticks window
          start = buffer.top;
          end = buffer.bottom;
          distance = (end - start) * columns;

          // If we've changed the scroll direction.
          // Update the buffer to reflect the direction.
          switch (scroll.direction) {
            case SCROLL_UP:
              scrollingUp(start, distance);
              break;
            case SCROLL_DOWN:
              scrollingDown(start, distance);
              break;
          }
        } else {
          // If we've changed the scroll direction.
          // Update the buffer to reflect the direction.
          switch (scroll.direction) {
            case SCROLL_UP:
              start = buffer.top;
              end = _buffer.top;
              distance = Math.abs((end - start) * columns);
              //console.log('Distance up', distance, start, end, columns, buffer.top, buffer.bottom);
              scrollingUp(start, distance);
              break;
            case SCROLL_DOWN:
              start = _buffer.bottom;
              end = buffer.bottom;
              distance = Math.abs((end - start) * columns);
              //console.log('Distance down', distance, start, end, columns, buffer.top, buffer.bottom);
              scrollingDown(start, distance);
              break;
          }
        }
      }

      /**
       * Set a given buffered element to the given y coordinate
       * @param index
       * @param y
       */
      function renderElement (index, x, y) {

        var element = angular.element(elements[index]);
console.log('Rendering element', index, x, y);
        element.css('-webkit-transform', 'translate3d(' + x + 'px, ' + y + 'px, 0px)');
      }

      /**
       * Hide an element
       * @param index
       */
      function hideElement (index) {
        var element = angular.element(elements[index]);
        element.css('visibility', 'hidden');
      }

      /**
       * Show an element
       * @param index
       */
      function showElement (index) {
        var element = angular.element(elements[index]);
        elements.css('visibility', 'normal');
      }
      /**
       * Trigger a function supplied to the directive
       */
      function triggerEdge () {
        switch (view.triggerZone) {
          case EDGE_TOP:
            triggerTop();
            break;
          case EDGE_BOTTOM:
            triggerBottom();
            break;
          default:
            $log.warn('Zone ' + view.triggerZone + ' is not supported');
        }
      }

      /**
       * Empty placeholder trigger functions
       */
      function triggerTop () {
      }

      function triggerBottom () {
      }

      /**
       * Helper function to calculate all the dimensions required to base
       * the buffer calculations from
       */
      function calculateDimensions () {
        calculateWrapper();
        calculateBuffer();
      }

      /**
       * Calculate the size of the container used by the scroller
       */
      function calculateContainer () {
        // Get the containing dimensions to base our calculations from.
        container.height = container.el.prop('clientHeight');
        container.width = container.el.prop('clientWidth');
      }

      /**
       * Calculate the wrapper size based on the current items list
       */
      function calculateWrapper () {
        // Recalculate the virtual wrapper height
        if (list) {
          wrapper.rows = ((list.length + (list.length % columns)) / columns);
          wrapper.height = wrapper.rows * row.height;

console.log('Updating wrapper', wrapper.height, (list.length % columns));
          wrapper.el.css('height', wrapper.height + 'px');
        }
      }

      /**
       * Calculate the buffer size and positions
       */
      function calculateBuffer () {
        // Calculate the number of items that can be visible at a given time
        view.rows = Math.ceil(container.height / row.height) + 1;
        buffer.bottom = buffer.top + buffer.rows || buffer.top + BUFFER_SIZE;
        buffer.yBottom = buffer.bottom * row.height || (buffer.top + BUFFER_SIZE) * ROW_HEIGHT;
        buffer.distance = (buffer.rows - view.rows) > 0 ? buffer.rows - view.rows : 0;
console.log('Calculating buffer', buffer.rows, buffer.size, view.rows, buffer.distance);
      }

    }]);
})(window, window.angular);
