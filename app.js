const express = require('express'); //requires express module
const socket = require('socket.io'); //requires socket.io module
const fs = require('fs');
const app = express();
var PORT = process.env.PORT || 3000;
const server = app.listen(PORT);
const io = socket(server);


// app.get('/', (req, res) => {
//     res.sendFile(__dirname + '/index.html');
// });

let numUsers = 0;

let users = [];

let onlineUsers = new Map();

const STATE_IDLE = 1;
const STATE_FINDING = 2;
const STATE_IN_ROOM = 3;

io.on('connection', (socket) => {
    // console.log('io connection');
    console.log('socket onlineUsers = ', onlineUsers);

    socket.on('addUser', (data) => {
        // response_message로 접속중인 모든 사용자에게 msg 를 담은 정보를 방출한다.
        // io.emit('response_message', msg);
        console.log('socket addUser = ', data);
        const userName = data.userName
        const uuid = data.uuid
        console.log('socket name = ', userName);
        console.log('socket uuid = ', uuid);

        socket.userName = userName;
        socket.uuid = uuid;

        ++numUsers;
        users.push({
            name: userName,
            client: socket,
            roomName: "",
            status: STATE_IDLE
        });
        let userInfo = {
            name: userName,
            client: socket,
            roomName: "",
            status: STATE_IDLE
        };
        onlineUsers.set(uuid, userInfo);

        socket.emit('user joined', {
            userName: userName,
            numUsers: numUsers
        });

    });

    socket.on('searchUser', () => {
        console.log('search uuid ', socket.uuid);
        let user = onlineUsers.get(socket.uuid);
        console.log('search user status before = ', user.status);
        onlineUsers.get(socket.uuid).status = STATE_FINDING
        console.log('search user status after = ', user.status);

        for (let [key, value] of onlineUsers) {
            console.log('search key=', key, " value=" , value);
        }
        socket.emit("user searched")
    });

    socket.on('disconnect', async () => {
        console.log('user disconnected');
        onlineUsers.delete(socket.uuid)
    });

});


// TEST CODE GOES HERE
// (async function(){
// })();



// http.listen(3000, () => {
//     console.log('Connected at 3000');
// });