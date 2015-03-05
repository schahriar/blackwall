var _ = require("lodash");
module.exports = {
    name: "express",
    framework: true,
    
    create: function() {
        var _this = this;

        return function(req, res, next) {
            // Perhaps in future versions Blackwall could request for all ips in one go
            if( _this.admit(_.first(req.ips) || req.ip) === true ) next();
            else res.status(503).end();
        }
    },
}
