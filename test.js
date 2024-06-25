import { getBalance } from './script.js';

async function run() {
    const a = await getBalance();
    console.log(a);
}

run();
