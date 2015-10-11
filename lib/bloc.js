"use strict";

var Manager = require('./bloc.manager.js');
var Storage = require('./bloc.store.js');
var StorageInMemoryHandler = require('./bloc.storage.handler.js');
var eventEmmiter = require('events').EventEmitter;
var util = require("util");
var _ = require("lodash");
var async = require("async");

var Bloc = function BLACKWALL_BLOC(storageHandler) {
    this.policy = new Object;
    /* Add Option to move Attached Data to FileSystem */
    this.handler = storageHandler || new Storage(StorageInMemoryHandler(new Object));
    this.members = this.handler.isolate('members');
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
    var bloc = this;
    var ParallelExecutionArray = [];
    this.handler.get(session.id).exec(function(error, member) {
        if(error) return callback(error);
        // Append Rules to ParallelExecutionArray
        ParallelExecutionArray = ParallelExecutionArray.concat(_.map(bloc.policy.rules, function(rule) {
            // Bindings for Rule Function
            var binder = [
                rule.func,
                session,
                new Storage(StorageInMemoryHandler(bloc.policy.options)),
                bloc.handler.isolate('rules', rule.name)
            ];
            // Push all group objects as following arguments
            _.each(rule.groups || [rule.group], function(group) {
                if(!_.isString(group)) return;
                binder.push(bloc.handler.isolate('groups', group));
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
                callback.apply(bloc, [null, member])
            }else{
                // If Error Or Failed Rule
                callback.apply(bloc, [error || new Error("Not All Rules Completed Successfully")]);
            }
        })
    });
}

Bloc.prototype.assign = function BLACKWALL_BLOC_ASSIGN(session) {
    this._cycle(session, function(error, member) {
        if(!error) {
            // If ID is not a member add it to members
            if (!member) {
                this.members.set(session.id, session, function(error) {
                    if(error) session.terminate("Session failed to assign"); 
                });
            }
            else {
                // Otherwise Update Member
                this.members.set(session.id, {
                    information: _.assign(member.information, session.information),
                    active: true
                }, function(error) {
                    if(error) session.terminate("Session failed to assign after it was admitted"); 
                    else {
                        session.manager = new Manager(this, session);
                    }
                })
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