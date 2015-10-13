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
        var session = this;
        analytics.get('record', function(error, record) {
            analytics.get('time', function(error, time) {
                if(!record) record = {};
                if(!time) time = [];
                // Push Session Time to Analytics if it doesn't exist
                if(!record[session.sessionID]) {
                    // Analytics Record Prevents Multiple Ratelimiters to push dates for the same session
                    record[session.sessionID] = true;
                    // Push Date for this session
                    time.push(session.createdAt);
                    analytics.set('time', time);
                    analytics.set('record', record);
                };
                // Prevent Computation if no Options are passed
                options.get('rate', function(error, rate) {
                    if(error) return callback(error);
                    // If Rate is not defined ignore
                    if(!rate) return callback(null, true);
                    if(!_.isPlainObject(rate)) return callback("Option->Rate is not an object");
                    
                    // Fast Compare
                    if(FAST_TIME_COMPARE(time[time.length - +rate.s], 1000)) {
                        callback("Max Number Of Hits Per Second Reached");
                    }else if (FAST_TIME_COMPARE(time[time.length - +rate.m], 60000)){
                        callback("Max Number Of Hits Per Minute Reached");
                    }else if (FAST_TIME_COMPARE(time[time.length - +rate.h], 3600000)){
                        callback("Max Number Of Hits Per Hour Reached");
                    }else{
                        callback(null, true);
                    }
                })  
            })
        })
    }
}