'use strict';

const socketIo = require('socket.io');

class ChatServer {
    constructor(port) {
        this._port = port;
    }

    start() {
        this._initializeSocketIo();

        console.log('Server is up and running');
    }

    _initializeSocketIo() {
        this._io = socketIo(this._port);

        this._io.on('connection', socket => {
            console.log('New chatter');
            socket.room = '';
            socket.name = '';

            socket.on('join-room', msg => this._joinRoom(socket, msg));
            socket.on('change-name', name => {
                socket.name = name;
                this._sendAllChattersInRoom(socket.room);
            });

            socket.on('message', message => this._io.in(socket.room).emit('message', {
                from: socket.name,
                message: message
            }));
        });
    }

    _joinRoom(socket, roomName) {
        console.log(socket.name, 'changes room from', socket.room, 'to', roomName);

        if (socket.room) {
            socket.leave(socket.room, () => {
                this._io.in(socket.room).emit('chatter-left', socket.name);
                this._internalJoinRoom(socket, roomName);
            });

            return;
        }

        this._internalJoinRoom(socket, roomName)
    }

    _internalJoinRoom(socket, roomName) {
        socket.join(roomName, () => {
            socket.room = roomName;
            this._io.in(socket.room).emit('chatter-joined', socket.name);
            this._sendRooms();
            this._sendAllChattersInRoom(socket.room);
        });
    }

    _sendRooms() {
        const rooms = {};

        Object.keys(this._io.sockets.connected).forEach(socketId => {
            const socket = this._io.sockets.connected[socketId];

            if (socket.room) {
                rooms[socket.room] = '';
            }
        });

        this._io.sockets.emit('rooms', Object.keys(rooms));
    }

    _sendAllChattersInRoom(roomName) {
        var room = this._io.sockets.adapter.rooms[roomName];

        if (!room) {
            return;
        }

        const chatters = {};

        Object.keys(room.sockets).forEach(socketId => {
            const socket = this._io.sockets.connected[socketId];

            if (socket.name) {
                chatters[socket.name] = '';
            }
        });

        this._io.sockets.in(roomName).emit('chatters', Object.keys(chatters));
    }
}

const server = new ChatServer(8081);
server.start();
