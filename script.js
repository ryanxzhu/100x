import 'dotenv/config';
import HundredXClient from '100x-client';
import {
    Environment,
    OrderStatus,
    OrderType,
    TimeInForce,
} from '100x-client/enums';
import axios from 'axios';

// Google Sheet authentication
import { google } from 'googleapis';
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
});

const MY_PRIVATE_KEY = `0x${process.env.PRI}`;

const CONFIG = {
    debug: false,
    environment: Environment.MAINNET,
    rpc: 'https://rpc.blast.io',
    subAccountId: 0,
};

const Client = new HundredXClient(MY_PRIVATE_KEY, CONFIG);

async function placeOrder(price) {
    const { error, order } = await Client.placeOrder({
        isBuy: true,
        orderType: OrderType.LIMIT_MAKER,
        price,
        productId: 1002,
        quantity: 0.01,
        timeInForce: TimeInForce.GTC,
    });

    console.log(order);
}

// placeOrder(3550);
// cancelAllOrders();

async function cancelAllOrders() {
    const { success, error } = await Client.cancelOpenOrdersForProduct(1002);
    if (success) console.log('all orders cancelled');
}

async function deposit(amount) {
    const { error, success, transactionHash } = await Client.deposit(amount);
    if (success) {
        console.log(transactionHash);
    }
}

async function listBalances() {
    const { error, balances } = await Client.listBalances();
    if (!error) {
        console.log(balances);
    }
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

async function getBinanceEthPrice() {
    const apiURL = `https://www.binance.com/api/v3/ticker/price?symbol=ETHUSDT`;
    try {
        const data = await axios.get(apiURL);
        const ethPrice = Number(data.data.price);
        return ethPrice;
    } catch (error) {
        console.log(error);
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
Client.cancelAndReplaceOrder();
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

cont2();

// getEthData2();
