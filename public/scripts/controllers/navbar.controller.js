'use strict';

angular.module('chastle')
  .controller('navbarCtrl', function ($scope, $location, Auth,$log,socket,$rootScope) {
    $scope.menu = [{
      'title': 'Home',
      'link': '/'
    }];

    $scope.isCollapsed = true;
    $scope.isLoggedIn = Auth.isLoggedIn;
    $scope.isAdmin = Auth.isAdmin;
    $scope.getCurrentUser = Auth.getCurrentUser;

    $scope.logout = function() {
      socket.dealloc();
      $rootScope.rooms = undefined;
      $rootScope.private = undefined;
      $rootScope.activeRooms = undefined;
      $rootScope.roomsArrayToBeFiltered = undefined;
      Auth.logout();
      $location.path('/login');
    };

    $scope.isActive = function(route) {
      return route === $location.path();
    };
  });