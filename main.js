var id = window.location.href.split("/")[3].replace(/[^a-zA-Z0-9]/g, '')
if (id == ''){
    id = makeid(6)
    console.log(id)
    window.location.href = "/#"+id
}
var theConnection = null;
var peer = new Peer(id);
var incoming = false

peer.on("connection", (conn)=>{
    theConnection = conn
    conn.on("data", (data)=>{
        getData(data)
    })
})

peer.on("open", (id)=>{
    console.log(id, "ID")
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
        })

        peer1.on("error", (err)=>{
            console.log(err.type)
        })
    }
})

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
	window.editor = monaco.editor.create(document.getElementById('container'), {
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
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}