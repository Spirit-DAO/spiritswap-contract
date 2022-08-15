// ====================================================================
//  .----..----. .-..----. .-. .---.  .----..-. . .-.  .--.  .----.    
// { {__  | {}  }| || {}  }| |{_   _}{ {__  | |/ \| | / {} \ | {}  }   
// .-._} }| .--' | || .-. \| |  | |  .-._} }|  .'.  |/  /\  \| .--'    
// `----' `-'    `-'`-' `-'`-'  `-'  `----' `-'   `-'`-'  `-'`-'                                                                        |
// ====================================================================
// ======================= SpiritSwap (SPIRIT) ======================
// ====================================================================

// Primary Author(s)
// Heesh: https://github.com/layer3fund
// Sid: https://github.com/acrylicfiddle

const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount/10**decimals;
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { execPath } = require("process");

const AddressZero = '0x0000000000000000000000000000000000000000'
const MINIMUM_LIQUIDITY = "1000"
const ten = convert('10', 18)
const fifty = convert('50', 18)
const oneHundred = convert('100', 18);
const twoHundred = convert('200', 18);
const fiveHundred = convert('500', 18);
const eightHundred = convert('800', 18);
const oneThousand = convert('1000', 18);
const tenThousand = convert('10000', 18);
const April2026 = '1775068986';
const May2026 = '1776278586'
const oneWeek = 604800;
const oneday = 24*3600;
const twodays = 2*24*3600;
const spiritPerBlock = "10000000000000000000";
const startBlock = "1";
const startTime = Math.floor(Date.now() / 1000);

// users
let owner, admin, user1, user2, user3, feeDist; 
// contracts
let masterChef, gaugeProxy;
// tokens
let weth, spirit, inSpirit, LP1, LP2, LP3, LP4, TK1, TK2;
// gauge contracts
let LP1Gauge, LP2Gauge, LP3Gauge;

