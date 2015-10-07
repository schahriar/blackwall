var eventEmmiter = require('events').EventEmitter;
var util = require("util");
var _ = require("lodash");

var Session = function BLACKWALL_SESSION(identifier, information, assign) {
    this.id = identifier;
    this.information = information;
    this.active = true;
    this.usage = 0;
    // Add to Bloc
    this.bloc = assign(this);
     
    eventEmmiter.call(this);
}

util.inherits(Session, eventEmmiter);

Session.prototype.setUsage = function BLACKWALL_SESSION_USAGE_SET(usage, add) {
    // Sets session usage in bytes
    this.usage = (add)?this.usage+usage:usage;
}

Session.prototype.getUsage = function BLACKWALL_SESSION_USAGE_GET() {
    return this.usage;
}

Session.prototype.terminate = function BLACKWALL_SESSION_TERMINATE(reason) {
    // Terminates a session
	this.active = false;
    this.bloc.terminate();
    this.emit('terminated', reason);
}

module.exports = Session;