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
	},
	removeData: (urls, index) => {
		urls.splice(index, 1);
		browser.storage.sync.set({urls: urls}).then(null, e => {
			readLater.notify(e, browser.i18n.getMessage('setStorageError'));
		});
	},
	buildTr: (table, urls) => {
		let tr, td, button;
		for (let i in urls) {
			tr = document.createElement('tr');
			td = document.createElement('td');
			td.textContent = urls[i].date;
			tr.appendChild(td);
			
			td = document.createElement('td');
			button = document.createElement('button');
			button.setAttribute('title', urls[i].url);
			button.setAttribute('type', 'button');
			button.textContent = urls[i].title;
			button.addEventListener('click', () => {
				browser.tabs.create({url: urls[i].url}).then(() => {
					if (urls[i].scrollTop) {
						browser.tabs.executeScript({
							code: 'document.documentElement.scrollTop = ' + urls[i].scrollTop
						}).then(null, e => {
							console.log('Execute script fail: ' + e);
						});
					}
					readLater.removeData(urls, i);
					window.close();
				}, e => {
					readLater.notify(e, browser.i18n.getMessage('createTabError'));
				});
			}, false);
			td.appendChild(button);
			tr.appendChild(td);
			
			td = document.createElement('td');
			button = document.createElement('button');
			button.setAttribute('type', 'button');
			button.textContent = '×';
			button.addEventListener('click', e => {
				readLater.removeData(urls, i);
				table.removeChild(e.target.parentNode.parentNode);   //remove row
			}, false);
			td.appendChild(button);
			tr.appendChild(td);
			
			table.appendChild(tr);
		}
	},
	popup: () => {
		let table = document.getElementById('list'),
			tr = document.createElement('tr'),
			th = document.createElement('th');
		th.textContent = browser.i18n.getMessage('addTime');
		tr.appendChild(th);
		th = document.createElement('th');
		th.textContent = browser.i18n.getMessage('title');
		tr.appendChild(th);
		th = document.createElement('th');
		th.textContent = browser.i18n.getMessage('delete');
		tr.appendChild(th);
		table.appendChild(tr);
		
		browser.storage.sync.get({urls:[]}).then(item => {
			readLater.buildTr(table, item.urls);
		}, e => {
			readLater.notify(e, browser.i18n.getMessage('getStorageError'));
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
	}
};
