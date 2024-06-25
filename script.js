import 'dotenv/config';
import HundredXClient from '100x-client';
import {
    Environment,
    OrderStatus,
    OrderType,
    TimeInForce,
} from '100x-client/enums';
import axios from 'axios';
import { dp } from './utils.js';

// Google Sheet authentication
import { google } from 'googleapis';
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
});

const MY_PRIVATE_KEY = `0x${process.env.PRI}`;
const DIVIDER = 1000000000000000000;
const DIFF = 3;

const CONFIG = {
    debug: false,
    environment: Environment.MAINNET,
    rpc: 'https://rpc.blast.io',
    subAccountId: 0,
};

const Client = new HundredXClient(MY_PRIVATE_KEY, CONFIG);

export async function bidEth(price, quantity) {
    const { error, order } = await Client.placeOrder({
        isBuy: true,
        orderType: OrderType.LIMIT_MAKER,
        price,
        productId: 1002,
        quantity,
        timeInForce: TimeInForce.GTC,
    });

    return order;
}

export async function bidEthLimit(price, quantity) {
    const { error, order } = await Client.placeOrder({
        isBuy: true,
        orderType: OrderType.LIMIT,
        price,
        productId: 1002,
        quantity,
        timeInForce: TimeInForce.GTC,
    });

    return order;
}

export async function askEth(price, quantity) {
    const { error, order } = await Client.placeOrder({
        isBuy: false,
        orderType: OrderType.LIMIT_MAKER,
        price,
        productId: 1002,
        quantity,
        timeInForce: TimeInForce.GTC,
    });

    return order;
}

export async function askEthLimit(price, quantity) {
    const { error, order } = await Client.placeOrder({
        isBuy: false,
        orderType: OrderType.LIMIT,
        price,
        productId: 1002,
        quantity,
        timeInForce: TimeInForce.GTC,
    });

    return order;
}

export async function bidEthStaggered(
    startingPrice,
    startingQuantity,
    incrementPrice,
    incrementQuantity,
    isBuy
) {
    const PRICE_INCREMENT = 0.1;
    const QUANTITY_INCREMENT = 0.5;
    const orders = [];

    const baseBid = {
        isBuy: true,
        orderType: OrderType.LIMIT_MAKER,
        price,
        productId: 1002,
        quantity,
        timeInForce: TimeInForce.GTC,
    };

    orders.push(baseBid);

    for (let i = 1; i < 3; i++) {
        const newBid = { ...baseBid };
        newBid.price += i * PRICE_INCREMENT * -1;
        newBid.price = dp(newBid.price, 1);
        newBid.quantity += i * QUANTITY_INCREMENT;
        newBid.quantity = dp(newBid.quantity, 2);
        orders.push(newBid);
    }

    // let prices = orders.map((order) => order.price);
    // let quantities = orders.map((order) => order.quantity);
    // prices.sort((a, b) => a - b);
    // quantities.sort((a, b) => a - b);
    // console.log(prices);
    // console.log(quantities);
    let pairs = orders.map((order) => [order.price, order.quantity]);
    pairs.sort((a, b) => a[0] - b[0]);
    console.log(pairs);

    await Client.placeOrders(orders);
}

export async function askEthStaggered(price, quantity) {
    const PRICE_INCREMENT = 0.1;
    const QUANTITY_INCREMENT = 0.5;
    const orders = [];

    const baseBid = {
        isBuy: false,
        orderType: OrderType.LIMIT_MAKER,
        price,
        productId: 1002,
        quantity,
        timeInForce: TimeInForce.GTC,
    };

    orders.push(baseBid);

    for (let i = 1; i < 3; i++) {
        const newBid = { ...baseBid };
        newBid.price += i * PRICE_INCREMENT;
        newBid.price = dp(newBid.price, 1);
        newBid.quantity += i * QUANTITY_INCREMENT;
        newBid.quantity = dp(newBid.quantity, 2);
        orders.push(newBid);
    }

    // let prices = orders.map((order) => order.price);
    // let quantities = orders.map((order) => order.quantity);
    let pairs = orders.map((order) => [order.price, order.quantity]);
    pairs.sort((a, b) => a[0] - b[0]);
    // prices.sort((a, b) => a - b);
    // quantities.sort((a, b) => a - b);
    // console.log(prices);
    // console.log(quantities);
    console.log(pairs);
    await Client.placeOrders(orders);
}

