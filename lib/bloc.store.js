var async = require('async');
var _ = require('lodash');

var BLOCSTORE = function BLACKWALL_BLOCSTORE(handler) {
	// Require a handler
	if(!handler) throw new Error("No Storage Handler was passed");
	// Attach Get/Set functions to instance
	this.handler = handler;
}

BLOCSTORE.prototype.isolate = function BLACKWALL_BLOCSTORE_ISOLATE(group, name) {
	// Changes scope by prepending to key
	var instance = new BLOCSTORE(this.handler);
	instance.prepend = '_isolate_' + (group)?group+'_':'' + (group && name)?name:'';
	return instance;
}

BLOCSTORE.prototype.get = function BLACKWALL_BLOCSTORE_GET(key, callback) {
	/* Add option to multi-get */
	this.handler.get({
		key: (this.prepend)?this.prepend+key:key,
	}, callback || new Function);
}

BLOCSTORE.prototype.set = function BLACKWALL_BLOCSTORE_SET(key, value, callback) {
	this.handler.set({
		key: (this.prepend)?this.prepend+key:key,
		value: value
	}, callback || new Function);
}

BLOCSTORE.prototype.remove = function BLACKWALL_BLOCSTORE_REMOVE(key, callback) {
	/* Add option to multi-remove */
	this.handler.remove({
		key: (this.prepend)?this.prepend+key:key,
	}, callback || new Function);
}

BLOCSTORE.prototype.list = function BLACKWALL_BLOCSTORE_LIST(callback) {
	this.handler.list(callback || new Function);
}

BLOCSTORE.prototype.length = function BLACKWALL_BLOCSTORE_LENGTH(callback) {
	this.handler.length(callback || new Function);
}

module.exports = BLOCSTORE;