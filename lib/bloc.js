"use strict";

var Manager = require('./bloc.manager.js');
var eventEmmiter = require('events').EventEmitter;
var util = require("util");
var _ = require("lodash");
var async = require("async");

function RunRuleBloc(rules, context, callback) {
    /* RULES ARE AN OBJECT WITH FOLLOWING ATTRIBUTES:
        name: Rule Unique Name
        description: A Description of Rule (optional)
        function: Function that will be called with a Session Context
    */
    var ParallelExecutionArray = _.map(rules, function(rule) {
        return _.bind(rule.function, context, (rule.name)?context.information['_' + rule.name]:context.information);
    })
    // Async in case there is any I/O in rules
    async.parallel(ParallelExecutionArray, function(error, results) {
        if((!error) && (_.indexOf(results, false) === -1)) {
            // If No Error and No false in results
            callback(null)
        }else{
            // If Error Or Failed Rule
            callback(error || new Error("Not All Rules Completed Successfully"));
        }
    })
}

var Bloc = function BLACKWALL_BLOC(policy) {
    this.policy = policy;
    this.members = new Object;
    eventEmmiter.call(this);
}

util.inherits(Bloc, eventEmmiter);

Bloc.prototype.assign = function(session) {
    var _this = this;
    RunRuleBloc(this.policy.rules, session, function(error) {
        if(!error) {
            // If ID is not a member add it to members
            if (!_this.members[session.identifier]) _this.members[session.identifier] = session;
            else {
                // Otherwise Update Member
                _this.members[session.identifier].information = _.assign(_this.members[session.identifier].information, session);
                _this.members[session.identifier].active = true;
                return new Manager(_this, session);
            }
        }else{
            // TERMINATE
            session.terminate();
        }
    })
}

Bloc.prototype.remove = function(session) {
    this.members[session.identifier] = undefined;
}

module.exports = Bloc;