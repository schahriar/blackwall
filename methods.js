var _ = require("lodash");
var ipaddr = require('ipaddr.js');
var moment = require('moment');

/// Packaged Policies
var defaultPolicy = require("./policies/default");
var newPolicy = require("./policies/new");
var newMember = require("./policies/member");
///

var lookup = function(ip) {
    /* Lookup function */
    var _this = this;
    // Expand ipv6 address
    ip = (ipaddr.parse(ip) === "ipv6")?ipaddr.parse(ip).toNormalizedString():ip;
    // Check if ip-address is invalid (accepts both v4 and v6 ips)
    if(!ipaddr.isValid(ip)) throw new Error("Invalid ip address!");

    // Sort by priority
    var lists = _.sortBy(_this.policy.lists, function(item){ return -item.priority; });

    // Define lookup variable
    var lookup = undefined;

    // Go through each list in order
    _.each(lists, function(list) {
        // If * is true add ip to list
        if((list['*'])&&(!list.members[ip])) list.members[ip] = newMember.create();
        // Lookup ip (probably not the fastest method)
        if(list.members[ip]) {
            // Assign location and rule to lookup object
            lookup = { location: list.members[ip], rule: _this.policy.rules[list.name], ip: ip };
            // break the loop
            return false;
        }else if(_this.policy.rules[list.name].whitelist === true) {
            // If list is a whitelist deny subsequent addresses
            // Assign blocking rule
            lookup = { rule: { block: true } };
            // break the loop
            return false;
        }
    });

    return lookup;
};

var admit = function(lookup) {
    /* Admission function */
    var _this = this;

    // Check if blocked
    if(lookup.rule.block) {
        // Emit denied event
        _this.emit("denied", lookup.ip, { blocked: true });
        return false;
    }

    /* Rate limiting function */

    var rateRule = lookup.rule.rate || {};
    var rateTotal = { d:0, h:0, m:0, s:0 };

    // If any rates are set to 0
    if((rateRule.d === 0) || (rateRule.h === 0) || (rateRule.m === 0) || (rateRule.s === 0)) {
        // Emit denied event
        _this.emit("denied", lookup.ip, { rule: rateRule, total: rateTotal });
        return false;
    }

    // Prevent computation if rateRule is undefined
    if(rateRule) {
        // Foreach access granted time
        _.each(lookup.location.rate, function(accessTime, key) {
            if((rateRule.d) && (moment(accessTime).diff(moment(), 'days') >= 0 )) rateTotal.d += 1;
                else if (rateRule.d) lookup.location.rate.splice(key, 1); // Drop accessTime
            if((rateRule.h) && (moment(accessTime).diff(moment(), 'hours') >= 0 )) rateTotal.h += 1;
                else if ((rateRule.h) && (!rateRule.d)) lookup.location.rate.splice(key, 1); // Drop accessTime
            if((rateRule.m) && (moment(accessTime).diff(moment(), 'minutes') >= 0 )) rateTotal.m += 1;
                else if ((rateRule.m) && (!rateRule.h) && (!rateRule.d)) lookup.location.rate.splice(key, 1); // Drop accessTime
            if((rateRule.s) && (moment(accessTime).diff(moment(), 'seconds') >= 0 )) rateTotal.s += 1;
                else if ((rateRule.s) && (!rateRule.m) && (!rateRule.h) && (!rateRule.d)) lookup.location.rate.splice(key, 1); // Drop accessTime
        });

        // If rate exceeds the limit
        if((rateRule.d < rateTotal.d) || (rateRule.h < rateTotal.h) || (rateRule.m < rateTotal.m) || (rateRule.s < rateTotal.s)) {
            // Emit denied event
            _this.emit("denied", lookup.ip, { rule: rateRule, total: rateTotal });
            return false;
        }
    }

    // Otherwise admit ip
    _this.emit("admitted", lookup.ip, { rule: rateRule, total: rateTotal });
    return true;
}

var push = function(lookup) {
    lookup.location.rate.push(moment().toISOString());
}

var auto = function(ip) {
    var _lookup = lookup.apply(this, [ip]);
    if(!_lookup) return false;
    if(admit.apply(this, [_lookup])) push(_lookup);

    return admit.apply(this, [_lookup]);
}

module.exports = {
    lookup: lookup,
    admit: admit,
    push: push,
    auto: auto
}
