const http = require("http");
const dotenv = require("dotenv");
const express = require("express");
const app = express();

dotenv.config();

const server = app.listen(
  process.env.PORT,
  console.log("Server is listening on port: ", process.env.PORT)
);
const cors = require("cors");
const io = require("socket.io").listen(server);
app.use(cors());
const rooms = ["general", "room1", "room2"];
let usernames = [];

io.on("connection", socket => {
  console.log(`connected user with id: ${socket.id}`);

  socket.on(
    "adduser",
    (username, currentRoom) => {
      let obj = {};
      obj["id"] = socket.id;
      obj["nickname"] = username;
      obj["room"] = currentRoom;
      usernames.push(obj);
      socket.room = "general";
      socket.join("general");
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
        let numClients = clients;
        let usersSocket = numClients;

        let filteredUsers = usernames.filter(item => {
          for (let i = 0; i <= usernames.length; i++) {
            let newArray = [];
            newArray.push(item.id == usersSocket[i]);
            return newArray;
          }
        });
        socket.emit("SEND_ROOM_SOCKET_USERS", filteredUsers);
      });
    }
  );

  // when the client emits 'sendchat' this listens and executes
  socket.on("switchRoom", (newroom, username) => {
    //leave the current room (stored in session)
    socket.leave(socket.room);
    // join new room, recieved as function parameter
    socket.join(newroom);
    //Find index of specific object using findIndex method.
    const userIndex = usernames.findIndex(user => user.nickname == username);
    usernames[userIndex].room = newroom;

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
  });

  socket.on("GET_ROOM_USERS", currentRoom => {
    io.in(currentRoom).clients(function(error, clients) {
      let usersSocket = clients;
      let filteredUsers = usernames.filter(item => {
        let newArray = [];
        for (let i = 0; i <= usernames.length; i++) {
          newArray.push(item.id == usersSocket[i]);
          return newArray;
        }
      });

      socket.emit("SEND_ROOM_SOCKET_USERS", filteredUsers);
    });
  });

  socket.on("disconnect", () => {
    //remove the username from< global usernames list
    delete usernames[socket.id];
    for (let i = 0; i < usernames.length; i++)
      if (usernames[i].id === socket.id) {
        usernames.splice(i, 1);
        break;
      }
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
  });

  socket.on("nottyping", data => {
    socket.broadcast.emit("nottyping", data);
  });

  socket.on("SEND_MESSAGE", function(data) {
    socket.to(data.currentRoom).emit("RECEIVE_MESSAGE", data);
  });
});