export async function staggeredBid(
    startingPrice,
    startingQuantity,
    incrementPrice,
    incrementQuantity,
    isBuy
) {
    if (isBuy) {
        incrementPrice = -Math.abs(incrementPrice);
    }
    if (!isBuy) {
        incrementPrice = Math.abs(incrementPrice);
    }
    const orders = [];

    const baseBid = {
        isBuy,
        orderType: OrderType.LIMIT_MAKER,
        price: startingPrice,
        productId: 1002,
        quantity: startingQuantity,
        timeInForce: TimeInForce.GTC,
    };

    orders.push(baseBid);

    for (let i = 1; i < 3; i++) {
        const newBid = { ...baseBid };
        newBid.price += i * incrementPrice;
        newBid.price = dp(newBid.price, 1);
        newBid.quantity += i * incrementQuantity;
        newBid.quantity = dp(newBid.quantity, 2);
        orders.push(newBid);
    }

    let pairs = orders.map((order) => [order.price, order.quantity]);
    pairs.sort((a, b) => a[0] - b[0]);
    console.log(pairs);

    await Client.placeOrders(orders);
}

export async function exitPosition() {
    await cancelAllOrders();
    const position = await getPosition();
    const isBuy = position > 0 ? false : true;
    const quantity = Math.abs(position);
    let price = await getBinanceEthPrice();
    price = isBuy === true ? dp(price * 1.1, 1) : dp(price * 0.9, 1);

    const { order, error } = await Client.placeOrder({
        isBuy,
        orderType: OrderType.LIMIT,
        price,
        productId: 1002,
        quantity,
        timeInForce: TimeInForce.GTC,
    });

    if (order) console.log('Position probably exited');
}

export async function getPosition() {
    const data = await Client.listPositions('ethperp');
    return dp(data?.positions[0]?.quantity / DIVIDER, 5) || 0;
}

export async function getOrderBook() {
    const result = await Client.getOrderBook('ethperp');
    return result;
}

export async function cancelAllOrders() {
    const { success, error } = await Client.cancelOpenOrdersForProduct(1002);
    if (success) console.log('cancelled all orders successfully');
    if (error) console.log('error cancelling all orders');
}

export async function deposit(amount) {
    const { error, success, transactionHash } = await Client.deposit(amount);
    if (success) {
        console.log(transactionHash);
    }
}

export async function getBalance() {
    const { error, balances } = await Client.listBalances();
    if (error) return 8000;
    return dp(balances[0]?.quantity / DIVIDER, 2);
}

async function getProducts() {
    const { products } = await Client.getProducts();
    console.log(products);
}

// async function getEthData() {
//     const { product } = await Client.getProduct(1002);
//     const ethPrice = Number(
//         Math.round(product.markPrice / 10000000000000000) / 100
//     );
//     // console.log(ethPrice);
//     return ethPrice;
// }//

export async function getBinanceEthPrice(diff = DIFF) {
    const apiURL = `https://www.binance.com/api/v3/ticker/price?symbol=ETHUSDT`;
    try {
        const data = await axios.get(apiURL);
        let ethPrice = Number(data.data.price);
        return dp(ethPrice + diff, 1);
    } catch (error) {
        console.log(error);
    }
}

export async function initialBid() {
    const ethPrice = await getBinanceEthPrice();
    const bidPrice = dp(ethPrice - 500, 1);
    const order = await bidEth(bidPrice, 0.01);
    return order.id;
}

export async function initialAsk() {
    const ethPrice = await getBinanceEthPrice();
    const askPrice = dp(ethPrice + 10, 1);
    const order = await askEth(askPrice, 0.01);
    return order.id;
}

