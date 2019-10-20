var express = require("express");
var socket = require("socket.io");

var app = express();
var PORT = 5000;
server = app.listen(PORT, function() {
  console.log(`server is running on port ${PORT}`);
});

var rooms = ["general", "room1", "room2"];
var usernames = [];

io = socket(server);
io.origins("*:*");

io.on("connection", socket => {
  console.log(`connected user with id: ${socket.id}`);
  // io.in("general").clients(function(error, clients) {
  //   var numClients = clients;
  //   console.log(numClients);
  // });

  socket.on(
    "adduser",
    (username, currentRoom) => {
      let obj = {};
      obj["id"] = socket.id;
      obj["nickname"] = username;
      obj["room"] = currentRoom;
      usernames.push(obj);
      // usernames[String(socket.id)] = username;

      console.log(usernames);
      console.log("USERNAMES: ", usernames);
      console.log(username);
      socket.room = "general";
      socket.join("general");
      // usernames[String(username)] = socket.id;
      //echo to client they've connected
      socket.emit(
        "updatechat",
        "SERVER",
        "you have connected to general room."
      );
      // echo to general that a person has connected to their room
      socket.broadcast
        .to("general")
        .emit(
          "updatechat",
          "SERVER",
          username + " has connected to this room."
        );
      socket.emit("updaterooms", rooms, "general");
    },
    () => {
      io.in(currentRoom).clients(function(error, clients) {
        var numClients = clients;
        console.log(clients);
        console.log("numclients aduser: ", numClients);
        let usersSocket = numClients;

        let filteredUsers = usernames.filter(item => {
          for (let i = 0; i <= usernames.length; i++) {
            let newArray = [];
            newArray.push(item.id == usersSocket[i]);
            return newArray;
          }
        });
        console.log("FILTERED TABLE: ", filteredUsers);
        socket.emit("SEND_ROOM_SOCKET_USERS", filteredUsers);
      });
    }
  );

  // when the client emits 'sendchat' this listens and executes
  socket.on("switchRoom", (newroom, username) => {
    //leave the current room (stored in session)
    socket.leave(socket.room);
    // join new room, recieved as function parameter
    console.log(usernames);
    socket.join(newroom);
    //Find index of specific object using findIndex method.
    const userIndex = usernames.findIndex(user => user.nickname == username);
    usernames[userIndex].room = newroom;
    console.log("USERNAMES AFTER UPDATEEEEE: ", usernames);

    socket.emit(
      "updatechat",
      "SERVER",
      socket.username + " has left this room."
    );
    //update socket session room title
    socket.room = newroom;
    socket.broadcast
      .to(newroom)
      .emit("updatechat", "SERVER", socket.username + " has joined this room.");
    socket.emit("updaterooms", rooms, newroom);
    socket.broadcast.to(newroom).emit("GET_ROOM_USERS", newroom);
    // console.log(io.sockets.clients("general"));
  });

  socket.on("GET_ROOM_USERS", currentRoom => {
    io.in(currentRoom).clients(function(error, clients) {
      let usersSocket = clients;
      console.log("users Socket: ", usersSocket);
      let filteredUsers = usernames.filter(item => {
        let newArray = [];
        for (let i = 0; i <= usernames.length; i++) {
          newArray.push(item.id == usersSocket[i]);
          console.log("newArray", newArray);
          return newArray;
        }
      });

      socket.emit("SEND_ROOM_SOCKET_USERS", filteredUsers);
      console.log("FILTERED TABLE: ", filteredUsers);
    });
    // io.in(currentRoom).clients(function(error, clients) {
    //   let usersSocket = clients;
    //   console.log("users Socket: ", usersSocket);
    //   let filteredUsers = [];
    //   filteredUsers = usernames.filter(item => {
    //     console.log(item.room == currentRoom);
    //     return item.room == currentRoom;
    //   });
    //   socket.emit("SEND_ROOM_SOCKET_USERS", filteredUsers);
    //   console.log("FILTERED TABLE: ", filteredUsers);
    // });
    console.log(`after get room users back`);
  });

  socket.on("disconnect", () => {
    console.log(`disonnected user with id: ${socket.id}`);
    //remove the username from< global usernames list
    delete usernames[socket.id];
    for (var i = 0; i < usernames.length; i++)
      if (usernames[i].id === socket.id) {
        usernames.splice(i, 1);
        break;
      }
    console.log(usernames);
    //update list of users in chat, client-side
    io.sockets.emit("updateusers", usernames);
    //echo globally that this client has left
    socket.broadcast.emit(
      "updatechat",
      "SERVER",
      socket.username + " has disconnected."
    );
    socket.leave(socket.room);
  });

  socket.on("typing", data => {
    socket.broadcast.emit("typing", data.currentRoom);
    console.log("pisze");
    console.log(data);
    console.log(socket.id);
    console.log(socket.rooms);
    //checking length of users to know if users are in the same room
    // io.in(data.currentRoom).clients(function(error, clients) {
    //   var numClients = clients.length;
    //   var testClients = clients;
    //   console.log(numClients);
    //   console.log(testClients);
    // });
  });

  socket.on("nottyping", data => {
    socket.broadcast.emit("nottyping", data);
    console.log("nie pisze");
  });

  socket.on("SEND_MESSAGE", function(data) {
    console.log(data);
    socket.to(data.currentRoom).emit("RECEIVE_MESSAGE", data);
  });
});
