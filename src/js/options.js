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
			let num = Object.keys(storage).length - 1;
			browser.browserAction.setBadgeText({
				text: num ? num + '' : ''
			});
		}, e => {
			readLater.notify(e, 'setStorageError');
		});
	},
	exportConf: storage => {
		let download = document.createElement('a');
		download.setAttribute('download', 'readLater.json');
		download.setAttribute('href', URL.createObjectURL(new Blob([JSON.stringify(storage, null, '\t')])));
		download.dispatchEvent(new MouseEvent('click'));
	},
	init: () => {
		browser.storage.sync.get('config').then(storage => {
			$id('open-in-background').checked = storage.config.openInBackground;
		}, e => {
			readLater.notify(e, 'getStorageError');
		});
		$id('open-in-background').addEventListener('click', e => {
			browser.storage.sync.set({
				config: {
					openInBackground: e.target.checked
				}
			}).then(null, e => {
				readLater.notify(e, 'setStorageError');
			});
		});
		$id('open-in-background-text').textContent = browser.i18n.getMessage('openInBackground');
		$id('import').textContent = browser.i18n.getMessage('import');
		$id('import').addEventListener('click', () => {
			let input = document.createElement('input');
			input.setAttribute('accept', 'application/json');
			input.setAttribute('hidden', 'hidden');
			input.setAttribute('type', 'file');
			document.body.appendChild(input);
			input.addEventListener('change', () => {
				let reader = new FileReader();
				reader.onload = () => {
					readLater.importConf(reader.result);
				};
				reader.readAsText(input.files[0]);
			}, {once: true});
			input.click();
		});
		$id('export').textContent = browser.i18n.getMessage('export');
		$id('export').addEventListener('click', () => {
			browser.storage.sync.get().then(storage => {
				readLater.exportConf(storage);
			}, e => {
				readLater.notify(e, 'getStorageError');
			});
		});
	},
	toNewFormat: storage => {
		let storageNew = {
			config: {
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
