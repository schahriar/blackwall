var BlocManager = function(bloc, session) {
	this.session = session;
	this.removeFromBloc = bloc.remove;
	this.assignToBloc = bloc.assign;
}

BlocManager.prototype.terminate = function() {
	this.removeFromBloc(this.session)
}

module.exports = BlocManager;
