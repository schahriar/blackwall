var _ = require("lodash");
var eventEmmiter = require('events').EventEmitter;
var util = require("util");
var ipaddr = require('ipaddr.js');
var Bloc = require("./lib/bloc");
var Session = require("./lib/session");

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

var blackwall = function() {
    this.policies = new Object;
    eventEmmiter.call(this);
}

util.inherits(blackwall, eventEmmiter);

blackwall.prototype.modifyRules = function BLACKWALL_POLICY_MODIFY_RULES(policy, rules, merge) {
    // If merge is true then merge current rules with new ones otherwise set to rule
    // Merge By Default
    if(merge === undefined) merge = true;
    if(!policy.rules) return new Error('Policy is invalid');
    policy.rules = (merge)?_.defaults(policy.rules, rules):rules;
    return policy;
}

blackwall.prototype.addPolicy = function(name, rules, priority, callback) {
    var _this = this;
    // Make Priority Optional
    if(!name) return callback(new Error('A name is required to create a new policy'));
    if(!rules) rules = [];
    if(!priority) priority = 0;
    if((!callback) && (priority.constructor === Function)) {
        callback = priority;
        priority = 0;
    }
    if(!!this.policies[name]) return callback(null, this.policies[name]);
    
    this.policies[name] = {
        name: name,
        rules: rules,
        bloc: new Bloc(function() { return _this.policies[name] }),
        priority: priority
    }
    
    callback(null, this.policies[name]);
}

blackwall.prototype.removePolicy = function(policy) {
    if(_.isObject(policy)) policy = policy.name;
    this.policies = _.omit(this.policies, function(o){
        return (o.name === policy.name);
    })
}

blackwall.prototype.session = function(id, info) {
    /* Allow for ambiguous identification */
    /* ARGUMENTS:
    id: identifier, An ip address or a value that represents the authenticated address (Not a Session ID)
    info: information, An Object containing
    */
    if(!id) return new Error("An Identifier is required to create a new session");
    // If id is an ipv6 then expand the stored id
    // Check if ID is an IP
    if(ipaddr.isValid(id)) {
        // IF ipv6 -> Expand ipv6 address
        id = (ipaddr.parse(id).parts)?ipaddr.parse(id).toNormalizedString():id;   
    }
    return new Session(id, info);
}

blackwall.prototype.assign = function(session, policy) {
    if((!session) || (!session.id)) return new Error("Session is not valid!");
    if(!policy) return new Error("Policy is not valid!");
    return policy.bloc.assign(session);
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