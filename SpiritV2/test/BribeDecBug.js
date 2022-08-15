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
const divDec6 = (amount, decimals = 6) => amount/10**decimals;
const divDec8 = (amount, decimals = 8) => amount/10**decimals;
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { execPath } = require("process");
const { getParsedCommandLineOfConfigFile } = require("typescript");

const AddressZero = '0x0000000000000000000000000000000000000000'
const MINIMUM_LIQUIDITY = "1000"
const ten = convert('10', 18)
const fifty = convert('50', 18)
const oneHundred = convert('100', 18);
const oneHundred6Dec = convert('100', 6);
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
let sGaugeProxy, sLP1, sLP1Fees, sLP1Gauge, sLP1Bribe, sLP2, sLP2Fees, sLP2Gauge, sLP2Bribe;
// tokens
let SPIRIT, inSPIRIT, WETH, USDC, USDT, USD1;

describe("BribeBug Test", function () {
  
    before("Initial set up", async function () {
        console.log("Begin Initialization");

        // initialize users
        [owner, admin, user1, user2, user3, user4, protocol1, protocol2, protocol3, spiritMaker, treasury] = await ethers.getSigners();

        // initialize tokens
        // mints 1000 tokens to deployer
        const erc20Mock = await ethers.getContractFactory("ERC20Mock");
        WETH = await erc20Mock.deploy("WETH", "WETH");
        USD1 = await erc20Mock.deploy("USD1", "USD1");
        USD2 = await erc20Mock.deploy("USD2", "USD2");
        console.log("- Tokens Initialized");

        const usdcToken = await ethers.getContractFactory("contracts/SpiritV1/Usdc.sol:Usdc");
        USDC = await usdcToken.deploy("USDC", "USDC", 6, owner.address);
        USDT = await usdcToken.deploy("USDT", "USDT", 8, owner.address);
        console.log("- USDC Initialized");

        await USDC.mint(owner.address, 1000);
        await USDT.mint(owner.address, 1000);

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

        // Create sLP: USDC-USD1
        await USDC.connect(owner).approve(router.address, oneHundred6Dec);
        await USD1.connect(owner).approve(router.address, oneHundred);
        await router.connect(owner).addLiquidity(USDC.address, USD1.address, true, oneHundred6Dec, oneHundred, oneHundred6Dec, oneHundred, owner.address, 1685083888);

        const sLP1Address = await pairFactory.getPair(USDC.address, USD1.address, true);
        sLP1 = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Pair", sLP1Address);
        await pairFactory.connect(owner).setProtocolAddress(sLP1.address, protocol1.address);
        console.log("- sLP1 Initialized"); 

        const sLP1FeesAddress = await sLP1.fees();
        sLP1Fees = await ethers.getContractAt("contracts/AMM/BaseV1Factory.sol:BaseV1Fees", sLP1FeesAddress);
        console.log("- sLP1Fees Initialized"); 

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

        // Add sLP1 Gauge/Bribe
        await sGaugeProxy.addGauge(sLP1.address);
        let sLP1GaugeAddress = await sGaugeProxy.getGauge(sLP1.address);
        let sLP1BribeAddress = await sGaugeProxy.getBribes(sLP1GaugeAddress);
        sLP1Gauge = await ethers.getContractAt("contracts/SpiritV2/StableGaugeProxy.sol:Gauge", sLP1GaugeAddress);
        sLP1Bribe = await ethers.getContractAt("contracts/SpiritV2/Bribes.sol:Bribe", sLP1BribeAddress);
        console.log("- sLP1 Gauge/Bribe Initialized in sGaugeProxy");

        // Create pool in masterChef for minSPIRIT and deposit minSPIRIT from gaugeProxy
        const sMinSpiritAddr = await sGaugeProxy.TOKEN();
        await masterChef.add(100, sMinSpiritAddr, 0, true);
        await sGaugeProxy.setPID(0);
        await sGaugeProxy.deposit();

        // Owner locks in 1000 SPIRIT for inSPIRIT
        await SPIRIT.approve(inSPIRIT.address, oneThousand);
        await inSPIRIT.create_lock(oneThousand, April2026);

        // Turn on ve33 tokenomics
        await sGaugeProxy.toggleVE();

        // Transfer 1000 SPIRIT to users
        await SPIRIT.transfer(user1.address, oneThousand); // transfer SPIRIT to user1
        await SPIRIT.transfer(user2.address, oneThousand); // transfer SPIRIT to user2
        await SPIRIT.transfer(user3.address, oneThousand); // transfer SPIRIT to user2
        await SPIRIT.transfer(user4.address, oneThousand); // transfer SPIRIT to user2

        console.log("Owner deposits sLP1 into Gauge");
        await sLP1.connect(owner).approve(sLP1Gauge.address, oneThousand);
        await sLP1Gauge.connect(owner).deposit(await sLP1.balanceOf(owner.address));
        
        console.log("Initialization Complete");
    });

    it('STABLE Gauge Proxy Status', async function () {
        console.log("******************************************************");
        console.log();

        // Stable Gauge Proxy Status
        let votessLP1 = await sGaugeProxy.weights(sLP1.address);
        let totalVotesS = await sGaugeProxy.totalWeight();
        let lockedVotessLP1 = await sGaugeProxy.lockedWeights(sLP1.address);
        let lockedTotalVotesS = await sGaugeProxy.lockedTotalWeight();
        let sGaugeProxySPIRIT = await SPIRIT.balanceOf(sGaugeProxy.address);

        console.log("STABLE Gauge Proxy Status");
        console.log("LP1 vote weight", divDec(votessLP1));
        console.log("Total vote weight", divDec(totalVotesS));
        console.log("Locked LP1 vote weight", divDec(lockedVotessLP1));
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
        let sLP1BribeUSDT = await USDT.balanceOf(sLP1Bribe.address);
        let user1sLP1BribeVotes = await sLP1Bribe.balanceOf(user1.address);
        let user2sLP1BribeVotes = await sLP1Bribe.balanceOf(user2.address);

        console.log("sLP1 Bribe Status")
        console.log("Total Vote Balance", divDec(totalVotessLP1Bribe));
        console.log("USDC", divDec6(sLP1BribeUSDC));
        console.log("USDT", divDec8(sLP1BribeUSDT));
        console.log("User1 Vote Balance", divDec(user1sLP1BribeVotes));
        console.log("User2 Vote Balance", divDec(user2sLP1BribeVotes));
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
        console.log("USDC", divDec6(sLP1FeesUSDC));
        console.log("USD1", divDec(sLP1FeesUSD1));
        console.log();

    }); 

    it('User Balance Status', async function () {
        console.log("******************************************************");
        console.log();

        // Owner Balances
        let ownerSPIRIT = await SPIRIT.balanceOf(owner.address);
        let ownerInSpirit = await inSPIRIT['balanceOf(address)'](owner.address);
        let ownerUSDC = await USDC.balanceOf(owner.address);
        let ownerUSDT = await USDT.balanceOf(owner.address);
        let ownersLP1 = await sLP1.balanceOf(owner.address);

        console.log("OWNER BALANCES");
        console.log("SPIRIT", divDec(ownerSPIRIT));
        console.log("inSPIRIT", divDec(ownerInSpirit));
        console.log("USDC", divDec6(ownerUSDC));
        console.log("USDT", divDec8(ownerUSDT));
        console.log("sLP1", divDec(ownersLP1));
        console.log();

        // User1 Balances
        let user1SPIRIT = await SPIRIT.balanceOf(user1.address);
        let user1InSpirit = await inSPIRIT['balanceOf(address)'](user1.address);
        let user1USDC = await USDC.balanceOf(user1.address);
        let user1USDT = await USDT.balanceOf(user1.address);
        let user1sLP1 = await sLP1.balanceOf(user1.address);

        console.log("User1 BALANCES");
        console.log("SPIRIT", divDec(user1SPIRIT));
        console.log("inSPIRIT", divDec(user1InSpirit));
        console.log("USDC", divDec6(user1USDC));
        console.log("USDT", divDec8(user1USDT));
        console.log("sLP1", divDec(user1sLP1));
        console.log();

        // User2 Balances
        let user2SPIRIT = await SPIRIT.balanceOf(user2.address);
        let user2InSpirit = await inSPIRIT['balanceOf(address)'](user2.address);
        let user2USDC = await USDC.balanceOf(user2.address);
        let user2USDT = await USDT.balanceOf(user2.address);
        let user2sLP1 = await sLP1.balanceOf(user2.address);

        console.log("User2 BALANCES");
        console.log("SPIRIT", divDec(user2SPIRIT));
        console.log("inSPIRIT", divDec(user2InSpirit));
        console.log("USDC", divDec6(user2USDC));
        console.log("USDT", divDec8(user2USDT));
        console.log("sLP1", divDec(user2sLP1));
        console.log();

    }); 

    it('User1 lock SPIRIT for inSPIRIT', async function () {
        console.log("******************************************************");
        console.log("User1 locks in 1000 SPIRIT for inSPIRIT");
        await SPIRIT.connect(user1).approve(inSPIRIT.address, oneThousand);
        await inSPIRIT.connect(user1).create_lock(oneThousand, April2026);
    });

    it('User1 balance status', async function () {
        console.log("******************************************************");
        // User1 Balances
        let user1SPIRIT = await SPIRIT.balanceOf(user1.address);
        let user1InSpirit = await inSPIRIT['balanceOf(address)'](user1.address);
        let user1USDC = await USDC.balanceOf(user1.address);
        let user1USDT = await USDT.balanceOf(user1.address);
        let user1sLP1 = await sLP1.balanceOf(user1.address);

        console.log("User1 BALANCES");
        console.log("SPIRIT", divDec(user1SPIRIT));
        console.log("inSPIRIT", divDec(user1InSpirit));
        console.log("USDC", divDec6(user1USDC));
        console.log("USDT", divDec8(user1USDT));
        console.log("sLP1", divDec(user1sLP1));
        console.log();
    });

    it('User1 votes on gauges proxies', async function () {
        console.log("******************************************************");
        console.log("User1 votes on stable gauge proxy with 100 on sLP1");
        await sGaugeProxy.connect(user1).vote([sLP1.address], [oneHundred]);
    });

    it('STABLE Gauge Proxy Status', async function () {
        console.log("******************************************************");
        console.log();

        // Stable Gauge Proxy Status
        let votessLP1 = await sGaugeProxy.weights(sLP1.address);
        let totalVotesS = await sGaugeProxy.totalWeight();
        let lockedVotessLP1 = await sGaugeProxy.lockedWeights(sLP1.address);
        let lockedTotalVotesS = await sGaugeProxy.lockedTotalWeight();
        let sGaugeProxySPIRIT = await SPIRIT.balanceOf(sGaugeProxy.address);

        console.log("STABLE Gauge Proxy Status");
        console.log("LP1 vote weight", divDec(votessLP1));
        console.log("Total vote weight", divDec(totalVotesS));
        console.log("Locked LP1 vote weight", divDec(lockedVotessLP1));
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
        let sLP1BribeUSDT = await USDT.balanceOf(sLP1Bribe.address);
        let user1sLP1BribeVotes = await sLP1Bribe.balanceOf(user1.address);
        let user2sLP1BribeVotes = await sLP1Bribe.balanceOf(user2.address);

        console.log("sLP1 Bribe Status")
        console.log("Total Vote Balance", divDec(totalVotessLP1Bribe));
        console.log("USDC", divDec6(sLP1BribeUSDC));
        console.log("USDT", divDec8(sLP1BribeUSDT));
        console.log("User1 Vote Balance", divDec(user1sLP1BribeVotes));
        console.log("User2 Vote Balance", divDec(user2sLP1BribeVotes));
        console.log();
        
    }); 

    it('Owner begins voting fees on LP1Gauge with 0.50 USDC', async function () {
        console.log("******************************************************");
        console.log("BRIBE TEST #1");
        console.log("******************************************************");;

        await USDC.approve(sLP1Bribe.address, oneHundred6Dec);
        await expect(sLP1Bribe.notifyRewardAmount(USDC.address, 500000)).to.be.revertedWith('reward amount should be greater than DURATION');;
        await sLP1Bribe.notifyRewardAmount(USDC.address, 604800);

        let rewardRateUSDC = (await sLP1Bribe.rewardData(USDC.address)).rewardRate;

        console.log("USDC/s", divDec6(rewardRateUSDC));
    });

    it('STABLE Gauge Proxy Status', async function () {
        console.log("******************************************************");
        console.log();

        // Stable Gauge Proxy Status
        let votessLP1 = await sGaugeProxy.weights(sLP1.address);
        let totalVotesS = await sGaugeProxy.totalWeight();
        let lockedVotessLP1 = await sGaugeProxy.lockedWeights(sLP1.address);
        let lockedTotalVotesS = await sGaugeProxy.lockedTotalWeight();
        let sGaugeProxySPIRIT = await SPIRIT.balanceOf(sGaugeProxy.address);

        console.log("STABLE Gauge Proxy Status");
        console.log("LP1 vote weight", divDec(votessLP1));
        console.log("Total vote weight", divDec(totalVotesS));
        console.log("Locked LP1 vote weight", divDec(lockedVotessLP1));
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
        let sLP1BribeUSDT = await USDT.balanceOf(sLP1Bribe.address);
        let user1sLP1BribeVotes = await sLP1Bribe.balanceOf(user1.address);
        let user2sLP1BribeVotes = await sLP1Bribe.balanceOf(user2.address);

        console.log("sLP1 Bribe Status")
        console.log("Total Vote Balance", divDec(totalVotessLP1Bribe));
        console.log("USDC", divDec6(sLP1BribeUSDC));
        console.log("USDT", divDec8(sLP1BribeUSDT));
        console.log("User1 Vote Balance", divDec(user1sLP1BribeVotes));
        console.log("User2 Vote Balance", divDec(user2sLP1BribeVotes));
        console.log();
        
    }); 

    it('User1 claims bribe after 2 weeks', async function () {
        console.log("******************************************************");

        // Forward time by 1 day
        await network.provider.send('evm_increaseTime', [14*24*3600]); 
        await network.provider.send('evm_mine');

        await sGaugeProxy.connect(user1).claimBribes([sLP1Bribe.address], user1.address);
        let user1USDC = await USDC.balanceOf(user1.address)
        console.log("User1 USDC balance after claim", divDec6(user1USDC));
        
    });

    it('User1 balance status', async function () {
        console.log("******************************************************");
        // User1 Balances
        let user1SPIRIT = await SPIRIT.balanceOf(user1.address);
        let user1InSpirit = await inSPIRIT['balanceOf(address)'](user1.address);
        let user1USDC = await USDC.balanceOf(user1.address);
        let user1USDT = await USDT.balanceOf(user1.address);
        let user1sLP1 = await sLP1.balanceOf(user1.address);

        console.log("User1 BALANCES");
        console.log("SPIRIT", divDec(user1SPIRIT));
        console.log("inSPIRIT", divDec(user1InSpirit));
        console.log("USDC", divDec6(user1USDC));
        console.log("USDT", divDec8(user1USDT));
        console.log("sLP1", divDec(user1sLP1));
        console.log();
    });

    it('Owner begins voting fees on LP1Gauge with 0.006 USDT', async function () {
        console.log("******************************************************");
        console.log("BRIBE TEST #1");
        console.log("******************************************************");;

        await sLP1Bribe.addReward(USDT.address);
        await USDT.approve(sLP1Bribe.address, oneHundred);
        await expect(sLP1Bribe.notifyRewardAmount(USDT.address, 500000)).to.be.revertedWith('reward amount should be greater than DURATION');;
        await sLP1Bribe.notifyRewardAmount(USDT.address, 604800);

        let rewardRateUSDC = (await sLP1Bribe.rewardData(USDC.address)).rewardRate;
        let rewardRateUSDT = (await sLP1Bribe.rewardData(USDT.address)).rewardRate;

        console.log("USDC/s", divDec6(rewardRateUSDC));
        console.log("USDC/s", divDec8(rewardRateUSDT));
    });

    it('User1 claims bribe after 2 weeks', async function () {
        console.log("******************************************************");

        // Forward time by 1 day
        await network.provider.send('evm_increaseTime', [14*24*3600]); 
        await network.provider.send('evm_mine');

        await sGaugeProxy.connect(user1).claimBribes([sLP1Bribe.address], user1.address);
        let user1USDT = await USDT.balanceOf(user1.address)
        console.log("User1 USDT balance after claim", divDec8(user1USDT));
        
    });


})

