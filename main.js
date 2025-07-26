var id = window.location.href.split("/")[3].replace(/[^a-zA-Z0-9]/g, '')
if (id == ''){
    id = makeid(6)
    console.log(id)
    window.location.href = "/"+id
}

var incoming = false
var theConnection = null;
var isRemoteAlive = null;
var connectionTracker = null;
var liveCounter = 0
var liveCounter_ = 0

function mainFunction() {
console.log("Starting mainFunction, trying to connect to PeerJS server...")

// Test PeerJS server connectivity first
fetch('https://peerjs.codeshare.live/')
    .then(response => {
        console.log("PeerJS server responded:", response.status)
        return response.text()
    })
    .then(data => {
        console.log("PeerJS server response:", data.substring(0, 100) + "...")
    })
    .catch(err => {
        console.log("PeerJS server connection test failed:", err)
    })

var peer = new Peer(id, {
    host: 'peerjs.codeshare.live',
    port: 443,
    path: '/',
    secure: true,
    debug: 2, // Add debug logging
    config: {
        'iceServers': [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
            // Temporarily commenting out your TURN server to test
            // {
            //     urls: 'turn:ice.codeshare.live:3478',
            //     username: 'testuser',
            //     credential: 'testpass'
            // }
        ],
        'iceCandidatePoolSize': 10
    }
});
    
    peer.on("connection", (conn)=>{
        console.log("Incoming connection received")
        theConnection = conn
        
        // Monitor ICE connection state on host side
        if(conn.peerConnection) {
            conn.peerConnection.oniceconnectionstatechange = () => {
                console.log("Host ICE connection state:", conn.peerConnection.iceConnectionState)
            }
            conn.peerConnection.onconnectionstatechange = () => {
                console.log("Host connection state:", conn.peerConnection.connectionState)
            }
        }
        
        conn.on("data", (data)=>{
            getData(data)
        })
        conn.on("open", ()=>{
            console.log("Connection opened, sending initial data")
            let data = window.editor ? window.editor.getValue() : ""
            sendData(data)
        })
        conn.on("close", ()=>{
            console.log("Connection closed")
        })
        conn.on("error", (err)=>{
            console.log("Connection error:", err)
        })
    })
    
    peer.on("open", (id)=>{
        setHost()
        console.log("Host peer opened with ID:", id)
        console.log("Waiting for connections...")
        
        window.addEventListener("beforeunload", ()=>{
            peer.destroy()
        })
    })
    
    peer.on("disconnected", ()=>{
        console.log("Peer disconnected from server")
    })
    
    peer.on("error", (err)=>{
        console.log("Peer error:", err.type, err)
        if(err.type==="unavailable-id") {
            console.log("ID unavailable, becoming remote peer")
            var peer1 = new Peer({
                host: 'peerjs.codeshare.live',
                port: 443,
                path: '/',
                secure: true,
                debug: 2, // Add debug logging
                config: {
                    'iceServers': [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        {
                            urls: 'turn:openrelay.metered.ca:80',
                            username: 'openrelayproject',
                            credential: 'openrelayproject'
                        }
                        // Temporarily commenting out your TURN server to test
                        // {
                        //     urls: 'turn:ice.codeshare.live:3478',
                        //     username: 'testuser',
                        //     credential: 'testpass'
                        // }
                    ],
                    'iceCandidatePoolSize': 10
                }
            });
            peer1.on("open", (newId)=>{
                console.log("Peer1 opened with ID:", newId, "connecting to:", id)
                setRemote()
                
                // Test if target peer exists by making a connection attempt
                console.log("Testing if target peer", id, "exists...")
                
                // Add a small delay before connecting
                setTimeout(() => {
                    const conn = peer1.connect(id, {
                        reliable: true,
                        serialization: 'json'
                    });
                    theConnection = conn
                    
                    // Monitor ICE connection state
                    if(conn.peerConnection) {
                        conn.peerConnection.oniceconnectionstatechange = () => {
                            console.log("ICE connection state:", conn.peerConnection.iceConnectionState)
                        }
                        conn.peerConnection.onconnectionstatechange = () => {
                            console.log("Connection state:", conn.peerConnection.connectionState)
                        }
                    }
                    
                    // Set connection timeout
                    const connectionTimeout = setTimeout(() => {
                        console.log("Connection attempt timed out after 30 seconds")
                        conn.close()
                    }, 30000) // Increased to 30 seconds
                    
                    conn.on("data", (data)=>{
                        getData(data)
                    })

                    conn.on("open", ()=>{
                        console.log("Remote connection established successfully")
                        clearTimeout(connectionTimeout)
                        connectionTracker = true
                        sendData("!!!PING!!!")
                        let interval = setInterval(()=>{
                            if(connectionTracker === false) {
                                clearInterval(interval)
                                console.log("Connection lost, reconnecting...")
                                mainFunction()
                            } else {
                                connectionTracker = false
                            }
                        }, 2100)
                    })

                    conn.on("close", ()=>{
                        console.log("Remote connection closed, reconnecting...")
                        clearTimeout(connectionTimeout)
                        mainFunction()
                    })
                    
                    conn.on("error", (err)=>{
                        console.log("Remote connection error:", err)
                        clearTimeout(connectionTimeout)
                    })
                }, 2000) // Increased delay to 2 seconds
            })

    
            peer1.on("error", (err)=>{
                console.log("Peer1 error:", err.type, err)
                if(err.type === "peer-unavailable") {
                    console.log("Target peer not found, retrying in 5 seconds...")
                    setTimeout(()=>{
                        mainFunction()
                    }, 5000) // Increased retry delay
                }
            })
        } else if(err.type === "network") {
            console.log("Network error, retrying in 3 seconds...")
            setTimeout(()=>{
                mainFunction()
            }, 3000)
        } else if(err.type === "server-error") {
            console.log("Server error (possibly peer discovery disabled), continuing anyway...")
            // Don't retry, just continue - the peer is still connected
        }
    })
}

