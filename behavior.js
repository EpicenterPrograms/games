var S = Standards.general;
var M = Standards.storage;
var G = Standards.game;
var loggedIn = false;
M.session.store("/games/leaving", true);

M.session.defaultLocation = "games";
M.local.defaultLocation = "games";
if (M.session.recall("save code") === null || M.session.recall("save code") instanceof Error) {
	M.server.defaultLocation = "~websites/games/codes/default";
} else {
	M.server.defaultLocation = "~websites/games/codes/" + M.session.recall("save code");
	loggedIn = true;
}

if (loggedIn) {
	S.onLoad(function () {
		M.server.signIn("anonymous").then(function () {
			S.makeDialog("Ready to play.");
		});
	});
	window.addEventListener("beforeunload", function (event) {
		if (M.session.recall("/games/leaving")) {
			event.preventDefault();
			M.server.recall("players present").then(function (value) {
				if (value - 1 <= 0) {
					M.server.forget("./").then(function () {
						window.close();
					}).catch(function () {
						window.close();
					});
				} else {
					M.server.store("players present", value - 1).then(function () {
						window.close();
					}).catch(function () {
						window.close();
					});
				}
			});
		}
	});
}
