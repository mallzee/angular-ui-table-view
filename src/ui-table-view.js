/**
 * UITableView
 */

(function (window, angular, undefined) {
  'use strict';

  Array.prototype.move = function (old_index, new_index) {
    if (new_index >= this.length) {
      var k = new_index - this.length;
      while ((k--) + 1) {
        this.push(undefined);
      }
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
    return this; // for testing purposes
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

  /**
   * TODO: Add in some docs on how to use this angular module and publish them on GitHub pages.
   */
  angular.module('mallzee.ui-table-view', ['ngAnimate'])
    .directive('mlzUiTableViewItem', function ($timeout) {
      return {
        restrict: 'A',
        link: function(scope, element) {
          scope.$watch('$coords', function (coords) {
            if (coords) {
              $timeout(function () {
                element.css({
                  position: 'absolute',
                  height: scope.$height + 'px',
                  webkitTransform: 'translate3d(' + coords.x + 'px, ' + coords.y + 'px, 0px)'
                });
              });
            }
          });
        }
      };
    })
    .directive('mlzUiTableView', ['$window', '$timeout', '$log', '$animate', '$$animateReflow', function ($window, $timeout, $log, $animate, $$animateReflow) {
      return {
        restrict: 'E',
        transclude: true,
        terminal: true,
        priority: 10000,
        $$tlb: true,
        replace: false,
        template: '<div class="mlz-ui-table-view-wrapper" ng-transclude></div>',
        link: function (scope, element, attributes, ctrl, $transclude) {

          var BUFFER_ROWS = 10,
            COLUMNS = 1,
            ROW_HEIGHT = 40,
            ROW_WIDTH = '100%',
            EDGE_TOP = 'top',
            EDGE_BOTTOM = 'bottom',
            SCROLL_UP = 'up',
            SCROLL_DOWN = 'down',
            TRIGGER_DISTANCE = 5;

          var list = [], items = [], itemName = 'item',

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


          // Save references to the elements we need access to
          container.el = element;
          wrapper.el = element.children();

          // TODO: Pull in the parts of iscroll we need someday and ditch the dependancy
          var iscroll = new IScroll(element[0], {
            useTransform: true,
            useTransition: false,
            HWCompositing: false,

            probeType: 3,
            mouseWheel: true
            //snap: true
          });

          // Setup the table view
          initialise(scope, attributes);

          /**
           * Delete an item from this table list
           * @param index
           */
          scope.deleteItem = function (index) {
            // Remove the item from the list
            //scope.item = list.splice(index, 1)[0];
            console.log('Deleting ' + index, scope.item, buffer);

            // If we're at the bottom edge of the buffer.
            // We need to reduce the buffer indexes by the amount deleted
            if (buffer.atEdge === EDGE_BOTTOM) {
              //console.log('Delete on bottom edge');
              buffer.top--;
              buffer.bottom--;
            }

            if (attributes.onDelete) {
              scope.$eval(attributes.onDelete + '(item)');
            }
            refresh();
          };

          // The master list of items has changed. Recalculate the virtual list
          scope.$watchCollection(attributes.list, function (newList) {
            list = newList ? newList : [];
            console.log('List changed', list.length);
            /*for(var i = 0; i < buffer.elements.length; i++) {
              var invalid = !angular.equals(buffer.elements[i].scope[itemName], newList[buffer.top + i]);
              if (invalid) {
                console.log('Invalidating element', buffer.elements[i].scope[itemName]);
                $animate.move(buffer.elements[i].clone, wrapper.el);
              }
            }*/
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
          iscroll.on('scroll', function () {
            y = Math.abs(this.y);
            tick();
          });

          function tick() {
            if (!updating) {
              // Recall the loop
              $$animateReflow(function() {
                update();
              });
            }
            updating = true;
          }

          function update() {
            updating = false;
            setScrollPosition(y);
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
              overflow: 'hidden'
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
                console.log('View params change', view);
                row.height = view.rowHeight ? view.rowHeight : ROW_HEIGHT;
                columns = view.columns ? view.columns : COLUMNS;
                buffer.rows = view.rows ? view.rows : BUFFER_ROWS;
                buffer.size = buffer.rows * columns;
                refresh();
              }, true);
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
            // TODO: Implment a way of storing the position in LS so we can restore to there
            //container.el.prop('scrollTop', getYFromIndex(buffer.top));

            generateBufferedItems();

            calculateDimensions();

            iscroll.refresh();
          }

          /**
           * Function used when transcluding the code into the wrapper
           * Creates the comment marker and animates the entry to the DOM
           * @param clone
           */
          function cloneElement(clone) {
            clone[clone.length++] = document.createComment(' end mlzTableViewItem: ' + attributes.list + ' ');
            $animate.enter(clone, wrapper.el);
          }


          function updateItem(elIndex, item, coords, index) {
            buffer.elements[elIndex].scope[itemName] = item;
            buffer.elements[elIndex].scope.$coords = coords;
            buffer.elements[elIndex].scope.$index = index;
            $animate.move(buffer.elements[elIndex].clone, wrapper.el);
          }

          /**
           * Remove an element from the view at the specified index
           * @param index
           */
          function destroyItem(index) {
            var elementsToRemove = getBlockElements(buffer.elements[index].clone);
            $animate.leave(elementsToRemove);
            buffer.elements[index].scope.$destroy();
            buffer.elements.splice(index, 1);
          }

          /**
           * Create the buffered items required to display the data.
           * Add/Removes items if the large data set changes in size
           *
           */
          function generateBufferedItems() {

            // TODO: Handle the case where the list could be smaller than the buffer.
            angular.copy(list.slice(itemIndexFromRow(buffer.top), itemIndexFromRow(buffer.bottom)), items);

            if (list.length <= 0 || items.length <= 0) {
              return false;
            }

            // We have more elements than specified by our buffer parameters.
            // Lets get rid of any un needed elements
            if (buffer.elements.length > buffer.size) {
              console.log('We need to destroy some shit!', buffer.elements.length, buffer.size);
              // Keep a copy of the original elements length as we'll be adjusting this as we delete
              var elementsLength = buffer.elements.length;
              for(var i = elementsLength - 1; i >= buffer.size; i--) {
                console.log('Destroying ', i, elementsLength);
                destroyItem(i);
              }
            }

            // OK Now we can look at updating the current buffer.
            // including adding any missing elements that may be required
            var p, x, y, e, r = buffer.top - 1, found;

            console.log('Buffer deets', buffer.elements.length, buffer.size);
            for (var i = 0; i < buffer.size; i++) {
              // If we're changing the item list. Remove any buffered items that are not required
              // because the list is smaller than the buffer.
              if (items && i > items.length) {
                console.log('Destroying item');
                destroyItem(i);
              } else {

                found = false;
                e = itemIndexFromRow(buffer.top) + i;
                p = getRelativeBufferPosition(e);

                (p % columns === 0) ? r++ : null;

                // If we have an element cached and it contains the same info, leave it as it is.
                console.log(e, p, buffer.elements[p], list[e]);
                if (buffer.elements[p] && angular.equals(list[e], buffer.elements[p].scope[itemName])) {
                  console.log('Keep this item muthafucka');
                  continue;
                }

                // Workout the x and y coords of this element
                x = (p % columns) * (container.width / columns);
                y = r * row.height;

                if (buffer.elements[p]) {
                  // Scan the buffer for this item. If it exists we should move that item into this
                  // position and send this block to the bottom to be reused.
                  for(var k = i; k < buffer.size; k++) {
                    if (buffer.elements[k] && angular.equals(list[e], buffer.elements[k].scope[itemName])) {
                      console.log('Found this item futher down the line muthafucka');
                      //buffer.elements[k].scope[itemName] = list[e];
                      buffer.elements[k].scope.$index = e;
                      //buffer.elements[k].scope.$height = row.height;
                      buffer.elements[k].scope.$coords = { x:x, y:y };
                      // Cut out the elements in between the invalid item and this found one
                      // and move them to the end.
                      buffer.elements.join(buffer.elements.slice(p, k - p));
                      // Move the found element into the correct place in the buffer elements array
                      buffer.elements.move(k, p);
                      $animate.move(buffer.elements[p].clone, wrapper.el);

                      //buffer.elements.splice(p, 0, buffer.elements.splice(k, 1)[0]);
                      found = true;
                    }
                  }

                  if (found) {
                    // We found this item further in the buffer. Move this buffered element to the bottom;
                  } else {
                    console.log('Merge in new data.. Muthafucka', i, p, e, list[e], buffer.elements[i], buffer.elements[p]);

                    buffer.elements[p].scope[itemName] = list[e];
                    buffer.elements[p].scope.$index = e;
                    buffer.elements[p].scope.$height = row.height;
                    buffer.elements[p].scope.$coords = { x:x, y:y };
                    //
                    $animate.move(buffer.elements[p].clone, wrapper.el);
                  }
                } else {
                  console.log('Creating a new item..... MUTHAFUCKA');

                  var newItem = {};
                  newItem.scope = scope.$new();
                  newItem.scope[itemName] = list[e];
                  newItem.scope.$index = e;
                  newItem.scope.$height = row.height;
                  newItem.scope.$coords = { x:x, y:y };
                  newItem.scope.$visible = false;
                  newItem.clone = $transclude(newItem.scope, cloneElement);
                  buffer.elements[i] = newItem;
                }

                // TODO: We should be able to position this without a watcher on the individual scope
                //renderElement(p, x, y);
              }
            }

            calculateWrapper();
            setupNextTick();
          }

          /**
           * Move the scroller back to the top.
           */
          function scrollToTop () {
            iscroll.scrollTo(0, 0, 1000, IScroll.utils.ease.elastic);
          }

          function getYFromIndex (index) {
            return index * row.height;
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
           * Validate our buffer numbers, and fix them if we've gone out of bounds
           */
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

            var p, x, y, r = start + (distance / columns) - 1;

            for (var i = itemsToMerge.length - 1; i >= 0; i--) {
              p = getRelativeBufferPosition((start * columns) + i);
              x = (p % columns) * (container.width / columns);
              y = r * row.height;

//console.log('Scrolling up', end, distance, p, i, r, x, y, buffer.distance, view.rows);

              var coords = {
                x: x,
                y: y
              };
              var index = start * columns + i;
              updateItem(p, itemsToMerge[i], coords, index);
              //renderElement(p, x, y);

              (p % columns === 0) ? r-- : null;

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

              (p % columns === 0) ? r++ : null;

              x = (p % columns) * (container.width / columns);
              y = r * row.height;

//console.log('Scrolling down', start, distance, p, i, x, y, r);

              var coords = {
                x: x,
                y: y
              };
              var index = start * columns + i;
              //console.log('Merging', itemsToMerge[i], 'with', items[p]);
              updateItem(p, itemsToMerge[i], coords, index);
              //renderElement(p, x, y);
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
              scope.$digest();
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
              scope.$digest();
            }
          }

          /**
           * Set a given buffered element to the given y coordinate
           * @param index
           * @param y
           */
          function renderElement (index, x, y) {

            //scope.$evalAsync(function () {
            var element = angular.element(elements[index]);
//console.log('Rendering element', index, x, y);
            element.css('-webkit-transform', 'translate3d(' + x + 'px, ' + y + 'px, 0px)');
            //});
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

//console.log('Updating wrapper', wrapper.height, (list.length % columns));
              wrapper.el.css('height', wrapper.height + 'px');
              iscroll.refresh();
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
            for (var i = 0; i < buffer.elements; i++) {
              destroyItem(i);
            }
          }

          function cleanup () {
            $window.removeEventListener('statusTap');
            container.el.off('scroll');
            clearElements();
            iscroll.destroy();
            iscroll = null;
            wrapper.el.remove();
            container.el.remove();
            delete container.el;
            delete wrapper.el;
            delete buffer.elements;
          }

          scope.$on('$destroy', function () {
            cleanup();
          });
        }
      };

    }]);
})(window, window.angular);
