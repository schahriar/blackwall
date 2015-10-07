var _ = require("lodash");
var eventEmmiter = require('events').EventEmitter;
var util = require("util");
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

blackwall.prototype.modifyRule = function(name, rules, merge) {
    // If merge is true then merge current rules with new ones otherwise set to rule
    return this.policies[name].rules = (merge)?_.defaults(this.policies[name].rules, rules):rules;
}

blackwall.prototype.addPolicy = function(name, rules, priority, callback) {
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
        bloc: new Bloc(this),
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

blackwall.prototype.session = function(id, info, policy, callback) {
    /* Allow for ambiguous identification */
    /* ARGUMENTS:
    id: identifier, An ip address or a value that represents the authenticated address (Not a Session ID)
    info: information, An Object containing
    bloc: Identifies which list this session belongs to
    callback: Returns either error or an instance of Session
    */
    if(!id) return callback(new Error("An Identifier is required to create a new session"));
    callback(null, new Session(id, info, function(session){
        policy.bloc.assign.apply(policy.bloc, [session]);
    }));
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