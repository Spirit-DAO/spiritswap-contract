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
let owner, admin, user1, user2, user3, user4, protocol1, protocol2, protocol3, treasury;
// contracts
let pairFactory, router, bribeFactory, feeDistributor, masterchef, spiritMaker;
let vGaugeProxy, vLP1, vLP1Fees, vLP1Gauge, vLP1Bribe, vLP2, vLP2Fees, vLP2Gauge, vLP2Bribe, vLP3, vLP3Fees, vLP3Gauge, vLP3Bribe;
let sGaugeProxy, sLP1, sLP1Fees, sLP1Gauge, sLP1Bribe, sLP2, sLP2Fees, sLP2Gauge, sLP2Bribe;
let aGaugeProxy, aLP1, aLP1Fees, aLP1Gauge, aLP2, aLP2Fees, aLP2Gauge;
// tokens
let SPIRIT, inSPIRIT, WETH, TK1, TK2, TK3, USDC, USD1, USD2;

describe("Voting Fee Testing", function () {
  
    before("Initial set up", async function () {
        console.log("Begin Initialization");

        // initialize users
        [owner, admin, user1, user2, user3, user4, protocol1, protocol2, protocol3, spiritMaker, treasury] = await ethers.getSigners();

        // initialize tokens
        // mints 1000 tokens to deployer
        const erc20Mock = await ethers.getContractFactory("ERC20Mock");
        WETH = await erc20Mock.deploy("WETH", "WETH");
        TK1 = await erc20Mock.deploy("TK1", "TK1");
        TK2 = await erc20Mock.deploy("TK2", "TK2");
        TK3 = await erc20Mock.deploy("TK3", "TK3");
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

        // Create vLP: WETH-TK2
        await WETH.connect(owner).approve(router.address, oneHundred);
        await TK2.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).addLiquidity(WETH.address, TK2.address, false, oneHundred, oneHundred, oneHundred, oneHundred, owner.address, 1685083888);

        const vLP2Address = await pairFactory.getPair(WETH.address, TK2.address, false);
        vLP2 = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Pair", vLP2Address)
        await pairFactory.connect(owner).setProtocolAddress(vLP2.address, protocol2.address);
        console.log("- vLP2 Initialized"); 

        // Create vLP: WETH-TK3
        await WETH.connect(owner).approve(router.address, oneHundred);
        await TK3.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).addLiquidity(WETH.address, TK3.address, false, oneHundred, oneHundred, oneHundred, oneHundred, owner.address, 1685083888);

        const vLP3Address = await pairFactory.getPair(WETH.address, TK3.address, false);
        vLP3 = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Pair", vLP3Address)
        await pairFactory.connect(owner).setProtocolAddress(vLP3.address, protocol2.address);
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
        await vGaugeProxy.setVerifiedToken(TK3.address, true); // Verify TK3

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

        // Add vLP3 Gauge/Bribe
        await vGaugeProxy.addGauge(vLP3.address);
        let vLP3GaugeAddress = await vGaugeProxy.getGauge(vLP3.address);
        let vLP3BribeAddress = await vGaugeProxy.getBribes(vLP3GaugeAddress);
        vLP3Gauge = await ethers.getContractAt("contracts/SpiritV2/VariableGaugeProxy.sol:Gauge", vLP3GaugeAddress);
        vLP3Bribe = await ethers.getContractAt("contracts/SpiritV2/Bribes.sol:Bribe", vLP3BribeAddress);
        console.log("- vLP3 Gauge/Bribe Initialized in vGaugeProxy");

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
        await SPIRIT.transfer(user3.address, oneThousand); // transfer SPIRIT to user2
        await SPIRIT.transfer(user4.address, oneThousand); // transfer SPIRIT to user2

        console.log("Owner deposits vLP1 into Gauge");
        await vLP1.connect(owner).approve(vLP1Gauge.address, oneThousand);
        await vLP1Gauge.connect(owner).deposit(await vLP1.balanceOf(owner.address));
        
        console.log("Initialization Complete");
    });

    it('Set new admin addr', async function () {
        await vGaugeProxy.setAdmin(admin.address);
        expect(await vGaugeProxy.admin()).to.be.equal(admin.address);
    });

    it('User1 lock SPIRIT for inSPIRIT', async function () {
        console.log("******************************************************");
        console.log("User1 locks in 1000 SPIRIT for inSPIRIT");
        await SPIRIT.connect(user1).approve(inSPIRIT.address, oneThousand);
        await inSPIRIT.connect(user1).create_lock(oneThousand, April2026);
        let user1InSpirit = await inSPIRIT['balanceOf(address)'](user1.address);
        expect(user1InSpirit).to.be.above(0);
        console.log("User1 inSPIRIT Balance", divDec(user1InSpirit));
        console.log("User1 has inSPIRIT");
    });

    it('User1 votes in GaugeProxy', async function () {
        console.log("******************************************************");
        let user1LP1Votes = await vGaugeProxy.votes(user1.address, vLP1.address);
        let user1LP2Votes = await vGaugeProxy.votes(user1.address, vLP2.address);
        let user1LP3Votes = await vGaugeProxy.votes(user1.address, vLP3.address);

        expect(user1LP1Votes.toString()).to.be.equal('0');
        expect(user1LP2Votes.toString()).to.be.equal('0');
        expect(user1LP3Votes.toString()).to.be.equal('0');
        
        console.log("User1 votes with 500 on LP1, 200 on LP2, 100 on LP3");
        let user1InSpirit = await inSPIRIT['balanceOf(address)'](user1.address);
        await vGaugeProxy.connect(user1).vote([vLP1.address, vLP2.address, vLP3.address], [fiveHundred, twoHundred, oneHundred]);

        user1LP1Votes = await vGaugeProxy.votes(user1.address, vLP1.address);
        user1LP2Votes = await vGaugeProxy.votes(user1.address, vLP2.address);
        user1LP3Votes = await vGaugeProxy.votes(user1.address, vLP3.address);

        let user1LP1BribeBal = await vLP1Bribe.balanceOf(user1.address);
        let user1LP2BribeBal = await vLP2Bribe.balanceOf(user1.address);
        let user1LP3BribeBal = await vLP3Bribe.balanceOf(user1.address);

        expect(user1LP1BribeBal).to.be.closeTo(user1LP1Votes, 1);
        expect(user1LP2BribeBal).to.be.closeTo(user1LP2Votes, 1);
        expect(user1LP3BribeBal).to.be.closeTo(user1LP3Votes, 1);

        console.log("User1 voting data");
        console.log("LP1Gauge Vote", divDec(user1LP1Votes));
        console.log("LP2Gauge Vote", divDec(user1LP2Votes));
        console.log("LP3Gauge Vote", divDec(user1LP3Votes));

        console.log("LP1Bribe Balance", divDec(user1LP1BribeBal));
        console.log("LP2Bribe Balance", divDec(user1LP2BribeBal));
        console.log("LP3Bribe Balance", divDec(user1LP3BribeBal));

        console.log("User1 has voted and vote balance is reflected in Bribe contracts");
    });

    it('User2 lock SPIRIT for inSPIRIT', async function () {
        console.log("******************************************************");
        console.log("User2 locks in 1000 SPIRIT for inSPIRIT");
        await SPIRIT.connect(user2).approve(inSPIRIT.address, oneThousand);
        await inSPIRIT.connect(user2).create_lock(oneThousand, April2026);
        let user2InSpirit = await inSPIRIT['balanceOf(address)'](user2.address);
        expect(user2InSpirit).to.be.above(0);
        console.log("User2 inSPIRIT Balance", divDec(user2InSpirit));
        console.log("User2 has inSPIRIT");
    });

    it('User2 votes in GaugeProxy', async function () {
        console.log("******************************************************");
        let user2LP1Votes = await vGaugeProxy.votes(user2.address, vLP1.address);
        let user2LP2Votes = await vGaugeProxy.votes(user2.address, vLP2.address);
        let user2LP3Votes = await vGaugeProxy.votes(user2.address, vLP3.address);

        expect(user2LP1Votes.toString()).to.be.equal('0');
        expect(user2LP2Votes.toString()).to.be.equal('0');
        expect(user2LP3Votes.toString()).to.be.equal('0');
        
        console.log("User2 votes with 100 on LP1, 100 on LP2, 100 on LP3");
        await vGaugeProxy.connect(user2).vote([vLP1.address, vLP2.address, vLP3.address], [oneHundred, oneHundred, oneHundred]);

        user2LP1Votes = await vGaugeProxy.votes(user2.address, vLP1.address);
        user2LP2Votes = await vGaugeProxy.votes(user2.address, vLP2.address);
        user2LP3Votes = await vGaugeProxy.votes(user2.address, vLP3.address);

        let user2LP1BribeBal = await vLP1Bribe.balanceOf(user2.address);
        let user2LP2BribeBal = await vLP2Bribe.balanceOf(user2.address);
        let user2LP3BribeBal = await vLP3Bribe.balanceOf(user2.address);

        expect(user2LP1BribeBal).to.be.closeTo(user2LP1Votes, 1);
        expect(user2LP2BribeBal).to.be.closeTo(user2LP2Votes, 1);
        expect(user2LP3BribeBal).to.be.closeTo(user2LP3Votes, 1);

        console.log("User2 voting data");
        console.log("LP1Gauge Vote", divDec(user2LP1Votes));
        console.log("LP2Gauge Vote", divDec(user2LP2Votes));
        console.log("LP3Gauge Vote", divDec(user2LP3Votes));

        console.log("LP1Bribe Balance", divDec(user2LP1BribeBal));
        console.log("LP2Bribe Balance", divDec(user2LP2BribeBal));
        console.log("LP3Bribe Balance", divDec(user2LP3BribeBal));

        console.log("User2 has voted and vote balance is reflected in Bribe contracts");
    });

    it('Testing Voting Weight and Bribe balances', async function () {
        console.log("******************************************************");

        let LP1VoteWeight = await vGaugeProxy.weights(vLP1.address);
        let LP2VoteWeight = await vGaugeProxy.weights(vLP2.address);
        let LP3VoteWeight = await vGaugeProxy.weights(vLP3.address);

        let LP1BribeTotalBal = await vLP1Bribe.totalSupply();
        let LP2BribeTotalBal = await vLP2Bribe.totalSupply();
        let LP3BribeTotalBal = await vLP3Bribe.totalSupply();

        expect(LP1VoteWeight).to.be.equal(LP1BribeTotalBal);
        expect(LP2VoteWeight).to.be.equal(LP2BribeTotalBal);
        expect(LP3VoteWeight).to.be.equal(LP3BribeTotalBal);

        console.log("LP1Gauge vote weight", divDec(LP1VoteWeight));
        console.log("LP2Gauge vote weight", divDec(LP2VoteWeight));
        console.log("LP3Gauge vote weight", divDec(LP3VoteWeight));

        console.log("LP1Bribe total balance", divDec(LP1BribeTotalBal));
        console.log("LP2Bribe total balance", divDec(LP2BribeTotalBal));
        console.log("LP3Bribe total balance", divDec(LP3BribeTotalBal));

        console.log("Bribe total balances match voting weights");
    });

    it('User1 revote ', async function () {
        console.log("******************************************************");
        await expect(vGaugeProxy.connect(user1).vote([vLP1.address], [oneHundred])).to.be.revertedWith("You voted in the last 7 days");
        console.log("user1 was not able to revote within 7 days of last vote");
    });

    it('Owner does a bunch of swaps on vLP1', async function () {
        console.log("******************************************************");
        console.log("Owner does a bunch of swaps on vLP1");
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);

    });

    it('Owner begins voting fees on LP1Gauge', async function () {
        console.log("******************************************************");
        console.log("BRIBE TEST #1");
        console.log("******************************************************");;

        await expect(await WETH.balanceOf(spiritMaker.address)).to.be.equal(0);
        await expect(await TK1.balanceOf(spiritMaker.address)).to.be.equal(0);

        await expect(await WETH.balanceOf(protocol1.address)).to.be.equal(0);
        await expect(await TK1.balanceOf(protocol1.address)).to.be.equal(0);

        await expect(await WETH.balanceOf(vLP1Bribe.address)).to.be.equal(0);
        await expect(await TK1.balanceOf(vLP1Bribe.address)).to.be.equal(0);

        await vLP1Gauge.claimVotingFees();

        await expect(await WETH.balanceOf(spiritMaker.address)).to.be.above(0);
        await expect(await TK1.balanceOf(spiritMaker.address)).to.be.above(0);

        await expect(await WETH.balanceOf(protocol1.address)).to.be.above(0);
        await expect(await TK1.balanceOf(protocol1.address)).to.be.above(0);

        await expect(await WETH.balanceOf(vLP1Bribe.address)).to.be.above(0);
        await expect(await TK1.balanceOf(vLP1Bribe.address)).to.be.above(0);

        let rewardRateWETH = (await vLP1Bribe.rewardData(WETH.address)).rewardRate;
        let rewardRateTK1 = (await vLP1Bribe.rewardData(TK1.address)).rewardRate;

        console.log("WETH/s", divDec(rewardRateWETH));
        console.log("TK1/s", divDec(rewardRateTK1));
    });

    it('User2 claims bribe after 1 day', async function () {
        console.log("******************************************************");

        // Forward time by 1 day
        await network.provider.send('evm_increaseTime', [24*3600]); 
        await network.provider.send('evm_mine');

        await vGaugeProxy.connect(user2).claimBribes([vLP1Bribe.address], user2.address);
        let user2WETH = await WETH.balanceOf(user2.address)
        let user2TK1 = await TK1.balanceOf(user2.address)
        console.log("User2 WETH balance after claim", divDec(user2WETH));
        console.log("User2 TK1 balance after claim", divDec(user2TK1));
        expect(user2WETH).to.be.above(0);
        expect(user2TK1).to.be.above(0);
    });

    it('User1 claims bribe after 1 day', async function () {
        console.log("******************************************************");

        // Forward time by 1 day
        await network.provider.send('evm_increaseTime', [24*3600]); 
        await network.provider.send('evm_mine');

        await vGaugeProxy.connect(user1).claimBribes([vLP1Bribe.address], user1.address);
        let user1WETH = await WETH.balanceOf(user1.address)
        let user1TK1 = await TK1.balanceOf(user1.address)
        console.log("User1 WETH balance after claim", divDec(user1WETH));
        console.log("User1 TK1 balance after claim", divDec(user1TK1));
        expect(user1WETH).to.be.above(0);
        expect(user1TK1).to.be.above(0);
    });

    it('User1 and User2 claim bribe after 2 weeks', async function () {
        console.log("******************************************************");

        // Forward time by 1 day
        await network.provider.send('evm_increaseTime', [14*24*3600]); 
        await network.provider.send('evm_mine');

        await vGaugeProxy.connect(user1).claimBribes([vLP1Bribe.address], user1.address);
        await vGaugeProxy.connect(user2).claimBribes([vLP1Bribe.address], user2.address);
        let user1WETH = await WETH.balanceOf(user1.address)
        let user1TK1 = await TK1.balanceOf(user1.address)
        let user2WETH = await WETH.balanceOf(user2.address)
        let user2TK1 = await TK1.balanceOf(user2.address)
        console.log("User1 WETH balance after claim", divDec(user1WETH));
        console.log("User1 TK1 balance after claim", divDec(user1TK1));
        console.log("User2 WETH balance after claim", divDec(user2WETH));
        console.log("User2 TK1 balance after claim", divDec(user2TK1));
        expect(user1WETH).to.be.above(0);
        expect(user1TK1).to.be.above(0);
        expect(user2WETH).to.be.above(0);
        expect(user2TK1).to.be.above(0);
    });

    it('Send all tokens from everyone back to owner', async function () {
        console.log("******************************************************");

        await WETH.connect(user1).transfer(owner.address, await WETH.balanceOf(user1.address));
        await WETH.connect(user2).transfer(owner.address, await WETH.balanceOf(user2.address));
        await WETH.connect(treasury).transfer(owner.address, await WETH.balanceOf(treasury.address));
        await WETH.connect(spiritMaker).transfer(owner.address, await WETH.balanceOf(spiritMaker.address));
        await WETH.connect(protocol1).transfer(owner.address, await WETH.balanceOf(protocol1.address));

        await TK1.connect(user1).transfer(owner.address, await TK1.balanceOf(user1.address));
        await TK1.connect(user2).transfer(owner.address, await TK1.balanceOf(user2.address));
        await TK1.connect(treasury).transfer(owner.address, await TK1.balanceOf(treasury.address));
        await TK1.connect(spiritMaker).transfer(owner.address, await TK1.balanceOf(spiritMaker.address));
        await TK1.connect(protocol1).transfer(owner.address, await TK1.balanceOf(protocol1.address));

    });

    it('Owner does a bunch of swaps on vLP1', async function () {
        console.log("******************************************************");
        console.log("Owner does a bunch of swaps on vLP1");
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);

    });

    it('Owner begins voting fees on LP1Gauge', async function () {
        console.log("******************************************************");
        console.log("BRIBE TEST #2");
        console.log("******************************************************");;

        await expect(await WETH.balanceOf(spiritMaker.address)).to.be.equal(0);
        await expect(await TK1.balanceOf(spiritMaker.address)).to.be.equal(0);

        await expect(await WETH.balanceOf(protocol1.address)).to.be.equal(0);
        await expect(await TK1.balanceOf(protocol1.address)).to.be.equal(0);

        await vLP1Gauge.claimVotingFees();

        await expect(await WETH.balanceOf(spiritMaker.address)).to.be.above(0);
        await expect(await TK1.balanceOf(spiritMaker.address)).to.be.above(0);

        await expect(await WETH.balanceOf(protocol1.address)).to.be.above(0);
        await expect(await TK1.balanceOf(protocol1.address)).to.be.above(0);

        await expect(await WETH.balanceOf(vLP1Bribe.address)).to.be.above(0);
        await expect(await TK1.balanceOf(vLP1Bribe.address)).to.be.above(0);

        let rewardRateWETH = (await vLP1Bribe.rewardData(WETH.address)).rewardRate;
        let rewardRateTK1 = (await vLP1Bribe.rewardData(TK1.address)).rewardRate;

        console.log("WETH/s", divDec(rewardRateWETH));
        console.log("TK1/s", divDec(rewardRateTK1));
    });

    it('User2 claims bribe after 2 days', async function () {
        console.log("******************************************************");

        // Forward time by 2 day
        await network.provider.send('evm_increaseTime', [2*24*3600]); 
        await network.provider.send('evm_mine');

        await vGaugeProxy.connect(user2).claimBribes([vLP1Bribe.address], user2.address);
        let user2WETH = await WETH.balanceOf(user2.address)
        let user2TK1 = await TK1.balanceOf(user2.address)
        console.log("User2 WETH balance after claim", divDec(user2WETH));
        console.log("User2 TK1 balance after claim", divDec(user2TK1));
        expect(user2WETH).to.be.above(0);
        expect(user2TK1).to.be.above(0);
    });

    it('Owner does a bunch of swaps on vLP1', async function () {
        console.log("******************************************************");
        console.log("Owner does a bunch of swaps on vLP1");
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);

    });

    it('Owner begins voting fees on LP1Gauge', async function () {
        console.log("******************************************************");

        await vLP1Gauge.claimVotingFees();

        let rewardRateWETH = (await vLP1Bribe.rewardData(WETH.address)).rewardRate;
        let rewardRateTK1 = (await vLP1Bribe.rewardData(TK1.address)).rewardRate;

        console.log("WETH/s", divDec(rewardRateWETH));
        console.log("TK1/s", divDec(rewardRateTK1));
    });

    it('User2 claims bribe after 2 days', async function () {
        console.log("******************************************************");

        // Forward time by 2 day
        await network.provider.send('evm_increaseTime', [2*24*3600]); 
        await network.provider.send('evm_mine');

        await vGaugeProxy.connect(user2).claimBribes([vLP1Bribe.address], user2.address);
        let user2WETH = await WETH.balanceOf(user2.address)
        let user2TK1 = await TK1.balanceOf(user2.address)
        console.log("User2 WETH balance after claim", divDec(user2WETH));
        console.log("User2 TK1 balance after claim", divDec(user2TK1));
        expect(user2WETH).to.be.above(0);
        expect(user2TK1).to.be.above(0);
    });

    it('User1 and User2 claim bribe after 2 weeks', async function () {
        console.log("******************************************************");

        // Forward time by 1 day
        await network.provider.send('evm_increaseTime', [14*24*3600]); 
        await network.provider.send('evm_mine');

        await vGaugeProxy.connect(user1).claimBribes([vLP1Bribe.address], user1.address);
        await vGaugeProxy.connect(user2).claimBribes([vLP1Bribe.address], user2.address);
        let user1WETH = await WETH.balanceOf(user1.address)
        let user1TK1 = await TK1.balanceOf(user1.address)
        let user2WETH = await WETH.balanceOf(user2.address)
        let user2TK1 = await TK1.balanceOf(user2.address)
        console.log("User1 WETH balance after claim", divDec(user1WETH));
        console.log("User1 TK1 balance after claim", divDec(user1TK1));
        console.log("User2 WETH balance after claim", divDec(user2WETH));
        console.log("User2 TK1 balance after claim", divDec(user2TK1));
        expect(user1WETH).to.be.above(0);
        expect(user1TK1).to.be.above(0);
        expect(user2WETH).to.be.above(0);
        expect(user2TK1).to.be.above(0);
    });

    it('Send all tokens from everyone back to owner', async function () {
        console.log("******************************************************");

        await WETH.connect(user1).transfer(owner.address, await WETH.balanceOf(user1.address));
        await WETH.connect(user2).transfer(owner.address, await WETH.balanceOf(user2.address));
        await WETH.connect(treasury).transfer(owner.address, await WETH.balanceOf(treasury.address));
        await WETH.connect(spiritMaker).transfer(owner.address, await WETH.balanceOf(spiritMaker.address));
        await WETH.connect(protocol1).transfer(owner.address, await WETH.balanceOf(protocol1.address));

        await TK1.connect(user1).transfer(owner.address, await TK1.balanceOf(user1.address));
        await TK1.connect(user2).transfer(owner.address, await TK1.balanceOf(user2.address));
        await TK1.connect(treasury).transfer(owner.address, await TK1.balanceOf(treasury.address));
        await TK1.connect(spiritMaker).transfer(owner.address, await TK1.balanceOf(spiritMaker.address));
        await TK1.connect(protocol1).transfer(owner.address, await TK1.balanceOf(protocol1.address));

    });

    it('Owner does a bunch of swaps on vLP1', async function () {
        console.log("******************************************************");
        console.log("Owner does a bunch of swaps on vLP1");
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);

    });

    it('Owner begins voting fees on LP1Gauge', async function () {
        console.log("******************************************************");
        console.log("BRIBE TEST #2");
        console.log("******************************************************");;

        await expect(await WETH.balanceOf(spiritMaker.address)).to.be.equal(0);
        await expect(await TK1.balanceOf(spiritMaker.address)).to.be.equal(0);

        await expect(await WETH.balanceOf(protocol1.address)).to.be.equal(0);
        await expect(await TK1.balanceOf(protocol1.address)).to.be.equal(0);

        await vLP1Gauge.claimVotingFees();

        await expect(await WETH.balanceOf(spiritMaker.address)).to.be.above(0);
        await expect(await TK1.balanceOf(spiritMaker.address)).to.be.above(0);

        await expect(await WETH.balanceOf(protocol1.address)).to.be.above(0);
        await expect(await TK1.balanceOf(protocol1.address)).to.be.above(0);

        await expect(await WETH.balanceOf(vLP1Bribe.address)).to.be.above(0);
        await expect(await TK1.balanceOf(vLP1Bribe.address)).to.be.above(0);

        let rewardRateWETH = (await vLP1Bribe.rewardData(WETH.address)).rewardRate;
        let rewardRateTK1 = (await vLP1Bribe.rewardData(TK1.address)).rewardRate;

        console.log("WETH/s", divDec(rewardRateWETH));
        console.log("TK1/s", divDec(rewardRateTK1));
    });

    it('User1 claims bribe after 2 days', async function () {
        console.log("******************************************************");

        // Forward time by 2 day
        await network.provider.send('evm_increaseTime', [2*24*3600]); 
        await network.provider.send('evm_mine');

        await vGaugeProxy.connect(user1).claimBribes([vLP1Bribe.address], user1.address);
        let user1WETH = await WETH.balanceOf(user1.address)
        let user1TK1 = await TK1.balanceOf(user1.address)
        console.log("User1 WETH balance after claim", divDec(user1WETH));
        console.log("User1 TK1 balance after claim", divDec(user1TK1));
        expect(user1WETH).to.be.above(0);
        expect(user1TK1).to.be.above(0);
    });

    it('User3 lock SPIRIT for inSPIRIT', async function () {
        console.log("******************************************************");
        console.log("User3 locks in 1000 SPIRIT for inSPIRIT");
        await SPIRIT.connect(user3).approve(inSPIRIT.address, oneThousand);
        await inSPIRIT.connect(user3).create_lock(oneThousand, April2026);
        let user3InSpirit = await inSPIRIT['balanceOf(address)'](user3.address);
        expect(user3InSpirit).to.be.above(0);
        console.log("User3 inSPIRIT Balance", divDec(user3InSpirit));
        console.log("User3 has inSPIRIT");
    });

    it('User3 votes in GaugeProxy', async function () {
        console.log("******************************************************");
        let user3LP1Votes = await vGaugeProxy.votes(user3.address, vLP1.address);

        expect(user3LP1Votes.toString()).to.be.equal('0');
        
        console.log("User3 votes with 100 on LP1");
        await vGaugeProxy.connect(user3).vote([vLP1.address], [oneHundred]);

        user3LP1Votes = await vGaugeProxy.votes(user3.address, vLP1.address);

        let user3LP1BribeBal = await vLP1Bribe.balanceOf(user3.address);

        expect(user3LP1BribeBal).to.be.closeTo(user3LP1Votes, 1);

        console.log("User3 voting data");
        console.log("LP1Gauge Vote", divDec(user3LP1Votes));

        console.log("LP1Bribe Balance", divDec(user3LP1BribeBal));

        console.log("User3 has voted and vote balance is reflected in Bribe contracts");
    });

    it('User3 claims bribe after 2 days', async function () {
        console.log("******************************************************");

        // Forward time by 2 day
        await network.provider.send('evm_increaseTime', [2*24*3600]); 
        await network.provider.send('evm_mine');

        await vGaugeProxy.connect(user3).claimBribes([vLP1Bribe.address], user3.address);
        let user3WETH = await WETH.balanceOf(user3.address)
        let user3TK1 = await TK1.balanceOf(user3.address)
        console.log("User3 WETH balance after claim", divDec(user3WETH));
        console.log("User3 TK1 balance after claim", divDec(user3TK1));
        expect(user3WETH).to.be.above(0);
        expect(user3TK1).to.be.above(0);
    });

    it('User2 claims bribe after 2 days', async function () {
        console.log("******************************************************");

        // Forward time by 2 day
        await network.provider.send('evm_increaseTime', [2*24*3600]); 
        await network.provider.send('evm_mine');

        await vGaugeProxy.connect(user2).claimBribes([vLP1Bribe.address], user2.address);
        let user2WETH = await WETH.balanceOf(user2.address)
        let user2TK1 = await TK1.balanceOf(user2.address)
        console.log("User2 WETH balance after claim", divDec(user2WETH));
        console.log("User2 TK1 balance after claim", divDec(user2TK1));
        expect(user2WETH).to.be.above(0);
        expect(user2TK1).to.be.above(0);
    });

    it('User1, User2, and User3 claim bribe after 2 weeks', async function () {
        console.log("******************************************************");

        // Forward time by 1 day
        await network.provider.send('evm_increaseTime', [14*24*3600]); 
        await network.provider.send('evm_mine');

        await vGaugeProxy.connect(user1).claimBribes([vLP1Bribe.address], user1.address);
        await vGaugeProxy.connect(user2).claimBribes([vLP1Bribe.address], user2.address);
        await vGaugeProxy.connect(user3).claimBribes([vLP1Bribe.address], user3.address);
        let user1WETH = await WETH.balanceOf(user1.address)
        let user1TK1 = await TK1.balanceOf(user1.address)
        let user2WETH = await WETH.balanceOf(user2.address)
        let user2TK1 = await TK1.balanceOf(user2.address)
        let user3WETH = await WETH.balanceOf(user3.address)
        let user3TK1 = await TK1.balanceOf(user3.address)
        console.log("User1 WETH balance after claim", divDec(user1WETH));
        console.log("User1 TK1 balance after claim", divDec(user1TK1));
        console.log("User2 WETH balance after claim", divDec(user2WETH));
        console.log("User2 TK1 balance after claim", divDec(user2TK1));
        console.log("User3 WETH balance after claim", divDec(user3WETH));
        console.log("User3 TK1 balance after claim", divDec(user3TK1));
        expect(user1WETH).to.be.above(0);
        expect(user1TK1).to.be.above(0);
        expect(user2WETH).to.be.above(0);
        expect(user2TK1).to.be.above(0);
        expect(user3WETH).to.be.above(0);
        expect(user3TK1).to.be.above(0);
        
    });

    it('Send all tokens from everyone back to owner', async function () {
        console.log("******************************************************");

        await WETH.connect(user1).transfer(owner.address, await WETH.balanceOf(user1.address));
        await WETH.connect(user2).transfer(owner.address, await WETH.balanceOf(user2.address));
        await WETH.connect(user3).transfer(owner.address, await WETH.balanceOf(user3.address));
        await WETH.connect(treasury).transfer(owner.address, await WETH.balanceOf(treasury.address));
        await WETH.connect(spiritMaker).transfer(owner.address, await WETH.balanceOf(spiritMaker.address));
        await WETH.connect(protocol1).transfer(owner.address, await WETH.balanceOf(protocol1.address));

        await TK1.connect(user1).transfer(owner.address, await TK1.balanceOf(user1.address));
        await TK1.connect(user2).transfer(owner.address, await TK1.balanceOf(user2.address));
        await TK1.connect(user3).transfer(owner.address, await TK1.balanceOf(user3.address));
        await TK1.connect(treasury).transfer(owner.address, await TK1.balanceOf(treasury.address));
        await TK1.connect(spiritMaker).transfer(owner.address, await TK1.balanceOf(spiritMaker.address));
        await TK1.connect(protocol1).transfer(owner.address, await TK1.balanceOf(protocol1.address));

    });

    it('All users reset votes', async function () {
        console.log("******************************************************");

        await vGaugeProxy.connect(user1).reset();
        await vGaugeProxy.connect(user2).reset();
        await vGaugeProxy.connect(user3).reset();

        await expect(await vGaugeProxy.votes(user1.address, vLP1.address)).to.be.equal(0);
        await expect(await vGaugeProxy.votes(user1.address, vLP2.address)).to.be.equal(0);
        await expect(await vGaugeProxy.votes(user1.address, vLP3.address)).to.be.equal(0);

        await expect(await vGaugeProxy.votes(user2.address, vLP1.address)).to.be.equal(0);
        await expect(await vGaugeProxy.votes(user2.address, vLP2.address)).to.be.equal(0);
        await expect(await vGaugeProxy.votes(user2.address, vLP3.address)).to.be.equal(0);

        await expect(await vGaugeProxy.votes(user3.address, vLP1.address)).to.be.equal(0);
        await expect(await vGaugeProxy.votes(user3.address, vLP2.address)).to.be.equal(0);
        await expect(await vGaugeProxy.votes(user3.address, vLP3.address)).to.be.equal(0);

        await expect(await vLP1Bribe.balanceOf(user1.address)).to.be.equal(0);
        await expect(await vLP2Bribe.balanceOf(user1.address)).to.be.equal(0);
        await expect(await vLP3Bribe.balanceOf(user1.address)).to.be.equal(0);

        await expect(await vLP1Bribe.balanceOf(user2.address)).to.be.equal(0);
        await expect(await vLP2Bribe.balanceOf(user2.address)).to.be.equal(0);
        await expect(await vLP3Bribe.balanceOf(user2.address)).to.be.equal(0);

        await expect(await vLP1Bribe.balanceOf(user3.address)).to.be.equal(0);
        await expect(await vLP2Bribe.balanceOf(user3.address)).to.be.equal(0);
        await expect(await vLP3Bribe.balanceOf(user3.address)).to.be.equal(0);

    });

    it('All users vote in GaugeProxy', async function () {
        console.log("******************************************************");

        let user1LP1Votes = await vGaugeProxy.votes(user1.address, vLP1.address);
        let user2LP1Votes = await vGaugeProxy.votes(user2.address, vLP1.address);
        let user3LP1Votes = await vGaugeProxy.votes(user3.address, vLP1.address);

        expect(user1LP1Votes.toString()).to.be.equal('0');
        expect(user2LP1Votes.toString()).to.be.equal('0');
        expect(user3LP1Votes.toString()).to.be.equal('0');
        
        console.log("Users vote with 100 on LP1");
        await vGaugeProxy.connect(user1).vote([vLP1.address], [oneHundred]);
        await vGaugeProxy.connect(user2).vote([vLP1.address], [oneHundred]);
        await vGaugeProxy.connect(user3).vote([vLP1.address], [oneHundred]);

        user1LP1Votes = await vGaugeProxy.votes(user1.address, vLP1.address);
        user2LP1Votes = await vGaugeProxy.votes(user2.address, vLP1.address);
        user3LP1Votes = await vGaugeProxy.votes(user3.address, vLP1.address);

        let user1LP1BribeBal = await vLP1Bribe.balanceOf(user1.address);
        let user2LP1BribeBal = await vLP1Bribe.balanceOf(user2.address);
        let user3LP1BribeBal = await vLP1Bribe.balanceOf(user3.address);

        expect(user1LP1BribeBal).to.be.closeTo(user1LP1Votes, 1);
        expect(user2LP1BribeBal).to.be.closeTo(user2LP1Votes, 1);
        expect(user3LP1BribeBal).to.be.closeTo(user3LP1Votes, 1);

        console.log("Voting data");
        console.log("User1 LP1Gauge Vote", divDec(user1LP1Votes));
        console.log("User2 LP1Gauge Vote", divDec(user2LP1Votes));
        console.log("User3 LP1Gauge Vote", divDec(user3LP1Votes));

        console.log("User 1 LP1Bribe Balance", divDec(user1LP1BribeBal));
        console.log("User 2 LP1Bribe Balance", divDec(user2LP1BribeBal));
        console.log("User 3 LP1Bribe Balance", divDec(user3LP1BribeBal));

        console.log("Users have voted and vote balance is reflected in Bribe contracts");
    });

    it('Owner does a bunch of swaps on vLP1', async function () {
        console.log("******************************************************");
        console.log("Owner does a bunch of swaps on vLP1");
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);

    });

    it('Owner begins voting fees on LP1Gauge', async function () {
        console.log("******************************************************");
        console.log("BRIBE TEST #3");
        console.log("******************************************************");;

        await expect(await WETH.balanceOf(spiritMaker.address)).to.be.equal(0);
        await expect(await TK1.balanceOf(spiritMaker.address)).to.be.equal(0);

        await expect(await WETH.balanceOf(protocol1.address)).to.be.equal(0);
        await expect(await TK1.balanceOf(protocol1.address)).to.be.equal(0);

        await vLP1Gauge.claimVotingFees();

        await expect(await WETH.balanceOf(spiritMaker.address)).to.be.above(0);
        await expect(await TK1.balanceOf(spiritMaker.address)).to.be.above(0);

        await expect(await WETH.balanceOf(protocol1.address)).to.be.above(0);
        await expect(await TK1.balanceOf(protocol1.address)).to.be.above(0);

        await expect(await WETH.balanceOf(vLP1Bribe.address)).to.be.above(0);
        await expect(await TK1.balanceOf(vLP1Bribe.address)).to.be.above(0);

        let rewardRateWETH = (await vLP1Bribe.rewardData(WETH.address)).rewardRate;
        let rewardRateTK1 = (await vLP1Bribe.rewardData(TK1.address)).rewardRate;

        console.log("WETH/s", divDec(rewardRateWETH));
        console.log("TK1/s", divDec(rewardRateTK1));
    });

    it('Owner does a bunch of swaps on vLP1', async function () {
        console.log("******************************************************");
        console.log("Owner does a bunch of swaps on vLP1");
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
    });

    it('Owner tries starting voting fees again', async function () {
        console.log("******************************************************");

        let rewardRateWETHBefore = (await vLP1Bribe.rewardData(WETH.address)).rewardRate;
        let rewardRateTK1Before = (await vLP1Bribe.rewardData(TK1.address)).rewardRate;

        await vLP1Gauge.claimVotingFees();

        let rewardRateWETH = (await vLP1Bribe.rewardData(WETH.address)).rewardRate;
        let rewardRateTK1 = (await vLP1Bribe.rewardData(TK1.address)).rewardRate;

        expect(rewardRateWETHBefore).to.be.equal(rewardRateWETH);
        expect(rewardRateTK1Before).to.be.equal(rewardRateTK1);

        console.log("WETH/s", divDec(rewardRateWETH));
        console.log("TK1/s", divDec(rewardRateTK1));
    });

    it('Owner does a bunch of swaps on vLP1', async function () {
        console.log("******************************************************");
        console.log("Owner does a bunch of swaps on vLP1");
        await WETH.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
        await TK1.connect(owner).approve(router.address, fifty);
        await router.connect(owner).swapExactTokensForTokensSimple(fifty, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
    });

    it('Owner tries starting voting fees again', async function () {
        console.log("******************************************************");

        let rewardRateWETHBefore = (await vLP1Bribe.rewardData(WETH.address)).rewardRate;
        let rewardRateTK1Before = (await vLP1Bribe.rewardData(TK1.address)).rewardRate;

        await vLP1Gauge.claimVotingFees();

        let rewardRateWETH = (await vLP1Bribe.rewardData(WETH.address)).rewardRate;
        let rewardRateTK1 = (await vLP1Bribe.rewardData(TK1.address)).rewardRate;

        expect(rewardRateWETH).to.be.above(rewardRateWETHBefore);
        expect(rewardRateTK1).to.be.above(rewardRateTK1Before);

        console.log("WETH/s", divDec(rewardRateWETH));
        console.log("TK1/s", divDec(rewardRateTK1));
    });

    it('User1, User2, and User3 claim bribe after 2 weeks', async function () {
        console.log("******************************************************");

        // Forward time by 1 day
        await network.provider.send('evm_increaseTime', [14*24*3600]); 
        await network.provider.send('evm_mine');

        await vGaugeProxy.connect(user1).claimBribes([vLP1Bribe.address], user1.address);
        await vGaugeProxy.connect(user2).claimBribes([vLP1Bribe.address], user2.address);
        await vGaugeProxy.connect(user3).claimBribes([vLP1Bribe.address], user3.address);
        let user1WETH = await WETH.balanceOf(user1.address)
        let user1TK1 = await TK1.balanceOf(user1.address)
        let user2WETH = await WETH.balanceOf(user2.address)
        let user2TK1 = await TK1.balanceOf(user2.address)
        let user3WETH = await WETH.balanceOf(user3.address)
        let user3TK1 = await TK1.balanceOf(user3.address)
        console.log("User1 WETH balance after claim", divDec(user1WETH));
        console.log("User1 TK1 balance after claim", divDec(user1TK1));
        console.log("User2 WETH balance after claim", divDec(user2WETH));
        console.log("User2 TK1 balance after claim", divDec(user2TK1));
        console.log("User3 WETH balance after claim", divDec(user3WETH));
        console.log("User3 TK1 balance after claim", divDec(user3TK1));
        expect(user1WETH).to.be.above(0);
        expect(user1TK1).to.be.above(0);
        expect(user2WETH).to.be.above(0);
        expect(user2TK1).to.be.above(0);
        expect(user3WETH).to.be.above(0);
        expect(user3TK1).to.be.above(0);
        
    });

    it('Send all tokens from everyone back to owner', async function () {
        console.log("******************************************************");

        await WETH.connect(user1).transfer(owner.address, await WETH.balanceOf(user1.address));
        await WETH.connect(user2).transfer(owner.address, await WETH.balanceOf(user2.address));
        await WETH.connect(user3).transfer(owner.address, await WETH.balanceOf(user3.address));
        await WETH.connect(treasury).transfer(owner.address, await WETH.balanceOf(treasury.address));
        await WETH.connect(spiritMaker).transfer(owner.address, await WETH.balanceOf(spiritMaker.address));
        await WETH.connect(protocol1).transfer(owner.address, await WETH.balanceOf(protocol1.address));

        await TK1.connect(user1).transfer(owner.address, await TK1.balanceOf(user1.address));
        await TK1.connect(user2).transfer(owner.address, await TK1.balanceOf(user2.address));
        await TK1.connect(user3).transfer(owner.address, await TK1.balanceOf(user3.address));
        await TK1.connect(treasury).transfer(owner.address, await TK1.balanceOf(treasury.address));
        await TK1.connect(spiritMaker).transfer(owner.address, await TK1.balanceOf(spiritMaker.address));
        await TK1.connect(protocol1).transfer(owner.address, await TK1.balanceOf(protocol1.address));

    });

    it('Owner begins voting fees on LP1Gauge on a newly added token', async function () {
        console.log("******************************************************");
        console.log("BRIBE TEST #4");
        console.log("******************************************************");;

        await vLP1Bribe.addReward(USDC.address);
        await USDC.approve(vLP1Bribe.address, oneHundred);
        await vLP1Bribe.notifyRewardAmount(USDC.address, oneHundred);
        await vLP1Gauge.claimVotingFees();

        let rewardRateWETH = (await vLP1Bribe.rewardData(WETH.address)).rewardRate;
        let rewardRateTK1 = (await vLP1Bribe.rewardData(TK1.address)).rewardRate;
        let rewardRateUSDC = (await vLP1Bribe.rewardData(USDC.address)).rewardRate;

        console.log("WETH/s", divDec(rewardRateWETH));
        console.log("TK1/s", divDec(rewardRateTK1));
        console.log("USDC/s", divDec(rewardRateUSDC));
    });

    it('User1, User2, and User3 claim bribe after 2 weeks', async function () {
        console.log("******************************************************");

        // Forward time by 1 day
        await network.provider.send('evm_increaseTime', [14*24*3600]); 
        await network.provider.send('evm_mine');

        await vGaugeProxy.connect(user1).claimBribes([vLP1Bribe.address], user1.address);
        await vGaugeProxy.connect(user2).claimBribes([vLP1Bribe.address], user2.address);
        await vGaugeProxy.connect(user3).claimBribes([vLP1Bribe.address], user3.address);
        let user1WETH = await WETH.balanceOf(user1.address)
        let user1TK1 = await TK1.balanceOf(user1.address)
        let user1USDC = await USDC.balanceOf(user1.address)
        let user2WETH = await WETH.balanceOf(user2.address)
        let user2TK1 = await TK1.balanceOf(user2.address)
        let user2USDC = await USDC.balanceOf(user2.address)
        let user3WETH = await WETH.balanceOf(user3.address)
        let user3TK1 = await TK1.balanceOf(user3.address)
        let user3USDC = await USDC.balanceOf(user3.address)
        console.log("User1 WETH balance after claim", divDec(user1WETH));
        console.log("User1 TK1 balance after claim", divDec(user1TK1));
        console.log("User1 USDC balance after claim", divDec(user1USDC));
        console.log("User2 WETH balance after claim", divDec(user2WETH));
        console.log("User2 TK1 balance after claim", divDec(user2TK1));
        console.log("User2 USDC balance after claim", divDec(user2USDC));
        console.log("User3 WETH balance after claim", divDec(user3WETH));
        console.log("User3 TK1 balance after claim", divDec(user3TK1));
        console.log("User3 USDC balance after claim", divDec(user3USDC));
        
    });

    it('Send all tokens from everyone back to owner', async function () {
        console.log("******************************************************");

        await WETH.connect(user1).transfer(owner.address, await WETH.balanceOf(user1.address));
        await WETH.connect(user2).transfer(owner.address, await WETH.balanceOf(user2.address));
        await WETH.connect(user3).transfer(owner.address, await WETH.balanceOf(user3.address));
        await WETH.connect(treasury).transfer(owner.address, await WETH.balanceOf(treasury.address));
        await WETH.connect(spiritMaker).transfer(owner.address, await WETH.balanceOf(spiritMaker.address));
        await WETH.connect(protocol1).transfer(owner.address, await WETH.balanceOf(protocol1.address));

        await TK1.connect(user1).transfer(owner.address, await TK1.balanceOf(user1.address));
        await TK1.connect(user2).transfer(owner.address, await TK1.balanceOf(user2.address));
        await TK1.connect(user3).transfer(owner.address, await TK1.balanceOf(user3.address));
        await TK1.connect(treasury).transfer(owner.address, await TK1.balanceOf(treasury.address));
        await TK1.connect(spiritMaker).transfer(owner.address, await TK1.balanceOf(spiritMaker.address));
        await TK1.connect(protocol1).transfer(owner.address, await TK1.balanceOf(protocol1.address));

        await USDC.connect(user1).transfer(owner.address, await USDC.balanceOf(user1.address));
        await USDC.connect(user2).transfer(owner.address, await USDC.balanceOf(user2.address));
        await USDC.connect(user3).transfer(owner.address, await USDC.balanceOf(user3.address));
        await USDC.connect(treasury).transfer(owner.address, await USDC.balanceOf(treasury.address));
        await USDC.connect(spiritMaker).transfer(owner.address, await USDC.balanceOf(spiritMaker.address));
        await USDC.connect(protocol1).transfer(owner.address, await USDC.balanceOf(protocol1.address));

    });


})
