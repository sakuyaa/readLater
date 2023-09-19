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
	removeData: (key, close) => {
		browser.storage.sync.remove(key).then(() => {
			browser.storage.sync.get().then(storage => {
				let num = Object.keys(storage).length - 1;   //except config key
				browser.browserAction.setBadgeText({
					text: num ? num + '' : ''
				});
				if (close) {   //Close window after setStorage and setBadgeText
					window.close();
				}
			}, e => {
				readLater.notify(e, 'getStorageError');
			});
		}, e => {
			readLater.notify(e, 'setStorageError');
		});
	},
	
	buildTr: (table, storage) => {
		let tr, td, div, button, cellIndex, date;
		let input = document.getElementById('input');
		let index = 1;   //add 1 row represent table header
		for (let key of Object.keys(storage).sort()) {
			if (key == 'config') {
				continue;
			}
			tr = table.insertRow(index++);
			cellIndex = 0;
			td = tr.insertCell(cellIndex++);
			td.setAttribute('title', browser.i18n.getMessage('copyURL'));
			date = new Date(storage[key].date);
			td.textContent = date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).substr(-2) + '-' +
				('0' + date.getDate()).substr(-2) + ' ' + date.toTimeString().split(' ')[0];
			td.addEventListener('click', () => {
				input.value = storage[key].url;
				input.select();
				document.execCommand('copy');
				event.target.textContent = browser.i18n.getMessage('copied');
			});

			td = tr.insertCell(cellIndex++);
			button = document.createElement('button');
			button.setAttribute('title', storage[key].url + '\n' + storage[key].title);
			button.setAttribute('type', 'button');
			button.textContent = storage[key].title;
			button.addEventListener('click', event => {
				browser.tabs.create({
					active: !storage.config.openInBackground,
					url: storage[key].url
				}).then(tab => {
					if (storage[key].scrollTop) {
						browser.tabs.executeScript(tab.id, {
							code: 'document.documentElement.scrollTop = ' + storage[key].scrollTop
						}).then(null, e => {
							console.log('Execute script fail: ' + e);
						});
					}
					if (!event.ctrlKey) {
						readLater.removeData(key, true);
					}
				}, e => {
					readLater.notify(e, 'createTabError');
				});
			});
			div = document.createElement('div');
			div.appendChild(button);
			td.appendChild(div);

			td = tr.insertCell(cellIndex++);
			button = document.createElement('button');
			button.setAttribute('type', 'button');
			button.textContent = '×';
			button.addEventListener('click', e => {
				readLater.removeData(key);
				table.deleteRow(e.target.parentNode.parentNode.rowIndex);
			});
			td.appendChild(button);
		}
	},
	init: () => {
		let table = document.getElementById('list');
		let tr = table.insertRow(0);
		let th = document.createElement('th');
		th.textContent = browser.i18n.getMessage('addTime');
		tr.appendChild(th);
		th = document.createElement('th');
		th.textContent = browser.i18n.getMessage('title');
		tr.appendChild(th);
		th = document.createElement('th');
		th.textContent = browser.i18n.getMessage('remove');
		tr.appendChild(th);
		
		browser.storage.sync.get().then(storage => {
			readLater.buildTr(table, storage);
		}, e => {
			readLater.notify(e, 'getStorageError');
		});
	}
};

readLater.init();