export async function updateBid(orderId, price, quantity) {
    const { order: order1, error: error1 } = await Client.cancelAndReplaceOrder(
        orderId,
        {
            isBuy: true,
            orderType: OrderType.LIMIT_MAKER,
            price,
            productId: 1002,
            quantity,
            timeInForce: TimeInForce.GTC,
        }
    );

    if (error1?.message === 'solver.match:: order would match') {
        let { order, error } = await Client.placeOrder({
            isBuy: true,
            orderType: OrderType.LIMIT_MAKER,
            price,
            productId: 1002,
            quantity,
            timeInForce: TimeInForce.GTC,
        });

        return [order.id, 0];
    }

    if (
        error1?.message === 'order not found' ||
        error1?.message === 'order to cancel not found'
    ) {
        let { order, error } = await Client.placeOrder({
            isBuy: true,
            orderType: OrderType.LIMIT_MAKER,
            price,
            productId: 1002,
            quantity,
            timeInForce: TimeInForce.GTC,
        });

        return [order.id, 1];
    }

    return [order1.id, 0];
}

export async function updateAsk(orderId, price, quantity) {
    const { order: order1, error: error1 } = await Client.cancelAndReplaceOrder(
        orderId,
        {
            isBuy: false,
            orderType: OrderType.LIMIT_MAKER,
            price,
            productId: 1002,
            quantity,
            timeInForce: TimeInForce.GTC,
        }
    );

    if (error1?.message === 'solver.match:: order would match') {
        let { order, error } = await Client.placeOrder({
            isBuy: true,
            orderType: OrderType.LIMIT_MAKER,
            price,
            productId: 1002,
            quantity,
            timeInForce: TimeInForce.GTC,
        });

        return [order.id, 0];
    }

    if (
        error1?.message === 'order not found' ||
        error1?.message === 'order to cancel not found'
    ) {
        let { order, error } = await Client.placeOrder({
            isBuy: false,
            orderType: OrderType.LIMIT_MAKER,
            price,
            productId: 1002,
            quantity,
            timeInForce: TimeInForce.GTC,
        });

        return [order.id, 1];
    }

    return [order1.id, 0];
}

export async function getMidPrice() {
    const { bids, asks } = await Client.getOrderBook('ethperp');
    const bid = bids[0][0] / DIVIDER;
    const ask = asks[0][0] / DIVIDER;
    const mid = dp((bid + ask) / 2, 1);
    return mid;
}

export async function getBidAskMid() {
    const { bids, asks } = await Client.getOrderBook('ethperp');
    if (!bids[0] || !asks[0]) return false;
    const bid = dp(bids[0][0] / DIVIDER, 1);
    const ask = dp(asks[0][0] / DIVIDER, 1);
    const mid = dp((bid + ask) / 2, 1);
    return { bid, ask, mid };
}

// export async function getMidPrice() {
//     const apiURL = `https://www.binance.com/api/v3/ticker/price?symbol=ETHUSDT`;
//     try {
//         const { bids, asks } = await Client.getOrderBook('ethperp');
//         const bid = dp(bids[0][0] / DIVIDER, 1);
//         const ask = dp(asks[0][0] / DIVIDER, 1);

//         const data = await axios.get(apiURL);
//         let ethPrice = Number(data.data.price);
//         const mid = dp(ethPrice + DIFF, 1);

//         if (mid < bid) {
//             console.log(`${mid}`, bid, ask);
//         } else if (mid > ask) {
//             console.log(bid, ask, `${mid}`);
//         } else {
//             console.log(bid, `${mid}`, ask);
//         }

//         return mid;
//     } catch (error) {
//         console.log(error);
//         return false;
//     }
// }

export async function wideLimitOrder(startingQuantity, mid = 0) {
    const GAP = 5;
    const PRICE_INCREMENT = 1;
    const QUANTITY_INCREMENT = 0.01;
    if (mid === 0) mid = await getMidPrice();

    const startingBid = dp(mid - GAP, 1);
    const startingAsk = dp(mid + GAP, 1);

    console.log(startingBid, mid, startingAsk);

    const orders = [];
    const baseBid = {
        isBuy: true,
        orderType: OrderType.LIMIT_MAKER,
        price: startingBid,
        productId: 1002,
        quantity: startingQuantity,
        timeInForce: TimeInForce.GTC,
    };

    const baseAsk = {
        isBuy: false,
        orderType: OrderType.LIMIT_MAKER,
        price: startingAsk,
        productId: 1002,
        quantity: startingQuantity,
        timeInForce: TimeInForce.GTC,
    };

    orders.push(baseBid);
    orders.push(baseAsk);
    for (let i = 1; i < 20; i++) {
        const newBid = { ...baseBid };
        newBid.price += i * PRICE_INCREMENT * -1;
        newBid.price = dp(newBid.price, 1);
        newBid.quantity += i * QUANTITY_INCREMENT;
        newBid.quantity = dp(newBid.quantity, 2);
        orders.push(newBid);

        const newAsk = { ...baseAsk };
        newAsk.price += i * PRICE_INCREMENT;
        newAsk.price = dp(newAsk.price, 1);
        newAsk.quantity += i * QUANTITY_INCREMENT;
        newAsk.quantity = dp(newAsk.quantity, 2);
        orders.push(newAsk);
    }

    console.time('placeOrders');
    Client.placeOrders(orders);
    console.timeEnd('placeOrders');
}

