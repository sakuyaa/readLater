'use strict';

let readLater = {
	list: [],
	
	notify: (message, title) => {
		browser.notifications.create({
			type: 'basic',
			message: message + '',
			title: browser.i18n.getMessage(title),
			iconUrl: browser.extension.getURL('readLater.svg')
		});
	},
	removeData: (index, close) => {
		readLater.list.splice(index, 1);
		browser.storage.sync.set({list: readLater.list}).then(() => {
			browser.browserAction.setBadgeText({
				text: readLater.list.length ? readLater.list.length.toString() : ''
			});
			if (close) {   //Close window after setStorage and setBadgeText
				window.close();
			}
		}, e => {
			readLater.notify(e, 'setStorageError');
		});
	},
	
	buildTr: table => {
		let list = readLater.list,
			tr, td, button, cellIndex;
		for (let i = 0; i < list.length; i++) {
			tr = table.insertRow(i + 1);   //add 1 row represent table header
			cellIndex = 0;
			td = tr.insertCell(cellIndex++);
			td.textContent = list[i].date;
			
			td = tr.insertCell(cellIndex++);
			button = document.createElement('button');
			button.setAttribute('title', list[i].url);
			button.setAttribute('type', 'button');
			button.textContent = list[i].title;
			button.addEventListener('click', () => {
				browser.tabs.create({url: list[i].url}).then(() => {
					if (list[i].scrollTop) {
						browser.tabs.executeScript({
							code: 'document.documentElement.scrollTop = ' + list[i].scrollTop
						}).then(null, e => {
							console.log('Execute script fail: ' + e);
						});
					}
					readLater.removeData(i, true);
				}, e => {
					readLater.notify(e, 'createTabError');
				});
			}, false);
			td.appendChild(button);
			
			td = tr.insertCell(cellIndex++);
			button = document.createElement('button');
			button.setAttribute('type', 'button');
			button.textContent = '×';
			button.addEventListener('click', e => {
				for (let j = 0; j < table.rows.length; j++) {
					if (table.rows[j] == e.target.parentNode.parentNode) {
						readLater.removeData(j - 1);   //minus 1 to exclude table header
						table.deleteRow(j);
						break;
					}
				}
			}, false);
			td.appendChild(button);
		}
	},
	init: () => {
		let table = document.getElementById('list'),
			tr = table.insertRow(0),
			th = document.createElement('th');
		th.textContent = browser.i18n.getMessage('addTime');
		tr.appendChild(th);
		th = document.createElement('th');
		th.textContent = browser.i18n.getMessage('title');
		tr.appendChild(th);
		th = document.createElement('th');
		th.textContent = browser.i18n.getMessage('remove');
		tr.appendChild(th);
		
		browser.storage.sync.get({list: []}).then(item => {
			readLater.list = item.list;
			readLater.buildTr(table);
		}, e => {
			readLater.notify(e, 'getStorageError');
		});
	}
};

readLater.init();
