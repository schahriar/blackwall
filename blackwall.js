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

blackwall.prototype.policy = function BLACKWALL_POLICY_ADD(name, rules, options) {
    var _this = this;
    var policy;

    if(!name) return new Error('A name is required to create a new policy');
    if(!rules) rules = [];
    if(!options) options = {};
    
    policy = {
        name: name,
        rules: rules,
        options: options,
        bloc: _this.bloc,
        swap: function(newpolicy) {
            this.name = newpolicy.name;
            this.rules = newpolicy.rules;
            this.options = newpolicy.options;
            return policy;
        },
        isBlackwallPolicy: true
    }
        
    return policy;
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
    if((_.isObject(frameworks[method])) && (_.isFunction(frameworks[method].inbound))) {
        this.bloc.policy = policy;
        return frameworks[method].inbound.apply(this, [policy, options]);
    } else if((_.isObject(method)) && (method.isBlackwallPolicy === true)) {
        // Method is a Policy, Shift arguments
        policy = method;
        options = policy;
        this.bloc.policy = policy;
        // Use default/custom method
        return frameworks['custom'].inbound.apply(this, [policy, options]);
    }else{
        throw new Error("A Framework And/Or Policy is required.");
    }
}

blackwall.prototype.rules = rules;

module.exports = blackwall;