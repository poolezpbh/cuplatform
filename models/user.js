'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var User = new Schema({
	uid: {type: String, required: true, unique: true},
	email: {type: String, required: true},
	salt: {type: String, required: true},
	hash: {type: String, required: true},
	iconLink: String,
	gender: String,
	major: String,
	intro: String,
	points: Number,
	coursesTaken: [{type: String, ref: 'Course'}],
	//buyList: [{type: Schema.Types.ObjectId, ref: 'Item'}],
	admin: Boolean
});

module.exports = mongoose.model('User', User);