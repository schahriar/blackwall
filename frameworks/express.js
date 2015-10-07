var _ = require("lodash");
module.exports = {
    name: "express",
    framework: true,

    inbound: function(policy, options) {
        var _this = this;

        return function(req, res, next) {
            if((!options) || (!options.unsafe)) req.overrideip = false;
            var address = (req.overrideip || _.first(req.ips) || req.ip);
            _this.session(address, {
                ip: address
            }, policy, function(error, session){
                // Handle Express Errors better
                if(error) return console.log("SESSION ERROR:", error);
                session.on('terminate', function() {
                    res.status(503).end();
                })
                next();
            });
        }
    },
}
