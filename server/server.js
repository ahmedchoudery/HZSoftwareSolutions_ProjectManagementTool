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

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ extended: false }));

// Attach IO to request to use in routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));

// Socket.io logic
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

// Serve static assets in production (or just for this simple setup)
app.use(express.static(path.join(__dirname, '../client')));

app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'index.html'));
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
