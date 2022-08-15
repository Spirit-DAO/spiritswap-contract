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
const { getParsedCommandLineOfConfigFile } = require("typescript");

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
let owner, admin, user1, user2, protocol1, protocol2, treasury;
// contracts
let pairFactory, router, bribeFactory, feeDistributor, masterchef, spiritMaker;
let vGaugeProxy, vLP1, vLP1Fees, vLP1Gauge, vLP1Bribe, vLP2, vLP2Fees, vLP2Gauge, vLP2Bribe;

// tokens
let SPIRIT, inSPIRIT, WETH, TK1, TK2, USDC, USD1, USD2;

describe("System testing", function () {
  
    before("Initial set up", async function () {
        console.log("Begin Initialization");

        // initialize users
        [owner, admin, user1, user2, protocol1, protocol2, spiritMaker, treasury] = await ethers.getSigners();

        // initialize tokens
        // mints 1000 tokens to deployer
        const erc20Mock = await ethers.getContractFactory("ERC20Mock");
        WETH = await erc20Mock.deploy("WETH", "WETH");
        TK1 = await erc20Mock.deploy("TK1", "TK1");
        TK2 = await erc20Mock.deploy("TK2", "TK2");
        USDC = await erc20Mock.deploy("USDC", "USDC");
        USD1 = await erc20Mock.deploy("USD1", "USD1");
        USD2 = await erc20Mock.deploy("USD2", "USD2");
        console.log("- Tokens Initialized");

        // initialize SPIRIT
        const spiritToken = await ethers.getContractFactory("contracts/SpiritV1/SpiritToken.sol:SpiritToken");
        SPIRIT = await spiritToken.deploy();
        console.log("- SPIRIT Initialized");

        // Initialize pairFactory
        const pairFactoryArtifact = await ethers.getContractFactory("BaseV1Factory");
        const pairFactoryContract = await pairFactoryArtifact.deploy();
        pairFactory = await ethers.getContractAt("BaseV1Factory", pairFactoryContract.address);
        console.log("- Pair Factory Initialized");

        // Initialize router
        const routerArtifact = await ethers.getContractFactory("BaseV1Router01");
        const routerContract = await routerArtifact.deploy(pairFactory.address, WETH.address);
        router = await ethers.getContractAt("BaseV1Router01", routerContract.address);
        console.log("- Router Initialized"); 

        // Set Spirit Maker of Factory
        await pairFactory.setSpiritMaker(spiritMaker.address);

        // Create vLP: WETH-TK1
        await WETH.connect(owner).approve(router.address, oneHundred);
        await TK1.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).addLiquidity(WETH.address, TK1.address, false, oneHundred, oneHundred, oneHundred, oneHundred, owner.address, 1685083888);

        const vLP1Address = await pairFactory.getPair(WETH.address, TK1.address, false);
        vLP1 = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Pair", vLP1Address)
        await pairFactory.connect(owner).setProtocolAddress(vLP1.address, protocol1.address);
        console.log("- vLP1 Initialized"); 

        const vLP1FeesAddress = await vLP1.fees();
        vLP1Fees = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Fees", vLP1FeesAddress)
        console.log("- vLP1Fees Initialized"); 

        // Create vLP: WETH-TK1
        await WETH.connect(owner).approve(router.address, oneHundred);
        await TK2.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).addLiquidity(WETH.address, TK2.address, false, oneHundred, oneHundred, oneHundred, oneHundred, owner.address, 1685083888);

        const vLP2Address = await pairFactory.getPair(WETH.address, TK2.address, false);
        vLP2 = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Pair", vLP2Address)
        await pairFactory.connect(owner).setProtocolAddress(vLP2.address, protocol2.address);
        console.log("- vLP2 Initialized"); 

        const vLP2FeesAddress = await vLP2.fees();
        vLP2Fees = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Fees", vLP2FeesAddress)
        console.log("- vLP2Fees Initialized"); 

        // initialize inSpirit
        const inSpiritArtifact = await ethers.getContractFactory("inSpirit");
        const inSpiritContract = await inSpiritArtifact.deploy(SPIRIT.address, "inSpirit Token", "inSpirit", "1.0.0");
        inSPIRIT = await ethers.getContractAt("inSpirit", inSpiritContract.address);
        console.log("- inSpirit Initialized");

        // initialize feeDistributor
        const feeDistributorArtifact = await ethers.getContractFactory("fee-distributor");
        const feeDistributorContract = await feeDistributorArtifact.deploy(inSPIRIT.address, startTime, SPIRIT.address, owner.address, owner.address);
        feeDistributor = await ethers.getContractAt("fee-distributor", feeDistributorContract.address);
        console.log("- FeeDistributor Initialized");

        // initialize masterChef
        const masterChefArtifact = await ethers.getContractFactory("SpiritMasterChef");
        const masterChefContract = await masterChefArtifact.deploy(
            SPIRIT.address,
            owner.address,
            owner.address,
            spiritPerBlock,
            startBlock);
        try {
            await SPIRIT.transferOwnership(masterChefContract.address);
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

        // initialize VariableGaugeProxy
        const variableGaugeProxyArtifact = await ethers.getContractFactory("VariableGaugeProxy");
        const variableGaugeProxyContract = await variableGaugeProxyArtifact.deploy(
            masterChef.address, 
            SPIRIT.address, 
            inSPIRIT.address, 
            feeDistributor.address, 
            bribeFactory.address, 
            pairFactory.address);
        vGaugeProxy = await ethers.getContractAt("VariableGaugeProxy", variableGaugeProxyContract.address);
        console.log("- VariableGaugeProxy Initialized");
        
        await vGaugeProxy.setBaseToken(WETH.address, true); // Make WETH base token
        await vGaugeProxy.setVerifiedToken(TK1.address, true); // Verify TK1
        await vGaugeProxy.setVerifiedToken(TK2.address, true); // Verify TK2

        // Add vLP1 Gauge/Bribe
        await vGaugeProxy.addGauge(vLP1.address);
        let vLP1GaugeAddress = await vGaugeProxy.getGauge(vLP1.address);
        let vLP1BribeAddress = await vGaugeProxy.getBribes(vLP1GaugeAddress);
        vLP1Gauge = await ethers.getContractAt("contracts/SpiritV2/VariableGaugeProxy.sol:Gauge", vLP1GaugeAddress);
        vLP1Bribe = await ethers.getContractAt("contracts/SpiritV2/Bribes.sol:Bribe", vLP1BribeAddress);
        console.log("- vLP1 Gauge/Bribe Initialized in vGaugeProxy");

        // Add vLP2 Gauge/Bribe
        await vGaugeProxy.addGauge(vLP2.address);
        let vLP2GaugeAddress = await vGaugeProxy.getGauge(vLP2.address);
        let vLP2BribeAddress = await vGaugeProxy.getBribes(vLP2GaugeAddress);
        vLP2Gauge = await ethers.getContractAt("contracts/SpiritV2/VariableGaugeProxy.sol:Gauge", vLP2GaugeAddress);
        vLP2Bribe = await ethers.getContractAt("contracts/SpiritV2/Bribes.sol:Bribe", vLP2BribeAddress);
        console.log("- vLP2 Gauge/Bribe Initialized in vGaugeProxy");

        // Create pool in masterChef for minSPIRIT and deposit minSPIRIT from gaugeProxy
        const vMinSpiritAddr = await vGaugeProxy.TOKEN();
        await masterChef.add(50, vMinSpiritAddr, 0, true);
        await vGaugeProxy.setPID(0);
        await vGaugeProxy.deposit();

        // Owner locks in 1000 SPIRIT for inSPIRIT
        await SPIRIT.approve(inSPIRIT.address, oneThousand);
        await inSPIRIT.create_lock(oneThousand, April2026);

        // Turn on ve33 tokenomics
        await vGaugeProxy.toggleVE();

        // Transfer 1000 SPIRIT to users
        await SPIRIT.transfer(user1.address, oneThousand); // transfer SPIRIT to user1
        await SPIRIT.transfer(user2.address, oneThousand); // transfer SPIRIT to user2

        // User1 locks in 1000 SPIRIT for inSPIRIT
        await SPIRIT.connect(user1).approve(inSPIRIT.address, oneThousand);
        await inSPIRIT.connect(user1).create_lock(oneThousand, April2026);
        
        console.log("Initialization Complete");
    });

    it('VARIABLE Gauge Proxy Status', async function () {
        console.log("******************************************************");
        console.log();

        // Variable Gauge Proxy Status
        let votesvLP1 = await vGaugeProxy.weights(vLP1.address);
        let votesvLP2 = await vGaugeProxy.weights(vLP2.address);
        let totalVotesV = await vGaugeProxy.totalWeight();
        let lockedVotesvLP1 = await vGaugeProxy.lockedWeights(vLP1.address);
        let lockedVotesvLP2 = await vGaugeProxy.lockedWeights(vLP2.address);
        let lockedTotalVotesV = await vGaugeProxy.lockedTotalWeight();
        let vGaugeProxySPIRIT = await SPIRIT.balanceOf(vGaugeProxy.address);

        console.log("VARIABLE Gauge Proxy Status");
        console.log("LP1 vote weight", divDec(votesvLP1));
        console.log("LP2 vote weight", divDec(votesvLP2));
        console.log("Total vote weight", divDec(totalVotesV));
        console.log("Locked LP1 vote weight", divDec(lockedVotesvLP1));
        console.log("Locked LP2 vote weight", divDec(lockedVotesvLP2));
        console.log("Locked Total vote weight", divDec(lockedTotalVotesV));
        console.log("SPIRIT", divDec(vGaugeProxySPIRIT));
        console.log();

        // vLP1 Gauge Status
        let totalBalancevLP1Gauge = await vLP1Gauge.totalSupply();
        let vLP1GaugeSPIRIT = await SPIRIT.balanceOf(vLP1Gauge.address);
        let ownervLP1Gauge = await vLP1Gauge.balanceOf(owner.address);

        console.log("vLP1 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalancevLP1Gauge));
        console.log("SPIRIT", divDec(vLP1GaugeSPIRIT));
        console.log("Owner LP Balance", divDec(ownervLP1Gauge));
        console.log();

        // vLP1 Bribe Status
        let totalVotesvLP1Bribe = await vLP1Bribe.totalSupply();
        let vLP1BribeWETH = await WETH.balanceOf(vLP1Bribe.address);
        let vLP1BribeTK1 = await TK1.balanceOf(vLP1Bribe.address);
        let user1vLP1BribeVotes = await vLP1Bribe.balanceOf(user1.address);
        let user2vLP1BribeVotes = await vLP1Bribe.balanceOf(user2.address);

        console.log("vLP1 Bribe Status")
        console.log("Total Vote Balance", divDec(totalVotesvLP1Bribe));
        console.log("WETH", divDec(vLP1BribeWETH));
        console.log("TK1", divDec(vLP1BribeTK1));
        console.log("User1 Vote Balance", divDec(user1vLP1BribeVotes));
        console.log("User2 Vote Balance", divDec(user2vLP1BribeVotes));
        console.log();

        // vLP2 Gauge Status
        let totalBalancevLP2Gauge = await vLP2Gauge.totalSupply();
        let vLP2GaugeSPIRIT = await SPIRIT.balanceOf(vLP2Gauge.address);
        let ownervLP2Gauge = await vLP2Gauge.balanceOf(owner.address);

        console.log("vLP2 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalancevLP2Gauge));
        console.log("SPIRIT", divDec(vLP2GaugeSPIRIT));
        console.log("Owner LP Balance", divDec(ownervLP2Gauge));
        console.log();

        // vLP2 Bribe Status
        let totalVotesvLP2Bribe = await vLP2Bribe.totalSupply();
        let vLP2BribeWETH = await WETH.balanceOf(vLP2Bribe.address);
        let vLP2BribeTK2 = await TK2.balanceOf(vLP2Bribe.address);
        let user1vLP2BribeVotes = await vLP2Bribe.balanceOf(user1.address);
        let user2vLP2BribeVotes = await vLP2Bribe.balanceOf(user2.address);

        console.log("vLP2 Bribe Status")
        console.log("Total Vote Balance", divDec(totalVotesvLP2Bribe));
        console.log("WETH", divDec(vLP2BribeWETH));
        console.log("TK2", divDec(vLP2BribeTK2));
        console.log("User1 Vote Balance", divDec(user1vLP2BribeVotes));
        console.log("User2 Vote Balance", divDec(user2vLP2BribeVotes));
        console.log();

    }); 

    it('Owner votes 100 on vLP1 and 100 on vLP2', async function () {

        await vGaugeProxy.connect(user1).vote([vLP1.address, vLP1.address], [oneHundred, oneHundred]);
        
    });

    it('VARIABLE Gauge Proxy Status', async function () {
        console.log("******************************************************");
        console.log();

        // Variable Gauge Proxy Status
        let votesvLP1 = await vGaugeProxy.weights(vLP1.address);
        let votesvLP2 = await vGaugeProxy.weights(vLP2.address);
        let totalVotesV = await vGaugeProxy.totalWeight();
        let lockedVotesvLP1 = await vGaugeProxy.lockedWeights(vLP1.address);
        let lockedVotesvLP2 = await vGaugeProxy.lockedWeights(vLP2.address);
        let lockedTotalVotesV = await vGaugeProxy.lockedTotalWeight();
        let vGaugeProxySPIRIT = await SPIRIT.balanceOf(vGaugeProxy.address);

        console.log("VARIABLE Gauge Proxy Status");
        console.log("LP1 vote weight", divDec(votesvLP1));
        console.log("LP2 vote weight", divDec(votesvLP2));
        console.log("Total vote weight", divDec(totalVotesV));
        console.log("Locked LP1 vote weight", divDec(lockedVotesvLP1));
        console.log("Locked LP2 vote weight", divDec(lockedVotesvLP2));
        console.log("Locked Total vote weight", divDec(lockedTotalVotesV));
        console.log("SPIRIT", divDec(vGaugeProxySPIRIT));
        console.log();

        // vLP1 Gauge Status
        let totalBalancevLP1Gauge = await vLP1Gauge.totalSupply();
        let vLP1GaugeSPIRIT = await SPIRIT.balanceOf(vLP1Gauge.address);
        let ownervLP1Gauge = await vLP1Gauge.balanceOf(owner.address);

        console.log("vLP1 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalancevLP1Gauge));
        console.log("SPIRIT", divDec(vLP1GaugeSPIRIT));
        console.log("Owner LP Balance", divDec(ownervLP1Gauge));
        console.log();

        // vLP1 Bribe Status
        let totalVotesvLP1Bribe = await vLP1Bribe.totalSupply();
        let vLP1BribeWETH = await WETH.balanceOf(vLP1Bribe.address);
        let vLP1BribeTK1 = await TK1.balanceOf(vLP1Bribe.address);
        let user1vLP1BribeVotes = await vLP1Bribe.balanceOf(user1.address);
        let user2vLP1BribeVotes = await vLP1Bribe.balanceOf(user2.address);

        console.log("vLP1 Bribe Status")
        console.log("Total Vote Balance", divDec(totalVotesvLP1Bribe));
        console.log("WETH", divDec(vLP1BribeWETH));
        console.log("TK1", divDec(vLP1BribeTK1));
        console.log("User1 Vote Balance", divDec(user1vLP1BribeVotes));
        console.log("User2 Vote Balance", divDec(user2vLP1BribeVotes));
        console.log();

        // vLP2 Gauge Status
        let totalBalancevLP2Gauge = await vLP2Gauge.totalSupply();
        let vLP2GaugeSPIRIT = await SPIRIT.balanceOf(vLP2Gauge.address);
        let ownervLP2Gauge = await vLP2Gauge.balanceOf(owner.address);

        console.log("vLP2 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalancevLP2Gauge));
        console.log("SPIRIT", divDec(vLP2GaugeSPIRIT));
        console.log("Owner LP Balance", divDec(ownervLP2Gauge));
        console.log();

        // vLP2 Bribe Status
        let totalVotesvLP2Bribe = await vLP2Bribe.totalSupply();
        let vLP2BribeWETH = await WETH.balanceOf(vLP2Bribe.address);
        let vLP2BribeTK2 = await TK2.balanceOf(vLP2Bribe.address);
        let user1vLP2BribeVotes = await vLP2Bribe.balanceOf(user1.address);
        let user2vLP2BribeVotes = await vLP2Bribe.balanceOf(user2.address);

        console.log("vLP2 Bribe Status")
        console.log("Total Vote Balance", divDec(totalVotesvLP2Bribe));
        console.log("WETH", divDec(vLP2BribeWETH));
        console.log("TK2", divDec(vLP2BribeTK2));
        console.log("User1 Vote Balance", divDec(user1vLP2BribeVotes));
        console.log("User2 Vote Balance", divDec(user2vLP2BribeVotes));
        console.log();

    }); 


})

