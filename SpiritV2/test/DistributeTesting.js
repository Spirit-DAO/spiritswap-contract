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
let owner, admin, user1, user2, user3, feeDist2, spiritMaker; 
// contracts
let masterChef, gaugeProxy, feeDistributor, bribeFactory;
// tokens
let weth, spirit, inSpirit, LP1, LP2, LP3, LP4, TK1, TK2, TK3, TK4;
// gauge contracts
let LP1Gauge, LP2Gauge, LP3Gauge;
// bribe contracts
let LP1Bribe, LP2Bribe, LP3Bribe;
let LP1Fees, LP2Fees, LP3Fees;
// user1 voting variables
let user1TotalVote, user1TotalPower, user1LP1VoteWeight, user1LP2VoteWeight, user1LP3VoteWeight;
// user2 voting variables
let user2TotalVote, user2TotalPower, user2LP1VoteWeight, user2LP2VoteWeight, user2LP3VoteWeight;

let farmStartBlockNum;

describe("GaugeProxy Distribute Testing", function () {
  
  before("Initial set up", async function () {
    console.log("Begin Initialization");

    // initialize users
    [owner, admin, user1, user2, user3, feeDist2, spiritMaker] = await ethers.getSigners();

    // initialize tokens
    // mints 1000 tokens to deployer
    const erc20Mock = await ethers.getContractFactory("ERC20Mock");
    weth = await erc20Mock.deploy("WETH", "WETH");
    TK1 = await erc20Mock.deploy("TK1", "TK1");
    TK2 = await erc20Mock.deploy("TK2", "TK2");
    TK3 = await erc20Mock.deploy("TK3", "TK3");
    TK4 = await erc20Mock.deploy("TK4", "TK4");
    LP4 = await erc20Mock.deploy("LP4", "LP4");
    const spiritToken = await ethers.getContractFactory("contracts/SpiritV1/SpiritToken.sol:SpiritToken");
    spirit = await spiritToken.deploy();
    console.log("- Tokens Initialized");

     // Initialize pairFactory
     const pairFactoryArtifact = await ethers.getContractFactory("BaseV1Factory");
     const pairFactoryContract = await pairFactoryArtifact.deploy();
     pairFactory = await ethers.getContractAt("BaseV1Factory", pairFactoryContract.address);
     console.log("- Pair Factory Initialized");

     // Initialize router
     const routerArtifact = await ethers.getContractFactory("BaseV1Router01");
     const routerContract = await routerArtifact.deploy(pairFactory.address, weth.address);
     router = await ethers.getContractAt("BaseV1Router01", routerContract.address);
     console.log("- Router Initialized"); 

     // Set Spirit Maker of Factory
     await pairFactory.setSpiritMaker(spiritMaker.address);

     // Create vLP: WETH-TK1
     await weth.connect(owner).approve(router.address, tenThousand);
     await TK1.connect(owner).approve(router.address, tenThousand);
     await router.connect(owner).addLiquidity(weth.address, TK1.address, true, tenThousand, tenThousand, tenThousand, tenThousand, owner.address, 1685083888);

     const vLP1Address = await pairFactory.getPair(weth.address, TK1.address, true);
     LP1 = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Pair", vLP1Address)
     await pairFactory.connect(owner).setProtocolAddress(LP1.address, owner.address);
     console.log("- sLP1 Initialized"); 

     const vLP1FeesAddress = await LP1.fees();
     LP1Fees = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Fees", vLP1FeesAddress)
     console.log("- vLP1Fees Initialized"); 

     // Create vLP: WETH-TK2
     await weth.connect(owner).approve(router.address, tenThousand);
     await TK2.connect(owner).approve(router.address, tenThousand);
     await router.connect(owner).addLiquidity(weth.address, TK2.address, true, tenThousand, tenThousand, tenThousand, tenThousand, owner.address, 1685083888);

     const vLP2Address = await pairFactory.getPair(weth.address, TK2.address, true);
     LP2 = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Pair", vLP2Address)
     await pairFactory.connect(owner).setProtocolAddress(LP2.address, owner.address);
     console.log("- sLP2 Initialized"); 

     const vLP2FeesAddress = await LP2.fees();
     LP2Fees = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Fees", vLP2FeesAddress)
     console.log("- sLP2Fees Initialized"); 

    // Create vLP: WETH-TK3
    await weth.connect(owner).approve(router.address, tenThousand);
    await TK3.connect(owner).approve(router.address, tenThousand);
    await router.connect(owner).addLiquidity(weth.address, TK3.address, true, tenThousand, tenThousand, tenThousand, tenThousand, owner.address, 1685083888);

    const vLP3Address = await pairFactory.getPair(weth.address, TK3.address, true);
    LP3 = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Pair", vLP3Address)
    await pairFactory.connect(owner).setProtocolAddress(LP3.address, owner.address);
    console.log("- sLP3 Initialized"); 

    const vLP3FeesAddress = await LP3.fees();
    LP3Fees = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Fees", vLP3FeesAddress)
    console.log("- sLP3Fees Initialized"); 

    // initialize inSpirit
    const inSpiritArtifact = await ethers.getContractFactory("inSpirit");
    const inSpiritContract = await inSpiritArtifact.deploy(spirit.address, "inSpirit Token", "inSpirit", "1.0.0");
    inSpirit = await ethers.getContractAt("inSpirit", inSpiritContract.address);
    console.log("- inSpirit Initialized");

    // initialize feeDistributor
    const feeDistributorArtifact = await ethers.getContractFactory("fee-distributor");
    const feeDistributorContract = await feeDistributorArtifact.deploy(inSpirit.address, startTime, spirit.address, owner.address, owner.address);
    feeDistributor = await ethers.getContractAt("fee-distributor", feeDistributorContract.address);
    console.log("- FeeDistributor Initialized");

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

    // initialize bribeFactory
    const bribeFactoryArtifact = await ethers.getContractFactory("BribeFactory");
    const bribeFactoryContract = await bribeFactoryArtifact.deploy();
    bribeFactory = await ethers.getContractAt("BribeFactory", bribeFactoryContract.address);
    console.log("- BribeFactory Initialized");

    // initialize gaugeProxy
    const gaugeProxyArtifact = await ethers.getContractFactory("StableGaugeProxy");
    const gaugeProxyContract = await gaugeProxyArtifact.deploy(
        masterChef.address, 
        spirit.address, 
        inSpirit.address, 
        feeDistributor.address, 
        bribeFactory.address, 
        pairFactory.address);
    gaugeProxy = await ethers.getContractAt("StableGaugeProxy", gaugeProxyContract.address);
    console.log("- GaugeProxy Initialized");

    // Create pool in masterChef for minSPIRIT and deposit minSPIRIT from gaugeProxy
    const minSpiritAddr = await gaugeProxy.TOKEN();
    await masterChef.add(100, minSpiritAddr, 0, true);
    await gaugeProxyContract.setPID(0);
    farmStartBlockNum = (await gaugeProxyContract.deposit()).blockNumber;

    await gaugeProxy.setBaseToken(weth.address, true); // Make WETH base token
    await gaugeProxy.setVerifiedToken(TK1.address, true); // Verify TK1
    await gaugeProxy.setVerifiedToken(TK2.address, true); // Verify TK2
    await gaugeProxy.setVerifiedToken(TK3.address, true); // Verify TK3

    // Set up Gauges/Bribes for LP1, LP2, LP3
    await gaugeProxy.addGauge(LP1.address);
    await gaugeProxy.addGauge(LP2.address);
    await gaugeProxy.addGauge(LP3.address);
    let LP1GaugeAddr = await gaugeProxy.getGauge(LP1.address);
    let LP1BribeAddr = await gaugeProxy.getBribes(LP1GaugeAddr);
    LP1Gauge = await ethers.getContractAt("contracts/SpiritV2/StableGaugeProxy.sol:Gauge", LP1GaugeAddr);
    LP1Bribe = await ethers.getContractAt("Bribe", LP1BribeAddr);
    let LP2GaugeAddr = await gaugeProxy.getGauge(LP2.address);
    let LP2BribeAddr = await gaugeProxy.getBribes(LP2GaugeAddr);
    LP2Gauge = await ethers.getContractAt("contracts/SpiritV2/StableGaugeProxy.sol:Gauge", LP2GaugeAddr);
    LP2Bribe = await ethers.getContractAt("Bribe", LP2BribeAddr);
    let LP3GaugeAddr = await gaugeProxy.getGauge(LP3.address);
    let LP3BribeAddr = await gaugeProxy.getBribes(LP3GaugeAddr);
    LP3Gauge = await ethers.getContractAt("contracts/SpiritV2/StableGaugeProxy.sol:Gauge", LP3GaugeAddr);
    LP3Bribe = await ethers.getContractAt("Bribe", LP3BribeAddr);

    // Owner locks in 1000 SPIRIT for inSPIRIT
    await spirit.approve(inSpirit.address, oneThousand);
    await inSpirit.create_lock(oneThousand, April2026);

    // Transfer 1000 SPIRIT to users
    await spirit.transfer(user1.address, oneThousand); // transfer SPIRIT to user1
    await spirit.transfer(user2.address, oneThousand); // transfer SPIRIT to user2
    await spirit.transfer(user3.address, oneThousand); // transfer SPIRIT to user3

    // Mint LP tokens to users
    await LP1.connect(owner).transfer(user1.address, oneThousand);
    await LP1.connect(owner).transfer(user2.address, oneThousand);
    await LP1.connect(owner).transfer(user3.address, oneThousand);
    await LP2.connect(owner).transfer(user1.address, oneThousand);
    await LP2.connect(owner).transfer(user2.address, oneThousand);
    await LP2.connect(owner).transfer(user3.address, oneThousand);
    await LP3.connect(owner).transfer(user1.address, oneThousand);
    await LP3.connect(owner).transfer(user2.address, oneThousand);
    await LP3.connect(owner).transfer(user3.address, oneThousand);   

    console.log("Initialization Complete");
    console.log("******************************************************");
});

it('User1 lock SPIRIT for inSPIRIT', async function () {
    console.log("******************************************************");
    console.log("User1 locks in 1000 SPIRIT for inSPIRIT");
    await spirit.connect(user1).approve(inSpirit.address, oneThousand);
    await inSpirit.connect(user1).create_lock(oneThousand, April2026);
    let user1InSpirit = await inSpirit['balanceOf(address)'](user1.address);
    expect(user1InSpirit).to.be.above(0);
    console.log("User1 inSPIRIT Balance", divDec(user1InSpirit));
    console.log("User1 has inSPIRIT");
});

it('User1 votes in GaugeProxy', async function () {
    console.log("******************************************************");
    let user1LP1Votes = await gaugeProxy.votes(user1.address, LP1.address);
    let user1LP2Votes = await gaugeProxy.votes(user1.address, LP2.address);
    let user1LP3Votes = await gaugeProxy.votes(user1.address, LP3.address);

    expect(user1LP1Votes.toString()).to.be.equal('0');
    expect(user1LP2Votes.toString()).to.be.equal('0');
    expect(user1LP3Votes.toString()).to.be.equal('0');
    
    console.log("User1 votes with 100 on LP1, 100 on LP2, 100 on LP3");
    await gaugeProxy.connect(user1).vote([LP1.address, LP2.address, LP3.address], [oneHundred, oneHundred, oneHundred]);

    user1TotalVote = oneHundred.add(oneHundred).add(oneHundred);
    user1TotalPower = await inSpirit['balanceOf(address)'](user1.address);
    user1LP1VoteWeight = user1TotalPower.mul(oneHundred).div(user1TotalVote);
    user1LP2VoteWeight = user1TotalPower.mul(oneHundred).div(user1TotalVote);
    user1LP3VoteWeight = user1TotalPower.mul(oneHundred).div(user1TotalVote);

    user1LP1Votes = await gaugeProxy.votes(user1.address, LP1.address);
    user1LP2Votes = await gaugeProxy.votes(user1.address, LP2.address);
    user1LP3Votes = await gaugeProxy.votes(user1.address, LP3.address);

    expect(user1LP1Votes.toString()).to.be.equal(user1LP1VoteWeight);
    expect(user1LP2Votes.toString()).to.be.equal(user1LP2VoteWeight);
    expect(user1LP3Votes.toString()).to.be.equal(user1LP3VoteWeight);

    let user1LP1BribeBal = await LP1Bribe.balanceOf(user1.address);
    let user1LP2BribeBal = await LP2Bribe.balanceOf(user1.address);
    let user1LP3BribeBal = await LP3Bribe.balanceOf(user1.address);

    expect(user1LP1BribeBal).to.be.equal(user1LP1VoteWeight);
    expect(user1LP2BribeBal).to.be.equal(user1LP2VoteWeight);
    expect(user1LP3BribeBal).to.be.equal(user1LP3VoteWeight);

    console.log("User1 voting data");
    console.log("LP1Gauge Vote", divDec(user1LP1Votes));
    console.log("LP2Gauge Vote", divDec(user1LP2Votes));
    console.log("LP3Gauge Vote", divDec(user1LP3Votes));

    console.log("LP1Bribe Balance", divDec(user1LP1BribeBal));
    console.log("LP2Bribe Balance", divDec(user1LP2BribeBal));
    console.log("LP3Bribe Balance", divDec(user1LP3BribeBal));

    console.log("User1 has voted and vote balance is reflected in Bribe contracts");
});

it('GaugeProxy vote status', async function () {
    console.log("******************************************************");
    let user1LP1Votes = await gaugeProxy.votes(user1.address, LP1.address);
    let user1LP2Votes = await gaugeProxy.votes(user1.address, LP2.address);
    let user1LP3Votes = await gaugeProxy.votes(user1.address, LP3.address);

    let votesLP1 = await gaugeProxy.weights(LP1.address);
    let votesLP2 = await gaugeProxy.weights(LP2.address);
    let votesLP3 = await gaugeProxy.weights(LP3.address);

    expect(user1LP1Votes.toString()).to.be.equal(votesLP1);
    expect(user1LP2Votes.toString()).to.be.equal(votesLP2);
    expect(user1LP3Votes.toString()).to.be.equal(votesLP3);

    console.log("Gauge Proxy Status")
    console.log("LP1 vote weight", divDec(votesLP1));
    console.log("LP2 vote weight", divDec(votesLP2));
    console.log("LP3 vote weight", divDec(votesLP3));
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
    const endBlock = await ethers.provider.getBlockNumber();

    console.log("Farm start block", farmStartBlockNum);
    console.log("End block", endBlock);

    let pendingSpiritGPCalc = (endBlock - farmStartBlockNum) * spiritPerBlock;

    let pendingSPIRITGP = await masterChef.pendingSpirit(0, gaugeProxy.address);
    console.log("Pending SPIRIT to be claimed by Gauge Proxy", divDec(pendingSPIRITGP));
    console.log("Pending SPIRIT calcd to be claimed by Gauge Proxy", divDec(pendingSpiritGPCalc));
    expect(pendingSPIRITGP.toString()).to.be.equal(pendingSpiritGPCalc.toString());
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

it('User1 calls preDistribute', async function () {
    console.log("******************************************************");
    console.log("PRE-DISTRIBUTE IS CALLED");
    console.log("******************************************************");
    await gaugeProxy.preDistribute()
    let lockedTotalVote = await gaugeProxy.lockedTotalWeight();

    let LP1LockedVote = await gaugeProxy.lockedWeights(LP1.address);
    let LP2LockedVote = await gaugeProxy.lockedWeights(LP2.address);
    let LP3LockedVote = await gaugeProxy.lockedWeights(LP3.address);

    let user1LP1Votes = await gaugeProxy.votes(user1.address, LP1.address);
    let user1LP2Votes = await gaugeProxy.votes(user1.address, LP2.address);
    let user1LP3Votes = await gaugeProxy.votes(user1.address, LP3.address);

    expect(LP1LockedVote).to.be.equal(user1LP1Votes);
    expect(LP2LockedVote).to.be.equal(user1LP2Votes);
    expect(LP3LockedVote).to.be.equal(user1LP3Votes);

    let votesLP1 = await gaugeProxy.weights(LP1.address);
    let votesLP2 = await gaugeProxy.weights(LP2.address);
    let votesLP3 = await gaugeProxy.weights(LP3.address);

    expect(LP1LockedVote).to.be.equal(votesLP1);
    expect(LP2LockedVote).to.be.equal(votesLP2);
    expect(LP3LockedVote).to.be.equal(votesLP3);

    console.log("Gauge Proxy Status")
    console.log("SPIRIT in gaugeProxy", divDec(await spirit.balanceOf(gaugeProxy.address)));
    console.log("LP1 locked vote", divDec(LP1LockedVote));
    console.log("LP2 locked vote", divDec(LP2LockedVote));
    console.log("LP3 locked vote", divDec(LP3LockedVote));


    let feeDistSpirit = await spirit.balanceOf(feeDistributor.address);
    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("Fee Distributor SPIRIT balance", divDec(feeDistSpirit));
    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));

    expect(feeDistSpirit).to.be.equal(0);
    expect(LP1GaugeSpirit).to.be.equal(0);
    expect(LP2GaugeSpirit).to.be.equal(0);
    expect(LP3GaugeSpirit).to.be.equal(0);
});

it('User1 calls distribute to gauges', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(user1).distribute(0,3);

    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('Forward time by 1 week and claim rewards', async function () {
    console.log("******************************************************");

    // Forward time by 2 day
    await network.provider.send('evm_increaseTime', [7*24*3600]); 
    await network.provider.send('evm_mine');

    let user1LP1Earn = await LP1Gauge.earned(user1.address);
    let user1LP2Earn = await LP2Gauge.earned(user1.address);
    let user1LP3Earn = await LP3Gauge.earned(user1.address);

    console.log("SPIRIT earned from LP1Gauge", divDec(user1LP1Earn));
    console.log("SPIRIT earned from LP2Gauge", divDec(user1LP2Earn));
    console.log("SPIRIT earned from LP3Gauge", divDec(user1LP3Earn));

    await LP1Gauge.connect(user1).getReward();
    await LP2Gauge.connect(user1).getReward();
    await LP3Gauge.connect(user1).getReward();

    let user1Spirit = await spirit.balanceOf(user1.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    console.log("user1 SPIRIT balance", divDec(user1Spirit));
    console.log("LP1 SPIRIT balance", divDec(spiritLP1));
    console.log("LP2 SPIRIT balance", divDec(spiritLP2));
    console.log("LP3 SPIRIT balance", divDec(spiritLP3));

    await spirit.connect(user1).transfer(owner.address, user1Spirit);
    user1Spirit = await spirit.balanceOf(user1.address);
    console.log("User1 transfers earned SPIRIT to owner");
    console.log("user1 SPIRIT balance", divDec(user1Spirit));
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
    const endBlock = await ethers.provider.getBlockNumber();

    let pendingSPIRITGP = await masterChef.pendingSpirit(0, gaugeProxy.address);
    console.log("Pending SPIRIT to be claimed by Gauge Proxy", divDec(pendingSPIRITGP));
    expect(pendingSPIRITGP).to.be.above(0);
});

it('User1 calls preDistribute', async function () {
    console.log("******************************************************");
    console.log("PRE-DISTRIBUTE IS CALLED");
    console.log("******************************************************");
    await gaugeProxy.preDistribute()
    let lockedTotalVote = await gaugeProxy.lockedTotalWeight();

    let LP1LockedVote = await gaugeProxy.lockedWeights(LP1.address);
    let LP2LockedVote = await gaugeProxy.lockedWeights(LP2.address);
    let LP3LockedVote = await gaugeProxy.lockedWeights(LP3.address);

    console.log("Gauge Proxy Status")
    console.log("SPIRIT in gaugeProxy", divDec(await spirit.balanceOf(gaugeProxy.address)));
    console.log("LP1 locked vote", divDec(LP1LockedVote));
    console.log("LP2 locked vote", divDec(LP2LockedVote));
    console.log("LP3 locked vote", divDec(LP3LockedVote));

    let feeDistSpirit = await spirit.balanceOf(feeDistributor.address);
    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("Fee Distributor SPIRIT balance", divDec(feeDistSpirit));
    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('User1 tries to call preDistribute again', async function () {
    console.log("******************************************************");
    await expect(gaugeProxy.connect(user1).preDistribute()).to.be.revertedWith("this has been distributed in the last 7 days");
    console.log("User1 was unable to call preDistribute again")
});

it('User2 tries to call preDistribute again', async function () {
    console.log("******************************************************");
    await expect(gaugeProxy.connect(user2).preDistribute()).to.be.revertedWith("this has been distributed in the last 7 days");
    console.log("User2 was unable to call preDistribute again");
});

it('User1 calls distribute to LP1 gauge', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(user1).distribute(0,1);

    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('Forward time by 3 days', async function () {
    console.log("******************************************************");

    // Forward time by 2 day
    await network.provider.send('evm_increaseTime', [3*24*3600]); 
    await network.provider.send('evm_mine');

    let user1LP1Earn = await LP1Gauge.earned(user1.address);
    let user1LP2Earn = await LP2Gauge.earned(user1.address);
    let user1LP3Earn = await LP3Gauge.earned(user1.address);

    console.log("SPIRIT earned from LP1Gauge", divDec(user1LP1Earn));
    console.log("SPIRIT earned from LP2Gauge", divDec(user1LP2Earn));
    console.log("SPIRIT earned from LP3Gauge", divDec(user1LP3Earn));

    let user1Spirit = await spirit.balanceOf(user1.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    console.log("user1 SPIRIT balance", divDec(user1Spirit));
    console.log("LP1 SPIRIT balance", divDec(spiritLP1));
    console.log("LP2 SPIRIT balance", divDec(spiritLP2));
    console.log("LP3 SPIRIT balance", divDec(spiritLP3));

});

it('Forward time by 3 days', async function () {
    console.log("******************************************************");

    // Forward time by 2 day
    await network.provider.send('evm_increaseTime', [3*24*3600]); 
    await network.provider.send('evm_mine');

    let user1LP1Earn = await LP1Gauge.earned(user1.address);
    let user1LP2Earn = await LP2Gauge.earned(user1.address);
    let user1LP3Earn = await LP3Gauge.earned(user1.address);

    console.log("SPIRIT earned from LP1Gauge", divDec(user1LP1Earn));
    console.log("SPIRIT earned from LP2Gauge", divDec(user1LP2Earn));
    console.log("SPIRIT earned from LP3Gauge", divDec(user1LP3Earn));

    let user1Spirit = await spirit.balanceOf(user1.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    console.log("user1 SPIRIT balance", divDec(user1Spirit));
    console.log("LP1 SPIRIT balance", divDec(spiritLP1));
    console.log("LP2 SPIRIT balance", divDec(spiritLP2));
    console.log("LP3 SPIRIT balance", divDec(spiritLP3));

});

it('User1 calls distribute to LP1 and LP2 gauge', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(user1).distribute(0,2);

    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('Forward time by 3 days', async function () {
    console.log("******************************************************");

    // Forward time by 2 day
    await network.provider.send('evm_increaseTime', [3*24*3600]); 
    await network.provider.send('evm_mine');

    let user1LP1Earn = await LP1Gauge.earned(user1.address);
    let user1LP2Earn = await LP2Gauge.earned(user1.address);
    let user1LP3Earn = await LP3Gauge.earned(user1.address);

    console.log("SPIRIT earned from LP1Gauge", divDec(user1LP1Earn));
    console.log("SPIRIT earned from LP2Gauge", divDec(user1LP2Earn));
    console.log("SPIRIT earned from LP3Gauge", divDec(user1LP3Earn));

    let user1Spirit = await spirit.balanceOf(user1.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    console.log("user1 SPIRIT balance", divDec(user1Spirit));
    console.log("LP1 SPIRIT balance", divDec(spiritLP1));
    console.log("LP2 SPIRIT balance", divDec(spiritLP2));
    console.log("LP3 SPIRIT balance", divDec(spiritLP3));

});

it('User1 calls preDistribute', async function () {
    console.log("******************************************************");
    console.log("PRE-DISTRIBUTE IS CALLED");
    console.log("******************************************************");
    await gaugeProxy.preDistribute()
    let lockedTotalVote = await gaugeProxy.lockedTotalWeight();

    let LP1LockedVote = await gaugeProxy.lockedWeights(LP1.address);
    let LP2LockedVote = await gaugeProxy.lockedWeights(LP2.address);
    let LP3LockedVote = await gaugeProxy.lockedWeights(LP3.address);

    console.log("Gauge Proxy Status")
    console.log("SPIRIT in gaugeProxy", divDec(await spirit.balanceOf(gaugeProxy.address)));
    console.log("LP1 locked vote", divDec(LP1LockedVote));
    console.log("LP2 locked vote", divDec(LP2LockedVote));
    console.log("LP3 locked vote", divDec(LP3LockedVote));

    let feeDistSpirit = await spirit.balanceOf(feeDistributor.address);
    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("Fee Distributor SPIRIT balance", divDec(feeDistSpirit));
    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('User1 calls distribute to LP1, LP2, LP3 gauge', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(user1).distribute(0,3);

    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('Forward time by 8 days and claim rewards', async function () {
    console.log("******************************************************");

    // Forward time by 2 day
    await network.provider.send('evm_increaseTime', [8*24*3600]); 
    await network.provider.send('evm_mine');

    let user1LP1Earn = await LP1Gauge.earned(user1.address);
    let user1LP2Earn = await LP2Gauge.earned(user1.address);
    let user1LP3Earn = await LP3Gauge.earned(user1.address);

    console.log("SPIRIT earned from LP1Gauge", divDec(user1LP1Earn));
    console.log("SPIRIT earned from LP2Gauge", divDec(user1LP2Earn));
    console.log("SPIRIT earned from LP3Gauge", divDec(user1LP3Earn));

    await LP1Gauge.connect(user1).getReward();
    await LP2Gauge.connect(user1).getReward();
    await LP3Gauge.connect(user1).getReward();

    let user1Spirit = await spirit.balanceOf(user1.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    console.log("user1 SPIRIT balance", divDec(user1Spirit));
    console.log("LP1 SPIRIT balance", divDec(spiritLP1));
    console.log("LP2 SPIRIT balance", divDec(spiritLP2));
    console.log("LP3 SPIRIT balance", divDec(spiritLP3));

    await spirit.connect(user1).transfer(owner.address, user1Spirit);
    user1Spirit = await spirit.balanceOf(user1.address);
    console.log("User1 transfers earned SPIRIT to owner");
    console.log("user1 SPIRIT balance", divDec(user1Spirit));
});

it('User2 calls preDistribute', async function () {
    console.log("******************************************************");
    console.log("PRE-DISTRIBUTE IS CALLED");
    console.log("******************************************************");
    await gaugeProxy.connect(user2).preDistribute()
    let lockedTotalVote = await gaugeProxy.lockedTotalWeight();

    let LP1LockedVote = await gaugeProxy.lockedWeights(LP1.address);
    let LP2LockedVote = await gaugeProxy.lockedWeights(LP2.address);
    let LP3LockedVote = await gaugeProxy.lockedWeights(LP3.address);

    console.log("Gauge Proxy Status")
    console.log("SPIRIT in gaugeProxy", divDec(await spirit.balanceOf(gaugeProxy.address)));
    console.log("LP1 locked vote", divDec(LP1LockedVote));
    console.log("LP2 locked vote", divDec(LP2LockedVote));
    console.log("LP3 locked vote", divDec(LP3LockedVote));

    let feeDistSpirit = await spirit.balanceOf(feeDistributor.address);
    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("Fee Distributor SPIRIT balance", divDec(feeDistSpirit));
    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('User1 calls distribute to LP3 gauge', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(user1).distribute(2,3);

    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('Forward time by 8 days', async function () {
    console.log("******************************************************");

    // Forward time by 2 day
    await network.provider.send('evm_increaseTime', [8*24*3600]); 
    await network.provider.send('evm_mine');

    let user1LP1Earn = await LP1Gauge.earned(user1.address);
    let user1LP2Earn = await LP2Gauge.earned(user1.address);
    let user1LP3Earn = await LP3Gauge.earned(user1.address);

    console.log("SPIRIT earned from LP1Gauge", divDec(user1LP1Earn));
    console.log("SPIRIT earned from LP2Gauge", divDec(user1LP2Earn));
    console.log("SPIRIT earned from LP3Gauge", divDec(user1LP3Earn));

    let user1Spirit = await spirit.balanceOf(user1.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    console.log("user1 SPIRIT balance", divDec(user1Spirit));
    console.log("LP1 SPIRIT balance", divDec(spiritLP1));
    console.log("LP2 SPIRIT balance", divDec(spiritLP2));
    console.log("LP3 SPIRIT balance", divDec(spiritLP3));

});

it('User1 calls distribute to LP1. LP2 gauge', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(user1).distribute(0,2);

    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('User2 calls preDistribute', async function () {
    console.log("******************************************************");
    console.log("PRE-DISTRIBUTE IS CALLED");
    console.log("******************************************************");
    await gaugeProxy.connect(user2).preDistribute()
    let lockedTotalVote = await gaugeProxy.lockedTotalWeight();

    let LP1LockedVote = await gaugeProxy.lockedWeights(LP1.address);
    let LP2LockedVote = await gaugeProxy.lockedWeights(LP2.address);
    let LP3LockedVote = await gaugeProxy.lockedWeights(LP3.address);

    console.log("Gauge Proxy Status")
    console.log("SPIRIT in gaugeProxy", divDec(await spirit.balanceOf(gaugeProxy.address)));
    console.log("LP1 locked vote", divDec(LP1LockedVote));
    console.log("LP2 locked vote", divDec(LP2LockedVote));
    console.log("LP3 locked vote", divDec(LP3LockedVote));

    let feeDistSpirit = await spirit.balanceOf(feeDistributor.address);
    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("Fee Distributor SPIRIT balance", divDec(feeDistSpirit));
    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('User1 calls distribute to gauges', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(user1).distribute(0,3);

    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('Forward time by 8 days and claim rewards', async function () {
    console.log("******************************************************");

    // Forward time by 2 day
    await network.provider.send('evm_increaseTime', [8*24*3600]); 
    await network.provider.send('evm_mine');

    let user1LP1Earn = await LP1Gauge.earned(user1.address);
    let user1LP2Earn = await LP2Gauge.earned(user1.address);
    let user1LP3Earn = await LP3Gauge.earned(user1.address);

    console.log("SPIRIT earned from LP1Gauge", divDec(user1LP1Earn));
    console.log("SPIRIT earned from LP2Gauge", divDec(user1LP2Earn));
    console.log("SPIRIT earned from LP3Gauge", divDec(user1LP3Earn));

    await LP1Gauge.connect(user1).getReward();
    await LP2Gauge.connect(user1).getReward();
    await LP3Gauge.connect(user1).getReward();

    let user1Spirit = await spirit.balanceOf(user1.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    console.log("user1 SPIRIT balance", divDec(user1Spirit));
    console.log("LP1 SPIRIT balance", divDec(spiritLP1));
    console.log("LP2 SPIRIT balance", divDec(spiritLP2));
    console.log("LP3 SPIRIT balance", divDec(spiritLP3));

    await spirit.connect(user1).transfer(owner.address, user1Spirit);
    user1Spirit = await spirit.balanceOf(user1.address);
    console.log("User1 transfers earned SPIRIT to owner");
    console.log("user1 SPIRIT balance", divDec(user1Spirit));
});

it('Turn ve33 on, SPIRIT should now be getting sent to fee distributor', async function () {
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
    const endBlock = await ethers.provider.getBlockNumber();

    let pendingSPIRITGP = await masterChef.pendingSpirit(0, gaugeProxy.address);
    console.log("Pending SPIRIT to be claimed by Gauge Proxy", divDec(pendingSPIRITGP));
});

it('User1 calls preDistribute', async function () {
    console.log("******************************************************");
    console.log("PRE-DISTRIBUTE IS CALLED WITH VE33 LIVE");
    console.log("******************************************************");

    let spiritLockedIn = await spirit.balanceOf(inSpirit.address);
    let spiritTotalSupply = await spirit.totalSupply();
    let spiritEarned = await masterChef.pendingSpirit(0, gaugeProxy.address);

    let spiritToVeCalc = spiritEarned.mul(spiritLockedIn).div(spiritTotalSupply);

    console.log("SPIRIT locked in inSPIRIT", divDec(spiritLockedIn));
    console.log("SPIRIT total supply", divDec(spiritTotalSupply));
    console.log("SPIRIT to be distributed", divDec(spiritEarned));

    await gaugeProxy.preDistribute()

    let lockedTotalVote = await gaugeProxy.connect(user1).lockedTotalWeight();

    let LP1LockedVote = await gaugeProxy.lockedWeights(LP1.address);
    let LP2LockedVote = await gaugeProxy.lockedWeights(LP2.address);
    let LP3LockedVote = await gaugeProxy.lockedWeights(LP3.address);

    let user1LP1Votes = await gaugeProxy.votes(user1.address, LP1.address);
    let user1LP2Votes = await gaugeProxy.votes(user1.address, LP2.address);
    let user1LP3Votes = await gaugeProxy.votes(user1.address, LP3.address);

    expect(LP1LockedVote).to.be.equal(user1LP1Votes);
    expect(LP2LockedVote).to.be.equal(user1LP2Votes);
    expect(LP3LockedVote).to.be.equal(user1LP3Votes);

    let votesLP1 = await gaugeProxy.weights(LP1.address);
    let votesLP2 = await gaugeProxy.weights(LP2.address);
    let votesLP3 = await gaugeProxy.weights(LP3.address);

    expect(LP1LockedVote).to.be.equal(votesLP1);
    expect(LP2LockedVote).to.be.equal(votesLP2);
    expect(LP3LockedVote).to.be.equal(votesLP3);

    console.log("Gauge Proxy Status")
    console.log("SPIRIT in gaugeProxy", divDec(await spirit.balanceOf(gaugeProxy.address)));
    console.log("LP1 locked vote", divDec(LP1LockedVote));
    console.log("LP2 locked vote", divDec(LP2LockedVote));
    console.log("LP3 locked vote", divDec(LP3LockedVote));

    let feeDistSpirit = await spirit.balanceOf(feeDistributor.address);
    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("Fee Distributor SPIRIT balance", divDec(feeDistSpirit));
    console.log("Fee Disitrbutor SPIRIT calc", divDec(spiritToVeCalc));
    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));

    expect(feeDistSpirit).to.be.above(0);
});

it('User1 calls distribute to gauges', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(user1).distribute(0,3);

    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('User2 tries to call preDistribute again', async function () {
    console.log("******************************************************");
    await expect(gaugeProxy.connect(user2).preDistribute()).to.be.revertedWith("this has been distributed in the last 7 days");
    console.log("User2 was unable to call preDistribute again");
});

it('Forward time by 8 days and claim rewards', async function () {
    console.log("******************************************************");

    // Forward time by 8 day
    await network.provider.send('evm_increaseTime', [8*24*3600]); 
    await network.provider.send('evm_mine');

    let user1LP1Earn = await LP1Gauge.earned(user1.address);
    let user1LP2Earn = await LP2Gauge.earned(user1.address);
    let user1LP3Earn = await LP3Gauge.earned(user1.address);

    console.log("SPIRIT earned from LP1Gauge", divDec(user1LP1Earn));
    console.log("SPIRIT earned from LP2Gauge", divDec(user1LP2Earn));
    console.log("SPIRIT earned from LP3Gauge", divDec(user1LP3Earn));

    await LP1Gauge.connect(user1).getReward();
    await LP2Gauge.connect(user1).getReward();
    await LP3Gauge.connect(user1).getReward();

    let user1Spirit = await spirit.balanceOf(user1.address);
    let feeDistSpirit = await spirit.balanceOf(feeDistributor.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    console.log("user1 SPIRIT balance", divDec(user1Spirit));
    console.log("FeeDist SPIRIT balance", divDec(feeDistSpirit));
    console.log("LP1 SPIRIT balance", divDec(spiritLP1));
    console.log("LP2 SPIRIT balance", divDec(spiritLP2));
    console.log("LP3 SPIRIT balance", divDec(spiritLP3));

    await spirit.connect(user1).transfer(owner.address, user1Spirit);
    user1Spirit = await spirit.balanceOf(user1.address);
    console.log("User1 transfers earned SPIRIT to owner");
    console.log("user1 SPIRIT balance", divDec(user1Spirit));
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
    const endBlock = await ethers.provider.getBlockNumber();

    let pendingSPIRITGP = await masterChef.pendingSpirit(0, gaugeProxy.address);
    console.log("Pending SPIRIT to be claimed by Gauge Proxy", divDec(pendingSPIRITGP));
});

it('Owner increases locked SPIRIT for inSPIRIT', async function () {
    console.log("******************************************************");
    console.log("Owner locks in 1000 SPIRIT for inSPIRIT");
   
    await spirit.connect(owner).approve(inSpirit.address, oneThousand);
    await inSpirit.connect(owner).increase_amount(oneThousand);
    await spirit.connect(owner).approve(inSpirit.address, oneThousand);
    await inSpirit.connect(owner).increase_amount(oneThousand);
    await spirit.connect(owner).approve(inSpirit.address, oneThousand);
    await inSpirit.connect(owner).increase_amount(oneThousand);
    await spirit.connect(owner).approve(inSpirit.address, oneThousand);
    await inSpirit.connect(owner).increase_amount(oneThousand);
    
    let ownerInSpirit = await inSpirit['balanceOf(address)'](owner.address);
    expect(ownerInSpirit).to.be.above(0);
    console.log("Owner inSPIRIT Balance", divDec(ownerInSpirit));
    console.log("Owner has inSPIRIT");
});

it('User1 calls preDistribute', async function () {
    console.log("******************************************************");
    console.log("PRE-DISTRIBUTE IS CALLED WITH VE33 LIVE");
    console.log("******************************************************");

    let feeDistSpirit = await spirit.balanceOf(feeDistributor.address);
    let spiritLockedIn = await spirit.balanceOf(inSpirit.address);
    let spiritTotalSupply = await spirit.totalSupply();
    let spiritEarned = await masterChef.pendingSpirit(0, gaugeProxy.address);

    let spiritToVeCalc = (spiritEarned.mul(spiritLockedIn).div(spiritTotalSupply)).add(feeDistSpirit);

    console.log("SPIRIT locked in inSPIRIT", divDec(spiritLockedIn));
    console.log("SPIRIT total supply", divDec(spiritTotalSupply));
    console.log("SPIRIT to be distributed", divDec(spiritEarned));

    await gaugeProxy.preDistribute()

    let lockedTotalVote = await gaugeProxy.connect(user1).lockedTotalWeight();

    let LP1LockedVote = await gaugeProxy.lockedWeights(LP1.address);
    let LP2LockedVote = await gaugeProxy.lockedWeights(LP2.address);
    let LP3LockedVote = await gaugeProxy.lockedWeights(LP3.address);

    let user1LP1Votes = await gaugeProxy.votes(user1.address, LP1.address);
    let user1LP2Votes = await gaugeProxy.votes(user1.address, LP2.address);
    let user1LP3Votes = await gaugeProxy.votes(user1.address, LP3.address);

    expect(LP1LockedVote).to.be.equal(user1LP1Votes);
    expect(LP2LockedVote).to.be.equal(user1LP2Votes);
    expect(LP3LockedVote).to.be.equal(user1LP3Votes);

    let votesLP1 = await gaugeProxy.weights(LP1.address);
    let votesLP2 = await gaugeProxy.weights(LP2.address);
    let votesLP3 = await gaugeProxy.weights(LP3.address);

    expect(LP1LockedVote).to.be.equal(votesLP1);
    expect(LP2LockedVote).to.be.equal(votesLP2);
    expect(LP3LockedVote).to.be.equal(votesLP3);

    console.log("Gauge Proxy Status")
    console.log("SPIRIT in gaugeProxy", divDec(await spirit.balanceOf(gaugeProxy.address)));
    console.log("LP1 locked vote", divDec(LP1LockedVote));
    console.log("LP2 locked vote", divDec(LP2LockedVote));
    console.log("LP3 locked vote", divDec(LP3LockedVote));

    feeDistSpirit = await spirit.balanceOf(feeDistributor.address);
    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("Fee Distributor SPIRIT balance", divDec(feeDistSpirit));
    console.log("Fee Disitrbutor SPIRIT calc", divDec(spiritToVeCalc));
    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));

    expect(feeDistSpirit).to.be.above(0);
});

it('User1 calls distribute to LP1 gauge', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(user1).distribute(0,1);

    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('User1 calls distribute to LP3 gauge after 2 days', async function () {
    console.log("******************************************************");


    // Forward time by 2 day
    await network.provider.send('evm_increaseTime', [2*24*3600]); 
    await network.provider.send('evm_mine');

    await gaugeProxy.connect(user1).distribute(2,3);

    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('User1 calls distribute to Gauges after 2 days', async function () {
    console.log("******************************************************");


    // Forward time by 2 day
    await network.provider.send('evm_increaseTime', [2*24*3600]); 
    await network.provider.send('evm_mine');

    await gaugeProxy.connect(user1).distribute(0,3);

    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('Forward time by 4 days and check status', async function () {
    console.log("******************************************************");

    // Forward time by 4 days
    await network.provider.send('evm_increaseTime', [4*24*3600]); 
    await network.provider.send('evm_mine');

    let user1LP1Earn = await LP1Gauge.earned(user1.address);
    let user1LP2Earn = await LP2Gauge.earned(user1.address);
    let user1LP3Earn = await LP3Gauge.earned(user1.address);

    console.log("SPIRIT earned from LP1Gauge", divDec(user1LP1Earn));
    console.log("SPIRIT earned from LP2Gauge", divDec(user1LP2Earn));
    console.log("SPIRIT earned from LP3Gauge", divDec(user1LP3Earn));

    let user1Spirit = await spirit.balanceOf(user1.address);
    let feeDistSpirit = await spirit.balanceOf(feeDistributor.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    console.log("user1 SPIRIT balance", divDec(user1Spirit));
    console.log("FeeDist SPIRIT balance", divDec(feeDistSpirit));
    console.log("LP1 SPIRIT balance", divDec(spiritLP1));
    console.log("LP2 SPIRIT balance", divDec(spiritLP2));
    console.log("LP3 SPIRIT balance", divDec(spiritLP3));

    await spirit.connect(user1).transfer(owner.address, user1Spirit);
    user1Spirit = await spirit.balanceOf(user1.address);
    console.log("User1 transfers earned SPIRIT to owner");
    console.log("user1 SPIRIT balance", divDec(user1Spirit));
});

it('Forward time by 4 days and check status', async function () {
    console.log("******************************************************");

    // Forward time by 4 days
    await network.provider.send('evm_increaseTime', [4*24*3600]); 
    await network.provider.send('evm_mine');

    let user1LP1Earn = await LP1Gauge.earned(user1.address);
    let user1LP2Earn = await LP2Gauge.earned(user1.address);
    let user1LP3Earn = await LP3Gauge.earned(user1.address);

    console.log("SPIRIT earned from LP1Gauge", divDec(user1LP1Earn));
    console.log("SPIRIT earned from LP2Gauge", divDec(user1LP2Earn));
    console.log("SPIRIT earned from LP3Gauge", divDec(user1LP3Earn));

    let user1Spirit = await spirit.balanceOf(user1.address);
    let feeDistSpirit = await spirit.balanceOf(feeDistributor.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    console.log("user1 SPIRIT balance", divDec(user1Spirit));
    console.log("FeeDist SPIRIT balance", divDec(feeDistSpirit));
    console.log("LP1 SPIRIT balance", divDec(spiritLP1));
    console.log("LP2 SPIRIT balance", divDec(spiritLP2));
    console.log("LP3 SPIRIT balance", divDec(spiritLP3));

    await spirit.connect(user1).transfer(owner.address, user1Spirit);
    user1Spirit = await spirit.balanceOf(user1.address);
    console.log("User1 transfers earned SPIRIT to owner");
    console.log("user1 SPIRIT balance", divDec(user1Spirit));
});

it('User1 claims LP rewards', async function () {
    console.log("******************************************************");

    let user1LP1Earn = await LP1Gauge.earned(user1.address);
    let user1LP2Earn = await LP2Gauge.earned(user1.address);
    let user1LP3Earn = await LP3Gauge.earned(user1.address);

    console.log("SPIRIT earned from LP1Gauge", divDec(user1LP1Earn));
    console.log("SPIRIT earned from LP2Gauge", divDec(user1LP2Earn));
    console.log("SPIRIT earned from LP3Gauge", divDec(user1LP3Earn));

    await LP1Gauge.connect(user1).getReward();
    await LP2Gauge.connect(user1).getReward();
    await LP3Gauge.connect(user1).getReward();

    let user1Spirit = await spirit.balanceOf(user1.address);
    let feeDistSpirit = await spirit.balanceOf(feeDistributor.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    console.log("user1 SPIRIT balance", divDec(user1Spirit));
    console.log("FeeDist SPIRIT balance", divDec(feeDistSpirit));
    console.log("LP1 SPIRIT balance", divDec(spiritLP1));
    console.log("LP2 SPIRIT balance", divDec(spiritLP2));
    console.log("LP3 SPIRIT balance", divDec(spiritLP3));

    await spirit.connect(user1).transfer(owner.address, user1Spirit);
    user1Spirit = await spirit.balanceOf(user1.address);
    console.log("User1 transfers earned SPIRIT to owner");
    console.log("user1 SPIRIT balance", divDec(user1Spirit));
});

it('Update Fee Distributor address', async function () {
    console.log("******************************************************");
    console.log("UPDATE FEE DIST ADDRESS");
    console.log("******************************************************");

    gaugeProxy.connect(owner).updateFeeDistributor(feeDist2.address);
    expect(await gaugeProxy.feeDistAddr()).to.be.equal(feeDist2.address);
    expect(await spirit.balanceOf(feeDist2.address)).to.be.equal(0);

    console.log("feeDist2 SPIRIT balance", divDec(await spirit.balanceOf(feeDist2.address)));
    console.log("fee distributor address in gauge proxy has been updated");
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
    const endBlock = await ethers.provider.getBlockNumber();

    let pendingSPIRITGP = await masterChef.pendingSpirit(0, gaugeProxy.address);
    console.log("Pending SPIRIT to be claimed by Gauge Proxy", divDec(pendingSPIRITGP));
});

it('User1 calls preDistribute', async function () {
    console.log("******************************************************");
    console.log("PRE-DISTRIBUTE IS CALLED WITH VE33 LIVE");
    console.log("******************************************************");

    let spiritLockedIn = await spirit.balanceOf(inSpirit.address);
    let spiritTotalSupply = await spirit.totalSupply();
    let spiritEarned = await masterChef.pendingSpirit(0, gaugeProxy.address);

    let spiritToVeCalc = spiritEarned.mul(spiritLockedIn).div(spiritTotalSupply);

    console.log("SPIRIT locked in inSPIRIT", divDec(spiritLockedIn));
    console.log("SPIRIT total supply", divDec(spiritTotalSupply));
    console.log("SPIRIT to be distributed", divDec(spiritEarned));

    await gaugeProxy.preDistribute()

    let lockedTotalVote = await gaugeProxy.connect(user1).lockedTotalWeight();

    let LP1LockedVote = await gaugeProxy.lockedWeights(LP1.address);
    let LP2LockedVote = await gaugeProxy.lockedWeights(LP2.address);
    let LP3LockedVote = await gaugeProxy.lockedWeights(LP3.address);

    let user1LP1Votes = await gaugeProxy.votes(user1.address, LP1.address);
    let user1LP2Votes = await gaugeProxy.votes(user1.address, LP2.address);
    let user1LP3Votes = await gaugeProxy.votes(user1.address, LP3.address);

    expect(LP1LockedVote).to.be.equal(user1LP1Votes);
    expect(LP2LockedVote).to.be.equal(user1LP2Votes);
    expect(LP3LockedVote).to.be.equal(user1LP3Votes);

    let votesLP1 = await gaugeProxy.weights(LP1.address);
    let votesLP2 = await gaugeProxy.weights(LP2.address);
    let votesLP3 = await gaugeProxy.weights(LP3.address);

    expect(LP1LockedVote).to.be.equal(votesLP1);
    expect(LP2LockedVote).to.be.equal(votesLP2);
    expect(LP3LockedVote).to.be.equal(votesLP3);

    console.log("Gauge Proxy Status")
    console.log("SPIRIT in gaugeProxy", divDec(await spirit.balanceOf(gaugeProxy.address)));
    console.log("LP1 locked vote", divDec(LP1LockedVote));
    console.log("LP2 locked vote", divDec(LP2LockedVote));
    console.log("LP3 locked vote", divDec(LP3LockedVote));

    let feeDist2Spirit = await spirit.balanceOf(feeDist2.address);
    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("Fee Distributor SPIRIT balance", divDec(feeDist2Spirit));
    console.log("Fee Disitrbutor SPIRIT calc", divDec(spiritToVeCalc));
    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));

    expect(feeDist2Spirit).to.be.above(0);
});

it('User1 calls distribute to gauges', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(user1).distribute(0,3);

    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('User2 tries to call preDistribute again', async function () {
    console.log("******************************************************");
    await expect(gaugeProxy.connect(user2).preDistribute()).to.be.revertedWith("this has been distributed in the last 7 days");
    console.log("User2 was unable to call preDistribute again");
});

it('Forward time by 8 days and claim rewards', async function () {
    console.log("******************************************************");

    // Forward time by 8 day
    await network.provider.send('evm_increaseTime', [8*24*3600]); 
    await network.provider.send('evm_mine');

    let user1LP1Earn = await LP1Gauge.earned(user1.address);
    let user1LP2Earn = await LP2Gauge.earned(user1.address);
    let user1LP3Earn = await LP3Gauge.earned(user1.address);

    console.log("SPIRIT earned from LP1Gauge", divDec(user1LP1Earn));
    console.log("SPIRIT earned from LP2Gauge", divDec(user1LP2Earn));
    console.log("SPIRIT earned from LP3Gauge", divDec(user1LP3Earn));

    await LP1Gauge.connect(user1).getReward();
    await LP2Gauge.connect(user1).getReward();
    await LP3Gauge.connect(user1).getReward();

    let user1Spirit = await spirit.balanceOf(user1.address);
    let feeDist2Spirit = await spirit.balanceOf(feeDist2.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    console.log("user1 SPIRIT balance", divDec(user1Spirit));
    console.log("FeeDist SPIRIT balance", divDec(feeDist2Spirit));
    console.log("LP1 SPIRIT balance", divDec(spiritLP1));
    console.log("LP2 SPIRIT balance", divDec(spiritLP2));
    console.log("LP3 SPIRIT balance", divDec(spiritLP3));

    await spirit.connect(user1).transfer(owner.address, user1Spirit);
    user1Spirit = await spirit.balanceOf(user1.address);
    console.log("User1 transfers earned SPIRIT to owner");
    console.log("user1 SPIRIT balance", divDec(user1Spirit));

    await spirit.connect(feeDist2).transfer(owner.address, feeDist2Spirit);
    feeDist2Spirit = await spirit.balanceOf(feeDist2.address);
    console.log("feeDist2 transfers earned SPIRIT to owner");
    console.log("feeDist2 SPIRIT balance", divDec(feeDist2Spirit));
});

it('Deprecate LP3 Gauge', async function () {
    console.log("******************************************************");
    console.log("DEPRECATE LP3 GAUGE");
    console.log("******************************************************");

    expect(await gaugeProxy.gaugeStatus(LP3.address)).to.be.equal(true);
    let votesLP3 = await gaugeProxy.weights(LP3.address);
    expect(votesLP3).to.be.above(0);

    gaugeProxy.connect(owner).deprecateGauge(LP3.address);

    expect(await gaugeProxy.gaugeStatus(LP3.address)).to.be.equal(false);
    votesLP3 = await gaugeProxy.weights(LP3.address);
    //expect(votesLP3).to.be.equal(0);

    console.log("LP3 Gauge has been deprecated");
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
    const endBlock = await ethers.provider.getBlockNumber();

    let pendingSPIRITGP = await masterChef.pendingSpirit(0, gaugeProxy.address);
    console.log("Pending SPIRIT to be claimed by Gauge Proxy", divDec(pendingSPIRITGP));
});

it('User1 calls preDistribute', async function () {
    console.log("******************************************************");
    console.log("PRE-DISTRIBUTE IS CALLED WITH VE33 LIVE");
    console.log("******************************************************");

    let spiritLockedIn = await spirit.balanceOf(inSpirit.address);
    let spiritTotalSupply = await spirit.totalSupply();
    let spiritEarned = await masterChef.pendingSpirit(0, gaugeProxy.address);

    let spiritToVeCalc = spiritEarned.mul(spiritLockedIn).div(spiritTotalSupply);

    console.log("SPIRIT locked in inSPIRIT", divDec(spiritLockedIn));
    console.log("SPIRIT total supply", divDec(spiritTotalSupply));
    console.log("SPIRIT to be distributed", divDec(spiritEarned));

    await gaugeProxy.preDistribute()

    let lockedTotalVote = await gaugeProxy.connect(user1).lockedTotalWeight();

    let LP1LockedVote = await gaugeProxy.lockedWeights(LP1.address);
    let LP2LockedVote = await gaugeProxy.lockedWeights(LP2.address);
    let LP3LockedVote = await gaugeProxy.lockedWeights(LP3.address);

    expect(LP1LockedVote).to.be.above(0);
    expect(LP2LockedVote).to.be.above(0);
    expect(LP3LockedVote).to.be.above(0);

    let votesLP1 = await gaugeProxy.weights(LP1.address);
    let votesLP2 = await gaugeProxy.weights(LP2.address);
    let votesLP3 = await gaugeProxy.weights(LP3.address);

    expect(LP1LockedVote).to.be.equal(votesLP1);
    expect(LP2LockedVote).to.be.equal(votesLP2);
    expect(LP3LockedVote).to.be.equal(votesLP3);

    console.log("Gauge Proxy Status")
    console.log("SPIRIT in gaugeProxy", divDec(await spirit.balanceOf(gaugeProxy.address)));
    console.log("LP1 locked vote", divDec(LP1LockedVote));
    console.log("LP2 locked vote", divDec(LP2LockedVote));
    console.log("LP3 locked vote", divDec(LP3LockedVote));

    let feeDist2Spirit = await spirit.balanceOf(feeDist2.address);
    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("Fee Distributor SPIRIT balance", divDec(feeDist2Spirit));
    console.log("Fee Disitrbutor SPIRIT calc", divDec(spiritToVeCalc));
    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));

    expect(feeDist2Spirit).to.be.above(0);
});

it('User1 calls distribute to gauges', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(user1).distribute(0,3);

    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('User2 tries to call preDistribute again', async function () {
    console.log("******************************************************");
    await expect(gaugeProxy.connect(user2).preDistribute()).to.be.revertedWith("this has been distributed in the last 7 days");
    console.log("User2 was unable to call preDistribute again");
});

it('Forward time by 8 days and claim rewards', async function () {
    console.log("******************************************************");

    // Forward time by 8 day
    await network.provider.send('evm_increaseTime', [8*24*3600]); 
    await network.provider.send('evm_mine');

    let user1LP1Earn = await LP1Gauge.earned(user1.address);
    let user1LP2Earn = await LP2Gauge.earned(user1.address);
    let user1LP3Earn = await LP3Gauge.earned(user1.address);

    console.log("SPIRIT earned from LP1Gauge", divDec(user1LP1Earn));
    console.log("SPIRIT earned from LP2Gauge", divDec(user1LP2Earn));
    console.log("SPIRIT earned from LP3Gauge", divDec(user1LP3Earn));

    await LP1Gauge.connect(user1).getReward();
    await LP2Gauge.connect(user1).getReward();
    await LP3Gauge.connect(user1).getReward();

    let user1Spirit = await spirit.balanceOf(user1.address);
    let feeDist2Spirit = await spirit.balanceOf(feeDist2.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    console.log("user1 SPIRIT balance", divDec(user1Spirit));
    console.log("FeeDist SPIRIT balance", divDec(feeDist2Spirit));
    console.log("LP1 SPIRIT balance", divDec(spiritLP1));
    console.log("LP2 SPIRIT balance", divDec(spiritLP2));
    console.log("LP3 SPIRIT balance", divDec(spiritLP3));

    await spirit.connect(user1).transfer(owner.address, user1Spirit);
    user1Spirit = await spirit.balanceOf(user1.address);
    console.log("User1 transfers earned SPIRIT to owner");
    console.log("user1 SPIRIT balance", divDec(user1Spirit));

    await spirit.connect(feeDist2).transfer(owner.address, feeDist2Spirit);
    feeDist2Spirit = await spirit.balanceOf(feeDist2.address);
    console.log("feeDist2 transfers earned SPIRIT to owner");
    console.log("feeDist2 SPIRIT balance", divDec(feeDist2Spirit));
});

it('User1 votes in GaugeProxy', async function () {
    console.log("******************************************************");
    let user1LP1Votes = await gaugeProxy.votes(user1.address, LP1.address);
    let user1LP2Votes = await gaugeProxy.votes(user1.address, LP2.address);
    let user1LP3Votes = await gaugeProxy.votes(user1.address, LP3.address);

    expect(user1LP1Votes).to.be.above('0');
    expect(user1LP2Votes).to.be.above('0');
    expect(user1LP3Votes).to.be.above('0');
    
    console.log("User1 votes with 100 on LP1, 100 on LP2");
    await gaugeProxy.connect(user1).vote([LP1.address, LP2.address], [oneHundred, oneHundred]);

    user1TotalVote = oneHundred.add(oneHundred);
    user1TotalPower = await inSpirit['balanceOf(address)'](user1.address);
    user1LP1VoteWeight = user1TotalPower.mul(oneHundred).div(user1TotalVote);
    user1LP2VoteWeight = user1TotalPower.mul(oneHundred).div(user1TotalVote);

    user1LP1Votes = await gaugeProxy.votes(user1.address, LP1.address);
    user1LP2Votes = await gaugeProxy.votes(user1.address, LP2.address);
    user1LP3Votes = await gaugeProxy.votes(user1.address, LP3.address);

    expect(user1LP1Votes.toString()).to.be.equal(user1LP1VoteWeight);
    expect(user1LP2Votes.toString()).to.be.equal(user1LP2VoteWeight);
    expect(user1LP3Votes).to.be.equal(0);

    let user1LP1BribeBal = await LP1Bribe.balanceOf(user1.address);
    let user1LP2BribeBal = await LP2Bribe.balanceOf(user1.address);
    let user1LP3BribeBal = await LP3Bribe.balanceOf(user1.address);

    expect(user1LP1BribeBal).to.be.equal(user1LP1VoteWeight);
    expect(user1LP2BribeBal).to.be.equal(user1LP2VoteWeight);
    expect(user1LP3BribeBal).to.be.equal(0);

    console.log("User1 voting data");
    console.log("LP1Gauge Vote", divDec(user1LP1Votes));
    console.log("LP2Gauge Vote", divDec(user1LP2Votes));
    console.log("LP3Gauge Vote", divDec(user1LP3Votes));

    console.log("LP1Bribe Balance", divDec(user1LP1BribeBal));
    console.log("LP2Bribe Balance", divDec(user1LP2BribeBal));
    console.log("LP3Bribe Balance", divDec(user1LP3BribeBal));

    console.log("User1 has voted and vote balance is reflected in Bribe contracts");
});

it('GaugeProxy vote status', async function () {
    console.log("******************************************************");
    let user1LP1Votes = await gaugeProxy.votes(user1.address, LP1.address);
    let user1LP2Votes = await gaugeProxy.votes(user1.address, LP2.address);
    let user1LP3Votes = await gaugeProxy.votes(user1.address, LP3.address);

    let votesLP1 = await gaugeProxy.weights(LP1.address);
    let votesLP2 = await gaugeProxy.weights(LP2.address);
    let votesLP3 = await gaugeProxy.weights(LP3.address);

    expect(user1LP1Votes.toString()).to.be.equal(votesLP1);
    expect(user1LP2Votes.toString()).to.be.equal(votesLP2);
    expect(user1LP3Votes.toString()).to.be.equal(votesLP3);

    console.log("Gauge Proxy Status")
    console.log("LP1 vote weight", divDec(votesLP1));
    console.log("LP2 vote weight", divDec(votesLP2));
    console.log("LP3 vote weight", divDec(votesLP3));
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
});

it('User1 calls preDistribute', async function () {
    console.log("******************************************************");
    console.log("PRE-DISTRIBUTE IS CALLED WITH VE33 LIVE");
    console.log("******************************************************");

    let spiritLockedIn = await spirit.balanceOf(inSpirit.address);
    let spiritTotalSupply = await spirit.totalSupply();
    let spiritEarned = await masterChef.pendingSpirit(0, gaugeProxy.address);

    let spiritToVeCalc = spiritEarned.mul(spiritLockedIn).div(spiritTotalSupply);

    console.log("SPIRIT locked in inSPIRIT", divDec(spiritLockedIn));
    console.log("SPIRIT total supply", divDec(spiritTotalSupply));
    console.log("SPIRIT to be distributed", divDec(spiritEarned));

    await gaugeProxy.preDistribute()

    let lockedTotalVote = await gaugeProxy.connect(user1).lockedTotalWeight();

    let LP1LockedVote = await gaugeProxy.lockedWeights(LP1.address);
    let LP2LockedVote = await gaugeProxy.lockedWeights(LP2.address);
    let LP3LockedVote = await gaugeProxy.lockedWeights(LP3.address);

    expect(LP1LockedVote).to.be.above(0);
    expect(LP2LockedVote).to.be.above(0);
    expect(LP3LockedVote).to.be.equal(0);

    let votesLP1 = await gaugeProxy.weights(LP1.address);
    let votesLP2 = await gaugeProxy.weights(LP2.address);
    let votesLP3 = await gaugeProxy.weights(LP3.address);

    expect(LP1LockedVote).to.be.equal(votesLP1);
    expect(LP2LockedVote).to.be.equal(votesLP2);
    expect(LP3LockedVote).to.be.equal(votesLP3);

    console.log("Gauge Proxy Status")
    console.log("SPIRIT in gaugeProxy", divDec(await spirit.balanceOf(gaugeProxy.address)));
    console.log("LP1 locked vote", divDec(LP1LockedVote));
    console.log("LP2 locked vote", divDec(LP2LockedVote));
    console.log("LP3 locked vote", divDec(LP3LockedVote));

    let feeDist2Spirit = await spirit.balanceOf(feeDist2.address);
    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("Fee Distributor SPIRIT balance", divDec(feeDist2Spirit));
    console.log("Fee Disitrbutor SPIRIT calc", divDec(spiritToVeCalc));
    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));

    expect(feeDist2Spirit).to.be.above(0);
});

it('User1 calls distribute to gauges', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(user1).distribute(0,3);

    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('Forward time by 8 days and claim rewards', async function () {
    console.log("******************************************************");

    // Forward time by 8 day
    await network.provider.send('evm_increaseTime', [8*24*3600]); 
    await network.provider.send('evm_mine');

    let user1LP1Earn = await LP1Gauge.earned(user1.address);
    let user1LP2Earn = await LP2Gauge.earned(user1.address);
    let user1LP3Earn = await LP3Gauge.earned(user1.address);

    console.log("SPIRIT earned from LP1Gauge", divDec(user1LP1Earn));
    console.log("SPIRIT earned from LP2Gauge", divDec(user1LP2Earn));
    console.log("SPIRIT earned from LP3Gauge", divDec(user1LP3Earn));

    await LP1Gauge.connect(user1).getReward();
    await LP2Gauge.connect(user1).getReward();
    await LP3Gauge.connect(user1).getReward();

    let user1Spirit = await spirit.balanceOf(user1.address);
    let feeDist2Spirit = await spirit.balanceOf(feeDist2.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    console.log("user1 SPIRIT balance", divDec(user1Spirit));
    console.log("FeeDist SPIRIT balance", divDec(feeDist2Spirit));
    console.log("LP1 SPIRIT balance", divDec(spiritLP1));
    console.log("LP2 SPIRIT balance", divDec(spiritLP2));
    console.log("LP3 SPIRIT balance", divDec(spiritLP3));

    await spirit.connect(user1).transfer(owner.address, user1Spirit);
    user1Spirit = await spirit.balanceOf(user1.address);
    console.log("User1 transfers earned SPIRIT to owner");
    console.log("user1 SPIRIT balance", divDec(user1Spirit));

    await spirit.connect(feeDist2).transfer(owner.address, feeDist2Spirit);
    feeDist2Spirit = await spirit.balanceOf(feeDist2.address);
    console.log("feeDist2 transfers earned SPIRIT to owner");
    console.log("feeDist2 SPIRIT balance", divDec(feeDist2Spirit));
});

it('Resurrect LP3 Gauge', async function () {
    console.log("******************************************************");
    console.log("RESURRECT LP3 GAUGE");
    console.log("******************************************************");

    expect(await gaugeProxy.gaugeStatus(LP3.address)).to.be.equal(false);
    let votesLP3 = await gaugeProxy.weights(LP3.address);
    expect(votesLP3).to.be.equal(0);

    gaugeProxy.connect(owner).resurrectGauge(LP3.address);

    expect(await gaugeProxy.gaugeStatus(LP3.address)).to.be.equal(true);
    votesLP3 = await gaugeProxy.weights(LP3.address);
    expect(votesLP3).to.be.equal(0);

    console.log("LP3 Gauge has been resurrected");
});

it('User1 calls preDistribute', async function () {
    console.log("******************************************************");
    console.log("PRE-DISTRIBUTE IS CALLED WITH VE33 LIVE");
    console.log("******************************************************");

    let spiritLockedIn = await spirit.balanceOf(inSpirit.address);
    let spiritTotalSupply = await spirit.totalSupply();
    let spiritEarned = await masterChef.pendingSpirit(0, gaugeProxy.address);

    let spiritToVeCalc = spiritEarned.mul(spiritLockedIn).div(spiritTotalSupply);

    console.log("SPIRIT locked in inSPIRIT", divDec(spiritLockedIn));
    console.log("SPIRIT total supply", divDec(spiritTotalSupply));
    console.log("SPIRIT to be distributed", divDec(spiritEarned));

    await gaugeProxy.preDistribute()

    let lockedTotalVote = await gaugeProxy.connect(user1).lockedTotalWeight();

    let LP1LockedVote = await gaugeProxy.lockedWeights(LP1.address);
    let LP2LockedVote = await gaugeProxy.lockedWeights(LP2.address);
    let LP3LockedVote = await gaugeProxy.lockedWeights(LP3.address);

    expect(LP1LockedVote).to.be.above(0);
    expect(LP2LockedVote).to.be.above(0);
    expect(LP3LockedVote).to.be.equal(0);

    let votesLP1 = await gaugeProxy.weights(LP1.address);
    let votesLP2 = await gaugeProxy.weights(LP2.address);
    let votesLP3 = await gaugeProxy.weights(LP3.address);

    expect(LP1LockedVote).to.be.equal(votesLP1);
    expect(LP2LockedVote).to.be.equal(votesLP2);
    expect(LP3LockedVote).to.be.equal(votesLP3);

    console.log("Gauge Proxy Status")
    console.log("SPIRIT in gaugeProxy", divDec(await spirit.balanceOf(gaugeProxy.address)));
    console.log("LP1 locked vote", divDec(LP1LockedVote));
    console.log("LP2 locked vote", divDec(LP2LockedVote));
    console.log("LP3 locked vote", divDec(LP3LockedVote));

    let feeDist2Spirit = await spirit.balanceOf(feeDist2.address);
    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("Fee Distributor SPIRIT balance", divDec(feeDist2Spirit));
    console.log("Fee Disitrbutor SPIRIT calc", divDec(spiritToVeCalc));
    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));

    expect(feeDist2Spirit).to.be.above(0);
});

it('User1 calls distribute to gauges', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(user1).distribute(0,3);

    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('Forward time by 8 days and claim rewards', async function () {
    console.log("******************************************************");

    // Forward time by 8 day
    await network.provider.send('evm_increaseTime', [8*24*3600]); 
    await network.provider.send('evm_mine');

    let user1LP1Earn = await LP1Gauge.earned(user1.address);
    let user1LP2Earn = await LP2Gauge.earned(user1.address);
    let user1LP3Earn = await LP3Gauge.earned(user1.address);

    console.log("SPIRIT earned from LP1Gauge", divDec(user1LP1Earn));
    console.log("SPIRIT earned from LP2Gauge", divDec(user1LP2Earn));
    console.log("SPIRIT earned from LP3Gauge", divDec(user1LP3Earn));

    await LP1Gauge.connect(user1).getReward();
    await LP2Gauge.connect(user1).getReward();
    await LP3Gauge.connect(user1).getReward();

    let user1Spirit = await spirit.balanceOf(user1.address);
    let feeDist2Spirit = await spirit.balanceOf(feeDist2.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    console.log("user1 SPIRIT balance", divDec(user1Spirit));
    console.log("FeeDist SPIRIT balance", divDec(feeDist2Spirit));
    console.log("LP1 SPIRIT balance", divDec(spiritLP1));
    console.log("LP2 SPIRIT balance", divDec(spiritLP2));
    console.log("LP3 SPIRIT balance", divDec(spiritLP3));

    await spirit.connect(user1).transfer(owner.address, user1Spirit);
    user1Spirit = await spirit.balanceOf(user1.address);
    console.log("User1 transfers earned SPIRIT to owner");
    console.log("user1 SPIRIT balance", divDec(user1Spirit));

    await spirit.connect(feeDist2).transfer(owner.address, feeDist2Spirit);
    feeDist2Spirit = await spirit.balanceOf(feeDist2.address);
    console.log("feeDist2 transfers earned SPIRIT to owner");
    console.log("feeDist2 SPIRIT balance", divDec(feeDist2Spirit));
});

it('User1 votes in GaugeProxy', async function () {
    console.log("******************************************************");
    let user1LP1Votes = await gaugeProxy.votes(user1.address, LP1.address);
    let user1LP2Votes = await gaugeProxy.votes(user1.address, LP2.address);
    let user1LP3Votes = await gaugeProxy.votes(user1.address, LP3.address);

    expect(user1LP1Votes).to.be.above('0');
    expect(user1LP2Votes).to.be.above('0');
    expect(user1LP3Votes).to.be.equal('0');
    
    console.log("User1 votes with 100 on LP1, 100 on LP2, 100 on LP3");
    await gaugeProxy.connect(user1).vote([LP1.address, LP2.address, LP3.address], [oneHundred, oneHundred, oneHundred]);

    user1TotalVote = oneHundred.add(oneHundred).add(oneHundred);
    user1TotalPower = await inSpirit['balanceOf(address)'](user1.address);
    user1LP1VoteWeight = user1TotalPower.mul(oneHundred).div(user1TotalVote);
    user1LP2VoteWeight = user1TotalPower.mul(oneHundred).div(user1TotalVote);
    user1LP3VoteWeight = user1TotalPower.mul(oneHundred).div(user1TotalVote);

    user1LP1Votes = await gaugeProxy.votes(user1.address, LP1.address);
    user1LP2Votes = await gaugeProxy.votes(user1.address, LP2.address);
    user1LP3Votes = await gaugeProxy.votes(user1.address, LP3.address);

    expect(user1LP1Votes.toString()).to.be.equal(user1LP1VoteWeight);
    expect(user1LP2Votes.toString()).to.be.equal(user1LP2VoteWeight);
    expect(user1LP3Votes.toString()).to.be.equal(user1LP3VoteWeight);

    let user1LP1BribeBal = await LP1Bribe.balanceOf(user1.address);
    let user1LP2BribeBal = await LP2Bribe.balanceOf(user1.address);
    let user1LP3BribeBal = await LP3Bribe.balanceOf(user1.address);

    expect(user1LP1BribeBal).to.be.equal(user1LP1VoteWeight);
    expect(user1LP2BribeBal).to.be.equal(user1LP2VoteWeight);
    expect(user1LP3BribeBal).to.be.equal(user1LP3VoteWeight);

    console.log("User1 voting data");
    console.log("LP1Gauge Vote", divDec(user1LP1Votes));
    console.log("LP2Gauge Vote", divDec(user1LP2Votes));
    console.log("LP3Gauge Vote", divDec(user1LP3Votes));

    console.log("LP1Bribe Balance", divDec(user1LP1BribeBal));
    console.log("LP2Bribe Balance", divDec(user1LP2BribeBal));
    console.log("LP3Bribe Balance", divDec(user1LP3BribeBal));

    console.log("User1 has voted and vote balance is reflected in Bribe contracts");
});

it('GaugeProxy vote status', async function () {
    console.log("******************************************************");
    let user1LP1Votes = await gaugeProxy.votes(user1.address, LP1.address);
    let user1LP2Votes = await gaugeProxy.votes(user1.address, LP2.address);
    let user1LP3Votes = await gaugeProxy.votes(user1.address, LP3.address);

    let votesLP1 = await gaugeProxy.weights(LP1.address);
    let votesLP2 = await gaugeProxy.weights(LP2.address);
    let votesLP3 = await gaugeProxy.weights(LP3.address);

    expect(user1LP1Votes.toString()).to.be.equal(votesLP1);
    expect(user1LP2Votes.toString()).to.be.equal(votesLP2);
    expect(user1LP3Votes.toString()).to.be.equal(votesLP3);

    console.log("Gauge Proxy Status")
    console.log("LP1 vote weight", divDec(votesLP1));
    console.log("LP2 vote weight", divDec(votesLP2));
    console.log("LP3 vote weight", divDec(votesLP3));
});

it('User1 calls preDistribute', async function () {
    console.log("******************************************************");
    console.log("PRE-DISTRIBUTE IS CALLED WITH VE33 LIVE");
    console.log("******************************************************");

    let spiritLockedIn = await spirit.balanceOf(inSpirit.address);
    let spiritTotalSupply = await spirit.totalSupply();
    let spiritEarned = await masterChef.pendingSpirit(0, gaugeProxy.address);

    let spiritToVeCalc = spiritEarned.mul(spiritLockedIn).div(spiritTotalSupply);

    console.log("SPIRIT locked in inSPIRIT", divDec(spiritLockedIn));
    console.log("SPIRIT total supply", divDec(spiritTotalSupply));
    console.log("SPIRIT to be distributed", divDec(spiritEarned));

    await gaugeProxy.preDistribute()

    let lockedTotalVote = await gaugeProxy.connect(user1).lockedTotalWeight();

    let LP1LockedVote = await gaugeProxy.lockedWeights(LP1.address);
    let LP2LockedVote = await gaugeProxy.lockedWeights(LP2.address);
    let LP3LockedVote = await gaugeProxy.lockedWeights(LP3.address);

    expect(LP1LockedVote).to.be.above(0);
    expect(LP2LockedVote).to.be.above(0);
    expect(LP3LockedVote).to.be.above(0);

    let votesLP1 = await gaugeProxy.weights(LP1.address);
    let votesLP2 = await gaugeProxy.weights(LP2.address);
    let votesLP3 = await gaugeProxy.weights(LP3.address);

    expect(LP1LockedVote).to.be.equal(votesLP1);
    expect(LP2LockedVote).to.be.equal(votesLP2);
    expect(LP3LockedVote).to.be.equal(votesLP3);

    console.log("Gauge Proxy Status")
    console.log("SPIRIT in gaugeProxy", divDec(await spirit.balanceOf(gaugeProxy.address)));
    console.log("LP1 locked vote", divDec(LP1LockedVote));
    console.log("LP2 locked vote", divDec(LP2LockedVote));
    console.log("LP3 locked vote", divDec(LP3LockedVote));

    let feeDist2Spirit = await spirit.balanceOf(feeDist2.address);
    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("Fee Distributor SPIRIT balance", divDec(feeDist2Spirit));
    console.log("Fee Disitrbutor SPIRIT calc", divDec(spiritToVeCalc));
    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));

    expect(feeDist2Spirit).to.be.above(0);
});

it('User1 calls distribute to gauges', async function () {
    console.log("******************************************************");

    await gaugeProxy.connect(user1).distribute(0,3);

    let LP1GaugeSpirit = await spirit.balanceOf(LP1Gauge.address);
    let LP2GaugeSpirit = await spirit.balanceOf(LP2Gauge.address);
    let LP3GaugeSpirit = await spirit.balanceOf(LP3Gauge.address);

    console.log("LP1Gauge SPIRIT balance", divDec(LP1GaugeSpirit));
    console.log("LP2Gauge SPIRIT balance", divDec(LP2GaugeSpirit));
    console.log("LP3Gauge SPIRIT balance", divDec(LP3GaugeSpirit));
});

it('Forward time by 8 days and claim rewards', async function () {
    console.log("******************************************************");

    // Forward time by 8 day
    await network.provider.send('evm_increaseTime', [8*24*3600]); 
    await network.provider.send('evm_mine');

    let user1LP1Earn = await LP1Gauge.earned(user1.address);
    let user1LP2Earn = await LP2Gauge.earned(user1.address);
    let user1LP3Earn = await LP3Gauge.earned(user1.address);

    console.log("SPIRIT earned from LP1Gauge", divDec(user1LP1Earn));
    console.log("SPIRIT earned from LP2Gauge", divDec(user1LP2Earn));
    console.log("SPIRIT earned from LP3Gauge", divDec(user1LP3Earn));

    await LP1Gauge.connect(user1).getReward();
    await LP2Gauge.connect(user1).getReward();
    await LP3Gauge.connect(user1).getReward();

    let user1Spirit = await spirit.balanceOf(user1.address);
    let feeDist2Spirit = await spirit.balanceOf(feeDist2.address);
    let spiritLP1 = await spirit.balanceOf(LP1Gauge.address);
    let spiritLP2 = await spirit.balanceOf(LP2Gauge.address);
    let spiritLP3 = await spirit.balanceOf(LP3Gauge.address);

    console.log("user1 SPIRIT balance", divDec(user1Spirit));
    console.log("FeeDist SPIRIT balance", divDec(feeDist2Spirit));
    console.log("LP1 SPIRIT balance", divDec(spiritLP1));
    console.log("LP2 SPIRIT balance", divDec(spiritLP2));
    console.log("LP3 SPIRIT balance", divDec(spiritLP3));

    await spirit.connect(user1).transfer(owner.address, user1Spirit);
    user1Spirit = await spirit.balanceOf(user1.address);
    console.log("User1 transfers earned SPIRIT to owner");
    console.log("user1 SPIRIT balance", divDec(user1Spirit));

    await spirit.connect(feeDist2).transfer(owner.address, feeDist2Spirit);
    feeDist2Spirit = await spirit.balanceOf(feeDist2.address);
    console.log("feeDist2 transfers earned SPIRIT to owner");
    console.log("feeDist2 SPIRIT balance", divDec(feeDist2Spirit));
});

it('Set new admin addr', async function () {
    await gaugeProxy.setAdmin(admin.address);
    expect(await gaugeProxy.admin()).to.be.equal(admin.address);
});

it('Update FeeDistributor address', async function () {
    await gaugeProxy.updateFeeDistributor(user3.address);
    expect(await gaugeProxy.feeDistAddr()).to.be.equal(user3.address);
    await expect(gaugeProxy.connect(admin).updateFeeDistributor(admin.address)).to.not.be.reverted;
});

it('Admin functions only, all tests to revert', async function () {
    await expect(gaugeProxy.connect(user1).setAdmin(admin.address)).to.be.reverted;
    await expect(gaugeProxy.connect(user1).setGovernance(admin.address)).to.be.reverted;
    await expect(gaugeProxy.connect(user1).updateFeeDistributor(admin.address)).to.be.reverted;
    await expect(gaugeProxy.connect(user1).toggleVE()).to.be.reverted;
    await expect(gaugeProxy.connect(user1).toggleVE()).to.be.reverted;
    await expect(gaugeProxy.connect(user1).acceptGovernance(admin.address)).to.be.reverted;
    await expect(gaugeProxy.resurrectGauge(LP1.address)).to.be.reverted;
    await expect(gaugeProxy.connect(user1).addGauge(LP3.address)).to.be.reverted;
    await expect(gaugeProxy.addGauge(LP3.address)).to.be.reverted;
    await expect(gaugeProxy.connect(user1).deprecateGauge(LP3.address)).to.be.reverted;
    await expect(gaugeProxy.connect(user1).resurrectGauge(LP3.address)).to.be.reverted;
    await expect(gaugeProxy.deprecateGauge(LP4.address)).to.be.reverted;
    await expect(gaugeProxy.resurrectGauge(LP4.address)).to.be.reverted;
    await expect(gaugeProxy.connect(user1).setPID(0)).to.be.reverted;
});

it('Set and accept governance changes', async function () {
    await gaugeProxy.setGovernance(admin.address);
    await gaugeProxy.connect(admin).acceptGovernance();
    expect(await gaugeProxy.governance()).to.be.equal(admin.address);
});

});