// export async function tightLimitOrder(price, quantity, isBuy) {
//     while (true) {
//         try {
//             const { order, error } = await Client.placeOrder({
//                 isBuy,
//                 orderType: OrderType.LIMIT_MAKER,
//                 price,
//                 productId: 1002,
//                 quantity,
//                 timeInForce: TimeInForce.GTC,
//             });

//             if (order.id) {
//                 return order.id;
//             }

//             if (error.message === 'solver.match:: order would match') {
//                 const sign = isBuy === true ? 1 : -1;
//                 price -= 0.1 * sign;
//                 price = dp(price, 1);
//                 continue;
//             }
//         } catch (error) {}
//     }
// }

export async function tightLimitOrder(quantity, mid = 0) {
    const GAP = 0.1;
    if (mid === 0) mid = await getMidPrice();

    let bidPrice = dp(mid - GAP, 1);
    let askPrice = dp(mid + GAP, 1);

    console.log(bidPrice, mid, askPrice);

    const bid = {
        isBuy: true,
        orderType: OrderType.LIMIT_MAKER,
        price: bidPrice,
        productId: 1002,
        quantity,
        timeInForce: TimeInForce.GTC,
    };

    const ask = {
        isBuy: false,
        orderType: OrderType.LIMIT_MAKER,
        price: askPrice,
        productId: 1002,
        quantity,
        timeInForce: TimeInForce.GTC,
    };

    placeLimitMakerOrder(bid);
    placeLimitMakerOrder(ask);
}

async function placeLimitMakerOrder(orderInput) {
    const increment = orderInput.isBuy === true ? -0.1 : 0.1;
    const orderType = orderInput.isBuy === true ? 'bid' : 'ask';

    while (true) {
        const { error, order } = await Client.placeOrder(orderInput);

        if (order.id) {
            console.log(orderType, dp(order.price / DIVIDER, 1));
            return order.id;
        }

        if (error.message === 'solver.match:: order would match') {
            orderInput.price += increment;
            orderInput.price = dp(orderInput.price, 1);
        }
    }
}

async function cont() {
    let oldEthPrice = 0;
    let prices = [];
    let i = 0;
    console.time('change');
    while (true) {
        const eth1Promise = getEthData();
        const eth2Promise = getEthData2();

        await Promise.all([eth1Promise, eth2Promise]).then((values) => {
            values = [i, ...values];
            prices.push(values);
        });
        i++;
        console.log(i);
        if (i > 20000) break;
        // const ethPrice1 = await getEthData();
        // const ethPrice2 = await getEthData2();
        // console.log(ethPrice1, ethPrice2);
        // console.log(eth1Promise);
        // if (ethPrice !== oldEthPrice) {
        //     console.timeLog('change');
        //     oldEthPrice = ethPrice;
        // }
    }
    console.timeEnd('change');
    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = '1Ma_O_8e9iTBGdv5okPeyDhmUHXzjxjMZQsAyK94Vhhg';

    await googleSheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1',
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: prices,
        },
    });
}

// cont();
async function cont2() {
    let oldEthPrice = 0;
    console.time('change');
    while (true) {
        const ethPrice = await getEthData2();
        console.log(ethPrice);
        if (ethPrice !== oldEthPrice) {
            console.timeLog('change');
            oldEthPrice = ethPrice;
        }
    }
}

// cont2();

// getEthData2();
