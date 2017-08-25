'use strict';

let table = document.getElementById('list'),
	tr = document.createElement('tr'),
	th = document.createElement('th');
th.textContent = browser.i18n.getMessage('addTime');
tr.appendChild(th);
th = document.createElement('th');
th.textContent = browser.i18n.getMessage('title');
tr.appendChild(th);
th = document.createElement('th');
th.textContent = browser.i18n.getMessage('remove');
tr.appendChild(th);
table.appendChild(tr);

browser.runtime.getBackgroundPage().then(page => {
	let list = page.readLater.list,
		td, button;
	for (let i in list) {
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.textContent = list[i].date;
		tr.appendChild(td);
		
		td = document.createElement('td');
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
				page.readLater.removeData(i);
				window.close();
			}, e => {
				page.readLater.notify(e, browser.i18n.getMessage('createTabError'));
			});
		}, false);
		td.appendChild(button);
		tr.appendChild(td);
		
		td = document.createElement('td');
		button = document.createElement('button');
		button.setAttribute('type', 'button');
		button.textContent = '×';
		button.addEventListener('click', e => {
			page.readLater.removeData(i);
			table.removeChild(e.target.parentNode.parentNode);   //remove row
		}, false);
		td.appendChild(button);
		tr.appendChild(td);
		
		table.appendChild(tr);
	}
}, e => {
	page.readLater.notify(e, browser.i18n.getMessage('getBackgroundPageError'));
});
