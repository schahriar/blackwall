var BlocManager = function(bloc, session) {
	this.session = session;
	this.removeFromBloc = bloc.remove;
}

BlocManager.prototype.terminate = function() {
	this.removeFromBloc(this.session)
}