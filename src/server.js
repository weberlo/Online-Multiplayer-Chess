const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')

var Chess = require('chess.js').Chess;

const app = express()
const server = http.createServer(app)
const io = socketio(server, {
    pingTimeout: 10000000,
    pingInterval: 1000000
})

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

// const Data = new Map()
const gameData = new Map()
const userData = new Map()
const roomsList = new Set()

let totalUsers = 0;

let roomPlayerCounters = {};
let socketIdToPlayer = {};

//Getting a connection
io.on('connection', (socket) => {
    totalUsers++;
    // console.log(totalUsers)
    //To render rooms list initially
    io.emit('roomsList', Array.from(roomsList));
    io.emit('updateTotalUsers', totalUsers)
    const updateStatus = (game, room) => {
        console.log('about to update game status')
        // checkmate?
        if (game.in_checkmate()) {
            io.to(room).emit('gameOver', game.turn(), true)
            console.log('gameOver checkmate with player turn == ', game.turn())
        }
        // draw?
        else if (game.in_draw()) {
            io.to(room).emit('gameOver', game.turn(), false)
            console.log('gameOver draw with player turn == ', game.turn())
        }
        // game still on
        else {
            if (game.in_check()) {
                io.to(room).emit('inCheck', game.turn())
                console.log('inCheck with player turn == ', game.turn())
            }
            else {
                io.to(room).emit('updateStatus', game.turn())
                console.log('updateStatus with player turn == ', game.turn())
            }
        }
    }

    //Creating and joining the room
    socket.on('joinRoom', ({ user, room }, callback) => {
        const NUM_PLAYERS = Chess().NUM_PLAYERS;
        console.log("playing", NUM_PLAYERS, "player game")

        //We have to limit the number of users in a room to be just NUM_PLAYERS
        if (io.nsps['/'].adapter.rooms[room] && io.nsps['/'].adapter.rooms[room].length === NUM_PLAYERS) {
            return callback(`Already ${NUM_PLAYERS} users are there in the room!`)
        }

        var alreadyPresent = false
        for (var x in userData) {
            if (userData[x].user == user && userData[x].room == room) {
                alreadyPresent = true
            }
        }
        // console.log(userData);
        //If same name user already present
        if (alreadyPresent) {
            return callback('Choose different name!')
        }

        socket.join(room)
        //Rooms List Update
        roomsList.add(room);
        io.emit('roomsList', Array.from(roomsList));
        totalRooms = roomsList.length
        io.emit('totalRooms', totalRooms)

        if (!(room in roomPlayerCounters)) {
            roomPlayerCounters[room] = 0;
            socketIdToPlayer = {};
        }
        let player = roomPlayerCounters[room];
        roomPlayerCounters[room]++;
        socketIdToPlayer[socket.id] = player;

        userData[user + "" + socket.id] = {
            room, user,
            id: socket.id,
            player,
        }

        if (io.nsps['/'].adapter.rooms[room]) {
            console.log(io.nsps['/'].adapter.rooms[room].length, "players in lobby");
        }

        //If NUM_PLAYERS users are in the same room, we can start
        if (io.nsps['/'].adapter.rooms[room].length === NUM_PLAYERS) {
            //Rooms List Delete
            roomsList.delete(room);
            io.emit('roomsList', Array.from(roomsList));
            totalRooms = roomsList.length
            io.emit('totalRooms', totalRooms)
            var game = new Chess()
            //For getting ids of the clients
            for (var x in io.nsps['/'].adapter.rooms[room].sockets) {
                gameData[x] = game
            }
            //For giving turns one by one
            io.to(room).emit('Dragging', socket.id)
            io.to(room).emit('DisplayBoard', game.currentPosition(), socket.id, socketIdToPlayer)
            updateStatus(game, room)
        }
    })

    // For catching dropped piece events
    socket.on('Dropped', ({ source, target, room }) => {
        var game = gameData[socket.id]
        let eventPlayer = socketIdToPlayer[socket.id];
        if (game.turn() == eventPlayer) {
            var move = game.move({
                from: source,
                to: target,
                promotion: 'q' // NOTE: always promote to a queen for example simplicity
            })
            if (move == null) {
                io.to(room).emit('print', `player ${eventPlayer} made an INVALID move`)
            } else {
                // If correct move, then toggle the turns
                io.to(room).emit('Dragging', socket.id)
                io.to(room).emit('print', `player ${eventPlayer} made a move`)
                io.to(room).emit('print', `it is now player ${game.turn()}'s turn`)
            }
        } else {
            io.to(room).emit('print', `player ${eventPlayer} attempted to move during player ${game.turn()}'s turn`)
        }

        // still update the board, even if no move was made on the server-side,
        // since the client-side won't correct itself on incorrect moves
        // TODO make the client-side correct itself
        io.to(room).emit('DisplayBoard', game.currentPosition(), undefined)
        updateStatus(game, room)
    })

    //Catching message event
    socket.on('sendMessage', ({ user, room, message }) => {
        io.to(room).emit('receiveMessage', user, message)
    })

    //Disconnected
    socket.on('disconnect', () => {
        totalUsers--;
        io.emit('updateTotalUsers', totalUsers)
        var room = '', user = '';
        for (var x in userData) {
            if (userData[x].id == socket.id) {
                room = userData[x].room
                user = userData[x].user
                delete userData[x]
            }
        }
        //Rooms Removed
        if (userData[room] == null) {
            //Rooms List Delete
            roomsList.delete(room);
            io.emit('roomsList', Array.from(roomsList));
            totalRooms = roomsList.length
            io.emit('totalRooms', totalRooms)
            if (room in roomPlayerCounters) {
                delete roomPlayerCounters[room]
            }
        }
        gameData.delete(socket.id)
        if (user != '' && room != '') {
            io.to(room).emit('disconnectedStatus');
        }
    })
})

server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})
