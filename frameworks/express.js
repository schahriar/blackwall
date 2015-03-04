var _ = require("lodash");
module.exports = {
    create: function(req, res, next) {
        // Perhaps in future versions Blackwall could request for all ips in one go    
        if( this.admit(_.first(req.ips)) ) next();
        else res.status(503).end();
    }
}
