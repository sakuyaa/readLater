/**************************************************
*	readLater by sakuyaa.
*
*	https://github.com/sakuyaa/
**************************************************/
'use strict';

let readLater = {
	notify: (message, title) => {
		browser.notifications.create({
			type: 'basic',
			message: message + '',
			title: browser.i18n.getMessage(title),
			iconUrl: browser.runtime.getURL('readLater.svg')
		});
	},
	addData: (url, title, scrollTop) => {
		let date = new Date();
		let item = {};
		item[date.getTime()] = {
			date: date.toISOString(),
			scrollTop: scrollTop ? scrollTop : 0,
			title: title,
			url: url
		};
		browser.storage.sync.set(item).then(() => {
			browser.storage.sync.get().then(storage => {
				let num = 0;
				for (let key of Object.keys(storage)) {
					if (key == 'config') {
						continue;
					}
					if (storage[key].removeDate) {
						continue;
					}
					num++;
				}
				browser.browserAction.setBadgeText({
					text: num ? num + '' : ''
				});
			}, e => {
				readLater.notify(e, 'getStorageError');
			});
		}, e => {
			readLater.notify(e, 'setStorageError');
		});
	},
	initElement: storage => {
		let num = 0;
		for (let key of Object.keys(storage)) {
			if (key == 'config') {
				continue;
			}
			if (storage[key].removeDate) {
				continue;
			}
			num++;
		}
		browser.browserAction.setBadgeText({
			text: num ? num + '' : ''
		});
		browser.menus.create({
			contexts: ['audio', 'editable', 'frame', 'image', 'link', 'page', 'selection', 'video'],
			documentUrlPatterns: ['<all_urls>'],   //exclude privileged URL
			id: 'read-later',
			title: browser.i18n.getMessage('name') + (storage.config.accessKey ? '(&' + storage.config.accessKey + ')' : '')
		}, () => {
			if (browser.runtime.lastError) {
				readLater.notify(browser.runtime.lastError, 'createContextMenuError');
			}
		});
		browser.menus.onClicked.addListener((info, tab) => {
			if (info.menuItemId == 'read-later') {
				if (info.linkUrl) {
					readLater.addData(info.linkUrl, info.linkText);   //Require Firefox 56
				} else if (info.srcUrl && info.mediaType != 'image') {
					readLater.addData(info.srcUrl, tab.title);
				} else {
					browser.tabs.executeScript({
						code: 'document.documentElement.scrollTop',
						runAt: 'document_start'
					}).then(results => {
						readLater.addData(info.pageUrl, tab.title, results[0]);
					}, e => {
						console.log('Execute script fail: ' + e);
						readLater.addData(info.pageUrl, tab.title);
					});
				}
			}
		});
	},
	init: () => {
		browser.storage.sync.get().then(storage => {
			if (storage.config) {   //new format exists
				readLater.initElement(storage);
				return;
			}
			storage = readLater.toNewFormat(storage);   //transfer to new format
			browser.storage.sync.clear().then(() => browser.storage.sync.set(storage)).then(() => {
				readLater.initElement(storage);
			}, e => {
				readLater.notify(e, 'setStorageError');
			});
		}, e => {
			readLater.notify(e, 'getStorageError');
		});
	},
	toNewFormat: storage => {
		let storageNew = {
			config: {
				accessKey: 'E',
				maxHistory: 0,
				openInBackground: storage.openInBackground ? true : false
			}
		};
		if (storage.list) {
			let date;
			for (let item of storage.list) {
				date = new Date(item.date);
				item.date = date.toISOString();
				storageNew[date.getTime()] = item;
			}
		}
		return storageNew;
	}
};

readLater.init();
