var _ = require("lodash");

function FAST_TIME_COMPARE(last, unit, limit) {
    if(last) {
        // Absolute(T[LAST] - T[NOW])/UNIT < 1 UNIT
        if(Math.abs(last - new Date().getTime())/unit < 1) {
            return true;
        }else{
            return false;
        }
    }else{
        return false;
    }
}

module.exports = {
    name: 'rateLimiter',
    description: 'Limits Session Rate based on hits per hour|minute|second',
    group: 'analytics',
    func: function(options, local, analytics, callback){
        if(!analytics.record) analytics.record = {};
        if(!analytics.time) analytics.time = [];
        // Push Session Time to Analytics if it doesn't exist
        if(!analytics.record[this.sessionID]) {
            // Analytics Record Prevents Multiple Ratelimiters to push dates for the same session
            analytics.record[this.sessionID] = true;
            // Push Date for this session
            analytics.time.push(this.createdAt);
        };
        // Prevent Computation if no Options are passed
        if(!options.get('rate')) return callback(null, true);
        
        // Fast Compare
        if(FAST_TIME_COMPARE(analytics.time[analytics.time.length - +options.get('rate.s')], 1000)) {
            callback("Max Number Of Hits Per Second Reached");
        }else if (FAST_TIME_COMPARE(analytics.time[analytics.time.length - +options.get('rate.m')], 60000)){
            callback("Max Number Of Hits Per Minute Reached");
        }else if (FAST_TIME_COMPARE(analytics.time[analytics.time.length - +options.get('rate.h')], 3600000)){
            callback("Max Number Of Hits Per Hour Reached");
        }else{
            callback(null, true);
        }
    }
}