var S = Standards.general;
var M = Standards.storage;
var G = Standards.game;

M.session.defaultLocation = "/games/";
M.local.defaultLocation = "/games/";
M.server.defaultLocation = "^websites/games/";
M.server.requireSignIn = false;
/*
if (M.session.recall("preferences/main save code") === null || M.session.recall("preferences/main save code") instanceof Error) {
	M.server.defaultLocation = "^websites/games/codes/default";
} else {
	M.server.defaultLocation = "^websites/games/codes/" + M.session.recall("preferences/main save code");
}
M.server.requireSignIn = false;

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
*/

function hasGameCode(site) {
	let code = M.session.recall("/games/" + site + "/game code");
	return !(code === null || code instanceof Error || code === "default");
}

function tryLoadingGame(site, successFn) {
	if (S.getType(site) == "String" && site.length > 0) {
		if (!hasGameCode(site)) {  // if a game code doesn't exist
			M.server.defaultLocation = "^websites/games/" + site + "/game codes/default";
		} else {  // if a game code is stored
			M.server.defaultLocation = "^websites/games/" + site + "/game codes/" + M.session.recall("/games/" + site + "/game code");
			if (S.getId("gameCodeInput")) {
				S.getId("gameCodeInput").value = decodeURIComponent(M.session.recall("/games/" + site + "/game code"));
			}
			if (successFn) {
				successFn();
			}
		}
	} else {
		throw new Error("The site must be a non-empty string.");
	}
}

function setGameCode(site, code, options = {}) {
	return new Promise(function (resolve, reject) {
		if (S.getType(site) == "String" && site.length > 0) {
			if (!code) {
				if (S.getId("gameCodeInput")) {
					code = S.getId("gameCodeInput").value.trim();
				}
			}
			if (S.getType(code) == "String" && code.trim().length > 0) {
				code = code.trim();
				let encodedCode = encodeURIComponent(code);
				M.server.list("^websites/games/" + site + "/game codes/", { maxDepth: 1, hybridCutoff: 5, indicateFolders: false }).then(function (codes) {
					if (options.fromURL) {
						if (codes.includes(encodedCode)) {
							M.server.defaultLocation = "^websites/games/" + site + "/game codes/" + encodedCode;
							M.session.store("/games/" + site + "/game code", code);
							S.makeDialog(`Successfully joined the game with the code "${code}".`);
							resolve("joined");
						} else {
							M.session.forget(`/games/${site}/game code`);
							M.server.defaultLocation = `^websites/games/${site}/game codes/default`;
							S.makeDialog(`The game code "${code}" doesn't exist. Check the URL or maybe the code expired.`);
							resolve("failed");
						}
					} else {
						if (codes.includes(encodedCode)) {
							S.makeDialog('The code "' + code + '" already exists. Do you want to join the game?', {
								Yes: function () {
									M.server.defaultLocation = "^websites/games/" + site + "/game codes/" + encodedCode;
									M.session.store("/games/" + site + "/game code", code);
									S.makeDialog("Success!");
									resolve("joined");
								}, No: resolve
							});
						} else {
							S.makeDialog('The code "' + code + '" does not exist. Do you want to start a game with that code?', {
								Yes: function () {
									M.server.defaultLocation = "^websites/games/" + site + "/game codes/" + encodedCode;
									M.session.store("/games/" + site + "/game code", code);
									S.makeDialog("Success!");
									resolve("created");
								}, No: resolve
							});
						}
					}
				}).catch(function () {
					S.makeDialog("It wasn't possible to access the server's game codes.");
					reject(new Error("An error occurred while listing the server's game codes."));
				});
			} else if (S.getType(code) == "String") {
				S.makeDialog("No game code was provided. Do you want to remove an existing code?", {
					Yes: function () {
						M.session.forget("/games/" + site + "/game code");
						M.server.defaultLocation = "^websites/games/" + site + "/game codes/default";
						S.makeDialog("Success!");
						resolve("left");
					}, No: resolve
				});
			} else {
				reject(new TypeError("The game code wasn't a string."));
			}
		} else {
			reject(new Error("The site must be a non-empty string."));
		}
	});
}



// cleans up inactive games
S.onLoad(function () {
	S.forEach(["otrio"], function (site) {
		M.server.list("^websites/games/" + site + "/game codes/", { maxDepth: 1, hybridCutoff: 5 }).then(function (codes) {
			let activeGames = [];
			let updatedTimes = {};
			S.forEach(codes, function (code) {
				activeGames.push(M.server.recall("^websites/games/" + site + "/game codes/" + code + "lastUpdated", { hybridCutoff: 5 }).then(function (time) {
					updatedTimes[code] = time;
				}));
			});
			Promise.all(activeGames).then(function () {  // once all the last updated times have been retrieved
				let now = new Date().getTime();
				S.forEach(updatedTimes, function (time, code) {
					if (now - time > 172800000) {  // if the game hasn't been played in the last 48 hours
						M.server.forget("^websites/games/" + site + "/game codes/" + code, { hybridCutoff: 5 });
					}
				});
			});
		});
	});
});
