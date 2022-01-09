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
        const userData = JSON.parse(data);
        // console.log('socket userData = ', userData);
        const userName = userData.userName
        const uuid = userData.uuId
        // console.log('socket name = ', userName);
        // console.log('socket uuid = ', uuid);

        socket.userName = userName;
        socket.uuId = uuid;

        let userInfo = {
            uuId: uuid,
            userName: userName,
            client: socket,
            roomId: "",
            status: STATE_IDLE
        };
        onlineUsers.set(uuid, userInfo);

        socket.emit('user joined', {
            userName: userName,
            numUsers: onlineUsers.size
        });
        console.log('>>> USER Count <<<< = ', onlineUsers.size);
        for (let [key, value] of onlineUsers) {
            console.log('>>> name = ', value.userName);
        }
    });

    socket.on('searchUser', () => {
        // let user = onlineUsers.get(socket.uuId);
        if (onlineUsers.size == 0) return;
        try {
            searchUsers(socket);
        }catch (err) {
            console.log('[ERROR] = ', err);
        }
    });


    socket.on('roomLeave', (data) => {
        console.log('roomLeave');
        if (onlineUsers.size == 0) return;
        const userData = JSON.parse(data);
        socket.leave(userData.roomId);
        const user = onlineUsers.get(userData.uuId);
        user.status = STATE_IDLE;
    });

    socket.on('sendMsg', (data) => {
        console.log('sendMsg = ', data);
        const userMessage = JSON.parse(data);
        console.log('msg = ', userMessage.msg);
        socket.broadcast.emit('chat message', data);
    });

    socket.on('disconnect', async () => {
        console.log('user disconnected');
        onlineUsers.delete(socket.uuId)
    });

});

function searchUsers(socket) {
    return new Promise((resolve, reject) => {
        try {
            let user = onlineUsers.get(socket.uuId);
            user.status = STATE_FINDING
            let count = 0;
            var interval = setInterval(function() {

                if (user.status == STATE_IN_ROOM) {
                    clearInterval(interval);
                }
                if (count > 9) {
                    user.status = STATE_IDLE;
                    socket.emit("user not searched")
                    clearInterval(interval);
                }
                for (let [key, value] of onlineUsers) {
                    // console.log('search key=', key, " value=" , value);
                    if (key == socket.uuId || value.status != STATE_FINDING) {
                        continue;
                    }
                    console.log("found user key=", key)
                    const roomId = new Date().getTime()+"";
                    value.status = STATE_IN_ROOM;
                    value.roomId = roomId;
                    value.client.join(roomId);
                    user.status = STATE_IN_ROOM
                    user.client.join(roomId);
                    // socket.emit("user searched")

                    const me = {
                        uuId: socket.uuId,
                        userName: socket.userName,
                        roomId: roomId
                    }
                    const you = {
                        uuId: value.uuId,
                        userName: value.userName,
                        roomId: roomId
                    }
                    io.to(socket.id).emit("user searched", {
                        userMe: me,
                        userYou: you
                    });
                    io.to(value.client.id).emit("user searched", {
                        userMe: you,
                        userYou: me
                    });
                    // io.sockets.to(roomId).emit("user searched", data);
                    clearInterval(interval);
                    break;
                }
                count++;
            }, 1000);

        }
        catch (error) {
            console.log('>> searchUsers error ', error)
            throw error; 
        }
    });
}

// TEST CODE GOES HERE
// (async function(){
// })();



// http.listen(3000, () => {
//     console.log('Connected at 3000');
// });