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
	
	init: () => {
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
	}
};

readLater.init();
