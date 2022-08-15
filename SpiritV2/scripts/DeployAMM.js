// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");
const { utils, BigNumber } = require("ethers")
const hre = require("hardhat")

const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);

const FTM = '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83';
const MASTER_CHEF = '0x9083EA3756BDE6Ee6f27a6e996806FBD37F6F093';
const inSPIRIT = '0x2FBFf41a9efAEAE77538bd63f1ea489494acdc08';
const SPIRIT = '0x5Cc61A78F164885776AA610fb0FE1257df78E59B';
let FACTORY = '0x9d3591719038752db0c8bEEe2040FfcC3B2c6B9c'; // PairFactory Contract
let ROUTER = '0x09855B4ef0b9df961ED097EF50172be3e6F13665'; // Router contract

const sleep = (delay) => new Promise (( resolve) => setTimeout (resolve, delay));

async function initFactory() {
  console.log('Starting Factory deployment');

  // initialize Factory
  const factoryArtifact = await ethers.getContractFactory("BaseV1Factory");
  const factoryContract = await factoryArtifact.deploy({
        gasPrice: ethers.gasPrice,
      });
  await factoryContract.deployed();
  await sleep(5000);

  console.log("- Factory Initialized at address: ", factoryContract.address);
  FACTORY = factoryContract.address;

  await hre.run("verify:verify", {
    address: FACTORY,
    contract: "contracts/AMM/BaseV1Factory.sol:BaseV1Factory",
  });
}

async function initRouter() {
  
  console.log('Starting Router deployment');
  // initialize Router
  const routerArtifact = await ethers.getContractFactory("BaseV1Router01");
  const routerContract = await routerArtifact.deploy(FACTORY, FTM, {
    gasPrice: ethers.gasPrice,
  });
  await routerContract.deployed();
  await sleep(5000);

  console.log("- Router Initialized at address: ", routerContract.address);
  ROUTER = routerContract.address;

  await hre.run("verify:verify", {
    address: ROUTER,
    contract: "contracts/AMM/BaseV1Router01.sol:BaseV1Router01",
    constructorArguments: [FACTORY, FTM],
  });

}

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const [wallet] = await ethers.getSigners();
  console.log('Using wallet: ', wallet.address);

  await initFactory();
  await initRouter();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });