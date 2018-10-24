'use strict';

/**
 * Notifies when user is typing
 */
 angular.module('chastle')
 .directive('userTyping', function (socket,$timeout,$log) {
  //ported from the socket.io chat example
    var TYPING_TIMER_LENGTH = 1000; // ms
    var typing = false;
    var lastTypingTime;
    var ignoredTheFirstWatch = false; //check doc on $watch

    function updateTyping (id,type) {
      if (!typing) {
        typing = true;
        socket.emit('started typing', {
          receiverId : id,
          type: type
        });
      }
      lastTypingTime = (new Date()).getTime();

      $timeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stopped typing', {
            receiverId : id,
            type: type
          });
          typing = false;
        }
      }, TYPING_TIMER_LENGTH,false);
    }

    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        scope.$watch(attrs.ngModel, function(value) {
          if(value && value.length!==0) updateTyping(attrs.typingId,attrs.typingType);
        });
        /* JQLite implementation
        element.on('input', function() {
          updateTyping(attrs.typingId);
        });
        */
      }
    };
  });