describe("GaugeProxy set by Admin System Testing", function () {
  
  before("Initial set up", async function () {
    console.log("Begin Initialization");

    // initialize users
    [owner, admin, user1, user2, user3, feeDist] = await ethers.getSigners();

    // initialize tokens
    // mints 1000 tokens to deployer
    const erc20Mock = await ethers.getContractFactory("ERC20Mock");
    weth = await erc20Mock.deploy("WETH", "WETH");
    LP1 = await erc20Mock.deploy("LP1", "LP1");
    LP2 = await erc20Mock.deploy("LP2", "LP2");
    LP3 = await erc20Mock.deploy("LP3", "LP3");
    LP4 = await erc20Mock.deploy("LP4", "LP4");
    TK1 = await erc20Mock.deploy("TK1", "TK1");
    TK2 = await erc20Mock.deploy("TK2", "TK2");
    const spiritToken = await ethers.getContractFactory("contracts/SpiritV1/SpiritToken.sol:SpiritToken");
    spirit = await spiritToken.deploy();
    console.log("- Tokens Initialized");

    // initialize inSpirit
    const inSpiritArtifact = await ethers.getContractFactory("inSpirit");
    const inSpiritContract = await inSpiritArtifact.deploy(spirit.address, "inSpirit Token", "inSpirit", "1.0.0");
    inSpirit = await ethers.getContractAt("inSpirit", inSpiritContract.address);
    console.log("- inSpirit Initialized");

    // initialize masterChef
    const masterChefArtifact = await ethers.getContractFactory("SpiritMasterChef");
    const masterChefContract = await masterChefArtifact.deploy(
        spirit.address,
        owner.address,
        owner.address,
        spiritPerBlock,
        startBlock);
      try {
          await spirit.transferOwnership(masterChefContract.address);
      } catch (err) {
          console.log('THE CURRENT SPIRIT OWNERSHIP HAS BEEN TRANSFERRED DEPLOY NEW SPIRIT AND TRY AGAIN!')
          throw ('CHECK LOG!')
      }
    masterChef = await ethers.getContractAt("SpiritMasterChef", masterChefContract.address);
    console.log("- MasterChef Initialized");

    // initialize gaugeProxy
    const gaugeProxyArtifact = await ethers.getContractFactory("AdminGaugeProxy");
    const gaugeProxyContract = await gaugeProxyArtifact.deploy(
        masterChef.address, 
        spirit.address, 
        inSpirit.address, 
        owner.address,
        feeDist.address,
        0
        );
    gaugeProxy = await ethers.getContractAt("AdminGaugeProxy", gaugeProxyContract.address);
    console.log("- AdminGaugeProxy Initialized");

    // Create pool in masterChef for minSPIRIT and deposit minSPIRIT from gaugeProxy
    const minSpiritAddr = await gaugeProxy.TOKEN();
    await masterChef.add(100, minSpiritAddr, 0, true);
    await gaugeProxyContract.setPID(0);
    farmStartBlockNum = (await gaugeProxyContract.deposit()).blockNumber;

    // Set up Gauges/Bribes for LP1, LP2, LP3
    await gaugeProxy.addGauge(LP1.address);
    await gaugeProxy.addGauge(LP2.address);
    await gaugeProxy.addGauge(LP3.address);

    expect(await gaugeProxyContract.length()).to.be.equal(3);
    expect(await gaugeProxyContract.tokens()).to.be.eql([LP1.address, LP2.address, LP3.address]);

    let LP1GaugeAddr = await gaugeProxy.getGauge(LP1.address);
    LP1Gauge = await ethers.getContractAt("contracts/SpiritV2/AdminGaugeProxy.sol:Gauge", LP1GaugeAddr);
    let LP2GaugeAddr = await gaugeProxy.getGauge(LP2.address);
    LP2Gauge = await ethers.getContractAt("contracts/SpiritV2/AdminGaugeProxy.sol:Gauge", LP2GaugeAddr);
    let LP3GaugeAddr = await gaugeProxy.getGauge(LP3.address);
    LP3Gauge = await ethers.getContractAt("contracts/SpiritV2/AdminGaugeProxy.sol:Gauge", LP3GaugeAddr);

    // Owner locks in 1000 SPIRIT for inSPIRIT
    await spirit.approve(inSpirit.address, oneThousand);
    await inSpirit.create_lock(oneThousand, April2026);

    // Mint LP tokens to users
    await LP1.mint(user1.address, 1000);
    await LP1.mint(user2.address, 1000);    
    await LP1.mint(user3.address, 1000);    
    await LP2.mint(user1.address, 1000);
    await LP2.mint(user2.address, 1000);    
    await LP2.mint(user3.address, 1000);    
    await LP3.mint(user1.address, 1000);
    await LP3.mint(user2.address, 1000);    
    await LP3.mint(user3.address, 1000);    

    console.log("Initialization Complete");
    console.log("******************************************************");
});

it('Owner sets weight for LP1', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(owner).setGaugeWeight(LP1.address, 100);
    console.log("Owner has set LP1 weight to 100");

    let totalWeight = await gaugeProxy.totalWeight();
    let LP1Weight = await gaugeProxy.gaugeWeights(LP1.address);
    let LP2Weight = await gaugeProxy.gaugeWeights(LP2.address);
    let LP3Weight = await gaugeProxy.gaugeWeights(LP3.address);

    expect(totalWeight).to.be.equal(100);
    expect(LP1Weight).to.be.equal(100);
    expect(LP2Weight).to.be.equal(0);
    expect(LP3Weight).to.be.equal(0);

    console.log("Gauge Proxy Status");
    console.log("Total weight", totalWeight);
    console.log("LP1 weight", LP1Weight);
    console.log("LP2 weight", LP2Weight);
    console.log("LP3 weight", LP3Weight);

    await gaugeProxy.connect(owner).setGaugeWeight(LP1.address, 50);
    console.log("Owner has set LP1 weight to 50");

    totalWeight = await gaugeProxy.totalWeight();
    LP1Weight = await gaugeProxy.gaugeWeights(LP1.address);
    LP2Weight = await gaugeProxy.gaugeWeights(LP2.address);
    LP3Weight = await gaugeProxy.gaugeWeights(LP3.address);

    expect(totalWeight).to.be.equal(50);
    expect(LP1Weight).to.be.equal(50);
    expect(LP2Weight).to.be.equal(0);
    expect(LP3Weight).to.be.equal(0);

    console.log("Gauge Proxy Status");
    console.log("Total weight", totalWeight);
    console.log("LP1 weight", LP1Weight);
    console.log("LP2 weight", LP2Weight);
    console.log("LP3 weight", LP3Weight);

    await gaugeProxy.connect(owner).setGaugeWeight(LP1.address, 100);
    console.log("Owner has set LP1 weight to 100");

    totalWeight = await gaugeProxy.totalWeight();
    LP1Weight = await gaugeProxy.gaugeWeights(LP1.address);
    LP2Weight = await gaugeProxy.gaugeWeights(LP2.address);
    LP3Weight = await gaugeProxy.gaugeWeights(LP3.address);

    expect(totalWeight).to.be.equal(100);
    expect(LP1Weight).to.be.equal(100);
    expect(LP2Weight).to.be.equal(0);
    expect(LP3Weight).to.be.equal(0);

    console.log("Gauge Proxy Status");
    console.log("Total weight", totalWeight);
    console.log("LP1 weight", LP1Weight);
    console.log("LP2 weight", LP2Weight);
    console.log("LP3 weight", LP3Weight);
});

it('User1 deposits LP1 in LP1Gauge', async function () {
    console.log("******************************************************");

    let user1LP1 = await LP1.balanceOf(user1.address);
    console.log("User1 LP1 balance", divDec(user1LP1));

    await LP1.connect(user1).approve(LP1Gauge.address, oneHundred);
    await LP1Gauge.connect(user1).deposit(oneHundred);

    let user1LP1Gauge = await LP1Gauge.balanceOf(user1.address);
    console.log("User1 LP1 balance in LP1Gauge", divDec(user1LP1Gauge));

});

it('Start emissions', async function () {
    console.log("******************************************************");

    await spirit.connect(owner).transfer(gaugeProxy.address, oneHundred);
    await gaugeProxy.distribute();

    await network.provider.send('evm_increaseTime', [24*3600]); 
    await network.provider.send('evm_mine');

});

it('User1 withdraws LP1 from LP1Gauge', async function () {
    console.log("******************************************************");

    await LP1Gauge.connect(user1).withdrawAll();

    let user1LP1 = await LP1.balanceOf(user1.address);
    console.log("User1 LP1 balance", divDec(user1LP1));

    let user1LP1Gauge = await LP1Gauge.balanceOf(user1.address);
    console.log("User1 LP1 balance in LP1Gauge", divDec(user1LP1Gauge));

});

it('User2 deposits LP1 in LP1Gauge', async function () {
    console.log("******************************************************");

    let user2LP1 = await LP1.balanceOf(user2.address);
    console.log("User2 LP1 balance", divDec(user2LP1));

    await LP1.connect(user2).approve(LP1Gauge.address, ten);
    await LP1Gauge.connect(user2).deposit(ten);

    let user2LP1Gauge = await LP1Gauge.balanceOf(user2.address);
    console.log("User2 LP1 balance in LP1Gauge", divDec(user2LP1Gauge));

});

it('User1 calls kick on themself', async function () {
    console.log("******************************************************");

    await LP1Gauge.kick(user1.address);

});

it('User1 deposits LP1 in LP1Gauge', async function () {
    console.log("******************************************************");

    let user1LP1 = await LP1.balanceOf(user1.address);
    console.log("User1 LP1 balance", divDec(user1LP1));

    await LP1.connect(user1).approve(LP1Gauge.address, oneHundred);
    await LP1Gauge.connect(user1).deposit(oneHundred);

    let user1LP1Gauge = await LP1Gauge.balanceOf(user1.address);
    console.log("User1 LP1 balance in LP1Gauge", divDec(user1LP1Gauge));

    let LP1GaugeBal = await LP1Gauge.totalSupply();
    console.log("Total LP1 in Gauge", divDec(LP1GaugeBal));

});

it('Start emissions', async function () {
    console.log("******************************************************");

    await spirit.connect(owner).transfer(gaugeProxy.address, oneHundred);
    await gaugeProxy.distribute();

    await network.provider.send('evm_increaseTime', [24*3600]); 
    await network.provider.send('evm_mine');

});

it('User1 deposits LP1 in LP1Gauge', async function () {
    console.log("******************************************************");

    let user1LP1 = await LP1.balanceOf(user1.address);
    console.log("User1 LP1 balance", divDec(user1LP1));

    await LP1.connect(user1).approve(LP1Gauge.address, oneHundred);
    await LP1Gauge.connect(user1).deposit(oneHundred);

    let user1LP1Gauge = await LP1Gauge.balanceOf(user1.address);
    console.log("User1 LP1 balance in LP1Gauge", divDec(user1LP1Gauge));

    let LP1GaugeBal = await LP1Gauge.totalSupply();
    console.log("Total LP1 in Gauge", divDec(LP1GaugeBal));

});

});