"use strict";
exports.notEmpty = function(data) {
	switch(checkDataType(data)){
		case "string":
			if(/^\s*$/.test(data)){
				return false;
			}else{
				return true;
			}
		case "undefined":
		case "null":
			return false;
		case "number":
			return data != 0;
		case "boolean":
			return !data;
		case "array":
			return data.length != 0;
		case "object":
			for(var i in data){
				if(data.hasOwnProperty(i)){
				  return true;
				}
			}
		default:
			return false;	
	}	
};

exports.checkUsername = function(username, allUsers) {
	var type = checkDataType(allUsers);
	if(checkDataType(username) == "string"){
		if(type == "object"){
			for(var prop in allUsers){
				if(username == allUsers[prop].username) {
					return false;
				}
			}
			return true;
		}else if(type == "array"){
			for(var i in allUsers){
				if(username == allUsers[i]) {
					return false;
				}
			}
			return true;
		}else{
			throw {name: "TypeError",
			   message: "checkUsername() require Object or Array as second arguments"};
		}
	}else{
		throw {name: "TypeError",
			   message: "checkUsername() require String as first arguments"};
	}
};

var checkDataType = function(data) {	
	var type = typeof data;
	if(Array.isArray(data)){
		type = "array";
	}
	if(data === null){
		type = "null";
	}
	return type;
};

exports.checkDataType = checkDataType;