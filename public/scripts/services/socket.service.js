//This is where our module gets initiated by using the bracket [] for no dependencies
angular
  .module('chastle')
    .factory('socket',function ($rootScope,Auth) {
      var socket = io({
        'query' : 'token=' + Auth.getToken()
      });
      return {
        on: function (eventName, callback) {
          socket.on(eventName, function () {  
            var args = arguments;
            $rootScope.$apply(function () {
              callback.apply(socket, args);
            });
          });
        },
        emit: function (eventName, data, callback) {
          socket.emit(eventName, data, function () {
            var args = arguments;
            $rootScope.$apply(function () {
              callback.apply(socket, args);
            });
          })
        }
      };
});
