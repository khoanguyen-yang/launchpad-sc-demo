const ethers = require("ethers");

const tokenSaleFactoryAbi = require("./token-sale-factory.json");
const tokenSaleAbi = require("./token-sale.json");

const tokenSaleFactoryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const tokenSaleAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const rpc = "http://127.0.0.1:8545";
const deployerPrivateKey =
  "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const adminPrivateKey =
  "59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const provider = new ethers.providers.JsonRpcProvider(rpc);
const signer = new ethers.Wallet(deployerPrivateKey, provider);
const adminSigner = new ethers.Wallet(adminPrivateKey, provider);

const tokenSaleFactoryContract = new ethers.Contract(
  tokenSaleFactoryAddress,
  tokenSaleFactoryAbi,
  signer
);

const name = "GameFi";
const admin = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
const now = Math.floor(Date.now() / 1000);
const oneHour = 3600;
const busdAddress = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc";

(async () => {
  const tx = await tokenSaleFactoryContract.createTokenSale(
    tokenSaleAddress,
    name,
    admin,
    ethers.BigNumber.from("1000000000000000000000"),
    {
      startTime: now,
      endTime: now + oneHour * 1,
    },
    {
      startTime: now + oneHour * 2,
      endTime: now + oneHour * 3,
    },
    [
      ethers.BigNumber.from("100000000000000000"),
      ethers.BigNumber.from("300000000000000000"),
      ethers.BigNumber.from("500000000000000000"),
    ],
    0,
    busdAddress
  );

  const receipt = await tx.wait();
  const tokenSaleProxy = receipt.events.find(
    (event) => event.event === "TokenSaleCreated"
  ).args.proxy;
  console.log("tokenSaleProxy", tokenSaleProxy);

  const tokenSaleContract = new ethers.Contract(
    tokenSaleProxy,
    tokenSaleAbi,
    signer
  );
  const tokenSaleContractAdmin = new ethers.Contract(
    tokenSaleProxy,
    tokenSaleAbi,
    adminSigner
  );

  // Check token sale data
  // const tokenSaleData = await tokenSaleContract.tokenSaleData();

  // console.log("hardcap", tokenSaleData.hardcap_.toString());
  // console.log(
  //   "whitelistSaleTimeFrame_",
  //   tokenSaleData.whitelistSaleTimeFrame_.startTime.toString(),
  //   tokenSaleData.whitelistSaleTimeFrame_.endTime.toString()
  // );
  // console.log(
  //   "publicSaleTimeFrame_",
  //   tokenSaleData.publicSaleTimeFrame_.startTime.toString(),
  //   tokenSaleData.publicSaleTimeFrame_.endTime.toString()
  // );
  // console.log(
  //   "purchaseLevels_",
  //   tokenSaleData.purchaseLevels_[0].toString(),
  //   tokenSaleData.purchaseLevels_[1].toString(),
  //   tokenSaleData.purchaseLevels_[2].toString()
  // );

  await tokenSaleContract.registerInvestors(
    [
      "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199",
      "0xdd2fd4581271e230360230f9337d5c0430bf44c0",
    ],
    [0, 2]
  );

  console.log(
    "whitelisted",
    await tokenSaleContract.investors(
      "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199"
    )
  );
  console.log(
    "whitelisted",
    await tokenSaleContract.investors(
      "0xdd2fd4581271e230360230f9337d5c0430bf44c0"
    )
  );

  console.log("address 0", await tokenSaleContract.investorAddresses(0));
  console.log("count", (await tokenSaleContract.investorCount()).toString());
  console.log("changing address...");

  await tokenSaleContractAdmin.changeInvestorWalletAddress(
    "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199",
    "0xfabb0ac9d68b0b445fb7357272ff202c5651694a"
  );

  console.log(
    "whitelisted",
    await tokenSaleContract.investors(
      "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199"
    )
  );
  console.log(
    "whitelisted",
    await tokenSaleContract.investors(
      "0xfabb0ac9d68b0b445fb7357272ff202c5651694a"
    )
  );

  console.log("address 0", await tokenSaleContract.investorAddresses(0));
  console.log("count", (await tokenSaleContract.investorCount()).toString());
})();
