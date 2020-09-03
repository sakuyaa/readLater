'use strict';

const $id = id => document.getElementById(id);

let readLater = {
	notify: (message, title) => {
		browser.notifications.create({
			type: 'basic',
			message: message + '',
			title: browser.i18n.getMessage(title),
			iconUrl: browser.extension.getURL('readLater.svg')
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
			let num = Object.keys(storage).length - 1;
			browser.browserAction.setBadgeText({
				text: num ? num + '' : ''
			});
			browser.menus.update('read-later', {
				title: browser.i18n.getMessage('name') + (storage.config.accessKey ? '(&' + storage.config.accessKey + ')' : '')
			}).catch(error => {
				readLater.notify(error, 'createContextMenuError');
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
	init: () => {
		//config
		browser.storage.sync.get('config').then(storage => {
			$id('open-in-background').checked = storage.config.openInBackground;
			$id('access-key').value = storage.config.accessKey ? storage.config.accessKey : '';
		}, e => {
			readLater.notify(e, 'getStorageError');
		});
		$id('open-in-background').addEventListener('click', () => {
			readLater.settingConf(false);
		});
		$id('open-in-background-text').textContent = browser.i18n.getMessage('openInBackground');
		$id('access-key-text').textContent = browser.i18n.getMessage('accessKey');
		$id('access-key').addEventListener('keyup', e => {
			if (/^[A-Za-z]$/.test(e.key)) {
				e.target.value = e.key.toUpperCase();
			} else {
				e.target.value = '';
			}
			readLater.settingConf(true);
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
