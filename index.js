"use strict";
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');
const formidable = require('formidable');
const check = require("./check");
const port = process.env.PORT || 80;
var allUsers = {};
var allSocket = {};

//選課 captcha ocr-------------------
var vision = require('@google-cloud/vision')({
	projectId: 'semiotic-quasar-121723',
	keyFilename: './wolveschat-54cfb7093c4e.json'
});
var request = require('request');
app.get('/captcha/:code', function(req, res){
	var ocrReq = {
	  requests: [
		{
		  image: {
			content: req.params.code
		  },
		  features: [
			{
			  type: "TEXT_DETECTION"
			}
		  ]
		}
	  ]
	};
	request({
		url: "https://vision.googleapis.com/v1/images:annotate?key=AIzaSyA_uGSgWwRtdk-VCp_M7l0aQ9VgSBKTOxk",
		method: "POST",
		json: true,   // <--Very important!!!
		body: ocrReq
	}, function (error, response, body){
		try{
			var txt = body.responses[0].textAnnotations[0].description;
			res.send('ocr("' + txt.replace(/\W+|_/g, '') + '");');		
		}catch(error){
			res.send('console.log("' + error + '");');
		}
		res.end();
	});
});
//-------------------
//課程檔案上傳 (heroku 無法使用)-------------------
app.get('/upload', function(req, res){
	res.writeHead(200, {'Content-Type': 'text/html'});
	res.write('<form action="fileupload" method="post" enctype="multipart/form-data">');
	res.write('<input type="file" name="filetoupload"><br>');
	res.write('<input type="submit">');
	res.write('</form>');
	return res.end();	
});
app.post('/fileupload', function(req, res){
	var form = new formidable.IncomingForm();
	form.parse(req, function (err, fields, files) {
		var oldpath = '..' + files.filetoupload.path;
		console.log(files);
		var newpath = './csv/' + files.filetoupload.name;
		fs.rename(oldpath, newpath, function (err) {
			if (err) throw err;
			res.write('File uploaded and moved!');
			res.end();
		});
	});
});
//-------------------
//課程 csv 檔轉 json-------------------
const csv=require('csvtojson');
app.get('/parse', function(req, res){	
	const csvFilePath='./csv/choiceCourse.csv';	
	csv({
		headers: ['code'],
		toArrayString: true,
		ignoreEmpty: true,
		ignoreColumns: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]
	}).fromFile(csvFilePath).on('end_parsed',(jsonObj)=>{		
		var strJson = JSON.stringify(jsonObj);
		fs.writeFile('./json/courses.json', strJson, function (err) {
			if (err) throw err;
			console.log('Convert success and file saved!');
			res.write('Convert success and file saved!');
			res.end();
		});
	});
});
//-------------------
//傳回轉好成 json 檔案的 json
app.get('/json', function(req, res){
	fs.readFile('./json/courses.json', function(err, data){
		res.write("json('" + data + "');");
		res.end();
	});	
});
//-------------------

app.get('/', function(req, res){
	res.sendFile(__dirname + '/html/chat.html');
});

app.get(/\/js\/\w+\.js/, function(req, res){
	res.sendFile(__dirname + req.url);
});

app.get(/\/css\/\w+\.css/, function(req, res){
	res.sendFile(__dirname + req.url);
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});

io.on('connect', function(socket){
	io.emit("usersList", allUsers);
	socket.on("loginReq", function(name){	
		if(check.checkDataType(name) == "string" && check.notEmpty(name) && check.checkUsername(name, allUsers)){
			if(socket.username){
				socket.emit("loginResult", {result: false, log: "You have been loged in"});
			}else{
				socket.username = name;
				allUsers[socket.id] = {username: name};
				allSocket[socket.id] = socket;
				socket.emit("loginResult", {result:true, username: name, log: "success"});
				io.emit("usersList", allUsers);
				io.emit('userConnected', name + " connected");
				console.log(allUsers);
			}
		}else{
			socket.emit("loginResult", {result: false, log: "Plz make sure username is not used & not be blank"});
			console.log("username is not a String or blank or used");
		}
	});
	
	socket.on('sendMessage', function(msg){
		if(socket.username){
			if(check.checkDataType(msg) == "object" && check.notEmpty(msg.message)){
				msg.result = true;
				msg.username = socket.username;
				if(check.notEmpty(msg.to)){
					allSocket[msg.to].emit('message', msg);
				}else{
					io.emit('message', msg);
				}				
			}else{
				msg.result = false;
				msg.log = "Cannot send empty message";
				socket.emit("message", msg);
				console.log("message is not an Object or is empty");
			}			
		}else{
			socket.emit("noUser", {result: false, log: "No username!"});
		}
	});
	
	socket.on("input", function(data){
		data.id = socket.id;
		socket.broadcast.emit("input", data);
	});
	
	socket.on('disconnect', function(){		
		if(socket.username){			
			socket.broadcast.emit("userDisconnect", socket.username + " disconnected");			
			delete allUsers[socket.id];
			io.emit("usersList", allUsers);
			console.log(allUsers);
		}
	});
	
});

//-----------datawash----------
const twilio = require('twilio');
//using twilio api
var accountSid = 'ACbb0532a031256aff8fa1f0c750c83412'; // Your Account SID from www.twilio.com/console
var authToken = '769579204a1264f502afa57df12ccdbf';   // Your Auth Token from www.twilio.com/console
var client = new twilio(accountSid, authToken);
app.get('/datawash/notifyUserViaSms', function(req, res){
	if(/Z9MkTDxQMWVJUEwMQXN6yjSmPACLB8pMGNUB/.test(req.query.auth)){
		var phone = req.query.phone.replace(/^0{1}/, "+886");		
		client.messages.create({
			body: '您的衣物已經洗好了，請盡速領取',
			to: phone,  // Text this number
			from: '+14243428395' // From a valid Twilio number
		}).then(
			(message) => console.log(message.sid)
		).catch(function(err) {
			console.error('ERROR : invalid phone number or other reason');
			console.error(err)
		});
		res.send({phone: phone});
	}else{
		res.send('invalid auth code');
	}
});

