const ethers = require("ethers");

const tokenSaleAbi = require("./token-sale.json");
const busdAbi = require("./busd.json");

const rpc = "https://data-seed-prebsc-1-s1.binance.org:8545";
const deployerPrivateKey = "";
const adminPrivateKey = "";
const investorPrivateKey = "";
const provider = new ethers.providers.JsonRpcProvider(rpc);
const signer = new ethers.Wallet(deployerPrivateKey, provider);
const adminSigner = new ethers.Wallet(adminPrivateKey, provider);
const investorSigner = new ethers.Wallet(investorPrivateKey, provider);

const busdAddress = "0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee";
const busdContract = new ethers.Contract(busdAddress, busdAbi, investorSigner);

const tokenSaleProxy = "0xe7336236DF271648d5315124E4be34DE320A32d4";

const buyAmount = "1" + "0000000000000000"; // 16 zeros

(async () => {
  const tokenSaleContract = new ethers.Contract(
    tokenSaleProxy,
    tokenSaleAbi,
    investorSigner
  );

  // Approve
  // await busdContract.approve(
  //   tokenSaleProxy,
  //   ethers.BigNumber.from("10000000000000000000000000000")
  // );
  // console.log("Approved");

  // Purchase whitelist sale
  // await tokenSaleContract.purchaseTokenWhitelistSale(
  //   ethers.BigNumber.from(buyAmount)
  // );
  // console.log("Purchased whitelist sale successfully!");

  // Purchase public sale
  await tokenSaleContract.purchaseTokenPublicSale(
    ethers.BigNumber.from(buyAmount)
  );
  console.log("Purchased public sale successfully!");
})();
