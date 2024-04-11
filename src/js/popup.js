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
	removeData: async (removeKey, close) => {
		let storage;
		try {
			storage = await browser.storage.sync.get();
		} catch (e) {
			readLater.notify(e, 'getStorageError');
			return;
		}
		let historyList = {};
		let num = 0, historyNum = 0;
		for (let key of Object.keys(storage)) {
			if (key == 'config') {
				continue;
			}
			if (storage[key].removeDate) {
				historyNum++;
				historyList[(new Date(storage[key].removeDate)).getTime()] = storage[key];
				historyList[(new Date(storage[key].removeDate)).getTime()].key = key;
				continue;
			}
			num++;
		}
		let maxHistory = storage.config.maxHistory ? storage.config.maxHistory : 0;
		try {
			if (maxHistory) {
				let item = {};
				item[removeKey] = storage[removeKey];
				item[removeKey].removeDate = (new Date()).toISOString();
				await browser.storage.sync.set(item);
				historyNum++;
			} else {
				await browser.storage.sync.remove(removeKey);
			}
			num--;
			browser.browserAction.setBadgeText({
				text: num ? num + '' : ''
			});
			if (historyNum > maxHistory) {   //Remove data which exceed max history list number
				let removeNum = historyNum - maxHistory;
				for (let key of Object.keys(historyList).sort()) {   //Sort by remove date
					if (removeNum-- > 0) {
						await browser.storage.sync.remove(historyList[key].key);
					}
				}
			}
		} catch (e) {
			readLater.notify(e, 'setStorageError');
		}
		if (close) {   //Close window after setStorage and setBadgeText
			window.close();
		}
	},
	
	buildTr: (table, storage) => {
		let tr, td, button, cellIndex, date;
		let copyInput = document.getElementById('copy');
		let index = 1;   //add 1 row represent table header
		for (let key of Object.keys(storage).sort()) {
			if (key == 'config') {
				continue;
			}
			if (storage[key].removeDate) {
				continue;
			}
			tr = table.insertRow(index++);
			cellIndex = 0;
			td = tr.insertCell(cellIndex++);
			td.setAttribute('title', browser.i18n.getMessage('copyURL'));
			date = new Date(storage[key].date);
			td.textContent = date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).substr(-2) + '-' +
				('0' + date.getDate()).substr(-2) + ' ' + date.toTimeString().split(' ')[0];
			td.addEventListener('click', e => {
				copyInput.value = storage[key].url;
				copyInput.select();
				document.execCommand('copy');
				e.target.textContent = browser.i18n.getMessage('copied');
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
						}).catch(e => {
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
			td.appendChild(button);

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
