var _ = require('lodash');

module.exports = function(storage) {
	return {
		get: function(query, callback) {
			var result = storage[query.key];
			// If Query.limit is a Number return a limited number of Array
			if(_.isNumber(query.limit) && _.isArray(result)) {
				result = _.slice(result, result.length - query.limit, result)
			}
			callback(null, result);
		},
		set: function(query, callback) {
			storage[query.key] = query.value;
			callback(null, query.value);
		},
		remove: function(query, callback) {
			// I personally don't deleting like this
			// but seems like the least CPU expensive option
			if(storage[query.key]) delete storage[query.key];
			callback(null);	
		},
		list: function(callback) {
			callback(null, Object.keys(storage));
		},
		length: function(callback) {
			callback(null, _.size(storage));
		}
	}
}