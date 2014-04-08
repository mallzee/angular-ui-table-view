/**
 * UITableView
 */

(function (window, angular, undefined) {
  'use strict';

  var move = function (arr, old_index, new_index) {
    if (new_index >= arr.length) {
      var k = new_index - arr.length;
      while ((k--) + 1) {
        arr.push(undefined);
      }
    }
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
    return arr; // for testing purposes
  };


  /**
   * Return the DOM siblings between the first and last node in the given array.
   * @param {Array} array like object
   * @returns {DOMElement} object containing the elements
   */
  function getBlockElements(nodes) {
    var startNode = nodes[0],
      endNode = nodes[nodes.length - 1];
    if (startNode === endNode) {
      return angular.element(startNode);
    }

    var element = startNode;
    var elements = [element];

    do {
      element = element.nextSibling;
      if (!element) break;
      elements.push(element);
    } while (element !== endNode);

    return angular.element(elements);
  }

  function getItemElement(nodes) {
    var startNode = nodes[0],
      endNode = nodes[nodes.length - 1];

    if (startNode === endNode) {
      return angular.element(startNode);
    }

    var element = startNode;

    do {
      if (element.classList && element.classList.contains('mlz-ui-table-view-item')) {
        return angular.element(element);
      }
      element = element.nextSibling;
    } while (element !== endNode);

    return false;
  }

  window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame    ||
      function( callback ){
        window.setTimeout(callback, 1000 / 60);
      };
  })();

  /**
   * TODO: Add in some docs on how to use this angular module and publish them on GitHub pages.
   */
  angular.module('mallzee.ui-table-view', ['ngAnimate'])
    .directive('mlzUiTableView', ['$window', '$timeout', '$log', '$animate', function ($window, $timeout, $log, $animate) {
      return {
        restrict: 'E',
        transclude: true,
        terminal: true,
        priority: 10000,
        $$tlb: true,
        replace: false,
        template: '<div class="mlz-ui-table-view-wrapper" ng-transclude></div>',
        link: function (scope, element, attributes, ctrl, $transclude) {

          var BUFFER_ROWS = 20,
            COLUMNS = 1,
            ROW_HEIGHT = 40,
            ROW_WIDTH = '100%',
            EDGE_TOP = 'top',
            EDGE_BOTTOM = 'bottom',
            SCROLL_UP = 'up',
            SCROLL_DOWN = 'down',
            TRIGGER_DISTANCE = 1;

          var id = 1, list = [], items = [], itemName = 'item',

            model = {

            },
          // Model the main container for the view table
            container = {
              height: 0,
              width: 0,
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
              $$coords: {
                x: 0,
                y: 0
              },
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
              //elements: [], // Reference to that actual DOM elements that make up the buffer //TODO: Remove this from the scope some how
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
            _buffer, // Previous tick data
            elements = [];


          // Save references to the elements we need access to
          container.el = element;
          wrapper.el = element.children();

          // Setup the table view
          initialise(scope, attributes);

          // The master list of items has changed. Recalculate the virtual list
          scope.$watchCollection(attributes.list, function (newList) {
            list = newList || [];
            refresh();
          });

          /**
           * Lets get our scroll oawn!
           *
           * We're making use of rAF so we get silky smooth
           * motion out of our scrolls.
           */
          // When we scroll. Lets work some magic.
          var y, updating = false;
          element.on('scroll', function () {
            y = element.prop('scrollTop');
            update();
          });

          function update() {
            setScrollPosition(y);
            updating = false;
          }


          /* * * * * * * * * * * * * * * */
          /* Helper functions            */
          /* * * * * * * * * * * * * * * */

          /**
           * Initialised the directive. Setups watchers and calcaultes what we can without data
           * Copy the current models so we can create a delta from them
           */
          function initialise (scope, attributes) {

            element.css({
              display: 'block',
              overflow: 'auto'
            });

            wrapper.el.css({
              position: 'relative'
            });

            _scroll = angular.copy(scroll);
            _view = angular.copy(view);
            _buffer = angular.copy(buffer);

            /**
             * Handle attributes
             */
            if (attributes.itemName) {
              itemName = attributes.itemName;
            }

            if (attributes.viewParams) {
              scope.$watch(attributes.viewParams, function (view) {
                id = view.listId || 1;
                row.height = view.rowHeight || ROW_HEIGHT;
                columns = view.columns || COLUMNS;
                buffer.rows = view.rows || BUFFER_ROWS;
                buffer.size = buffer.rows * columns;
                refresh();
              }, true);
            }

            /**
             * Expose resetPosition function to the controller scope
             * TODO: should accept an id parameter to be able to reset the position for different lists
             */
            scope.resetPosition = function () {
              resetPosition();
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

            /**
             * Add event listeners
             */
              // The status bar has been tapped. To the top with ye!
            $window.addEventListener('statusTap', function () {
              scrollToTop();
            });

            calculateContainer();
          }

          function refresh () {
            updateBufferModel();
            generateBufferedItems();
            calculateDimensions();

            updateViewModel();
            triggerEdge();
            restorePosition();
          }

          /**
           * Function used when transcluding the code into the wrapper
           * Creates the comment marker and animates the entry to the DOM
           * @param clone
           */
          function cloneElement(clone) {
            clone.addClass('mlz-ui-table-view-item');
            clone[clone.length++] = document.createComment(' end mlzTableViewItem: ' + attributes.list + ' ');
            $animate.enter(clone, wrapper.el);
          }


          function updateItem(elIndex, item, coords, index) {
            elements[elIndex].scope[itemName] = item;
            elements[elIndex].scope.$coords = coords;
            elements[elIndex].scope.$index = index;
          }

          /**
           * Remove an element from the view at the specified index
           * @param index
           */
          function destroyItem(index) {
            var elementsToRemove = getBlockElements(elements[index].clone);
            $animate.leave(elementsToRemove);
            elements[index].scope.$destroy();
            elements.splice(index, 1);
          }

          /**
           * Create the buffered items required to display the data.
           * Add/Removes items if the large data set changes in size
           *
           */
          function generateBufferedItems() {

            // TODO: Handle the case where the list could be smaller than the buffer.
            angular.copy(list.slice(itemIndexFromRow(buffer.top), itemIndexFromRow(buffer.bottom)), items);

            // We have more elements than specified by our buffer parameters.
            // Lets get rid of any un needed elements
            if (elements.length > buffer.size) {
              // Keep a copy of the original elements length as we'll be adjusting this as we delete
              var elementsLength = elements.length;
              for(var i = elementsLength - 1; i >= buffer.size; i--) {
                destroyItem(i);
              }
            }

            // OK Now we can look at updating the current buffer.
            // including adding any missing elements that may be required
            var p, x, y, e, r = buffer.top - 1, found;

            for (var i = 0; i < buffer.size; i++) {

              if (items.length < buffer.size) {}
              // If we're changing the item list. Remove any buffered items that are not required
              // because the list is smaller than the buffer.
              if (items && i >= items.length) {
                // TODO: Refactor this as it's a bit pish
                if (elements[i]) {
                  destroyItem(i);
                }
              } else {

                found = false;
                e = itemIndexFromRow(buffer.top) + i;
                p = getRelativeBufferPosition(e);

                (p % columns === 0) ? r++ : null;

                // Workout the x and y coords of this element
                x = (p % columns) * (container.width / columns);
                y = r * row.height;

                // If we have an element cached and it contains the same info, leave it as it is.
                if (elements[p] && angular.equals(list[e], elements[p].scope[itemName])) {
                  elements[p].scope.$coords = { x:x, y:y }
                  //$animate.move(elements[p].clone, wrapper.el);
                  repositionElement(elements[p]);

                  continue;
                }

                if (elements[p]) {
                  // Scan the buffer for this item. If it exists we should move that item into this
                  // position and send this block to the bottom to be reused.
                  for(var k = i; k < buffer.size; k++) {
                    if (found) {
                      // Update positions of everything else in the buffer
                      elements[k].scope.$coords = { x:x, y:y }
                    }
                    if (elements[k] && angular.equals(list[e], elements[k].scope[itemName])) {
                      elements[k].scope.$index = e;
                      //elements[p].scope.$coords = elements[k].scope.$coords;
                      elements[k].scope.$coords = { x:x, y:y };
                      // Cut out the elements in between the invalid item and this found one
                      // and move them to the end.
                      //elements.join(elements.slice(p, k - p));
                      // Move the found element into the correct place in the buffer elements array
                      move(buffer.elements, k, p);
                      //$animate.move(buffer.elements[p].clone, wrapper.el);
                      //repositionElement(buffer.elements[p]);
                      //repositionElement(buffer.elements[k]);

                      found = true;
                      //break;
                    }

                  }

                  if (!found) {
                    elements[p].scope[itemName] = list[e];
                    elements[p].scope.$index = e;
                    elements[p].scope.$height = row.height;
                    elements[p].scope.$coords = { x:x, y:y };
                    //$animate.move(elements[p].clone, wrapper.el);
                    //repositionElement(elements[p]);
                  }
                  repositionElement(elements[p]);

                } else {

                  var newItem = {};

                  newItem.scope = scope.$new();
                  newItem.scope[itemName] = list[e];
                  newItem.scope.$index = e;
                  newItem.scope.$height = row.height;
                  newItem.scope.$coords = { x:x, y:y };
                  newItem.scope.$visible = false;
                  newItem.clone = $transclude(newItem.scope, cloneElement);
                  elements[i] = newItem;
                  setupElement(elements[i]);
                }
              }
            }

            calculateWrapper();
            setupNextTick();
          }

          /**
           * Move the scroller back to the top.
           */
          function scrollToTop () {
            // TODO: Stop momentum scroll before adjusting scrollTop
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

            //$window.performance.mark('before_render');
            // Render the current buffer
            render();

            // Edge trigger because we might be in the zone?
            triggerEdge();

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
           * Validate our buffer numbers, and fix them if we've gone out of bounds
           */
          function validateBuffer () {
            // If we're breaking the boundaries
            // we need to adjust the buffer accordingly
            if (buffer.top < 0) {
              buffer.top = 0;
              buffer.bottom = buffer.rows;
            } else if (buffer.bottom >= list.length / columns) {
              buffer.bottom = list.length / columns;
              buffer.top = (buffer.bottom - buffer.size > 0) ? buffer.bottom - buffer.size : 0 ;
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
            return(
              ((scroll.direction === SCROLL_UP && buffer.atEdge !== EDGE_TOP && view.deadZone === false) && (scroll.directionChange || view.ytChange)) ||
                ((scroll.direction === SCROLL_DOWN && buffer.atEdge !== EDGE_BOTTOM && view.deadZone === false) && (scroll.directionChange || view.ytChange)) || !(view.deadZone !== false && view.deadZoneChange === false)
              );
          }

          /**
           * Calculates if we've hit a trigger zone
           * @returns {boolean|*}
           */
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
            view.triggerZone = view.yBottom > (((list.length / columns) - trigger.distance - 1) * row.height) ? EDGE_BOTTOM : (view.yTop < trigger.distance * row.height) ? EDGE_TOP : false;
            view.triggerZoneChange = (view.triggerZone !== _view.triggerZone) || (list.length / columns) < (trigger.distance * 2) ;

            // Calculate if we're in a dead zone and if there's been a change.
            view.deadZone = (view.yTop < row.height) ? EDGE_TOP : view.yBottom > ((list.length - 1) * row.height) ? EDGE_BOTTOM : false;
            view.deadZoneChange = (view.deadZone !== _view.deadZone);

            // Calculate if there have been index changes on either side of the view
            view.ytChange = (view.top !== _view.top);
            view.ybChange = (view.bottom !== _view.bottom);
          }

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

            var itemsToMerge = list.slice((start * columns), (start * columns) + distance);

            var p, x, y, r = start + (distance / columns) - 1, updates = [];

            for (var i = itemsToMerge.length - 1; i >= 0; i--) {
              p = getRelativeBufferPosition((start * columns) + i);
              x = (p % columns) * (container.width / columns);
              y = r * row.height;

              var coords = {
                x: x,
                y: y
              };
              var index = start * columns + i;
              updates.push(p);
              updateItem(p, itemsToMerge[i], coords, index);

              (p % columns === 0) ? r-- : null;

            }

            requestAnimFrame(function () {
              scope.$apply(function () {
                for (var i = 0; i < updates.length; i++) {
                  repositionElement(elements[updates[i]]);
                }
              });
            });
          }

          /**
           * Perform the scrolling down action by updating the required elements
           * @param start
           * @param end
           */
          function scrollingDown (start, distance) {

            var itemsToMerge = list.slice((start * columns), (start * columns) + distance);
            var p, x, y, r = start - 1, updates = [];

            for (var i = 0; i < itemsToMerge.length; i++) {

              p = getRelativeBufferPosition((start * columns) + i);

              (p % columns === 0) ? r++ : null;

              x = (p % columns) * (container.width / columns);
              y = r * row.height;

              var coords = {
                x: x,
                y: y
              };
              var index = start * columns + i;
              updates.push(p);
              updateItem(p, itemsToMerge[i], coords, index);
            }

            requestAnimFrame(function () {
              scope.$apply(function () {
                for (var i = 0; i < updates.length; i++) {
                  repositionElement(elements[updates[i]]);
                }
              });
            });
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
                  scrollingUp(start, distance);
                  break;
                case SCROLL_DOWN:
                  start = _buffer.bottom;
                  end = buffer.bottom;
                  distance = Math.abs((end - start) * columns);
                  scrollingDown(start, distance);
                  break;
              }
            }
            savePosition();
          }


          function setupElement (element) {
            var el = getItemElement(element.clone);
            el.css({
              'webkitTransform': 'translate3d(' + element.scope.$coords.x + 'px, ' + element.scope.$coords.y + 'px, 0px)',
              position: 'absolute',
              height: element.scope.$height + 'px'
            });
          }

          /**
           * Set a given buffered element to the given y coordinate
           * @param index
           * @param y
           */
          function repositionElement (element) {
            var el = getItemElement(element.clone);
            el.css('-webkit-transform', 'translate3d(' + element.scope.$coords.x + 'px, ' + element.scope.$coords.y + 'px, 0px)')
          }

          /**
           * Trigger a function supplied to the directive
           */
          function triggerEdge () {
            if (!isTriggerRequired()) {
              return false;
            }

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
              wrapper.el.css('height', wrapper.height + 'px');
            }
          }

          /**
           * Calculate the buffer size and positions
           */
          function calculateBuffer () {
            // Calculate the number of items that can be visible at a given time
            view.rows = Math.ceil(container.height / row.height) + 1;
            buffer.bottom = buffer.top + buffer.rows || buffer.top + BUFFER_ROWS * COLUMNS;
            buffer.yBottom = buffer.bottom * row.height || (buffer.top + BUFFER_ROWS * COLUMNS) * ROW_HEIGHT;
            buffer.distance = (buffer.rows - view.rows) > 0 ? buffer.rows - view.rows : 0;
          }

          function clearElements() {
            for (var i = 0; i < elements; i++) {
              destroyItem(i);
            }
          }

          function restorePosition() {
            if ($window.localStorage.getItem('mlzUITableView.' + id)) {
              var cache = JSON.parse($window.localStorage.getItem('mlzUITableView.' + id));
              scroll = cache.scroll;
              view = cache.view;
              buffer = cache.buffer;
            }

            console.log('Restoring', scroll.y);
            setupNextTick();
            //setScrollPosition(scroll.y);
            container.el.prop('scrollTop', scroll.y);
          }

          function savePosition () {
            $window.localStorage.setItem('mlzUITableView.' + id, JSON.stringify({
              scroll: scroll,
              view: view,
              buffer: buffer
            }));
          }

          function resetPosition () {
            if ($window.localStorage.getItem('mlzUITableView.' + id)) {
              $window.localStorage.removeItem('mlzUITableView.' + id);
            }
          }

          function cleanup () {
            $window.removeEventListener('statusTap');
            container.el.off('scroll');
            clearElements();
            wrapper.el.remove();
            container.el.remove();
            delete container.el;
            delete wrapper.el;
            //delete elements;
          }

          scope.$on('$destroy', function () {
            cleanup();
          });
        }
      };

    }]);
})(window, window.angular);
