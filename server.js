const http = require('http');
const WebSocketServer = require('websocket').server;
const fs = require('fs');
const path = require('path');
const serveStatic = require('serve-static');
var serve = serveStatic(__dirname + '/public', { 'index': ['game.html'] });
let currentVotes = {};
let currentQuestion = ""
let questionTimeout;
let possibleVoters; 


process.on("message", (message) => {
    switch (message) {
        case "startGame":
            startGame();
            break;
        case "nextQuestion":
            nextQuestion();
            break;
        default:
            console.log("Unknown message: " + message);
    }
})


console.log("Starting server script...");

const players = new Map();
let names = [];
/** @type list[] */
const questions = require(__dirname + '/questions.json');

/**
 * @const {Object.<string, any>}
 * @param {number} PORT
 */
const config = require(__dirname + '/vitusconfig.json');

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    serve(req, res, () => {
        res.end('404: File Not Found');
    });
});

server.listen(config.PORT, config.IP)

const wsServer = new WebSocketServer({
    httpServer: server,
});


const getRandomKeyFromMap = iterable => [...iterable.keys()][Math.floor(Math.random() * iterable.size)]

const alphabet = 'abcdefghijklmnopqrstuvwxyz';


function createID() {
    let id = '';

    do {
        id = '';
        for (let i = 0; i < 5; i++) {
            id += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
    } while (players.get(id) !== undefined)
    return id;
}

function startGame() {
    console.log("startGame");
    nextQuestion()
}
function nextQuestion() {
    currentQuestion = questions[Math.floor(Math.random() * questions.length)];
    possibleVoters = 0
    for (const [key, val] of players) {
        if (val.name) {
            val.allowed = true;
            val.voted = false;
            possibleVoters++;
        }
    }
    let p1 = getRandomKeyFromMap(players);
    let p2
    do {
        p2 = getRandomKeyFromMap(players);
    } while (p1 === p2);
    currentVotes = {}
    currentVotes[p1] = 0;
    currentVotes[p2] = 0;
    let message = {
        type: 'showQuestion',
        data: {
            question: currentQuestion,
            person1: {id: p1, username: players.get(p1).name},
            person2: {id: p2, username: players.get(p2).name}
        }
    }
    console.log(message);
    console.log(currentVotes)
    wsServer.broadcast(JSON.stringify(message));
    questionTimeout = setTimeout(() => {
        showQuestionResults();    
    }, config.QUESTION_TIME * 1000);

}

function showQuestionResults() {
    for (const [key, val] of players) {
        val.allowed = false;
    }
    let p1ID = Object.keys(currentVotes)[0];
    let p2ID = Object.keys(currentVotes)[1];
    //let public = Math.random > 0.3

    let message = {
        type: 'showQuestionResults',
        data: {
            question: currentQuestion,
            person1: {name: players.get(p1ID).name, votes: currentVotes[p1ID]},
            person2: {name: players.get(p2ID).name, votes: currentVotes[p2ID]},
            totalVotes: Object.values(currentVotes).reduce((a, b) => a + b),
        }
    }
    wsServer.broadcast(JSON.stringify(message));
}


wsServer.on('request', (request) => {
    const connection = request.accept(null, request.origin);
    const id = createID();
    players.set(id, { connection: connection, name: undefined, allowed: false, voted: false });
    let thisPlayer = players.get(id);
    console.log("New connection: " + id);''
    connection.sendUTF(JSON.stringify({ type: "playerList", data: names }));
    connection.on('message', (message) => {
        if (message.type === 'utf8') {
            console.log(`Received Message from ${id}, name ${thisPlayer.name}: ${message.utf8Data}`);
            let msg = JSON.parse(message.utf8Data);
            switch (msg.type) {
                case "setName":
                    if (names.indexOf(msg.data) !== -1) {
                        connection.send(JSON.stringify({ type: 'return', data: { from: "setName", result: "Name already taken" } }));
                        return;
                    }
                    if (msg.data.length > 30) {
                        connection.send(JSON.stringify({ type: 'return', data: { from: "setName", result: "Name too long" } }));
                        return;
                    }
                    if (thisPlayer.name !== undefined) {
                        names.splice(names.indexOf(thisPlayer.name), 1);
                    }
                    thisPlayer.name = msg.data;
                    names.push(msg.data);
                    connection.send(JSON.stringify({
                        type: 'return', data: {
                            from: "setName", result: true, other: msg.data
                        }
                    }));
                    wsServer.broadcastUTF(JSON.stringify({ type: 'playerList', data: names }));
                    break;
                case "vote":
                    if (currentVotes[msg.data] !== undefined) {
                        if (!thisPlayer.allowed || thisPlayer.voted) {
                            connection.send(JSON.stringify({ type: 'return', data: { from: "vote", result: "You can't vote anymore" } }));
                            return;
                        }
                        currentVotes[msg.data]++;
                        thisPlayer.voted = true;
                        connection.send(JSON.stringify({ type: 'return', data: { from: "vote", result: true } }));

                        console.log(Object.values(currentVotes).reduce((a, b) => a + b), possibleVoters)

                        if (Object.values(currentVotes).reduce((a, b) => a + b) === possibleVoters) {
                            console.log("Votes done");
                            clearTimeout(questionTimeout);
                            showQuestionResults();
                        }

                    } else {
                        connection.send(JSON.stringify({ type: 'return', data: { from: "vote", result: "No such player" } }));
                    }
                    break;

                //Dev commands
                case "startGame":
                    startGame();
                    break;
                case "nextQuestion":
                    nextQuestion();
                    break;
                case "showQuestionResults":
                    showQuestionResults() 
                    break;
                default:
                    connection.send(JSON.stringify({ type: 'return', data: { from: "unknown", result: "Unknown message" } }));
                    break;
                }

            }
        })

    connection.on('close', (connection) => {
        console.log('Connection closed');
        if (thisPlayer.name !== undefined) {
            names.splice(names.indexOf(thisPlayer.name), 1);
            wsServer.broadcastUTF(JSON.stringify({ type: 'playerList', data: names }));
        }

    })
})

module.exports = {
    startGame, nextQuestion, showQuestionResults
}

//Dev control from CLI
process.stdin.on('data', (data) => {
    data = data.toString().trim();
    switch (data) {
        case "startGame":
            startGame();
            break;
        case "nextQuestion":
            nextQuestion();
            break;
        case "showQuestionResults":
            showQuestionResults()
        case "showPlayers":
            console.log(players.keys());
            break;
        case "possibleVoters":
            console.log(possibleVoters);
            break;
        case "echo":
            console.log("echo")
            break;
        default:
            if (data.startsWith("playerInfo")) {
                let id = data.split(" ")[1];
                if (!players.has(id)) {
                    console.log("No such player");
                    break;
                }
                let player = players.get(id);
                let info = {
                    id: id,
                    name: player.name,
                    allowed: player.allowed,
                    voted: player.voted
                    
                }
                console.log(info);
            } /*else if (data.startsWith("eval")) {
                eval(data.split(" ")[1]);   //DANGEROUS, only for dev, remove in production
            }*/ else {
                console.log("Unknown command");
            }
            break;
    }
})