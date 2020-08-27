const formEl = document.querySelectorAll('#joinForm > div > input')
const joinButtonEl = document.querySelector('#joinButton')
const messageEl = document.querySelector('#message')
const statusEl = document.querySelector('#status')
const remainingPlayersEl = document.querySelector('#remaining_players')
const ChatEl = document.querySelector('#chat')
const sendButtonEl = document.querySelector('#send')
const roomsListEl = document.getElementById('roomsList');
const myAudioEl = document.getElementById('myAudio');
const singlePlayerEl = document.getElementById('singlePlayer');
const multiPlayerEl = document.getElementById('multiPlayer');
const totalRoomsEl = document.getElementById('rooms')
const totalPlayersEl = document.getElementById('players')
const chatContentEl = document.getElementById('chatContent')

let config = {};
let board = null;
let game = new Chess()
let playerToName = null;

function getPlayerId(player) {
    if (playerToName == null) {
        return `Player ${player}`
    } else {
        console.assert(player in playerToName)
        return playerToName[player]
    }
}

// initializing semantic UI dropdown
$('.ui.dropdown')
    .dropdown();


// function for defining onchange on dropdown menus
$("#roomDropdown").dropdown({
    onChange: function (val) {
        console.log(val)
        console.log('running the function')
        formEl[1].value = val
    }
});

function onDragStart(source, piece, position, orientation) {
    if (piece[1] != board.player()) return false
}

function makeRandomMove() {
    let possibleMoves = game.moves()

    // game over
    if (possibleMoves.length === 0) {
        return false;
    }

    var randomIdx = Math.floor(Math.random() * possibleMoves.length)
    makeMove(possibleMoves[randomIdx])
}

function squareAsArr(square) {
    // NOTE for whatever reason, the map is generating a NaN, so we unfold
    // it manually below
    // move.from = move.from.split('-').map(parseInt);
    let arr = square.split('-');
    arr[0] = parseInt(arr[0]);
    arr[1] = parseInt(arr[1]);
    return arr;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeMove(move) {
    // see if the move is legal
    let turn = game.turn()
    let move_res = game.move(move)
    if (turn != board.player()) {
        // don't need to update the board if we're the one who made the move
        console.log('updating board position')
        board.position(game.currentPosition(), true, move);
    }
    myAudioEl.play().catch(function() {
        console.log("couldn't play move tone")
    });
    update();
    return move_res
}

function onDropCommon(source, target) {
    source = squareAsArr(source);
    target = squareAsArr(target);

    return makeMove({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    })
}

async function makeCpuMovesSp() {
    while (0 in game.remaining_players() && game.turn() !== 0 && !game.game_over()) {
        // make random legal move for other players
        await sleep(150);
        makeRandomMove();
    }
}

function onDropSp(source, target) {
    if (onDropCommon(source, target) === null) {
        // illegal move
        return 'snapback'
    }
    removeGreySquares()
    makeCpuMovesSp()

}

const whiteSquareGrey = '#a9a9a9'
const blackSquareGrey = '#696969'

function removeGreySquares () {
  $('#myBoard .square-55d63').css('background', '')
}

function greySquare (square) {
  var $square = $('#myBoard .square-' + square)

  var background = whiteSquareGrey
  if ($square.hasClass('black-3c85d')) {
    background = blackSquareGrey
  }

  $square.css('background', background)
}

function onMouseoverSquare(square, piece) {
    if (game.turn() != board.player() || piece[1] != board.player()) return

    let [row, col] = squareAsArr(square)
    let moves = game.moves_single(game.turn(), row, col, /* legal */ true)
    // highlight the square they moused over
    greySquare(square)

    // highlight the possible squares for this piece
    for (let i = 0; i < moves.length; i++) {
        let [row, col] = moves[i].to
        greySquare(row + '-' + col)
    }
}

function onMouseoutSquare (square, piece) {
    removeGreySquares()
}

singlePlayerEl.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('gameMode').style.display = "none";
    document.querySelector('#chessGame').style.display = null;
    document.getElementById('statusPGN').style.display = null
    config = {
        draggable: true,
        position: 'start',
        player: 0,
        onDragStart: onDragStart,
        onDrop: onDropSp,
        onMouseoverSquare: onMouseoverSquare,
        onMouseoutSquare: onMouseoutSquare,
    }
    board = Chessboard('myBoard', config);
    update()
})

//Connection will be established after webpage is refreshed
const socket = io()

//Triggers after a piece is dropped on the board
function onDropMp(source, target) {
    let move = onDropCommon(source, target)
    if (move === null) {
        // illegal move
        return 'snapback'
    }
    removeGreySquares()

    // emits event after piece is dropped
    let room = formEl[1].value;
    socket.emit('MakeMove', { move, room })
}

socket.on('print', (msg) => {
    console.log(msg)
})

function genPlayerImgHtml(player, size='25px', style='') {
  return `<img src='img/chesspieces/${player}/k.png' width='${size}' height='${size}' style='${style}' />`
}

