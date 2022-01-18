// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./TokenSale.sol";

contract TokenSaleFactory {
  event TokenSaleCreated(
    address proxy,
    address implementation,
    address factory
  );

  function createTokenSale(
    address _tokenSaleImplementation,
    string calldata _name,
    address _admin,
    uint256 _hardcap,
    TokenSale.TimeFrame calldata _whitelistSaleTimeFrame,
    TokenSale.TimeFrame calldata _publicSaleTimeFrame,
    uint256[] calldata _purchaseLevels,
    uint8 _publicSalePurchaseLevel,
    address _purchaseToken
  ) public returns (address) {
    address proxy = Clones.clone(_tokenSaleImplementation);
    TokenSale(proxy).initialize(
      msg.sender,
      _name,
      _admin,
      _hardcap,
      _whitelistSaleTimeFrame,
      _publicSaleTimeFrame,
      _purchaseLevels,
      _publicSalePurchaseLevel,
      _purchaseToken
    );

    emit TokenSaleCreated(proxy, _tokenSaleImplementation, address(this));

    return proxy;
  }
}
