'use strict';

//variables that were declared using const or let do not appear in the Window object returned by runtime.getBackgroundPage()
var readLater = {
	list: [],
	
	notify: (message, title) => {
		browser.notifications.create({
			type: 'basic',
			message: message,
			title: title,
			iconUrl: browser.extension.getURL('readLater.svg')
		});
	},
	addData: (url, title, scrollTop) => {
		let date = new Date();
		if (scrollTop) {
			readLater.list.push({
				url: url,
				title: title,
				scrollTop: scrollTop,
				date: date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate() +
					' ' + date.toTimeString().split(' ')[0]
			});
		} else {
			readLater.list.push({
				url: url,
				title: title,
				date: date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate() +
					' ' + date.toTimeString().split(' ')[0]
			});
		}
		browser.storage.sync.set({list: readLater.list}).then(() => {
			browser.browserAction.setBadgeText({
				text: readLater.list.length ? readLater.list.length.toString() : ''
			});
		}, e => {
			readLater.notify(e, browser.i18n.getMessage('setStorageError'));
		});
	},
	removeData: index => {
		readLater.list.splice(index, 1);
		browser.storage.sync.set({list: readLater.list}).then(() => {
			browser.browserAction.setBadgeText({
				text: readLater.list.length ? readLater.list.length.toString() : ''
			});
		}, e => {
			readLater.notify(e, browser.i18n.getMessage('setStorageError'));
		});
	},
	
	init: () => {
		browser.contextMenus.create({
			contexts: ['audio', 'link', 'page', 'video'],
			documentUrlPatterns: ['<all_urls>'],   //exclude privileged URL
			id: 'read-later',
			title: browser.i18n.getMessage('name')
		}, () => {
			if (browser.runtime.lastError) {
				readLater.notify(browser.runtime.lastError, browser.i18n.getMessage('createContextMenuError'));
			}
		});
		browser.contextMenus.onClicked.addListener((info, tab) => {
			if (info.menuItemId == 'read-later') {
				if (info.linkUrl) {
					browser.tabs.executeScript({
						code: '\
						function getLinkTitle(linkUrl) {\
							let link = document.querySelector(\'[href="\' + linkUrl + \'"]\');\
							if (link) {\
								return link.textContent;\
							}\
							link = document.querySelectorAll(\'a\');\
							for (let a of link) {\
								if (linkUrl == a.href) {\
									return a.textContent;\
								}\
							}\
							return document.title;\
						}\
						getLinkTitle("' + info.linkUrl + '");'
					}).then(results => {
						readLater.addData(info.linkUrl, results[0]);
					}, e => {
						console.log('Execute script fail: ' + e);
						readLater.addData(info.linkUrl, tab.title);
					});
				} else if (info.srcUrl) {
					readLater.addData(info.srcUrl, tab.title);
				} else if (info.pageUrl) {
					browser.tabs.executeScript({
						code: 'document.documentElement.scrollTop'
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
			readLater.list = item.list;
			if (readLater.list.length) {
				browser.browserAction.setBadgeText({text: readLater.list.length.toString()});
			}
		}, e => {
			readLater.notify(e, browser.i18n.getMessage('getStorageError'));
		});
	}
};

readLater.init();
