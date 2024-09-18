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

    var peer = new Peer(id);
    
    peer.on("connection", (conn)=>{
        theConnection = conn
        conn.on("data", (data)=>{
            getData(data)
        })
        conn.on("open", ()=>{
            let data = window.editor.getValue()
            sendData(data)
        })
    })
    
    peer.on("open", (id)=>{
        setHost()
        console.log(id, "ID")
        window.addEventListener("onunload", ()=>{
            peer.destroy()
        })
    })
    
    
    
    peer.on("error", (err)=>{
        if(err.type==="unavailable-id") {
            var peer1 = new Peer();
            peer1.on("open", ()=>{
                setRemote()
                const conn = peer1.connect(id);
                theConnection = conn
                conn.on("data", (data)=>{
                    getData(data)
                })

                conn.on("open", ()=>{
                    connectionTracker = true
                    sendData("!!!PING!!!")
                    let interval = setInterval(()=>{
                        if(connectionTracker === false) {
                            clearInterval(interval)
                            mainFunction()
                        } else {
                            connectionTracker = false
                        }
                    }, 2100)
                })

                conn.on("close", ()=>{
                    mainFunction()
                })
            })

    
            peer1.on("error", (err)=>{
                console.log(err.type)
            })
        }
    })
}

mainFunction()




async function getData(data) {
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
        incoming = true
        window.editor.setValue(data)
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
    theConnection.send(data)
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
    window.editor.getModel().onDidChangeContent((event) => {
        if(!incoming) {
            let data = window.editor.getValue()
            sendData(data)
        }
    });
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
