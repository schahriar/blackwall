"use strict";

var Manager = require('./bloc.manager.js');
var Storage = require('./bloc.store.js');
var StorageInMemoryHandler = require('./bloc.storage.handler.js');
var eventEmmiter = require('events').EventEmitter;
var util = require("util");
var _ = require("lodash");
var async = require("async");

var Bloc = function BLACKWALL_BLOC() {
    this.policy = new Object;
    /* Add Option to move Attached Data to FileSystem */
    this.members = new Object;
    this.store = new Object;
    eventEmmiter.call(this);
}

util.inherits(Bloc, eventEmmiter);

Bloc.prototype._cycle = function BLACKWALL_BLOC_CYCLE(session, callback) {
    /* RULES ARE AN OBJECT WITH FOLLOWING ATTRIBUTES:
        name: Rule Unique Name
        description: A Description of Rule (optional)
        function: Function that will be called with a Session Context
    */
    /* Caching the ParallelExecutionArray could improve performance */
    var _this = this;
    var ParallelExecutionArray = [];
    var member = this.members[session.id];
    // Append Rules to ParallelExecutionArray
    ParallelExecutionArray = ParallelExecutionArray.concat(_.map(this.policy.rules, function(rule) {
        /// Create Custom Storage Spaces for every Rule
        /// In Either Session or Member private storage
        var storage = (member)?member:{};
        if(!storage.private) storage.private = {};
        if(!storage.private['_'+rule.name]) storage.private['_'+rule.name] = {};
        ///
        // Bindings for Rule Function
        var binder = [rule.func, session, new Storage(StorageInMemoryHandler(_this.policy.options)), storage.private['_'+rule.name]];
        // Push all group objects as following arguments
        _.each(rule.groups || [rule.group], function(group) {
            if(!_.isString(group)) return;
            if(!storage.private['_g_'+group]) storage.private['_g_'+group] = {};
            binder.push(storage.private['_g_'+group]);
        });
        // Bind Parallel Function with a session context and storage
        return _.bind.apply(_, binder);
    }) || []);
    /* Add Strict Mode::If ther are no Rules the Session will be Terminated */
    // Async in case there is any I/O in rules
    async.parallel(ParallelExecutionArray, function(error, results) {
        /* Emit error event if has(error) */
        if((!error) && (_.indexOf(results, false) === -1)) {
            // If No Error and No false in results
            callback.apply(_this, [null, member])
        }else{
            // If Error Or Failed Rule
            callback.apply(_this, [error || new Error("Not All Rules Completed Successfully")]);
        }
    })
}

Bloc.prototype.assign = function BLACKWALL_BLOC_ASSIGN(session) {
    this._cycle(session, function(error, member) {
        if(!error) {
            // If ID is not a member add it to members
            if (!member) {
                this.members[session.id] = session;
                member = this.members[session.id];
            }
            else {
                // Otherwise Update Member
                member.information = _.assign(member.information, session.information);
                member.private = _.assign(member.private, session.private);
                member.active = true;
                session.manager = new Manager(this, session);
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