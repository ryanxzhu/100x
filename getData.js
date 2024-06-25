import { getOrderBook, getBinanceEthPrice } from './script.js';
import { dp } from './utils.js';

// Google Sheet authentication
import { google } from 'googleapis';
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
});

const DIVIDER = 1000000000000000000;

async function run() {
    let record = [];
    let i = 0;

    while (true) {
        const resultPromise = getOrderBook();
        const pricePromise = getBinanceEthPrice(0);

        const [result, price] = await Promise.all([
            resultPromise,
            pricePromise,
        ]);
        const { bids, asks } = result;
        const bid = dp(bids[0][0] / DIVIDER, 1);
        const ask = dp(asks[0][0] / DIVIDER, 1);
        const mid = dp((bids[0][0] / DIVIDER + asks[0][0] / DIVIDER) / 2, 1);
        const spread = dp(ask - bid, 1);
        const diff = dp(mid - price, 1);
        console.log(price, diff, '|', bid, mid, ask, spread);
        record.push([i, price, bid, ask, mid, spread]);

        if (record.length % 10 === 0) {
            const client = await auth.getClient();
            const googleSheets = google.sheets({ version: 'v4', auth: client });
            const spreadsheetId =
                '1Ma_O_8e9iTBGdv5okPeyDhmUHXzjxjMZQsAyK94Vhhg';

            await googleSheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'Sheet1',
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: record,
                },
            });
            record = [];
        }

        i++;
    }
}

run();
