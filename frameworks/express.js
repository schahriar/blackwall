var _ = require("lodash");
module.exports = {
    name: "express",
    framework: true,

    inbound: function(policy, options) {
        var _this = this;

        return function(req, res, next) {
            if((!options) || (!options.unsafe)) req.overrideip = false;
            var address = (req.overrideip || _.first(req.ips) || req.ip);
            var session = _this.session(address, {
                ip: address
            });
            // Handle Express Errors better
            if(session.constructor === Error) {
                 console.log("SESSION ERROR:", session.message);
                 return res.status(503).end();
            }
            session.on('terminate', function() {
                res.status(503).end();
            })
            _this.assign(session, policy, function() {
                if(session.terminated) return res.status(503).end();
                next();
            });
        }
    },
}
