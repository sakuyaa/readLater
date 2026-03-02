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
			if (storage.config.sortPopup) {
				$id('sort-popup').value = storage.config.sortPopup;
			}
			if (storage.config.sortHistory) {
				$id('sort-history').value = storage.config.sortHistory;
			}
			readLater.buildTable(storage);
			let num = 0;
			for (let key of Object.keys(storage)) {
				if (key == 'config' || storage[key].removeDate) {
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
				openInBackground: $id('open-in-background').checked,
				sortHistory: $id('sort-history').value,
				sortPopup: $id('sort-popup').value
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
		let array = [];
		for (let item of Object.values(storage)) {
			if (item.removeDate) {
				array.push(item);
			}
		}
		array.sort((a, b) => {
			switch (storage.config.sortHistory) {
				case 'dateAsc':
					return a.date > b.date;
				case 'dateDesc':
					return b.date > a.date;
				case 'removeDateDesc':
					return b.removeDate > a.removeDate;
				case 'removeDateAsc':
				default:
					return a.removeDate > b.removeDate;
			}
		});
		$id('history-num').textContent = '(' + browser.i18n.getMessage('historyNum') + array.length + ')';

		let table = $id('list');
		if (!array.length) {
			table.setAttribute('hidden', 'hidden');
			return;
		}
		table.innerHTML = '';
		table.removeAttribute('hidden');
		let tr = table.insertRow(0);
		let th = document.createElement('th');
		switch (storage.config.sortHistory) {
			case 'dateAsc':
				th.textContent = browser.i18n.getMessage('addTime') + ' ↑';
				break;
			case 'dateDesc':
				th.textContent = browser.i18n.getMessage('addTime') + ' ↓';
				break;
			default:
				th.textContent = browser.i18n.getMessage('addTime');
		}
		tr.appendChild(th);
		th = document.createElement('th');
		th.textContent = browser.i18n.getMessage('title');
		tr.appendChild(th);
		th = document.createElement('th');
		switch (storage.config.sortHistory) {
			case 'dateAsc':
			case 'dateDesc':
				th.textContent = browser.i18n.getMessage('removeTime');
				break;
			case 'removeDateDesc':
				th.textContent = browser.i18n.getMessage('removeTime') + ' ↓';
				break;
			case 'removeDateAsc':
			default:
				th.textContent = browser.i18n.getMessage('removeTime') + ' ↑';
		}
		tr.appendChild(th);

		let td, button, cellIndex, date;
		let index = 1;   //add 1 row represent table header
		for (let item of array) {
			tr = table.insertRow(index++);
			cellIndex = 0;
			td = tr.insertCell(cellIndex++);
			td.setAttribute('title', browser.i18n.getMessage('copyURL'));
			date = new Date(item.date);
			td.textContent = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${date.toTimeString().split(' ')[0]}`;
			td.addEventListener('click', e => {
				navigator.clipboard.writeText(item.url).then(() => {
					e.target.textContent = browser.i18n.getMessage('copied');
				}).catch(e => {
					readLater.notify(e, 'writeTextError');
				});
			});

			td = tr.insertCell(cellIndex++);
			button = document.createElement('button');
			button.setAttribute('title', item.url + '\n' + item.title);
			button.setAttribute('type', 'button');
			button.textContent = item.title;
			button.addEventListener('click', event => {
				browser.tabs.create({
					active: !storage.config.openInBackground,
					url: item.url
				}).then(tab => {
					if (item.scrollTop) {
						browser.tabs.executeScript(tab.id, {
							code: 'document.documentElement.scrollTop = ' + item.scrollTop
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
			date = new Date(item.removeDate);
			td.textContent = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${date.toTimeString().split(' ')[0]}`;
		}
	},
	initConf: () => {
		browser.storage.sync.get().then(storage => {
			$id('open-in-background').checked = storage.config.openInBackground;
			$id('access-key').value = storage.config.accessKey ? storage.config.accessKey : '';
			$id('max-history').value = storage.config.maxHistory ? storage.config.maxHistory : 0;
			if (storage.config.sortPopup) {
				$id('sort-popup').value = storage.config.sortPopup;
			}
			if (storage.config.sortHistory) {
				$id('sort-history').value = storage.config.sortHistory;
			}
			readLater.buildTable(storage);
		}, e => {
			readLater.notify(e, 'getStorageError');
		});
	},
	init: () => {
		readLater.initConf();

		$id('open-in-background-text').textContent = browser.i18n.getMessage('openInBackground');
		$id('open-in-background').addEventListener('click', () => {
			readLater.settingConf(false);
			readLater.initConf();
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
		$id('sort-popup-text').textContent = browser.i18n.getMessage('sortPopup');
		$id('sort-popup-date-asc').textContent = browser.i18n.getMessage('sortPopupDateAsc');
		$id('sort-popup-date-desc').textContent = browser.i18n.getMessage('sortPopupDateDesc');
		$id('sort-popup').addEventListener('change', () => {
			readLater.settingConf(false);
		});
		$id('sort-history-text').textContent = browser.i18n.getMessage('sortHistory');
		$id('sort-history-date-asc').textContent = browser.i18n.getMessage('sortHistoryDateAsc');
		$id('sort-history-date-desc').textContent = browser.i18n.getMessage('sortHistoryDateDesc');
		$id('sort-history-remove-date-asc').textContent = browser.i18n.getMessage('sortHistoryRemoveDateAsc');
		$id('sort-history-remove-date-desc').textContent = browser.i18n.getMessage('sortHistoryRemoveDateDesc');
		$id('sort-history').addEventListener('change', () => {
			readLater.settingConf(false);
			readLater.initConf();
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
				openInBackground: storage.openInBackground ? true : false,
				sortHistory: 'removeDateAsc',
				sortPopup: 'dateAsc'
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
