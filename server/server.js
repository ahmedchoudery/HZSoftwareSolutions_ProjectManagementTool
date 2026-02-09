const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');
const path = require('path');
const cors = require('cors');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);


connectDB();


app.use(cors());
app.use(express.json({ extended: false }));


app.use((req, res, next) => {
    req.io = io;
    next();
});


app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));


io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('joinProject', (projectId) => {
        socket.join(projectId);
        console.log(`Socket joined project: ${projectId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});


app.use(express.static(path.join(__dirname, '../client')));

app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'index.html'));
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
