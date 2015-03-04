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
    ip = ipaddr.parse(ip).toNormalizedString();
    // Check if ip-address is invalid (accepts both v4 and v6 ips)
    if(!ipaddr.isValid(ip)) return { error: "Invalid ip address!" };

    // Sort by priority
    var lists = _.sortBy(_this.policy.lists, function(item){ return -item.priority; });

    // Define lookup variable
    var lookup = undefined;

    // Go through each list in order
    _.each(lists, function(list) {
        // If * is true add ip to list
        if(list['*']) list.members[ip] = newMember;
        // Lookup ip (probably not the fastest method)
        if(list.members[ip]) {
            // Assign location and rule to lookup object
            lookup = { location: list.members[ip], rule: _this.policy.rules[list.name]};
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
    if(lookup.rule.block) return false;

    /* Rate limiting function */

    var rateRule = lookup.rule.rate;
    var rateTotal = { d:0, h:0, m:0, s:0 };

    // If any rates are set to 0
    if((rateRule.d === 0) || (rateRule.h === 0) || (rateRule.m === 0) || (rateRule.s === 0)) return false;

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
    if((rateRule.d < rateTotal.d) || (rateRule.h < rateTotal.h) || (rateRule.m < rateTotal.m) || (rateRule.s < rateTotal.s)) return false;

    // Otherwise
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
