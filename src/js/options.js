/**************************************************
*	readLater by sakuyaa.
*
*	https://github.com/sakuyaa/
**************************************************/
'use strict';

const $id = id => document.getElementById(id);

let readLater = {
	notify: (message, title) => {
		browser.notifications.create({
			type: 'basic',
			message: message + '',
			title: browser.i18n.getMessage(title),
			iconUrl: browser.runtime.getURL('readLater.svg')
		});
	},
	importConf: text => {
		let storage;
		try {
			storage = JSON.parse(text);
		} catch(e) {
			readLater.notify(e, 'parseJSONError');
			return;
		}
		if (storage.config) {
			let storageNew = {};
			storageNew.config = storage.config;
			for (let key in storage) {
				if (key == 'config') {
					continue;
				}
				//make sure the date match the key
				storageNew[(new Date(storage[key].date)).getTime()] = storage[key];
			}
			storage = storageNew;
		} else {
			storage = readLater.toNewFormat(storage);   //transfer to new format
		}
		browser.storage.sync.clear().then(() => browser.storage.sync.set(storage)).then(() => {
			$id('open-in-background').checked = storage.config.openInBackground;
			$id('access-key').value = storage.config.accessKey ? storage.config.accessKey : '';
			$id('max-history').value = storage.config.maxHistory ? storage.config.maxHistory : 0;
			readLater.buildTable(storage);
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
			browser.menus.update('read-later', {
				title: browser.i18n.getMessage('name') + (storage.config.accessKey ? '(&' + storage.config.accessKey + ')' : '')
			}).catch(e => {
				readLater.notify(e, 'createContextMenuError');
			});
		}, e => {
			readLater.notify(e, 'setStorageError');
		});
	},
	exportConf: () => {
		browser.storage.sync.get().then(storage => {
			$id('download').setAttribute('href', URL.createObjectURL(new Blob([JSON.stringify(storage, null, '\t')])));
			$id('download').click();
		}, e => {
			readLater.notify(e, 'getStorageError');
		});
	},
	settingConf: updateMenus => {
		browser.storage.sync.set({
			config: {
				accessKey: $id('access-key').value,
				maxHistory: parseInt($id('max-history').value),
				openInBackground: $id('open-in-background').checked
			}
		}).then(() => {
			if (updateMenus) {
				browser.menus.update('read-later', {
					title: browser.i18n.getMessage('name') + ($id('access-key').value ? '(&' + $id('access-key').value + ')' : '')
				}).catch(e => {
					readLater.notify(e, 'createContextMenuError');
				});
			}
		}, e => {
			readLater.notify(e, 'setStorageError');
		});
	},
	buildTable: storage => {
		let historyList = {};
		for (let key of Object.keys(storage)) {
			if (storage[key].removeDate) {
				historyList[(new Date(storage[key].removeDate)).getTime()] = storage[key];
			}
		}

		let table = $id('list');
		if (!Object.keys(historyList).length) {
			table.setAttribute('hidden', 'hidden');
			return;
		}
		table.innerHTML = '';
		table.removeAttribute('hidden');
		let tr = table.insertRow(0);
		let th = document.createElement('th');
		th.textContent = browser.i18n.getMessage('addTime');
		tr.appendChild(th);
		th = document.createElement('th');
		th.textContent = browser.i18n.getMessage('title');
		tr.appendChild(th);
		th = document.createElement('th');
		th.textContent = browser.i18n.getMessage('removeTime');
		tr.appendChild(th);

		let td, button, cellIndex, date;
		let copyInput = $id('copy');
		let index = 1;   //add 1 row represent table header
		for (let key of Object.keys(historyList).sort()) {
			tr = table.insertRow(index++);
			cellIndex = 0;
			td = tr.insertCell(cellIndex++);
			td.setAttribute('title', browser.i18n.getMessage('copyURL'));
			date = new Date(historyList[key].date);
			td.textContent = date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).substr(-2) + '-' +
				('0' + date.getDate()).substr(-2) + ' ' + date.toTimeString().split(' ')[0];
			td.addEventListener('click', e => {
				copyInput.value = historyList[key].url;
				copyInput.select();
				document.execCommand('copy');
				e.target.textContent = browser.i18n.getMessage('copied');
			});

			td = tr.insertCell(cellIndex++);
			button = document.createElement('button');
			button.setAttribute('title', historyList[key].url + '\n' + historyList[key].title);
			button.setAttribute('type', 'button');
			button.textContent = historyList[key].title;
			button.addEventListener('click', event => {
				browser.tabs.create({
					active: !storage.config.openInBackground,
					url: historyList[key].url
				}).then(tab => {
					if (historyList[key].scrollTop) {
						browser.tabs.executeScript(tab.id, {
							code: 'document.documentElement.scrollTop = ' + historyList[key].scrollTop
						}).catch(e => {
							console.log('Execute script fail: ' + e);
						});
					}
				}, e => {
					readLater.notify(e, 'createTabError');
				});
			});
			td.appendChild(button);

			td = tr.insertCell(cellIndex++);
			date = new Date(historyList[key].removeDate);
			td.textContent = date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).substr(-2) + '-' +
				('0' + date.getDate()).substr(-2) + ' ' + date.toTimeString().split(' ')[0];
		}
	},
	init: () => {
		//config
		browser.storage.sync.get().then(storage => {
			$id('open-in-background').checked = storage.config.openInBackground;
			$id('access-key').value = storage.config.accessKey ? storage.config.accessKey : '';
			$id('max-history').value = storage.config.maxHistory ? storage.config.maxHistory : 0;
			readLater.buildTable(storage);
		}, e => {
			readLater.notify(e, 'getStorageError');
		});
		$id('open-in-background-text').textContent = browser.i18n.getMessage('openInBackground');
		$id('open-in-background').addEventListener('click', () => {
			readLater.settingConf(false);
		});
		$id('access-key-text').textContent = browser.i18n.getMessage('accessKey');
		$id('access-key').addEventListener('keyup', e => {
			if (/^[A-Za-z]$/.test(e.key)) {
				e.target.value = e.key.toUpperCase();
			} else {
				e.target.value = '';
			}
			readLater.settingConf(true);
		});
		$id('max-history-text').textContent = browser.i18n.getMessage('maxHistory');
		$id('max-history').addEventListener('input', () => {
			let value = $id('max-history').value.replace(/[^\d]/g, '');
			if (!value) {
				value = 0;
			} else if (value > 100) {
				value = 100;
			}
			$id('max-history').value = value;
			readLater.settingConf(false);
		});
		//import/export
		$id('input').addEventListener('change', () => {
			let reader = new FileReader();
			reader.onload = () => {
				readLater.importConf(reader.result);
			};
			reader.readAsText($id('input').files[0]);
		});
		$id('import').textContent = browser.i18n.getMessage('import');
		$id('import').addEventListener('click', () => {
			$id('input').click();
		});
		$id('export').textContent = browser.i18n.getMessage('export');
		$id('export').addEventListener('click', readLater.exportConf);
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
