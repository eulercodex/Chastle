'use strict';

angular.module('chastle')
  .controller('loginCtrl', function ($scope, Auth, $location, $window,$cookieStore) {
    $scope.user = {};
    $scope.errors = {};
    // remove any stale tokens
    $cookieStore.remove('token');

    $scope.login = function(form) {
      $scope.submitted = true;

      if(form.$valid) {
        Auth.login({
          email: $scope.user.email,
          password: $scope.user.password
        })
        .then( function() {
          // Logged in, redirect to home
          $location.path('/');
        })
        .catch( function(err) {
          $scope.errors.other = err.message;
        });
      }
    };

    $scope.loginOauth = function(provider) {
      $window.location.href = '/auth/' + provider;
    };
  });