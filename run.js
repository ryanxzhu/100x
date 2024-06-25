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
    bidEthLimit,
    askEthLimit,
    getBalance,
    exitPosition,
    bidEthStaggered,
    askEthStaggered,
    staggeredBid,
} from './script.js';
import { dp } from './utils.js';

const QUANTITY = 0.5;
const POSITION_LIMIT = 1;
const POSITION_LIMIT2 = 5;

let oldPosition = 0;
let tradeCounter2 = 0;

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

async function run6() {
    let bidOrderId = '';
    let askOrderId = '';
    let tradeCounter = 0;
    let tradeCounter2 = -1;
    let oldPosition = 0;
    let doBid = true;
    let doAsk = true;
    while (true) {
        await cancelAllOrders();
        const balancePromise = getBalance();
        const dataPromise = getBidAskMid();
        const binancePricePromise = getBinanceEthPrice();
        const positionPromise = getPosition();
        const [balance, data, binancePrice, position] = await Promise.all([
            balancePromise,
            dataPromise,
            binancePricePromise,
            positionPromise,
        ]);

        if (oldPosition !== position) {
            tradeCounter2++;
            oldPosition = position;
        }

        console.log(
            'balance:',
            balance,
            'position:',
            position,
            'tradeCounter:',
            tradeCounter2
        );

        // if (balance < 4000) {
        //     await exitPosition();
        //     return;
        // }

        if (!data) continue;
        const { bid, ask, mid } = data;

        if (Math.abs(binancePrice - mid) > 1) {
            console.log(`It's trending!`);
            console.log('binance price:', binancePrice, '100x mid:', mid);
            await cancelAllOrders();
            continue;
        }

        let adjustBid = -0.1;
        let adjustAsk = 0.1;
        if (position > POSITION_LIMIT) {
            console.log('uh oh, too long!');
            adjustAsk += -0.1;
            adjustBid += -0.1;
        }
        if (position < -POSITION_LIMIT) {
            console.log('uh oh, too short!');
            adjustBid += 0.1;
            adjustAsk += 0.1;
        }

        if (position > POSITION_LIMIT2) {
            console.log('way too long!');
            doBid = false;
        }
        if (position < -POSITION_LIMIT2) {
            console.log('way too short!');
            doAsk = false;
        }

        const finalBid = dp(bid + adjustBid, 1);
        const finalAsk = dp(ask + adjustAsk, 1);
        console.log(finalBid, bid, ask, finalAsk);
        if (doBid && doAsk) {
            console.log('bid and ask');
            const bidPromise = bidEthStaggered(finalBid, QUANTITY);
            const askPromise = askEthStaggered(finalAsk, QUANTITY);
            await Promise.all([bidPromise, askPromise]);
        } else if (doBid) {
            console.log('only bid');
            await bidEthStaggered(finalBid, QUANTITY);
        } else if (doAsk) {
            console.log('only ask');
            await askEthStaggered(finalAsk, QUANTITY);
        }
        doBid = true;
        doAsk = true;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log('------------------------');
    }
}

