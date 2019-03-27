'use strict';

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
		let item;
		try {
			item = JSON.parse(text);
		} catch(e) {
			readLater.notify(e, 'parseJSONError');
			return;
		}
		browser.storage.sync.set(item).then(() => {
			browser.browserAction.setBadgeText({
				text: item.list.length ? item.list.length.toString() : ''
			});
		}, e => {
			readLater.notify(e, 'setStorageError');
		});
	},
	exportConf: item => {
		let download = document.createElement('a');
		download.setAttribute('download', 'readLater.json');
		download.setAttribute('href', URL.createObjectURL(new Blob([JSON.stringify(item, null, '\t')])));
		download.dispatchEvent(new MouseEvent('click'));
	},
	init: () => {
		document.getElementById('import').textContent = browser.i18n.getMessage('import');
		document.getElementById('import').addEventListener('click', () => {
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
		document.getElementById('export').textContent = browser.i18n.getMessage('export');
		document.getElementById('export').addEventListener('click', () => {
			browser.storage.sync.get({list: []}).then(item => {
				readLater.exportConf(item);
			}, e => {
				readLater.notify(e, 'getStorageError');
			});
		});
	}
};

readLater.init();
