
'use strict';
function monitor(options) {
	if (mon == undefined) {
		mon = new Worker("/lib/worker.js");
	}
	browser.storage.local.get(config.command.guess, function(item) {
		mon.postMessage([options]);
		mon.onmessage = function(e) {
			console.log(e.data);
			if (e.data[0] == "complete") {
				notify(browser.i18n.getMessage("download_complete", e.data[1] ));
				if (item.sound != "0") {
					var audio = new Audio('/data/Sound/complete' + item.sound + '.wav');
					audio.play();
				}
			}	
			else if (e.data[0] == "badge" && item.badge){
				if(e.data[1] == 0){
					browser.browserAction.setBadgeText({text: ""});
					mon = null;
				}
				else {
					browser.browserAction.setBadgeText({text: e.data[1].toString()});
				}
			}
			else if (e.data[0] == "error"){
				notify(browser.i18n.getMessage("download_error", e.data[1] ));
			}
		}
	});
}

function notify(message) {
	browser.notifications.create({
		type: 'basic',
		iconUrl: '/data/icons/48.png',
		title: browser.i18n.getMessage("extensionName"),
		message: message.message || message
	}).then((id) => { 
		setTimeout(() => {
			browser.notifications.clear(id.toString());
		}, 2000);
	});
}

function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if(Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si
        ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
        : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1)+' '+units[u];
}

function isRunning(item, aria2) {
	//check whether aria2 is runnning
	var xhttp = new XMLHttpRequest();
	var url = "aria2://"
	if (item.shutdown)
		url += "stop-with-process";
	if (item.protocol.toLowerCase() == "ws" || item.protocol.toLowerCase() == "wss") {
		aria2.open().then(
			function (res) {
				aria2.close();
			},
			function (err) {
				if (item.auto) {
					var creating = browser.windows.create({
						url: url,
						type: "popup",
						width: 50,
						height: 50,
					});
					creating.then(windowInfo => {
						browser.windows.remove(windowInfo.id);
					}, () => {});
				}
			}
		);
	}
	else {
		aria2.getVersion().then(
			function (res) {
				console.log('result', res);
			},
			function (err) {
				if (item.auto) {
					var creating = browser.windows.create({
						url: url,
						type: "popup",
						width: 50,
						height: 50,
					});
					creating.then(windowInfo => {
						browser.windows.remove(windowInfo.id);
					}, () => {});
				}
			}
		);
	}
}

function downloadPanel(d) {
	globalD.push(d);
	//get incognito
	var getting = browser.windows.getCurrent();
	getting.then((windowInfo) => {
		browser.storage.local.get(['dpTop', 'dpLeft', 'dpWidth', 'dpHeight'], item1 => {
			var creating = browser.windows.create({
				top: item1.dpTop,
				left: item1.dpLeft,
				url: "data/DownloadPanel/index.html",
				type: "popup",
				width: 412 + parseInt((screen.width / 5000) * parseInt(item1.dpWidth || 0)),
				height: 200 + parseInt(33 * window.devicePixelRatio + (screen.height / 5000) * parseInt(item1.dpHeight || 0)) ,
				incognito: windowInfo.incognito,
				//titlePreface: "Aria2",
				//state: "fullscreen",
			});
			creating.then((wInfo) => {
				function handleZoomed(zoomChangeInfo){
					browser.storage.local.get(config.command.guess, (item) => {
						if (zoomChangeInfo.tabId == wInfo.tabs[0].id) {
							var updating = browser.windows.update(wInfo.id, {
								focused: true,
								top: item1.dpTop,
								left: item1.dpLeft,
								width: parseInt(412 * zoomChangeInfo.newZoomFactor * item.zoom 
													+ (screen.width / 5000) * parseInt(item1.dpWidth || 0)),
								height: parseInt(200 * zoomChangeInfo.newZoomFactor * item.zoom
													+ 33 * window.devicePixelRatio 
													+ (screen.height / 5000) * parseInt(item1.dpHeight || 0)),
							});
							browser.tabs.onZoomChange.removeListener(handleZoomed);
						}
					});
				}
				browser.tabs.onZoomChange.addListener(handleZoomed);
			}, () => {});
		});
	}, () => {});
}