async function run7() {
    await cancelAllOrders();
    let oldBinancePrice = 0;
    let oldPosition = 0;
    let tradeCounter2 = -1;
    let doBid = true;
    let doAsk = true;

    while (true) {
        const binancePrice = await getBinanceEthPrice();
        console.log(oldBinancePrice, binancePrice);
        if (oldBinancePrice === binancePrice) continue;

        await cancelAllOrders();
        const balancePromise = getBalance();
        const dataPromise = getBidAskMid();
        const binancePricePromise = getBinanceEthPrice();
        const positionPromise = getPosition();
        const [balance, data, binancePrice2, position] = await Promise.all([
            balancePromise,
            dataPromise,
            binancePricePromise,
            positionPromise,
        ]);

        if (oldPosition !== position) {
            tradeCounter2++;
            oldPosition = position;
        }

        oldBinancePrice = binancePrice2;

        console.log(
            'balance:',
            balance,
            'position:',
            position,
            'tradeCounter:',
            tradeCounter2
        );

        // if (balance < 3000) {
        //     await exitPosition();
        //     return;
        // }

        if (!data) continue;
        const { bid, ask, mid } = data;

        if (Math.abs(binancePrice2 - mid) > 1) {
            console.log(`It's trending!`);
            console.log('binance price:', binancePrice2, '100x mid:', mid);
            await cancelAllOrders();
            continue;
        }

        let adjustBid = -0.1;
        let adjustAsk = 0.1;
        if (position > POSITION_LIMIT) {
            console.log('uh oh, too long!');
            adjustAsk += -0.1;
            adjustBid += -0.1;
        }
        if (position < -POSITION_LIMIT) {
            console.log('uh oh, too short!');
            adjustBid += 0.1;
            adjustAsk += 0.1;
        }

        if (position > POSITION_LIMIT2) {
            console.log('way too long!');
            doBid = false;
        }
        if (position < -POSITION_LIMIT2) {
            console.log('way too short!');
            doAsk = false;
        }

        const finalBid = dp(bid + adjustBid, 1);
        const finalAsk = dp(ask + adjustAsk, 1);
        console.log(finalBid, bid, ask, finalAsk);
        if (doBid && doAsk) {
            console.log('bid and ask');
            const bidPromise = bidEthStaggered(finalBid, QUANTITY);
            const askPromise = askEthStaggered(finalAsk, QUANTITY);
            await Promise.all([bidPromise, askPromise]);
        } else if (doBid) {
            console.log('only bid');
            await bidEthStaggered(finalBid, QUANTITY);
        } else if (doAsk) {
            console.log('only ask');
            await askEthStaggered(finalAsk, QUANTITY);
        }
        doBid = true;
        doAsk = true;
        console.log('------------------------');
    }
}

async function run8() {
    await cancelAllOrders();
    let oldBinancePrice = 0;
    let bidOrderId = '';
    let askOrderId = '';

    while (true) {
        const binancePrice = await getBinanceEthPrice();
        console.log(oldBinancePrice, binancePrice);
        if (Math.abs(oldBinancePrice - binancePrice) < 0.5) continue;

        await cancelAllOrders();
        const balancePromise = getBalance();
        const dataPromise = getBidAskMid();
        const binancePricePromise = getBinanceEthPrice();
        const positionPromise = getPosition();
        const [balance, data, binancePrice2, position] = await Promise.all([
            balancePromise,
            dataPromise,
            binancePricePromise,
            positionPromise,
        ]);

        if (oldPosition !== position) {
            tradeCounter2++;
            oldPosition = position;
        }

        oldBinancePrice = binancePrice2;

        if (balance < 7500) {
            await exitPosition();
            return;
        }

        if (!data) continue;

        const { bid, ask, mid } = data;

        console.log(
            'balance:',
            balance,
            'position:',
            position,
            'tradeCounter:',
            tradeCounter2,
            'market bid:',
            bid,
            'market ask:',
            ask
        );

        if (Math.abs(position) < 1) {
            const bidPromise = staggeredBid(bid - 10, 2.5, 3, 2.5, true);
            const askPromise = staggeredBid(ask + 10, 2.5, 3, 2.5, false);
            await Promise.all([bidPromise, askPromise]);
            continue;
        }

        await getToNeutral();
    }
}

async function getToNeutral() {
    let oldBinancePrice = 0;
    while (true) {
        const binancePrice = await getBinanceEthPrice();
        console.log(oldBinancePrice, binancePrice);
        if (oldBinancePrice === binancePrice) continue;

        await cancelAllOrders();
        const balancePromise = getBalance();
        const dataPromise = getBidAskMid();
        const binancePricePromise = getBinanceEthPrice();
        const positionPromise = getPosition();
        const [balance, data, binancePrice2, position] = await Promise.all([
            balancePromise,
            dataPromise,
            binancePricePromise,
            positionPromise,
        ]);

        if (oldPosition !== position) {
            tradeCounter2++;
            oldPosition = position;
        }

        oldBinancePrice = binancePrice2;

        if (!data) continue;

        const { bid, ask, mid } = data;

        console.log(
            'balance:',
            balance,
            'position:',
            position,
            'tradeCounter:',
            tradeCounter2,
            'market bid:',
            bid,
            'market ask:',
            ask
        );

        if (Math.abs(position) < 1) return;

        if (position >= 1) {
            console.log('only asking:', bid, Math.abs(position));
            await askEthLimit(bid, Math.abs(position));
            continue;
        }

        if (position <= -1) {
            console.log('only bidding:', ask, Math.abs(position));
            await bidEthLimit(ask, Math.abs(position));
        }
    }
}

async function runOverall() {
    await run8();
    await exitPosition();
}

runOverall();
