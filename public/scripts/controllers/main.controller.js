'use strict';

angular.module('chastle')
.controller('mainCtrl', function ($scope,Auth,socket,$rootScope,User,$log) {
    // Socket listeners
    // ================
    /*THINGS TO IMPROVE
    * User reconnection
    * messages' persistence in database
    * better integration with database
    * management of the application life cycle
    * notify when user starts or stop typing
    * alert users when another users joins or leave the room
    * better UI, animation, mobile support
    * expand user schema(profile pic, bio,...)
    * introduce fun games
    * message receipts
    */

    $scope.currentUser = Auth.getCurrentUser();

    //lazy instantiations
    if(!$rootScope.rooms) {
      $rootScope.rooms = {};
    }
    if(!$rootScope.private){
      $rootScope.private = {};
    }
    if(!$rootScope.activeRooms) {
      $rootScope.activeRooms = [];
    }
    $scope.privateMessageInput = {};


    socket.on('init', function (rooms) {
      for (var room in rooms) {
        $rootScope.rooms[room] = {
          users: rooms[room].users,
          messages: [],
          userIsParticipating: false
        }
      }
    });

    socket.on('update', function (rooms) {
      var tempRooms = {};
      for (var room in rooms) {
        if(!$rootScope.rooms[room]) {
          tempRooms[room] = {
            users: rooms[room].users,
            messages: [],
            userIsParticipating: false
          };
        }
        else tempRooms[room] = {
          users: rooms[room].users,
          messages: $rootScope.rooms[room].messages,
          userIsParticipating: $rootScope.rooms[room].userIsParticipating
        };
      }
      $rootScope.rooms = angular.copy(tempRooms);
    });

    socket.on('joined:room', function (data) {
      //do something with data.senderId and data.name later on
    });
    socket.on('left:room', function (data) {
      //do something with data.senderId and data.name later on
    });
    socket.on('send:private:message', function (data) {
      if(!$rootScope.private[data.senderId]) {
        $rootScope.private[data.senderId] = {
          messages : [],
          disabled: false,
          isChatTabOpened:true,
          user: giveMeUserPublicProfileUsingId(data.senderId)
        };
        $scope.privateMessageInput[data.senderId]='';
      }
      $rootScope.private[data.senderId].messages.push({
        senderName: data.senderName,
        message: data.message,
        self: false,
        chatroom: false
      });
      autoScrollById(data.senderId);
    });
    socket.on('send:room:message', function (data) {
      $rootScope.rooms[data.room].messages.push({
        senderName: data.senderName,
        senderId: data.senderId,
        message: data.message,
        self: false,
        chatroom: false
      });
      autoScrollById('roomMessagesBox');
    });
    socket.on('user:disconnected', function (data) {
      $log.log('user:disconnected');
      if($rootScope.private[data.senderId]) {
        $rootScope.private[data.senderId].disabled = true;
        $rootScope.private[data.senderId].messages.push({
          senderName: 'Chatower',
          senderId: '#',
          message: data.senderName + ' has disconnected',
          self: false,
          chatroom: true
        });
      }
      //expand on this
    });
    socket.on('error', function (data) {
      $log.error(data);
    });

    // Private helpers
    // ===============

    $scope.sendPrivateMessage = function (key) {
      if($scope.privateMessageInput[key]!=='') {
        socket.emit('send:private:message', {
          message: $scope.privateMessageInput[key],
          receiverId: key
        });

      // add the message to our model locally
      if(!$rootScope.private[key]) {
        $rootScope.private[key] = {
          messages: [],
          disabled: false,
          isChatTabOpened:true,
          senderName: giveMeUserPublicProfileUsingId(key)
        }
      }
      $rootScope.private[key].messages.push({
        senderName: $scope.currentUser.name,
        senderId: undefined,
        message: $scope.privateMessageInput[key],
        self: true,
        chatroom: false
      });
      autoScrollById(key);
    }

      // clear message box
      $scope.privateMessageInput[key] = '';
    };
    $scope.sendRoomMessage = function (key) {
      if($scope.roomMessageInput[key]!=='') {
        socket.emit('send:room:message', {
          message: $scope.roomMessageInput[key],
          room: key
        });

      // add the message to our model locally
      $rootScope.rooms[key].messages.push({
        senderName: $scope.currentUser.name,
        senderId: '',
        message: $scope.roomMessageInput[key],
        self: true,
        chatroom: false
      });
      autoScrollById('roomMessagesBox');
    }

      // clear message box
      $scope.roomMessageInput[key] = '';
    };
    $scope.newRoom = '';
    $scope.joinRoom = function(room) {
      socket.emit('join:room', {room: room}, function() {
        if (!$rootScope.rooms[room] || !$rootScope.rooms[room].userIsParticipating ) {
          $rootScope.rooms[room]={};
          $rootScope.rooms[room].messages = [];
          $rootScope.rooms[room].userIsParticipating = true;
          $rootScope.activeRooms.push(room);
          $scope.newRoom = '';
        }
      });
    };

    $scope.leaveRoom = function(room) {
      socket.emit('leave:room', {room: room},function() {
        if ($rootScope.rooms[room].userIsParticipating) {
          $rootScope.rooms[room].messages = [];
          $rootScope.rooms[room].userIsParticipating = false;
          $rootScope.activeRooms.splice($rootScope.activeRooms.indexOf(room),1);
        }
      });
    };
    $scope.openPrivateMessage = function(userId) {
      if(!$rootScope.private[userId]) {
        $rootScope.private[userId] = {
          messages: [],
          disabled: false,
          isChatTabOpened: true,
          user: giveMeUserPublicProfileUsingId(userId)
        }
        $log.log($rootScope.private[userId].isChatTabOpened);
      }
    };
    $scope.closePrivateMessage = function(userId) {
      delete $rootScope.private[userId];
      delete $scope.privateMessageInput[userId];
    };

    $scope.selectedActiveRoomIndex = 0;
    $scope.selectActiveRoom = function(index) {
      $scope.selectedActiveRoomIndex = index;
    };

    //More private helpers
    var giveMeUserPublicProfileUsingId = function(userId) {
      return User.show({id: userId});
    };
    var autoScrollById = function(elementId) {
      setTimeout(function(){
        document.getElementById(elementId).scrollTop = document.getElementById(elementId).scrollHeight;
      },0);
    };
  });