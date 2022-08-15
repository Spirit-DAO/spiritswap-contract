// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");
const { utils, BigNumber } = require("ethers")

const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);

const tokens = [

  // {
  //   "symbol": "USDT",
  //   "address": "0x049d68029688eAbF473097a2fC38ef61633A3C7A"
  // },
  // {
  //   "symbol": "DAI",
  //   "address": "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E"
  // },
  // {
  //   "symbol": "alUSD",
  //   "address": "0xB67FA6deFCe4042070Eb1ae1511Dcd6dcc6a532E"
  // },
  // {
  //   "symbol": "MIM",
  //   "address": "0x82f0B8B456c1A451378467398982d4834b6829c1"
  // },
  // {
  //   "symbol": "FRAX",
  //   "address": "0xdc301622e621166BD8E82f2cA0A26c13Ad0BE355"
  // },
  // {
  //   "symbol": "MAI",
  //   "address": "0xfb98b335551a418cd0737375a2ea0ded62ea213b"
  // },
  // {
  //   "symbol": "DEI",
  //   "address": "0xDE12c7959E1a72bbe8a5f7A1dc8f8EeF9Ab011B3"
  // },
  // {
  //   "symbol": "BUSD",
  //   "address": "0xC931f61B1534EB21D8c11B24f3f5Ab2471d4aB50"
  // },

 ]

 const USDCAddr = '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75';
 const FACTORYV2 = '0x9d3591719038752db0c8bEEe2040FfcC3B2c6B9c';  
 const ROUTER_v2 = '0x09855B4ef0b9df961ED097EF50172be3e6F13665';
 const inSPIRIT = '0x2FBFf41a9efAEAE77538bd63f1ea489494acdc08';
 const SPIRIT = '0x5Cc61A78F164885776AA610fb0FE1257df78E59B';

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const [wallet] = await ethers.getSigners();
  console.log('Using wallet: ', wallet.address);
  const USDC = await ethers.getContractAt("contracts/UniV2-AMM/SpiritRouterV1.sol:IERC20", USDCAddr);
  const routerv2 = await ethers.getContractAt("contracts/AMM/BaseV1Router01.sol:BaseV1Router01", ROUTER_v2);
  console.log("here1");
  tokens.forEach(async tkn => {

    const token = await ethers.getContractAt("contracts/UniV2-AMM/SpiritRouterV1.sol:IERC20", tkn.address);

    const tokenBal = await token.balanceOf(wallet.address);

    // const appr1 = await USDC.approve(routerv2.address, "1000000000000000000000000000000000", 
    // {
    //   gasPrice: ethers.gasPrice,
    // });
    // await appr1.wait();

    // 2. Using equivalent tokens of 1 ftm + token output from top ^ create an LP on routerV2
    // Approve new tokens against new router and Add liq
    const appr2 = await token.approve(routerv2.address, "1000000000000000000000000000000000", 
    {
      gasPrice: ethers.gasPrice,
    });
    await appr2.wait();
    console.log("approved");

    const addLiqTrx = await routerv2.addLiquidity(
        USDC.address, // token a
        token.address, // token b
        true, // is stable
        "1000000", //amount USDC Desired
        tokenBal.toString(), // amount token desired
        "1000000",           // amount USDC min
        tokenBal.toString(), // amount token min
        wallet.address, // to
        "1000000000000000000000000000000000", //deadline
        {
          gasPrice: ethers.gasPrice,
        });
       await addLiqTrx.wait();

    // 3. Get LP address from factory
    const factory = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Factory", FACTORYV2);
    const LP = await factory.getPair(USDC.address, token.address, true);

    const pair = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Pair", LP);
    const lpFees = await pair.fees();

    console.log("LP SYMBOL", await pair.symbol())
    console.log("LP ADDRESS", LP);
    console.log("FEE ADDRESS", lpFees);

    console.log("******************************************************** *");

    await hre.run("verify:verify", {
      address: LP,
      contract: "contracts/AMM/BaseV1Factory.sol:BaseV1Pair"
    });

    // await hre.run("verify:verify", {
    //   address: lpFees,
    //   contract: "contracts/AMM/BaseV1Factory.sol:BaseV1Fees",
    //   constructorArguments: [FTM, token, FACTORYV2],
    // });

  });

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
  