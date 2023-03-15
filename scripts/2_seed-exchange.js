const hre = require("hardhat");
const config = require('../src/config.json');

const tokenSup = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

const wait = (seconds) => {
    const miliseconds = seconds * 1000;
    return new Promise(resolve => setTimeout(resolve, miliseconds));
}

async function main() {
    // Fetch accounts from wallet
    const accounts = await ethers.getSigners();

    // Fetch network
    const { chainId } = await ethers.provider.getNetwork();
    console.log("Using chainId:", chainId);

    const HIT = await ethers.getContractAt('Token',config[chainId].HIT.address);
    console.log(`HIT token fetched: ${HIT.address}\n`);

    const mETH = await ethers.getContractAt('Token',config[chainId].mETH.address);
    console.log(`mETH token fetched: ${mETH.address}\n`);

    const mDAI = await ethers.getContractAt('Token',config[chainId].mDAI.address);
    console.log(`mDAI token fetched: ${mDAI.address}\n`);

    // Fetch the deployed exchange
    const exchange = await ethers.getContractAt('Exchange', config[chainId].exchange.address);
    console.log(`Exchange fetched: ${exchange.address}\n`);

    // Give tokens to account[1]
    const sender = accounts[0];
    const receiver = accounts[1];
    let amount = tokenSup(10000);

    // user1 transfer 10,000 mETH
    let transaction, result;
    transaction = await mETH.connect(sender).transfer(receiver.address, amount);
    //result = await transaction.wait();
    console.log(`Transferred ${amount} tokens from ${sender.address} to ${receiver.address}\n`);

    // SetUp exchange users
    const user1 = accounts[0];
    const user2 = accounts[1];
    amount = tokenSup(10000);

    // user1 approves 10,000 HIT
    transaction = await HIT.connect(user1).approve(exchange.address, amount);
    await transaction.wait();
    console.log(`Approved ${amount}, HIT from ${user1.address}`);

    // user1 deposits 10,000 HIT
    transaction = await exchange.connect(user1).depositTokens(HIT.address, amount);
    await transaction.wait();
    console.log(`Deposited ${amount}, HIT from ${user1.address}`);

    // user2 approves mETH
    transaction = await mETH.connect(user2).approve(exchange.address, amount);
    await transaction.wait();
    console.log(`Approved ${amount}, HIT from ${user2.address}`);

    // user2 deposits mETH
    transaction = await exchange.connect(user2).depositTokens(mETH.address, amount);
    await transaction.wait();
    console.log(`Deposited ${amount}, mETH from ${user2.address}`);

    /////////////////////////////////////////////////////////////
  // Seed a Cancelled Order
  //

  // User 1 makes order to get tokens
  let orderId
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokenSup(100), HIT.address, tokenSup(5))
  result = await transaction.wait()
  console.log(`Made order from ${user1.address}`)

  // User 1 cancels order
  orderId = result.events[0].args.id
  transaction = await exchange.connect(user1).cancelOrder(orderId)
  result = await transaction.wait()
  console.log(`Cancelled order from ${user1.address}\n`);

  // Wait 1 second
  await wait(1)

  /////////////////////////////////////////////////////////////
  // Seed Filled Orders
  //

  // User 1 makes order
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokenSup(100), HIT.address, tokenSup(10))
  result = await transaction.wait()
  console.log(`Made order from ${user1.address}`)

  // User 2 fills order
  orderId = result.events[0].args.id
  transaction = await exchange.connect(user2).fillOrder(orderId)
  result = await transaction.wait()
  console.log(`Filled order from ${user1.address}\n`)

  // Wait 1 second
  await wait(1)

  // User 1 makes another order
  transaction = await exchange.makeOrder(mETH.address, tokenSup(50), HIT.address, tokenSup(15))
  result = await transaction.wait()
  console.log(`Made order from ${user1.address}`)

  // User 2 fills another order
  orderId = result.events[0].args.id
  transaction = await exchange.connect(user2).fillOrder(orderId)
  result = await transaction.wait()
  console.log(`Filled order from ${user1.address}\n`)

  // Wait 1 second
  await wait(1)

  // User 1 makes final order
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokenSup(200), HIT.address, tokenSup(20))
  result = await transaction.wait()
  console.log(`Made order from ${user1.address}`)

  // User 2 fills final order
  orderId = result.events[0].args.id
  transaction = await exchange.connect(user2).fillOrder(orderId)
  result = await transaction.wait()
  console.log(`Filled order from ${user1.address}\n`)

  // Wait 1 second
  await wait(1)

  /////////////////////////////////////////////////////////////
  // Seed Open Orders
  //

  // User 1 makes 10 orders
  for(let i = 1; i <= 10; i++) {
    transaction = await exchange.connect(user1).makeOrder(mETH.address, tokenSup(10 * i), HIT.address, tokenSup(10))
    result = await transaction.wait()

    console.log(`Made order from ${user1.address}`)

    // Wait 1 second
    await wait(1)
  }

  // User 2 makes 10 orders
  for (let i = 1; i <= 10; i++) {
    transaction = await exchange.connect(user2).makeOrder(HIT.address, tokenSup(10), mETH.address, tokenSup(10 * i))
    result = await transaction.wait()

    console.log(`Made order from ${user2.address}`)

    // Wait 1 second
    await wait(1)
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
