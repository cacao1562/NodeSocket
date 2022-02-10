const express = require('express'); //requires express module
const socket = require('socket.io'); //requires socket.io module
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT);
const io = socket(server);
const multer = require("multer");

// app.get('/', (req, res) => {
//     res.sendFile(__dirname + '/index.html');
// });

let onlineUsers = new Map();

const STATE_IDLE = 1;
const STATE_FINDING = 2;
const STATE_IN_ROOM = 3;

const EMIT_EVENT_ADD_USER = "send add user";
const EMIT_EVENT_FIND_USERS = "send find users";
const EMIT_EVENT_STOP_FIND = "send stop find";
const EMIT_EVENT_MESSAGE = "send message";
const EMIT_EVENT_TYPING = "send typing";
const EMIT_EVENT_NOT_TYPING = "send not typing";
const EMIT_EVENT_EMOJI = "send emoji";
const EMIT_EVENT_LEAVE_ROOM = "send leave room";

const ON_EVENT_JOINED = "receive joined";
const ON_EVENT_USER_FOUND = "receive user found";
const ON_EVENT_USER_NOT_FOUND = "receive user not found";
const ON_EVENT_USER_COUNT = "receive user count";
const ON_EVENT_MESSAGE = "receive message";
const ON_EVENT_IMAGES = "receive images";
const ON_EVENT_TYPING = "receive typing";
const ON_EVENT_NOT_TYPING = "receive not typing";
const ON_EVENT_EMOJI = "receive emoji";
const ON_EVENT_LEAVE_ROOM = "receive leave room";

io.on('connection', (socket) => {
    // console.log('io connection');
    console.log('socket onlineUsers = ', onlineUsers);

    socket.on(EMIT_EVENT_ADD_USER, (data) => {
        const userData = JSON.parse(data);
        const userName = userData.userName
        const uuid = userData.uuId
        const shapeType = userData.shapeType

        socket.userName = userName;
        socket.uuId = uuid;
        socket.shapeType = shapeType;

        let userInfo = {
            uuId: uuid,
            userName: userName,
            client: socket,
            roomId: "",
            status: STATE_IDLE,
            shapeType: shapeType
        };
        onlineUsers.set(uuid, userInfo);

        socket.emit(ON_EVENT_JOINED);
    
        io.emit(ON_EVENT_USER_COUNT, onlineUsers.size);
    });

    socket.on(EMIT_EVENT_FIND_USERS, () => {
        if (onlineUsers.size == 0) return;
        try {
            let search = searchUsers(socket);
        }catch (err) {
            socket.emit(ON_EVENT_USER_NOT_FOUND)
            console.log('[ERROR] = ', err);
        }
    });


    socket.on(EMIT_EVENT_LEAVE_ROOM, (data) => {
        console.log('roomLeave');
        if (onlineUsers.size == 0) return;

        const userData = JSON.parse(data);
        if (userData) {
            const room = socket.adapter.rooms.get(userData.roomId)
            if (room) {
                console.log('room user size = ', room.size);
            }
            
            socket.leave(userData.roomId);
            const user = onlineUsers.get(userData.uuId);
            if (user) {
                user.status = STATE_IDLE;
            }
            socket.broadcast.emit(ON_EVENT_LEAVE_ROOM);
        }
        
    });

    socket.on(EMIT_EVENT_MESSAGE, (data) => {
        console.log('sendMsg = ', data);
        const userMessage = JSON.parse(data);
        console.log('msg = ', userMessage.msg);
        socket.broadcast.emit(ON_EVENT_MESSAGE, data);
    });

    socket.on(EMIT_EVENT_TYPING, async () => {
        socket.broadcast.emit(ON_EVENT_TYPING);
    });
    socket.on(EMIT_EVENT_NOT_TYPING, async () => {
        socket.broadcast.emit(ON_EVENT_NOT_TYPING);
    });
    socket.on(EMIT_EVENT_EMOJI, (data) => {
        console.log('send emoji', data);
        socket.broadcast.emit(ON_EVENT_EMOJI, data);
    });

    socket.on('disconnect', async () => {
        console.log('user disconnected');
        socket.broadcast.emit(ON_EVENT_LEAVE_ROOM);
        onlineUsers.delete(socket.uuId);
        io.emit(ON_EVENT_USER_COUNT, onlineUsers.size);
    });

    socket.on(EMIT_EVENT_STOP_FIND, () => {
        console.log('search stop');
        let user = onlineUsers.get(socket.uuId);
        if (user == undefined) return
        if (user.status == STATE_IN_ROOM) return
        user.status = STATE_IDLE;
    });

});

function searchUsers(socket) {
    return new Promise((resolve, reject) => {
        try {
            let user = onlineUsers.get(socket.uuId);
            if (user == undefined) return
            user.status = STATE_FINDING
            let count = 0;
            var interval = setInterval(function() {
                if (user.status != STATE_FINDING) {
                    clearInterval(interval);
                }
                if (count > 9) {
                    user.status = STATE_IDLE;
                    socket.emit(ON_EVENT_USER_NOT_FOUND)
                    clearInterval(interval);
                }
                for (let [key, value] of onlineUsers) {
                    if (key == socket.uuId || value.status != STATE_FINDING) {
                        continue;
                    }
                    const roomId = new Date().getTime()+"";
                    value.status = STATE_IN_ROOM;
                    value.roomId = roomId;
                    value.client.join(roomId);
                    user.status = STATE_IN_ROOM;
                    user.client.join(roomId);

                    const me = {
                        uuId: socket.uuId,
                        userName: socket.userName,
                        roomId: roomId,
                        shapeType: socket.shapeType
                    }
                    const you = {
                        uuId: value.uuId,
                        userName: value.userName,
                        roomId: roomId,
                        shapeType: value.shapeType
                    }
                    io.to(socket.id).emit(ON_EVENT_USER_FOUND, {
                        userMe: me,
                        userYou: you
                    });
                    io.to(value.client.id).emit(ON_EVENT_USER_FOUND, {
                        userMe: you,
                        userYou: me
                    });
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

// file size 5 MB 제한 
const upload = multer({ dest: 'uploads/', limits: { fileSize: 5 * 1024 * 1024 } });


app.get('/uploads/:upload', function(req, res) {
    var file = req.params.upload;
    console.log(file);
    var img = fs.readFileSync(__dirname + "/uploads/" + file);
    res.writeHead(200, {'Content-Type': 'image/png'});
    res.end(img, 'binary');
});

// image라는 폴더경로로 node서버에 있는 uploads폴더 매핑
// 클라이언트에서는 uploads로 접근못하고 image로 접근하도록
app.use('/image', express.static('./uploads'));
app.post('/uploadImg', upload.array('upload', 3), async (req, res, next) => {
    try {
        const roomId = req.body.roomId;
        const uuId = req.body.uuId;
        const date = req.body.date;
        console.log('upload roomId = ', roomId);
        console.log('upload uuId = ', uuId);
        console.log('upload date = ', date);
        var pathList = []
        for (var img of req.files) {
            console.log('upload path = ', img.path);
            console.log('upload filename = ', img.filename);
            pathList.push(img.filename);
        }
        if (req.files) {
            console.log('upload pathList = ', pathList);
            res.status(200).send({
                state: 200,
                imgPath: pathList
            });
            io.to(`${req.body.roomId}`).emit(ON_EVENT_IMAGES, {
                uuId: req.body.uuId,
                date: date,
                imageNames: pathList
            });
        }
    }catch(error) {
        console.error(error);
        next(error);
    }    
});