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

it('GaugeProxy Weight Status', async function () {
    console.log("******************************************************");

    let totalWeight = await gaugeProxy.totalWeight();
    let LP1Weight = await gaugeProxy.gaugeWeights(LP1.address);
    let LP2Weight = await gaugeProxy.gaugeWeights(LP2.address);
    let LP3Weight = await gaugeProxy.gaugeWeights(LP3.address);
    
    let spiritGP = await spirit.balanceOf(gaugeProxy.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    expect(totalWeight).to.be.equal(0);
    expect(LP1Weight).to.be.equal(0);
    expect(LP2Weight).to.be.equal(0);
    expect(LP3Weight).to.be.equal(0);

    expect(spiritGP).to.be.equal(0);
    expect(spiritLP1).to.be.equal(0);
    expect(spiritLP2).to.be.equal(0);
    expect(spiritLP3).to.be.equal(0);

    console.log("Gauge Proxy Status")
    console.log("Total weight", totalWeight);
    console.log("LP1 weight", divDec(LP1Weight));
    console.log("LP2 weight", divDec(LP2Weight));
    console.log("LP3 weight", divDec(LP3Weight));

    console.log("SPIRIT Balances")
    console.log("Gauge Proxy", spiritGP);
    console.log("LP1", spiritLP1);
    console.log("LP2", spiritLP2);
    console.log("LP3", spiritLP3);

});

it('User1 deposits LP1 in all gauges', async function () {
    console.log("******************************************************");

    let user1LP1 = await LP1.balanceOf(user1.address);
    console.log("User1 LP balance", divDec(user1LP1));

    await LP1.connect(user1).approve(LP1Gauge.address, oneHundred);
    await LP2.connect(user1).approve(LP2Gauge.address, oneHundred);
    await LP3.connect(user1).approve(LP3Gauge.address, oneHundred);

    await LP1Gauge.connect(user1).deposit(oneHundred);
    await LP2Gauge.connect(user1).deposit(oneHundred);
    await LP3Gauge.connect(user1).deposit(oneHundred);

    let user1LP1Gauge = await LP1Gauge.balanceOf(user1.address);
    let user1LP2Gauge = await LP2Gauge.balanceOf(user1.address);
    let user1LP3Gauge = await LP3Gauge.balanceOf(user1.address);

    console.log("User1 LP1 balance in LP1Gauge", divDec(user1LP1Gauge));
    console.log("User1 LP2 balance in LP2Gauge", divDec(user1LP2Gauge));
    console.log("User1 LP3 balance in LP3Gauge", divDec(user1LP3Gauge));

});

it('User1 calls distribute', async function () {
    console.log("******************************************************");
    await gaugeProxy.connect(user1).distribute();
    
    let spiritGP = await spirit.balanceOf(gaugeProxy.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    expect(spiritGP).to.be.above(0);
    expect(spiritLP1).to.be.equal(0);
    expect(spiritLP2).to.be.equal(0);
    expect(spiritLP3).to.be.equal(0);

    console.log("SPIRIT Balances")
    console.log("Gauge Proxy", divDec(spiritGP));
    console.log("LP1", divDec(spiritLP1));
    console.log("LP2", divDec(spiritLP2));
    console.log("LP3", divDec(spiritLP3));
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

it('User1 calls distribute', async function () {
    console.log("******************************************************");
    await gaugeProxy.connect(user1).distribute();
    
    let spiritGP = await spirit.balanceOf(gaugeProxy.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    expect(spiritGP).to.be.equal(0);
    expect(spiritLP1).to.be.above(0);
    expect(spiritLP2).to.be.equal(0);
    expect(spiritLP3).to.be.equal(0);

    console.log("SPIRIT Balances")
    console.log("Gauge Proxy", divDec(spiritGP));
    console.log("LP1", divDec(spiritLP1));
    console.log("LP2", divDec(spiritLP2));
    console.log("LP3", divDec(spiritLP3));
});

it('Forward time by 1 week then User1 claims rewards', async function () {
    console.log("******************************************************");

    // Forward time by 1 week
    await network.provider.send('evm_increaseTime', [7*24*3600]); 
    await network.provider.send('evm_mine');

    await LP1Gauge.connect(user1).getReward();
    await LP2Gauge.connect(user1).getReward();
    await LP3Gauge.connect(user1).getReward();

    let spiritUser1 = await spirit.balanceOf(user1.address);
    let spiritUser2 = await spirit.balanceOf(user2.address);
    let spiritUser3 = await spirit.balanceOf(user3.address);

    console.log("User1 SPIRIT", divDec(spiritUser1));
    console.log("User2 SPIRIT", divDec(spiritUser2));
    console.log("User3 SPIRIT", divDec(spiritUser3));

    await spirit.connect(user1).transfer(owner.address, spiritUser1);
    await spirit.connect(user2).transfer(owner.address, spiritUser2);
    await spirit.connect(user3).transfer(owner.address, spiritUser3);

    console.log("User SPIRIT balances sent to owner");

});

it('Fill Gauge Proxy with SPIRIT for 10 blocks', async function () {
    console.log("******************************************************");
    // Forward time by 10 blocks
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');

    let pendingSPIRITGP = await masterChef.pendingSpirit(0, gaugeProxy.address);
    console.log("Pending SPIRIT to be claimed by Gauge Proxy", divDec(pendingSPIRITGP));
    expect(pendingSPIRITGP).to.be.above(0);
});


it('Owner sets weight for LP2', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(owner).setGaugeWeight(LP2.address, 100);
    console.log("Owner has set LP2 weight to 100");

    let totalWeight = await gaugeProxy.totalWeight();
    let LP1Weight = await gaugeProxy.gaugeWeights(LP1.address);
    let LP2Weight = await gaugeProxy.gaugeWeights(LP2.address);
    let LP3Weight = await gaugeProxy.gaugeWeights(LP3.address);

    expect(totalWeight).to.be.equal(200);
    expect(LP1Weight).to.be.equal(100);
    expect(LP2Weight).to.be.equal(100);
    expect(LP3Weight).to.be.equal(0);

    console.log("Gauge Proxy Status");
    console.log("Total weight", totalWeight);
    console.log("LP1 weight", LP1Weight);
    console.log("LP2 weight", LP2Weight);
    console.log("LP3 weight", LP3Weight);
});

it('User2 calls distribute', async function () {
    console.log("******************************************************");
    await gaugeProxy.connect(user2).distribute();
    
    let spiritGP = await spirit.balanceOf(gaugeProxy.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    expect(spiritGP).to.be.equal(0);
    expect(spiritLP1).to.be.above(0);
    expect(spiritLP2).to.be.above(0);
    expect(spiritLP3).to.be.equal(0);

    console.log("SPIRIT Balances")
    console.log("Gauge Proxy", divDec(spiritGP));
    console.log("LP1", divDec(spiritLP1));
    console.log("LP2", divDec(spiritLP2));
    console.log("LP3", divDec(spiritLP3));
});

it('Forward time by 1 week then User1 claims rewards', async function () {
    console.log("******************************************************");

    // Forward time by 1 week
    await network.provider.send('evm_increaseTime', [7*24*3600]); 
    await network.provider.send('evm_mine');

    await LP1Gauge.connect(user1).getReward();
    await LP2Gauge.connect(user1).getReward();
    await LP3Gauge.connect(user1).getReward();

    let spiritUser1 = await spirit.balanceOf(user1.address);
    let spiritUser2 = await spirit.balanceOf(user2.address);
    let spiritUser3 = await spirit.balanceOf(user3.address);

    console.log("User1 SPIRIT", divDec(spiritUser1));
    console.log("User2 SPIRIT", divDec(spiritUser2));
    console.log("User3 SPIRIT", divDec(spiritUser3));

    await spirit.connect(user1).transfer(owner.address, spiritUser1);
    await spirit.connect(user2).transfer(owner.address, spiritUser2);
    await spirit.connect(user3).transfer(owner.address, spiritUser3);

    console.log("User SPIRIT balances sent to owner");

});

it('Fill Gauge Proxy with SPIRIT for 10 blocks', async function () {
    console.log("******************************************************");
    // Forward time by 10 blocks
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');

    let pendingSPIRITGP = await masterChef.pendingSpirit(0, gaugeProxy.address);
    console.log("Pending SPIRIT to be claimed by Gauge Proxy", divDec(pendingSPIRITGP));
    expect(pendingSPIRITGP).to.be.above(0);
});

it('Owner sets weight for LP3', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(owner).setGaugeWeight(LP3.address, 100);
    console.log("Owner has set LP3 weight to 100");

    let totalWeight = await gaugeProxy.totalWeight();
    let LP1Weight = await gaugeProxy.gaugeWeights(LP1.address);
    let LP2Weight = await gaugeProxy.gaugeWeights(LP2.address);
    let LP3Weight = await gaugeProxy.gaugeWeights(LP3.address);

    expect(totalWeight).to.be.equal(300);
    expect(LP1Weight).to.be.equal(100);
    expect(LP2Weight).to.be.equal(100);
    expect(LP3Weight).to.be.equal(100);

    console.log("Gauge Proxy Status");
    console.log("Total weight", totalWeight);
    console.log("LP1 weight", LP1Weight);
    console.log("LP2 weight", LP2Weight);
    console.log("LP3 weight", LP3Weight);
});

it('User2 calls distribute', async function () {
    console.log("******************************************************");
    await gaugeProxy.connect(user2).distribute();
    
    let spiritGP = await spirit.balanceOf(gaugeProxy.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    expect(spiritLP1).to.be.above(0);
    expect(spiritLP2).to.be.above(0);
    expect(spiritLP3).to.be.above(0);

    console.log("SPIRIT Balances")
    console.log("Gauge Proxy", divDec(spiritGP));
    console.log("LP1", divDec(spiritLP1));
    console.log("LP2", divDec(spiritLP2));
    console.log("LP3", divDec(spiritLP3));
});

it('Forward time by 1 week then User1 claims rewards', async function () {
    console.log("******************************************************");

    // Forward time by 1 week
    await network.provider.send('evm_increaseTime', [7*24*3600]); 
    await network.provider.send('evm_mine');

    await LP1Gauge.connect(user1).getReward();
    await LP2Gauge.connect(user1).getReward();
    await LP3Gauge.connect(user1).getReward();

    let spiritUser1 = await spirit.balanceOf(user1.address);
    let spiritUser2 = await spirit.balanceOf(user2.address);
    let spiritUser3 = await spirit.balanceOf(user3.address);

    console.log("User1 SPIRIT", divDec(spiritUser1));
    console.log("User2 SPIRIT", divDec(spiritUser2));
    console.log("User3 SPIRIT", divDec(spiritUser3));

    await spirit.connect(user1).transfer(owner.address, spiritUser1);
    await spirit.connect(user2).transfer(owner.address, spiritUser2);
    await spirit.connect(user3).transfer(owner.address, spiritUser3);

    console.log("User SPIRIT balances sent to owner");

});

it('Fill Gauge Proxy with SPIRIT for 10 blocks', async function () {
    console.log("******************************************************");
    // Forward time by 10 blocks
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');

    let pendingSPIRITGP = await masterChef.pendingSpirit(0, gaugeProxy.address);
    console.log("Pending SPIRIT to be claimed by Gauge Proxy", divDec(pendingSPIRITGP));
    expect(pendingSPIRITGP).to.be.above(0);
});

it('Owner sets weight for LP2 and LP3', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(owner).setGaugeWeight(LP2.address, 50);
    await gaugeProxy.connect(owner).setGaugeWeight(LP3.address, 50);
    console.log("Owner has set LP2 and LP3 weight to 50");

    let totalWeight = await gaugeProxy.totalWeight();
    let LP1Weight = await gaugeProxy.gaugeWeights(LP1.address);
    let LP2Weight = await gaugeProxy.gaugeWeights(LP2.address);
    let LP3Weight = await gaugeProxy.gaugeWeights(LP3.address);

    expect(totalWeight).to.be.equal(200);
    expect(LP1Weight).to.be.equal(100);
    expect(LP2Weight).to.be.equal(50);
    expect(LP3Weight).to.be.equal(50);

    console.log("Gauge Proxy Status");
    console.log("Total weight", totalWeight);
    console.log("LP1 weight", LP1Weight);
    console.log("LP2 weight", LP2Weight);
    console.log("LP3 weight", LP3Weight);
});

it('User2 calls distribute', async function () {
    console.log("******************************************************");
    await gaugeProxy.connect(user2).distribute();
    
    let spiritGP = await spirit.balanceOf(gaugeProxy.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    expect(spiritLP1).to.be.above(0);
    expect(spiritLP2).to.be.above(0);
    expect(spiritLP3).to.be.above(0);

    console.log("SPIRIT Balances")
    console.log("Gauge Proxy", divDec(spiritGP));
    console.log("LP1", divDec(spiritLP1));
    console.log("LP2", divDec(spiritLP2));
    console.log("LP3", divDec(spiritLP3));
});

it('Forward time by 1 week then User1 claims rewards', async function () {
    console.log("******************************************************");

    // Forward time by 1 week
    await network.provider.send('evm_increaseTime', [7*24*3600]); 
    await network.provider.send('evm_mine');

    await LP1Gauge.connect(user1).getReward();
    await LP2Gauge.connect(user1).getReward();
    await LP3Gauge.connect(user1).getReward();

    let spiritUser1 = await spirit.balanceOf(user1.address);
    let spiritUser2 = await spirit.balanceOf(user2.address);
    let spiritUser3 = await spirit.balanceOf(user3.address);

    console.log("User1 SPIRIT", divDec(spiritUser1));
    console.log("User2 SPIRIT", divDec(spiritUser2));
    console.log("User3 SPIRIT", divDec(spiritUser3));

    await spirit.connect(user1).transfer(owner.address, spiritUser1);
    await spirit.connect(user2).transfer(owner.address, spiritUser2);
    await spirit.connect(user3).transfer(owner.address, spiritUser3);

    console.log("User SPIRIT balances sent to owner");

});

it('Fill Gauge Proxy with SPIRIT for 10 blocks', async function () {
    console.log("******************************************************");
    // Forward time by 10 blocks
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');

    let pendingSPIRITGP = await masterChef.pendingSpirit(0, gaugeProxy.address);
    console.log("Pending SPIRIT to be claimed by Gauge Proxy", divDec(pendingSPIRITGP));
    expect(pendingSPIRITGP).to.be.above(0);
});

it('Owner sets weight for LP3', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(owner).setGaugeWeight(LP3.address, 0);
    console.log("Owner has set LP3 weight to 0");

    let totalWeight = await gaugeProxy.totalWeight();
    let LP1Weight = await gaugeProxy.gaugeWeights(LP1.address);
    let LP2Weight = await gaugeProxy.gaugeWeights(LP2.address);
    let LP3Weight = await gaugeProxy.gaugeWeights(LP3.address);

    expect(totalWeight).to.be.equal(150);
    expect(LP1Weight).to.be.equal(100);
    expect(LP2Weight).to.be.equal(50);
    expect(LP3Weight).to.be.equal(0);

    console.log("Gauge Proxy Status");
    console.log("Total weight", totalWeight);
    console.log("LP1 weight", LP1Weight);
    console.log("LP2 weight", LP2Weight);
    console.log("LP3 weight", LP3Weight);
});

it('User2 calls distribute', async function () {
    console.log("******************************************************");
    await gaugeProxy.connect(user2).distribute();
    
    let spiritGP = await spirit.balanceOf(gaugeProxy.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    console.log("SPIRIT Balances")
    console.log("Gauge Proxy", divDec(spiritGP));
    console.log("LP1", divDec(spiritLP1));
    console.log("LP2", divDec(spiritLP2));
    console.log("LP3", divDec(spiritLP3));
});

it('Forward time by 1 week then User1 claims rewards', async function () {
    console.log("******************************************************");

    // Forward time by 1 week
    await network.provider.send('evm_increaseTime', [7*24*3600]); 
    await network.provider.send('evm_mine');

    await LP1Gauge.connect(user1).getReward();
    await LP2Gauge.connect(user1).getReward();
    await LP3Gauge.connect(user1).getReward();

    let spiritUser1 = await spirit.balanceOf(user1.address);
    let spiritUser2 = await spirit.balanceOf(user2.address);
    let spiritUser3 = await spirit.balanceOf(user3.address);

    console.log("User1 SPIRIT", divDec(spiritUser1));
    console.log("User2 SPIRIT", divDec(spiritUser2));
    console.log("User3 SPIRIT", divDec(spiritUser3));

    await spirit.connect(user1).transfer(owner.address, spiritUser1);
    await spirit.connect(user2).transfer(owner.address, spiritUser2);
    await spirit.connect(user3).transfer(owner.address, spiritUser3);

    console.log("User SPIRIT balances sent to owner");

});

it('Fill Gauge Proxy with SPIRIT for 10 blocks', async function () {
    console.log("******************************************************");
    // Forward time by 10 blocks
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');

    let pendingSPIRITGP = await masterChef.pendingSpirit(0, gaugeProxy.address);
    console.log("Pending SPIRIT to be claimed by Gauge Proxy", divDec(pendingSPIRITGP));
    expect(pendingSPIRITGP).to.be.above(0);
});

it('Owner sets ve to true', async function () {
    console.log("******************************************************");
    console.log("******************************************************");
    console.log("VE33 ENGAGED");
    console.log("******************************************************");
    let ve33 = await gaugeProxy.ve();
    expect(ve33).to.be.equal(false);
    await gaugeProxy.toggleVE();
    ve33 = await gaugeProxy.ve();
    expect(ve33).to.be.equal(true);
    console.log("VE33: ", ve33);
});

it('Owner sets weight for LP2', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(owner).setGaugeWeight(LP2.address, 100);
    console.log("Owner has set LP2 weight to 100");

    let totalWeight = await gaugeProxy.totalWeight();
    let LP1Weight = await gaugeProxy.gaugeWeights(LP1.address);
    let LP2Weight = await gaugeProxy.gaugeWeights(LP2.address);
    let LP3Weight = await gaugeProxy.gaugeWeights(LP3.address);

    expect(totalWeight).to.be.equal(200);
    expect(LP1Weight).to.be.equal(100);
    expect(LP2Weight).to.be.equal(100);
    expect(LP3Weight).to.be.equal(0);

    console.log("Gauge Proxy Status");
    console.log("Total weight", totalWeight);
    console.log("LP1 weight", LP1Weight);
    console.log("LP2 weight", LP2Weight);
    console.log("LP3 weight", LP3Weight);
});

it('User2 calls distribute', async function () {
    console.log("******************************************************");
    await gaugeProxy.connect(user2).distribute();

    let spiritFeeDist = await spirit.balanceOf(feeDist.address);
    let spiritGP = await spirit.balanceOf(gaugeProxy.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    let spiritLockedIn = await spirit.balanceOf(inSpirit.address);
    let spiritTotalSupply = await spirit.totalSupply();

    console.log("SPIRIT locked in inSPIRIT", divDec(spiritLockedIn));
    console.log("SPIRIT total supply", divDec(spiritTotalSupply));

    console.log("SPIRIT Balances")
    console.log("Fee Distributor", divDec(spiritFeeDist));
    console.log("Gauge Proxy", divDec(spiritGP));
    console.log("LP1", divDec(spiritLP1));
    console.log("LP2", divDec(spiritLP2));
    console.log("LP3", divDec(spiritLP3));
});

it('Forward time by 1 week then User1 claims rewards', async function () {
    console.log("******************************************************");

    // Forward time by 1 week
    await network.provider.send('evm_increaseTime', [7*24*3600]); 
    await network.provider.send('evm_mine');

    await LP1Gauge.connect(user1).getReward();
    await LP2Gauge.connect(user1).getReward();
    await LP3Gauge.connect(user1).getReward();

    let spiritUser1 = await spirit.balanceOf(user1.address);
    let spiritUser2 = await spirit.balanceOf(user2.address);
    let spiritUser3 = await spirit.balanceOf(user3.address);
    let spiritFeeDist = await spirit.balanceOf(feeDist.address);

    console.log("User1 SPIRIT", divDec(spiritUser1));
    console.log("User2 SPIRIT", divDec(spiritUser2));
    console.log("User3 SPIRIT", divDec(spiritUser3));

    await spirit.connect(user1).transfer(owner.address, spiritUser1);
    await spirit.connect(user2).transfer(owner.address, spiritUser2);
    await spirit.connect(user3).transfer(owner.address, spiritUser3);
    await spirit.connect(feeDist).transfer(owner.address, spiritFeeDist);

    console.log("User and FeeDist SPIRIT balances sent to owner");

});

it('Owner locks more inSPIRIT', async function () {
    console.log("******************************************************");
    await spirit.connect(owner).approve(inSpirit.address, tenThousand);
    await inSpirit.connect(owner).increase_amount(tenThousand);
    await spirit.connect(owner).approve(inSpirit.address, tenThousand);
    await inSpirit.connect(owner).increase_amount(tenThousand);
    await spirit.connect(owner).approve(inSpirit.address, tenThousand);
    await inSpirit.connect(owner).increase_amount(tenThousand);
    await spirit.connect(owner).approve(inSpirit.address, tenThousand);
    await inSpirit.connect(owner).increase_amount(tenThousand);

    let ownerSpirit = await spirit.balanceOf(owner.address);
    let ownerInSpirit = await inSpirit['balanceOf(address)'](owner.address);
    expect(ownerInSpirit).to.be.above(0);
    console.log("Owner SPIRIT Balance", divDec(ownerSpirit));
    console.log("Owner inSPIRIT Balance", divDec(ownerInSpirit));
    console.log("Owner has inSPIRIT");

});

it('Fill Gauge Proxy with SPIRIT for 10 blocks', async function () {
    console.log("******************************************************");
    // Forward time by 10 blocks
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');

    let pendingSPIRITGP = await masterChef.pendingSpirit(0, gaugeProxy.address);
    console.log("Pending SPIRIT to be claimed by Gauge Proxy", divDec(pendingSPIRITGP));
    expect(pendingSPIRITGP).to.be.above(0);
});

it('Owner sets weight for LP2', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(owner).setGaugeWeight(LP2.address, 100);
    console.log("Owner has set LP2 weight to 100");

    let totalWeight = await gaugeProxy.totalWeight();
    let LP1Weight = await gaugeProxy.gaugeWeights(LP1.address);
    let LP2Weight = await gaugeProxy.gaugeWeights(LP2.address);
    let LP3Weight = await gaugeProxy.gaugeWeights(LP3.address);

    expect(totalWeight).to.be.equal(200);
    expect(LP1Weight).to.be.equal(100);
    expect(LP2Weight).to.be.equal(100);
    expect(LP3Weight).to.be.equal(0);

    console.log("Gauge Proxy Status");
    console.log("Total weight", totalWeight);
    console.log("LP1 weight", LP1Weight);
    console.log("LP2 weight", LP2Weight);
    console.log("LP3 weight", LP3Weight);
});

it('User2 calls distribute', async function () {
    console.log("******************************************************");
    await gaugeProxy.connect(user2).distribute();

    let spiritFeeDist = await spirit.balanceOf(feeDist.address);
    let spiritGP = await spirit.balanceOf(gaugeProxy.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    let spiritLockedIn = await spirit.balanceOf(inSpirit.address);
    let spiritTotalSupply = await spirit.totalSupply();

    console.log("SPIRIT locked in inSPIRIT", divDec(spiritLockedIn));
    console.log("SPIRIT total supply", divDec(spiritTotalSupply));

    console.log("SPIRIT Balances")
    console.log("Fee Distributor", divDec(spiritFeeDist));
    console.log("Gauge Proxy", divDec(spiritGP));
    console.log("LP1", divDec(spiritLP1));
    console.log("LP2", divDec(spiritLP2));
    console.log("LP3", divDec(spiritLP3));
});

it('Forward time by 1 week then User1 claims rewards', async function () {
    console.log("******************************************************");

    // Forward time by 1 week
    await network.provider.send('evm_increaseTime', [7*24*3600]); 
    await network.provider.send('evm_mine');

    await LP1Gauge.connect(user1).getReward();
    await LP2Gauge.connect(user1).getReward();
    await LP3Gauge.connect(user1).getReward();

    let spiritUser1 = await spirit.balanceOf(user1.address);
    let spiritUser2 = await spirit.balanceOf(user2.address);
    let spiritUser3 = await spirit.balanceOf(user3.address);
    let spiritFeeDist = await spirit.balanceOf(feeDist.address);

    console.log("User1 SPIRIT", divDec(spiritUser1));
    console.log("User2 SPIRIT", divDec(spiritUser2));
    console.log("User3 SPIRIT", divDec(spiritUser3));

    await spirit.connect(user1).transfer(owner.address, spiritUser1);
    await spirit.connect(user2).transfer(owner.address, spiritUser2);
    await spirit.connect(user3).transfer(owner.address, spiritUser3);
    await spirit.connect(feeDist).transfer(owner.address, spiritFeeDist);

    console.log("User and FeeDist SPIRIT balances sent to owner");

});

it('Fill Gauge Proxy with SPIRIT for 10 blocks', async function () {
    console.log("******************************************************");
    // Forward time by 10 blocks
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');

    let pendingSPIRITGP = await masterChef.pendingSpirit(0, gaugeProxy.address);
    console.log("Pending SPIRIT to be claimed by Gauge Proxy", divDec(pendingSPIRITGP));
    expect(pendingSPIRITGP).to.be.above(0);
});

it('Owner sets weight for LP3', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(owner).setGaugeWeight(LP3.address, 100);
    console.log("Owner has set LP3 weight to 100");

    let totalWeight = await gaugeProxy.totalWeight();
    let LP1Weight = await gaugeProxy.gaugeWeights(LP1.address);
    let LP2Weight = await gaugeProxy.gaugeWeights(LP2.address);
    let LP3Weight = await gaugeProxy.gaugeWeights(LP3.address);

    expect(totalWeight).to.be.equal(300);
    expect(LP1Weight).to.be.equal(100);
    expect(LP2Weight).to.be.equal(100);
    expect(LP3Weight).to.be.equal(100);

    console.log("Gauge Proxy Status");
    console.log("Total weight", totalWeight);
    console.log("LP1 weight", LP1Weight);
    console.log("LP2 weight", LP2Weight);
    console.log("LP3 weight", LP3Weight);
});

it('Owner sets ve to false', async function () {
    console.log("******************************************************");
    console.log("******************************************************");
    console.log("VE33 ENGAGED");
    console.log("******************************************************");
    let ve33 = await gaugeProxy.ve();
    expect(ve33).to.be.equal(true);
    await gaugeProxy.toggleVE();
    ve33 = await gaugeProxy.ve();
    expect(ve33).to.be.equal(false);
    console.log("VE33: ", ve33);
});

it('User2 calls distribute', async function () {
    console.log("******************************************************");
    await gaugeProxy.connect(user2).distribute();

    let spiritFeeDist = await spirit.balanceOf(feeDist.address);
    let spiritGP = await spirit.balanceOf(gaugeProxy.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    let spiritLockedIn = await spirit.balanceOf(inSpirit.address);
    let spiritTotalSupply = await spirit.totalSupply();

    console.log("SPIRIT locked in inSPIRIT", divDec(spiritLockedIn));
    console.log("SPIRIT total supply", divDec(spiritTotalSupply));

    console.log("SPIRIT Balances")
    console.log("Fee Distributor", divDec(spiritFeeDist));
    console.log("Gauge Proxy", divDec(spiritGP));
    console.log("LP1", divDec(spiritLP1));
    console.log("LP2", divDec(spiritLP2));
    console.log("LP3", divDec(spiritLP3));
});

it('Forward time by 1 week then User1 claims rewards', async function () {
    console.log("******************************************************");

    // Forward time by 1 week
    await network.provider.send('evm_increaseTime', [7*24*3600]); 
    await network.provider.send('evm_mine');

    await LP1Gauge.connect(user1).getReward();
    await LP2Gauge.connect(user1).getReward();
    await LP3Gauge.connect(user1).getReward();

    let spiritUser1 = await spirit.balanceOf(user1.address);
    let spiritUser2 = await spirit.balanceOf(user2.address);
    let spiritUser3 = await spirit.balanceOf(user3.address);
    let spiritFeeDist = await spirit.balanceOf(feeDist.address);

    console.log("User1 SPIRIT", divDec(spiritUser1));
    console.log("User2 SPIRIT", divDec(spiritUser2));
    console.log("User3 SPIRIT", divDec(spiritUser3));

    await spirit.connect(user1).transfer(owner.address, spiritUser1);
    await spirit.connect(user2).transfer(owner.address, spiritUser2);
    await spirit.connect(user3).transfer(owner.address, spiritUser3);
    await spirit.connect(feeDist).transfer(owner.address, spiritFeeDist);

    console.log("User and FeeDist SPIRIT balances sent to owner");

});

it('Fill Gauge Proxy with SPIRIT for 10 blocks', async function () {
    console.log("******************************************************");
    // Forward time by 10 blocks
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');

    let pendingSPIRITGP = await masterChef.pendingSpirit(0, gaugeProxy.address);
    console.log("Pending SPIRIT to be claimed by Gauge Proxy", divDec(pendingSPIRITGP));
    expect(pendingSPIRITGP).to.be.above(0);
});

it('Owner sets weight for LP3', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(owner).setGaugeWeight(LP3.address, 100);
    console.log("Owner has set LP3 weight to 100");

    let totalWeight = await gaugeProxy.totalWeight();
    let LP1Weight = await gaugeProxy.gaugeWeights(LP1.address);
    let LP2Weight = await gaugeProxy.gaugeWeights(LP2.address);
    let LP3Weight = await gaugeProxy.gaugeWeights(LP3.address);

    expect(totalWeight).to.be.equal(300);
    expect(LP1Weight).to.be.equal(100);
    expect(LP2Weight).to.be.equal(100);
    expect(LP3Weight).to.be.equal(100);

    console.log("Gauge Proxy Status");
    console.log("Total weight", totalWeight);
    console.log("LP1 weight", LP1Weight);
    console.log("LP2 weight", LP2Weight);
    console.log("LP3 weight", LP3Weight);
});

it('Owner sets ve to true', async function () {
    console.log("******************************************************");
    console.log("******************************************************");
    console.log("VE33 ENGAGED");
    console.log("******************************************************");
    let ve33 = await gaugeProxy.ve();
    expect(ve33).to.be.equal(false);
    await gaugeProxy.toggleVE();
    ve33 = await gaugeProxy.ve();
    expect(ve33).to.be.equal(true);
    console.log("VE33: ", ve33);
});

it('User2 calls distribute', async function () {
    console.log("******************************************************");
    await gaugeProxy.connect(user2).distribute();

    let spiritFeeDist = await spirit.balanceOf(feeDist.address);
    let spiritGP = await spirit.balanceOf(gaugeProxy.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    let spiritLockedIn = await spirit.balanceOf(inSpirit.address);
    let spiritTotalSupply = await spirit.totalSupply();

    console.log("SPIRIT locked in inSPIRIT", divDec(spiritLockedIn));
    console.log("SPIRIT total supply", divDec(spiritTotalSupply));

    console.log("SPIRIT Balances")
    console.log("Fee Distributor", divDec(spiritFeeDist));
    console.log("Gauge Proxy", divDec(spiritGP));
    console.log("LP1", divDec(spiritLP1));
    console.log("LP2", divDec(spiritLP2));
    console.log("LP3", divDec(spiritLP3));
});

it('Forward time by 1 week then User1 claims rewards', async function () {
    console.log("******************************************************");

    // Forward time by 1 week
    await network.provider.send('evm_increaseTime', [7*24*3600]); 
    await network.provider.send('evm_mine');

    await LP1Gauge.connect(user1).getReward();
    await LP2Gauge.connect(user1).getReward();
    await LP3Gauge.connect(user1).getReward();

    let spiritUser1 = await spirit.balanceOf(user1.address);
    let spiritUser2 = await spirit.balanceOf(user2.address);
    let spiritUser3 = await spirit.balanceOf(user3.address);
    let spiritFeeDist = await spirit.balanceOf(feeDist.address);

    console.log("User1 SPIRIT", divDec(spiritUser1));
    console.log("User2 SPIRIT", divDec(spiritUser2));
    console.log("User3 SPIRIT", divDec(spiritUser3));

    await spirit.connect(user1).transfer(owner.address, spiritUser1);
    await spirit.connect(user2).transfer(owner.address, spiritUser2);
    await spirit.connect(user3).transfer(owner.address, spiritUser3);
    await spirit.connect(feeDist).transfer(owner.address, spiritFeeDist);

    console.log("User and FeeDist SPIRIT balances sent to owner");

});

it('Update deposit fee rate tests', async function () {
    console.log("******************************************************");
    await gaugeProxy.updateDepositFeeRate(1);
    expect(await gaugeProxy.getDepositFeeRate()).to.be.equal(1);
    await gaugeProxy.updateDepositFeeRate(0);
});

it('Set new admin addr', async function () {
    console.log("******************************************************");
    await gaugeProxy.setAdmin(admin.address);
    expect(await gaugeProxy.admin()).to.be.equal(admin.address);
});

it('Update FeeDistributor address', async function () {
    console.log("******************************************************");
    await gaugeProxy.updateFeeDistributor(user3.address);
    expect(await gaugeProxy.feeDistAddr()).to.be.equal(user3.address);
    await expect(gaugeProxy.connect(admin).updateFeeDistributor(feeDist.address)).to.not.be.reverted;
});

it('Update treasury tests', async function () {
    console.log("******************************************************");
    await gaugeProxy.updateTreasury(admin.address);
    expect(await gaugeProxy.getTreasury()).to.be.equal(admin.address);
});

it('Admin functions only, all tests to revert', async function () {
    console.log("******************************************************");
    await expect(gaugeProxy.connect(user1).setAdmin(admin.address)).to.be.reverted;
    await expect(gaugeProxy.connect(user1).setGovernance(admin.address)).to.be.reverted;
    await expect(gaugeProxy.connect(user1).updateFeeDistributor(admin.address)).to.be.reverted;
    await expect(gaugeProxy.connect(user1).toggleVE()).to.be.reverted;
    await expect(gaugeProxy.connect(user1).toggleVE()).to.be.reverted;
    await expect(gaugeProxy.connect(user1).acceptGovernance(admin.address)).to.be.reverted;
    await expect(gaugeProxy.connect(user1).addGauge(LP3.address)).to.be.reverted;
    await expect(gaugeProxy.connect(user1).setGaugeWeight(LP3.address, 10)).to.be.reverted;
    await expect(gaugeProxy.addGauge(LP3.address)).to.be.reverted;
    await expect(gaugeProxy.connect(user1).setPID(0)).to.be.reverted;
    await expect(gaugeProxy.connect(user1).updateDepositFeeRate(10000)).to.be.reverted;
    await expect(gaugeProxy.updateDepositFeeRate(10000)).to.be.reverted;
    await expect(gaugeProxy.connect(user1).updateTreasury(user1.address)).to.be.reverted;
});

it('Set and accept governance changes', async function () {
    console.log("******************************************************");
    await gaugeProxy.setGovernance(admin.address);
    await gaugeProxy.connect(admin).acceptGovernance();
    expect(await gaugeProxy.governance()).to.be.equal(admin.address);
});


});