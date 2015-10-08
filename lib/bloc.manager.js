var BlocManager = function(bloc, session) {
	this.session = session;
	this.removeFromBloc = bloc.remove;
	this.assignToBloc = bloc.assign;
	this.updateInBloc = bloc.update;
	this.getInfoFromBloc = bloc.info;
}

BlocManager.prototype.getInfo = function() {
	this.getInfoFromBloc(this.session)
}

BlocManager.prototype.update = function() {
	this.updateInBloc(this.session)
}

BlocManager.prototype.terminate = function() {
	this.removeFromBloc(this.session)
}

module.exports = BlocManager;
