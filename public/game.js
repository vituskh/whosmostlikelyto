console.log("Loaded game.js");

var socket = new WebSocket("ws://" + window.location.hostname + ":8080");
var myName = "";
var nameElements = document.getElementsByClassName("name");
var voteIds = {
    person1: "aaaaa",
    person2: "bbbbb"
}


socket.onopen = (e) => {
    console.log("Connected to server");
}
socket.onmessage = (e) => {
    console.log(e.data);
    let msg = JSON.parse(e.data);
    switch (msg.type) {
        case "playerList":
            let playerList = document.getElementById("playerList");
            playerList.innerHTML = ""
            for (let i = 0; i < msg.data.length; i++) {
                const element = msg.data[i];
                playerList.innerHTML += `<li>${element}</li>`;
            }


            break;
        case "return":
            if (msg.data.from === "setName") {
                if (msg.data.result === true) {
                    for (const element of nameElements) {
                        element.innerHTML = msg.data.other;
                    }
                        
                    
                    myName = msg.data.other;
                    if (document.getElementById("loginScreen").hidden === false) {
                        hide(document.getElementById("loginScreen"));
                        show(document.getElementById("lobby"));
                    }
                } else {
                    setTimeout(function() { alert(msg.data.result); }, 1);
                }
            } else if (msg.data.from === "vote") {
                if (msg.data.result === true) {
                    hide(document.getElementById("question"));
                    show(document.getElementById("afterVote"));
                    document.getElementById("publicVotingMsg").textContent = (
                        msg.data.publicVoting ?
                        "Der er public voting på - alle kan se hvem der har stemt på hvem" :
                        "Der er ikke public voting på."
                    )
                document.getElementById("votedOn").textContent = msg.data.votedOn;
                } else {
                    alert("Voting error: " + msg.data.error);
                }
            }

            break;
        case "showQuestion":
            if (myName !== "") {
                hide(document.getElementById("lobby"));
                show(document.getElementById("question"));
                hide(document.getElementById("loginScreen"));
                hide(document.getElementById("questionResults"));

                document.getElementById("questionText").innerHTML = msg.data.question;
                document.getElementById("person1").innerHTML = msg.data.person1.name;
                document.getElementById("person2").innerHTML = msg.data.person2.name;
                voteIds.person1 = msg.data.person1.id;
                voteIds.person2 = msg.data.person2.id;
            }
            break;
        case "showQuestionResults":
            if (myName !== "") {
            
            hide(document.getElementById("question"));
            show(document.getElementById("questionResults"));
            hide(document.getElementById("afterVote"));

            document.getElementById("questionResultText").innerHTML = msg.data.question;
            let person1percent = (msg.data.person1.votes / msg.data.totalVotes) * 100;
            let person2percent = (msg.data.person2.votes / msg.data.totalVotes) * 100;
            //Math.round((num + Number.EPSILON) * 100) / 100 rounds to 2 decimal places
            if(msg.data.publicVoting === true){
                document.getElementById("person1Result").innerHTML = `${msg.data.person1.name} (${Math.round((person1percent + Number.EPSILON) * 100) / 100}%)<br><br>
                Voters: ${msg.data.person1.voters.join("<br> ")}`;
                document.getElementById("person2Result").innerHTML = `${msg.data.person2.name} (${Math.round((person2percent + Number.EPSILON) * 100) / 100}%)<br><br>
                Voters: ${msg.data.person2.voters.join("<br> ")}`;
            } else {
                document.getElementById("person1Result").innerHTML = `${msg.data.person1.name} (${Math.round((person1percent + Number.EPSILON) * 100) / 100}%)`;
                document.getElementById("person2Result").innerHTML = `${msg.data.person2.name} (${Math.round((person2percent + Number.EPSILON) * 100) / 100}%)`;
            }
            document.getElementById("person1ResultContainer").style.background = "linear-gradient(white " + (100 - person1percent) + "% , green " + (100 - person1percent) + "%, green)";
            document.getElementById("person2ResultContainer").style.background = "linear-gradient(white " + (100 - person2percent) + "% , green " + (100 - person2percent) + "%, green)";
        }
            break;

        default:
            console.log("Unknown message type: " + msg.type);
            console.log("Message: " + msg.data);
            break;
    }

}
socket.onclose = (e) => {
    if (e.wasClean) {
        alert(`[close] Connection closed cleanly, code=${e.code} reason=${e.reason}`);
    } else {
        // e.g. server process killed or network down
        // event.code is usually 1006 in this case
        alert('[close] Connection died, code: ' + e.code + ' reason: ' + e.reason);
    }
}

socket.onerror = function (error) {
    alert(`[error] ${error.message}`);
};


function setName(name) {
    console.log("setName", name);
    socket.send(JSON.stringify({ type: "setName", data: name }));
}


function hide(element) {
    element.hidden = true;
    element.classList.add("hidden");
}
function show(element) {
    element.hidden = false
    element.classList.remove("hidden")
}

function vote(voteOn) {
    console.log("vote", voteOn);
    socket.send(JSON.stringify({ type: "vote", data: voteOn }));
}

//Development of question part
/*
hide(document.getElementById("lobby"));
show(document.getElementById("question"));
hide(document.getElementById("loginScreen"));
document.getElementById("questionText").innerHTML = "Question"
document.getElementById("person1").innerHTML = "Person 1"
document.getElementById("person2").innerHTML = "Person 2"
*/

//Development of results part
/*
hide(document.getElementById("lobby"));
hide(document.getElementById("question"));
hide(document.getElementById("loginScreen"));
show(document.getElementById("questionResults"));
document.getElementById("questionResultText").innerHTML = "Question"
let fakeMsg = {
    type: "showQuestionResults",
    data: {
        question: "Question",
        person1: {
            name: "Person 1",
            votes: 10
        },
        person2: {
            name: "Person 2",
            votes: 5
        },
        totalVotes: 15
    }
}
let person1percent = (fakeMsg.data.person1.votes / fakeMsg.data.totalVotes) * 100;
let person2percent = (fakeMsg.data.person2.votes / fakeMsg.data.totalVotes) * 100;
//Math.round((num + Number.EPSILON) * 100) / 100 rounds to 2 decimal places
document.getElementById("person1Result").innerHTML = fakeMsg.data.person1.name + ": " + Math.round((person1percent + Number.EPSILON) * 100) / 100+ "%";
document.getElementById("person2Result").innerHTML = fakeMsg.data.person2.name + ": " + Math.round((person2percent + Number.EPSILON) * 100) / 100+ "%";
document.getElementById("person1ResultContainer").style.background = "linear-gradient(white " + (100 - person1percent) + "% , green " + (100 - person1percent) + "%, green)";
document.getElementById("person2ResultContainer").style.background = "linear-gradient(white " + (100 - person2percent) + "% , green " + (100 - person2percent) + "%, green)";*/