import { getOrderBook, getBinanceEthPrice } from './script.js';
import { dp } from './utils.js';
const DIVIDER = 1000000000000000000;

async function run() {
    const record = [];

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
        record.push(diff);
        if (record.length > 200) {
            const ave =
                record.reduce((acc, curr) => acc + curr, 0) / record.length;
            console.log(ave);
        }
    }
}

run();
