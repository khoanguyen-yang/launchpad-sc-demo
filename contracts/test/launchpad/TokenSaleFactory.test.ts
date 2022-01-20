/* eslint-disable no-unused-expressions */
/* eslint-disable node/no-missing-import */

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ERC20, TokenSale, TokenSaleFactory } from "../../typechain";
import {
  addressZero,
  createTokenSale,
  CreateTokenSaleParams,
  getAmount,
} from "../test-utils";

describe("TokenSaleFactory", () => {
  let admin: SignerWithAddress;

  let tokenSaleFactory: TokenSaleFactory;
  let tokenSale: TokenSale;
  let erc20: ERC20;

  let tokenSaleParams: CreateTokenSaleParams;

  before(async () => {
    [admin] = await ethers.getSigners();

    const tokenSaleFactory_ = await ethers.getContractFactory(
      "TokenSaleFactory"
    );
    tokenSaleFactory = await tokenSaleFactory_.deploy();
    await tokenSaleFactory.deployed();

    const tokenSale_ = await ethers.getContractFactory("TokenSale");
    tokenSale = await tokenSale_.deploy();
    await tokenSale.deployed();

    const erc20_ = await ethers.getContractFactory("ERC20");
    erc20 = await erc20_.deploy("Test", "TEST");
    await erc20.deployed();

    const now = Math.floor(Date.now() / 1000);

    tokenSaleParams = {
      tokenSaleImplementationAddress: tokenSale.address,
      name: "GameFi",
      admin: admin.address,
      hardcap: getAmount("10000"),
      whitelistSaleTimeFrame: {
        startTime: now,
        endTime: now + 3600 * 1,
      },
      publicSaleTimeFrame: {
        startTime: now + 3600 * 2,
        endTime: now + 3600 * 3,
      },
      purchaseLevels: [
        getAmount("5"),
        getAmount("10"),
        getAmount("15"),
        getAmount("20"),
        getAmount("25"),
      ],
      publicSalePurchaseCap: getAmount("10"),
      purchaseToken: erc20.address,
    };
  });

  describe("createTokenSale", () => {
    it("should be able to create token sale", async () => {
      const tx = await createTokenSale(tokenSaleFactory, tokenSaleParams);
      await tx.wait();
    });

    it("should be able to emit event with correct params when create token sale successfully", async () => {
      const tx = await createTokenSale(tokenSaleFactory, tokenSaleParams);
      const txReceipt = await tx.wait();
      const tokenSaleCreatedEvent = txReceipt.events?.find(
        (event) => event.event === "TokenSaleCreated"
      );

      expect(tokenSaleCreatedEvent).not.to.be.undefined;
      expect(tokenSaleCreatedEvent?.args?.implementation).to.equal(
        tokenSaleParams.tokenSaleImplementationAddress
      );
      expect(tokenSaleCreatedEvent?.args?.factory).to.equal(
        tokenSaleFactory.address
      );
    });

    it("should revert when create token sale with incorrect params", async () => {
      // Token sale implementation address is zero
      expect(
        createTokenSale(tokenSaleFactory, tokenSaleParams, {
          tokenSaleImplementationAddress: addressZero,
        })
      ).to.be.revertedWith("TokenSaleFactory: implementation address is zero");

      // Admin address is zero
      expect(
        createTokenSale(tokenSaleFactory, tokenSaleParams, {
          admin: addressZero,
        })
      ).to.be.revertedWith("TokenSale: admin address is zero");

      // Hardcap is zero
      expect(
        createTokenSale(tokenSaleFactory, tokenSaleParams, {
          hardcap: 0,
        })
      ).to.be.revertedWith("TokenSale: hardcap is zero");

      // Whitelist sale start time is 0
      expect(
        createTokenSale(tokenSaleFactory, tokenSaleParams, {
          whitelistSaleTimeFrame: {
            startTime: 0,
            endTime: tokenSaleParams.whitelistSaleTimeFrame.startTime,
          },
        })
      ).to.be.revertedWith("TokenSale: invalid whitelist sale time frame");

      // Whitelist sale end time is 0
      expect(
        createTokenSale(tokenSaleFactory, tokenSaleParams, {
          whitelistSaleTimeFrame: {
            startTime: tokenSaleParams.whitelistSaleTimeFrame.startTime,
            endTime: 0,
          },
        })
      ).to.be.revertedWith("TokenSale: invalid whitelist sale time frame");

      // Both whitelist sale start and end are 0
      expect(
        createTokenSale(tokenSaleFactory, tokenSaleParams, {
          whitelistSaleTimeFrame: {
            startTime: 0,
            endTime: 0,
          },
        })
      ).to.be.revertedWith("TokenSale: invalid whitelist sale time frame");

      // Whitelist sale start time > end time
      expect(
        createTokenSale(tokenSaleFactory, tokenSaleParams, {
          whitelistSaleTimeFrame: {
            startTime: tokenSaleParams.whitelistSaleTimeFrame.endTime,
            endTime: tokenSaleParams.whitelistSaleTimeFrame.startTime,
          },
        })
      ).to.be.revertedWith("TokenSale: invalid whitelist sale time frame");

      // Public sale start time is 0
      expect(
        createTokenSale(tokenSaleFactory, tokenSaleParams, {
          publicSaleTimeFrame: {
            startTime: 0,
            endTime: tokenSaleParams.publicSaleTimeFrame.endTime,
          },
        })
      ).to.be.revertedWith("TokenSale: invalid public sale time frame");

      // Public sale end time is 0
      expect(
        createTokenSale(tokenSaleFactory, tokenSaleParams, {
          publicSaleTimeFrame: {
            startTime: tokenSaleParams.publicSaleTimeFrame.startTime,
            endTime: 0,
          },
        })
      ).to.be.revertedWith("TokenSale: invalid public sale time frame");

      // Both public sale start and end are 0
      expect(
        createTokenSale(tokenSaleFactory, tokenSaleParams, {
          publicSaleTimeFrame: {
            startTime: 0,
            endTime: 0,
          },
        })
      ).to.be.revertedWith("TokenSale: invalid public sale time frame");

      // Public sale start time > end time
      expect(
        createTokenSale(tokenSaleFactory, tokenSaleParams, {
          publicSaleTimeFrame: {
            startTime: tokenSaleParams.publicSaleTimeFrame.endTime,
            endTime: tokenSaleParams.publicSaleTimeFrame.startTime,
          },
        })
      ).to.be.revertedWith("TokenSale: invalid public sale time frame");

      // Empty purchase level
      expect(
        createTokenSale(tokenSaleFactory, tokenSaleParams, {
          purchaseLevels: [],
        })
      ).to.be.revertedWith("TokenSale: empty purchase levels");

      // Public sale purchase cap is zero
      expect(
        createTokenSale(tokenSaleFactory, tokenSaleParams, {
          publicSalePurchaseCap: 0,
        })
      ).to.be.revertedWith("TokenSale: public sale cap is zero");

      // Purchase token address is zero
      expect(
        createTokenSale(tokenSaleFactory, tokenSaleParams, {
          purchaseToken: addressZero,
        })
      ).to.be.revertedWith("TokenSale: purchase token address is zero");
    });
  });

  describe("interact with created token sale contract", () => {
    let tokenSaleProxyAddress: string;

    beforeEach(async () => {
      const tx = await createTokenSale(tokenSaleFactory, tokenSaleParams);
      const txReceipt = await tx.wait();
      const tokenSaleCreatedEvent = txReceipt.events?.find(
        (event) => event.event === "TokenSaleCreated"
      );
      tokenSaleProxyAddress = tokenSaleCreatedEvent?.args?.proxy;
    });

    it("should be able to get token sale data", async () => {
      const tokenSaleData = await tokenSale
        .attach(tokenSaleProxyAddress)
        .tokenSaleData();

      expect(tokenSaleData.name_).to.equal(tokenSaleParams.name);
      expect(tokenSaleData.admin_).to.equal(admin.address);
      expect(tokenSaleData.hardcap_).to.equal(tokenSaleParams.hardcap);
      expect(tokenSaleData.whitelistSaleTimeFrame_.startTime).to.equal(
        tokenSaleParams.whitelistSaleTimeFrame.startTime.toString()
      );
      expect(tokenSaleData.whitelistSaleTimeFrame_.endTime).to.equal(
        tokenSaleParams.whitelistSaleTimeFrame.endTime.toString()
      );
      expect(tokenSaleData.publicSaleTimeFrame_.startTime).to.equal(
        tokenSaleParams.publicSaleTimeFrame.startTime.toString()
      );
      expect(tokenSaleData.publicSaleTimeFrame_.endTime).to.equal(
        tokenSaleParams.publicSaleTimeFrame.endTime.toString()
      );
      expect(tokenSaleData.purchaseLevels_).to.deep.equal(
        tokenSaleParams.purchaseLevels
      );
      expect(tokenSaleData.publicSalePurchaseCap_.toString()).to.equal(
        tokenSaleParams.publicSalePurchaseCap.toString()
      );
      expect(tokenSaleData.status_).not.to.be.undefined;
      expect(tokenSaleData.totalSaleAmount_).not.to.be.undefined;
      expect(tokenSaleData.totalWhitelistSaleAmount_).not.to.be.undefined;
      expect(tokenSaleData.totalPublicSaleAmount_).not.to.be.undefined;
    });
  });
});
