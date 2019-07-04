const Apify = require('apify');

/**
 * Gets attribute as text from a ElementHandle.
 * @param {ElementHandle} element - The element to get attribute from.
 * @param {string} attr - Name of the attribute to get.
 */
const getAttribute = async (element, attr) => {
    try {
        const prop = await element.getProperty(attr);
        return (await prop.jsonValue()).trim();
    } catch (e) { return null; }
};
module.exports.getAttribute = getAttribute;

/**
 * Adds links from a page to the RequestQueue.
 * @param {Page} page - Puppeteer Page object containing the link elements.
 * @param {RequestQueue} requestQueue - RequestQueue to add the requests to.
 * @param {string} selector - A selector representing the links.
 * @param {Function} condition - Function to check if the link is to be added.
 * @param {string} label - A label for the added requests.
 * @param {Function} urlMod - Function for modifying the URL.
 * @param {Function} keyMod - Function for generating uniqueKey from the link ElementHandle.
 */
module.exports.enqueueLinks = async (page, requestQueue, selector, condition, label, urlMod, keyMod) => {
    const links = await page.$$(selector);
    for (const link of links) {
        const href = await getAttribute(link, 'href');
        if (href && (!condition || await condition(link))) {
            await requestQueue.addRequest(new Apify.Request({
                userData: { label },
                url: urlMod ? urlMod(href) : href,
                uniqueKey: keyMod ? (await keyMod(link)) : href,
            }));
        }
    }
};

/**
 * Adds URL parameters to a Booking.com URL (timespan, language and currency).
 * @param {string} url - Booking.com URL to add the parameters to.
 * @param {Object} input - The Actor input data object.
 */
module.exports.addUrlParameters = (url, input) => {
    if (url.indexOf('?') < 0) { url += '?'; }
    if (input.checkIn && input.checkOut) {
        const ci = input.checkIn.split(/-|\//);
        const co = input.checkOut.split(/-|\//);
        //url += `&checkin_year_month_monthday=${ci[2]}-${ci[0]}-${ci[1]}`;
        //url += `&checkout_year_month_monthday=${co[2]}-${co[0]}-${co[1]}`;
        //url += `&checkin=${ci[2]}-${ci[1]}-${ci[0]}`;
        //url += `&checkout=${co[2]}-${co[1]}-${co[0]}`;
        url += `&checkout_year=${co[2]}&checkout_month=${co[0]}&checkout_monthday=${co[1]}`;
        url += `&checkin_year=${ci[2]}&checkin_month=${ci[0]}&checkin_monthday=${ci[1]}`;
    }
    if (input.currency) {
        url += `&selected_currency=${input.currency.toUpperCase()}&changed_currency=1&top_currency=1`;
    }
    if (input.language) {
        const lng = input.language.replace('_', '-');
        url += `&lang=${lng}`;
    }
    if (input.adults) { url += `&group_adults=${input.adults}`; }
    if (input.children) { url += `&group_children=${input.children}`; }
    if (input.rooms) { url += `&no_rooms=${input.rooms}`; }
    return url.replace('?&', '?');
};

/**
 * Finds a browser instance with working proxy for Booking.com.
 * @param {string} startUrl - Booking.com URL to test for loading.
 * @param {Object} input - The Actor input data object.
 */
module.exports.getWorkingBrowser = async (startUrl, input) => {
    const sortBy = input.sortBy || 'bayesian_review_score';
    for (let i = 0; i < 1000; i++) {
        console.log('testing proxy...');
        const browser = await Apify.launchPuppeteer(input.proxyConfig || {});
        const page = await browser.newPage();
        try{
            await Apify.utils.puppeteer.hideWebDriver(page);
            await page.goto(startUrl, { timeout: 200000 });
            await page.waitForNavigation({ timeout: 200000 });
        } catch(e) {
            console.log('invalid proxy, retrying...');
            console.log(e);
            continue;
        }
        const pageUrl = await page.url();
        if (pageUrl.indexOf(sortBy) > -1 || i === 999) {
            console.log('valid proxy found');
            await page.close();
            return browser;
        }
        console.log('invalid proxy, retrying...');
        await browser.close();
    }
};

/**
 * Creates a function to make sure the URL contains all necessary attributes from INPUT.
 * @param {string} s - The URL attribute separator (& or ;).
 */
const fixUrl = (s, input) => (href) => {
    href = href.replace(/#([a-zA-Z_]+)/g, '');
    if (input.language && href.indexOf('lang') < 0) {
        const lng = input.language.replace('_', '-');
        if (href.indexOf(s)) {
            href.replace(s, `${s}lang=${lng}${s}`);
        } else { href += `${s}lang=${lng}`; }
    }
    if (input.currency && href.indexOf('currency') < 0) {
        href += `${s}selected_currency=${input.currency.toUpperCase()}${s}changed_currency=1${s}top_currency=1`;
    }
    return href.replace(/&{n,}/g, '&').replace('?&', '?');
};
module.exports.fixUrl = fixUrl;

/**
 * Checks if page has some criteria filtering enabled.
 * @param {Page} page - The page to be checked.
 */
module.exports.isFiltered = (page) => page.$('.filterelement.active');

module.exports.isPropertyTypeSet = async (page, input) => {
    if(input.propertyType != 'none'){
        const filters = await page.$$('.filterelement');
        for(const filter of filters){
            const label = await filter.$('.filter_label');
            const fText = await getAttribute(label, 'textContent');
            if(fText == input.propertyType){
                const cls = await getAttribute(filter, 'className');
                if(!cls.includes('active')){return false;}
            }
        }
    }
    return true;
}
                
module.exports.setPropertyType = async (page, input, requestQueue) => {
    console.log('enqueuing property type page...');
    const filters = await page.$$('.filterelement');
    const urlMod = fixUrl('&', input);
    for(const filter of filters){
        const label = await filter.$('.filter_label');
        const fText = await getAttribute(label, 'textContent');
        if(fText == input.propertyType){
            console.log('Using filter: ' + fText);
            const href = await getAttribute(filter, 'href');
            await requestQueue.addRequest(new Apify.Request({
                userData: { label: 'page' },
                url: urlMod(href),
                uniqueKey: fText + '_' + 0,
            }));
            break;
        }
    }
};
                
const pLabels = ['0 - € 50', '€ 50 - € 100', '€ 100 - € 150', '€ 150 - € 200', '€ 200 +'];
module.exports.isMinMaxPriceSet = async (page, input) => {
    if(input.minMaxPrice != 'none'){
        const fPrices = await (await page.$$('.filteroptions'))[0].$$('.filterelement');
        const index = pLabels.indexOf(input.minMaxPrice);
        const cls = await getAttribute(fPrices[index], 'className');
        if(!cls.includes('active')){return false;}
    }
    return true;
};
                
module.exports.setMinMaxPrice = async (page, input, requestQueue) => {
    console.log('enqueuing min-max price page...');
    const urlMod = fixUrl('&', input);
    const fPrices = await (await page.$$('.filteroptions'))[0].$$('.filterelement');
    const index = pLabels.indexOf(input.minMaxPrice);
    const label = await fPrices[index].$('.filter_label');
    const fText = await getAttribute(label, 'textContent');
    console.log('Using filter: ' + fText);
    const href = await getAttribute(fPrices[index], 'href');
    await requestQueue.addRequest(new Apify.Request({
        userData: { label: 'page' },
        url: urlMod(href),
        uniqueKey: fText + '_' + 0,
    }));
};
