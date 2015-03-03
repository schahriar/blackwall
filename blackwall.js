var _ = require("lodash");
var ipaddr = require('ipaddr.js');
var eventEmmiter = require('events').EventEmitter;
var util = require("util");

/// Packaged Policies
var defaultPolicy = require("./policies/default");
var newPolicy = require("./policies/new");
var newMember = require("./policies/member");
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

blackwall.prototype.addList = function(name, rule, priority, force) {
    // Convert list name to lowercase
    var name = name.toLowerCase();

    // If policy exists and list is not forced
    if((this.policy.lists[name])&&(!force)) return { error: "List already exists! \n Lists are not case-sensitive." };

    // Create new list
    this.policy.lists[name] = {
        name: name,
        priority: priority || 0.1,
        members: new Object
    }

    // Assign rule
    this.policy.rules[name] = rule;
}

blackwall.prototype.addMember = function(list, ip) {
    // Convert list name to lowercase
    var list = list.toLowerCase();

    // If list does not exist
    if(!this.policy.lists[list]) return { error: "List not found!" };

    // Check if ip-address is invalid (accepts both v4 and v6 ips)
    if(!ipaddr.isValid(ip)) return { error: "Invalid ip address!" };

    // Expand ipv6 address
    ip = ipaddr.parse(ip).toNormalizedString();

    this.policy.lists[list].members[ip] = newMember;
}

blackwall.prototype.lookup = function(ip) {
    /* Lookup function */
    // Expand ipv6 address
    ip = ipaddr.parse(ip).toNormalizedString();

    // Sort by priority
    var lists = _.sortBy(this.policy.lists, function(item){ return -item.priority; });
    var rule = undefined;

    _.each(lists, function(list) {
        if(list.members[ip]){
            rule = list.members[ip];
            return false;
	}
    });

    return rule;
}

blackwall.prototype.enforce = function(method) {

}

module.exports = blackwall;
