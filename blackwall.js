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
    express: require("./frameworks/express"),
    custom: require("./frameworks/custom")
}
///

//// TODO
//////// Add ip range support
/////// Add session-based policies
////// Add dump and restore
///// Change errors to proper Error type
//// Add member removal support

var blackwall = function(policy) {
    // Set memory-stored policy to either passed policy or default
    this.policy = policy || defaultPolicy;
    eventEmmiter.call(this);
}

util.inherits(blackwall, eventEmmiter);

/* Release with policy exchange functions
blackwall.prototype.newPolicy = function(name, policy) {
    // Save old policy
    var oldPolicy = this.policy;
    // Create a new policy from defaults and user provided object
    this.policy = _.defaults(newPolicy, policy, { name: name });

    return oldPolicy;
}
*/

blackwall.prototype.modifyRule = function(listName, rule, merge) {
    // If merge is true then merge current rules with new ones otherwise set to rule
    return this.policy.rules[listName] = (merge)?_.defaults(this.policy.rules[listName], rule):rule;
}

blackwall.prototype.addList = function(name, rule, priority, global, force) {
    // Convert list name to lowercase
    var name = name.toLowerCase();

    // If policy exists and list is not forced
    if((this.policy.lists[name])&&(!force)) return { error: "List already exists! \n Lists are not case-sensitive." };

    // Create new list
    this.policy.lists[name] = {
        name: name,
        priority: priority || 0.1,
        '*': !!global,
        members: new Object
    }

    // Assign rule
    this.policy.rules[name] = _.defaults(rule, { rate: {}, block: false});

    return this.policy.lists[name];
}

blackwall.prototype.addMember = function(list, ips) {
    var _this = this;

    // Convert list name to lowercase
    var list = list.toLowerCase();

    // If list does not exist
    if(!this.policy.lists[list]) return { error: "List not found!" };

    // Change ips to single item array if string is given
    ips = (_.isString(ips))?[ips]:ips;

    _.each(ips, function(ip) {
        // Check if ip-address is invalid (accepts both v4 and v6 ips)
        if(!ipaddr.isValid(ip)) throw new Error("Invalid ip address!");

        // Expand ipv6 address
        ip = (ipaddr.parse(ip) === "ipv6")?ipaddr.parse(ip).toNormalizedString():ip;

        _this.policy.lists[list].members[ip] = newMember.create();
    })
}

blackwall.prototype.session = function(ip, callback) {
    callback(null, methods.auto.apply(this, [ip]));
}

blackwall.prototype.addFramework = function(name, framework) {
    return frameworks[name] = framework;
}

blackwall.prototype.enforce = function(method, options) {
    if((_.isObject(frameworks[method])) && (_.isFunction(frameworks[method].inbound))) return frameworks[method].inbound.apply(this, [options]); else if(!method) {
        // Use default/custom method
        return frameworks['custom'].inbound.apply(this, [options]);
    }
}

module.exports = blackwall;
