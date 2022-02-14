const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT);

const socketIO = require('./socket');
socketIO(server, app);
const upload = require('./upload');
app.use('/', upload);