function updateRemainingPlayers(remainingPlayers) {
    let remPlayersHtml = remainingPlayers.map(
        player => genPlayerImgHtml(player, '30px'))
        .join(', ');
    remainingPlayersEl.innerHTML = remPlayersHtml
}

// set up board
socket.on('SetupBoard', (socketIdToPlayer, _playerToName) => {
    messageEl.textContent = 'Match Started!! Best of Luck...'
    playerToName = _playerToName
    config.player = socketIdToPlayer[socket.id];
    console.log('assigned player id ', config.player)
    document.getElementById('joinFormDiv').style.display = "none";
    document.querySelector('#chessGame').style.display = null
    ChatEl.style.display = null
    document.getElementById('statusPGN').style.display = null

    // config.position = position
    // if (turn == config.player) {
    //     config.draggable = true;
    // } else {
    //     config.draggable = false;
    // }
    board = ChessBoard('myBoard', config)
    update()

    // if (typeof remainingPlayers !== 'undefined') {
    //     updateRemainingPlayers(remainingPlayers)
    // }
})

function update() {
    let turn = game.turn()

    if (turn == board.player()) {
        board.set_draggable(true)
    } else {
        board.set_draggable(false)
    }

    let res;
    if (game.in_check()) {
        if (turn == board.player()) {
            res = "You are in check!"
        }
        else {
            res = getPlayerId(turn) + " is in check!"
        }
        res += ' (' + genPlayerImgHtml(turn, '25px', 'margin-bottom: -5px;') + ')';
    } else {
        if (turn == board.player()) {
            res = "Your turn";
        }
        else {
            res = getPlayerId(turn) + "'s turn";
        }
        res += ' (' + genPlayerImgHtml(turn, '25px', 'margin-bottom: -5px;') + ')';
    }
    statusEl.innerHTML = res;

    updateRemainingPlayers(game.remaining_players())

    let players = game.remaining_players()
    if (players.length === 1 && players[0] === board.player()) {
        alert('You won!')
        return false
    } else if (players.indexOf(board.player()) === -1) {
        alert('You lost!')
        return false
    } else if (game.in_stalemate()) {
        alert('You lost by stalemate!')
        return false
    }

}

socket.on('MakeMove', (player, move) => {
    console.log(`receiving MakeMove (player = ${player}; move = ${move})`)
    // if it's this player's turn, then they've already made the move locally
    if (player !== board.player()) {
        console.assert(makeMove(move))
    }
})

//If win or draw
socket.on('gameOver', (turn, win) => {
    debugger;
    config.draggable = false;
    if (win) {
        if (turn == board.player()) {
            statusEl.innerHTML = "Congratulations, you won!!"
        } else {
            statusEl.innerHTML = "You lost, better luck next time :)"
        }
    } else {
        statusEl.innerHTML = 'Game Draw'
    }
})

//Client disconnected in between
socket.on('disconnectedStatus', () => {
    alert('Opponent left the game!!')
    messageEl.textContent = 'Opponent left the game!!'
})

//Receiving a message
socket.on('receiveMessage', (user, message) => {
    var chatContentEl = document.getElementById('chatContent')
    //Create a div element for using bootstrap
    chatContentEl.scrollTop = chatContentEl.scrollHeight;
    var divEl = document.createElement('div')
    if (formEl[0].value == user) {
        divEl.classList.add('myMessage');
        divEl.textContent = message;
    }
    else {
        divEl.classList.add('youMessage');
        divEl.textContent = message;
        document.getElementById('messageTone').play().catch(function() {
            console.log("couldn't play message tone")
        });
    }
    var style = window.getComputedStyle(document.getElementById('chatBox'));
    if (style.display === 'none') {
        document.getElementById('chatBox').style.display = 'block';
    }
    chatContentEl.appendChild(divEl);
    divEl.focus();
    divEl.scrollIntoView();

})

//Rooms List update
socket.on('roomsList', (rooms) => {
    // roomsListEl.innerHTML = null;
    // console.log('Rooms List event triggered!! ',  rooms);
    totalRoomsEl.innerHTML = rooms.length
    var dropRooms = document.getElementById('dropRooms')
    while (dropRooms.firstChild) {
        dropRooms.removeChild(dropRooms.firstChild)
    }
    // added event listener to each room
    rooms.forEach(x => {
        var roomEl = document.createElement('div')
        roomEl.setAttribute('class', 'item')

        roomEl.setAttribute('data-value', x)
        roomEl.textContent = x;
        dropRooms.appendChild(roomEl)
    })
})

socket.on('updateTotalUsers', totalUsers => {
    console.log('total users now', totalUsers)
    totalPlayersEl.innerHTML = totalUsers;
})

