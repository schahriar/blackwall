var _ = require("lodash");
var ipaddr = require('ipaddr.js');

module.exports = {
    lookup: function(ip) {
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
    }
}
