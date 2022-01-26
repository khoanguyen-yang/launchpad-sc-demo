const ethers = require("ethers");

const tokenSaleFactoryAbi = require("./token-sale-factory.json");
const tokenSaleAbi = require("./token-sale.json");

const tokenSaleFactoryAddress = "0x50Be3890b3157E72A9B7cDEF35989bD8C6F9D018";
const tokenSaleAddress = "0x2E8457265de1ab9628feB54686848117D0AE3699";

const rpc = "https://data-seed-prebsc-1-s1.binance.org:8545";
const deployerPrivateKey = "";
const adminPrivateKey = "";
const provider = new ethers.providers.JsonRpcProvider(rpc);
const signer = new ethers.Wallet(deployerPrivateKey, provider);
const adminSigner = new ethers.Wallet(adminPrivateKey, provider);

const tokenSaleFactoryContract = new ethers.Contract(
  tokenSaleFactoryAddress,
  tokenSaleFactoryAbi,
  signer
);

const name = "GameFi";
const admin = "0x4b11143222623315B4AA336ef31d12997d9b8A57";
const now = Math.floor(Date.now() / 1000);
const oneHour = 3600;
const busdAddress = "0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee";

const whitelistSale = true;

(async () => {
  const tx = await tokenSaleFactoryContract.createTokenSale(
    tokenSaleAddress,
    name,
    admin,
    ethers.BigNumber.from("1000000000000000000000"),
    whitelistSale
      ? {
          startTime: now,
          endTime: now + oneHour * 1,
        }
      : {
          startTime: now - oneHour * 2,
          endTime: now - oneHour * 1,
        },
    whitelistSale
      ? {
          startTime: now + oneHour * 2,
          endTime: now + oneHour * 3,
        }
      : {
          startTime: now,
          endTime: now + oneHour * 1,
        },
    [
      ethers.BigNumber.from("10000000000000000"),
      ethers.BigNumber.from("20000000000000000"),
      ethers.BigNumber.from("30000000000000000"),
    ],
    ethers.BigNumber.from("20000000000000000"),
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

  await tokenSaleContract.registerInvestors(
    ["0x813b96D5c78060e529238caAd3459B977608A97a"],
    [2]
  );
  console.log("Registered investor!");
})();
