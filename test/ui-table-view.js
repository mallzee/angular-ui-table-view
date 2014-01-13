describe('UITableView', function () {

  var element,
    scope,
    wrapper,
    timeout,
    bufferedItems,
    tv;

  var rowHeight = 100,
      bufferSize = 20;

  var html =
      '<div mlz-ui-table-view="items" style="height:480px; width: 320px" width="320" height="480" mlz-ui-table-view-row-height="' + rowHeight + '" mlz-ui-table-view-buffer="' + bufferSize + '">'
    +   '<div class="mlz-ui-table-view-wrapper">'
    +     '<div id="{{item.id}}" ng-repeat="item in tableView.buffer.items track by item.$$position">'
    +       '<dt ng-bind="item.name"></dt>'
    +       '<dd ng-bind="item.details"></dd>'
    +     '</div>'
    +   '</div>'
    + '</div>';

  beforeEach(module("mallzee.ui-table-view"));

  beforeEach(inject(function ($compile, $rootScope, $document, $timeout) {
    var $scope = $rootScope.$new();
    $scope.items = [];

    element = angular.element(html);
    element = $compile(element)($scope);

    $document.append(element);
    timeout = $timeout;

    scope = element.scope();

    for (var i = 0; i < 50000; i++) {
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

    wrapper = element.children();
    bufferedItems = element.children().children();

  }));

  describe('initialisation', function () {


    it('should have 50,000 items', function () {
      expect(tv.allItems.length).to.equal(50000);
    });

    it('should have buffered ' + bufferSize + ' elements', function () {
      expect(tv.buffer.size).to.equal(bufferSize);
      expect(tv.buffer.items.length).to.equal(bufferSize);
      expect(bufferedItems.length).to.equal(bufferSize);
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
        expect(tv.buffer.visible).to.equal(6);
      });
    });

    describe('wrapper', function () {
      it('should have position relative', function () {
        expect(wrapper.css('position')).to.equal('relative');
      });

      it('should have the correct calculated height', function () {
        expect(tv.wrapper.height).to.equal(rowHeight * tv.allItems.length);
      });
    });

  });

  describe('scrolling down by one item', function () {

    beforeEach(function () {
      // Set the scroll position to the row height to move down one index
      tv.setScrollPosition(rowHeight);
      timeout.flush();
    });

    it('should update the scroll coordinates', function () {
      expect(tv.scroll.y).to.equal(rowHeight);
    });

    it('should update the scroll index', function () {
      expect(tv.scroll.index).to.equal(1);
    });

    it('should have a scroll direction of down', function () {
      expect(tv.scroll.direction).to.equal('down');
    });

    it('should update the window position', function() {
      expect(tv.window.startIndex).to.equal(1);
      expect(tv.window.endIndex).to.equal(bufferSize);
      expect(tv.window.startPx, 'startPx').to.equal(rowHeight);
      expect(tv.window.endPx).to.equal((bufferSize + 1) * rowHeight);
    });

    it('should update the transformed Y coordinates of the item leaving the view window', function () {
      var item0 = angular.element(bufferedItems[0]);
      expect(item0.css('-webkit-transform')).to.equal('translateY(' + bufferSize * rowHeight + 'px)');
      var item1 = angular.element(bufferedItems[1]);
      expect(item1.css('-webkit-transform')).to.equal('translateY(' + rowHeight + 'px)');
    });

    it('should update which items are visible', function () {
      expect(tv.buffer.items[0].$$visible, 'item0').to.be.false;
      expect(tv.buffer.items[1].$$visible, 'item1').to.be.true;
    });

  });

  describe('scrolling down by ten items', function () {

    beforeEach(function () {
      tv.setScrollPosition((rowHeight * 10));
      timeout.flush();
    });

    it('should update the scroll coordinates', function () {
      expect(tv.scroll.y).to.equal(rowHeight * 10);
    });

    it('should update the scroll index', function () {
      expect(tv.scroll.index).to.equal(10);
    });

    it('should have a scroll direction of down', function () {
      expect(tv.scroll.direction).to.equal('down');
    });

    it('should update the window position', function() {
      expect(tv.window.startIndex, 'startIndex').to.equal(10);
      expect(tv.window.endIndex, 'endIndex').to.equal(bufferSize + 9);
      expect(tv.window.startPx, 'startPx').to.equal(rowHeight * 10);
      expect(tv.window.endPx, 'endPx').to.equal((bufferSize + 10 ) * rowHeight);
    });

    it('should update the transformed Y coordinates of the item out of view', function () {
      var item0 = angular.element(bufferedItems[0]);
      expect(item0.css('-webkit-transform'), 'item0').to.equal('translateY(' + (bufferSize) * rowHeight + 'px)');

      var item9 = angular.element(bufferedItems[9]);
      expect(item9.css('-webkit-transform'), 'item9').to.equal('translateY(' + (bufferSize + 9) * rowHeight + 'px)');
    });

    it('should update which items are visible', function () {
      expect(tv.buffer.items[0].$$visible).to.be.false;
      expect(tv.buffer.items[9].$$visible).to.be.false;
      expect(tv.buffer.items[10].$$visible).to.be.true;
    });

  });

  describe('scrolling up by one item', function () {

    beforeEach(function () {
      // Move down two first so we can move up one;
      tv.setScrollPosition((rowHeight * 2));
      tv.setScrollPosition(rowHeight);
      timeout.flush();
    });

    it('should update the scroll coordinates', function () {
      expect(tv.scroll.y).to.equal(rowHeight);
    });

    it('should update the scroll index', function () {
      expect(tv.scroll.index).to.equal(1);
    });

    it('should have a deltaIndex of 1', function () {
      expect(tv.scroll.deltaIndex).to.equal(1);
    });

    it('should have a scroll direction of up', function () {
      expect(tv.scroll.direction).to.equal('up');
    });

    it('should update the window position', function() {
      expect(tv.window.startIndex, 'startIndex').to.equal(1);
      expect(tv.window.endIndex, 'endIndex').to.equal(bufferSize);
      expect(tv.window.startPx, 'startPx').to.equal(rowHeight);
      expect(tv.window.endPx, 'endPx').to.equal((bufferSize + 1) * rowHeight);
    });

    it('should update the transformed Y coordinates of the item out of view', function () {
      var item0 = angular.element(bufferedItems[0]);
      expect(item0.css('-webkit-transform')).to.equal('translateY(' + bufferSize * rowHeight + 'px)');
    });
  });

  describe('scrolling up by two items', function () {

    beforeEach(function () {
      tv.setScrollPosition((rowHeight * 3));
      tv.setScrollPosition(rowHeight);
      timeout.flush();
    });

    it('should update the scroll coordinates', function () {
      expect(tv.scroll.y).to.equal(rowHeight);
    });

    it('should update the scroll index', function () {
      expect(tv.scroll.index).to.equal(1);
    });

    it('should have a deltaIndex of 10', function () {
      expect(tv.scroll.deltaIndex).to.equal(2);
    });

    it('should have a scroll direction of up', function () {
      expect(tv.scroll.direction).to.equal('up');
    });

    it('should update the window position', function() {
      expect(tv.window.startIndex, 'startIndex').to.equal(1);
      expect(tv.window.endIndex, 'endIndex').to.equal(bufferSize);
      expect(tv.window.startPx, 'startPx').to.equal(rowHeight);
      expect(tv.window.endPx, 'endPx').to.equal((bufferSize + 1) * rowHeight);
    });

    it('should update the transformed Y coordinates of the item out of view', function () {
      var item0 = angular.element(bufferedItems[0]);
      expect(item0.css('-webkit-transform'), 'item0').to.equal('translateY(' + (bufferSize) * rowHeight + 'px)');

      var item1 = angular.element(bufferedItems[1]);
      expect(item1.css('-webkit-transform'), 'item1').to.equal('translateY(' + rowHeight + 'px)');

      //var item9 = angular.element(bufferedItems[9]);
      //expect(item9.css('-webkit-transform')).to.equal('translateY(' + (bufferSize + 9) * rowHeight + 'px)');
    });

  });

  describe('scrolling up by ten items', function () {

    beforeEach(function () {
      tv.setScrollPosition((rowHeight * 11));
      tv.setScrollPosition(rowHeight);
      timeout.flush();
    });

    it('should update the scroll coordinates', function () {
      expect(tv.scroll.y).to.equal(rowHeight);
    });

    it('should update the scroll index', function () {
      expect(tv.scroll.index).to.equal(1);
    });

    it('should have a deltaIndex of 10', function () {
      expect(tv.scroll.deltaIndex).to.equal(10);
    });

    it('should have a scroll direction of up', function () {
      expect(tv.scroll.direction).to.equal('up');
    });

    it('should update the window position', function() {
      expect(tv.window.startIndex, 'startIndex').to.equal(1);
      expect(tv.window.endIndex, 'endIndex').to.equal(bufferSize);
      expect(tv.window.startPx, 'startPx').to.equal(rowHeight);
      expect(tv.window.endPx, 'endPx').to.equal((bufferSize + 1) * rowHeight);
    });

    it('should update the transformed Y coordinates of the item out of view', function () {
      var item0 = angular.element(bufferedItems[0]);
      expect(item0.css('-webkit-transform')).to.equal('translateY(' + (bufferSize) * rowHeight + 'px)');

      //var item9 = angular.element(bufferedItems[9]);
      //expect(item9.css('-webkit-transform')).to.equal('translateY(' + (bufferSize + 9) * rowHeight + 'px)');
    });

  });

  describe('scroll to top', function () {
    it('should have the start position set as 0', function () {

    });
  });

});