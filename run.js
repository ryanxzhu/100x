import {
    getBinanceEthPrice,
    initialBid,
    updateBid,
    initialAsk,
    updateAsk,
    tightLimitOrder,
    wideLimitOrder,
    cancelAllOrders,
    getOrderBook,
    getMidPrice,
    getPosition,
    getBidAskMid,
    bidEth,
    askEth,
} from './script.js';
import { dp } from './utils.js';

const DIVIDER = 1000000000000000000;

async function run() {
    let oldPrice = 0;
    // while (true) {
    let price = await getBinanceEthPrice();
    // if (price === oldPrice) continue;

    // oldPrice = price;
    // await cancelAllOrders();
    tightLimitOrder(dp(price + 2, 1), 0.4432, true);
    // tightLimitOrder(dp(price + 1, 1), 0.5, false);
    // }
}

// run();

async function run2() {
    let orderId = await initialAsk();
    let oldPrice = 0;
    while (true) {
        const price = await getBinanceEthPrice();
        if (price === oldPrice) continue;
        oldPrice = price;
        const newPrice = dp(price + 0.5, 1);
        console.log(newPrice);
        orderId = await updateAsk(orderId, newPrice, 0.01);
    }
}

// run2();

async function run3() {
    // while (true) {
    //     let price = await getBinanceEthPrice();
    //     console.log(price);
    // }
    const record = [];

    while (true) {
        const resultPromise = getOrderBook();
        const pricePromise = getMidPrice();

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

// run3();

async function run4() {
    let oldMid = 0;
    console.time('timer');
    while (true) {
        try {
            const mid = await getMidPrice();
            if (typeof mid === 'boolean' && !mid) break;
            const diff = Math.abs(oldMid - mid);
            console.log('diff', dp(diff, 1));
            if (diff < 2) continue;
            oldMid = mid;
            await cancelAllOrders();
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await wideLimitOrder(0.1, mid);
            console.log('updated orders');
            console.timeLog('timer');
        } catch (error) {
            console.log(error);
            break;
        }
    }
    await cancelAllOrders();
}

// run4();

async function run5() {
    let oldMid = 0;
    while (true) {
        const mid = await getMidPrice();
        if (oldMid === mid) continue;
        oldMid = mid;
        await cancelAllOrders();
        await tightLimitOrder(0.01, mid);
    }
}

// run5();
// listPositions();

async function run6() {
    let bidOrderId = '';
    let askOrderId = '';
    let tradeCounter = 0;
    while (true) {
        const dataPromise = getBidAskMid();
        const binancePricePromise = getBinanceEthPrice();
        const positionPromise = getPosition();
        const [data, binancePrice, position] = await Promise.all([
            dataPromise,
            binancePricePromise,
            positionPromise,
        ]);
        const { bid, ask, mid } = data;

        if (Math.abs(binancePrice - mid) > 1) {
            console.log(`It's trending!`);
            console.log('binance price:', binancePrice, '100x mid:', mid);
            await cancelAllOrders();
            continue;
        }

        let adjustBid = 0;
        let adjustAsk = 0;
        if (position > 0.1) {
            console.log('uh oh, too long!');
            adjustBid = -0.1;
        }
        if (position < -0.1) {
            console.log('uh oh, too short!');
            adjustAsk = 0.1;
        }
        const finalBid = dp(bid + adjustBid, 1);
        const finalAsk = dp(ask + adjustAsk, 1);
        console.log(finalAsk);
        console.log(finalBid);
        console.log('-------');
        const bidPromise = updateBid(bidOrderId, finalBid, 0.01);
        const askPromise = updateAsk(askOrderId, finalAsk, 0.01);
        const [bidResponse, askResponse] = await Promise.all([
            bidPromise,
            askPromise,
        ]);
        const [bidId, bidIncrement] = bidResponse;
        bidOrderId = bidId;
        const [askId, askIncrement] = askResponse;
        askOrderId = askId;
        tradeCounter += bidIncrement;
        tradeCounter += askIncrement;
        console.log('tradeCounter:', tradeCounter);
    }
}

run6();

async function run7() {
    const position = await getPosition();
    console.log(position);
}

// run7();
