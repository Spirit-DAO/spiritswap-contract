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
let vGaugeProxy, vLP1, vLP1Fees, vLP1Gauge, vLP1Bribe, vLP2, vLP2Fees, vLP2Gauge, vLP2Bribe, vLP3, vLP3Fees, vLP3Gauge, vLP3Bribe;
let sGaugeProxy, sLP1, sLP1Fees, sLP1Gauge, sLP1Bribe, sLP2, sLP2Fees, sLP2Gauge, sLP2Bribe, sLP3, sLP3Gauge, sLP3Bribe;
let aGaugeProxy, aLP1, aLP1Fees, aLP1Gauge, aLP2, aLP2Fees, aLP2Gauge;
// tokens
let SPIRIT, inSPIRIT, WETH, TK1, TK2, USDC, USD1, USD2;

describe("System testing 2", function () {
  
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
        sLP3 = await erc20Mock.deploy("sLP3", "sLP3");
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

        // Create vLP: WETH-TK2
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
        
        // Create vLP: WETH-USD1
        await WETH.connect(owner).approve(router.address, oneHundred);
        await USD1.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).addLiquidity(WETH.address, USD1.address, false, oneHundred, oneHundred, oneHundred, oneHundred, owner.address, 1685083888);

        const vLP3Address = await pairFactory.getPair(WETH.address, USD1.address, false);
        vLP3 = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Pair", vLP3Address)
        console.log("- vLP3 Initialized"); 

        const vLP3FeesAddress = await vLP3.fees();
        vLP3Fees = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Fees", vLP3FeesAddress)
        console.log("- vLP3Fees Initialized"); 

        // Create sLP: USDC-USD1
        await USDC.connect(owner).approve(router.address, oneHundred);
        await USD1.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).addLiquidity(USDC.address, USD1.address, true, oneHundred, oneHundred, oneHundred, oneHundred, owner.address, 1685083888);

        const sLP1Address = await pairFactory.getPair(USDC.address, USD1.address, true);
        sLP1 = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Pair", sLP1Address);
        await pairFactory.connect(owner).setProtocolAddress(sLP1.address, protocol1.address);
        console.log("- sLP1 Initialized"); 

        const sLP1FeesAddress = await sLP1.fees();
        sLP1Fees = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Fees", sLP1FeesAddress);
        console.log("- sLP1Fees Initialized"); 

         // Create sLP: USDC-USD2
         await USDC.connect(owner).approve(router.address, oneHundred);
         await USD2.connect(owner).approve(router.address, oneHundred);
         await router.connect(owner).addLiquidity(USDC.address, USD2.address, true, oneHundred, oneHundred, oneHundred, oneHundred, owner.address, 1685083888);
 
         const sLP2Address = await pairFactory.getPair(USDC.address, USD2.address, true);
         sLP2 = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Pair", sLP2Address);
         await pairFactory.connect(owner).setProtocolAddress(sLP2.address, protocol2.address);
         console.log("- sLP2 Initialized"); 
 
         const sLP2FeesAddress = await sLP2.fees();
         sLP2Fees = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Fees", sLP2FeesAddress);
         console.log("- sLP2Fees Initialized"); 

        // Create aLP: WETH-SPIRIT
        await WETH.connect(owner).approve(router.address, oneHundred);
        await SPIRIT.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).addLiquidity(WETH.address, SPIRIT.address, false, oneHundred, oneHundred, oneHundred, oneHundred, owner.address, 1685083888);

        const aLP1Address = await pairFactory.getPair(WETH.address, SPIRIT.address, false);
        aLP1 = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Pair", aLP1Address);
        await pairFactory.connect(owner).setProtocolAddress(aLP1.address, treasury.address);
        console.log("- aLP1 Initialized"); 

        const aLP1FeesAddress = await aLP1.fees();
        aLP1Fees = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Fees", aLP1FeesAddress);
        console.log("- aLP1Fees Initialized");

        // Create aLP: WETH-USDC
        await WETH.connect(owner).approve(router.address, oneHundred);
        await USDC.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).addLiquidity(WETH.address, USDC.address, false, oneHundred, oneHundred, oneHundred, oneHundred, owner.address, 1685083888);

        const aLP2Address = await pairFactory.getPair(WETH.address, USDC.address, false);
        aLP2 = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Pair", aLP2Address);
        await pairFactory.connect(owner).setProtocolAddress(aLP2.address, treasury.address);
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

        // initialize StableGaugeProxy
        const stableGaugeProxyArtifact = await ethers.getContractFactory("StableGaugeProxy");
        const stableGaugeProxyContract = await stableGaugeProxyArtifact.deploy(
            masterChef.address, 
            SPIRIT.address, 
            inSPIRIT.address, 
            feeDistributor.address, 
            bribeFactory.address, 
            pairFactory.address);
        sGaugeProxy = await ethers.getContractAt("StableGaugeProxy", stableGaugeProxyContract.address);
        console.log("- StableGaugeProxy Initialized");

        await sGaugeProxy.setBaseToken(USDC.address, true); // Make USDC base token
        await sGaugeProxy.setVerifiedToken(USD1.address, true); // Verify USD1
        await sGaugeProxy.setVerifiedToken(USD2.address, true); // Verify USD2

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

        // Add sLP1 Gauge/Bribe
        await sGaugeProxy.addGauge(sLP1.address);
        let sLP1GaugeAddress = await sGaugeProxy.getGauge(sLP1.address);
        let sLP1BribeAddress = await sGaugeProxy.getBribes(sLP1GaugeAddress);
        sLP1Gauge = await ethers.getContractAt("contracts/SpiritV2/StableGaugeProxy.sol:Gauge", sLP1GaugeAddress);
        sLP1Bribe = await ethers.getContractAt("contracts/SpiritV2/Bribes.sol:Bribe", sLP1BribeAddress);
        console.log("- sLP1 Gauge/Bribe Initialized in sGaugeProxy");

        // Add sLP2 Gauge/Bribe
        await sGaugeProxy.addGauge(sLP2.address);
        let sLP2GaugeAddress = await sGaugeProxy.getGauge(sLP2.address);
        let sLP2BribeAddress = await sGaugeProxy.getBribes(sLP2GaugeAddress);
        sLP2Gauge = await ethers.getContractAt("contracts/SpiritV2/StableGaugeProxy.sol:Gauge", sLP2GaugeAddress);
        sLP2Bribe = await ethers.getContractAt("contracts/SpiritV2/Bribes.sol:Bribe", sLP2BribeAddress);
        console.log("- sLP2 Gauge/Bribe Initialized in sGaugeProxy");

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

        // Create pool in masterChef for minSPIRIT and deposit minSPIRIT from gaugeProxy
        const vMinSpiritAddr = await vGaugeProxy.TOKEN();
        await masterChef.add(50, vMinSpiritAddr, 0, true);
        await vGaugeProxy.setPID(0);
        await vGaugeProxy.deposit();

        // Create pool in masterChef for minSPIRIT and deposit minSPIRIT from gaugeProxy
        const sMinSpiritAddr = await sGaugeProxy.TOKEN();
        await masterChef.add(30, sMinSpiritAddr, 0, true);
        await sGaugeProxy.setPID(1);
        await sGaugeProxy.deposit();

        // Create pool in masterChef for minSPIRIT and deposit minSPIRIT from gaugeProxy
        const aMinSpiritAddr = await aGaugeProxy.TOKEN();
        await masterChef.add(20, aMinSpiritAddr, 0, true);
        await aGaugeProxy.setPID(2);
        await aGaugeProxy.deposit();

        // Owner locks in 1000 SPIRIT for inSPIRIT
        await SPIRIT.approve(inSPIRIT.address, oneThousand);
        await inSPIRIT.create_lock(oneThousand, April2026);

        // Turn on ve33 tokenomics
        await vGaugeProxy.toggleVE();
        await sGaugeProxy.toggleVE();
        await aGaugeProxy.toggleVE();

        // Transfer 1000 SPIRIT to users
        await SPIRIT.transfer(user1.address, oneThousand); // transfer SPIRIT to user1
        await SPIRIT.transfer(user2.address, oneThousand); // transfer SPIRIT to user2
        
        // User1 locks in 1000 SPIRIT for inSPIRIT
        await SPIRIT.connect(user1).approve(inSPIRIT.address, oneThousand);
        await inSPIRIT.connect(user1).create_lock(oneThousand, April2026);

        // User2 locks in 1000 SPIRIT for inSPIRIT
        await SPIRIT.connect(user2).approve(inSPIRIT.address, oneThousand);
        await inSPIRIT.connect(user2).create_lock(oneThousand, April2026);

        // Mint 1000 WETH to users
        await WETH.mint(user1.address, 1000); 
        await WETH.mint(user2.address, 1000); 
        
        console.log("Initialization Complete");
        console.log("******************************************************");
    });

    it('Owner sets admin on admin gauge proxy', async function () {
        await aGaugeProxy.setGaugeWeight(aLP1.address, oneHundred);
        await aGaugeProxy.setGaugeWeight(aLP2.address, oneHundred);

        await expect(await aGaugeProxy.gaugeWeights(aLP1.address)).to.be.equal(oneHundred);
        await expect(await aGaugeProxy.gaugeWeights(aLP2.address)).to.be.equal(oneHundred);
    });

    it('Reward per token tests before deposits', async function () {
        await expect(await vLP1Gauge.rewardPerToken()).to.be.equal(0);
        await expect(await vLP2Gauge.rewardPerToken()).to.be.equal(0);
        await expect(await sLP1Gauge.rewardPerToken()).to.be.equal(0);
        await expect(await sLP2Gauge.rewardPerToken()).to.be.equal(0);
        await expect(await aLP1Gauge.rewardPerToken()).to.be.equal(0);
        await expect(await aLP2Gauge.rewardPerToken()).to.be.equal(0);
    });


    it('Owner deposits vLPs into variable gauges', async function () {
        await vLP1.connect(owner).approve(vLP1Gauge.address, oneThousand);
        await vLP1Gauge.connect(owner).depositAll();
        await vLP2.connect(owner).approve(vLP2Gauge.address, oneThousand);
        await vLP2Gauge.connect(owner).depositAll();

        await expect(await vLP1.balanceOf(owner.address)).to.be.equal(0);
        await expect(await vLP1Gauge.balanceOf(owner.address)).to.be.above(0);
        await expect(await vLP2.balanceOf(owner.address)).to.be.equal(0);
        await expect(await vLP2Gauge.balanceOf(owner.address)).to.be.above(0);
    });

    it('Owner deposits sLPs into stable gauges', async function () {
        await sLP1.connect(owner).approve(sLP1Gauge.address, oneThousand);
        await sLP1Gauge.connect(owner).depositAll();
        await sLP2.connect(owner).approve(sLP2Gauge.address, oneThousand);
        await sLP2Gauge.connect(owner).depositAll();

        await expect(await sLP1.balanceOf(owner.address)).to.be.equal(0);
        await expect(await sLP1Gauge.balanceOf(owner.address)).to.be.above(0);
        await expect(await sLP2.balanceOf(owner.address)).to.be.equal(0);
        await expect(await sLP2Gauge.balanceOf(owner.address)).to.be.above(0);
    });

    it('Owner deposits aLPs into admin gauges', async function () {
        await aLP1.connect(owner).approve(aLP1Gauge.address, oneThousand);
        await aLP1Gauge.connect(owner).depositAll();
        await aLP2.connect(owner).approve(aLP2Gauge.address, oneThousand);
        await aLP2Gauge.connect(owner).depositAll();

        await expect(await aLP1.balanceOf(owner.address)).to.be.equal(0);
        await expect(await aLP1Gauge.balanceOf(owner.address)).to.be.above(0);
        await expect(await aLP2.balanceOf(owner.address)).to.be.equal(0);
        await expect(await aLP2Gauge.balanceOf(owner.address)).to.be.above(0);
    });

    it('Owner withdraws vLP1', async function () {

        await vLP1Gauge.connect(owner).withdraw(ten);
        await vLP1Gauge.connect(owner).withdrawAll();

        await expect(await vLP1.balanceOf(owner.address)).to.be.above(0);
        await expect(await vLP1Gauge.balanceOf(owner.address)).to.be.equal(0);

    });

    it('Owner withdraws sLP1', async function () {

        await sLP1Gauge.connect(owner).withdraw(ten);
        await sLP1Gauge.connect(owner).withdrawAll();

        await expect(await sLP1.balanceOf(owner.address)).to.be.above(0);
        await expect(await sLP1Gauge.balanceOf(owner.address)).to.be.equal(0);
        
    });

    it('Owner withdraws aLP1', async function () {

        await aLP1Gauge.connect(owner).withdraw(ten);
        await aLP1Gauge.connect(owner).withdrawAll();

        await expect(await aLP1.balanceOf(owner.address)).to.be.above(0);
        await expect(await aLP1Gauge.balanceOf(owner.address)).to.be.equal(0);
        
    });

    it('User1 calls deposit for owner on vLP1', async function () {

        await vLP1Gauge.connect(user1).depositFor(await vLP1.balanceOf(owner.address), owner.address);

        await expect(await vLP1.balanceOf(owner.address)).to.be.equal(0);
        await expect(await vLP1Gauge.balanceOf(owner.address)).to.be.above(0);
        
    });

    it('User1 calls deposit for owner on sLP1', async function () {

        await sLP1Gauge.connect(user1).depositFor(await sLP1.balanceOf(owner.address), owner.address);

        await expect(await sLP1.balanceOf(owner.address)).to.be.equal(0);
        await expect(await sLP1Gauge.balanceOf(owner.address)).to.be.above(0);
        
    });

    it('User1 calls deposit for owner on aLP1', async function () {

        await aLP1Gauge.connect(user1).depositFor(await aLP1.balanceOf(owner.address), owner.address);

        await expect(await aLP1.balanceOf(owner.address)).to.be.equal(0);
        await expect(await aLP1Gauge.balanceOf(owner.address)).to.be.above(0);
        
    });

    it('User1 votes 100 on vLP1 and 100 on vLP2', async function () {

        await vGaugeProxy.connect(user1).vote([vLP1.address, vLP2.address], [oneHundred, oneHundred]);
        
        await expect(await vLP1Bribe.balanceOf(user1.address)).to.be.above(0);
        await expect(await vLP1Bribe.balanceOf(user1.address)).to.be.equal(await vGaugeProxy.votes(user1.address, vLP1.address));
        await expect(await vLP2Bribe.balanceOf(user1.address)).to.be.above(0);
        await expect(await vLP2Bribe.balanceOf(user1.address)).to.be.equal(await vGaugeProxy.votes(user1.address, vLP2.address));
        
    });

    it('Owner pokes user1', async function () {

        await vGaugeProxy.connect(owner).poke(user1.address);
        
        await expect(await vLP1Bribe.balanceOf(user1.address)).to.be.above(0);
        await expect(await vLP1Bribe.balanceOf(user1.address)).to.be.equal(await vGaugeProxy.votes(user1.address, vLP1.address));
        await expect(await vLP2Bribe.balanceOf(user1.address)).to.be.above(0);
        await expect(await vLP2Bribe.balanceOf(user1.address)).to.be.equal(await vGaugeProxy.votes(user1.address, vLP2.address));
        
    });

    it('User2 votes 100 on vLP1 and 100 on vLP2', async function () {

        await vGaugeProxy.connect(user2).vote([vLP1.address, vLP2.address], [oneHundred, oneHundred]);
        
        await expect(await vLP1Bribe.balanceOf(user2.address)).to.be.above(0);
        await expect(await vLP1Bribe.balanceOf(user2.address)).to.be.equal(await vGaugeProxy.votes(user2.address, vLP1.address));
        await expect(await vLP2Bribe.balanceOf(user2.address)).to.be.above(0);
        await expect(await vLP2Bribe.balanceOf(user2.address)).to.be.equal(await vGaugeProxy.votes(user2.address, vLP2.address));
        
    });

    it('User1 votes 100 on sLP1 and 100 on sLP2', async function () {

        await sGaugeProxy.connect(user1).vote([sLP1.address, sLP2.address], [oneHundred, oneHundred]);
        
        await expect(await sLP1Bribe.balanceOf(user1.address)).to.be.above(0);
        await expect(await sLP1Bribe.balanceOf(user1.address)).to.be.equal(await sGaugeProxy.votes(user1.address, sLP1.address));
        await expect(await sLP2Bribe.balanceOf(user1.address)).to.be.above(0);
        await expect(await sLP2Bribe.balanceOf(user1.address)).to.be.equal(await sGaugeProxy.votes(user1.address, sLP2.address));
        
    });

    it('Owner pokes user1', async function () {

        await sGaugeProxy.connect(owner).poke(user1.address);
        
        await expect(await sLP1Bribe.balanceOf(user1.address)).to.be.above(0);
        await expect(await sLP1Bribe.balanceOf(user1.address)).to.be.equal(await sGaugeProxy.votes(user1.address, sLP1.address));
        await expect(await sLP2Bribe.balanceOf(user1.address)).to.be.above(0);
        await expect(await sLP2Bribe.balanceOf(user1.address)).to.be.equal(await sGaugeProxy.votes(user1.address, sLP2.address));
        
    });

    it('User2 votes 100 on sLP1 and 100 on sLP2', async function () {

        await sGaugeProxy.connect(user2).vote([sLP1.address, sLP2.address], [oneHundred, oneHundred]);
        
        await expect(await sLP1Bribe.balanceOf(user2.address)).to.be.above(0);
        await expect(await sLP1Bribe.balanceOf(user2.address)).to.be.equal(await sGaugeProxy.votes(user2.address, sLP1.address));
        await expect(await sLP2Bribe.balanceOf(user2.address)).to.be.above(0);
        await expect(await sLP2Bribe.balanceOf(user2.address)).to.be.equal(await sGaugeProxy.votes(user2.address, sLP2.address));
        
    });

    it('User2 resets votes of variable Gauge Proxy', async function () {

        await vGaugeProxy.connect(user2).reset();
        
        await expect(await vLP1Bribe.balanceOf(user2.address)).to.be.equal(0);
        await expect(await vLP1Bribe.balanceOf(user2.address)).to.be.equal(await vGaugeProxy.votes(user2.address, vLP1.address));
        await expect(await vLP2Bribe.balanceOf(user2.address)).to.be.equal(0);
        await expect(await vLP2Bribe.balanceOf(user2.address)).to.be.equal(await vGaugeProxy.votes(user2.address, vLP2.address));
        
    });

    it('User2 resets votes of stable Gauge Proxy', async function () {

        await sGaugeProxy.connect(user2).reset();
        
        await expect(await sLP1Bribe.balanceOf(user2.address)).to.be.equal(0);
        await expect(await sLP1Bribe.balanceOf(user2.address)).to.be.equal(await sGaugeProxy.votes(user2.address, sLP1.address));
        await expect(await sLP2Bribe.balanceOf(user2.address)).to.be.equal(0);
        await expect(await sLP2Bribe.balanceOf(user2.address)).to.be.equal(await sGaugeProxy.votes(user2.address, sLP2.address));
        
    });

    it('User2 revotes 100 on vLP1 and 100 on vLP2', async function () {

        await expect(vGaugeProxy.connect(user2).vote([vLP1.address, vLP2.address], [oneHundred, oneHundred])).to.be.reverted;
        
        await expect(await vLP1Bribe.balanceOf(user2.address)).to.be.equal(0);
        await expect(await vLP1Bribe.balanceOf(user2.address)).to.be.equal(await vGaugeProxy.votes(user2.address, vLP1.address));
        await expect(await vLP2Bribe.balanceOf(user2.address)).to.be.equal(0);
        await expect(await vLP2Bribe.balanceOf(user2.address)).to.be.equal(await vGaugeProxy.votes(user2.address, vLP2.address));
        
    });

    it('User2 revotes 100 on sLP1 and 100 on sLP2', async function () {

        await expect(sGaugeProxy.connect(user2).vote([sLP1.address, sLP2.address], [oneHundred, oneHundred])).to.be.revertedWith("You voted in the last 7 days");
        
        await expect(await sLP1Bribe.balanceOf(user2.address)).to.be.equal(0);
        await expect(await sLP1Bribe.balanceOf(user2.address)).to.be.equal(await sGaugeProxy.votes(user2.address, sLP1.address));
        await expect(await sLP2Bribe.balanceOf(user2.address)).to.be.equal(0);
        await expect(await sLP2Bribe.balanceOf(user2.address)).to.be.equal(await sGaugeProxy.votes(user2.address, sLP2.address));
        
    });

    it('Forward time by 7 days', async function () {
        await network.provider.send('evm_increaseTime', [7*24*3600]); 
        await network.provider.send('evm_mine');
    });

    it('User2 revotes 100 on vLP1 and 100 on vLP2', async function () {

        await vGaugeProxy.connect(user2).vote([vLP1.address, vLP2.address], [oneHundred, oneHundred]);
        
        await expect(await vLP1Bribe.balanceOf(user2.address)).to.be.above(0);
        await expect(await vLP1Bribe.balanceOf(user2.address)).to.be.equal(await vGaugeProxy.votes(user2.address, vLP1.address));
        await expect(await vLP2Bribe.balanceOf(user2.address)).to.be.above(0);
        await expect(await vLP2Bribe.balanceOf(user2.address)).to.be.equal(await vGaugeProxy.votes(user2.address, vLP2.address));
        
    });

    it('User2 revotes 100 on sLP1 and 100 on sLP2', async function () {

        await sGaugeProxy.connect(user2).vote([sLP1.address, sLP2.address], [oneHundred, oneHundred]);
        
        await expect(await sLP1Bribe.balanceOf(user2.address)).to.be.above(0);
        await expect(await sLP1Bribe.balanceOf(user2.address)).to.be.equal(await sGaugeProxy.votes(user2.address, sLP1.address));
        await expect(await sLP2Bribe.balanceOf(user2.address)).to.be.above(0);
        await expect(await sLP2Bribe.balanceOf(user2.address)).to.be.equal(await sGaugeProxy.votes(user2.address, sLP2.address));
        
    });

    it('Fill Gauge Proxy with SPIRIT for 10 blocks', async function () {
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

        let pendingSPIRITVGP = await masterChef.pendingSpirit(0, vGaugeProxy.address);
        let pendingSPIRITSGP = await masterChef.pendingSpirit(1, sGaugeProxy.address);
        let pendingSPIRITAGP = await masterChef.pendingSpirit(2, aGaugeProxy.address);

        await expect(pendingSPIRITVGP).to.be.above(0);
        await expect(pendingSPIRITSGP).to.be.above(0);
        await expect(pendingSPIRITAGP).to.be.above(0);
    });

    it('Owner calls preDistristribute on variable gauge proxies', async function () {
        await vGaugeProxy.preDistribute();

        let votesvLP1 = await vGaugeProxy.weights(vLP1.address);
        let votesvLP2 = await vGaugeProxy.weights(vLP2.address);
        let totalVotesV = await vGaugeProxy.totalWeight();
        let lockedVotesvLP1 = await vGaugeProxy.lockedWeights(vLP1.address);
        let lockedVotesvLP2 = await vGaugeProxy.lockedWeights(vLP2.address);
        let lockedTotalVotesV = await vGaugeProxy.lockedTotalWeight();
        let vGaugeProxySPIRIT = await SPIRIT.balanceOf(vGaugeProxy.address);

        await expect(lockedVotesvLP1).to.be.equal(votesvLP1);
        await expect(lockedVotesvLP2).to.be.equal(votesvLP2);
        await expect(lockedTotalVotesV).to.be.equal(totalVotesV);
        await expect(vGaugeProxySPIRIT).to.be.above(0);

    });

    it('User1 calls preDistristribute on variable gauge proxies', async function () {
        await expect(vGaugeProxy.connect(user1).preDistribute()).to.be.reverted;

    });

    it('Owner calls preDistristribute on stable gauge proxies', async function () {
        await sGaugeProxy.preDistribute();

        let votessLP1 = await sGaugeProxy.weights(sLP1.address);
        let votessLP2 = await sGaugeProxy.weights(sLP2.address);
        let totalVotesS = await sGaugeProxy.totalWeight();
        let lockedVotessLP1 = await sGaugeProxy.lockedWeights(sLP1.address);
        let lockedVotessLP2 = await sGaugeProxy.lockedWeights(sLP2.address);
        let lockedTotalVotesS = await sGaugeProxy.lockedTotalWeight();
        let sGaugeProxySPIRIT = await SPIRIT.balanceOf(sGaugeProxy.address);

        await expect(lockedVotessLP1).to.be.equal(votessLP1);
        await expect(lockedVotessLP2).to.be.equal(votessLP2);
        await expect(lockedTotalVotesS).to.be.equal(totalVotesS);
        await expect(sGaugeProxySPIRIT).to.be.above(0);

    });

    it('User1 calls preDistristribute on stable gauge proxies', async function () {
        await expect(sGaugeProxy.connect(user1).preDistribute()).to.be.reverted;
    });

    it('Owner calls distribute to all gauges', async function () {
        await vGaugeProxy.distribute(0,2);
        await sGaugeProxy.distribute(0,2);
        await aGaugeProxy.distribute();

        await expect(await SPIRIT.balanceOf(vLP1Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(vLP2Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(sLP1Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(sLP2Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(aLP1Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(aLP2Gauge.address)).to.be.above(0);
       
    });

    it('Reward per token tests', async function () {

        await network.provider.send('evm_increaseTime', [1*3600]); 
        await network.provider.send('evm_mine');

        await expect(await vLP1Gauge.rewardPerToken()).to.be.above(0);
        await expect(await vLP2Gauge.rewardPerToken()).to.be.above(0);
        await expect(await sLP1Gauge.rewardPerToken()).to.be.above(0);
        await expect(await sLP2Gauge.rewardPerToken()).to.be.above(0);
        await expect(await aLP1Gauge.rewardPerToken()).to.be.above(0);
        await expect(await aLP2Gauge.rewardPerToken()).to.be.above(0);
    });

    it('Reward for duration tests', async function () {

        await network.provider.send('evm_increaseTime', [1*3600]); 
        await network.provider.send('evm_mine');

        await expect(await vLP1Gauge.getRewardForDuration()).to.be.above(0);
        await expect(await vLP2Gauge.getRewardForDuration()).to.be.above(0);
        await expect(await sLP1Gauge.getRewardForDuration()).to.be.above(0);
        await expect(await sLP2Gauge.getRewardForDuration()).to.be.above(0);
        await expect(await aLP1Gauge.getRewardForDuration()).to.be.above(0);
        await expect(await aLP2Gauge.getRewardForDuration()).to.be.above(0);
    });

    it('Owner variable swap from WETH to TK1', async function () {
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
    });

    it('Owner starts voting fees on vLP1Bribe', async function () {

        let beforeWETH = await WETH.balanceOf(vLP1Bribe.address);
        let beforeTK1 = await TK1.balanceOf(vLP1Bribe.address);

        await vLP1Gauge.claimVotingFees();

        let afterWETH = await WETH.balanceOf(vLP1Bribe.address);
        let afterTK1 = await TK1.balanceOf(vLP1Bribe.address);

        await expect(afterWETH).to.be.above(beforeWETH);
        await expect(afterTK1).to.be.above(beforeTK1);

    });

    it('Owner variable swap from WETH to TK1', async function () {
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
    });

    it('Owner starts voting fees on vLP1Bribe', async function () {

        let beforeWETH = await WETH.balanceOf(vLP1Bribe.address);
        let beforeTK1 = await TK1.balanceOf(vLP1Bribe.address);

        await vLP1Gauge.claimVotingFees();

        let afterWETH = await WETH.balanceOf(vLP1Bribe.address);
        let afterTK1 = await TK1.balanceOf(vLP1Bribe.address);

        await expect(afterWETH).to.be.equal(beforeWETH);
        await expect(afterTK1).to.be.equal(beforeTK1);

    });

    it('Reward for duration bribe test', async function () {

        await expect(await vLP1Bribe.getRewardForDuration(WETH.address)).to.be.above(0);
        await expect(await vLP1Bribe.getRewardForDuration(TK1.address)).to.be.above(0);

    });

    it('Owner stable swap from USDC to USD1', async function () {
        await USDC.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USDC.address, USD1.address, true, owner.address, 1685083888);
        await USD1.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USD1.address, USDC.address, true, owner.address, 1685083888);
        await USDC.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USDC.address, USD1.address, true, owner.address, 1685083888);
        await USD1.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USD1.address, USDC.address, true, owner.address, 1685083888);
        await USDC.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USDC.address, USD1.address, true, owner.address, 1685083888);
        await USD1.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USD1.address, USDC.address, true, owner.address, 1685083888);
        await USDC.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USDC.address, USD1.address, true, owner.address, 1685083888);
        await USD1.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USD1.address, USDC.address, true, owner.address, 1685083888);
        await USDC.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USDC.address, USD1.address, true, owner.address, 1685083888);
        await USD1.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USD1.address, USDC.address, true, owner.address, 1685083888);
    });

    it('Owner starts voting fees on sLP1Bribe', async function () {

        let beforeUSDC = await USDC.balanceOf(sLP1Bribe.address);
        let beforeUSD1 = await USD1.balanceOf(sLP1Bribe.address);

        await sLP1Gauge.claimVotingFees();

        let afterUSDC = await USDC.balanceOf(sLP1Bribe.address);
        let afterUSD1 = await USD1.balanceOf(sLP1Bribe.address);

        await expect(afterUSDC).to.be.above(beforeUSDC);
        await expect(afterUSD1).to.be.above(beforeUSD1);
    });

    it('Owner stable swap from USDC to USD1', async function () {
        await USDC.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USDC.address, USD1.address, true, owner.address, 1685083888);
        await USD1.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USD1.address, USDC.address, true, owner.address, 1685083888);
    });

    it('Owner starts voting fees on sLP1Bribe', async function () {

        let beforeUSDC = await USDC.balanceOf(sLP1Bribe.address);
        let beforeUSD1 = await USD1.balanceOf(sLP1Bribe.address);

        await sLP1Gauge.claimVotingFees();

        let afterUSDC = await USDC.balanceOf(sLP1Bribe.address);
        let afterUSD1 = await USD1.balanceOf(sLP1Bribe.address);

        await expect(afterUSDC).to.be.equal(beforeUSDC);
        await expect(afterUSD1).to.be.equal(beforeUSD1);
    });

    it('Reward for duration bribe test', async function () {

        await expect(await sLP1Bribe.getRewardForDuration(USDC.address)).to.be.above(0);
        await expect(await sLP1Bribe.getRewardForDuration(USD1.address)).to.be.above(0);

    });

    it('Owner variable swap from WETH to USDC', async function () {
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, USDC.address, false, owner.address, 1685083888);
        await USDC.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USDC.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, USDC.address, false, owner.address, 1685083888);
        await USDC.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USDC.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, USDC.address, false, owner.address, 1685083888);
        await USDC.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USDC.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, USDC.address, false, owner.address, 1685083888);
        await USDC.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USDC.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, USDC.address, false, owner.address, 1685083888);
        await USDC.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USDC.address, WETH.address, false, owner.address, 1685083888);
    });

    it('Owner claims voting fees of aLP2Gauge', async function () {

        let beforeWETH = await WETH.balanceOf(treasury.address);
        let beforeUSDC = await USDC.balanceOf(treasury.address);

        await aLP2Gauge.claimVotingFees();

        let afterWETH = await WETH.balanceOf(treasury.address);
        let afterUSDC = await USDC.balanceOf(treasury.address);

        await expect(afterWETH).to.be.above(beforeWETH);
        await expect(afterUSDC).to.be.above(beforeUSDC);
    });

    it('Owner variable swap from WETH to USDC', async function () {
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, USDC.address, false, owner.address, 1685083888);
        await USDC.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USDC.address, WETH.address, false, owner.address, 1685083888);
    });

    it('Owner claims voting fees of aLP2Gauge', async function () {

        let beforeWETH = await WETH.balanceOf(treasury.address);
        let beforeUSDC = await USDC.balanceOf(treasury.address);

        await aLP2Gauge.claimVotingFees();

        let afterWETH = await WETH.balanceOf(treasury.address);
        let afterUSDC = await USDC.balanceOf(treasury.address);

        await expect(afterWETH).to.be.above(beforeWETH);
        await expect(afterUSDC).to.be.above(beforeUSDC);
    });

    it('Owner nominates owner of vLP1Bribe as protocol1', async function () {

        let beforeOwner = await vLP1Bribe.owner();
        await vLP1Bribe.nominateNewOwner(protocol1.address);
        let afterOwner = await vLP1Bribe.owner();
        await expect(beforeOwner).to.be.equal(afterOwner);

    });

    it('protocol1 accepts ownership of vLP1Bribe', async function () {

        let beforeOwner = await vLP1Bribe.owner();
        await vLP1Bribe.connect(protocol1).acceptOwnership();
        let afterOwner = await vLP1Bribe.owner();
        await expect(afterOwner).to.be.equal(protocol1.address);

    });

    it('protocol1 recovers erc20 from vLP1Bribe', async function () {

        await USDC.connect(owner).transfer(vLP1Bribe.address, ten);
        await vLP1Bribe.connect(protocol1).recoverERC20(USDC.address, ten);
        await expect(await USDC.balanceOf(vLP1Bribe.address)).to.be.equal(0);

    });

    it('gauge proxy tokens test', async function () {

        await vGaugeProxy.tokens();
        await vGaugeProxy.length();
        await sGaugeProxy.tokens();
        await sGaugeProxy.length();
        await aGaugeProxy.tokens();
        await aGaugeProxy.length();

    });

    it('Change owner of vGaugeProxy to protocol1', async function () {

        await vGaugeProxy.setGovernance(protocol1.address);
        await expect(await vGaugeProxy.governance()).to.be.equal(owner.address);

    });

    it('protocol1 accept vGaugeProxy governance', async function () {

        await vGaugeProxy.connect(protocol1).acceptGovernance();
        await expect(await vGaugeProxy.governance()).to.be.equal(protocol1.address);

    });

    it('protocol1 adds a gauge for vLP3', async function () {

        await vGaugeProxy.connect(protocol1).addGaugeForOwner(vLP3.address, WETH.address, USD1.address);
        let vLP3GaugeAddress = await vGaugeProxy.getGauge(vLP3.address);
        let vLP3BribeAddress = await vGaugeProxy.getBribes(vLP3GaugeAddress);
        vLP3Gauge = await ethers.getContractAt("contracts/SpiritV2/VariableGaugeProxy.sol:Gauge", vLP3GaugeAddress);
        vLP3Bribe = await ethers.getContractAt("contracts/SpiritV2/Bribes.sol:Bribe", vLP3BribeAddress);
        await vLP3.connect(owner).approve(vLP3Gauge.address, oneThousand);
        await vLP3Gauge.connect(owner).depositAll();
    });

    it('Owner variable swap from WETH to USD1', async function () {
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, USD1.address, false, owner.address, 1685083888);
        await USD1.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USD1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, USD1.address, false, owner.address, 1685083888);
        await USD1.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USD1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, USD1.address, false, owner.address, 1685083888);
        await USD1.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USD1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, USD1.address, false, owner.address, 1685083888);
        await USD1.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USD1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, USD1.address, false, owner.address, 1685083888);
        await USD1.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USD1.address, WETH.address, false, owner.address, 1685083888);
    });

    it('Owner claims voting fees of vLP3Gauge', async function () {

        let beforeWETH = await WETH.balanceOf(vLP3Bribe.address);
        let beforeUSD1 = await USD1.balanceOf(vLP3Bribe.address);

        await vLP3Gauge.claimVotingFees();

        let afterWETH = await WETH.balanceOf(vLP3Bribe.address);
        let afterUSD1 = await USD1.balanceOf(vLP3Bribe.address);

        await expect(afterWETH).to.be.above(beforeWETH);
        await expect(afterUSD1).to.be.above(beforeUSD1);

        await expect(await vLP3Bribe.getRewardForDuration(WETH.address)).to.be.above(0);
        await expect(await vLP3Bribe.getRewardForDuration(USD1.address)).to.be.above(0);
    });

    it('Forward time and have owner claim gauge rewards', async function () {
        await network.provider.send('evm_increaseTime', [7*24*3600]); 
        await network.provider.send('evm_mine');

        await vLP1Gauge.connect(owner).getReward();
        await vLP2Gauge.connect(owner).getReward();
        await sLP1Gauge.connect(owner).getReward();
        await sLP2Gauge.connect(owner).getReward();
        await aLP1Gauge.connect(owner).getReward();
        await aLP2Gauge.connect(owner).getReward();

        await expect(await vLP1Gauge.earned(owner.address)).to.equal(0);
        await expect(await vLP2Gauge.earned(owner.address)).to.equal(0);
        await expect(await sLP1Gauge.earned(owner.address)).to.equal(0);
        await expect(await sLP2Gauge.earned(owner.address)).to.equal(0);
        await expect(await aLP1Gauge.earned(owner.address)).to.equal(0);
        await expect(await aLP2Gauge.earned(owner.address)).to.equal(0);
    });

    it('Protocol1 deprecates vLP2Gauge', async function () {

        await vGaugeProxy.connect(protocol1).deprecateGauge(vLP2.address);
    });

    it('Fill Gauge Proxy with SPIRIT for 10 blocks', async function () {
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

        let pendingSPIRITVGP = await masterChef.pendingSpirit(0, vGaugeProxy.address);
        let pendingSPIRITSGP = await masterChef.pendingSpirit(1, sGaugeProxy.address);
        let pendingSPIRITAGP = await masterChef.pendingSpirit(2, aGaugeProxy.address);

        await expect(pendingSPIRITVGP).to.be.above(0);
        await expect(pendingSPIRITSGP).to.be.above(0);
        await expect(pendingSPIRITAGP).to.be.above(0);
    });

    it('Owner calls preDistristribute on variable gauge proxies', async function () {
        await vGaugeProxy.preDistribute();

        let votesvLP1 = await vGaugeProxy.weights(vLP1.address);
        let votesvLP2 = await vGaugeProxy.weights(vLP2.address);
        let totalVotesV = await vGaugeProxy.totalWeight();
        let lockedVotesvLP1 = await vGaugeProxy.lockedWeights(vLP1.address);
        let lockedVotesvLP2 = await vGaugeProxy.lockedWeights(vLP2.address);
        let lockedTotalVotesV = await vGaugeProxy.lockedTotalWeight();
        let vGaugeProxySPIRIT = await SPIRIT.balanceOf(vGaugeProxy.address);

        await expect(lockedVotesvLP1).to.be.equal(votesvLP1);
        await expect(lockedVotesvLP2).to.be.equal(votesvLP2);
        await expect(lockedTotalVotesV).to.be.equal(totalVotesV);
        await expect(vGaugeProxySPIRIT).to.be.above(0);

    });

    it('Owner calls preDistristribute on stable gauge proxies', async function () {
        await sGaugeProxy.preDistribute();

        let votessLP1 = await sGaugeProxy.weights(sLP1.address);
        let votessLP2 = await sGaugeProxy.weights(sLP2.address);
        let totalVotesS = await sGaugeProxy.totalWeight();
        let lockedVotessLP1 = await sGaugeProxy.lockedWeights(sLP1.address);
        let lockedVotessLP2 = await sGaugeProxy.lockedWeights(sLP2.address);
        let lockedTotalVotesS = await sGaugeProxy.lockedTotalWeight();
        let sGaugeProxySPIRIT = await SPIRIT.balanceOf(sGaugeProxy.address);

        await expect(lockedVotessLP1).to.be.equal(votessLP1);
        await expect(lockedVotessLP2).to.be.equal(votessLP2);
        await expect(lockedTotalVotesS).to.be.equal(totalVotesS);
        await expect(sGaugeProxySPIRIT).to.be.above(0);

    });

    it('Owner calls distribute to all gauges', async function () {
        await vGaugeProxy.distribute(0,3);
        await sGaugeProxy.distribute(0,2);
        await aGaugeProxy.distribute();

        await expect(await SPIRIT.balanceOf(vLP1Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(vLP2Gauge.address)).to.be.below(1000000);
        await expect(await SPIRIT.balanceOf(vLP3Gauge.address)).to.be.below(1000000);
        await expect(await SPIRIT.balanceOf(sLP1Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(sLP2Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(aLP1Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(aLP2Gauge.address)).to.be.above(0);
       
    });

    it('Forward time and have owner claim gauge rewards', async function () {
        await network.provider.send('evm_increaseTime', [7*24*3600]); 
        await network.provider.send('evm_mine');

        await vLP1Gauge.connect(owner).getReward();
        await vLP2Gauge.connect(owner).getReward();
        await sLP1Gauge.connect(owner).getReward();
        await sLP2Gauge.connect(owner).getReward();
        await aLP1Gauge.connect(owner).getReward();
        await aLP2Gauge.connect(owner).getReward();

        await expect(await vLP1Gauge.earned(owner.address)).to.equal(0);
        await expect(await vLP2Gauge.earned(owner.address)).to.equal(0);
        await expect(await sLP1Gauge.earned(owner.address)).to.equal(0);
        await expect(await sLP2Gauge.earned(owner.address)).to.equal(0);
        await expect(await aLP1Gauge.earned(owner.address)).to.equal(0);
        await expect(await aLP2Gauge.earned(owner.address)).to.equal(0);
    });

    it('User1 votes 100 on vLP1 and 100 on vLP3', async function () {

        await vGaugeProxy.connect(user1).vote([vLP1.address, vLP3.address], [oneHundred, oneHundred]);
        
        await expect(await vLP1Bribe.balanceOf(user1.address)).to.be.above(0);
        await expect(await vLP1Bribe.balanceOf(user1.address)).to.be.equal(await vGaugeProxy.votes(user1.address, vLP1.address));
        await expect(await vLP2Bribe.balanceOf(user1.address)).to.be.equal(0);
        await expect(await vLP2Bribe.balanceOf(user1.address)).to.be.equal(await vGaugeProxy.votes(user1.address, vLP2.address));
        await expect(await vLP3Bribe.balanceOf(user1.address)).to.be.above(0);
        await expect(await vLP3Bribe.balanceOf(user1.address)).to.be.equal(await vGaugeProxy.votes(user1.address, vLP3.address));
        
    });

    it('Protocol1 resurrects vLP2Gauge', async function () {
        await vGaugeProxy.connect(protocol1).resurrectGauge(vLP2.address);
    });

    it('Fill Gauge Proxy with SPIRIT for 10 blocks', async function () {
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

        let pendingSPIRITVGP = await masterChef.pendingSpirit(0, vGaugeProxy.address);
        let pendingSPIRITSGP = await masterChef.pendingSpirit(1, sGaugeProxy.address);
        let pendingSPIRITAGP = await masterChef.pendingSpirit(2, aGaugeProxy.address);

        await expect(pendingSPIRITVGP).to.be.above(0);
        await expect(pendingSPIRITSGP).to.be.above(0);
        await expect(pendingSPIRITAGP).to.be.above(0);
    });

    it('Owner calls preDistristribute on variable gauge proxies', async function () {
        await vGaugeProxy.preDistribute();

        let votesvLP1 = await vGaugeProxy.weights(vLP1.address);
        let votesvLP2 = await vGaugeProxy.weights(vLP2.address);
        let totalVotesV = await vGaugeProxy.totalWeight();
        let lockedVotesvLP1 = await vGaugeProxy.lockedWeights(vLP1.address);
        let lockedVotesvLP2 = await vGaugeProxy.lockedWeights(vLP2.address);
        let lockedTotalVotesV = await vGaugeProxy.lockedTotalWeight();
        let vGaugeProxySPIRIT = await SPIRIT.balanceOf(vGaugeProxy.address);

        await expect(lockedVotesvLP1).to.be.equal(votesvLP1);
        await expect(lockedVotesvLP2).to.be.equal(votesvLP2);
        await expect(lockedTotalVotesV).to.be.equal(totalVotesV);
        await expect(vGaugeProxySPIRIT).to.be.above(0);

    });

    it('Owner calls preDistristribute on stable gauge proxies', async function () {
        await sGaugeProxy.preDistribute();

        let votessLP1 = await sGaugeProxy.weights(sLP1.address);
        let votessLP2 = await sGaugeProxy.weights(sLP2.address);
        let totalVotesS = await sGaugeProxy.totalWeight();
        let lockedVotessLP1 = await sGaugeProxy.lockedWeights(sLP1.address);
        let lockedVotessLP2 = await sGaugeProxy.lockedWeights(sLP2.address);
        let lockedTotalVotesS = await sGaugeProxy.lockedTotalWeight();
        let sGaugeProxySPIRIT = await SPIRIT.balanceOf(sGaugeProxy.address);

        await expect(lockedVotessLP1).to.be.equal(votessLP1);
        await expect(lockedVotessLP2).to.be.equal(votessLP2);
        await expect(lockedTotalVotesS).to.be.equal(totalVotesS);
        await expect(sGaugeProxySPIRIT).to.be.above(0);

    });

    it('Owner calls distribute to all gauges', async function () {
        await vGaugeProxy.distribute(0,3);
        await sGaugeProxy.distribute(0,2);
        await aGaugeProxy.distribute();

        await expect(await SPIRIT.balanceOf(vLP1Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(vLP2Gauge.address)).to.be.above(1000000);
        await expect(await SPIRIT.balanceOf(vLP3Gauge.address)).to.be.above(1000000);
        await expect(await SPIRIT.balanceOf(sLP1Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(sLP2Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(aLP1Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(aLP2Gauge.address)).to.be.above(0);
       
    });

    it('Forward time and have owner claim gauge rewards', async function () {
        await network.provider.send('evm_increaseTime', [7*24*3600]); 
        await network.provider.send('evm_mine');

        await vLP1Gauge.connect(owner).getReward();
        await vLP2Gauge.connect(owner).getReward();
        await sLP1Gauge.connect(owner).getReward();
        await sLP2Gauge.connect(owner).getReward();
        await aLP1Gauge.connect(owner).getReward();
        await aLP2Gauge.connect(owner).getReward();

        await expect(await vLP1Gauge.earned(owner.address)).to.equal(0);
        await expect(await vLP2Gauge.earned(owner.address)).to.equal(0);
        await expect(await sLP1Gauge.earned(owner.address)).to.equal(0);
        await expect(await sLP2Gauge.earned(owner.address)).to.equal(0);
        await expect(await aLP1Gauge.earned(owner.address)).to.equal(0);
        await expect(await aLP2Gauge.earned(owner.address)).to.equal(0);
    });

    it('Owner adds a gauge for sLP3', async function () {

        await sGaugeProxy.connect(owner).addGaugeForOwner(sLP3.address, WETH.address, USDC.address);
        let sLP3GaugeAddress = await sGaugeProxy.getGauge(sLP3.address);
        let sLP3BribeAddress = await sGaugeProxy.getBribes(sLP3GaugeAddress);
        sLP3Gauge = await ethers.getContractAt("contracts/SpiritV2/StableGaugeProxy.sol:Gauge", sLP3GaugeAddress);
        sLP3Bribe = await ethers.getContractAt("contracts/SpiritV2/Bribes.sol:Bribe", sLP3BribeAddress);
        await sLP3.connect(owner).approve(sLP3Gauge.address, oneThousand);
        await sLP3Gauge.connect(owner).deposit(oneHundred);
    });

    it('User1 votes 100 on sLP1 and 100 on sLP3', async function () {

        await sGaugeProxy.connect(user1).vote([sLP1.address, sLP3.address], [oneHundred, oneHundred]);
        
        await expect(await sLP1Bribe.balanceOf(user1.address)).to.be.above(0);
        await expect(await sLP1Bribe.balanceOf(user1.address)).to.be.equal(await sGaugeProxy.votes(user1.address, sLP1.address));
        await expect(await sLP2Bribe.balanceOf(user1.address)).to.be.equal(0);
        await expect(await sLP2Bribe.balanceOf(user1.address)).to.be.equal(await sGaugeProxy.votes(user1.address, sLP2.address));
        await expect(await sLP3Bribe.balanceOf(user1.address)).to.be.above(0);
        await expect(await sLP3Bribe.balanceOf(user1.address)).to.be.equal(await sGaugeProxy.votes(user1.address, sLP3.address));
        
    });

    it('Fill Gauge Proxy with SPIRIT for 10 blocks', async function () {
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

        let pendingSPIRITVGP = await masterChef.pendingSpirit(0, vGaugeProxy.address);
        let pendingSPIRITSGP = await masterChef.pendingSpirit(1, sGaugeProxy.address);
        let pendingSPIRITAGP = await masterChef.pendingSpirit(2, aGaugeProxy.address);

        await expect(pendingSPIRITVGP).to.be.above(0);
        await expect(pendingSPIRITSGP).to.be.above(0);
        await expect(pendingSPIRITAGP).to.be.above(0);
    });

    it('Owner calls preDistristribute on variable gauge proxies', async function () {
        await vGaugeProxy.preDistribute();

        let votesvLP1 = await vGaugeProxy.weights(vLP1.address);
        let votesvLP2 = await vGaugeProxy.weights(vLP2.address);
        let totalVotesV = await vGaugeProxy.totalWeight();
        let lockedVotesvLP1 = await vGaugeProxy.lockedWeights(vLP1.address);
        let lockedVotesvLP2 = await vGaugeProxy.lockedWeights(vLP2.address);
        let lockedTotalVotesV = await vGaugeProxy.lockedTotalWeight();
        let vGaugeProxySPIRIT = await SPIRIT.balanceOf(vGaugeProxy.address);

        await expect(lockedVotesvLP1).to.be.equal(votesvLP1);
        await expect(lockedVotesvLP2).to.be.equal(votesvLP2);
        await expect(lockedTotalVotesV).to.be.equal(totalVotesV);
        await expect(vGaugeProxySPIRIT).to.be.above(0);

    });

    it('Owner calls preDistristribute on stable gauge proxies', async function () {
        await sGaugeProxy.preDistribute();

        let votessLP1 = await sGaugeProxy.weights(sLP1.address);
        let votessLP2 = await sGaugeProxy.weights(sLP2.address);
        let votessLP3 = await sGaugeProxy.weights(sLP3.address);
        let totalVotesS = await sGaugeProxy.totalWeight();
        let lockedVotessLP1 = await sGaugeProxy.lockedWeights(sLP1.address);
        let lockedVotessLP2 = await sGaugeProxy.lockedWeights(sLP2.address);
        let lockedVotessLP3 = await sGaugeProxy.lockedWeights(sLP3.address);
        let lockedTotalVotesS = await sGaugeProxy.lockedTotalWeight();
        let sGaugeProxySPIRIT = await SPIRIT.balanceOf(sGaugeProxy.address);

        await expect(lockedVotessLP1).to.be.equal(votessLP1);
        await expect(lockedVotessLP2).to.be.equal(votessLP2);
        await expect(lockedVotessLP3).to.be.equal(votessLP3);
        await expect(lockedTotalVotesS).to.be.equal(totalVotesS);
        await expect(sGaugeProxySPIRIT).to.be.above(0);

    });

    it('Owner calls distribute to all gauges', async function () {
        await vGaugeProxy.distribute(0,3);
        await sGaugeProxy.distribute(0,3);
        await aGaugeProxy.distribute();

        await expect(await SPIRIT.balanceOf(vLP1Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(vLP2Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(vLP3Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(sLP1Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(sLP2Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(sLP3Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(aLP1Gauge.address)).to.be.above(0);
        await expect(await SPIRIT.balanceOf(aLP2Gauge.address)).to.be.above(0);
       
    });

    it('Forward time and have owner claim gauge rewards', async function () {
        await network.provider.send('evm_increaseTime', [7*24*3600]); 
        await network.provider.send('evm_mine');

        await vLP1Gauge.connect(owner).getReward();
        await vLP2Gauge.connect(owner).getReward();
        await vLP3Gauge.connect(owner).getReward();
        await sLP1Gauge.connect(owner).getReward();
        await sLP2Gauge.connect(owner).getReward();
        await sLP3Gauge.connect(owner).getReward();
        await aLP1Gauge.connect(owner).getReward();
        await aLP2Gauge.connect(owner).getReward();

        await expect(await vLP1Gauge.earned(owner.address)).to.equal(0);
        await expect(await vLP2Gauge.earned(owner.address)).to.equal(0);
        await expect(await vLP3Gauge.earned(owner.address)).to.equal(0);
        await expect(await sLP1Gauge.earned(owner.address)).to.equal(0);
        await expect(await sLP2Gauge.earned(owner.address)).to.equal(0);
        await expect(await sLP3Gauge.earned(owner.address)).to.equal(0);
        await expect(await aLP1Gauge.earned(owner.address)).to.equal(0);
        await expect(await aLP2Gauge.earned(owner.address)).to.equal(0);
    });

    it('Owner begins voting fees on sLP3Gauge', async function () {

        let beforeWETH = await WETH.balanceOf(sLP3Bribe.address);

        await WETH.approve(sLP3Bribe.address, oneHundred);
        await sLP3Bribe.notifyRewardAmount(WETH.address, oneHundred);

        let afterWETH = await WETH.balanceOf(sLP3Bribe.address);

        await expect(afterWETH).to.be.above(beforeWETH);

    });

    it('User1 claims bribe after 1 week', async function () {

        let beforeWETH = await WETH.balanceOf(user1.address);

        // Forward time by 1 day
        await network.provider.send('evm_increaseTime', [7*24*3600]); 
        await network.provider.send('evm_mine');

        await sGaugeProxy.connect(user1).claimBribes([sLP3Bribe.address], user1.address);

        let afterWETH = await WETH.balanceOf(user1.address)

        await expect(afterWETH).to.be.above(beforeWETH);
        
    });

    it('Protocol1 updates fee distributor address', async function () {

        await vGaugeProxy.connect(protocol1).updateFeeDistributor(treasury.address);
        await expect(await vGaugeProxy.feeDistAddr()).to.be.equal(treasury.address);
        
    });









})