mainFunction()




async function getData(data) {
    console.log("Data received:", typeof data, data.length ? data.length + " characters" : data)
    if(data === "!!!PING!!!") {
        connectionTracker = true
        displayLive()
        liveCounter = liveCounter + 1
        setTimeout(()=>{
            // console.log("PING")
            liveCounter = liveCounter + 1
            sendData("!!!PING!!!")
        }, 1000)
    } else {
        displayLive()
        incoming = true
        if(window.editor) {
            window.editor.setValue(data)
            console.log("Editor updated with received data")
        } else {
            console.log("Editor not ready yet")
        }
        incoming = false
    }
}



// Check if other peer is connected or not
setInterval(()=>{
    console.log(isRemoteAlive, liveCounter, liveCounter_)
    if(liveCounter != liveCounter_) {
        isRemoteAlive = true
        liveCounter_ = liveCounter
    } else {
        displayNotLive()
        isRemoteAlive = false
    }
}, 3400)


// Display Live not Live

let indicator = document.querySelector(".indicator")
let peerMode = document.querySelector(".peerMode")

function displayLive() {
    indicator.style.backgroundColor = '#17825d'
}

function displayNotLive() {
    indicator.style.backgroundColor = 'rgb(204, 72, 72)'
}

function setHost() {
    console.log("HOWNOWER")
    peerMode.style.backgroundColor = 'purple'
}
function setRemote() {
    peerMode.style.backgroundColor = 'yellow'
}


function sendData(data) {
    if(theConnection && theConnection.open) {
        theConnection.send(data)
        console.log("Data sent:", data.length + " characters")
    } else {
        console.log("Connection not ready, cannot send data")
    }
}

require.config({ paths: { 'vs': 'https://unpkg.com/monaco-editor@latest/min/vs' }});
window.MonacoEnvironment = { getWorkerUrl: () => proxy };

let proxy = URL.createObjectURL(new Blob([`
    self.MonacoEnvironment = {
        baseUrl: 'https://unpkg.com/monaco-editor@latest/min/'
    };
    importScripts('https://unpkg.com/monaco-editor@latest/min/vs/base/worker/workerMain.js');
`], { type: 'text/javascript' }));

require(["vs/editor/editor.main"], function () {
    window.editor = monaco.editor.create(document.getElementById('editor'), {
        value: [].join('\n'),
        language: null,
        theme: 'vs-dark'
    });
    
    // Add a small delay to ensure editor is fully initialized
    setTimeout(() => {
        window.editor.getModel().onDidChangeContent((event) => {
            if(!incoming) {
                let data = window.editor.getValue()
                console.log("Editor changed, sending data:", data.length + " characters")
                sendData(data)
            }
        });
        console.log("Monaco editor initialized and ready")
    }, 100);
});

function makeid(length) {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

let searchbar = document.querySelector(".link")
searchbar.innerHTML = "codeshare.live/"+id

// Fix CSS
let editor = document.querySelector(".editor")
let container = document.querySelector(".container").clientHeight
let header = document.querySelector(".header").clientHeight
let footer = document.querySelector(".footer").clientHeight

editor.style.height = container - header - footer + "px"

let downloadButton = document.querySelector(".download")
downloadButton.onclick = () => {
    console.log("click")
    download(id+".txt", window.editor.getValue())
}

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
  
    element.style.display = 'none';
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
}


let copy = document.querySelector(".copy")
let copied = document.querySelector(".copied")

copy.onclick = () => {
    console.log(navigator.clipboard)
    navigator.clipboard.writeText(window.editor.getValue());
    copy.style.display = "none"
    copied.style.display = "block"
    setTimeout(()=>{
        copy.style.display = "block"
        copied.style.display = "none"
    }, 2000)
}


let languageSelector = document.querySelector("#language")
languageSelector.onchange = (e)=>{
    let lang = languageSelector.value
    window.monaco.editor.setModelLanguage(window.monaco.editor.getModels()[0], lang) 
}