//Message will be sent only after you click the button
sendButtonEl.addEventListener('click', (e) => {
    e.preventDefault()
    var message = document.querySelector('#inputMessage').value
    var user = formEl[0].value
    var room = formEl[1].value

    // prepend user name on message
    message = user + ': ' + message;

    document.querySelector('#inputMessage').value = ''
    document.querySelector('#inputMessage').focus()
    socket.emit('sendMessage', { user, room, message })
})

//Connect clients only after they click Join
joinButtonEl.addEventListener('click', (e) => {
    e.preventDefault()

    var user = formEl[0].value, room = formEl[1].value

    if (!user || !room) {
        messageEl.textContent = "Input fields can't be empty!"
    }
    else {
        joinButtonEl.setAttribute("disabled", "disabled");
        formEl[0].setAttribute("disabled", "disabled")
        document.querySelector('#roomDropdownP').style.display = 'none';
        formEl[1].setAttribute("disabled", "disabled")
        //Now Let's try to join it in room // If users more than 2 we will
        socket.emit('joinRoom', { user, room }, (error) => {
            messageEl.textContent = error
            if (alert(error)) {
                window.location.reload()
            }
            else    //to reload even if negative confirmation
                window.location.reload();
        })
        messageEl.textContent = "Waiting for other player to join"
    }
})

multiPlayerEl.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('joinFormDiv').style.display = "block";
    document.getElementById('gameMode').style.display = "none";
    //Server will create a game and clients will play it
    //Clients just have to diaplay the game
    config = {
        draggable: false,   //Initially
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDropMp,
        onMouseoverSquare: onMouseoverSquare,
        onMouseoutSquare: onMouseoutSquare,
    }
    // var board = ChessBoard('myBoard', config)
})

// const BLACK_BG = "#E1E1E1"
// const WHITE_BG = "#FFFFFF"

// const BLACK_BG = "#D18B47"
// const WHITE_BG = "#FFCE9E"

// const applyColorScheme = (black, white) => {
//     const blackEl = document.querySelectorAll('.black-3c85d');
//     for (var i = 0; i < blackEl.length; i++) {
//         blackEl[i].style.backgroundColor = BLACK_BG;
//         blackEl[i].style.color = WHITE_BG;
//     }
//     const whiteEl = document.querySelectorAll('.white-1e1d7');
//     for (var i = 0; i < whiteEl.length; i++) {
//         whiteEl[i].style.backgroundColor = WHITE_BG;
//         whiteEl[i].style.color = BLACK_BG;
//     }
// }
// applyColorScheme(BLACK_BG, WHITE_BG)

//For removing class from all buttons
const removeClass = () => {
    const buttonEl = document.querySelectorAll('.color_b');
    for (var i = 0; i < buttonEl.length; i++) {
        buttonEl[i].classList.remove('black');
        buttonEl[i].classList.remove('grey');
    }
}

// // Color Buttons
// document.getElementById('grey_board').addEventListener('click', e => {
//     e.preventDefault();
//     removeClass();
//     document.getElementById('grey_board').classList.add('black');
//     document.getElementById('orange_board').classList.add('grey');
//     document.getElementById('green_board').classList.add('grey');
//     document.getElementById('blue_board').classList.add('grey');
//     applyColorScheme("#E1E1E1", "#FFFFFF");
// })

// document.getElementById('orange_board').addEventListener('click', e => {
//     e.preventDefault();
//     removeClass();
//     document.getElementById('grey_board').classList.add('grey');
//     document.getElementById('orange_board').classList.add('black');
//     document.getElementById('green_board').classList.add('grey');
//     document.getElementById('blue_board').classList.add('grey');
//     applyColorScheme("#D18B47", "#FFCE9E");
// })

// document.getElementById('green_board').addEventListener('click', e => {
//     e.preventDefault();
//     removeClass();
//     document.getElementById('grey_board').classList.add('grey');
//     document.getElementById('orange_board').classList.add('grey');
//     document.getElementById('green_board').classList.add('black');
//     document.getElementById('blue_board').classList.add('grey');
//     applyColorScheme("#58AC8A", "#FFFFFF");
// })

// document.getElementById('blue_board').addEventListener('click', e => {
//     e.preventDefault();
//     removeClass();
//     document.getElementById('grey_board').classList.add('grey');
//     document.getElementById('orange_board').classList.add('grey');
//     document.getElementById('green_board').classList.add('grey');
//     document.getElementById('blue_board').classList.add('black');
//     applyColorScheme("#727FA2", "#C3C6BE");
// })

// Messages Modal
document.getElementById('messageBox').addEventListener('click', e => {
    e.preventDefault();
    var style = window.getComputedStyle(document.getElementById('chatBox'));
    if (style.display === 'none') {
        document.getElementById('chatBox').style.display = 'block';
    } else {
        document.getElementById('chatBox').style.display = 'none';
    }
})

//
// AUTOMATION
//

// set player name
$(formEl[0]).val('ayy' + Math.random().toString().substring(2, 6));
// set room name
$(formEl[1]).val('commit');
multiPlayerEl.click()
joinButtonEl.click()

// singlePlayerEl.click()
