
function setIp(ip) {
    document.getElementById("ipInput").value = ip;
    document.getElementById('game').src= `http://${ip}:8080`;
}
