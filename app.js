// const app = require('express')();
// const http = require('http').createServer(app);
// const io = require('socket.io')(http);

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

io.on('connection', (socket)=>{
    // console.log('io connection');

    socket.on('addUser', (userName) => {
        // response_message로 접속중인 모든 사용자에게 msg 를 담은 정보를 방출한다.
        // io.emit('response_message', msg);
        console.log('socket add user = ', userName);
        socket.username = userName;
        ++numUsers;
        socket.emit('user joined', {
            username: socket.username,
            numUsers: numUsers
          });

    });
    socket.on('disconnect', async () => {
        console.log('user disconnected');
    });
});


// TEST CODE GOES HERE
// (async function(){
// })();



// http.listen(3000, () => {
//     console.log('Connected at 3000');
// });