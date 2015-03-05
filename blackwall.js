var _ = require("lodash");
var ipaddr = require('ipaddr.js');
var eventEmmiter = require('events').EventEmitter;
var util = require("util");
var methods = require("./methods");

/// Packaged Policies
var defaultPolicy = require("./policies/default");
var newPolicy = require("./policies/new");
var newMember = require("./policies/member");
///

/// Packaged Frameworks
var frameworks = {
    express: require("./frameworks/express")
}
///

//// TODO
////// Add support for policy creation
///// Add ip range support
//// Add session-based policies
/// Add dump and restore

var blackwall = function(policy) {
    // Set memory-stored policy to either passed policy or default
    this.policy = policy || defaultPolicy;
    eventEmmiter.call(this);
}

util.inherits(blackwall, eventEmmiter);

blackwall.prototype.newPolicy = function(name, policy) {
    // Save old policy
    var oldPolicy = this.policy;
    // Create a new policy from defaults and user provided object
    this.policy = _.defaults(newPolicy, policy, { name: name });

    return oldPolicy;
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

    return this.policy.lists[name];
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

blackwall.prototype.session = function(ip, callback) {
    callback(null, methods.auto.apply(this, [ip]));
}

blackwall.prototype.addFramework = function(name, object) {
    return frameworks[name] = object;
}

blackwall.prototype.enforce = function(method) {
    if((_.isObject(frameworks[method])) && (_.isFunction(frameworks[method].create))) return frameworks[method].create.apply(this);
}

module.exports = blackwall;
