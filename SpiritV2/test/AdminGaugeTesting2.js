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
const { getParsedCommandLineOfConfigFile, factory } = require("typescript");

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
let owner, admin, user1, user2, protocol1, protocol2, protocol3, treasury;
// contracts
let pairFactory, router, bribeFactory, feeDistributor, masterchef, spiritMaker, spiritMaker2;
let aGaugeProxy, aLP1, aLP1Fees, aLP1Gauge, aLP2, aLP2Fees, aLP2Gauge, aLP3, aLP3Gauge, aLP4, aLP4Gauge;
// tokens
let SPIRIT, inSPIRIT, WETH, USDC;

describe("Admin Gauge testing 2", function () {
  
    before("Initial set up", async function () {
        console.log("Begin Initialization");

        // initialize users
        [owner, admin, user1, user2, protocol1, protocol2, protocol3, spiritMaker, spiritMaker2, treasury] = await ethers.getSigners();

        // initialize tokens
        // mints 1000 tokens to deployer
        const erc20Mock = await ethers.getContractFactory("ERC20Mock");
        WETH = await erc20Mock.deploy("WETH", "WETH");
        USDC = await erc20Mock.deploy("USDC", "USDC");
        aLP3 = await erc20Mock.deploy("LP3", "LP3");
        aLP4 = await erc20Mock.deploy("LP4", "LP4");

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

        // Create aLP1: WETH-SPIRIT
        await WETH.connect(owner).approve(router.address, oneHundred);
        await SPIRIT.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).addLiquidity(WETH.address, SPIRIT.address, false, oneHundred, oneHundred, oneHundred, oneHundred, owner.address, 1685083888);

        const aLP1Address = await pairFactory.getPair(WETH.address, SPIRIT.address, false);
        aLP1 = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Pair", aLP1Address);
        await pairFactory.connect(owner).setProtocolAddress(aLP1.address, protocol1.address);
        console.log("- aLP1 Initialized"); 

        const aLP1FeesAddress = await aLP1.fees();
        aLP1Fees = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Fees", aLP1FeesAddress);
        console.log("- aLP1Fees Initialized");

        // Create aLP2: WETH-USDC
        await WETH.connect(owner).approve(router.address, oneHundred);
        await USDC.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).addLiquidity(WETH.address, USDC.address, false, oneHundred, oneHundred, oneHundred, oneHundred, owner.address, 1685083888);

        const aLP2Address = await pairFactory.getPair(WETH.address, USDC.address, false);
        aLP2 = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Pair", aLP2Address);
        await pairFactory.connect(owner).setProtocolAddress(aLP2.address, protocol2.address);
        console.log("- aLP2 Initialized"); 

        const aLP2FeesAddress = await aLP2.fees();
        aLP2Fees = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Fees", aLP2FeesAddress);
        console.log("- aLP2Fees Initialized");

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

        // initialize AdminGaugeProxy
        const adminGaugeProxyArtifact = await ethers.getContractFactory("AdminGaugeProxy");
        const adminGaugeProxyContract = await adminGaugeProxyArtifact.deploy(
            masterChef.address, 
            SPIRIT.address, 
            inSPIRIT.address, 
            owner.address,
            feeDistributor.address, 
            0);
        aGaugeProxy = await ethers.getContractAt("AdminGaugeProxy", adminGaugeProxyContract.address);
        console.log("- AdminGaugeProxy Initialized");

        // Add aLP1 Gauge
        await aGaugeProxy.addGauge(aLP1.address);
        let aLP1GaugeAddress = await aGaugeProxy.getGauge(aLP1.address);
        aLP1Gauge = await ethers.getContractAt("contracts/SpiritV2/AdminGaugeProxy.sol:Gauge", aLP1GaugeAddress);
        console.log("- aLP1 Gauge Initialized in aGaugeProxy");

        // Add aLP2 Gauge
        await aGaugeProxy.addGauge(aLP2.address);
        let aLP2GaugeAddress = await aGaugeProxy.getGauge(aLP2.address);
        aLP2Gauge = await ethers.getContractAt("contracts/SpiritV2/AdminGaugeProxy.sol:Gauge", aLP2GaugeAddress);
        console.log("- aLP2 Gauge Initialized in aGaugeProxy");

        // Add LP3 Gauge
        await aGaugeProxy.addGauge(aLP3.address);
        let aLP3GaugeAddress = await aGaugeProxy.getGauge(aLP3.address);
        aLP3Gauge = await ethers.getContractAt("contracts/SpiritV2/AdminGaugeProxy.sol:Gauge", aLP3GaugeAddress);
        console.log("- LP3 Gauge Initialized in aGaugeProxy");

        // Create pool in masterChef for minSPIRIT and deposit minSPIRIT from gaugeProxy
        const aMinSpiritAddr = await aGaugeProxy.TOKEN();
        await masterChef.add(100, aMinSpiritAddr, 0, true);
        await aGaugeProxy.setPID(0);
        await aGaugeProxy.deposit();

        // Owner locks in 1000 SPIRIT for inSPIRIT
        await SPIRIT.approve(inSPIRIT.address, oneThousand);
        await inSPIRIT.create_lock(oneThousand, April2026);

        // Transfer 1000 SPIRIT to users
        await SPIRIT.transfer(user1.address, oneHundred); // transfer SPIRIT to user1
        await SPIRIT.transfer(user2.address, oneHundred); // transfer SPIRIT to user2
        await WETH.mint(user1.address, 200);
        await WETH.mint(user2.address, 200);
        await USDC.mint(user1.address, 100);
        await USDC.mint(user2.address, 100);
        await aLP3.mint(user1.address, 100);
        await aLP3.mint(user2.address, 100);
        await aLP4.mint(user1.address, 100);
        await aLP4.mint(user2.address, 100);

         // User1 gets aLP1
         await WETH.connect(user1).approve(router.address, oneHundred);
         await SPIRIT.connect(user1).approve(router.address, oneHundred);
         await router.connect(user1).addLiquidity(WETH.address, SPIRIT.address, false, oneHundred, oneHundred, oneHundred, oneHundred, user1.address, 1685083888);

        // User2 gets aLP1
        await WETH.connect(user2).approve(router.address, oneHundred);
        await SPIRIT.connect(user2).approve(router.address, oneHundred);
        await router.connect(user2).addLiquidity(WETH.address, SPIRIT.address, false, oneHundred, oneHundred, oneHundred, oneHundred, user2.address, 1685083888);
        
        // User1 gets aLP2
        await WETH.connect(user1).approve(router.address, oneHundred);
        await USDC.connect(user1).approve(router.address, oneHundred);
        await router.connect(user1).addLiquidity(WETH.address, USDC.address, false, oneHundred, oneHundred, oneHundred, oneHundred, user1.address, 1685083888);

        // User2 gets aLP2
        await WETH.connect(user2).approve(router.address, oneHundred);
        await USDC.connect(user2).approve(router.address, oneHundred);
        await router.connect(user2).addLiquidity(WETH.address, USDC.address, false, oneHundred, oneHundred, oneHundred, oneHundred, user2.address, 1685083888);

        
        console.log("Initialization Complete");
    });

    it('ADMIN Gauge Proxy Status', async function () {
        console.log("******************************************************");
        console.log();

        // Admin Gauge Proxy Status
        let weightLP1 = await aGaugeProxy.gaugeWeights(aLP1.address);
        let weightLP2 = await aGaugeProxy.gaugeWeights(aLP2.address);
        let weightLP3 = await aGaugeProxy.gaugeWeights(aLP3.address);
        let weightLP4 = await aGaugeProxy.gaugeWeights(aLP4.address);
        let totalWeightS = await aGaugeProxy.totalWeight();
        let aGaugeProxySPIRIT = await SPIRIT.balanceOf(aGaugeProxy.address);

        console.log("ADMIN Gauge Proxy Status");
        console.log("LP1 weight", divDec(weightLP1));
        console.log("LP2 weight", divDec(weightLP2));
        console.log("LP3 weight", divDec(weightLP3));
        console.log("LP4 weight", divDec(weightLP4));
        console.log("Total weight", divDec(totalWeightS));
        console.log("SPIRIT", divDec(aGaugeProxySPIRIT));
        console.log();

        // aLP1 Gauge Status
        let totalBalanceaLP1Gauge = await aLP1Gauge.totalSupply();
        let aLP1GaugeSPIRIT = await SPIRIT.balanceOf(aLP1Gauge.address);
        let user1LP1Gauge = await aLP1Gauge.balanceOf(user1.address);
        let user2LP1Gauge = await aLP1Gauge.balanceOf(user2.address);

        console.log("aLP1 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalanceaLP1Gauge));
        console.log("SPIRIT", divDec(aLP1GaugeSPIRIT));
        console.log("User1 LP Balance", divDec(user1LP1Gauge));
        console.log("User2 LP Balance", divDec(user2LP1Gauge));
        console.log();

        // aLP2 Gauge Status
        let totalBalanceaLP2Gauge = await aLP2Gauge.totalSupply();
        let aLP2GaugeSPIRIT = await SPIRIT.balanceOf(aLP2Gauge.address);
        let user1LP2Gauge = await aLP2Gauge.balanceOf(user1.address);
        let user2LP2Gauge = await aLP2Gauge.balanceOf(user2.address);

        console.log("aLP2 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalanceaLP2Gauge));
        console.log("SPIRIT", divDec(aLP2GaugeSPIRIT));
        console.log("User1 LP Balance", divDec(user1LP2Gauge));
        console.log("User2 LP Balance", divDec(user2LP2Gauge));
        console.log();

        // aLP3 Gauge Status
        let totalBalanceaLP3Gauge = await aLP3Gauge.totalSupply();
        let aLP3GaugeSPIRIT = await SPIRIT.balanceOf(aLP3Gauge.address);
        let user1LP3Gauge = await aLP3Gauge.balanceOf(user1.address);
        let user2LP3Gauge = await aLP3Gauge.balanceOf(user2.address);

        console.log("aLP3 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalanceaLP3Gauge));
        console.log("SPIRIT", divDec(aLP3GaugeSPIRIT));
        console.log("User1 LP Balance", divDec(user1LP3Gauge));
        console.log("User2 LP Balance", divDec(user2LP3Gauge));
        console.log();
        
    }); 

    it('Owner balance status', async function () {
        console.log("******************************************************");
        console.log();
        // Owner Balances
        let ownerSPIRIT = await SPIRIT.balanceOf(owner.address);
        let ownerInSpirit = await inSPIRIT['balanceOf(address)'](owner.address);
        let ownerWETH = await WETH.balanceOf(owner.address);
        let ownerUSDC = await USDC.balanceOf(owner.address);
        let owneraLP1 = await aLP1.balanceOf(owner.address);
        let owneraLP2 = await aLP2.balanceOf(owner.address);
        let owneraLP3 = await aLP3.balanceOf(owner.address);

        console.log("OWNER BALANCES");
        console.log("SPIRIT", divDec(ownerSPIRIT));
        console.log("inSPIRIT", divDec(ownerInSpirit));
        console.log("WETH", divDec(ownerWETH));
        console.log("USDC", divDec(ownerUSDC));
        console.log("aLP1", divDec(owneraLP1));
        console.log("aLP2", divDec(owneraLP2));
        console.log("aLP3", divDec(owneraLP3));
        console.log();
    });

    it('User1 balance status', async function () {
        console.log("******************************************************");
        console.log();
        // Owner Balances
        let user1SPIRIT = await SPIRIT.balanceOf(user1.address);
        let user1InSpirit = await inSPIRIT['balanceOf(address)'](user1.address);
        let user1WETH = await WETH.balanceOf(user1.address);
        let user1USDC = await USDC.balanceOf(user1.address);
        let user1aLP1 = await aLP1.balanceOf(user1.address);
        let user1aLP2 = await aLP2.balanceOf(user1.address);
        let user1aLP3 = await aLP3.balanceOf(user1.address);

        console.log("USER1 BALANCES");
        console.log("SPIRIT", divDec(user1SPIRIT));
        console.log("inSPIRIT", divDec(user1InSpirit));
        console.log("WETH", divDec(user1WETH));
        console.log("USDC", divDec(user1USDC));
        console.log("aLP1", divDec(user1aLP1));
        console.log("aLP2", divDec(user1aLP2));
        console.log("aLP3", divDec(user1aLP3));
        console.log();
    });

    it('User2 balance status', async function () {
        console.log("******************************************************");
        console.log();
        // Owner Balances
        let user2SPIRIT = await SPIRIT.balanceOf(user2.address);
        let user2InSpirit = await inSPIRIT['balanceOf(address)'](user2.address);
        let user2WETH = await WETH.balanceOf(user2.address);
        let user2USDC = await USDC.balanceOf(user2.address);
        let user2aLP1 = await aLP1.balanceOf(user2.address);
        let user2aLP2 = await aLP2.balanceOf(user2.address);
        let user2aLP3 = await aLP3.balanceOf(user2.address);

        console.log("USER2 BALANCES");
        console.log("SPIRIT", divDec(user2SPIRIT));
        console.log("inSPIRIT", divDec(user2InSpirit));
        console.log("WETH", divDec(user2WETH));
        console.log("USDC", divDec(user2USDC));
        console.log("aLP1", divDec(user2aLP1));
        console.log("aLP2", divDec(user2aLP2));
        console.log("aLP3", divDec(user2aLP3));
        console.log();
    });

    it('Users 1 and 2 deposit into gauges', async function () {
        console.log("******************************************************");
        console.log();

        await aLP1.connect(user1).approve(aLP1Gauge.address, oneHundred);
        await aLP1Gauge.connect(user1).deposit(await aLP1.balanceOf(user1.address));
        await aLP2.connect(user1).approve(aLP2Gauge.address, oneHundred);
        await aLP2Gauge.connect(user1).deposit(await aLP2.balanceOf(user1.address));
        await aLP3.connect(user1).approve(aLP3Gauge.address, oneHundred);
        await aLP3Gauge.connect(user1).deposit(await aLP3.balanceOf(user1.address));

        await aLP1.connect(user2).approve(aLP1Gauge.address, oneHundred);
        await aLP1Gauge.connect(user2).deposit(await aLP1.balanceOf(user2.address));
        await aLP2.connect(user2).approve(aLP2Gauge.address, oneHundred);
        await aLP2Gauge.connect(user2).deposit(await aLP2.balanceOf(user2.address));
        await aLP3.connect(user2).approve(aLP3Gauge.address, oneHundred);
        await aLP3Gauge.connect(user2).deposit(await aLP3.balanceOf(user2.address));

    });

    it('ADMIN Gauge Proxy Status', async function () {
        console.log("******************************************************");
        console.log();

        // Admin Gauge Proxy Status
        let weightLP1 = await aGaugeProxy.gaugeWeights(aLP1.address);
        let weightLP2 = await aGaugeProxy.gaugeWeights(aLP2.address);
        let weightLP3 = await aGaugeProxy.gaugeWeights(aLP3.address);
        let weightLP4 = await aGaugeProxy.gaugeWeights(aLP4.address);
        let totalWeightS = await aGaugeProxy.totalWeight();
        let aGaugeProxySPIRIT = await SPIRIT.balanceOf(aGaugeProxy.address);

        console.log("ADMIN Gauge Proxy Status");
        console.log("LP1 weight", divDec(weightLP1));
        console.log("LP2 weight", divDec(weightLP2));
        console.log("LP3 weight", divDec(weightLP3));
        console.log("LP4 weight", divDec(weightLP4));
        console.log("Total weight", divDec(totalWeightS));
        console.log("SPIRIT", divDec(aGaugeProxySPIRIT));
        console.log();

        // aLP1 Gauge Status
        let totalBalanceaLP1Gauge = await aLP1Gauge.totalSupply();
        let aLP1GaugeSPIRIT = await SPIRIT.balanceOf(aLP1Gauge.address);
        let user1LP1Gauge = await aLP1Gauge.balanceOf(user1.address);
        let user2LP1Gauge = await aLP1Gauge.balanceOf(user2.address);

        console.log("aLP1 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalanceaLP1Gauge));
        console.log("SPIRIT", divDec(aLP1GaugeSPIRIT));
        console.log("User1 LP Balance", divDec(user1LP1Gauge));
        console.log("User2 LP Balance", divDec(user2LP1Gauge));
        console.log();

        // aLP2 Gauge Status
        let totalBalanceaLP2Gauge = await aLP2Gauge.totalSupply();
        let aLP2GaugeSPIRIT = await SPIRIT.balanceOf(aLP2Gauge.address);
        let user1LP2Gauge = await aLP2Gauge.balanceOf(user1.address);
        let user2LP2Gauge = await aLP2Gauge.balanceOf(user2.address);

        console.log("aLP2 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalanceaLP2Gauge));
        console.log("SPIRIT", divDec(aLP2GaugeSPIRIT));
        console.log("User1 LP Balance", divDec(user1LP2Gauge));
        console.log("User2 LP Balance", divDec(user2LP2Gauge));
        console.log();

        // aLP3 Gauge Status
        let totalBalanceaLP3Gauge = await aLP3Gauge.totalSupply();
        let aLP3GaugeSPIRIT = await SPIRIT.balanceOf(aLP3Gauge.address);
        let user1LP3Gauge = await aLP3Gauge.balanceOf(user1.address);
        let user2LP3Gauge = await aLP3Gauge.balanceOf(user2.address);

        console.log("aLP3 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalanceaLP3Gauge));
        console.log("SPIRIT", divDec(aLP3GaugeSPIRIT));
        console.log("User1 LP Balance", divDec(user1LP3Gauge));
        console.log("User2 LP Balance", divDec(user2LP3Gauge));
        console.log();
        
    }); 

    it('Owner sets aLP1 gauge weight to 100', async function () {
        console.log("******************************************************");
        console.log();

        await aGaugeProxy.connect(owner).setGaugeWeight(aLP1.address, oneHundred);

    });

    it('ADMIN Gauge Proxy Status', async function () {
        console.log("******************************************************");
        console.log();

        // Admin Gauge Proxy Status
        let weightLP1 = await aGaugeProxy.gaugeWeights(aLP1.address);
        let weightLP2 = await aGaugeProxy.gaugeWeights(aLP2.address);
        let weightLP3 = await aGaugeProxy.gaugeWeights(aLP3.address);
        let weightLP4 = await aGaugeProxy.gaugeWeights(aLP4.address);
        let totalWeightS = await aGaugeProxy.totalWeight();
        let aGaugeProxySPIRIT = await SPIRIT.balanceOf(aGaugeProxy.address);

        console.log("ADMIN Gauge Proxy Status");
        console.log("LP1 weight", divDec(weightLP1));
        console.log("LP2 weight", divDec(weightLP2));
        console.log("LP3 weight", divDec(weightLP3));
        console.log("LP4 weight", divDec(weightLP4));
        console.log("Total weight", divDec(totalWeightS));
        console.log("SPIRIT", divDec(aGaugeProxySPIRIT));
        console.log();

        // aLP1 Gauge Status
        let totalBalanceaLP1Gauge = await aLP1Gauge.totalSupply();
        let aLP1GaugeSPIRIT = await SPIRIT.balanceOf(aLP1Gauge.address);
        let user1LP1Gauge = await aLP1Gauge.balanceOf(user1.address);
        let user2LP1Gauge = await aLP1Gauge.balanceOf(user2.address);

        console.log("aLP1 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalanceaLP1Gauge));
        console.log("SPIRIT", divDec(aLP1GaugeSPIRIT));
        console.log("User1 LP Balance", divDec(user1LP1Gauge));
        console.log("User2 LP Balance", divDec(user2LP1Gauge));
        console.log();

        // aLP2 Gauge Status
        let totalBalanceaLP2Gauge = await aLP2Gauge.totalSupply();
        let aLP2GaugeSPIRIT = await SPIRIT.balanceOf(aLP2Gauge.address);
        let user1LP2Gauge = await aLP2Gauge.balanceOf(user1.address);
        let user2LP2Gauge = await aLP2Gauge.balanceOf(user2.address);

        console.log("aLP2 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalanceaLP2Gauge));
        console.log("SPIRIT", divDec(aLP2GaugeSPIRIT));
        console.log("User1 LP Balance", divDec(user1LP2Gauge));
        console.log("User2 LP Balance", divDec(user2LP2Gauge));
        console.log();

        // aLP3 Gauge Status
        let totalBalanceaLP3Gauge = await aLP3Gauge.totalSupply();
        let aLP3GaugeSPIRIT = await SPIRIT.balanceOf(aLP3Gauge.address);
        let user1LP3Gauge = await aLP3Gauge.balanceOf(user1.address);
        let user2LP3Gauge = await aLP3Gauge.balanceOf(user2.address);

        console.log("aLP3 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalanceaLP3Gauge));
        console.log("SPIRIT", divDec(aLP3GaugeSPIRIT));
        console.log("User1 LP Balance", divDec(user1LP3Gauge));
        console.log("User2 LP Balance", divDec(user2LP3Gauge));
        console.log();
        
    }); 

    it('Owner sets Admin address', async function () {
        console.log("******************************************************");
        console.log();

        await aGaugeProxy.connect(owner).setAdmin(admin.address);

    });

    it('Admin sets aLP2 gauge weight to 100', async function () {
        console.log("******************************************************");
        console.log();

        await aGaugeProxy.connect(admin).setGaugeWeight(aLP2.address, oneHundred);

    });
    
    it('ADMIN Gauge Proxy Status', async function () {
        console.log("******************************************************");
        console.log();

        // Admin Gauge Proxy Status
        let weightLP1 = await aGaugeProxy.gaugeWeights(aLP1.address);
        let weightLP2 = await aGaugeProxy.gaugeWeights(aLP2.address);
        let weightLP3 = await aGaugeProxy.gaugeWeights(aLP3.address);
        let weightLP4 = await aGaugeProxy.gaugeWeights(aLP4.address);
        let totalWeightS = await aGaugeProxy.totalWeight();
        let aGaugeProxySPIRIT = await SPIRIT.balanceOf(aGaugeProxy.address);

        console.log("ADMIN Gauge Proxy Status");
        console.log("LP1 weight", divDec(weightLP1));
        console.log("LP2 weight", divDec(weightLP2));
        console.log("LP3 weight", divDec(weightLP3));
        console.log("LP4 weight", divDec(weightLP4));
        console.log("Total weight", divDec(totalWeightS));
        console.log("SPIRIT", divDec(aGaugeProxySPIRIT));
        console.log();

        // aLP1 Gauge Status
        let totalBalanceaLP1Gauge = await aLP1Gauge.totalSupply();
        let aLP1GaugeSPIRIT = await SPIRIT.balanceOf(aLP1Gauge.address);
        let user1LP1Gauge = await aLP1Gauge.balanceOf(user1.address);
        let user2LP1Gauge = await aLP1Gauge.balanceOf(user2.address);

        console.log("aLP1 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalanceaLP1Gauge));
        console.log("SPIRIT", divDec(aLP1GaugeSPIRIT));
        console.log("User1 LP Balance", divDec(user1LP1Gauge));
        console.log("User2 LP Balance", divDec(user2LP1Gauge));
        console.log();

        // aLP2 Gauge Status
        let totalBalanceaLP2Gauge = await aLP2Gauge.totalSupply();
        let aLP2GaugeSPIRIT = await SPIRIT.balanceOf(aLP2Gauge.address);
        let user1LP2Gauge = await aLP2Gauge.balanceOf(user1.address);
        let user2LP2Gauge = await aLP2Gauge.balanceOf(user2.address);

        console.log("aLP2 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalanceaLP2Gauge));
        console.log("SPIRIT", divDec(aLP2GaugeSPIRIT));
        console.log("User1 LP Balance", divDec(user1LP2Gauge));
        console.log("User2 LP Balance", divDec(user2LP2Gauge));
        console.log();

        // aLP3 Gauge Status
        let totalBalanceaLP3Gauge = await aLP3Gauge.totalSupply();
        let aLP3GaugeSPIRIT = await SPIRIT.balanceOf(aLP3Gauge.address);
        let user1LP3Gauge = await aLP3Gauge.balanceOf(user1.address);
        let user2LP3Gauge = await aLP3Gauge.balanceOf(user2.address);

        console.log("aLP3 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalanceaLP3Gauge));
        console.log("SPIRIT", divDec(aLP3GaugeSPIRIT));
        console.log("User1 LP Balance", divDec(user1LP3Gauge));
        console.log("User2 LP Balance", divDec(user2LP3Gauge));
        console.log();
        
    }); 

    it('Admin sets aLP4 gauge weight to 100', async function () {
        console.log("******************************************************");
        console.log();

        await expect(aGaugeProxy.connect(admin).setGaugeWeight(aLP4.address, oneHundred)).to.be.revertedWith("!exists");

    });

    it('Owner does a bunch of swaps on aLP1', async function () {
        console.log("******************************************************");
        console.log("Owner does a bunch of swaps on vLP1");
        await WETH.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, WETH.address, SPIRIT.address, false, owner.address, 1685083888);
        await SPIRIT.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, SPIRIT.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, WETH.address, SPIRIT.address, false, owner.address, 1685083888);
        await SPIRIT.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, SPIRIT.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, WETH.address, SPIRIT.address, false, owner.address, 1685083888);
        await SPIRIT.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, SPIRIT.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, WETH.address, SPIRIT.address, false, owner.address, 1685083888);
        await SPIRIT.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, SPIRIT.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, WETH.address, SPIRIT.address, false, owner.address, 1685083888);
        await SPIRIT.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, SPIRIT.address, WETH.address, false, owner.address, 1685083888);
    });

    it('User1 calls claimFees on aLP1Gauge', async function () {
        console.log("******************************************************");
        console.log("User1 calls claim fees on aLP1Gauge");

        let spiritMakerWETH = await WETH.balanceOf(spiritMaker.address);
        let spiritMakerSPIRIT = await SPIRIT.balanceOf(spiritMaker.address);
        let protocol1WETH = await WETH.balanceOf(protocol1.address);
        let protocol1SPIRIT = await SPIRIT.balanceOf(protocol1.address);
        let aLP1FeesWETH = await WETH.balanceOf(aLP1Fees.address);
        let aLP1FeesSPIRIT = await SPIRIT.balanceOf(aLP1Fees.address);
        let ownerWETH = await WETH.balanceOf(owner.address);
        let ownerSPIRIT = await SPIRIT.balanceOf(owner.address);
        
        console.log("aLP1Fees Balances");
        console.log("WETH", divDec(aLP1FeesWETH));
        console.log("SPIRIT", divDec(aLP1FeesSPIRIT));
        console.log("SpiritMaker Balances");
        console.log("WETH", divDec(spiritMakerWETH));
        console.log("SPIRIT", divDec(spiritMakerSPIRIT));
        console.log("Protocol1 Balances");
        console.log("WETH", divDec(protocol1WETH));
        console.log("SPIRIT", divDec(protocol1SPIRIT));
        console.log("Owner Balances");
        console.log("WETH", divDec(ownerWETH));
        console.log("SPIRIT", divDec(ownerSPIRIT));
        console.log();

        await aLP1Gauge.connect(user1).claimVotingFees();

        spiritMakerWETH = await WETH.balanceOf(spiritMaker.address);
        spiritMakerSPIRIT = await SPIRIT.balanceOf(spiritMaker.address);
        protocol1WETH = await WETH.balanceOf(protocol1.address);
        protocol1SPIRIT = await SPIRIT.balanceOf(protocol1.address);
        aLP1FeesWETH = await WETH.balanceOf(aLP1Fees.address);
        aLP1FeesSPIRIT = await SPIRIT.balanceOf(aLP1Fees.address);
        ownerWETH = await WETH.balanceOf(owner.address);
        ownerSPIRIT = await SPIRIT.balanceOf(owner.address);
        
        console.log("aLP1Fees Balances");
        console.log("WETH", divDec(aLP1FeesWETH));
        console.log("SPIRIT", divDec(aLP1FeesSPIRIT));
        console.log("SpiritMaker Balances");
        console.log("WETH", divDec(spiritMakerWETH));
        console.log("SPIRIT", divDec(spiritMakerSPIRIT));
        console.log("Protocol1 Balances");
        console.log("WETH", divDec(protocol1WETH));
        console.log("SPIRIT", divDec(protocol1SPIRIT));
        console.log("Owner Balances");
        console.log("WETH", divDec(ownerWETH));
        console.log("SPIRIT", divDec(ownerSPIRIT));
        console.log();

        await aLP1.connect(owner).claimFees();

        spiritMakerWETH = await WETH.balanceOf(spiritMaker.address);
        spiritMakerSPIRIT = await SPIRIT.balanceOf(spiritMaker.address);
        protocol1WETH = await WETH.balanceOf(protocol1.address);
        protocol1SPIRIT = await SPIRIT.balanceOf(protocol1.address);
        aLP1FeesWETH = await WETH.balanceOf(aLP1Fees.address);
        aLP1FeesSPIRIT = await SPIRIT.balanceOf(aLP1Fees.address);
        ownerWETH = await WETH.balanceOf(owner.address);
        
        ownerSPIRIT = await SPIRIT.balanceOf(owner.address);
        
        console.log("aLP1Fees Balances");
        console.log("WETH", divDec(aLP1FeesWETH));
        console.log("SPIRIT", divDec(aLP1FeesSPIRIT));
        console.log("SpiritMaker Balances");
        console.log("WETH", divDec(spiritMakerWETH));
        console.log("SPIRIT", divDec(spiritMakerSPIRIT));
        console.log("Protocol1 Balances");
        console.log("WETH", divDec(protocol1WETH));
        console.log("SPIRIT", divDec(protocol1SPIRIT));
        console.log("Owner Balances");
        console.log("WETH", divDec(ownerWETH));
        console.log("SPIRIT", divDec(ownerSPIRIT));
        console.log();

    });

    it('User1 calls claimFees on aLP3Gauge', async function () {
        console.log("******************************************************");
        console.log("User1 calls claim fees on aLP3Gauge");

        await expect(aLP3Gauge.connect(user1).claimVotingFees()).to.be.reverted;

    });

    it('Owner changes aLP1 protocol', async function () {
        console.log("******************************************************");

        await pairFactory.setProtocolAddress(aLP1.address, protocol2.address);
    });

    it('Owner does a bunch of swaps on aLP1', async function () {
        console.log("******************************************************");
        console.log("Owner does a bunch of swaps on vLP1");
        await WETH.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, WETH.address, SPIRIT.address, false, owner.address, 1685083888);
        await SPIRIT.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, SPIRIT.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, WETH.address, SPIRIT.address, false, owner.address, 1685083888);
        await SPIRIT.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, SPIRIT.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, WETH.address, SPIRIT.address, false, owner.address, 1685083888);
        await SPIRIT.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, SPIRIT.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, WETH.address, SPIRIT.address, false, owner.address, 1685083888);
        await SPIRIT.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, SPIRIT.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, WETH.address, SPIRIT.address, false, owner.address, 1685083888);
        await SPIRIT.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, SPIRIT.address, WETH.address, false, owner.address, 1685083888);
    });

    it('User1 calls claimFees on aLP1Gauge', async function () {
        console.log("******************************************************");
        console.log("User1 calls claim fees on aLP1Gauge");

        let spiritMakerWETH = await WETH.balanceOf(spiritMaker.address);
        let spiritMakerSPIRIT = await SPIRIT.balanceOf(spiritMaker.address);
        let protocol1WETH = await WETH.balanceOf(protocol1.address);
        let protocol1SPIRIT = await SPIRIT.balanceOf(protocol1.address);
        let protocol2WETH = await WETH.balanceOf(protocol2.address);
        let protocol2SPIRIT = await SPIRIT.balanceOf(protocol2.address);
        let aLP1FeesWETH = await WETH.balanceOf(aLP1Fees.address);
        let aLP1FeesSPIRIT = await SPIRIT.balanceOf(aLP1Fees.address);
        let ownerWETH = await WETH.balanceOf(owner.address);
        let ownerSPIRIT = await SPIRIT.balanceOf(owner.address);
        
        console.log("aLP1Fees Balances");
        console.log("WETH", divDec(aLP1FeesWETH));
        console.log("SPIRIT", divDec(aLP1FeesSPIRIT));
        console.log("SpiritMaker Balances");
        console.log("WETH", divDec(spiritMakerWETH));
        console.log("SPIRIT", divDec(spiritMakerSPIRIT));
        console.log("Protocol1 Balances");
        console.log("WETH", divDec(protocol1WETH));
        console.log("SPIRIT", divDec(protocol1SPIRIT));
        console.log("Protocol2 Balances");
        console.log("WETH", divDec(protocol2WETH));
        console.log("SPIRIT", divDec(protocol2SPIRIT));
        console.log("Owner Balances");
        console.log("WETH", divDec(ownerWETH));
        console.log("SPIRIT", divDec(ownerSPIRIT));
        console.log();

        await aLP1Gauge.connect(user1).claimVotingFees();

        spiritMakerWETH = await WETH.balanceOf(spiritMaker.address);
        spiritMakerSPIRIT = await SPIRIT.balanceOf(spiritMaker.address);
        protocol1WETH = await WETH.balanceOf(protocol1.address);
        protocol1SPIRIT = await SPIRIT.balanceOf(protocol1.address);
        protocol2WETH = await WETH.balanceOf(protocol2.address);
        protocol2SPIRIT = await SPIRIT.balanceOf(protocol2.address);
        aLP1FeesWETH = await WETH.balanceOf(aLP1Fees.address);
        aLP1FeesSPIRIT = await SPIRIT.balanceOf(aLP1Fees.address);
        ownerWETH = await WETH.balanceOf(owner.address);
        ownerSPIRIT = await SPIRIT.balanceOf(owner.address);
        
        console.log("aLP1Fees Balances");
        console.log("WETH", divDec(aLP1FeesWETH));
        console.log("SPIRIT", divDec(aLP1FeesSPIRIT));
        console.log("SpiritMaker Balances");
        console.log("WETH", divDec(spiritMakerWETH));
        console.log("SPIRIT", divDec(spiritMakerSPIRIT));
        console.log("Protocol1 Balances");
        console.log("WETH", divDec(protocol1WETH));
        console.log("SPIRIT", divDec(protocol1SPIRIT));
        console.log("Protocol2 Balances");
        console.log("WETH", divDec(protocol2WETH));
        console.log("SPIRIT", divDec(protocol2SPIRIT));
        console.log("Owner Balances");
        console.log("WETH", divDec(ownerWETH));
        console.log("SPIRIT", divDec(ownerSPIRIT));
        console.log();

        await aLP1.connect(owner).claimFees();

        spiritMakerWETH = await WETH.balanceOf(spiritMaker.address);
        spiritMakerSPIRIT = await SPIRIT.balanceOf(spiritMaker.address);
        protocol1WETH = await WETH.balanceOf(protocol1.address);
        protocol1SPIRIT = await SPIRIT.balanceOf(protocol1.address);
        protocol2WETH = await WETH.balanceOf(protocol2.address);
        protocol2SPIRIT = await SPIRIT.balanceOf(protocol2.address);
        aLP1FeesWETH = await WETH.balanceOf(aLP1Fees.address);
        aLP1FeesSPIRIT = await SPIRIT.balanceOf(aLP1Fees.address);
        ownerWETH = await WETH.balanceOf(owner.address);
        ownerSPIRIT = await SPIRIT.balanceOf(owner.address);
        
        console.log("aLP1Fees Balances");
        console.log("WETH", divDec(aLP1FeesWETH));
        console.log("SPIRIT", divDec(aLP1FeesSPIRIT));
        console.log("SpiritMaker Balances");
        console.log("WETH", divDec(spiritMakerWETH));
        console.log("SPIRIT", divDec(spiritMakerSPIRIT));
        console.log("Protocol1 Balances");
        console.log("WETH", divDec(protocol1WETH));
        console.log("SPIRIT", divDec(protocol1SPIRIT));
        console.log("Protocol2 Balances");
        console.log("WETH", divDec(protocol2WETH));
        console.log("SPIRIT", divDec(protocol2SPIRIT));
        console.log("Owner Balances");
        console.log("WETH", divDec(ownerWETH));
        console.log("SPIRIT", divDec(ownerSPIRIT));
        console.log();

    });

    it('Owner sets pairFactory Admin', async function () {
        console.log("******************************************************");

        await pairFactory.setAdmin(admin.address);
    });

    it('Changes to pairFactory', async function () {
        console.log("******************************************************");

        await pairFactory.setSpiritMaker(spiritMaker2.address);
        await pairFactory.connect(admin).setProtocolAddress(aLP1.address, protocol3.address);
        await pairFactory.setVariableFee(100);
        await pairFactory.setStableFee(200);
        console.log("Variable Fee", 100 / await pairFactory.variableFee());
        console.log("Stable Fee", 100 / await pairFactory.stableFee());
        console.log("aLP1 Fee before update", 100 / await aLP1.fee());
        await aLP1.connect(user1).updateFee();
        console.log("aLP1 Fee after update", 100 / await aLP1.fee());

    });

    it('Owner does a bunch of swaps on aLP1', async function () {
        console.log("******************************************************");
        console.log("Owner does a bunch of swaps on vLP1");
        await WETH.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, WETH.address, SPIRIT.address, false, owner.address, 1685083888);
        await SPIRIT.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, SPIRIT.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, WETH.address, SPIRIT.address, false, owner.address, 1685083888);
        await SPIRIT.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, SPIRIT.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, WETH.address, SPIRIT.address, false, owner.address, 1685083888);
        await SPIRIT.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, SPIRIT.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, WETH.address, SPIRIT.address, false, owner.address, 1685083888);
        await SPIRIT.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, SPIRIT.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, WETH.address, SPIRIT.address, false, owner.address, 1685083888);
        await SPIRIT.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).swapExactTokensForTokensSimple(oneHundred, 0, SPIRIT.address, WETH.address, false, owner.address, 1685083888);
    });
    it('User1 calls claimFees on aLP1Gauge', async function () {
        console.log("******************************************************");
        console.log("User1 calls claim fees on aLP1Gauge");

        let spiritMakerWETH = await WETH.balanceOf(spiritMaker.address);
        let spiritMakerSPIRIT = await SPIRIT.balanceOf(spiritMaker.address);
        let spiritMaker2WETH = await WETH.balanceOf(spiritMaker2.address);
        let spiritMaker2SPIRIT = await SPIRIT.balanceOf(spiritMaker2.address);
        let protocol1WETH = await WETH.balanceOf(protocol1.address);
        let protocol1SPIRIT = await SPIRIT.balanceOf(protocol1.address);
        let protocol2WETH = await WETH.balanceOf(protocol2.address);
        let protocol2SPIRIT = await SPIRIT.balanceOf(protocol2.address);
        let protocol3WETH = await WETH.balanceOf(protocol3.address);
        let protocol3SPIRIT = await SPIRIT.balanceOf(protocol3.address);
        let aLP1FeesWETH = await WETH.balanceOf(aLP1Fees.address);
        let aLP1FeesSPIRIT = await SPIRIT.balanceOf(aLP1Fees.address);
        let ownerWETH = await WETH.balanceOf(owner.address);
        let ownerSPIRIT = await SPIRIT.balanceOf(owner.address);
        
        console.log("aLP1Fees Balances");
        console.log("WETH", divDec(aLP1FeesWETH));
        console.log("SPIRIT", divDec(aLP1FeesSPIRIT));
        console.log("SpiritMaker Balances");
        console.log("WETH", divDec(spiritMakerWETH));
        console.log("SPIRIT", divDec(spiritMakerSPIRIT));
        console.log("SpiritMaker2 Balances");
        console.log("WETH", divDec(spiritMaker2WETH));
        console.log("SPIRIT", divDec(spiritMaker2SPIRIT));
        console.log("Protocol1 Balances");
        console.log("WETH", divDec(protocol1WETH));
        console.log("SPIRIT", divDec(protocol1SPIRIT));
        console.log("Protocol2 Balances");
        console.log("WETH", divDec(protocol2WETH));
        console.log("SPIRIT", divDec(protocol2SPIRIT));
        console.log("Protocol3 Balances");
        console.log("WETH", divDec(protocol3WETH));
        console.log("SPIRIT", divDec(protocol3SPIRIT));
        console.log("Owner Balances");
        console.log("WETH", divDec(ownerWETH));
        console.log("SPIRIT", divDec(ownerSPIRIT));
        console.log();

        await aLP1Gauge.connect(user1).claimVotingFees();

        spiritMakerWETH = await WETH.balanceOf(spiritMaker.address);
        spiritMakerSPIRIT = await SPIRIT.balanceOf(spiritMaker.address);
        spiritMaker2WETH = await WETH.balanceOf(spiritMaker2.address);
        spiritMaker2SPIRIT = await SPIRIT.balanceOf(spiritMaker2.address);
        protocol1WETH = await WETH.balanceOf(protocol1.address);
        protocol1SPIRIT = await SPIRIT.balanceOf(protocol1.address);
        protocol2WETH = await WETH.balanceOf(protocol2.address);
        protocol2SPIRIT = await SPIRIT.balanceOf(protocol2.address);
        protocol3WETH = await WETH.balanceOf(protocol3.address);
        protocol3SPIRIT = await SPIRIT.balanceOf(protocol3.address);
        aLP1FeesWETH = await WETH.balanceOf(aLP1Fees.address);
        aLP1FeesSPIRIT = await SPIRIT.balanceOf(aLP1Fees.address);
        ownerWETH = await WETH.balanceOf(owner.address);
        ownerSPIRIT = await SPIRIT.balanceOf(owner.address);
        
        console.log("aLP1Fees Balances");
        console.log("WETH", divDec(aLP1FeesWETH));
        console.log("SPIRIT", divDec(aLP1FeesSPIRIT));
        console.log("SpiritMaker Balances");
        console.log("WETH", divDec(spiritMakerWETH));
        console.log("SPIRIT", divDec(spiritMakerSPIRIT));
        console.log("SpiritMaker2 Balances");
        console.log("WETH", divDec(spiritMaker2WETH));
        console.log("SPIRIT", divDec(spiritMaker2SPIRIT));
        console.log("Protocol1 Balances");
        console.log("WETH", divDec(protocol1WETH));
        console.log("SPIRIT", divDec(protocol1SPIRIT));
        console.log("Protocol2 Balances");
        console.log("WETH", divDec(protocol2WETH));
        console.log("SPIRIT", divDec(protocol2SPIRIT));
        console.log("Protocol3 Balances");
        console.log("WETH", divDec(protocol3WETH));
        console.log("SPIRIT", divDec(protocol3SPIRIT));
        console.log("Owner Balances");
        console.log("WETH", divDec(ownerWETH));
        console.log("SPIRIT", divDec(ownerSPIRIT));
        console.log();

        await aLP1.connect(owner).claimFees();

        spiritMakerWETH = await WETH.balanceOf(spiritMaker.address);
        spiritMakerSPIRIT = await SPIRIT.balanceOf(spiritMaker.address);
        spiritMaker2WETH = await WETH.balanceOf(spiritMaker2.address);
        spiritMaker2SPIRIT = await SPIRIT.balanceOf(spiritMaker2.address);
        protocol1WETH = await WETH.balanceOf(protocol1.address);
        protocol1SPIRIT = await SPIRIT.balanceOf(protocol1.address);
        protocol2WETH = await WETH.balanceOf(protocol2.address);
        protocol2SPIRIT = await SPIRIT.balanceOf(protocol2.address);
        protocol3WETH = await WETH.balanceOf(protocol3.address);
        protocol3SPIRIT = await SPIRIT.balanceOf(protocol3.address);
        aLP1FeesWETH = await WETH.balanceOf(aLP1Fees.address);
        aLP1FeesSPIRIT = await SPIRIT.balanceOf(aLP1Fees.address);
        ownerWETH = await WETH.balanceOf(owner.address);
        ownerSPIRIT = await SPIRIT.balanceOf(owner.address);
        
        console.log("aLP1Fees Balances");
        console.log("WETH", divDec(aLP1FeesWETH));
        console.log("SPIRIT", divDec(aLP1FeesSPIRIT));
        console.log("SpiritMaker Balances");
        console.log("WETH", divDec(spiritMakerWETH));
        console.log("SPIRIT", divDec(spiritMakerSPIRIT));
        console.log("SpiritMaker2 Balances");
        console.log("WETH", divDec(spiritMaker2WETH));
        console.log("SPIRIT", divDec(spiritMaker2SPIRIT));
        console.log("Protocol1 Balances");
        console.log("WETH", divDec(protocol1WETH));
        console.log("SPIRIT", divDec(protocol1SPIRIT));
        console.log("Protocol2 Balances");
        console.log("WETH", divDec(protocol2WETH));
        console.log("SPIRIT", divDec(protocol2SPIRIT));
        console.log("Protocol3 Balances");
        console.log("WETH", divDec(protocol3WETH));
        console.log("SPIRIT", divDec(protocol3SPIRIT));
        console.log("Owner Balances");
        console.log("WETH", divDec(ownerWETH));
        console.log("SPIRIT", divDec(ownerSPIRIT));
        console.log();

    });






});