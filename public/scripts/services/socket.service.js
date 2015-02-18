//This is where our module gets initiated by using the bracket [] for no dependencies
angular
  .module('chastle')
    .factory('socket',function ($rootScope,Auth,$log) {
      var socket = io.connect({
              'query' : 'token=' + Auth.getToken(),
              forceNew: true
            });
      var isSocketSubscribedToAllEvents = false;
      var isSocketDisconnected = false;
      return {
        reconnect: function () {
          if (isSocketDisconnected) {
            socket = io.connect({
              'query' : 'token=' + Auth.getToken(),
              forceNew: true
            });
            $log.log('i ran');
          }
        },
        on: function (eventName, callback) {
          //this ensures that the socket does not listen to duplicate events
          if(isSocketSubscribedToAllEvents) return;
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
              if (callback) {
                callback.apply(socket, args);
              }
            });
          })
        },
        dealloc: function() {
          //socket.removeAllListeners();
          socket.io.disconnect();
          isSocketDisconnected = true;
          isSocketSubscribedToAllEvents = false;
        },
        noMoreEvents: function() {
          isSocketSubscribedToAllEvents = true;
        }
      };
    });
