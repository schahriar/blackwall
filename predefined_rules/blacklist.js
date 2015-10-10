var _ = require("lodash");
var ipaddr = require('ipaddr.js');

function IP_MATCH_ALL(list, rangeList, ip) {
    if(!list) return false;
    // Stored Parsed IP
    var _IP_ = ipaddr.parse(ip);
    
    // Simple Compare of Provided, Valid & Normalized version of IP with Address List
    if(
        (list.indexOf(ip) !== -1)
        ||
        (list.indexOf(_IP_.toString()) !== -1)
        ||
        (
            (_IP_.kind() === 'ipv6')
            &&
            (list.indexOf(_IP_.toNormalizedString()) !== -1)
        )
    ) {
        return true;
    }else if(
        (rangeList)
        &&
        (rangeList.length >= 1)
    ){
        // Range Matching If Rangelist has items
        var match = false;
        // Expensive Matching Function
        _.each(rangeList, function(range) {
            // Unfortunately ipaddr.js likes to throw too often
            try {
                match = _IP_.match(ipaddr.parseCIDR(range));
            }catch(e) {}
        })
        
        return match;
    }else{
        return false;
    }
}

module.exports = {
    name: 'blacklist',
    description: 'Limits Sessions Based on IP Address of the Client. If a matching IP Address or Range is found the session will be terminated otherwise it will be let through. Ranges are based on CIDR http://wikipedia.org/wiki/Classless_Inter-Domain_Routing',
    func: function(options, local, callback){
        if(!options.get('blacklist')) return callback(null, true);
        // IF IP CAN'T BE VALIDATED
        if((!this.information.ip) || (!ipaddr.isValid(this.information.ip))) {
            return callback("IP Address is invalid");
        }
        
        // Process Mapped ipv4 mapped ipv6 ips to ipv4 ips e.g. (::ffff:127.0.0.1 to 127.0.0.1)
        if(this.information.process === true) this.information.ip = ipaddr.process(this.information.ip).toString();
        
        if(IP_MATCH_ALL(options.get('blacklist.address'), options.get('blacklist.range'), this.information.ip)) {
            callback("IP is Blacklisted!");
        }else{
            callback(null, true);
        }
    }
}