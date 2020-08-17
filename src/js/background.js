'use strict';

let readLater = {
	notify: (message, title) => {
		browser.notifications.create({
			type: 'basic',
			message: message + '',
			title: browser.i18n.getMessage(title),
			iconUrl: browser.extension.getURL('readLater.svg')
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
				let num = Object.keys(storage).length - 1;   //except config key
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
	init: () => {
		browser.contextMenus.create({
			contexts: ['audio', 'editable', 'frame', 'image', 'link', 'page', 'selection', 'video'],
			documentUrlPatterns: ['<all_urls>'],   //exclude privileged URL
			id: 'read-later',
			title: browser.i18n.getMessage('name')
		}, () => {
			if (browser.runtime.lastError) {
				readLater.notify(browser.runtime.lastError, 'createContextMenuError');
			}
		});
		browser.contextMenus.onClicked.addListener((info, tab) => {
			if (info.menuItemId == 'read-later') {
				if (info.linkUrl) {
					if (info.linkText) {   //Require Firefox 56
						readLater.addData(info.linkUrl, info.linkText);
					} else {
						browser.tabs.executeScript({
							code: `
(function(linkUrl) {
	let link = document.querySelector('[href="linkUrl"]');
	if (link) {
		return link.textContent;
	}
	link = document.querySelectorAll('a');
	for (let a of link) {
		if (linkUrl == a.href) {
			return a.textContent;
		}
	}
	return document.title;
})('${info.linkUrl}');`,
							runAt: 'document_start'
						}).then(results => {
							readLater.addData(info.linkUrl, results[0]);
						}, e => {
							console.log('Execute script fail: ' + e);
							readLater.addData(info.linkUrl, tab.title);
						});
					}
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
		browser.storage.sync.get().then(storage => {
			if (storage.config) {   //new format exists
				let num = Object.keys(storage).length - 1;   //except config key
				browser.browserAction.setBadgeText({
					text: num ? num + '' : ''
				});
				return;
			}
			storage = readLater.toNewFormat(storage);   //transfer to new format
			browser.storage.sync.clear().then(() => browser.storage.sync.set(storage)).then(() => {
				let num = Object.keys(storage).length - 1;
				browser.browserAction.setBadgeText({
					text: num ? num + '' : ''
				});
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
