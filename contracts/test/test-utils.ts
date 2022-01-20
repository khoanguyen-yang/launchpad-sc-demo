/* eslint-disable node/no-unsupported-features/es-syntax */
/* eslint-disable node/no-missing-import */

import { BigNumber, BigNumberish, ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import Big from "big.js";
import { TokenSaleFactory } from "../typechain";

export const addressZero = ethers.constants.AddressZero;

export const getRandomAddress = () => ethers.Wallet.createRandom().address;

export const getAmount = (amount: string, decimals: number = 18): BigNumber => {
  if (amount.includes(".")) {
    return ethers.BigNumber.from(Big(10).pow(decimals).mul(amount).toFixed());
  }
  return ethers.BigNumber.from(10).pow(decimals).mul(amount);
};

export type CreateTokenSaleParams = {
  tokenSaleImplementationAddress: string;
  name: string;
  admin: string;
  hardcap: BigNumberish;
  whitelistSaleTimeFrame: {
    startTime: number;
    endTime: number;
  };
  publicSaleTimeFrame: {
    startTime: number;
    endTime: number;
  };
  purchaseLevels: BigNumberish[];
  publicSalePurchaseCap: BigNumberish;
  purchaseToken: string;
};

export type OverrideCreateTokenSaleParams = {
  tokenSaleImplementationAddress?: string;
  name?: string;
  admin?: string;
  hardcap?: BigNumberish;
  whitelistSaleTimeFrame?: {
    startTime: number;
    endTime: number;
  };
  publicSaleTimeFrame?: {
    startTime: number;
    endTime: number;
  };
  purchaseLevels?: BigNumberish[];
  publicSalePurchaseCap?: BigNumberish;
  purchaseToken?: string;
};

export const createTokenSale = (
  tokenSaleFactory: TokenSaleFactory,
  defaultParams: CreateTokenSaleParams,
  overrideParams: OverrideCreateTokenSaleParams = {}
): Promise<ContractTransaction> => {
  const params: CreateTokenSaleParams = { ...defaultParams, ...overrideParams };
  return tokenSaleFactory.createTokenSale(
    params.tokenSaleImplementationAddress,
    params.name,
    params.admin,
    params.hardcap,
    params.whitelistSaleTimeFrame,
    params.publicSaleTimeFrame,
    params.purchaseLevels,
    params.publicSalePurchaseCap,
    params.purchaseToken
  );
};
