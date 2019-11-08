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
		browser.storage.sync.get({list: []}).then(item => {
			let date = new Date();
			item.list.push({
				url: url,
				title: title,
				scrollTop: scrollTop ? scrollTop : 0,
				date: date.getFullYear() + '/' + ('0' + (date.getMonth() + 1)).substr(-2) + '/' +
					('0' + date.getDate()).substr(-2) + ' ' + date.toTimeString().split(' ')[0]
			});
			browser.storage.sync.set(item).then(() => {
				browser.browserAction.setBadgeText({
					text: item.list.length ? item.list.length.toString() : ''
				});
			}, e => {
				readLater.notify(e, 'setStorageError');
			});
		}, e => {
			readLater.notify(e, 'getStorageError');
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
		browser.storage.sync.get({list: []}).then(item => {
			if (item.list.length) {
				browser.browserAction.setBadgeText({text: item.list.length.toString()});
			}
		}, e => {
			readLater.notify(e, 'getStorageError');
		});
	}
};

readLater.init();
