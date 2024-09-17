var id = window.location.href.split("/")[3].replace(/[^a-zA-Z0-9]/g, '')
if (id == ''){
    id = makeid(6)
    console.log(id)
    window.location.href = "/#"+id
}

var incoming = false
var theConnection = null;

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
        console.log(id, "ID")
        window.addEventListener("onunload", ()=>{
            peer.destroy()
        })
    })
    
    
    
    peer.on("error", (err)=>{
        if(err.type==="unavailable-id") {
            var peer1 = new Peer();
            peer1.on("open", ()=>{
                const conn = peer1.connect(id);
                theConnection = conn
                conn.on("data", (data)=>{
                    getData(data)
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




function getData(data) {
    incoming = true
    window.editor.setValue(data)
    incoming = false
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