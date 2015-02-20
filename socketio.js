/**
 * Socket.io configuration
 */

 'use strict';

 var config = require('./config/environment');
 var User = require('./api/user/user.model');

 var rooms = (function() {
  var rooms = {};

  //private helper
  var findUserIndexInUsers = function (room,user) {
    for (var i = 0; i < rooms[room].users.length; i++) {
      if (rooms[room].users[i]._id === user._id) {
        return i;
      }
    }
    return -1;
  }

  var get = function () {
    return rooms;
  };

  var joinRoom = function(room,user) {
    if (!rooms[room]) {
      rooms[room] = {};
      rooms[room].users = [user];
    } else if ( findUserIndexInUsers(room,user) === -1){
      rooms[room].users.push(user);
    } 
  };
  var leaveRoom = function(room,user) {
    var index = findUserIndexInUsers(room,user);
    if(index > -1 ) {
      rooms[room].users.splice(index,1);
    }
    if (rooms[room].users.length === 0) delete rooms[room];
  };

  return {
    get: get,
    joinRoom: joinRoom,
    leaveRoom: leaveRoom
  };
}());

// When the user disconnects.. perform this
function onDisconnect(socket) {
  User.findById(socket.decoded_token._id, function (err, user) {
    if (err) return console.log(err);
    if (!user) return console.log('user not found');
    user.online = false;
    user.save(function(err) {
      if (err) console.log(err);
    });
  });
  for (var i = 0; i < socket.joinedRooms.length; i++) {
    socket.to(socket.joinedRooms[i]).emit('left:room', {
        //senderId: socket.decoded_token._id,
        senderName: socket.decoded_token.name,
        room: socket.joinedRooms[i]
      });
    rooms.leaveRoom(socket.joinedRooms[i],{_id:socket.decoded_token._id,name:socket.decoded_token.name});
    socket.broadcast.emit('update', rooms.get());

  }
  for (var j = 0; j < socket.activePrivateChatUsersID.length; j++) {
    socket.to(socket.activePrivateChatUsersID[j]).emit('user:disconnected', {
      senderId: socket.decoded_token._id,
      senderName: socket.decoded_token.name
    });
  }
}

// When the user connects.. perform this
function onConnect(socket) {
  //implementation starts here
  User.findById(socket.decoded_token._id, function (err, user) {
    if (err) return console.log(err);
    if (!user) return console.log('user not found');
    user.online = true;
    user.save(function(err) {
      if (err) console.log(err);
    });
  });
  socket.join(socket.decoded_token._id);
  socket.emit('init', rooms.get());

  socket.on('need update',function() {
    socket.emit('update', rooms.get());
  });

  socket.on('join:room', function (data,cb) { 
    var index = socket.joinedRooms.indexOf(data.room);
    if (index === -1) {
      cb();
      socket.join(data.room);
      socket.joinedRooms.push(data.room);
      rooms.joinRoom(data.room,{_id:socket.decoded_token._id,name:socket.decoded_token.name});
      socket.emit('update',rooms.get());
      socket.broadcast.emit('update',rooms.get());
      socket.broadcast.to(data.room).emit('joined:room', {
        //senderId: socket.decoded_token._id,
        senderName: socket.decoded_token.name,
        room: data.room
      });
    }
  });
  socket.on('leave:room', function (data,cb) {
    var index = socket.joinedRooms.indexOf(data.room);
    if (index !== -1) {
      cb();
      socket.leave(data.room);
      socket.joinedRooms.splice(index,1);
      rooms.leaveRoom(data.room,{_id:socket.decoded_token._id,name:socket.decoded_token.name});
      socket.emit('update',rooms.get());
      socket.broadcast.emit('update',rooms.get());
      socket.to(data.room).emit('left:room', {
        //senderId: socket.decoded_token._id,
        senderName: socket.decoded_token.name,
        room: data.room
      });
    }
  });

  socket.on('send:private:message',function (data,cb) {
    socket.broadcast.to(data.receiverId).emit('send:private:message', {
      senderId: socket.decoded_token._id,
      senderName: socket.decoded_token.name,
      message: data.message,
      dateSent: data.dateSent
    });
    if(socket.activePrivateChatUsersID.indexOf(data.receiverId) === -1) {
      socket.activePrivateChatUsersID.push(data.receiverId);
    }
  });

  socket.on('send:room:message',function (data,cb) {
    socket.to(data.room).emit('send:room:message', {
      senderId: socket.decoded_token._id,
      senderName: socket.decoded_token.name,
      message: data.message,
      room: data.room,
      dateSent: data.dateSent
    });
  });

  socket.on('started typing',function (data) {
    console.log('started typing');
    socket.to(data.receiverId).emit('started typing',{
      senderId: socket.decoded_token._id,
      senderName: socket.decoded_token.name,
      type: data.type
    });
  });
  socket.on('stopped typing',function (data) {
    console.log('stopped typing');
    socket.to(data.receiverId).emit('stopped typing',{
      senderId: socket.decoded_token._id,
      senderName: socket.decoded_token.name,
      type: data.type
    });
  });
}

module.exports = function (socketio) {

  socketio.use(require('socketio-jwt').authorize({
    secret: config.secrets.session,
    handshake: true
  }));

  socketio.on('connection', function (socket) {

    socket.address = socket.handshake.address !== null ?
    socket.handshake.address.address + ':' + socket.handshake.address.port :
    process.env.DOMAIN;

    socket.connectedAt = new Date();
    socket.joinedRooms = [];
    socket.activePrivateChatUsersID = [];

    // Call onDisconnect.
    socket.on('disconnect', function () {
      onDisconnect(socket);
      console.info('[%s] DISCONNECTED', socket.address);
    });

    // Call onConnect.
    onConnect(socket);
    console.info('[%s] CONNECTED', socket.address);
  });
};