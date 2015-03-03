var _ = require("lodash");
var eventEmmiter = require('events').EventEmitter;
var util = require("util");

/// Packaged Policies
var defaultPolicy = require("./policies/default");
var newPolicy = require("./policies/new");
///

var blackwall = function(policy) {
    // Set memory-stored policy to either passed policy or default
    this.policy = policy || defaultPolicy;
    eventEmmiter.call(this);
}

util.inherits(blackwall, eventEmmiter);

blackwall.prototype.createPolicy = function(name, policy) {
    this.policy = _.defaults(newPolicy, policy, { name: name });
}

blackwall.prototype.addList = function(name, rule, force) {
    // Convert list name to lowercase
    var name = name.toLowerCase();

    // If policy exists and list is not forced
    if((this.policy[name])&&(!force)) return { error: "List already exists! \n Lists are not case-sensitive." };

    // Create new list
    this.policy[name] = {
        name: name,
        members: new Object
    }

    // Assign rule
    this.policy.rules[name] = rule;
}

blackwall.prototype.addMember = function(list, ip) {
    // Convert list name to lowercase
    var list = list.toLowerCase();

    // If list does not exist
    if(!this.policy[list]) return { error: "List not found!" };

    this.policy[list].members[ip] = new Object;
}

blackwall.prototype.enforce = function(method) {

}

module.exports = blackwall;
