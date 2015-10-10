var _ = require("lodash");
var eventEmmiter = require('events').EventEmitter;
var util = require("util");
var ipaddr = require('ipaddr.js');
var Bloc = require("./lib/bloc");
var Session = require("./lib/session");
var rules = require("./predefined_rules/index.js");

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
    this.bloc = new Bloc();
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

blackwall.prototype.addPolicy = function BLACKWALL_POLICY_ADD(name, rules, options, priority) {
    var _this = this;
    var policy;
    // If Policy is provided as the first argument ignore Policy re-creation
    if((arguments[0]) && (arguments[0].isBlackwallPolicy)) {
        policy = arguments[0];
    }else{
        // Make Priority Optional
        if(!name) return new Error('A name is required to create a new policy');
        if(!rules) rules = [];
        if(!options) options = {};
        if(!priority) priority = 0;
        // Name requires to be unique
        if(!!_.findWhere(this.bloc.policies, { name: name })) return new Error('A policy with this name already exists in this instance. Please choose a unique name or pass the policy Object as a whole.');
        
        policy = {
            name: name,
            rules: rules,
            options: options,
            bloc: _this.bloc,
            priority: priority,
            isBlackwallPolicy: true
        }
    }
    // Return if Policy is a part of the Bloc
    if(!!_.findWhere(this.bloc.policies, { name: policy.name })) return _.findWhere(this.bloc.policies, { name: policy.name });
    
    _this.bloc.policies.push(policy)
    
    return policy;
}

blackwall.prototype.removePolicy = function BLACKWALL_POLICY_REMOVE(policy) {
    if(_.isObject(policy)) policy = policy.name;
    this.bloc.policies = _.omit(this.bloc.policies, function(o){
        return (o.name === policy.name);
    })
}

blackwall.prototype.session = function BLACKWALL_SESSION_NEW(id, info) {
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

blackwall.prototype.assign = function BLACKWALL_SESSION_ASSIGN(session, policy) {
    if((!session) || (!session.id)) return new Error("Session is not valid!");
    if(!policy) return new Error("Policy is not valid!");
    return policy.bloc.assign(session);
}

blackwall.prototype.addFramework = function BLACKWALL_FRAMEWORK_ADD(name, framework) {
    return frameworks[name] = framework;
}

blackwall.prototype.enforce = function BLACKWALL_ENFORCE(method, policy, options) {
    if((_.isObject(frameworks[method])) && (_.isFunction(frameworks[method].inbound))) return frameworks[method].inbound.apply(this, [policy, options]); else if(!method) {
        // Use default/custom method
        return frameworks['custom'].inbound.apply(this, [policy, options]);
    }
}

blackwall.prototype.rules = rules;

module.exports = blackwall;