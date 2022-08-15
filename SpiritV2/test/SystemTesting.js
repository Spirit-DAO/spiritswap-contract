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
let sGaugeProxy, sLP1, sLP1Fees, sLP1Gauge, sLP1Bribe, sLP2, sLP2Fees, sLP2Gauge, sLP2Bribe;
let aGaugeProxy, aLP1, aLP1Fees, aLP1Gauge, aLP2, aLP2Fees, aLP2Gauge;
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
        
        console.log("Initialization Complete");
    });

    it('Gauge Proxy Status', async function () {
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

        // Stable Gauge Proxy Status
        let votessLP1 = await sGaugeProxy.weights(sLP1.address);
        let votessLP2 = await sGaugeProxy.weights(sLP2.address);
        let totalVotesS = await sGaugeProxy.totalWeight();
        let lockedVotessLP1 = await sGaugeProxy.lockedWeights(sLP1.address);
        let lockedVotessLP2 = await sGaugeProxy.lockedWeights(sLP2.address);
        let lockedTotalVotesS = await sGaugeProxy.lockedTotalWeight();
        let sGaugeProxySPIRIT = await SPIRIT.balanceOf(sGaugeProxy.address);

        console.log("STABLE Gauge Proxy Status");
        console.log("LP1 vote weight", divDec(votessLP1));
        console.log("LP2 vote weight", divDec(votessLP2));
        console.log("Total vote weight", divDec(totalVotesS));
        console.log("Locked LP1 vote weight", divDec(lockedVotessLP1));
        console.log("Locked LP2 vote weight", divDec(lockedVotessLP2));
        console.log("Locked Total vote weight", divDec(lockedTotalVotesS));
        console.log("SPIRIT", divDec(sGaugeProxySPIRIT));
        console.log();

        // Admin Gauge Proxy Status
        let weightaLP1 = await aGaugeProxy.gaugeWeights(aLP1.address);
        let weightaLP2 = await aGaugeProxy.gaugeWeights(aLP2.address);
        let totalWeightS = await aGaugeProxy.totalWeight();
        let aGaugeProxySPIRIT = await SPIRIT.balanceOf(aGaugeProxy.address);

        console.log("ADMIN Gauge Proxy Status");
        console.log("LP1 weight", divDec(weightaLP1));
        console.log("LP2 weight", divDec(weightaLP2));
        console.log("Total weight", divDec(totalWeightS));
        console.log("SPIRIT", divDec(aGaugeProxySPIRIT));
        console.log();

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

    it('STABLE Gauge Proxy Status', async function () {
        console.log("******************************************************");
        console.log();

        // Stable Gauge Proxy Status
        let votessLP1 = await sGaugeProxy.weights(sLP1.address);
        let votessLP2 = await sGaugeProxy.weights(sLP2.address);
        let totalVotesS = await sGaugeProxy.totalWeight();
        let lockedVotessLP1 = await sGaugeProxy.lockedWeights(sLP1.address);
        let lockedVotessLP2 = await sGaugeProxy.lockedWeights(sLP2.address);
        let lockedTotalVotesS = await sGaugeProxy.lockedTotalWeight();
        let sGaugeProxySPIRIT = await SPIRIT.balanceOf(sGaugeProxy.address);

        console.log("STABLE Gauge Proxy Status");
        console.log("LP1 vote weight", divDec(votessLP1));
        console.log("LP2 vote weight", divDec(votessLP2));
        console.log("Total vote weight", divDec(totalVotesS));
        console.log("Locked LP1 vote weight", divDec(lockedVotessLP1));
        console.log("Locked LP2 vote weight", divDec(lockedVotessLP2));
        console.log("Locked Total vote weight", divDec(lockedTotalVotesS));
        console.log("SPIRIT", divDec(sGaugeProxySPIRIT));
        console.log();

        // sLP1 Gauge Status
        let totalBalancesLP1Gauge = await sLP1Gauge.totalSupply();
        let sLP1GaugeSPIRIT = await SPIRIT.balanceOf(sLP1Gauge.address);
        let ownersLP1Gauge = await sLP1Gauge.balanceOf(owner.address);

        console.log("sLP1 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalancesLP1Gauge));
        console.log("SPIRIT", divDec(sLP1GaugeSPIRIT));
        console.log("Owner LP Balance", divDec(ownersLP1Gauge));
        console.log();

        // sLP1 Bribe Status
        let totalVotessLP1Bribe = await sLP1Bribe.totalSupply();
        let sLP1BribeUSDC = await USDC.balanceOf(sLP1Bribe.address);
        let sLP1BribeUSD1 = await USD1.balanceOf(sLP1Bribe.address);
        let user1sLP1BribeVotes = await sLP1Bribe.balanceOf(user1.address);
        let user2sLP1BribeVotes = await sLP1Bribe.balanceOf(user2.address);

        console.log("sLP1 Bribe Status")
        console.log("Total Vote Balance", divDec(totalVotessLP1Bribe));
        console.log("USDC", divDec(sLP1BribeUSDC));
        console.log("USD1", divDec(sLP1BribeUSD1));
        console.log("User1 Vote Balance", divDec(user1sLP1BribeVotes));
        console.log("User2 Vote Balance", divDec(user2sLP1BribeVotes));
        console.log();

        // sLP2 Gauge Status
        let totalBalancesLP2Gauge = await sLP2Gauge.totalSupply();
        let sLP2GaugeSPIRIT = await SPIRIT.balanceOf(sLP2Gauge.address);
        let ownersLP2Gauge = await sLP2Gauge.balanceOf(owner.address);

        console.log("sLP2 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalancesLP2Gauge));
        console.log("SPIRIT", divDec(sLP2GaugeSPIRIT));
        console.log("Owner LP Balance", divDec(ownersLP2Gauge));
        console.log();

        // sLP2 Bribe Status
        let totalVotessLP2Bribe = await sLP2Bribe.totalSupply();
        let sLP2BribeUSDC = await USDC.balanceOf(sLP2Bribe.address);
        let sLP2BribeUSD2 = await USD2.balanceOf(sLP2Bribe.address);
        let user1sLP2BribeVotes = await sLP2Bribe.balanceOf(user1.address);
        let user2sLP2BribeVotes = await sLP2Bribe.balanceOf(user2.address);

        console.log("sLP2 Bribe Status")
        console.log("Total Vote Balance", divDec(totalVotessLP2Bribe));
        console.log("USDC", divDec(sLP2BribeUSDC));
        console.log("USD2", divDec(sLP2BribeUSD2));
        console.log("User1 Vote Balance", divDec(user1sLP2BribeVotes));
        console.log("User2 Vote Balance", divDec(user2sLP2BribeVotes));
        console.log();
        
    }); 

    it('ADMIN Gauge Proxy Status', async function () {
        console.log("******************************************************");
        console.log();

        // Admin Gauge Proxy Status
        let weightaLP1 = await aGaugeProxy.gaugeWeights(aLP1.address);
        let weightaLP2 = await aGaugeProxy.gaugeWeights(aLP2.address);
        let totalWeightS = await aGaugeProxy.totalWeight();
        let aGaugeProxySPIRIT = await SPIRIT.balanceOf(aGaugeProxy.address);

        console.log("ADMIN Gauge Proxy Status");
        console.log("LP1 weight", divDec(weightaLP1));
        console.log("LP2 weight", divDec(weightaLP2));
        console.log("Total weight", divDec(totalWeightS));
        console.log("SPIRIT", divDec(aGaugeProxySPIRIT));
        console.log();

        // aLP1 Gauge Status
        let totalBalanceaLP1Gauge = await aLP1Gauge.totalSupply();
        let aLP1GaugeSPIRIT = await SPIRIT.balanceOf(aLP1Gauge.address);
        let owneraLP1Gauge = await aLP1Gauge.balanceOf(owner.address);

        console.log("aLP1 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalanceaLP1Gauge));
        console.log("SPIRIT", divDec(aLP1GaugeSPIRIT));
        console.log("Owner LP Balance", divDec(owneraLP1Gauge));
        console.log();

        // aLP1 Gauge Status
        let totalBalanceaLP2Gauge = await aLP2Gauge.totalSupply();
        let aLP2GaugeSPIRIT = await SPIRIT.balanceOf(aLP2Gauge.address);
        let owneraLP2Gauge = await aLP2Gauge.balanceOf(owner.address);

        console.log("aLP2 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalanceaLP2Gauge));
        console.log("SPIRIT", divDec(aLP2GaugeSPIRIT));
        console.log("Owner LP Balance", divDec(owneraLP2Gauge));
        console.log();
        
    }); 

    it('Fee Distributor Status', async function () {
        console.log("******************************************************");
        console.log();

        // Fee Distributor Status
        let feeDistSPIRIT = await SPIRIT.balanceOf(feeDistributor.address);
        let ownerInSpirit = await inSPIRIT['balanceOf(address)'](owner.address);
        let user1InSpirit = await inSPIRIT['balanceOf(address)'](user1.address);
        let user2InSpirit = await inSPIRIT['balanceOf(address)'](user2.address);

        console.log("Fee Distributor Status")
        console.log("SPIRIT", divDec(feeDistSPIRIT));
        console.log("Owner inSPIRIT", divDec(ownerInSpirit));
        console.log("User1 inSPIRIT", divDec(user1InSpirit));
        console.log("User2 inSPIRIT", divDec(user2InSpirit));
        console.log();
        
    }); 

    it('LP Pair Status', async function () {
        console.log("******************************************************");
        console.log();

        // vLP1 Pair Status
        let vLP1WETH = await WETH.balanceOf(vLP1.address);
        let vLP1TK1 = await TK1.balanceOf(vLP1.address);

        console.log("vLP1 BALANCE (WETH-TK1)");
        console.log("WETH", divDec(vLP1WETH));
        console.log("TK1", divDec(vLP1TK1));

        // vLP1 Fee Status
        let vLP1FeesWETH = await WETH.balanceOf(vLP1Fees.address)
        let vLP1FeesTK1 = await TK1.balanceOf(vLP1Fees.address);

        console.log("vLP1 FEES BALANCE");
        console.log("WETH", divDec(vLP1FeesWETH));
        console.log("TK1", divDec(vLP1FeesTK1));
        console.log();

        // vLP2 Pair Status
        let vLP2WETH = await WETH.balanceOf(vLP2.address);
        let vLP2TK2 = await TK2.balanceOf(vLP2.address);

        console.log("vLP2 BALANCE (WETH-TK2)");
        console.log("WETH", divDec(vLP2WETH));
        console.log("TK2", divDec(vLP2TK2));

        // vLP2 Fee Status
        let vLP2FeesWETH = await WETH.balanceOf(vLP2Fees.address)
        let vLP2FeesTK2 = await TK2.balanceOf(vLP2Fees.address);

        console.log("vLP1 FEES BALANCE");
        console.log("WETH", divDec(vLP2FeesWETH));
        console.log("TK2", divDec(vLP2FeesTK2));
        console.log();

        // sLP1 Pair Status
        let sLP1USDC = await USDC.balanceOf(sLP1.address);
        let sLP1USD1 = await USD1.balanceOf(sLP1.address);

        console.log("sLP1 BALANCE (USDC-USD1)");
        console.log("USDC", divDec(sLP1USDC));
        console.log("USD1", divDec(sLP1USD1));

        // sLP1 Fee Status
        let sLP1FeesUSDC = await USDC.balanceOf(sLP1Fees.address);
        let sLP1FeesUSD1 = await USD1.balanceOf(sLP1Fees.address);

        console.log("sLP1 FEES BALANCE");
        console.log("USDC", divDec(sLP1FeesUSDC));
        console.log("USD1", divDec(sLP1FeesUSD1));
        console.log();

        // sLP2 Pair Status
        let sLP2USDC = await USDC.balanceOf(sLP2.address);
        let sLP2USD2 = await USD2.balanceOf(sLP2.address);

        console.log("sLP2 BALANCE (USDC-USD2)");
        console.log("USDC", divDec(sLP2USDC));
        console.log("USD1", divDec(sLP2USD2));

        // sLP2 Fee Status
        let sLP2FeesUSDC = await USDC.balanceOf(sLP2Fees.address);
        let sLP2FeesUSD2 = await USD2.balanceOf(sLP2Fees.address);

        console.log("sLP1 FEES BALANCE");
        console.log("USDC", divDec(sLP2FeesUSDC));
        console.log("USD1", divDec(sLP2FeesUSD2));
        console.log();

        // aLP1 Pair Status
        let aLP1WETH = await WETH.balanceOf(aLP1.address);
        let aLP1SPIRIT = await SPIRIT.balanceOf(aLP1.address);

        console.log("aLP1 BALANCE (WETH-SPIRIT)");
        console.log("WETH", divDec(aLP1WETH));
        console.log("SPIRIT", divDec(aLP1SPIRIT));

        // aLP1 Fee Status
        let aLP1FeesWETH = await WETH.balanceOf(aLP1Fees.address);
        let aLP1FeesSPIRIT = await SPIRIT.balanceOf(aLP1Fees.address);

        console.log("aLP1 FEES BALANCE");
        console.log("WETH", divDec(aLP1FeesWETH));
        console.log("SPIRIT", divDec(aLP1FeesSPIRIT));
        console.log();

        // aLP2 Pair Status
        let aLP2WETH = await WETH.balanceOf(aLP2.address);
        let aLP2USDC = await USDC.balanceOf(aLP2.address);

        console.log("sLP2 BALANCE (WETH-USDC)");
        console.log("WETH", divDec(aLP2WETH));
        console.log("USDC", divDec(aLP2USDC));

        // aLP2 Fee Status
        let aLP2FeesWETH = await WETH.balanceOf(aLP2Fees.address);
        let aLP2FeesUSDC = await USDC.balanceOf(aLP2Fees.address);

        console.log("aLP1 FEES BALANCE");
        console.log("WETH", divDec(aLP2FeesWETH));
        console.log("USDC", divDec(aLP2FeesUSDC));
        console.log();

    }); 

    it('User Balance Status', async function () {
        console.log("******************************************************");
        console.log();

        // Owner Balances
        let ownerSPIRIT = await SPIRIT.balanceOf(owner.address);
        let ownerInSpirit = await inSPIRIT['balanceOf(address)'](owner.address);
        let ownerWETH = await WETH.balanceOf(owner.address);
        let ownerTK1 = await TK1.balanceOf(owner.address);
        let ownerTK2 = await TK2.balanceOf(owner.address);
        let ownerUSDC = await USDC.balanceOf(owner.address);
        let ownerUSD1 = await USD1.balanceOf(owner.address);
        let ownerUSD2 = await USD2.balanceOf(owner.address);
        let ownervLP1 = await vLP1.balanceOf(owner.address);
        let ownervLP2 = await vLP2.balanceOf(owner.address);
        let ownersLP1 = await sLP1.balanceOf(owner.address);
        let ownersLP2 = await sLP2.balanceOf(owner.address);
        let owneraLP1 = await aLP2.balanceOf(owner.address);
        let owneraLP2 = await aLP2.balanceOf(owner.address);

        console.log("OWNER BALANCES");
        console.log("SPIRIT", divDec(ownerSPIRIT));
        console.log("inSPIRIT", divDec(ownerInSpirit));
        console.log("WETH", divDec(ownerWETH));
        console.log("TK1", divDec(ownerTK1));
        console.log("TK2", divDec(ownerTK2));
        console.log("USDC", divDec(ownerUSDC));
        console.log("USD1", divDec(ownerUSD1));
        console.log("USD2", divDec(ownerUSD2));
        console.log("vLP1", divDec(ownervLP1));
        console.log("vLP2", divDec(ownervLP2));
        console.log("sLP1", divDec(ownersLP1));
        console.log("sLP2", divDec(ownersLP2));
        console.log("aLP2", divDec(owneraLP1));
        console.log("aLP2", divDec(owneraLP2));
        console.log();

        // User1 Balances
        let user1SPIRIT = await SPIRIT.balanceOf(user1.address);
        let user1InSpirit = await inSPIRIT['balanceOf(address)'](user1.address);
        let user1WETH = await WETH.balanceOf(user1.address);
        let user1TK1 = await TK1.balanceOf(user1.address);
        let user1TK2 = await TK2.balanceOf(user1.address);
        let user1USDC = await USDC.balanceOf(user1.address);
        let user1USD1 = await USD1.balanceOf(user1.address);
        let user1USD2 = await USD2.balanceOf(user1.address);
        let user1vLP1 = await vLP1.balanceOf(user1.address);
        let user1vLP2 = await vLP2.balanceOf(user1.address);
        let user1sLP1 = await sLP1.balanceOf(user1.address);
        let user1sLP2 = await sLP2.balanceOf(user1.address);
        let user1aLP1 = await aLP2.balanceOf(user1.address);
        let user1aLP2 = await aLP2.balanceOf(user1.address);

        console.log("User1 BALANCES");
        console.log("SPIRIT", divDec(user1SPIRIT));
        console.log("inSPIRIT", divDec(user1InSpirit));
        console.log("WETH", divDec(user1WETH));
        console.log("TK1", divDec(user1TK1));
        console.log("TK2", divDec(user1TK2));
        console.log("USDC", divDec(user1USDC));
        console.log("USD1", divDec(user1USD1));
        console.log("USD2", divDec(user1USD2));
        console.log("vLP1", divDec(user1vLP1));
        console.log("vLP2", divDec(user1vLP2));
        console.log("sLP1", divDec(user1sLP1));
        console.log("sLP2", divDec(user1sLP2));
        console.log("aLP2", divDec(user1aLP1));
        console.log("aLP2", divDec(user1aLP2));
        console.log();

        // User2 Balances
        let user2SPIRIT = await SPIRIT.balanceOf(user2.address);
        let user2InSpirit = await inSPIRIT['balanceOf(address)'](user2.address);
        let user2WETH = await WETH.balanceOf(user2.address);
        let user2TK1 = await TK1.balanceOf(user2.address);
        let user2TK2 = await TK2.balanceOf(user2.address);
        let user2USDC = await USDC.balanceOf(user2.address);
        let user2USD1 = await USD1.balanceOf(user2.address);
        let user2USD2 = await USD2.balanceOf(user2.address);
        let user2vLP1 = await vLP1.balanceOf(user2.address);
        let user2vLP2 = await vLP2.balanceOf(user2.address);
        let user2sLP1 = await sLP1.balanceOf(user2.address);
        let user2sLP2 = await sLP2.balanceOf(user2.address);
        let user2aLP1 = await aLP2.balanceOf(user2.address);
        let user2aLP2 = await aLP2.balanceOf(user2.address);

        console.log("User2 BALANCES");
        console.log("SPIRIT", divDec(user2SPIRIT));
        console.log("inSPIRIT", divDec(user2InSpirit));
        console.log("WETH", divDec(user2WETH));
        console.log("TK1", divDec(user2TK1));
        console.log("TK2", divDec(user2TK2));
        console.log("USDC", divDec(user2USDC));
        console.log("USD1", divDec(user2USD1));
        console.log("USD2", divDec(user2USD2));
        console.log("vLP1", divDec(user2vLP1));
        console.log("vLP2", divDec(user2vLP2));
        console.log("sLP1", divDec(user2sLP1));
        console.log("sLP2", divDec(user2sLP2));
        console.log("aLP2", divDec(user2aLP1));
        console.log("aLP2", divDec(user2aLP2));
        console.log();

    }); 

    it('Owner sets gauge weights on admin gauge proxy', async function () {
        console.log("******************************************************");
        console.log("Owner sets WETH-SPIRIT to 100 and WETH-USDC to 100");
        await aGaugeProxy.setGaugeWeight(aLP1.address, oneHundred);
        await aGaugeProxy.setGaugeWeight(aLP2.address, oneHundred);
    });

    it('User1 lock SPIRIT for inSPIRIT', async function () {
        console.log("******************************************************");
        console.log("User1 locks in 1000 SPIRIT for inSPIRIT");
        await SPIRIT.connect(user1).approve(inSPIRIT.address, oneThousand);
        await inSPIRIT.connect(user1).create_lock(oneThousand, April2026);
    });

    it('User1 balance status', async function () {
        console.log("******************************************************");
        console.log();
        // User1 Balances
        let user1SPIRIT = await SPIRIT.balanceOf(user1.address);
        let user1InSpirit = await inSPIRIT['balanceOf(address)'](user1.address);
        let user1WETH = await WETH.balanceOf(user1.address);
        let user1TK1 = await TK1.balanceOf(user1.address);
        let user1TK2 = await TK2.balanceOf(user1.address);
        let user1USDC = await USDC.balanceOf(user1.address);
        let user1USD1 = await USD1.balanceOf(user1.address);
        let user1USD2 = await USD2.balanceOf(user1.address);
        let user1vLP1 = await vLP1.balanceOf(user1.address);
        let user1vLP2 = await vLP2.balanceOf(user1.address);
        let user1sLP1 = await sLP1.balanceOf(user1.address);
        let user1sLP2 = await sLP2.balanceOf(user1.address);
        let user1aLP1 = await aLP2.balanceOf(user1.address);
        let user1aLP2 = await aLP2.balanceOf(user1.address);

        console.log("User1 BALANCES");
        console.log("SPIRIT", divDec(user1SPIRIT));
        console.log("inSPIRIT", divDec(user1InSpirit));
        console.log("WETH", divDec(user1WETH));
        console.log("TK1", divDec(user1TK1));
        console.log("TK2", divDec(user1TK2));
        console.log("USDC", divDec(user1USDC));
        console.log("USD1", divDec(user1USD1));
        console.log("USD2", divDec(user1USD2));
        console.log("vLP1", divDec(user1vLP1));
        console.log("vLP2", divDec(user1vLP2));
        console.log("sLP1", divDec(user1sLP1));
        console.log("sLP2", divDec(user1sLP2));
        console.log("aLP2", divDec(user1aLP1));
        console.log("aLP2", divDec(user1aLP2));
        console.log();
    });

    it('User1 votes on gauges proxies', async function () {
        console.log("******************************************************");
        console.log("User1 votes on variable gauge proxy with  500 on vLP1, 500 on vLP2");
        await vGaugeProxy.connect(user1).vote([vLP1.address, vLP2.address], [fiveHundred, fiveHundred]);
        console.log("User1 votes on stable gauge proxy with  500 on sLP1, 500 on sLP2");
        await sGaugeProxy.connect(user1).vote([sLP1.address, sLP2.address], [fiveHundred, fiveHundred]);
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

    it('STABLE Gauge Proxy Status', async function () {
        console.log("******************************************************");
        console.log();

        // Stable Gauge Proxy Status
        let votessLP1 = await sGaugeProxy.weights(sLP1.address);
        let votessLP2 = await sGaugeProxy.weights(sLP2.address);
        let totalVotesS = await sGaugeProxy.totalWeight();
        let lockedVotessLP1 = await sGaugeProxy.lockedWeights(sLP1.address);
        let lockedVotessLP2 = await sGaugeProxy.lockedWeights(sLP2.address);
        let lockedTotalVotesS = await sGaugeProxy.lockedTotalWeight();
        let sGaugeProxySPIRIT = await SPIRIT.balanceOf(sGaugeProxy.address);

        console.log("STABLE Gauge Proxy Status");
        console.log("LP1 vote weight", divDec(votessLP1));
        console.log("LP2 vote weight", divDec(votessLP2));
        console.log("Total vote weight", divDec(totalVotesS));
        console.log("Locked LP1 vote weight", divDec(lockedVotessLP1));
        console.log("Locked LP2 vote weight", divDec(lockedVotessLP2));
        console.log("Locked Total vote weight", divDec(lockedTotalVotesS));
        console.log("SPIRIT", divDec(sGaugeProxySPIRIT));
        console.log();

        // sLP1 Gauge Status
        let totalBalancesLP1Gauge = await sLP1Gauge.totalSupply();
        let sLP1GaugeSPIRIT = await SPIRIT.balanceOf(sLP1Gauge.address);
        let ownersLP1Gauge = await sLP1Gauge.balanceOf(owner.address);

        console.log("sLP1 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalancesLP1Gauge));
        console.log("SPIRIT", divDec(sLP1GaugeSPIRIT));
        console.log("Owner LP Balance", divDec(ownersLP1Gauge));
        console.log();

        // sLP1 Bribe Status
        let totalVotessLP1Bribe = await sLP1Bribe.totalSupply();
        let sLP1BribeUSDC = await USDC.balanceOf(sLP1Bribe.address);
        let sLP1BribeUSD1 = await USD1.balanceOf(sLP1Bribe.address);
        let user1sLP1BribeVotes = await sLP1Bribe.balanceOf(user1.address);
        let user2sLP1BribeVotes = await sLP1Bribe.balanceOf(user2.address);

        console.log("sLP1 Bribe Status")
        console.log("Total Vote Balance", divDec(totalVotessLP1Bribe));
        console.log("USDC", divDec(sLP1BribeUSDC));
        console.log("USD1", divDec(sLP1BribeUSD1));
        console.log("User1 Vote Balance", divDec(user1sLP1BribeVotes));
        console.log("User2 Vote Balance", divDec(user2sLP1BribeVotes));
        console.log();

        // sLP2 Gauge Status
        let totalBalancesLP2Gauge = await sLP2Gauge.totalSupply();
        let sLP2GaugeSPIRIT = await SPIRIT.balanceOf(sLP2Gauge.address);
        let ownersLP2Gauge = await sLP2Gauge.balanceOf(owner.address);

        console.log("sLP2 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalancesLP2Gauge));
        console.log("SPIRIT", divDec(sLP2GaugeSPIRIT));
        console.log("Owner LP Balance", divDec(ownersLP2Gauge));
        console.log();

        // sLP2 Bribe Status
        let totalVotessLP2Bribe = await sLP2Bribe.totalSupply();
        let sLP2BribeUSDC = await USDC.balanceOf(sLP2Bribe.address);
        let sLP2BribeUSD2 = await USD2.balanceOf(sLP2Bribe.address);
        let user1sLP2BribeVotes = await sLP2Bribe.balanceOf(user1.address);
        let user2sLP2BribeVotes = await sLP2Bribe.balanceOf(user2.address);

        console.log("sLP2 Bribe Status")
        console.log("Total Vote Balance", divDec(totalVotessLP2Bribe));
        console.log("USDC", divDec(sLP2BribeUSDC));
        console.log("USD2", divDec(sLP2BribeUSD2));
        console.log("User1 Vote Balance", divDec(user1sLP2BribeVotes));
        console.log("User2 Vote Balance", divDec(user2sLP2BribeVotes));
        console.log();
        
    }); 

    it('User2 lock SPIRIT for inSPIRIT', async function () {
        console.log("******************************************************");
        console.log("User2 locks in 1000 SPIRIT for inSPIRIT");
        await SPIRIT.connect(user2).approve(inSPIRIT.address, oneThousand);
        await inSPIRIT.connect(user2).create_lock(oneThousand, April2026);
    });

    it('User2 balance status', async function () {
        console.log("******************************************************");
        console.log();
       // User2 Balances
       let user2SPIRIT = await SPIRIT.balanceOf(user2.address);
       let user2InSpirit = await inSPIRIT['balanceOf(address)'](user2.address);
       let user2WETH = await WETH.balanceOf(user2.address);
       let user2TK1 = await TK1.balanceOf(user2.address);
       let user2TK2 = await TK2.balanceOf(user2.address);
       let user2USDC = await USDC.balanceOf(user2.address);
       let user2USD1 = await USD1.balanceOf(user2.address);
       let user2USD2 = await USD2.balanceOf(user2.address);
       let user2vLP1 = await vLP1.balanceOf(user2.address);
       let user2vLP2 = await vLP2.balanceOf(user2.address);
       let user2sLP1 = await sLP1.balanceOf(user2.address);
       let user2sLP2 = await sLP2.balanceOf(user2.address);
       let user2aLP1 = await aLP2.balanceOf(user2.address);
       let user2aLP2 = await aLP2.balanceOf(user2.address);

       console.log("User2 BALANCES");
       console.log("SPIRIT", divDec(user2SPIRIT));
       console.log("inSPIRIT", divDec(user2InSpirit));
       console.log("WETH", divDec(user2WETH));
       console.log("TK1", divDec(user2TK1));
       console.log("TK2", divDec(user2TK2));
       console.log("USDC", divDec(user2USDC));
       console.log("USD1", divDec(user2USD1));
       console.log("USD2", divDec(user2USD2));
       console.log("vLP1", divDec(user2vLP1));
       console.log("vLP2", divDec(user2vLP2));
       console.log("sLP1", divDec(user2sLP1));
       console.log("sLP2", divDec(user2sLP2));
       console.log("aLP2", divDec(user2aLP1));
       console.log("aLP2", divDec(user2aLP2));
       console.log();
    });

    it('User2 votes on gauges proxies', async function () {
        console.log("******************************************************");
        console.log("User2 votes on variable gauge proxy with  500 on vLP1, 500 on vLP2");
        await vGaugeProxy.connect(user2).vote([vLP1.address, vLP2.address], [fiveHundred, fiveHundred]);
        console.log("User2 votes on stable gauge proxy with  500 on sLP1, 500 on sLP2");
        await sGaugeProxy.connect(user2).vote([sLP1.address, sLP2.address], [fiveHundred, fiveHundred]);
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

    it('STABLE Gauge Proxy Status', async function () {
        console.log("******************************************************");
        console.log();

        // Stable Gauge Proxy Status
        let votessLP1 = await sGaugeProxy.weights(sLP1.address);
        let votessLP2 = await sGaugeProxy.weights(sLP2.address);
        let totalVotesS = await sGaugeProxy.totalWeight();
        let lockedVotessLP1 = await sGaugeProxy.lockedWeights(sLP1.address);
        let lockedVotessLP2 = await sGaugeProxy.lockedWeights(sLP2.address);
        let lockedTotalVotesS = await sGaugeProxy.lockedTotalWeight();
        let sGaugeProxySPIRIT = await SPIRIT.balanceOf(sGaugeProxy.address);

        console.log("STABLE Gauge Proxy Status");
        console.log("LP1 vote weight", divDec(votessLP1));
        console.log("LP2 vote weight", divDec(votessLP2));
        console.log("Total vote weight", divDec(totalVotesS));
        console.log("Locked LP1 vote weight", divDec(lockedVotessLP1));
        console.log("Locked LP2 vote weight", divDec(lockedVotessLP2));
        console.log("Locked Total vote weight", divDec(lockedTotalVotesS));
        console.log("SPIRIT", divDec(sGaugeProxySPIRIT));
        console.log();

        // sLP1 Gauge Status
        let totalBalancesLP1Gauge = await sLP1Gauge.totalSupply();
        let sLP1GaugeSPIRIT = await SPIRIT.balanceOf(sLP1Gauge.address);
        let ownersLP1Gauge = await sLP1Gauge.balanceOf(owner.address);

        console.log("sLP1 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalancesLP1Gauge));
        console.log("SPIRIT", divDec(sLP1GaugeSPIRIT));
        console.log("Owner LP Balance", divDec(ownersLP1Gauge));
        console.log();

        // sLP1 Bribe Status
        let totalVotessLP1Bribe = await sLP1Bribe.totalSupply();
        let sLP1BribeUSDC = await USDC.balanceOf(sLP1Bribe.address);
        let sLP1BribeUSD1 = await USD1.balanceOf(sLP1Bribe.address);
        let user1sLP1BribeVotes = await sLP1Bribe.balanceOf(user1.address);
        let user2sLP1BribeVotes = await sLP1Bribe.balanceOf(user2.address);

        console.log("sLP1 Bribe Status")
        console.log("Total Vote Balance", divDec(totalVotessLP1Bribe));
        console.log("USDC", divDec(sLP1BribeUSDC));
        console.log("USD1", divDec(sLP1BribeUSD1));
        console.log("User1 Vote Balance", divDec(user1sLP1BribeVotes));
        console.log("User2 Vote Balance", divDec(user2sLP1BribeVotes));
        console.log();

        // sLP2 Gauge Status
        let totalBalancesLP2Gauge = await sLP2Gauge.totalSupply();
        let sLP2GaugeSPIRIT = await SPIRIT.balanceOf(sLP2Gauge.address);
        let ownersLP2Gauge = await sLP2Gauge.balanceOf(owner.address);

        console.log("sLP2 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalancesLP2Gauge));
        console.log("SPIRIT", divDec(sLP2GaugeSPIRIT));
        console.log("Owner LP Balance", divDec(ownersLP2Gauge));
        console.log();

        // sLP1 Bribe Status
        let totalVotessLP2Bribe = await sLP2Bribe.totalSupply();
        let sLP2BribeUSDC = await USDC.balanceOf(sLP2Bribe.address);
        let sLP2BribeUSD2 = await USD2.balanceOf(sLP2Bribe.address);
        let user1sLP2BribeVotes = await sLP2Bribe.balanceOf(user1.address);
        let user2sLP2BribeVotes = await sLP2Bribe.balanceOf(user2.address);

        console.log("sLP2 Bribe Status")
        console.log("Total Vote Balance", divDec(totalVotessLP2Bribe));
        console.log("USDC", divDec(sLP2BribeUSDC));
        console.log("USD2", divDec(sLP2BribeUSD2));
        console.log("User1 Vote Balance", divDec(user1sLP2BribeVotes));
        console.log("User2 Vote Balance", divDec(user2sLP2BribeVotes));
        console.log();
        
    }); 

    it('Owner deposits LPs into Gauges', async function () {
        console.log("******************************************************");
        console.log("Owner deposits vLP1 into Gauge");
        await vLP1.connect(owner).approve(vLP1Gauge.address, oneThousand);
        await vLP1Gauge.connect(owner).deposit(await vLP1.balanceOf(owner.address));
        console.log("Owner deposits vLP2 into Gauge");
        await vLP2.connect(owner).approve(vLP2Gauge.address, oneThousand);
        await vLP2Gauge.connect(owner).deposit(await vLP2.balanceOf(owner.address));
        console.log("Owner deposits sLP1 into Gauge");
        await sLP1.connect(owner).approve(sLP1Gauge.address, oneThousand);
        await sLP1Gauge.connect(owner).deposit(await sLP1.balanceOf(owner.address));
        console.log("Owner deposits sLP2 into Gauge");
        await sLP2.connect(owner).approve(sLP2Gauge.address, oneThousand);
        await sLP2Gauge.connect(owner).deposit(await sLP2.balanceOf(owner.address));
        console.log("Owner deposits aLP1 into Gauge");
        await aLP1.connect(owner).approve(aLP1Gauge.address, oneThousand);
        await aLP1Gauge.connect(owner).deposit(await aLP1.balanceOf(owner.address));
        console.log("Owner deposits aLP2 into Gauge");
        await aLP2.connect(owner).approve(aLP2Gauge.address, oneThousand);
        await aLP2Gauge.connect(owner).deposit(await aLP2.balanceOf(owner.address));   
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

    it('STABLE Gauge Proxy Status', async function () {
        console.log("******************************************************");
        console.log();

        // Stable Gauge Proxy Status
        let votessLP1 = await sGaugeProxy.weights(sLP1.address);
        let votessLP2 = await sGaugeProxy.weights(sLP2.address);
        let totalVotesS = await sGaugeProxy.totalWeight();
        let lockedVotessLP1 = await sGaugeProxy.lockedWeights(sLP1.address);
        let lockedVotessLP2 = await sGaugeProxy.lockedWeights(sLP2.address);
        let lockedTotalVotesS = await sGaugeProxy.lockedTotalWeight();
        let sGaugeProxySPIRIT = await SPIRIT.balanceOf(sGaugeProxy.address);

        console.log("STABLE Gauge Proxy Status");
        console.log("LP1 vote weight", divDec(votessLP1));
        console.log("LP2 vote weight", divDec(votessLP2));
        console.log("Total vote weight", divDec(totalVotesS));
        console.log("Locked LP1 vote weight", divDec(lockedVotessLP1));
        console.log("Locked LP2 vote weight", divDec(lockedVotessLP2));
        console.log("Locked Total vote weight", divDec(lockedTotalVotesS));
        console.log("SPIRIT", divDec(sGaugeProxySPIRIT));
        console.log();

        // sLP1 Gauge Status
        let totalBalancesLP1Gauge = await sLP1Gauge.totalSupply();
        let sLP1GaugeSPIRIT = await SPIRIT.balanceOf(sLP1Gauge.address);
        let ownersLP1Gauge = await sLP1Gauge.balanceOf(owner.address);

        console.log("sLP1 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalancesLP1Gauge));
        console.log("SPIRIT", divDec(sLP1GaugeSPIRIT));
        console.log("Owner LP Balance", divDec(ownersLP1Gauge));
        console.log();

        // sLP1 Bribe Status
        let totalVotessLP1Bribe = await sLP1Bribe.totalSupply();
        let sLP1BribeUSDC = await USDC.balanceOf(sLP1Bribe.address);
        let sLP1BribeUSD1 = await USD1.balanceOf(sLP1Bribe.address);
        let user1sLP1BribeVotes = await sLP1Bribe.balanceOf(user1.address);
        let user2sLP1BribeVotes = await sLP1Bribe.balanceOf(user2.address);

        console.log("sLP1 Bribe Status")
        console.log("Total Vote Balance", divDec(totalVotessLP1Bribe));
        console.log("USDC", divDec(sLP1BribeUSDC));
        console.log("USD1", divDec(sLP1BribeUSD1));
        console.log("User1 Vote Balance", divDec(user1sLP1BribeVotes));
        console.log("User2 Vote Balance", divDec(user2sLP1BribeVotes));
        console.log();

        // sLP2 Gauge Status
        let totalBalancesLP2Gauge = await sLP2Gauge.totalSupply();
        let sLP2GaugeSPIRIT = await SPIRIT.balanceOf(sLP2Gauge.address);
        let ownersLP2Gauge = await sLP2Gauge.balanceOf(owner.address);

        console.log("sLP2 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalancesLP2Gauge));
        console.log("SPIRIT", divDec(sLP2GaugeSPIRIT));
        console.log("Owner LP Balance", divDec(ownersLP2Gauge));
        console.log();

        // sLP1 Bribe Status
        let totalVotessLP2Bribe = await sLP2Bribe.totalSupply();
        let sLP2BribeUSDC = await USDC.balanceOf(sLP2Bribe.address);
        let sLP2BribeUSD2 = await USD2.balanceOf(sLP2Bribe.address);
        let user1sLP2BribeVotes = await sLP2Bribe.balanceOf(user1.address);
        let user2sLP2BribeVotes = await sLP2Bribe.balanceOf(user2.address);

        console.log("sLP2 Bribe Status")
        console.log("Total Vote Balance", divDec(totalVotessLP2Bribe));
        console.log("USDC", divDec(sLP2BribeUSDC));
        console.log("USD2", divDec(sLP2BribeUSD2));
        console.log("User1 Vote Balance", divDec(user1sLP2BribeVotes));
        console.log("User2 Vote Balance", divDec(user2sLP2BribeVotes));
        console.log();
        
    }); 

    it('ADMIN Gauge Proxy Status', async function () {
        console.log("******************************************************");
        console.log();

        // Admin Gauge Proxy Status
        let weightaLP1 = await aGaugeProxy.gaugeWeights(aLP1.address);
        let weightaLP2 = await aGaugeProxy.gaugeWeights(aLP2.address);
        let totalWeightS = await aGaugeProxy.totalWeight();
        let aGaugeProxySPIRIT = await SPIRIT.balanceOf(aGaugeProxy.address);

        console.log("ADMIN Gauge Proxy Status");
        console.log("LP1 weight", divDec(weightaLP1));
        console.log("LP2 weight", divDec(weightaLP2));
        console.log("Total weight", divDec(totalWeightS));
        console.log("SPIRIT", divDec(aGaugeProxySPIRIT));
        console.log();

        // aLP1 Gauge Status
        let totalBalanceaLP1Gauge = await aLP1Gauge.totalSupply();
        let aLP1GaugeSPIRIT = await SPIRIT.balanceOf(aLP1Gauge.address);
        let owneraLP1Gauge = await aLP1Gauge.balanceOf(owner.address);

        console.log("aLP1 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalanceaLP1Gauge));
        console.log("SPIRIT", divDec(aLP1GaugeSPIRIT));
        console.log("Owner LP Balance", divDec(owneraLP1Gauge));
        console.log();

        // aLP1 Gauge Status
        let totalBalanceaLP2Gauge = await aLP2Gauge.totalSupply();
        let aLP2GaugeSPIRIT = await SPIRIT.balanceOf(aLP2Gauge.address);
        let owneraLP2Gauge = await aLP2Gauge.balanceOf(owner.address);

        console.log("aLP2 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalanceaLP2Gauge));
        console.log("SPIRIT", divDec(aLP2GaugeSPIRIT));
        console.log("Owner LP Balance", divDec(owneraLP2Gauge));
        console.log();
        
    }); 

    it('LP Pair Status', async function () {
        console.log("******************************************************");
        console.log();

        // vLP1 Pair Status
        let vLP1WETH = await WETH.balanceOf(vLP1.address);
        let vLP1TK1 = await TK1.balanceOf(vLP1.address);

        console.log("vLP1 BALANCE (WETH-TK1)");
        console.log("WETH", divDec(vLP1WETH));
        console.log("TK1", divDec(vLP1TK1));

        // vLP1 Fee Status
        let vLP1FeesWETH = await WETH.balanceOf(vLP1Fees.address)
        let vLP1FeesTK1 = await TK1.balanceOf(vLP1Fees.address);

        console.log("vLP1 FEES BALANCE");
        console.log("WETH", divDec(vLP1FeesWETH));
        console.log("TK1", divDec(vLP1FeesTK1));
        console.log();

        // vLP2 Pair Status
        let vLP2WETH = await WETH.balanceOf(vLP2.address);
        let vLP2TK2 = await TK2.balanceOf(vLP2.address);

        console.log("vLP2 BALANCE (WETH-TK2)");
        console.log("WETH", divDec(vLP2WETH));
        console.log("TK2", divDec(vLP2TK2));

        // vLP2 Fee Status
        let vLP2FeesWETH = await WETH.balanceOf(vLP2Fees.address)
        let vLP2FeesTK2 = await TK2.balanceOf(vLP2Fees.address);

        console.log("vLP1 FEES BALANCE");
        console.log("WETH", divDec(vLP2FeesWETH));
        console.log("TK2", divDec(vLP2FeesTK2));
        console.log();

        // sLP1 Pair Status
        let sLP1USDC = await USDC.balanceOf(sLP1.address);
        let sLP1USD1 = await USD1.balanceOf(sLP1.address);

        console.log("sLP1 BALANCE (USDC-USD1)");
        console.log("USDC", divDec(sLP1USDC));
        console.log("USD1", divDec(sLP1USD1));

        // sLP1 Fee Status
        let sLP1FeesUSDC = await USDC.balanceOf(sLP1Fees.address);
        let sLP1FeesUSD1 = await USD1.balanceOf(sLP1Fees.address);

        console.log("sLP1 FEES BALANCE");
        console.log("USDC", divDec(sLP1FeesUSDC));
        console.log("USD1", divDec(sLP1FeesUSD1));
        console.log();

        // sLP2 Pair Status
        let sLP2USDC = await USDC.balanceOf(sLP2.address);
        let sLP2USD2 = await USD2.balanceOf(sLP2.address);

        console.log("sLP2 BALANCE (USDC-USD2)");
        console.log("USDC", divDec(sLP2USDC));
        console.log("USD1", divDec(sLP2USD2));

        // sLP2 Fee Status
        let sLP2FeesUSDC = await USDC.balanceOf(sLP2Fees.address);
        let sLP2FeesUSD2 = await USD2.balanceOf(sLP2Fees.address);

        console.log("sLP1 FEES BALANCE");
        console.log("USDC", divDec(sLP2FeesUSDC));
        console.log("USD1", divDec(sLP2FeesUSD2));
        console.log();

        // aLP1 Pair Status
        let aLP1WETH = await WETH.balanceOf(aLP1.address);
        let aLP1SPIRIT = await SPIRIT.balanceOf(aLP1.address);

        console.log("aLP1 BALANCE (WETH-SPIRIT)");
        console.log("WETH", divDec(aLP1WETH));
        console.log("SPIRIT", divDec(aLP1SPIRIT));

        // aLP1 Fee Status
        let aLP1FeesWETH = await WETH.balanceOf(aLP1Fees.address);
        let aLP1FeesSPIRIT = await SPIRIT.balanceOf(aLP1Fees.address);

        console.log("aLP1 FEES BALANCE");
        console.log("WETH", divDec(aLP1FeesWETH));
        console.log("SPIRIT", divDec(aLP1FeesSPIRIT));
        console.log();

        // aLP2 Pair Status
        let aLP2WETH = await WETH.balanceOf(aLP2.address);
        let aLP2USDC = await USDC.balanceOf(aLP2.address);

        console.log("sLP2 BALANCE (WETH-USDC)");
        console.log("WETH", divDec(aLP2WETH));
        console.log("USDC", divDec(aLP2USDC));

        // aLP2 Fee Status
        let aLP2FeesWETH = await WETH.balanceOf(aLP2Fees.address);
        let aLP2FeesUSDC = await USDC.balanceOf(aLP2Fees.address);

        console.log("aLP1 FEES BALANCE");
        console.log("WETH", divDec(aLP2FeesWETH));
        console.log("USDC", divDec(aLP2FeesUSDC));
        console.log();

    }); 

    it('Owner variable swap from WETH to TK1', async function () {
        console.log("******************************************************");
        console.log("Owner swaps 10 WETH to TK1 in variable pair");
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, TK1.address, false, owner.address, 1685083888);
    });

    it('Owner variable swap from WETH to TK2', async function () {
        console.log("******************************************************");
        console.log("Owner swaps 10 WETH to TK2 in variable pair");
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, TK2.address, false, owner.address, 1685083888);
    });

    it('Owner stable swap from USDC to USD1', async function () {
        console.log("******************************************************");
        console.log("Owner swaps 10 USDC to USD1 in variable pair");
        await USDC.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USDC.address, USD1.address, true, owner.address, 1685083888);
    });

    it('Owner stable swap from USDC to USD2', async function () {
        console.log("******************************************************");
        console.log("Owner swaps 10 USDC to USD2 in variable pair");
        await USDC.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USDC.address, USD2.address, true, owner.address, 1685083888);
    });

    it('Owner variable swap from WETH to SPIRIT', async function () {
        console.log("******************************************************");
        console.log("Owner swaps 10 WETH to SPIRIT in variable pair");
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, SPIRIT.address, false, owner.address, 1685083888);
    });

    it('Owner variable swap from WETH to USDC', async function () {
        console.log("******************************************************");
        console.log("Owner swaps 10 WETH to USDC in variable pair");
        await WETH.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, WETH.address, USDC.address, false, owner.address, 1685083888);
    });

    it('LP Pair Status', async function () {
        console.log("******************************************************");
        console.log();

        // vLP1 Pair Status
        let vLP1WETH = await WETH.balanceOf(vLP1.address);
        let vLP1TK1 = await TK1.balanceOf(vLP1.address);

        console.log("vLP1 BALANCE (WETH-TK1)");
        console.log("WETH", divDec(vLP1WETH));
        console.log("TK1", divDec(vLP1TK1));

        // vLP1 Fee Status
        let vLP1FeesWETH = await WETH.balanceOf(vLP1Fees.address)
        let vLP1FeesTK1 = await TK1.balanceOf(vLP1Fees.address);

        console.log("vLP1 FEES BALANCE");
        console.log("WETH", divDec(vLP1FeesWETH));
        console.log("TK1", divDec(vLP1FeesTK1));
        console.log();

        // vLP2 Pair Status
        let vLP2WETH = await WETH.balanceOf(vLP2.address);
        let vLP2TK2 = await TK2.balanceOf(vLP2.address);

        console.log("vLP2 BALANCE (WETH-TK2)");
        console.log("WETH", divDec(vLP2WETH));
        console.log("TK2", divDec(vLP2TK2));

        // vLP2 Fee Status
        let vLP2FeesWETH = await WETH.balanceOf(vLP2Fees.address)
        let vLP2FeesTK2 = await TK2.balanceOf(vLP2Fees.address);

        console.log("vLP1 FEES BALANCE");
        console.log("WETH", divDec(vLP2FeesWETH));
        console.log("TK2", divDec(vLP2FeesTK2));
        console.log();

        // sLP1 Pair Status
        let sLP1USDC = await USDC.balanceOf(sLP1.address);
        let sLP1USD1 = await USD1.balanceOf(sLP1.address);

        console.log("sLP1 BALANCE (USDC-USD1)");
        console.log("USDC", divDec(sLP1USDC));
        console.log("USD1", divDec(sLP1USD1));

        // sLP1 Fee Status
        let sLP1FeesUSDC = await USDC.balanceOf(sLP1Fees.address);
        let sLP1FeesUSD1 = await USD1.balanceOf(sLP1Fees.address);

        console.log("sLP1 FEES BALANCE");
        console.log("USDC", divDec(sLP1FeesUSDC));
        console.log("USD1", divDec(sLP1FeesUSD1));
        console.log();

        // sLP2 Pair Status
        let sLP2USDC = await USDC.balanceOf(sLP2.address);
        let sLP2USD2 = await USD2.balanceOf(sLP2.address);

        console.log("sLP2 BALANCE (USDC-USD2)");
        console.log("USDC", divDec(sLP2USDC));
        console.log("USD1", divDec(sLP2USD2));

        // sLP2 Fee Status
        let sLP2FeesUSDC = await USDC.balanceOf(sLP2Fees.address);
        let sLP2FeesUSD2 = await USD2.balanceOf(sLP2Fees.address);

        console.log("sLP1 FEES BALANCE");
        console.log("USDC", divDec(sLP2FeesUSDC));
        console.log("USD1", divDec(sLP2FeesUSD2));
        console.log();

        // aLP1 Pair Status
        let aLP1WETH = await WETH.balanceOf(aLP1.address);
        let aLP1SPIRIT = await SPIRIT.balanceOf(aLP1.address);

        console.log("aLP1 BALANCE (WETH-SPIRIT)");
        console.log("WETH", divDec(aLP1WETH));
        console.log("SPIRIT", divDec(aLP1SPIRIT));

        // aLP1 Fee Status
        let aLP1FeesWETH = await WETH.balanceOf(aLP1Fees.address);
        let aLP1FeesSPIRIT = await SPIRIT.balanceOf(aLP1Fees.address);

        console.log("aLP1 FEES BALANCE");
        console.log("WETH", divDec(aLP1FeesWETH));
        console.log("SPIRIT", divDec(aLP1FeesSPIRIT));
        console.log();

        // aLP2 Pair Status
        let aLP2WETH = await WETH.balanceOf(aLP2.address);
        let aLP2USDC = await USDC.balanceOf(aLP2.address);

        console.log("sLP2 BALANCE (WETH-USDC)");
        console.log("WETH", divDec(aLP2WETH));
        console.log("USDC", divDec(aLP2USDC));

        // aLP2 Fee Status
        let aLP2FeesWETH = await WETH.balanceOf(aLP2Fees.address);
        let aLP2FeesUSDC = await USDC.balanceOf(aLP2Fees.address);

        console.log("aLP1 FEES BALANCE");
        console.log("WETH", divDec(aLP2FeesWETH));
        console.log("USDC", divDec(aLP2FeesUSDC));
        console.log();

    }); 

    it('Owner variable swap from TK1 to WETH', async function () {
        console.log("******************************************************");
        console.log("Owner swaps 10 TK1 to WETH in variable pair");
        await TK1.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, TK1.address, WETH.address, false, owner.address, 1685083888);
    });

    it('Owner variable swap from TK2 to WETH', async function () {
        console.log("******************************************************");
        console.log("Owner swaps 10 TK2 to WETH in variable pair");
        await TK2.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, TK2.address, WETH.address, false, owner.address, 1685083888);
    });

    it('Owner stable swap from USD1 to USDC', async function () {
        console.log("******************************************************");
        console.log("Owner swaps 10 USD1 to USDC in variable pair");
        await USD1.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USD1.address, USDC.address, true, owner.address, 1685083888);
    });

    it('Owner stable swap from USDC2 to USDC', async function () {
        console.log("******************************************************");
        console.log("Owner swaps 10 USD2 to USDC in variable pair");
        await USD2.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USD2.address, USDC.address, true, owner.address, 1685083888);
    });

    it('Owner variable swap from SPIRIT to WETH', async function () {
        console.log("******************************************************");
        console.log("Owner swaps 10 SPIRIT to WETH in variable pair");
        await SPIRIT.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, SPIRIT.address, WETH.address, false, owner.address, 1685083888);
    });

    it('Owner variable swap from USDC to WETH', async function () {
        console.log("******************************************************");
        console.log("Owner swaps 10 USDC to WETH in variable pair");
        await USDC.connect(owner).approve(router.address, ten);
        await router.connect(owner).swapExactTokensForTokensSimple(ten, 0, USDC.address, WETH.address, false, owner.address, 1685083888);
    });

    it('LP Pair Status', async function () {
        console.log("******************************************************");
        console.log();

        // vLP1 Pair Status
        let vLP1WETH = await WETH.balanceOf(vLP1.address);
        let vLP1TK1 = await TK1.balanceOf(vLP1.address);

        console.log("vLP1 BALANCE (WETH-TK1)");
        console.log("WETH", divDec(vLP1WETH));
        console.log("TK1", divDec(vLP1TK1));

        // vLP1 Fee Status
        let vLP1FeesWETH = await WETH.balanceOf(vLP1Fees.address)
        let vLP1FeesTK1 = await TK1.balanceOf(vLP1Fees.address);

        console.log("vLP1 FEES BALANCE");
        console.log("WETH", divDec(vLP1FeesWETH));
        console.log("TK1", divDec(vLP1FeesTK1));
        console.log();

        // vLP2 Pair Status
        let vLP2WETH = await WETH.balanceOf(vLP2.address);
        let vLP2TK2 = await TK2.balanceOf(vLP2.address);

        console.log("vLP2 BALANCE (WETH-TK2)");
        console.log("WETH", divDec(vLP2WETH));
        console.log("TK2", divDec(vLP2TK2));

        // vLP2 Fee Status
        let vLP2FeesWETH = await WETH.balanceOf(vLP2Fees.address)
        let vLP2FeesTK2 = await TK2.balanceOf(vLP2Fees.address);

        console.log("vLP1 FEES BALANCE");
        console.log("WETH", divDec(vLP2FeesWETH));
        console.log("TK2", divDec(vLP2FeesTK2));
        console.log();

        // sLP1 Pair Status
        let sLP1USDC = await USDC.balanceOf(sLP1.address);
        let sLP1USD1 = await USD1.balanceOf(sLP1.address);

        console.log("sLP1 BALANCE (USDC-USD1)");
        console.log("USDC", divDec(sLP1USDC));
        console.log("USD1", divDec(sLP1USD1));

        // sLP1 Fee Status
        let sLP1FeesUSDC = await USDC.balanceOf(sLP1Fees.address);
        let sLP1FeesUSD1 = await USD1.balanceOf(sLP1Fees.address);

        console.log("sLP1 FEES BALANCE");
        console.log("USDC", divDec(sLP1FeesUSDC));
        console.log("USD1", divDec(sLP1FeesUSD1));
        console.log();

        // sLP2 Pair Status
        let sLP2USDC = await USDC.balanceOf(sLP2.address);
        let sLP2USD2 = await USD2.balanceOf(sLP2.address);

        console.log("sLP2 BALANCE (USDC-USD2)");
        console.log("USDC", divDec(sLP2USDC));
        console.log("USD1", divDec(sLP2USD2));

        // sLP2 Fee Status
        let sLP2FeesUSDC = await USDC.balanceOf(sLP2Fees.address);
        let sLP2FeesUSD2 = await USD2.balanceOf(sLP2Fees.address);

        console.log("sLP1 FEES BALANCE");
        console.log("USDC", divDec(sLP2FeesUSDC));
        console.log("USD1", divDec(sLP2FeesUSD2));
        console.log();

        // aLP1 Pair Status
        let aLP1WETH = await WETH.balanceOf(aLP1.address);
        let aLP1SPIRIT = await SPIRIT.balanceOf(aLP1.address);

        console.log("aLP1 BALANCE (WETH-SPIRIT)");
        console.log("WETH", divDec(aLP1WETH));
        console.log("SPIRIT", divDec(aLP1SPIRIT));

        // aLP1 Fee Status
        let aLP1FeesWETH = await WETH.balanceOf(aLP1Fees.address);
        let aLP1FeesSPIRIT = await SPIRIT.balanceOf(aLP1Fees.address);

        console.log("aLP1 FEES BALANCE");
        console.log("WETH", divDec(aLP1FeesWETH));
        console.log("SPIRIT", divDec(aLP1FeesSPIRIT));
        console.log();

        // aLP2 Pair Status
        let aLP2WETH = await WETH.balanceOf(aLP2.address);
        let aLP2USDC = await USDC.balanceOf(aLP2.address);

        console.log("sLP2 BALANCE (WETH-USDC)");
        console.log("WETH", divDec(aLP2WETH));
        console.log("USDC", divDec(aLP2USDC));

        // aLP2 Fee Status
        let aLP2FeesWETH = await WETH.balanceOf(aLP2Fees.address);
        let aLP2FeesUSDC = await USDC.balanceOf(aLP2Fees.address);

        console.log("aLP1 FEES BALANCE");
        console.log("WETH", divDec(aLP2FeesWETH));
        console.log("USDC", divDec(aLP2FeesUSDC));
        console.log();

    }); 

    it('Fill Gauge Proxy with SPIRIT for 10 blocks', async function () {
        console.log("******************************************************");
        // Forward time by 10 blocks
        console.log("Forward by 10 blocks");
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

        console.log("Pending SPIRIT variable gauge proxy", divDec(pendingSPIRITVGP));
        console.log("Pending SPIRIT stable gauge proxy", divDec(pendingSPIRITSGP));
        console.log("Pending SPIRIT admin gauge proxy", divDec(pendingSPIRITAGP));
    });

    it('Gauge Proxy Status', async function () {
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

        // Stable Gauge Proxy Status
        let votessLP1 = await sGaugeProxy.weights(sLP1.address);
        let votessLP2 = await sGaugeProxy.weights(sLP2.address);
        let totalVotesS = await sGaugeProxy.totalWeight();
        let lockedVotessLP1 = await sGaugeProxy.lockedWeights(sLP1.address);
        let lockedVotessLP2 = await sGaugeProxy.lockedWeights(sLP2.address);
        let lockedTotalVotesS = await sGaugeProxy.lockedTotalWeight();
        let sGaugeProxySPIRIT = await SPIRIT.balanceOf(sGaugeProxy.address);

        console.log("STABLE Gauge Proxy Status");
        console.log("LP1 vote weight", divDec(votessLP1));
        console.log("LP2 vote weight", divDec(votessLP2));
        console.log("Total vote weight", divDec(totalVotesS));
        console.log("Locked LP1 vote weight", divDec(lockedVotessLP1));
        console.log("Locked LP2 vote weight", divDec(lockedVotessLP2));
        console.log("Locked Total vote weight", divDec(lockedTotalVotesS));
        console.log("SPIRIT", divDec(sGaugeProxySPIRIT));
        console.log();

        // Admin Gauge Proxy Status
        let weightaLP1 = await aGaugeProxy.gaugeWeights(aLP1.address);
        let weightaLP2 = await aGaugeProxy.gaugeWeights(aLP2.address);
        let totalWeightS = await aGaugeProxy.totalWeight();
        let aGaugeProxySPIRIT = await SPIRIT.balanceOf(aGaugeProxy.address);

        console.log("ADMIN Gauge Proxy Status");
        console.log("LP1 weight", divDec(weightaLP1));
        console.log("LP2 weight", divDec(weightaLP2));
        console.log("Total weight", divDec(totalWeightS));
        console.log("SPIRIT", divDec(aGaugeProxySPIRIT));
        console.log();

    }); 

    it('Fee Distributor Status', async function () {
        console.log("******************************************************");
        console.log();

        // Fee Distributor Status
        let feeDistSPIRIT = await SPIRIT.balanceOf(feeDistributor.address);
        let ownerInSpirit = await inSPIRIT['balanceOf(address)'](owner.address);
        let user1InSpirit = await inSPIRIT['balanceOf(address)'](user1.address);
        let user2InSpirit = await inSPIRIT['balanceOf(address)'](user2.address);

        console.log("Fee Distributor Status")
        console.log("SPIRIT", divDec(feeDistSPIRIT));
        console.log("Owner inSPIRIT", divDec(ownerInSpirit));
        console.log("User1 inSPIRIT", divDec(user1InSpirit));
        console.log("User2 inSPIRIT", divDec(user2InSpirit));
        console.log();
        
    }); 

    it('Owner calls preDistristribute on variable/stable gauge proxies', async function () {
        console.log("******************************************************");
        await vGaugeProxy.preDistribute();
        await sGaugeProxy.preDistribute();
        console.log("Predistribute is called");
    });

    it('Gauge Proxy Status', async function () {
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

        // Stable Gauge Proxy Status
        let votessLP1 = await sGaugeProxy.weights(sLP1.address);
        let votessLP2 = await sGaugeProxy.weights(sLP2.address);
        let totalVotesS = await sGaugeProxy.totalWeight();
        let lockedVotessLP1 = await sGaugeProxy.lockedWeights(sLP1.address);
        let lockedVotessLP2 = await sGaugeProxy.lockedWeights(sLP2.address);
        let lockedTotalVotesS = await sGaugeProxy.lockedTotalWeight();
        let sGaugeProxySPIRIT = await SPIRIT.balanceOf(sGaugeProxy.address);

        console.log("STABLE Gauge Proxy Status");
        console.log("LP1 vote weight", divDec(votessLP1));
        console.log("LP2 vote weight", divDec(votessLP2));
        console.log("Total vote weight", divDec(totalVotesS));
        console.log("Locked LP1 vote weight", divDec(lockedVotessLP1));
        console.log("Locked LP2 vote weight", divDec(lockedVotessLP2));
        console.log("Locked Total vote weight", divDec(lockedTotalVotesS));
        console.log("SPIRIT", divDec(sGaugeProxySPIRIT));
        console.log();

        // Admin Gauge Proxy Status
        let weightaLP1 = await aGaugeProxy.gaugeWeights(aLP1.address);
        let weightaLP2 = await aGaugeProxy.gaugeWeights(aLP2.address);
        let totalWeightS = await aGaugeProxy.totalWeight();
        let aGaugeProxySPIRIT = await SPIRIT.balanceOf(aGaugeProxy.address);

        console.log("ADMIN Gauge Proxy Status");
        console.log("LP1 weight", divDec(weightaLP1));
        console.log("LP2 weight", divDec(weightaLP2));
        console.log("Total weight", divDec(totalWeightS));
        console.log("SPIRIT", divDec(aGaugeProxySPIRIT));
        console.log();

    }); 

    it('Owner calls distribute to all gauges', async function () {
        console.log("******************************************************");
        await vGaugeProxy.distribute(0,2);
        await sGaugeProxy.distribute(0,2);
        await aGaugeProxy.distribute();
        console.log("SPIRIT distributed to gauges");
    });

    it('Fee Distributor Status', async function () {
        console.log("******************************************************");
        console.log();

        // Fee Distributor Status
        let feeDistSPIRIT = await SPIRIT.balanceOf(feeDistributor.address);
        let ownerInSpirit = await inSPIRIT['balanceOf(address)'](owner.address);
        let user1InSpirit = await inSPIRIT['balanceOf(address)'](user1.address);
        let user2InSpirit = await inSPIRIT['balanceOf(address)'](user2.address);

        console.log("Fee Distributor Status")
        console.log("SPIRIT", divDec(feeDistSPIRIT));
        console.log("Owner inSPIRIT", divDec(ownerInSpirit));
        console.log("User1 inSPIRIT", divDec(user1InSpirit));
        console.log("User2 inSPIRIT", divDec(user2InSpirit));
        console.log();
        
    }); 

    it('Gauge Proxy Status', async function () {
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

        // Stable Gauge Proxy Status
        let votessLP1 = await sGaugeProxy.weights(sLP1.address);
        let votessLP2 = await sGaugeProxy.weights(sLP2.address);
        let totalVotesS = await sGaugeProxy.totalWeight();
        let lockedVotessLP1 = await sGaugeProxy.lockedWeights(sLP1.address);
        let lockedVotessLP2 = await sGaugeProxy.lockedWeights(sLP2.address);
        let lockedTotalVotesS = await sGaugeProxy.lockedTotalWeight();
        let sGaugeProxySPIRIT = await SPIRIT.balanceOf(sGaugeProxy.address);

        console.log("STABLE Gauge Proxy Status");
        console.log("LP1 vote weight", divDec(votessLP1));
        console.log("LP2 vote weight", divDec(votessLP2));
        console.log("Total vote weight", divDec(totalVotesS));
        console.log("Locked LP1 vote weight", divDec(lockedVotessLP1));
        console.log("Locked LP2 vote weight", divDec(lockedVotessLP2));
        console.log("Locked Total vote weight", divDec(lockedTotalVotesS));
        console.log("SPIRIT", divDec(sGaugeProxySPIRIT));
        console.log();

        // Admin Gauge Proxy Status
        let weightaLP1 = await aGaugeProxy.gaugeWeights(aLP1.address);
        let weightaLP2 = await aGaugeProxy.gaugeWeights(aLP2.address);
        let totalWeightS = await aGaugeProxy.totalWeight();
        let aGaugeProxySPIRIT = await SPIRIT.balanceOf(aGaugeProxy.address);

        console.log("ADMIN Gauge Proxy Status");
        console.log("LP1 weight", divDec(weightaLP1));
        console.log("LP2 weight", divDec(weightaLP2));
        console.log("Total weight", divDec(totalWeightS));
        console.log("SPIRIT", divDec(aGaugeProxySPIRIT));
        console.log();

    }); 

    it('User Balance Status', async function () {
        console.log("******************************************************");
        console.log();

        // Treasury Balances
        let treasurySPIRIT = await SPIRIT.balanceOf(treasury.address);
        let treasuryWETH = await WETH.balanceOf(treasury.address);
        let treasuryTK1 = await TK1.balanceOf(treasury.address);
        let treasuryTK2 = await TK2.balanceOf(treasury.address);
        let treasuryUSDC = await USDC.balanceOf(treasury.address);
        let treasuryUSD1 = await USD1.balanceOf(treasury.address);
        let treasuryUSD2 = await USD2.balanceOf(treasury.address);

        console.log("Treasury BALANCES");
        console.log("SPIRIT", divDec(treasurySPIRIT));
        console.log("WETH", divDec(treasuryWETH));
        console.log("TK1", divDec(treasuryTK1));
        console.log("TK2", divDec(treasuryTK2));
        console.log("USDC", divDec(treasuryUSDC));
        console.log("USD1", divDec(treasuryUSD1));
        console.log("USD2", divDec(treasuryUSD2));
        console.log();

        // SpiritMaker Balances
        let spiritMakerSPIRIT = await SPIRIT.balanceOf(spiritMaker.address);
        let spiritMakerWETH = await WETH.balanceOf(spiritMaker.address);
        let spiritMakerTK1 = await TK1.balanceOf(spiritMaker.address);
        let spiritMakerTK2 = await TK2.balanceOf(spiritMaker.address);
        let spiritMakerUSDC = await USDC.balanceOf(spiritMaker.address);
        let spiritMakerUSD1 = await USD1.balanceOf(spiritMaker.address);
        let spiritMakerUSD2 = await USD2.balanceOf(spiritMaker.address);

        console.log("SpiritMaker BALANCES");
        console.log("SPIRIT", divDec(spiritMakerSPIRIT));
        console.log("WETH", divDec(spiritMakerWETH));
        console.log("TK1", divDec(spiritMakerTK1));
        console.log("TK2", divDec(spiritMakerTK2));
        console.log("USDC", divDec(spiritMakerUSDC));
        console.log("USD1", divDec(spiritMakerUSD1));
        console.log("USD2", divDec(spiritMakerUSD2));
        console.log();

        // Protocol1 Balances
        let protocol1SPIRIT = await SPIRIT.balanceOf(protocol1.address);
        let protocol1WETH = await WETH.balanceOf(protocol1.address);
        let protocol1TK1 = await TK1.balanceOf(protocol1.address);
        let protocol1TK2 = await TK2.balanceOf(protocol1.address);
        let protocol1USDC = await USDC.balanceOf(protocol1.address);
        let protocol1USD1 = await USD1.balanceOf(protocol1.address);
        let protocol1USD2 = await USD2.balanceOf(protocol1.address);

        console.log("Protocol1 BALANCES");
        console.log("SPIRIT", divDec(protocol1SPIRIT));
        console.log("WETH", divDec(protocol1WETH));
        console.log("TK1", divDec(protocol1TK1));
        console.log("TK2", divDec(protocol1TK2));
        console.log("USDC", divDec(protocol1USDC));
        console.log("USD1", divDec(protocol1USD1));
        console.log("USD2", divDec(protocol1USD2));
        console.log();

        // Protocol2 Balances
        let protocol2SPIRIT = await SPIRIT.balanceOf(protocol2.address);
        let protocol2WETH = await WETH.balanceOf(protocol2.address);
        let protocol2TK1 = await TK1.balanceOf(protocol2.address);
        let protocol2TK2 = await TK2.balanceOf(protocol2.address);
        let protocol2USDC = await USDC.balanceOf(protocol2.address);
        let protocol2USD1 = await USD1.balanceOf(protocol2.address);
        let protocol2USD2 = await USD2.balanceOf(protocol2.address);

        console.log("Protocol2 BALANCES");
        console.log("SPIRIT", divDec(protocol2SPIRIT));
        console.log("WETH", divDec(protocol2WETH));
        console.log("TK1", divDec(protocol2TK1));
        console.log("TK2", divDec(protocol2TK2));
        console.log("USDC", divDec(protocol2USDC));
        console.log("USD1", divDec(protocol2USD1));
        console.log("USD2", divDec(protocol2USD2));
        console.log();

    }); 

    it('Owner starts voting fees on all bribes', async function () {
        console.log("******************************************************");
        await vLP1Gauge.claimVotingFees();
        await vLP2Gauge.claimVotingFees();
        await sLP1Gauge.claimVotingFees();
        await sLP2Gauge.claimVotingFees();
        console.log("Voting fees started in bribes");
    });

    it('User Balance Status', async function () {
        console.log("******************************************************");
        console.log();

        // Treasury Balances
        let treasurySPIRIT = await SPIRIT.balanceOf(treasury.address);
        let treasuryWETH = await WETH.balanceOf(treasury.address);
        let treasuryTK1 = await TK1.balanceOf(treasury.address);
        let treasuryTK2 = await TK2.balanceOf(treasury.address);
        let treasuryUSDC = await USDC.balanceOf(treasury.address);
        let treasuryUSD1 = await USD1.balanceOf(treasury.address);
        let treasuryUSD2 = await USD2.balanceOf(treasury.address);

        console.log("Treasury BALANCES");
        console.log("SPIRIT", divDec(treasurySPIRIT));
        console.log("WETH", divDec(treasuryWETH));
        console.log("TK1", divDec(treasuryTK1));
        console.log("TK2", divDec(treasuryTK2));
        console.log("USDC", divDec(treasuryUSDC));
        console.log("USD1", divDec(treasuryUSD1));
        console.log("USD2", divDec(treasuryUSD2));
        console.log();

        // SpiritMaker Balances
        let spiritMakerSPIRIT = await SPIRIT.balanceOf(spiritMaker.address);
        let spiritMakerWETH = await WETH.balanceOf(spiritMaker.address);
        let spiritMakerTK1 = await TK1.balanceOf(spiritMaker.address);
        let spiritMakerTK2 = await TK2.balanceOf(spiritMaker.address);
        let spiritMakerUSDC = await USDC.balanceOf(spiritMaker.address);
        let spiritMakerUSD1 = await USD1.balanceOf(spiritMaker.address);
        let spiritMakerUSD2 = await USD2.balanceOf(spiritMaker.address);

        console.log("SpiritMaker BALANCES");
        console.log("SPIRIT", divDec(spiritMakerSPIRIT));
        console.log("WETH", divDec(spiritMakerWETH));
        console.log("TK1", divDec(spiritMakerTK1));
        console.log("TK2", divDec(spiritMakerTK2));
        console.log("USDC", divDec(spiritMakerUSDC));
        console.log("USD1", divDec(spiritMakerUSD1));
        console.log("USD2", divDec(spiritMakerUSD2));
        console.log();

        // Protocol1 Balances
        let protocol1SPIRIT = await SPIRIT.balanceOf(protocol1.address);
        let protocol1WETH = await WETH.balanceOf(protocol1.address);
        let protocol1TK1 = await TK1.balanceOf(protocol1.address);
        let protocol1TK2 = await TK2.balanceOf(protocol1.address);
        let protocol1USDC = await USDC.balanceOf(protocol1.address);
        let protocol1USD1 = await USD1.balanceOf(protocol1.address);
        let protocol1USD2 = await USD2.balanceOf(protocol1.address);

        console.log("Protocol1 BALANCES");
        console.log("SPIRIT", divDec(protocol1SPIRIT));
        console.log("WETH", divDec(protocol1WETH));
        console.log("TK1", divDec(protocol1TK1));
        console.log("TK2", divDec(protocol1TK2));
        console.log("USDC", divDec(protocol1USDC));
        console.log("USD1", divDec(protocol1USD1));
        console.log("USD2", divDec(protocol1USD2));
        console.log();

        // Protocol2 Balances
        let protocol2SPIRIT = await SPIRIT.balanceOf(protocol2.address);
        let protocol2WETH = await WETH.balanceOf(protocol2.address);
        let protocol2TK1 = await TK1.balanceOf(protocol2.address);
        let protocol2TK2 = await TK2.balanceOf(protocol2.address);
        let protocol2USDC = await USDC.balanceOf(protocol2.address);
        let protocol2USD1 = await USD1.balanceOf(protocol2.address);
        let protocol2USD2 = await USD2.balanceOf(protocol2.address);

        console.log("Protocol2 BALANCES");
        console.log("SPIRIT", divDec(protocol2SPIRIT));
        console.log("WETH", divDec(protocol2WETH));
        console.log("TK1", divDec(protocol2TK1));
        console.log("TK2", divDec(protocol2TK2));
        console.log("USDC", divDec(protocol2USDC));
        console.log("USD1", divDec(protocol2USD1));
        console.log("USD2", divDec(protocol2USD2));
        console.log();

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

    it('STABLE Gauge Proxy Status', async function () {
        console.log("******************************************************");
        console.log();

        // Stable Gauge Proxy Status
        let votessLP1 = await sGaugeProxy.weights(sLP1.address);
        let votessLP2 = await sGaugeProxy.weights(sLP2.address);
        let totalVotesS = await sGaugeProxy.totalWeight();
        let lockedVotessLP1 = await sGaugeProxy.lockedWeights(sLP1.address);
        let lockedVotessLP2 = await sGaugeProxy.lockedWeights(sLP2.address);
        let lockedTotalVotesS = await sGaugeProxy.lockedTotalWeight();
        let sGaugeProxySPIRIT = await SPIRIT.balanceOf(sGaugeProxy.address);

        console.log("STABLE Gauge Proxy Status");
        console.log("LP1 vote weight", divDec(votessLP1));
        console.log("LP2 vote weight", divDec(votessLP2));
        console.log("Total vote weight", divDec(totalVotesS));
        console.log("Locked LP1 vote weight", divDec(lockedVotessLP1));
        console.log("Locked LP2 vote weight", divDec(lockedVotessLP2));
        console.log("Locked Total vote weight", divDec(lockedTotalVotesS));
        console.log("SPIRIT", divDec(sGaugeProxySPIRIT));
        console.log();

        // sLP1 Gauge Status
        let totalBalancesLP1Gauge = await sLP1Gauge.totalSupply();
        let sLP1GaugeSPIRIT = await SPIRIT.balanceOf(sLP1Gauge.address);
        let ownersLP1Gauge = await sLP1Gauge.balanceOf(owner.address);

        console.log("sLP1 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalancesLP1Gauge));
        console.log("SPIRIT", divDec(sLP1GaugeSPIRIT));
        console.log("Owner LP Balance", divDec(ownersLP1Gauge));
        console.log();

        // sLP1 Bribe Status
        let totalVotessLP1Bribe = await sLP1Bribe.totalSupply();
        let sLP1BribeUSDC = await USDC.balanceOf(sLP1Bribe.address);
        let sLP1BribeUSD1 = await USD1.balanceOf(sLP1Bribe.address);
        let user1sLP1BribeVotes = await sLP1Bribe.balanceOf(user1.address);
        let user2sLP1BribeVotes = await sLP1Bribe.balanceOf(user2.address);

        console.log("sLP1 Bribe Status")
        console.log("Total Vote Balance", divDec(totalVotessLP1Bribe));
        console.log("USDC", divDec(sLP1BribeUSDC));
        console.log("USD1", divDec(sLP1BribeUSD1));
        console.log("User1 Vote Balance", divDec(user1sLP1BribeVotes));
        console.log("User2 Vote Balance", divDec(user2sLP1BribeVotes));
        console.log();

        // sLP2 Gauge Status
        let totalBalancesLP2Gauge = await sLP2Gauge.totalSupply();
        let sLP2GaugeSPIRIT = await SPIRIT.balanceOf(sLP2Gauge.address);
        let ownersLP2Gauge = await sLP2Gauge.balanceOf(owner.address);

        console.log("sLP2 Gauge Status")
        console.log("Total LP Balance", divDec(totalBalancesLP2Gauge));
        console.log("SPIRIT", divDec(sLP2GaugeSPIRIT));
        console.log("Owner LP Balance", divDec(ownersLP2Gauge));
        console.log();

        // sLP2 Bribe Status
        let totalVotessLP2Bribe = await sLP2Bribe.totalSupply();
        let sLP2BribeUSDC = await USDC.balanceOf(sLP2Bribe.address);
        let sLP2BribeUSD2 = await USD2.balanceOf(sLP2Bribe.address);
        let user1sLP2BribeVotes = await sLP2Bribe.balanceOf(user1.address);
        let user2sLP2BribeVotes = await sLP2Bribe.balanceOf(user2.address);

        console.log("sLP2 Bribe Status")
        console.log("Total Vote Balance", divDec(totalVotessLP2Bribe));
        console.log("USDC", divDec(sLP2BribeUSDC));
        console.log("USD2", divDec(sLP2BribeUSD2));
        console.log("User1 Vote Balance", divDec(user1sLP2BribeVotes));
        console.log("User2 Vote Balance", divDec(user2sLP2BribeVotes));
        console.log();
        
    }); 

    it('Forward time by 8 days', async function () {
        console.log("******************************************************");
        // Forward time by 8 day
        await network.provider.send('evm_increaseTime', [8*24*3600]); 
        await network.provider.send('evm_mine');
        console.log("Time forwarded by 8 days");
    });

    it('User Balance Status', async function () {
        console.log("******************************************************");
        console.log();

        // User1 Balances
        let user1SPIRIT = await SPIRIT.balanceOf(user1.address);
        let user1InSpirit = await inSPIRIT['balanceOf(address)'](user1.address);
        let user1WETH = await WETH.balanceOf(user1.address);
        let user1TK1 = await TK1.balanceOf(user1.address);
        let user1TK2 = await TK2.balanceOf(user1.address);
        let user1USDC = await USDC.balanceOf(user1.address);
        let user1USD1 = await USD1.balanceOf(user1.address);
        let user1USD2 = await USD2.balanceOf(user1.address);

        console.log("User1 BALANCES");
        console.log("SPIRIT", divDec(user1SPIRIT));
        console.log("inSPIRIT", divDec(user1InSpirit));
        console.log("WETH", divDec(user1WETH));
        console.log("TK1", divDec(user1TK1));
        console.log("TK2", divDec(user1TK2));
        console.log("USDC", divDec(user1USDC));
        console.log("USD1", divDec(user1USD1));
        console.log("USD2", divDec(user1USD2));
        console.log();

        // User2 Balances
        let user2SPIRIT = await SPIRIT.balanceOf(user2.address);
        let user2InSpirit = await inSPIRIT['balanceOf(address)'](user2.address);
        let user2WETH = await WETH.balanceOf(user2.address);
        let user2TK1 = await TK1.balanceOf(user2.address);
        let user2TK2 = await TK2.balanceOf(user2.address);
        let user2USDC = await USDC.balanceOf(user2.address);
        let user2USD1 = await USD1.balanceOf(user2.address);
        let user2USD2 = await USD2.balanceOf(user2.address);

        console.log("User2 BALANCES");
        console.log("SPIRIT", divDec(user2SPIRIT));
        console.log("inSPIRIT", divDec(user2InSpirit));
        console.log("WETH", divDec(user2WETH));
        console.log("TK1", divDec(user2TK1));
        console.log("TK2", divDec(user2TK2));
        console.log("USDC", divDec(user2USDC));
        console.log("USD1", divDec(user2USD1));
        console.log("USD2", divDec(user2USD2));
        console.log();

    }); 

    it('User1 claims voting fees from all bribes', async function () {
        console.log("******************************************************");
        await vGaugeProxy.connect(user1).claimBribes([vLP1Bribe.address, vLP2Bribe.address], user1.address); 
        await sGaugeProxy.connect(user1).claimBribes([sLP1Bribe.address, sLP2Bribe.address], user1.address); 
        console.log("User1 claims their voting fees");
    });

    it('User2 claims voting fees from all bribes', async function () {
        console.log("******************************************************");
        await vGaugeProxy.connect(user2).claimBribes([vLP1Bribe.address, vLP2Bribe.address], user2.address); 
        await sGaugeProxy.connect(user2).claimBribes([sLP1Bribe.address, sLP2Bribe.address], user2.address); 
        console.log("User2 claims their voting fees");
    });

    it('User Balance Status', async function () {
        console.log("******************************************************");
        console.log();

        // User1 Balances
        let user1SPIRIT = await SPIRIT.balanceOf(user1.address);
        let user1InSpirit = await inSPIRIT['balanceOf(address)'](user1.address);
        let user1WETH = await WETH.balanceOf(user1.address);
        let user1TK1 = await TK1.balanceOf(user1.address);
        let user1TK2 = await TK2.balanceOf(user1.address);
        let user1USDC = await USDC.balanceOf(user1.address);
        let user1USD1 = await USD1.balanceOf(user1.address);
        let user1USD2 = await USD2.balanceOf(user1.address);

        console.log("User1 BALANCES");
        console.log("SPIRIT", divDec(user1SPIRIT));
        console.log("inSPIRIT", divDec(user1InSpirit));
        console.log("WETH", divDec(user1WETH));
        console.log("TK1", divDec(user1TK1));
        console.log("TK2", divDec(user1TK2));
        console.log("USDC", divDec(user1USDC));
        console.log("USD1", divDec(user1USD1));
        console.log("USD2", divDec(user1USD2));
        console.log();

        // User2 Balances
        let user2SPIRIT = await SPIRIT.balanceOf(user2.address);
        let user2InSpirit = await inSPIRIT['balanceOf(address)'](user2.address);
        let user2WETH = await WETH.balanceOf(user2.address);
        let user2TK1 = await TK1.balanceOf(user2.address);
        let user2TK2 = await TK2.balanceOf(user2.address);
        let user2USDC = await USDC.balanceOf(user2.address);
        let user2USD1 = await USD1.balanceOf(user2.address);
        let user2USD2 = await USD2.balanceOf(user2.address);

        console.log("User2 BALANCES");
        console.log("SPIRIT", divDec(user2SPIRIT));
        console.log("inSPIRIT", divDec(user2InSpirit));
        console.log("WETH", divDec(user2WETH));
        console.log("TK1", divDec(user2TK1));
        console.log("TK2", divDec(user2TK2));
        console.log("USDC", divDec(user2USDC));
        console.log("USD1", divDec(user2USD1));
        console.log("USD2", divDec(user2USD2));
        console.log();

    }); 

    it('Owner Balance Status', async function () {
        console.log("******************************************************");
        console.log();

        // Owner Balances
        let ownerSPIRIT = await SPIRIT.balanceOf(owner.address);
        let ownerInSpirit = await inSPIRIT['balanceOf(address)'](owner.address);
        let ownerWETH = await WETH.balanceOf(owner.address);
        let ownerTK1 = await TK1.balanceOf(owner.address);
        let ownerTK2 = await TK2.balanceOf(owner.address);
        let ownerUSDC = await USDC.balanceOf(owner.address);
        let ownerUSD1 = await USD1.balanceOf(owner.address);
        let ownerUSD2 = await USD2.balanceOf(owner.address);
        let ownervLP1 = await vLP1.balanceOf(owner.address);
        let ownervLP2 = await vLP2.balanceOf(owner.address);
        let ownersLP1 = await sLP1.balanceOf(owner.address);
        let ownersLP2 = await sLP2.balanceOf(owner.address);
        let owneraLP1 = await aLP1.balanceOf(owner.address);
        let owneraLP2 = await aLP2.balanceOf(owner.address);

        console.log("OWNER BALANCES");
        console.log("SPIRIT", divDec(ownerSPIRIT));
        console.log("inSPIRIT", divDec(ownerInSpirit));
        console.log("WETH", divDec(ownerWETH));
        console.log("TK1", divDec(ownerTK1));
        console.log("TK2", divDec(ownerTK2));
        console.log("USDC", divDec(ownerUSDC));
        console.log("USD1", divDec(ownerUSD1));
        console.log("USD2", divDec(ownerUSD2));
        console.log("vLP1", divDec(ownervLP1));
        console.log("vLP2", divDec(ownervLP2));
        console.log("sLP1", divDec(ownersLP1));
        console.log("sLP2", divDec(ownersLP2));
        console.log("aLP1", divDec(owneraLP1));
        console.log("aLP2", divDec(owneraLP2));
        console.log();

    }); 

    it('Owner claims farm rewards from all gauges', async function () {
        console.log("******************************************************");
        await vLP1Gauge.connect(owner).getReward();
        await vLP2Gauge.connect(owner).getReward();
        await sLP1Gauge.connect(owner).getReward();
        await sLP2Gauge.connect(owner).getReward();
        await aLP1Gauge.connect(owner).getReward();
        await aLP2Gauge.connect(owner).getReward();
        console.log("Owner claims their farming rewards");
    });

    it('Owner Balance Status', async function () {
        console.log("******************************************************");
        console.log();

        // Owner Balances
        let ownerSPIRIT = await SPIRIT.balanceOf(owner.address);
        let ownerInSpirit = await inSPIRIT['balanceOf(address)'](owner.address);
        let ownerWETH = await WETH.balanceOf(owner.address);
        let ownerTK1 = await TK1.balanceOf(owner.address);
        let ownerTK2 = await TK2.balanceOf(owner.address);
        let ownerUSDC = await USDC.balanceOf(owner.address);
        let ownerUSD1 = await USD1.balanceOf(owner.address);
        let ownerUSD2 = await USD2.balanceOf(owner.address);
        let ownervLP1 = await vLP1.balanceOf(owner.address);
        let ownervLP2 = await vLP2.balanceOf(owner.address);
        let ownersLP1 = await sLP1.balanceOf(owner.address);
        let ownersLP2 = await sLP2.balanceOf(owner.address);
        let owneraLP1 = await aLP1.balanceOf(owner.address);
        let owneraLP2 = await aLP2.balanceOf(owner.address);

        console.log("OWNER BALANCES");
        console.log("SPIRIT", divDec(ownerSPIRIT));
        console.log("inSPIRIT", divDec(ownerInSpirit));
        console.log("WETH", divDec(ownerWETH));
        console.log("TK1", divDec(ownerTK1));
        console.log("TK2", divDec(ownerTK2));
        console.log("USDC", divDec(ownerUSDC));
        console.log("USD1", divDec(ownerUSD1));
        console.log("USD2", divDec(ownerUSD2));
        console.log("vLP1", divDec(ownervLP1));
        console.log("vLP2", divDec(ownervLP2));
        console.log("sLP1", divDec(ownersLP1));
        console.log("sLP2", divDec(ownersLP2));
        console.log("aLP1", divDec(owneraLP1));
        console.log("aLP2", divDec(owneraLP2));
        console.log();

    }); 

})

