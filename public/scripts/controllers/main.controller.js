'use strict';

angular.module('chastle')
  .controller('mainCtrl', function ($scope,Auth,socket,$rootScope,User,$log,$timeout) {
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

    socket.reconnect();


    socket.on('init', function (rooms) {
      for (var room in rooms) {
        $rootScope.rooms[room] = {
          users: rooms[room].users,
          messages: [],
          userIsParticipating: false,
          gotNewMessage: false,
          newMessageCount: 0
        }
        $rootScope.roomsArrayToBeFiltered.push({'room':room, 'numberOfUsers':rooms[room].users.length});
      }
    });
    socket.on('reconnect', function (number) {
      $rootScope.activeRooms = [];
      socket.emit('need update',{});
      $log.log('reconnected after trying '+number+' times.');
    });

    socket.on('update', function (rooms) {
      var tempRooms = {};
      $rootScope.roomsArrayToBeFiltered = [];
      for (var room in rooms) {
        if(!$rootScope.rooms[room]) {
          tempRooms[room] = {
            users: rooms[room].users,
            messages: [],
            userIsParticipating: false,
            gotNewMessage: false,
            newMessageCount: 0
          };
        }
        else tempRooms[room] = {
          users: rooms[room].users,
          messages: $rootScope.rooms[room].messages,
          userIsParticipating: $rootScope.rooms[room].userIsParticipating,
          gotNewMessage: $rootScope.rooms[room].gotNewMessage,
          newMessageCount: $rootScope.rooms[room].newMessageCount
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
          isChatTabOpened:false,
          user: giveMeUserPublicProfileUsingId(data.senderId),
          newMessageCount: 0
        };
        $scope.privateMessageInput[data.senderId]='';
      }
      $rootScope.private[data.senderId].messages.push({
        senderName: data.senderName,
        message: data.message,
        self: false,
        chatroom: false,
        dateSent: data.dateSent,
        newMessage: !$rootScope.private[data.senderId].isChatTabOpened
      });
      if(!$rootScope.private[data.senderId].isChatTabOpened) {
        $rootScope.private[data.senderId].gotNewMessage = true;
        $rootScope.private[data.senderId].newMessageCount++;
      }
      $scope.autoScrollById(data.senderId);
    });
    socket.on('send:room:message', function (data) {
      var bool = (data.room !== $rootScope.activeRooms[$scope.selectedActiveRoomIndex]);
      $log.log(bool);
      $rootScope.rooms[data.room].messages.push({
        senderName: data.senderName,
        senderId: data.senderId,
        message: data.message,
        self: false,
        chatroom: false,
        dateSent: data.dateSent,
        newMessage: bool
      });
      if(data.room !== $rootScope.activeRooms[$scope.selectedActiveRoomIndex]) {
        $rootScope.rooms[data.room].gotNewMessage = true;
        $rootScope.rooms[data.room].newMessageCount++;
      }
      $scope.autoScrollById('room:'+data.room);
    });
    socket.on('user:disconnected', function (data) {
      if($rootScope.private[data.senderId]) {
        $rootScope.private[data.senderId].disabled = true;
        $rootScope.private[data.senderId].messages.push({
          senderName: 'Chastle',
          senderId: '#',
          message: data.senderName + ' has disconnected',
          self: false,
          chatroom: true
        });
      }
      //expand on this
    });
    socket.on('error', function (error) {
      $log.error(error);
      if (error.type == "UnauthorizedError" || error.code == "invalid_token") {
        // redirect user to login page perhaps?
        $log.log("User's token has expired");
      }
    });

    socket.noMoreEvents();

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
            senderName: giveMeUserPublicProfileUsingId(key),
            gotNewMessage: false,
            newMessageCount: 0
          }
        }
        $rootScope.private[key].messages.push({
          senderName: $scope.currentUser.name,
          senderId: undefined,
          message: $scope.privateMessageInput[key],
          self: true,
          chatroom: false,
          dateSent: newDate,
          newMessage: false
        });
        $scope.autoScrollById(key);
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
          dateSent: newDate,
          newMessage: false
        });
        $scope.autoScrollById('room:'+key);
      }

      // clear message box
      $scope.roomMessageInput[key] = '';
    };
    $scope.newRoom = '';
    $scope.joinRoom = function(room) {
      if (room === '') return;
      socket.emit('join:room', {room: room}, function() {
        if (!$rootScope.rooms[room] || !$rootScope.rooms[room].userIsParticipating ) {
          $rootScope.rooms[room] = {
            messages : [],
            userIsParticipating : true,
            gotNewMessage : false,
            newMessageCount: 0
          }
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
      $scope.autoScrollById('room:'+$rootScope.activeRooms[index]);
    };

    //More private helpers
    var giveMeUserPublicProfileUsingId = function(userId) {
      return User.show({id: userId});
    };
    $scope.autoScrollById = function(elementId) {
      $timeout(function(){
        if(document.getElementById(elementId)) {
          document.getElementById(elementId).scrollTop = document.getElementById(elementId).scrollHeight;
        }
      },0,false);
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
    $scope.cancelNewRoomMessage = function (room) {
      $log.log($rootScope.rooms[room]);
      $rootScope.rooms[room].gotNewMessage = false;
      $rootScope.rooms[room].newMessageCount = 0;
      $timeout(function() {
        if(!$rootScope.rooms[room]) return;
        for (var i = ($rootScope.rooms[room].messages.length-1); i > -1; i--) {
          if(!$rootScope.rooms[room].messages[i].newMessage) {
            $log.log('i = '+i);
            return;
          }
          $rootScope.rooms[room].messages[i].newMessage = false;
        }
      }, 5000, true);
      $log.log($rootScope.rooms[room]);
    };
    $scope.cancelNewPrivateMessage = function (_id) {
      $rootScope.private[_id].gotNewMessage = false;
      $rootScope.private[_id].newMessageCount = 0;
      $timeout(function() {
        if(!$rootScope.private[_id]) return;
        for (var i = ($rootScope.private[_id].messages.length-1); i > -1; i--) {
          if(!$rootScope.private[_id].messages[i].newMessage) return;
          $rootScope.private[_id].messages[i].newMessage = false;
        }
      },2000,true);
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