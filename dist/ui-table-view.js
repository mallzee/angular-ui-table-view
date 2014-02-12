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

      var BUFFER_SIZE = 20,
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
          el: undefined
        },

        elements,

      // Model a row
        row = {
          height: ROW_HEIGHT,
          width: ROW_WIDTH
        },

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
        },
        _scroll,
      // TODO _scroll = angular.copy(scroll);


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
          yTop: 0,
          yBottom: 0,
          atEdge: EDGE_TOP,
          deadZone: EDGE_TOP,
          deadZoneChange: false
        },
        _view,

      // Information about the buffer status
        buffer = {
          size: BUFFER_SIZE, // The buffer size, i.e. how many DOM elements we'll track
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
        },
        _buffer;


      return {
        restrict: 'E',
        transclude: true,
        replace: false,
        template: '<div class="mlz-ui-table-view-wrapper" ng-transclude></div>',
        /*controller: ['$scope', function($scope) {

         }],*/
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

            // Remove the item from the list
            list.splice(index, 1);

            // If we're at the bottom edge of the buffer.
            // We need to reduce the buffer indexes by the amount deleted
            if (buffer.atEdge === EDGE_BOTTOM) {
              buffer.top--;
              buffer.bottom--;
            }

            //drawBuffer();
            //positionElements();
            // Update the wrapper size
            //calculateWrapper();
          };

          wrapper.el.css('position', 'relative');

          // Setup the table view
          initialise(scope, attributes);

          // The master list of items has changed. Recalculate the virtual list
          scope.$watchCollection('list', function (items) {
            drawBuffer();
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
       *
       */
      function initialise (scope, attributes) {
        _scroll = angular.copy(scroll);
        _view = angular.copy(view);
        _buffer = angular.copy(buffer);

        if (attributes.rowHeight) {
          row.height = +attributes.rowHeight;
        }

        if (attributes.bufferSize) {
          buffer.size = +attributes.bufferSize;
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

        angular.copy(list.slice(buffer.top, buffer.bottom + 1), items);

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

        var position = getRelativeBufferPosition(buffer.top);

        for (var i = buffer.top; i <= buffer.bottom; i++) {
          var pos = getRelativeBufferPosition(i);

          angular.extend(items[pos], list[i]);

          items[pos].$$index = i;
          items[pos].$$height = row.height;
          items[pos].$$top = row.height * i;
          items[pos].$$visible = false;
          //items[pos].$$position = pos;

          renderElement(pos, row.height * i);

          if (i < view.size) {
            items[i].$$visible = true;
          }

          position++;
          if (position >= items.length) {
            position = 0;
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
        if (buffer.reset) {
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

        // Update the DOM based on the models
        if (isRenderRequired()) {
          render();
        }

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
        $timeout(function () {
          elements = container.el.children().children();
          for (var i = buffer.top; i < buffer.size; i++) {

            var el = angular.element(elements[getRelativeBufferPosition(i)]);
            el.css({
              position: 'absolute',
              width: '100%',
              height: row.height + 'px',
              webkitTransform: 'translateY(' + i * row.height + 'px)'
            });
          }
        });
      }

      function validateBuffer () {
        // If we're breaking the boundaries
        // we need to adjust the buffer accordingly
        if (buffer.top < 0) {
          buffer.top = 0;
          buffer.bottom = buffer.size - 1;
        } else if (buffer.bottom >= list.length) {
          buffer.top = list.length - buffer.size;
          buffer.bottom = list.length - 1;
        }

        // Update the extra properties of the buffer
        buffer.yTop = buffer.top * row.height;
        buffer.yBottom = (buffer.bottom + 1) * row.height;
        buffer.atEdge = (buffer.top <= 0) ? EDGE_TOP : (buffer.bottom >= list.length - 1) ? EDGE_BOTTOM : false;
      }

      /**
       * Calculates if a render is required.
       */
      function isRenderRequired () {
        return(
          ((scroll.direction === SCROLL_UP && buffer.atEdge !== EDGE_TOP && view.deadZone === false) && (scroll.directionChange || view.ytChange)) ||
            ((scroll.direction === SCROLL_DOWN && buffer.atEdge !== EDGE_BOTTOM && view.deadZone === false) && (scroll.directionChange || view.ybChange)) || !(view.deadZone !== false && view.deadZoneChange === false)
          );
      }

      /**
       * Calculates if a trigger is required
       * @returns {boolean|*}
       */
      function isTriggerRequired () {
        return (
          (view.triggerZone !== false && view.triggerZoneChange)
          );
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
        scroll.yIndex = Math.floor(y / row.height);

        if (scroll.yIndex < 0) {
          scroll.yIndex = 0;
        }

        if (scroll.yIndex >= list.length) {
          scroll.yIndex = list.length - 1;
        }

        scroll.yDistance = Math.abs(scroll.yIndex - _scroll.yIndex);
        scroll.yChange = (scroll.yDistance > 0);

        // scroll.bottomIndex = Math.abs(Math.floor((container.height + y) / row.height));

        // Update direction
        scroll.direction = (scroll.yDelta >= 0) ? SCROLL_DOWN : SCROLL_UP;
        scroll.directionChange = (scroll.direction !== _scroll.direction);

        // Check if we should reset the buffer this tick
        buffer.reset = scroll.yDistance > buffer.size;
      }

      /**
       * Update the view model based on the current scroll model
       * TODO: Experiment with watchers to handle the delta changes
       */
      function updateViewModel () {

        //view.bottom = scroll.yIndex + view.size - 1;
        view.yTop = scroll.y;
        view.yBottom = scroll.y + container.height;
        view.top = scroll.yIndex;
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

      };

      /**
       * Set the buffer to an index.
       *
       * @param edge
       */
      function setBufferToIndex (index) {
        buffer.top = index;
        buffer.bottom = buffer.top + buffer.size;
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

        var index = scroll.yIndex,
          direction = scroll.direction,
          distance = buffer.distance;

        // Based on the scroll direction, update the buffer model
        switch (direction) {
          case SCROLL_UP:
            buffer.top = index - distance;
            buffer.bottom = (index - distance) + (buffer.size - 1);
            break;
          case SCROLL_DOWN:
            buffer.top = index;
            buffer.bottom = index + buffer.size - 1;
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
      function scrollingUp (start, end) {

        var itemsToMerge = list.slice(start, end + 1),
          px = start * row.height;

        for (var i = itemsToMerge.length - 1; i >= 0; i--) {
          var position = getRelativeBufferPosition(end),
            top = px + (row.height * i);

          itemsToMerge[i].$$top = top;
          itemsToMerge[i].$$index = end--;

          angular.extend(items[position], itemsToMerge[i]);
          renderElement(position, top);
        }
      }

      /**
       * Perform the scrolling down action by updating the required elements
       * @param start
       * @param end
       */
      function scrollingDown (start, end) {

        var itemsToMerge = list.slice(start, end + 1),
          px = start * row.height;

        for (var i = 0; i < itemsToMerge.length; i++) {
          var position = getRelativeBufferPosition(start + i),
            top = px + (row.height * i);

          itemsToMerge[i].$$top = top;
          itemsToMerge[i].$$index = start + i;

          angular.extend(items[position], itemsToMerge[i]);
          renderElement(position, top);
        }
      }

      /**
       * Update the DOM and based on the current state of the models
       */
      function render () {

        var start, end;

        if (buffer.reset) {
          // Reset the buffer to this ticks window
          start = buffer.top;
          end = buffer.bottom;

          // If we've changed the scroll direction.
          // Update the buffer to reflect the direction.
          switch (scroll.direction) {
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
          switch (scroll.direction) {
            case SCROLL_UP:
              start = buffer.top;
              end = _buffer.top - 1;
              scrollingUp(start, end);
              break;
            case SCROLL_DOWN:
              start = _buffer.bottom + 1;
              end = buffer.bottom;
              scrollingDown(start, end);
              break;
          }
        }
      }

      /**
       * Set a given buffered element to the given y coordinate
       * @param index
       * @param y
       */
      function renderElement (index, y) {
        var element = angular.element(elements[index]);
        element.css('-webkit-transform', 'translateY(' + y + 'px)');
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
        calculateContainer();
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
        wrapper.height = list.length * row.height;
        wrapper.el.css('height', wrapper.height + 'px');
      }

      /**
       * Calculate the buffer size and positions
       */
      function calculateBuffer () {
        // Calculate the number of items that can be visible at a given time
        view.size = Math.ceil(container.height / row.height) + 1;
        buffer.bottom = buffer.size - 1 || BUFFER_SIZE - 1;
        buffer.yBottom = buffer.size * row.height || BUFFER_SIZE * ROW_HEIGHT;
        buffer.distance = buffer.size - view.size;
      }

    }]);
})(window, window.angular);
