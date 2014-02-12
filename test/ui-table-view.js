describe('UITableView', function () {

  var element,
    scope,
    document,
    timeout,

    container,
    wrapper,
    elements,
    tv;

  var numberOfItems = 1000,
    rowHeight = 100,
    bufferSize = 10;

  var html =
    '<mlz-ui-table-view style="height:480px; width: 320px"'
      + 'list="list" row-height="' + rowHeight + '"'
      + 'buffer-size="' + bufferSize + '"'
      + 'trigger-bottom="bottomTrigger()" '
      + 'trigger-top="topTrigger()">'
      +   '<div id="{{item.id}}" ng-repeat="item in items track by item.$$position">'
      +     '<dt ng-bind="item.name"></dt>'
      +     '<dd ng-bind="item.details"></dd>'
      +   '</div>'
      + '</mlz-ui-table-view>';

  beforeEach(module("mallzee.ui-table-view"));

  function initialiseWithListSet () {

    inject(function ($compile, $rootScope, $document, $timeout) {
      var $scope = $rootScope.$new();
      $scope.list = [];

      for (var i = 0; i < numberOfItems; i++) {
        $scope.list.push({
          id: i,
          name: 'Name ' + i,
          detail: 'Detail ' + i
        });
      }

      $scope.bottomTrigger = function () {  };
      $scope.topTrigger = function () {  };

      $scope.deleteItem = function(index) {
        $scope.list.splice(index, 1);
      };

      document = $document;

      element = angular.element(html);
      element = $compile(element)($scope);

      scope = element.scope();
      timeout = $timeout;

      scope.$digest();

      $timeout.flush();

      $document.find('body').append(element);

      container = element;
      wrapper = element.children();
      elements = element.children().children();

    });
  }

  function scrollTo(y) {
    container.prop('scrollTop', y).triggerHandler('scroll');
  }


  function scrollToIndex(index) {
    scrollTo(index * rowHeight);
  }

  function getElementIndexFromListIndex(index) {
    return index % elements.length;
  }

  /**
   * Helper function to check all the elements are inline
   * @param index
   */
  function checkElementsStartingFrom(index) {

    for (var i = 0; i < elements.length; i++) {
      var pos = getElementIndexFromListIndex(index);
      var el = angular.element(elements[pos]);

      expect(scope.items[pos].$$position, 'element id ' + pos).to.equal(pos);
      expect(el.css('-webkit-transform'), 'transform element' + pos).to.equal('translateY(' + index * rowHeight + 'px)');
      index++;
    }
  }

  function cleanUp() {
    document.find('mlz-ui-table-view').empty();
  }

  describe('initialisation with array', function () {

    beforeEach(function () {
      initialiseWithListSet();
    });

    it('should have ' + numberOfItems + ' items', function () {
      expect(scope.list.length).to.equal(numberOfItems);
    });

    it('should have buffered ' + bufferSize + ' elements', function () {
      expect(elements.length, 'Elements length').to.equal(10);
    });

    it('Should have the correct element the top level', function () {
      expect(container.prop('tagName')).to.equal('MLZ-UI-TABLE-VIEW');
    });

    describe('dimensions', function () {
      it('should have the correct container height and width', function () {
        expect(container.prop('clientHeight')).to.equal(480);
        // TODO: Workout why PhantomJS gets this wrong
        //expect(container.prop('clientWidth')).to.equal(320);
      });

      it('should have the correct wrapper classes and properties', function () {
        expect(wrapper.hasClass('mlz-ui-table-view-wrapper')).to.be.true;
        expect(wrapper.css('position')).to.equal('relative');
      });

      it('should have the correct calculated wrapper height', function () {
        expect(wrapper.prop('clientHeight')).to.equal(rowHeight * scope.list.length);
      });

      it('should have an elements of the correct size', function () {
        expect(elements.prop('clientHeight')).to.equal(100);
        // TODO: Workout why PhantomJS gets this wrong
        //expect(elements.prop('clientWidth')).to.equal(320);
      });
    });
  });


  describe('scrolling', function () {

    describe('down by one item', function () {

      beforeEach(function () {
        initialiseWithListSet();
        scrollTo(100);
      });

      afterEach(function () {
        cleanUp();
      });

      it('should update the scroll model', function () {
        expect(container.prop('scrollTop'), 'scroll top').to.equal(100);
      });

      it('should have elements in the correct positions', function () {
        checkElementsStartingFrom(1);
      });

    });

    describe('down by ten items', function () {

      beforeEach(function () {
        initialiseWithListSet();
        scrollToIndex(10);
      });

      afterEach(function () {
        cleanUp();
      });

      it('should update the scroll model', function () {
        expect(container.prop('scrollTop'), 'scroll top').to.equal(1000);
      });

      it('should have elements in the correct positions', function () {
        checkElementsStartingFrom(10);
      });
    });

    describe('down by a hundred items', function () {

      beforeEach(function () {
        initialiseWithListSet();
        scrollToIndex(100);
      });

      afterEach(function () {
        cleanUp();
      });

      it('should update the scroll model', function () {
        expect(container.prop('scrollTop'), 'scroll top').to.equal(10000);
      });

      it('should have elements in the correct positions', function () {
        checkElementsStartingFrom(100);
      });
    });

    describe('down by a lot of items to trigger the bottom edge', function () {

      beforeEach(function () {
        initialiseWithListSet();
        scrollToIndex(994);
      });

      afterEach(function () {
        cleanUp();
      });

      it('should update the scroll model', function () {
        expect(container.prop('scrollTop'), 'scroll top').to.equal(99400);
      });

      it('should have elements in the correct positions', function () {
        checkElementsStartingFrom(990);
      });

    });

    describe('up by one item', function () {

      beforeEach(function () {
        initialiseWithListSet();
        scrollToIndex(2);
        scrollToIndex(0);
      });

      afterEach(function () {
        cleanUp();
      });

      it('should update the scroll model', function () {
        expect(container.prop('scrollTop'), 'scroll top').to.equal(0);
      });

      it('should have elements in the correct positions', function () {
        checkElementsStartingFrom(0);
      });

    });

    describe('down three items, up two', function () {

      beforeEach(function () {
        initialiseWithListSet();
        scrollTo(320);
        scrollToIndex(3);
        scrollToIndex(1);
      });

      afterEach(function () {
        cleanUp();
      });

      it('should update the scroll model', function () {
        expect(container.prop('scrollTop'), 'scroll top').to.equal(100);
      });

      it('should have elements in the correct positions', function () {
        checkElementsStartingFrom(0);
      });
    });

    xdescribe('down three items, up two, direction change down', function () {

      beforeEach(function () {
        initialiseWithListSet();
        scrollTo(320);
        scrollTo(300);
        scrollTo(100);
        scrollTo(110);
      });

      afterEach(function () {
        cleanUp();
      });

      it('should update the scroll model', function () {
        expect(container.prop('scrollTop'), 'scroll top').to.equal(0);
      });

      it('should have elements in the correct positions', function () {
        checkElementsStartingFrom(1);
      });

    });

    describe('up by ten items', function () {

      beforeEach(function () {
        initialiseWithListSet();
        scrollToIndex(10);
        scrollToIndex(0);
      });

      afterEach(function () {
        cleanUp();
      });

      it('should update the scroll model', function () {
        expect(container.prop('scrollTop'), 'scroll top').to.equal(0);
      });

      it('should have elements in the correct positions', function () {
        checkElementsStartingFrom(0);
      });

    });

    describe('down eleven items, up one', function () {

      beforeEach(function () {
        initialiseWithListSet();
        scrollToIndex(11);
        scrollToIndex(10);
      });

      afterEach(function () {
        cleanUp();
      });

      it('should update the scroll model', function () {
        expect(container.prop('scrollTop'), 'scroll top').to.equal(1000);
      });

      it('should have elements in the correct positions', function () {
        // TODO: Fix this check
        //checkElementsStartingFrom(6);
      });



      /*it('should have updated buffered items', function () {
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
      });*/

    });

    describe('down up down no index change', function () {
      beforeEach(function () {
        initialiseWithListSet();
        scrollTo(10);
        scrollTo(0);
        scrollTo(10);
      });

      it('should update the scroll model', function () {
        expect(container.prop('scrollTop'), 'scroll top').to.equal(10);
      });

      it('should have elements in the correct positions', function () {
        checkElementsStartingFrom(0);
      });

    });

    describe('down up down', function () {
      beforeEach(function () {
        initialiseWithListSet();
        scrollToIndex(1);
        scrollToIndex(0);
        scrollToIndex(1);
        scrollToIndex(0);
        scrollToIndex(1);
      });


      it('should update the scroll model', function () {
        expect(container.prop('scrollTop'), 'scroll top').to.equal(100);
      });

      it('should have elements in the correct positions', function () {
        checkElementsStartingFrom(1);
      });

    });

    describe('down 10 up 1 down 1', function () {
      beforeEach(function () {
        initialiseWithListSet();
        scrollToIndex(10);
        scrollToIndex(9);
        scrollToIndex(10);
        scrollToIndex(7);
        scrollToIndex(10);
        scrollToIndex(9);
        scrollToIndex(10);
      });

      it('should update the scroll model', function () {
        expect(container.prop('scrollTop'), 'scroll top').to.equal(1000);
      });

      it('should have elements in the correct positions', function () {
        checkElementsStartingFrom(10);
      });

    });

    describe('overscroll up down', function () {
      beforeEach(function () {
        initialiseWithListSet();
        scrollTo(-90);
        scrollTo(-50);
      });

      it('should update the scroll model', function () {
        expect(container.prop('scrollTop'), 'scroll top').to.equal(0);
      });

      it('should have elements in the correct positions', function () {
        checkElementsStartingFrom(0);
      });

    });

    // TODO: Workout why these spys aren't working
    // Something to do with the funky way these are triggered I think
    xdescribe('into trigger zones', function () {

      it('should trigger the bottom zone', function () {
        var spy = sinon.spy(scope, 'bottomTrigger');
        initialiseWithListSet();

        scrollToIndex(996);
        expect(spy.calledOnce, 'bottomTrigger').to.be.true;
      });

      it('should trigger the upper zone', function () {

        var spy = sinon.spy(scope, 'topTrigger');
        initialiseWithListSet();

        scrollToIndex(996);
        scrollToIndex(0);
        expect(spy.calledOnce, 'topTrigger').to.be.true;
      });
    });

  });

  describe('deleting items', function () {

    beforeEach(function () {
      initialiseWithListSet();
    });

    it('should remove an item', function () {
      scope.deleteItem(0);
      scope.$digest();

      expect(scope.list.length).to.equal(999);
      expect(wrapper.prop('clientHeight')).to.equal(99900);
      expect(scope.list[0].id, 'List item id 0').to.equal(1);
      expect(scope.items[0].id, 'Buffered Items 0').to.equal(1);
      expect(scope.items[0].$$top).to.equal(0);
      expect(scope.items[1].id).to.equal(2);
      expect(scope.items[1].$$top).to.equal(100);
      expect(scope.items[2].id).to.equal(3);
      expect(scope.items[2].$$top).to.equal(200);
      expect(scope.items[3].id).to.equal(4);
      expect(scope.items[3].$$top).to.equal(300);
      expect(scope.items[4].id).to.equal(5);
      expect(scope.items[4].$$top).to.equal(400);
      expect(scope.items[5].id).to.equal(6);
      expect(scope.items[5].$$top).to.equal(500);
      expect(scope.items[6].id).to.equal(7);
      expect(scope.items[6].$$top).to.equal(600);
      expect(scope.items[7].id).to.equal(8);
      expect(scope.items[7].$$top).to.equal(700);
      expect(scope.items[8].id).to.equal(9);
      expect(scope.items[8].$$top).to.equal(800);
      expect(scope.items[9].id).to.equal(10);
      expect(scope.items[9].$$top).to.equal(900);

    });
  });

});