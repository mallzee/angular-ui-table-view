describe('UITableView', function () {

  var element,
    scope,
    document,
    timeout,

    wrapper,
    bufferedItems,
    tv;

  var numberOfItems = 1000,
    rowHeight = 100,
    bufferSize = 10;

  var html =
    '<div style="height:480px; width: 320px" width="320" height="480"'
      + 'mlz-ui-table-view items="items" mlz-ui-table-view-row-height="' + rowHeight + '"'
      + 'mlz-ui-table-view-buffer-size="' + bufferSize + '"'
      + 'mlz-ui-table-view-trigger-bottom="bottomTrigger()" '
      + 'mlz-ui-table-view-trigger-top="topTrigger()">'
      +   '<div id="{{item.id}}" ng-repeat="item in tableView.buffer.items track by item.$$position">'
      +     '<dt ng-bind="item.name"></dt>'
      +     '<dd ng-bind="item.details"></dd>'
      +   '</div>'
      + '</div>';

  beforeEach(module("mallzee.ui-table-view"));

  function initialiseWithArray () {

    inject(function ($compile, $rootScope, $document, $timeout) {
      var $scope = $rootScope.$new();
      $scope.items = [];
      $scope.bottomTrigger = function () {};
      $scope.topTrigger = function () {};

      $scope.deleteItem = function(index) {
        console.log('Deleting items', index);
        $scope.items.splice(index, 1);
      };

      document = $document;

      element = angular.element(html);
      //angular.element('body').append(element);
      element = $compile(element)($scope);

      scope = element.scope();
      timeout = $timeout;

      for (var i = 0; i < numberOfItems; i++) {
        scope.items.push({
          id: i,
          name: 'Name ' + i,
          detail: 'Detail ' + i
        });
      }

      tv = scope.tableView;
      tv.container.height = 480;
      tv.container.width = 320;

      scope.$digest();

      $timeout.flush();

      $document.find('body').append(element);

      wrapper = element.children();
      bufferedItems = element.children().children();

    });
  }

  function initialiseWithPromise () {

    inject(function ($compile, $rootScope, $timeout, $q) {

      var $scope = $rootScope.$new();
      timeout = $timeout;
      var deferred = $q.defer();
      $scope.items = [];

      timeout(function () {
        var items = [];
        for (var i = 0; i < numberOfItems; i++) {
          items.push({
            id: i,
            name: 'Name ' + i,
            detail: 'Detail ' + i
          });
        }

        deferred.resolve(items);
      });

      deferred.promise.then(function (items) {
        $scope.items = items;

        element = angular.element(html);
        element = $compile(element)($scope);

        scope = element.scope();

        tv = scope.tableView;
        tv.container.height = 480;
        tv.container.width = 320;

        wrapper = element.children();
        timeout.flush();
      });
    });
  }

  function cleanUp () {
    document.find('body').empty();
  }

  describe.only('initialisation with array', function () {

    beforeEach(function () {
      initialiseWithArray();
    });

    it('should have ' + numberOfItems + ' items', function () {
      expect(scope.items.length).to.equal(numberOfItems);
    });

    it('should have buffered ' + bufferSize + ' elements', function () {
      expect(tv.buffer.size).to.equal(bufferSize);
      expect(tv.buffer.distance).to.equal(4);
      expect(tv.buffer.items.length).to.equal(bufferSize);
      expect(tv.buffer.elements.length).to.equal(bufferSize);
    });

    it('Should add a class of mlz-ui-table-view to the top level element', function () {
      expect(element.hasClass('mlz-ui-table-view')).to.be.true;
    });

    describe('container', function () {
      it('should have height the correct height and width', function () {
        expect(element.css('height')).to.equal('480px');
        //expect(element.css('width')).to.equal('100%');
        expect(tv.container.height).to.equal(480);
        expect(tv.container.width).to.equal(320);
      });

      it('should have the number the correct number of element visible', function () {
        expect(tv.view.size).to.equal(6);
      });

      it('should have an element of the correct size', function () {
        //expect(bufferedItems[0].clientHeight).to.equal(100);
        //expect(bufferedItems[0].clientWidth).to.equal(320);
      })
    });

    describe('wrapper', function () {
      it('should have position relative', function () {
        expect(wrapper.css('position')).to.equal('relative');
      });

      it('should have the correct calculated height', function () {
        expect(tv.wrapper.height).to.equal(rowHeight * scope.items.length);
      });
    });

  });

  describe('initialisation with promise', function () {

    beforeEach(function () {
      initialiseWithPromise();
    });

    it('should have ' + numberOfItems + ' items', function () {
      expect(scope.items.length).to.equal(numberOfItems);
    });

    it('should have buffered ' + bufferSize + ' elements', function () {
      expect(tv.buffer.size, 'buffer size').to.equal(bufferSize);
      expect(tv.buffer.distance, 'buffer distance').to.equal(4);
      expect(tv.buffer.items.length, 'buffer items length').to.equal(bufferSize);
      expect(tv.buffer.elements.length, 'buffered items elements length').to.equal(bufferSize);
    });

    it('Should add a class of mlz-ui-table-view to the top level element', function () {
      expect(element.hasClass('mlz-ui-table-view')).to.be.true;
    });

    describe('container', function () {
      it('should have height the correct height and width', function () {
        expect(element.css('height')).to.equal('480px');
        expect(tv.container.height).to.equal(480);
        expect(tv.container.width).to.equal(320);
      });

      it('should have the number the correct number of element visible', function () {
        expect(tv.view.size).to.equal(6);
      });
    });

    describe('wrapper', function () {
      it('should have position relative', function () {
        expect(wrapper.css('position')).to.equal('relative');
      });

      it('should have the correct calculated height', function () {
        expect(scope.items.length).to.equal(numberOfItems);
        expect(tv.wrapper.height).to.equal(rowHeight * scope.items.length);
      });
    });

  });

  describe('relative index', function () {
    beforeEach(function () {
      initialiseWithArray();
    });

    afterEach(function () {
      cleanUp();
    });

    it('should have the correct relative buffer index with a given items index', function () {
      expect(tv.getRelativeBufferPosition(0)).to.equal(0);
      expect(tv.getRelativeBufferPosition(1)).to.equal(1);
      expect(tv.getRelativeBufferPosition(2)).to.equal(2);
      expect(tv.getRelativeBufferPosition(3)).to.equal(3);
      expect(tv.getRelativeBufferPosition(4)).to.equal(4);
      expect(tv.getRelativeBufferPosition(5)).to.equal(5);
      expect(tv.getRelativeBufferPosition(6)).to.equal(6);
      expect(tv.getRelativeBufferPosition(7)).to.equal(7);
      expect(tv.getRelativeBufferPosition(8)).to.equal(8);
      expect(tv.getRelativeBufferPosition(9)).to.equal(9);
      expect(tv.getRelativeBufferPosition(10)).to.equal(0);
      expect(tv.getRelativeBufferPosition(11)).to.equal(1);
      expect(tv.getRelativeBufferPosition(19)).to.equal(9);
      expect(tv.getRelativeBufferPosition(100)).to.equal(0);
      expect(tv.getRelativeBufferPosition(1000)).to.equal(0);
    });
  });

  describe('scrolling', function () {

    beforeEach(function () {
      initialiseWithArray();
    });


    afterEach(function () {
      cleanUp();
    });


    describe('down by one item', function () {

      beforeEach(function () {
        // Set the scroll position to the row height to move down one index
        tv.setScrollYIndex(1);
      });

      it('should update the scroll model', function () {
        expect(tv.scroll.y, 'y').to.equal(100);
        expect(tv.scroll.yIndex, 'yIndex').to.equal(1);
        expect(tv.scroll.yDistance, 'yDistance').to.equal(1);
        expect(tv.scroll.direction, 'direction').to.equal('down');
        expect(tv.scroll.directionChange, 'directionChange').to.be.false;
        expect(element[0].scrollTop, 'scroll top').to.equal(100);
      });

      it('should update the view model', function () {
        expect(tv.view.top, 'top').to.equal(1);
        expect(tv.view.bottom, 'bottom').to.equal(5);
        expect(tv.view.yTop, 'yTop').to.equal(100);
        expect(tv.view.yBottom, 'yBottom').to.equal(580);
        expect(tv.view.ytChange, 'ytChange').to.equal(true);
        expect(tv.view.ybChange, 'ybChange').to.equal(true);
        expect(tv.view.atEdge, 'atEdge').to.be.false;
        expect(tv.view.deadZone, 'deadZone').to.be.false;
        expect(tv.view.deadZoneChange, 'deadZoneChange').to.be.true;
      });

      it('should update the buffer model', function () {
        expect(tv.buffer.top, 'top').to.equal(1);
        expect(tv.buffer.bottom, 'bottom').to.equal(10);
        expect(tv.buffer.yTop, 'yTop').to.equal(100);
        expect(tv.buffer.yBottom, 'yBottom').to.equal(1100);
        expect(tv.buffer.atEdge, 'atEdge').to.be.false;
      });

      it('should have updated buffered items', function () {
        expect(tv.buffer.items[1].id).to.equal(1);
        expect(tv.buffer.items[1].$$top).to.equal(100);
        expect(tv.buffer.items[9].id).to.equal(9);
        expect(tv.buffer.items[9].$$top).to.equal(900);
        expect(tv.buffer.items[0].id).to.equal(10);
        expect(tv.buffer.items[0].$$top).to.equal(1000);
      });

      it('should update the transformed Y coordinates of the item leaving the view window', function () {
        var item0 = angular.element(tv.buffer.elements[0]);
        expect(item0.css('-webkit-transform')).to.equal('translateY(1000px)');
        var item1 = angular.element(tv.buffer.elements[1]);
        expect(item1.css('-webkit-transform')).to.equal('translateY(100px)');
      });

      xit('should update which items are visible', function () {
        //expect(tv.buffer.items[0].$$visible, 'item0').to.be.false;
        //expect(tv.buffer.items[1].$$visible, 'item1').to.be.true;
      });

    });

    describe('down by ten items', function () {

      beforeEach(function () {
        tv.setScrollYIndex(10);
      });

      it('should update the scroll model', function () {
        expect(tv.scroll.y, 'y').to.equal(1000);
        expect(tv.scroll.yIndex, 'yIndex').to.equal(10);
        expect(tv.scroll.yDistance, 'yDistance').to.equal(10);
        expect(tv.scroll.direction, 'direction').to.equal('down');
        expect(tv.scroll.directionChange, 'directionChange').to.be.false;
        expect(element[0].scrollTop, 'scroll top').to.equal(1000);
      });

      it('should update the view model', function () {
        expect(tv.view.top, 'top').to.equal(10);
        expect(tv.view.bottom, 'bottom').to.equal(14);
        expect(tv.view.yTop, 'yTop').to.equal(1000);
        expect(tv.view.yBottom, 'yBottom').to.equal(1480);
        expect(tv.view.atEdge, 'atEdge').to.be.false;
      });

      it('should update the buffer model', function () {
        expect(tv.buffer.top, 'top').to.equal(10);
        expect(tv.buffer.bottom, 'bottom').to.equal(19);
        expect(tv.buffer.yTop, 'yTop').to.equal(1000);
        expect(tv.buffer.yBottom, 'yBottom').to.equal(2000);
        expect(tv.buffer.atEdge, 'atEdge').to.be.false;
        expect(tv.buffer.reset, 'reset').to.be.false;
      });

      it('should have updated buffered items', function () {
        expect(tv.buffer.items[0].id).to.equal(10);
        expect(tv.buffer.items[0].$$top).to.equal(1000);
        expect(tv.buffer.items[9].id).to.equal(19);
        expect(tv.buffer.items[9].$$top).to.equal(1900);
      });

      it('should update the transformed Y coordinates of the item out of view', function () {
        var item0 = angular.element(tv.buffer.elements[0]);
        expect(item0.css('-webkit-transform'), 'item0').to.equal('translateY(1000px)');

        var item9 = angular.element(tv.buffer.elements[9]);
        expect(item9.css('-webkit-transform'), 'item9').to.equal('translateY(1900px)');
      });

      xit('should update which items are visible', function () {
        //expect(tv.buffer.items[0].$$visible).to.be.false;
        //expect(tv.buffer.items[9].$$visible).to.be.false;
        //expect(tv.buffer.items[10].$$visible).to.be.true;
      });

    });

    describe('down by a hundred items', function () {

      beforeEach(function () {
        tv.setScrollYIndex(100);
      });

      it('should update the scroll model', function () {
        expect(tv.scroll.y, 'y').to.equal(10000);
        expect(tv.scroll.yIndex, 'yIndex').to.equal(100);
        expect(tv.scroll.yDistance, 'yDistance').to.equal(100);
        expect(tv.scroll.direction, 'direction').to.equal('down');
        expect(tv.scroll.directionChange, 'directionChange').to.be.false;
        expect(element[0].scrollTop, 'scroll top').to.equal(10000);
      });

      it('should update the view model', function () {
        expect(tv.view.top, 'top').to.equal(100);
        expect(tv.view.bottom, 'bottom').to.equal(104);
        expect(tv.view.yTop, 'yTop').to.equal(10000);
        expect(tv.view.yBottom, 'yBottom').to.equal(10480);
        expect(tv.view.atEdge, 'atEdge').to.be.false;
      });

      it('should update the buffer model', function () {
        expect(tv.buffer.top, 'top').to.equal(100);
        expect(tv.buffer.bottom, 'bottom').to.equal(109);
        expect(tv.buffer.yTop, 'yTop').to.equal(10000);
        expect(tv.buffer.yBottom, 'yBottom').to.equal(11000);
        expect(tv.buffer.atEdge, 'atEdge').to.be.false;
        expect(tv.buffer.reset, 'reset').to.be.true;
      });

      it('should have updated buffered items', function () {
        expect(tv.buffer.items[0].id).to.equal(100);
        expect(tv.buffer.items[0].$$top).to.equal(10000);
        expect(tv.buffer.items[9].id).to.equal(109);
        expect(tv.buffer.items[9].$$top).to.equal(10900);
      });

      it('should update the transformed Y coordinates of the item out of view', function () {
        var item0 = angular.element(tv.buffer.elements[0]);
        expect(item0.css('-webkit-transform'), 'item0').to.equal('translateY(10000px)');

        var item9 = angular.element(tv.buffer.elements[9]);
        expect(item9.css('-webkit-transform'), 'item9').to.equal('translateY(10900px)');
      });

      xit('should update which items are visible', function () {
        //expect(tv.buffer.items[0].$$visible).to.be.false;
        //expect(tv.buffer.items[9].$$visible).to.be.false;
        //expect(tv.buffer.items[10].$$visible).to.be.true;
      });
  });

  describe('down by a lot of items to trigger the bottom edge', function () {

      beforeEach(function () {
        tv.setScrollYIndex(994);
      });

      it('should update the scroll model', function () {
        expect(tv.scroll.y, 'y').to.equal(99400);
        expect(tv.scroll.yIndex, 'yIndex').to.equal(994);
        expect(tv.scroll.yDistance, 'yDistance').to.equal(994);
        expect(tv.scroll.direction, 'direction').to.equal('down');
        expect(tv.scroll.directionChange, 'directionChange').to.be.false;
        expect(element[0].scrollTop, 'scroll top').to.equal(99400);
      });

      it('should update the view model', function () {
        expect(tv.view.top, 'top').to.equal(994);
        expect(tv.view.bottom, 'bottom').to.equal(998);
        expect(tv.view.yTop, 'yTop').to.equal(99400);
        expect(tv.view.yBottom, 'yBottom').to.equal(99880);
        expect(tv.view.atEdge, 'atEdge').to.be.false;
        expect(tv.view.deadZone, 'deadZone').to.be.false;
        expect(tv.view.deadZoneChange, 'deadZoneChange').to.be.true;
      });

      it('should update the buffer model', function () {
        expect(tv.buffer.top, 'top').to.equal(990);
        expect(tv.buffer.bottom, 'bottom').to.equal(999);
        expect(tv.buffer.yTop, 'yTop').to.equal(99000);
        expect(tv.buffer.yBottom, 'yBottom').to.equal(100000);
        expect(tv.buffer.atEdge, 'atEdge').to.equal('bottom');
        expect(tv.buffer.reset, 'reset').to.be.true;
      });

      it('should have updated buffered items', function () {
        expect(tv.buffer.items[0].id).to.equal(990);
        expect(tv.buffer.items[0].$$top).to.equal(99000);
        expect(tv.buffer.items[9].id).to.equal(999);
        expect(tv.buffer.items[9].$$top).to.equal(99900);
      });

      it('should update the transformed Y coordinates of the item out of view', function () {
        var item0 = angular.element(tv.buffer.elements[0]);
        expect(item0.css('-webkit-transform'), 'item0').to.equal('translateY(99000px)');

        var item9 = angular.element(tv.buffer.elements[9]);
        expect(item9.css('-webkit-transform'), 'item9').to.equal('translateY(99900px)');
      });

      xit('should update which items are visible', function () {
        //expect(tv.buffer.items[0].$$visible).to.be.false;
        //expect(tv.buffer.items[9].$$visible).to.be.false;
        //expect(tv.buffer.items[10].$$visible).to.be.true;
      });

    });

    describe('up by one item', function () {

      var els;

      beforeEach(function () {
        // Move down two first so we can move up one;
        tv.setScrollYIndex(2);
        tv.setScrollYIndex(1);
        tv.setScrollYIndex(0);
        els = angular.element(element.children().children());

      });

      it('should update the scroll model', function () {
        expect(tv.scroll.y, 'y').to.equal(0);
        expect(tv.scroll.yIndex, 'yIndex').to.equal(0);
        expect(tv.scroll.yDistance, 'yDistance').to.equal(1);
        expect(tv.scroll.direction, 'direction').to.equal('up');
        expect(tv.scroll.directionChange, 'directionChange').to.be.false;
        expect(element[0].scrollTop, 'scroll top').to.equal(0);
      });

      it('should update the view model', function () {
        expect(tv.view.atEdge, 'atEdge').to.be.true;
        expect(tv.view.top, 'top').to.equal(0);
        expect(tv.view.bottom, 'bottom').to.equal(4);
        expect(tv.view.yTop, 'yTop').to.equal(0);
        expect(tv.view.yBottom, 'yBottom').to.equal(480);
      });

      it('should update the buffer model', function () {
        expect(tv.buffer.atEdge, 'atEdge').to.equal('top');
        expect(tv.buffer.top, 'top').to.equal(0);
        expect(tv.buffer.bottom, 'bottom').to.equal(9);
        expect(tv.buffer.yTop, 'yTop').to.equal(0);
        expect(tv.buffer.yBottom, 'yBottom').to.equal(1000);
        expect(tv.buffer.reset, 'reset').to.be.false;
      });

      it('should have updated buffered items', function () {
        expect(tv.buffer.items[0].id, 'First element in buffer should be item 0').to.equal(0);
        expect(tv.buffer.items[0].$$top, 'First element in buffer should be item 0').to.equal(0);
        expect(tv.buffer.items[1].id, 'First element in buffer should be item 1').to.equal(1);
        expect(tv.buffer.items[1].$$top, 'First element in buffer should be item 1').to.equal(100);
        expect(tv.buffer.items[2].id, 'First element in buffer should be item 2').to.equal(2);
        expect(tv.buffer.items[2].$$top, 'First element in buffer should be item 2').to.equal(200);
        expect(tv.buffer.items[9].id, 'First element in buffer should be item 0').to.equal(9);
        expect(tv.buffer.items[9].$$top, 'First element in buffer should be item 0').to.equal(900);
      });

      it('should update the transformed Y coordinates of the item out of view', function () {
        var item0 = angular.element(tv.buffer.elements[0]);
        expect(item0.css('-webkit-transform'), 'item0').to.equal('translateY(0px)');
        var item1 = angular.element(tv.buffer.elements[1]);
        expect(item1.css('-webkit-transform'), 'item1').to.equal('translateY(100px)');
        var item9 = angular.element(tv.buffer.elements[9]);
        expect(item9.css('-webkit-transform'), 'item9').to.equal('translateY(900px)');
      });
    });


    describe('down three items, up two', function () {

      beforeEach(function () {
        tv.setScrollYPosition(320);
        tv.setScrollYPosition(300);
        tv.setScrollYPosition(100);
      });

      it('should update the scroll model', function () {
        expect(tv.scroll.y, 'y').to.equal(100);
        expect(tv.scroll.yIndex, 'yIndex').to.equal(1);
        expect(tv.scroll.yDistance, 'yDistance').to.equal(2);
        expect(tv.scroll.direction, 'direction').to.equal('up');
        expect(tv.scroll.directionChange, 'directionChange').to.be.false;
        expect(element[0].scrollTop, 'scroll top').to.equal(100);
      });

      it('should update the view model', function () {
        expect(tv.view.atEdge, 'atEdge').to.be.false;
        expect(tv.view.top, 'top').to.equal(1);
        expect(tv.view.bottom, 'bottom').to.equal(5);
        expect(tv.view.yTop, 'yTop').to.equal(100);
        expect(tv.view.yBottom, 'yBottom').to.equal(580);
      });

      it('should update the buffer model', function () {
        expect(tv.buffer.atEdge, 'atEdge').to.equal('top');
        expect(tv.buffer.top, 'top').to.equal(0);
        expect(tv.buffer.bottom, 'bottom').to.equal(9);
        expect(tv.buffer.yTop, 'yTop').to.equal(0);
        expect(tv.buffer.yBottom, 'yBottom').to.equal(1000);
        expect(tv.buffer.reset, 'reset').to.be.false;
      });

      it('should have updated buffered items', function () {
        expect(tv.buffer.items[0].id).to.equal(0);
        expect(tv.buffer.items[0].$$top).to.equal(0);
        expect(tv.buffer.items[1].id).to.equal(1);
        expect(tv.buffer.items[1].$$top).to.equal(100);
        expect(tv.buffer.items[2].id).to.equal(2);
        expect(tv.buffer.items[2].$$top).to.equal(200);
        expect(tv.buffer.items[3].id).to.equal(3);
        expect(tv.buffer.items[3].$$top).to.equal(300);
        expect(tv.buffer.items[4].id).to.equal(4);
        expect(tv.buffer.items[4].$$top).to.equal(400);
        expect(tv.buffer.items[5].id).to.equal(5);
        expect(tv.buffer.items[5].$$top).to.equal(500);
        expect(tv.buffer.items[6].id).to.equal(6);
        expect(tv.buffer.items[6].$$top).to.equal(600);
        expect(tv.buffer.items[7].id).to.equal(7);
        expect(tv.buffer.items[7].$$top).to.equal(700);
        expect(tv.buffer.items[8].id).to.equal(8);
        expect(tv.buffer.items[8].$$top).to.equal(800);
        expect(tv.buffer.items[9].id).to.equal(9);
        expect(tv.buffer.items[9].$$top).to.equal(900);
      });

      it('should update the transformed Y coordinates of the item out of view', function () {
        var item0 = angular.element(tv.buffer.elements[0]);
        expect(item0.css('-webkit-transform'), 'item0').to.equal('translateY(0px)');

        var item1 = angular.element(tv.buffer.elements[1]);
        expect(item1.css('-webkit-transform'), 'item1').to.equal('translateY(100px)');

        var item9 = angular.element(tv.buffer.elements[9]);
        expect(item9.css('-webkit-transform'), 'item9').to.equal('translateY(900px)');
      });
    });

    describe('down three items, up two, direction change down', function () {

      beforeEach(function () {
        tv.setScrollYPosition(320);
        tv.setScrollYPosition(300);
        tv.setScrollYPosition(100);
        tv.setScrollYPosition(110);
      });

      it('should update the scroll model', function () {
        expect(tv.scroll.y, 'y').to.equal(110);
        expect(tv.scroll.yIndex, 'yIndex').to.equal(1);
        expect(tv.scroll.yDistance, 'yDistance').to.equal(0);
        expect(tv.scroll.direction, 'direction').to.equal('down');
        expect(tv.scroll.directionChange, 'directionChange').to.be.true;
        expect(element[0].scrollTop, 'scroll top').to.equal(110);
      });

      it('should update the view model', function () {
        expect(tv.view.atEdge, 'atEdge').to.be.false;
        expect(tv.view.top, 'top').to.equal(1);
        expect(tv.view.bottom, 'bottom').to.equal(5);
        expect(tv.view.yTop, 'yTop').to.equal(110);
        expect(tv.view.yBottom, 'yBottom').to.equal(590);
      });

      it('should update the buffer model', function () {
        expect(tv.buffer.atEdge, 'atEdge').to.be.false;
        expect(tv.buffer.top, 'top').to.equal(1);
        expect(tv.buffer.bottom, 'bottom').to.equal(10);
        expect(tv.buffer.yTop, 'yTop').to.equal(100);
        expect(tv.buffer.yBottom, 'yBottom').to.equal(1100);
        expect(tv.buffer.reset, 'reset').to.be.false;
      });

      it('should have updated buffered items', function () {

        expect(tv.buffer.items[1].id).to.equal(1);
        expect(tv.buffer.items[1].$$top).to.equal(100);
        expect(tv.buffer.items[2].id).to.equal(2);
        expect(tv.buffer.items[2].$$top).to.equal(200);
        expect(tv.buffer.items[3].id).to.equal(3);
        expect(tv.buffer.items[3].$$top).to.equal(300);
        expect(tv.buffer.items[4].id).to.equal(4);
        expect(tv.buffer.items[4].$$top).to.equal(400);
        expect(tv.buffer.items[5].id).to.equal(5);
        expect(tv.buffer.items[5].$$top).to.equal(500);
        expect(tv.buffer.items[6].id).to.equal(6);
        expect(tv.buffer.items[6].$$top).to.equal(600);
        expect(tv.buffer.items[7].id).to.equal(7);
        expect(tv.buffer.items[7].$$top).to.equal(700);
        expect(tv.buffer.items[8].id).to.equal(8);
        expect(tv.buffer.items[8].$$top).to.equal(800);
        expect(tv.buffer.items[9].id).to.equal(9);
        expect(tv.buffer.items[9].$$top).to.equal(900);
        expect(tv.buffer.items[0].id).to.equal(10);
        expect(tv.buffer.items[0].$$top).to.equal(1000);
      });

      it('should update the transformed Y coordinates of the item out of view', function () {
        var item0 = angular.element(tv.buffer.elements[0]);
        expect(item0.css('-webkit-transform'), 'item0').to.equal('translateY(1000px)');

        var item1 = angular.element(tv.buffer.elements[1]);
        expect(item1.css('-webkit-transform'), 'item1').to.equal('translateY(100px)');

        var item9 = angular.element(tv.buffer.elements[9]);
        expect(item9.css('-webkit-transform'), 'item9').to.equal('translateY(900px)');
      });

    });

    describe('up by ten items', function () {

      beforeEach(function () {
        tv.setScrollYIndex(10);
        tv.setScrollYIndex(0);
      });

      it('should update the scroll model', function () {
        expect(tv.scroll.y, 'y').to.equal(0);
        expect(tv.scroll.yIndex, 'yIndex').to.equal(0);
        expect(tv.scroll.yDistance, 'yDistance').to.equal(10);
        expect(tv.scroll.direction, 'direction').to.equal('up');
        expect(tv.scroll.directionChange, 'directionChange').to.be.true;
        expect(element[0].scrollTop, 'scroll top').to.equal(0);
      });

      it('should update the view model', function () {
        expect(tv.view.atEdge, 'atEdge').to.be.true;
        expect(tv.view.top, 'top').to.equal(0);
        expect(tv.view.bottom, 'bottom').to.equal(4);
        expect(tv.view.yTop, 'yTop').to.equal(0);
        expect(tv.view.yBottom, 'yBottom').to.equal(480);
      });

      it('should update the buffer model', function () {
        expect(tv.buffer.atEdge, 'atEdge').to.equal('top');
        expect(tv.buffer.top, 'top').to.equal(0);
        expect(tv.buffer.bottom, 'bottom').to.equal(9);
        expect(tv.buffer.yTop, 'yTop').to.equal(0);
        expect(tv.buffer.yBottom, 'yBottom').to.equal(1000);
        expect(tv.buffer.reset, 'reset').to.be.false;
      });

      it('should have updated buffered items', function () {
        expect(tv.buffer.items[0].id).to.equal(0);
        expect(tv.buffer.items[0].$$top).to.equal(0);
        expect(tv.buffer.items[9].id).to.equal(9);
        expect(tv.buffer.items[9].$$top).to.equal(900);
      });

      it('should update the transformed Y coordinates of the item out of view', function () {
        var item0 = angular.element(tv.buffer.elements[0]);
        expect(item0.css('-webkit-transform'), 'item0').to.equal('translateY(0px)');

        var item1 = angular.element(tv.buffer.elements[1]);
        expect(item1.css('-webkit-transform'), 'item1').to.equal('translateY(100px)');

        var item9 = angular.element(tv.buffer.elements[9]);
        expect(item9.css('-webkit-transform'), 'item9').to.equal('translateY(900px)');
      });

    });

    describe('down eleven items, up one', function () {

      beforeEach(function () {
        tv.setScrollYIndex(11);
        tv.setScrollYIndex(10);
      });

      it('should update the scroll model', function () {
        expect(tv.scroll.y, 'y').to.equal(1000);
        expect(tv.scroll.yIndex, 'yIndex').to.equal(10);
        expect(tv.scroll.yDistance, 'yDistance').to.equal(1);
        expect(tv.scroll.direction, 'direction').to.equal('up');
        expect(tv.scroll.directionChange, 'directionChange').to.be.true;
        expect(element[0].scrollTop, 'scroll top').to.equal(1000);
      });

      it('should update the view model', function () {
        expect(tv.view.atEdge, 'atEdge').to.be.false;
        expect(tv.view.top, 'top').to.equal(10);
        expect(tv.view.bottom, 'bottom').to.equal(14);
        expect(tv.view.yTop, 'yTop').to.equal(1000);
        expect(tv.view.yBottom, 'yBottom').to.equal(1480);
      });

      it('should update the buffer model', function () {
        expect(tv.buffer.atEdge, 'atEdge').to.be.false;
        expect(tv.buffer.top, 'top').to.equal(6);
        expect(tv.buffer.bottom, 'bottom').to.equal(15);
        expect(tv.buffer.yTop, 'yTop').to.equal(600);
        expect(tv.buffer.yBottom, 'yBottom').to.equal(1600);
        expect(tv.buffer.reset, 'reset').to.be.false;
        //expect(tv.getRelativeBufferPosition(tv.scroll.yIndex), 'relative').to.equal(7);
      });

      it('should have updated buffered items', function () {
        expect(tv.buffer.items[6].id).to.equal(6);
        expect(tv.buffer.items[6].$$top).to.equal(600);
        expect(tv.buffer.items[7].id).to.equal(7);
        expect(tv.buffer.items[7].$$top).to.equal(700);
        expect(tv.buffer.items[8].id).to.equal(8);
        expect(tv.buffer.items[8].$$top).to.equal(800);
        expect(tv.buffer.items[9].id).to.equal(9);
        expect(tv.buffer.items[9].$$top).to.equal(900);
        expect(tv.buffer.items[0].id).to.equal(10);
        expect(tv.buffer.items[0].$$top).to.equal(1000);
        expect(tv.buffer.items[1].id).to.equal(11);
        expect(tv.buffer.items[1].$$top).to.equal(1100);
        expect(tv.buffer.items[2].id).to.equal(12);
        expect(tv.buffer.items[2].$$top).to.equal(1200);
        expect(tv.buffer.items[3].id).to.equal(13);
        expect(tv.buffer.items[3].$$top).to.equal(1300);
        expect(tv.buffer.items[4].id).to.equal(14);
        expect(tv.buffer.items[4].$$top).to.equal(1400);
        expect(tv.buffer.items[5].id).to.equal(15);
        expect(tv.buffer.items[5].$$top).to.equal(1500);
      });

      it('should update the transformed Y coordinates of the item out of view', function () {
        var item0 = angular.element(tv.buffer.elements[0]);
        expect(item0.css('-webkit-transform'), 'item0').to.equal('translateY(1000px)');

        var item5 = angular.element(tv.buffer.elements[5]);
        expect(item5.css('-webkit-transform'), 'item5').to.equal('translateY(1500px)');

        var item6 = angular.element(tv.buffer.elements[6]);
        expect(item6.css('-webkit-transform'), 'item6').to.equal('translateY(600px)');

        var item9 = angular.element(tv.buffer.elements[9]);
        expect(item9.css('-webkit-transform'), 'item9').to.equal('translateY(900px)');
      });

    });

    describe('down up down no index change', function () {
      beforeEach(function () {
        tv.setScrollYPosition(10);
        tv.setScrollYPosition(0);
        tv.setScrollYPosition(10);
      });

      it('should update the scroll model', function () {
        expect(tv.scroll.y, 'y').to.equal(10);
        expect(tv.scroll.yIndex, 'yIndex').to.equal(0);
        expect(tv.scroll.yDistance, 'yDistance').to.equal(0);
        expect(tv.scroll.direction, 'direction').to.equal('down');
        expect(tv.scroll.directionChange, 'directionChange').to.be.true;
        //expect(element[0].scrollTop, 'scroll top').to.equal(10);
      });

      it('should update the view model', function () {
        expect(tv.view.atEdge, 'atEdge').to.be.true;
        expect(tv.view.top, 'top').to.equal(0);
        expect(tv.view.bottom, 'bottom').to.equal(4);
        expect(tv.view.yTop, 'yTop').to.equal(10);
        expect(tv.view.yBottom, 'yBottom').to.equal(490);
      });

      it('should update the buffer model', function () {
        expect(tv.buffer.atEdge, 'atEdge').to.equal('top');
        expect(tv.buffer.top, 'top').to.equal(0);
        expect(tv.buffer.bottom, 'bottom').to.equal(9);
        expect(tv.buffer.yTop, 'yTop').to.equal(0);
        expect(tv.buffer.yBottom, 'yBottom').to.equal(1000);
        expect(tv.buffer.reset, 'reset').to.be.false;
      });

      it('should have updated buffered items', function () {
        expect(tv.buffer.items[0].id).to.equal(0);
        expect(tv.buffer.items[0].$$top).to.equal(0);
        expect(tv.buffer.items[1].id).to.equal(1);
        expect(tv.buffer.items[1].$$top).to.equal(100);
        expect(tv.buffer.items[2].id).to.equal(2);
        expect(tv.buffer.items[2].$$top).to.equal(200);
        expect(tv.buffer.items[3].id).to.equal(3);
        expect(tv.buffer.items[3].$$top).to.equal(300);
        expect(tv.buffer.items[4].id).to.equal(4);
        expect(tv.buffer.items[4].$$top).to.equal(400);
        expect(tv.buffer.items[5].id).to.equal(5);
        expect(tv.buffer.items[5].$$top).to.equal(500);
        expect(tv.buffer.items[6].id).to.equal(6);
        expect(tv.buffer.items[6].$$top).to.equal(600);
        expect(tv.buffer.items[7].id).to.equal(7);
        expect(tv.buffer.items[7].$$top).to.equal(700);
        expect(tv.buffer.items[8].id).to.equal(8);
        expect(tv.buffer.items[8].$$top).to.equal(800);
        expect(tv.buffer.items[9].id).to.equal(9);
        expect(tv.buffer.items[9].$$top).to.equal(900);
      });

      it('should update the transformed Y coordinates of the item leaving the view window', function () {
        var item0 = angular.element(tv.buffer.elements[0]);
        expect(item0.css('-webkit-transform')).to.equal('translateY(0px)');
        var item1 = angular.element(tv.buffer.elements[1]);
        expect(item1.css('-webkit-transform')).to.equal('translateY(100px)');
      });

    });

    describe('down up down', function () {
      beforeEach(function () {
        tv.setScrollYIndex(1);
        tv.setScrollYIndex(0);
        tv.setScrollYIndex(1);
        tv.setScrollYIndex(0);
        tv.setScrollYIndex(1);
      });

      it('should update the scroll model', function () {
        expect(tv.scroll.y, 'y').to.equal(100);
        expect(tv.scroll.yIndex, 'yIndex').to.equal(1);
        expect(tv.scroll.yDistance, 'yDistance').to.equal(1);
        expect(tv.scroll.direction, 'direction').to.equal('down');
        expect(tv.scroll.directionChange, 'directionChange').to.be.true;
        expect(element[0].scrollTop, 'scroll top').to.equal(100);
      });

      it('should update the view model', function () {
        expect(tv.view.atEdge, 'atEdge').to.be.false;
        expect(tv.view.top, 'top').to.equal(1);
        expect(tv.view.bottom, 'bottom').to.equal(5);
        expect(tv.view.yTop, 'yTop').to.equal(100);
        expect(tv.view.yBottom, 'yBottom').to.equal(580);
      });

      it('should update the buffer model', function () {
        expect(tv.buffer.atEdge, 'atEdge').to.be.false;
        expect(tv.buffer.top, 'top').to.equal(1);
        expect(tv.buffer.bottom, 'bottom').to.equal(10);
        expect(tv.buffer.yTop, 'yTop').to.equal(100);
        expect(tv.buffer.yBottom, 'yBottom').to.equal(1100);
        expect(tv.buffer.reset, 'reset').to.be.false;
        //expect(tv.getRelativeBufferPosition(tv.scroll.yIndex), 'relative').to.equal(7);
      });

      it('should have updated buffered items', function () {
        expect(tv.buffer.items[1].id).to.equal(1);
        expect(tv.buffer.items[1].$$top).to.equal(100);
        expect(tv.buffer.items[2].id).to.equal(2);
        expect(tv.buffer.items[2].$$top).to.equal(200);
        expect(tv.buffer.items[3].id).to.equal(3);
        expect(tv.buffer.items[3].$$top).to.equal(300);
        expect(tv.buffer.items[4].id).to.equal(4);
        expect(tv.buffer.items[4].$$top).to.equal(400);
        expect(tv.buffer.items[5].id).to.equal(5);
        expect(tv.buffer.items[5].$$top).to.equal(500);
        expect(tv.buffer.items[6].id).to.equal(6);
        expect(tv.buffer.items[6].$$top).to.equal(600);
        expect(tv.buffer.items[7].id).to.equal(7);
        expect(tv.buffer.items[7].$$top).to.equal(700);
        expect(tv.buffer.items[8].id).to.equal(8);
        expect(tv.buffer.items[8].$$top).to.equal(800);
        expect(tv.buffer.items[9].id).to.equal(9);
        expect(tv.buffer.items[9].$$top).to.equal(900);
        expect(tv.buffer.items[0].id).to.equal(10);
        expect(tv.buffer.items[0].$$top).to.equal(1000);
      });

      it('should update the transformed Y coordinates of the item leaving the view window', function () {
        var item0 = angular.element(tv.buffer.elements[0]);
        expect(item0.css('-webkit-transform')).to.equal('translateY(1000px)');
        var item1 = angular.element(tv.buffer.elements[1]);
        expect(item1.css('-webkit-transform')).to.equal('translateY(100px)');
      });

    });

    describe('down 10 up 1 down 1', function () {
      beforeEach(function () {
        tv.setScrollYIndex(10);
        tv.setScrollYIndex(9);
        tv.setScrollYIndex(10);
        tv.setScrollYIndex(7);
        tv.setScrollYIndex(10);
        tv.setScrollYIndex(9);
        tv.setScrollYIndex(10);
      });

      it('should update the scroll model', function () {
        expect(tv.scroll.y, 'y').to.equal(1000);
        expect(tv.scroll.yIndex, 'yIndex').to.equal(10);
        expect(tv.scroll.yDistance, 'yDistance').to.equal(1);
        expect(tv.scroll.direction, 'direction').to.equal('down');
        expect(tv.scroll.directionChange, 'directionChange').to.be.true;
        expect(element[0].scrollTop, 'scroll top').to.equal(1000);
      });

      it('should update the view model', function () {
        expect(tv.view.atEdge, 'atEdge').to.be.false;
        expect(tv.view.top, 'top').to.equal(10);
        expect(tv.view.bottom, 'bottom').to.equal(14);
        expect(tv.view.yTop, 'yTop').to.equal(1000);
        expect(tv.view.yBottom, 'yBottom').to.equal(1480);
      });

      it('should update the buffer model', function () {
        expect(tv.buffer.atEdge, 'atEdge').to.be.false;
        expect(tv.buffer.top, 'top').to.equal(10);
        expect(tv.buffer.bottom, 'bottom').to.equal(19);
        expect(tv.buffer.yTop, 'yTop').to.equal(1000);
        expect(tv.buffer.yBottom, 'yBottom').to.equal(2000);
        expect(tv.buffer.reset, 'reset').to.be.false;
      });

      it('should have updated buffered items', function () {
        expect(tv.buffer.items[0].id).to.equal(10);
        expect(tv.buffer.items[0].$$top).to.equal(1000);
        expect(tv.buffer.items[1].id).to.equal(11);
        expect(tv.buffer.items[1].$$top).to.equal(1100);
        expect(tv.buffer.items[2].id).to.equal(12);
        expect(tv.buffer.items[2].$$top).to.equal(1200);
        expect(tv.buffer.items[3].id).to.equal(13);
        expect(tv.buffer.items[3].$$top).to.equal(1300);
        expect(tv.buffer.items[4].id).to.equal(14);
        expect(tv.buffer.items[4].$$top).to.equal(1400);
        expect(tv.buffer.items[5].id).to.equal(15);
        expect(tv.buffer.items[5].$$top).to.equal(1500);
        expect(tv.buffer.items[6].id).to.equal(16);
        expect(tv.buffer.items[6].$$top).to.equal(1600);
        expect(tv.buffer.items[7].id).to.equal(17);
        expect(tv.buffer.items[7].$$top).to.equal(1700);
        expect(tv.buffer.items[8].id).to.equal(18);
        expect(tv.buffer.items[8].$$top).to.equal(1800);
        expect(tv.buffer.items[9].id).to.equal(19);
        expect(tv.buffer.items[9].$$top).to.equal(1900);

      });

      it('should update the transformed Y coordinates of the item leaving the view window', function () {
        var item0 = angular.element(tv.buffer.elements[0]);
        expect(item0.css('-webkit-transform')).to.equal('translateY(1000px)');
        var item1 = angular.element(tv.buffer.elements[1]);
        expect(item1.css('-webkit-transform')).to.equal('translateY(1100px)');
      });

    });

    describe('overscroll up down', function () {
      beforeEach(function () {
        tv.setScrollYPosition(-90);
        tv.setScrollYPosition(-50);
      });

      it('should update the scroll model', function () {
        expect(tv.scroll.y, 'y').to.equal(-50);
        expect(tv.scroll.yIndex, 'yIndex').to.equal(0);
        expect(tv.scroll.yDistance, 'yDistance').to.equal(0);
        expect(tv.scroll.direction, 'direction').to.equal('down');
        expect(tv.scroll.directionChange, 'directionChange').to.be.true;
        expect(element[0].scrollTop, 'scroll top').to.equal(0);
      });

      it('should update the view model', function () {
        expect(tv.view.atEdge, 'atEdge').to.be.true;
        expect(tv.view.top, 'top').to.equal(0);
        expect(tv.view.bottom, 'bottom').to.equal(4);
        expect(tv.view.yTop, 'yTop').to.equal(-50);
        expect(tv.view.yBottom, 'yBottom').to.equal(430);
        expect(tv.view.deadZone, 'deadZone').to.equal('top');
        expect(tv.view.deadZoneChange, 'deadZoneChange').to.be.false;
      });

      it('should update the buffer model', function () {
        expect(tv.buffer.atEdge, 'atEdge').to.equal('top');
        expect(tv.buffer.top, 'top').to.equal(0);
        expect(tv.buffer.bottom, 'bottom').to.equal(9);
        expect(tv.buffer.yTop, 'yTop').to.equal(0);
        expect(tv.buffer.yBottom, 'yBottom').to.equal(1000);
        expect(tv.buffer.reset, 'reset').to.be.false;
      });

      it('should have updated buffered items', function () {
        expect(tv.buffer.items[0].id).to.equal(0);
        expect(tv.buffer.items[0].$$top).to.equal(0);
        expect(tv.buffer.items[1].id).to.equal(1);
        expect(tv.buffer.items[1].$$top).to.equal(100);
        expect(tv.buffer.items[2].id).to.equal(2);
        expect(tv.buffer.items[2].$$top).to.equal(200);
        expect(tv.buffer.items[3].id).to.equal(3);
        expect(tv.buffer.items[3].$$top).to.equal(300);
        expect(tv.buffer.items[4].id).to.equal(4);
        expect(tv.buffer.items[4].$$top).to.equal(400);
        expect(tv.buffer.items[5].id).to.equal(5);
        expect(tv.buffer.items[5].$$top).to.equal(500);
        expect(tv.buffer.items[6].id).to.equal(6);
        expect(tv.buffer.items[6].$$top).to.equal(600);
        expect(tv.buffer.items[7].id).to.equal(7);
        expect(tv.buffer.items[7].$$top).to.equal(700);
        expect(tv.buffer.items[8].id).to.equal(8);
        expect(tv.buffer.items[8].$$top).to.equal(800);
        expect(tv.buffer.items[9].id).to.equal(9);
        expect(tv.buffer.items[9].$$top).to.equal(900);

      });

      it('should update the transformed Y coordinates of the item leaving the view window', function () {
        var item0 = angular.element(tv.buffer.elements[0]);
        expect(item0.css('-webkit-transform')).to.equal('translateY(0px)');
        var item1 = angular.element(tv.buffer.elements[1]);
        expect(item1.css('-webkit-transform')).to.equal('translateY(100px)');
      });

    });

    describe('into trigger zones', function () {
      it('should trigger the bottom zone', function () {
        var spy = sinon.spy(scope, 'bottomTrigger');

        tv.setScrollYIndex(996);

        expect(tv.view.triggerZone).to.equal('bottom');

        expect(spy.calledOnce, 'bottomTrigger').to.be.true;
      });

      it('should trigger the upper zone', function () {

        var spy = sinon.spy(scope, 'topTrigger');

        tv.setScrollYIndex(996);
        tv.setScrollYIndex(0);

        expect(tv.view.triggerZone).to.equal('top');

        expect(spy.calledOnce, 'topTrigger').to.be.true;
      });
    });

  });

  describe('deleting items', function () {

    beforeEach(function () {
      initialiseWithArray();
    });

    it('should remove an item', function () {
      scope.deleteItem(0);
      //timeout.flush();

      expect(scope.items.length).to.equal(999);
      expect(tv.wrapper.height).to.equal(99900);
      expect(scope.items[0].id, 'Items 0').to.equal(1);
      expect(tv.buffer.items[0].id, 'Buffered Items 0').to.equal(1);
      expect(tv.buffer.items[0].$$top).to.equal(0);
      expect(tv.buffer.items[1].id).to.equal(2);
      expect(tv.buffer.items[1].$$top).to.equal(100);
      expect(tv.buffer.items[2].id).to.equal(3);
      expect(tv.buffer.items[2].$$top).to.equal(200);
      expect(tv.buffer.items[3].id).to.equal(4);
      expect(tv.buffer.items[3].$$top).to.equal(300);
      expect(tv.buffer.items[4].id).to.equal(5);
      expect(tv.buffer.items[4].$$top).to.equal(400);
      expect(tv.buffer.items[5].id).to.equal(6);
      expect(tv.buffer.items[5].$$top).to.equal(500);
      expect(tv.buffer.items[6].id).to.equal(7);
      expect(tv.buffer.items[6].$$top).to.equal(600);
      expect(tv.buffer.items[7].id).to.equal(8);
      expect(tv.buffer.items[7].$$top).to.equal(700);
      expect(tv.buffer.items[8].id).to.equal(9);
      expect(tv.buffer.items[8].$$top).to.equal(800);
      expect(tv.buffer.items[9].id).to.equal(10);
      expect(tv.buffer.items[9].$$top).to.equal(900);

    });
  });

  describe('changing items', function () {

    initialiseWithArray();

    it('should trigger a DOM reset', function () {
      var mock = sinon.mock(tv);
      mock.expects('updatePositions').once().withArgs(null);
    });
  });

})
;