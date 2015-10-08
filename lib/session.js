var eventEmmiter = require('events').EventEmitter;
var util = require("util");
var _ = require("lodash");

var Session = function BLACKWALL_SESSION(identifier, information) {
    // Unique Identifier of Client, Can be an IP address or any form of string
    this.id = identifier;
    // Small Storage of Information such as Bandwidth usage || Connection Time
    this.information = information;
    
    eventEmmiter.call(this);
}

util.inherits(Session, eventEmmiter);

Session.prototype.setInfo = function BLACKWALL_SESSION_INFO_SET(info, merge) {
    // Sets session usage in bytes
    // Merge by default
    if(merge === undefined) merge = true;
    // Set Info
    this.information = (merge)?_.merge(this.information, info):info;
    // Update Bloc Member (Different From Session as a Member can have multiple Sessions)
    if(this.manager) this.manager.update();
}

Session.prototype.getInfo = function BLACKWALL_SESSION_INFO_GET() {
    // Return Info from Member if Manager is available
    // Otherwise Return Session Info
    return (this.manager)?this.manager.getInfo():this.information;
}

Session.prototype.terminate = function BLACKWALL_SESSION_TERMINATE(reason) {
    // Terminates a session
    this.terminated = true;
    this.emit('terminate', reason);
    if(this.manager) this.manager.terminate();
}

module.exports = Session;
