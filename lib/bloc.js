"use strict";

var Manager = require('./bloc.manager.js');
var eventEmmiter = require('events').EventEmitter;
var util = require("util");
var _ = require("lodash");
var async = require("async");

function RunRuleBloc(rules, session, member, global, callback) {
    /* RULES ARE AN OBJECT WITH FOLLOWING ATTRIBUTES:
        name: Rule Unique Name
        description: A Description of Rule (optional)
        function: Function that will be called with a Session Context
    */
    var ParallelExecutionArray = _.map(rules, function(rule) {
        /// Create Custom Storage Spaces for every Rule
        /// In Either Session or Member private storage
        var storage = (member)?member:{};
        if(!storage.private) storage.private = {};
        if(!storage.private[rule.name]) storage.private[rule.name] = {};
        ///
        // Bind Parallel Function with a session context and storage
        return _.bind(rule.func, session, global, storage.private[rule.name]);
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
    this.getPolicy = policy;
    /* Add Option to move Attached Data to FileSystem */
    this.members = new Object;
    this.store = new Object;
    eventEmmiter.call(this);
}

util.inherits(Bloc, eventEmmiter);

Bloc.prototype.assign = function BLACKWALL_BLOC_ASSIGN(session) {
    var _this = this;
    RunRuleBloc(this.getPolicy().rules, session, _this.members[session.id], _this.store, function(error) {
        if(!error) {
            // If ID is not a member add it to members
            if (!_this.members[session.id]) _this.members[session.id] = session;
            else {
                // Otherwise Update Member
                _this.members[session.id].information = _.assign(_this.members[session.id].information, session.information);
                _this.members[session.id].private = _.assign(_this.members[session.id].private, session.private);
                _this.members[session.id].active = true;
                session.manager = new Manager(_this, session);
            }
        }else{
            // TERMINATE
            session.terminate();
        }
    })
}

Bloc.prototype.update = function BLACKWALL_BLOC_UPDATE(session) {
    // Merge Session Information with Member Information
    this.members[session.id].information = _.merge(this.members[session.id].information, session.information);
}

Bloc.prototype.info = function BLACKWALL_BLOC_INFO(session) {
    // Return Member Information
    return this.members[session.id].information;
}

Bloc.prototype.remove = function BLACKWALL_BLOC_REMOVE(session) {
    // Set Member to Undefined (the key can later be removed through clean method)
    this.members[session.id] = undefined;
}

Bloc.prototype.clean = function BLACKWALL_BLOC_CLEAN() {
    // Remove All Undefined Members
    var NewMemberStore = new Object;
    _.each(this.members, function BLACKWALL_BLOC_CLEAN_LOOP(member, identifier) {
        if(member !== undefined) NewMemberStore[identifier] = member;
    })
    this.members = NewMemberStore;
}

module.exports = Bloc;