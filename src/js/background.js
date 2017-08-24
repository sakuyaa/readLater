'use strict';

let readLater = {
	notify: (message, title) => {
		browser.notifications.create({
			type: 'basic',
			message: message,
			title: title,
			iconUrl: browser.extension.getURL('readLater.svg')
		});
	},
	addData: (url, title, scrollTop) => {
		browser.storage.sync.get({urls: []}).then(item => {
			let date = new Date();
			if (scrollTop) {
				item.urls.push({
					url: url,
					title: title,
					scrollTop: scrollTop,
					date: date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate() +
						' ' + date.toTimeString().split(' ')[0]
				});
			} else {
				item.urls.push({
					url: url,
					title: title,
					date: date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate() +
						' ' + date.toTimeString().split(' ')[0]
				});
			}
			browser.storage.sync.set(item).then(null, e => {
				readLater.notify(e, browser.i18n.getMessage('setStorageError'));
			});
		}, e => {
			readLater.notify(e, browser.i18n.getMessage('getStorageError'));
		});
	}
};

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
			readLater.addData(info.linkUrl, tab.title);
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
