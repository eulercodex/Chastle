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
    if(!$rootScope.roomsArrayToBeFiltered) {
      $rootScope.roomsArrayToBeFiltered = [];
    }
    var connectedUsers = User.query({id:'connected'});
    $scope.privateMessageInput = {};


    socket.on('init', function (rooms) {
      for (var room in rooms) {
        $rootScope.rooms[room] = {
          users: rooms[room].users,
          messages: [],
          userIsParticipating: false
        }
        $rootScope.roomsArrayToBeFiltered.push({'room':room, 'numberOfUsers':rooms[room].users.length});
      }
    });

    socket.on('update', function (rooms) {
      var tempRooms = {};
      $rootScope.roomsArrayToBeFiltered = [];
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
        $rootScope.roomsArrayToBeFiltered.push({'room':room, 'numberOfUsers':rooms[room].users.length});
      }
      $rootScope.rooms = angular.copy(tempRooms);
      connectedUsers = User.query({id:'connected'});
      if ($scope.usersListOption === 0) $scope.displayedUsersList = connectedUsers;
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
        chatroom: false,
        dateSent: data.dateSent
      });
      autoScrollById(data.senderId);
    });
    socket.on('send:room:message', function (data) {
      $rootScope.rooms[data.room].messages.push({
        senderName: data.senderName,
        senderId: data.senderId,
        message: data.message,
        self: false,
        chatroom: false,
        dateSent: data.dateSent
      });
      autoScrollById('roomMessagesBox');
    });
    socket.on('user:disconnected', function (data) {
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
        var newDate = new Date();
        socket.emit('send:private:message', {
          message: $scope.privateMessageInput[key],
          receiverId: key,
          dateSent: newDate
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
          chatroom: false,
          dateSent: newDate
        });
        autoScrollById(key);
      }
      // clear message box
      $scope.privateMessageInput[key] = '';
    };
    $scope.sendRoomMessage = function (key) {
      if($scope.roomMessageInput[key]!=='') {
        var newDate = new Date();
        socket.emit('send:room:message', {
          message: $scope.roomMessageInput[key],
          room: key,
          dateSent: newDate
        });
        // add the message to our model locally
        $rootScope.rooms[key].messages.push({
          senderName: $scope.currentUser.name,
          senderId: '',
          message: $scope.roomMessageInput[key],
          self: true,
          chatroom: false,
          dateSent: newDate
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
    $scope.usersListOption = 0;

    $scope.displayedUsersList = connectedUsers;

    $scope.changeUsersList = function (index) {
      if (index === 0 && $scope.usersListOption !== 0 ) {
        $scope.usersListOption = 0;
        $scope.displayedUsersList = connectedUsers;
      }
      else if (index === 1 && $scope.usersListOption !== 1 ) {
        $scope.usersListOption = 1;
        $scope.displayedUsersList = $rootScope.rooms[$rootScope.activeRooms[$scope.selectedActiveRoomIndex]].users
      }
    };
    
    /* reeimplementation of the filter function
    $scope.userNameFilter = '';
    $scope.filterFunction = function (user,index) {
      if ($scope.userNameFilter.length) {
        return (user.name.toLowerCase().search($scope.userNameFilter.toLowerCase()) === -1) ? false : true;
      }
      else return true;
    };
    */
  });