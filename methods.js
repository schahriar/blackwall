var _ = require("lodash");
var ipaddr = require('ipaddr.js');
var moment = require('moment');

/*
    TODO: Add ~async~ module and make all methods async
*/

var lookup = function(ip) {
    /* Lookup function */
    var _this = this;
    // Expand ipv6 address
    ip = ipaddr.parse(ip).toNormalizedString();

    // Sort by priority
    var lists = _.sortBy(this.policy.lists, function(item){ return -item.priority; });

    // Define lookup variable
    var lookup = undefined;

    // Go through each list in order
    _.each(lists, function(list) {
        // Lookup ip (probably not the fastest method)
        if(list.members[ip]){
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
    var rateTotal = { h:0, m:0, s:0 };

    // If any rates are set to 0
    if((rateRule.h === 0) || (rateRule.m === 0) || (rateRule.s === 0)) return false;

    // Foreach access granted time
    _.each(lookup.location.rate, function(accessTime) {
        if((rateRule.h) && (moment(accessTime).isBetween(moment().subtract(1, 'hours'), moment(), 'hour'))) rateTotal.h += 1;
        if((rateRule.m) && (moment(accessTime).isBetween(moment().subtract(1, 'minutes'), moment(), 'minute'))) rateTotal.m += 1;
        if((rateRule.s) && (moment(accessTime).isBetween(moment().subtract(1, 'seconds'), moment(), 'second'))) rateTotal.s += 1;
    })

    // If rate exceeds the limit
    if((rateRule.h < rateTotal.h) || (rateRule.m < rateTotal.m) || (rateRule.s < rateTotal.s)) return false;

    // Otherwise
    return true;
}

var push = function(lookup) {
    lookup.location.rate.push(moment().toISOString());
}

var auto = function(ip) {
    var _lookup = lookup(ip);
    if(admit(_lookup)) push(_lookup);

    return admit(_lookup);
}

module.exports = {
    lookup: lookup,
    admit: admit,
    push: push,
    auto: auto
}
