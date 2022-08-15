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
  //   "symbol": "WBTC",
  //   "address": "0x321162Cd933E2Be498Cd2267a90534A804051b11"
  // },
  // {
  //   "symbol": "WETH",
  //   "address": "0x74b23882a30290451A17c44f4F05243b6b58C76d"
  // },
  // {
  //   "symbol": "AVAX",
  //   "address": "0x511D35c52a3C244E7b8bd92c0C297755FbD89212"
  // },
  // {
  //   "symbol": "MATIC",
  //   "address": "0x40DF1Ae6074C35047BFF66675488Aa2f9f6384F3"
  // },
  // {
  //   "symbol": "BNB",
  //   "address": "0xD67de0e0a0Fd7b15dC8348Bb9BE742F3c5850454"
  // },

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




  // {
  //   "symbol": "LQDR",
  //   "address": "0x10b620b2dbAC4Faa7D7FFD71Da486f5D44cd86f9"
  // },
  // {
  //   "symbol": "BIFI",
  //   "address": "0xd6070ae98b8069de6B494332d1A1a81B6179D960"
  // },
  // {
  //   "symbol": "gSCARAB",
  //   "address": "0x6ab5660f0B1f174CFA84e9977c15645e4848F5D6"
  // },
  // {
  //   "symbol": "CRE8R",
  //   "address": "0x2ad402655243203fcfa7dcb62f8a08cc2ba88ae0"
  // },
  // {
  //   "symbol": "DEUS",
  //   "address": "0xde5ed76e7c05ec5e4572cfc88d1acea165109e44"
  // },
  // {
  //   "symbol": "RING",
  //   "address": "0x582423C10c9e83387a96d00A69bA3D11ee47B7b5"
  // },
  // {
  //   "symbol": "TREEB",
  //   "address": "0xc60D7067dfBc6f2caf30523a064f416A5Af52963"
  // },
  // {
  //   "symbol": "OATH",
  //   "address": "0x21Ada0D2aC28C3A5Fa3cD2eE30882dA8812279B6"
  // },
  // {
  //   "symbol": "gOHM",
  //   "address": "0x91fa20244Fb509e8289CA630E5db3E9166233FDc"
  // },
  // {
  //   "symbol": "SPELL",
  //   "address": "0x468003B688943977e6130F4F68F23aad939a1040"
  // },
  // {
  //   "symbol": "CRV",
  //   "address": "0x1E4F97b9f9F913c46F1632781732927B9019C68b"
  // },
  // {
  //   "symbol": "TAROT",
  //   "address": "0xC5e2B037D30a390e62180970B3aa4E91868764cD"
  // },
  // {
  //   "symbol": "LINK",
  //   "address": "0xb3654dc3D10Ea7645f8319668E8F54d2574FBdC8"
  // },
  // {
  //   "symbol": "YFI",
  //   "address": "0x29b0Da86e484E1C0029B56e817912d778aC0EC69"
  // },
  // {
  //   "symbol": "MULTI",
  //   "address": "0x9Fb9a33956351cf4fa040f65A13b835A3C8764E3"
  // },
  // {
  //   "symbol": "FXS",
  //   "address": "0x7d016eec9c25232b01F23EF992D98ca97fc2AF5a"
  // },

  // {
  //   "symbol": "SPIRIT",
  //   "address": "0x5Cc61A78F164885776AA610fb0FE1257df78E59B"
  // },
  // {
  //   "symbol": "USDC",
  //   "address": "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75"
  // },

 ]

 const FTM = '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83';
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
  const WFTM = await ethers.getContractAt("contracts/UniV2-AMM/SpiritRouterV1.sol:IERC20", FTM);
  const routerv2 = await ethers.getContractAt("contracts/AMM/BaseV1Router01.sol:BaseV1Router01", ROUTER_v2);
  console.log("here1");
  await Promise.all(tokens.map(async tkn => {
    
    const token = await ethers.getContractAt("contracts/UniV2-AMM/SpiritRouterV1.sol:IERC20", tkn.address);

    const tokenBal = await token.balanceOf(wallet.address);

    // 2. Using equivalent tokens of 1 ftm + token output from top ^ create an LP on routerV2
    // Approve new tokens against new router and Add liq
    const appr2 = await token.approve(routerv2.address, "1000000000000000000000000000000000", 
    {
      gasPrice: ethers.gasPrice,
    });
    await appr2.wait();

    const addLiqTrx = await routerv2.addLiquidityFTM(
      token.address,
      false,
      tokenBal.toString(), //amountTokenDesired
      tokenBal.toString(), // amountTokenMin
      "1000000000000000000",  // 1 FTM
      wallet.address,
      "1000000000000000000000000000000000", //deadline
      {
        value: "1000000000000000000",  // 1FTM
        gasPrice: ethers.gasPrice,
      }
      );
     await addLiqTrx.wait();

    // 3. Get LP address from factory
    const factory = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Factory", FACTORYV2);
    const LP = await factory.getPair(FTM, token.address, false);

    const pair = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Pair", LP);
    const lpFees = await pair.fees();

    console.log("LP SYMBOL", await pair.symbol())
    console.log("LP ADDRESS", LP);
    console.log("FEE ADDRESS", lpFees);

    console.log("*********************************************************");

    await hre.run("verify:verify", {
      address: LP,
      contract: "contracts/AMM/BaseV1Factory.sol:BaseV1Pair"
    });

    // await hre.run("verify:verify", {
    //   address: lpFees,
    //   contract: "contracts/AMM/BaseV1Factory.sol:BaseV1Fees",
    //   constructorArguments: [FTM, token, FACTORYV2],
    // });

  }));

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
  