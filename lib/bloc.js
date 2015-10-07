var eventEmmiter = require('events').EventEmitter;
var util = require("util");
var _ = require("lodash");

var Bloc = function BLACKWALL_BLOC(identifier, information, bloc) {

    eventEmmiter.call(this);
}

util.inherits(Bloc, eventEmmiter);

module.exports = Bloc;