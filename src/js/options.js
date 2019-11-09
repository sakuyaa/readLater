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
		browser.storage.sync.clear().then(() => browser.storage.sync.set(storage)).then(() => {
			$id('open-in-background').checked = storage.openInBackground;
			browser.browserAction.setBadgeText({
				text: storage.list.length ? storage.list.length.toString() : ''
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
		browser.storage.sync.get('openInBackground').then(storage => {
			$id('open-in-background').checked = storage.openInBackground;
		}, e => {
			readLater.notify(e, 'getStorageError');
		});
		$id('open-in-background').addEventListener('click', e => {
			browser.storage.sync.set({openInBackground: e.target.checked}).then(null, e => {
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
	}
};

readLater.init();
