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
    var bloc = this;
    async.waterfall([
        function (callback) {
            bloc.handler.get(session.id, callback);
        },
        function (member, callback) {
            if (!member) {
                bloc.members.set(session.id, session, function (error, member) {
                    if (error) session.terminate("Session failed to assign");
                    callback(error, member);
                });
            } else {
                callback(null, member);
            }
        }],
        function (error, member) {
            if (error) return callback(error);
            var ParallelExecutionArray = [];
            var scope = bloc.members.isolate(member.id);
            // Append Rules to ParallelExecutionArray
            ParallelExecutionArray = ParallelExecutionArray.concat(_.map(bloc.policy.rules, function (rule) {
                var args = [
                    new Storage(StorageInMemoryHandler(bloc.policy.options)),
                    scope.isolate('r', rule.name)
                ];

                _.each(rule.groups || [rule.group], function (group) {
                    if (!_.isString(group)) return;
                    args.push(scope.isolate('g', group));
                });
            
                // Bind Parallel Function with a session context and storage
                return _.bind.apply(_, [rule.func, session].concat(args));
            }) || []);
            /* Add Strict Mode::If there are no Rules the Session will be Terminated */
            // Async in case there is any I/O in rules
            async.parallel(ParallelExecutionArray, function (error, results) {
                callback(error, member);
            })
        }
    )
}

Bloc.prototype.assign = function BLACKWALL_BLOC_ASSIGN(session, callback) {
    var _this = this;
    this._cycle(session, function (error, member) {
        if (!error) {
            // Otherwise Update Member
            _this.members.set(session.id, {
                information: _.assign(member.information, session.information),
                active: true
            }, function (error) {
                if (error) session.terminate("Session failed to assign after it was admitted");
                else {
                    session.manager = new Manager(_this, session);
                }
                if (callback) callback(error, member);
            })
        } else {
            // TERMINATE
            session.terminate();
            if (callback) callback(error);
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
        if (member !== undefined) NewMemberStore[identifier] = member;
    })
    this.members = NewMemberStore;
}

module.exports = Bloc;