const hre = require("hardhat");

async function main() {
  console.log('Preparing Deployment...\n');

  //Fetch contract to deploy
  const Token = await ethers.getContractFactory('Token');
  const Exchange = await ethers.getContractFactory('Exchange');

  // Deploy
  const accounts = await ethers.getSigners();
  console.log(`Accounts fetched:\n,${accounts[0].address}\n${accounts[1].address}`);


  //Deploy contract
  const HIT = await Token.deploy('HIT Token', 'HIT', '1000000');
  await HIT.deployed();
  console.log(`HIT token deployed to: ${HIT.address}`);

  const mETH = await Token.deploy('mETH','mETH','1000000');
  await mETH.deployed();
  console.log(`mETH token deployed to: ${mETH.address}`);

  const mDAI = await Token.deploy('mDAI','mDAI', '1000000');
  await mETH.deployed();
  console.log(`mDAI token deployed to: ${mDAI.address}`);

  const exchange = await Exchange.deploy(accounts[1].address, 10);
  await exchange.deployed();

  console.log(`Exchange Deployed to: ${exchange.address}`);

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
