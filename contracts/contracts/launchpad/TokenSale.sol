// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./TokenSaleValidation.sol";

contract TokenSale is Initializable, Ownable {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  // Emitted event for new investment
  event NewInvestment(address indexed investor, uint256 amount);

  // Emitted event for token sale finalization (fund is transfered to admin wallet)
  event Finalized(address admin, uint256 amount);

  // Emitted event for emergency withdrawal (fund is transfered to admin wallet, token sale is inactivated)
  event EmergencyWithdrawal(address admin, uint256 amount);

  struct TimeFrame {
    uint64 startTime;
    uint64 endTime;
  }

  // Token sale name
  string public name;

  // Admin
  address public admin;

  // Hardcap
  uint256 public hardcap;

  // Whitelist sale time frame
  TimeFrame public whitelistSaleTimeFrame;

  // Public sale time frame
  TimeFrame public publicSaleTimeFrame;

  // Purchase levels. Level indices start from 0, so index 0 will be level 1 and so on
  uint256[] public purchaseLevels;

  // Public sale purchase cap
  uint256 public publicSalePurchaseCap;

  // The token address used to purchase, e.g. USDT, BUSD, etc.
  address public purchaseToken;

  // The token instance used to purchase, e.g. USDT, BUSD, etc.
  IERC20 private purchaseToken_;

  // Status
  enum Status {
    INACTIVE,
    ACTIVE
  }
  Status public status;

  // Total sale amount
  uint256 public totalSaleAmount;

  // Total whitelist sale amount
  uint256 public totalWhitelistSaleAmount;

  // Total public sale amount
  uint256 public totalPublicSaleAmount;

  // Is hardcap reached?
  bool private hardcapReached;

  // Is finalized?
  bool private finalized;

  // Investor
  struct Investor {
    address investor;
    uint256 totalInvestment;
    uint256 whitelistSaleTotalInvestment;
    uint256 publicSaleTotalInvestment;
    uint8 whitelistPurchaseLevel; // Level starts from 1
    bool whitelistSale; // If true, can participate whitelist sale
  }

  // Mapping investor wallet address to investor instance
  mapping(address => Investor) public investors;

  // Investors' wallet address
  address[] public investorAddresses;

  // Next refund index
  uint256 public nextRefundIdx;

  // Refunded addresses
  mapping(address => bool) public refunded;

  // Only admin
  modifier onlyAdmin() {
    require(msg.sender == admin, "TokenSale: not admin");
    _;
  }

  // If token sale's status is ACTIVE
  modifier activeTokenSale() {
    require(status == Status.ACTIVE && !finalized, "TokenSale: inactive");
    _;
  }

  // Has sold out?
  modifier availableForPurchase() {
    require(!hardcapReached, "TokenSale: sold out");
    _;
  }

  // Check if investor is whitelisted
  modifier whitelisted() {
    require(
      investors[msg.sender].investor != address(0),
      "TokenSale: not whitelisted"
    );
    _;
  }

  /// @notice Create a new token sale
  function initialize(
    address _owner,
    string calldata _name,
    address _admin,
    uint256 _hardcap,
    TimeFrame calldata _whitelistSaleTimeFrame,
    TimeFrame calldata _publicSaleTimeFrame,
    uint256[] calldata _purchaseLevels,
    uint256 _publicSalePurchaseCap,
    address _purchaseToken
  ) public initializer {
    require(_admin != address(0), "TokenSale: admin address is zero");

    require(_hardcap > 0, "TokenSale: hardcap is zero");

    require(
      _whitelistSaleTimeFrame.startTime != 0 &&
        _whitelistSaleTimeFrame.endTime != 0 &&
        _whitelistSaleTimeFrame.startTime < _whitelistSaleTimeFrame.endTime,
      "TokenSale: invalid whitelist time frame"
    );

    require(
      _publicSaleTimeFrame.startTime != 0 &&
        _publicSaleTimeFrame.endTime != 0 &&
        _whitelistSaleTimeFrame.endTime <= _publicSaleTimeFrame.startTime &&
        _publicSaleTimeFrame.startTime < _publicSaleTimeFrame.endTime,
      "TokenSale: invalid public sale time frame"
    );

    require(_purchaseLevels.length != 0, "TokenSale: empty purchase levels");

    require(_publicSalePurchaseCap > 0, "TokenSale: public sale cap is zero");

    require(
      _purchaseToken != address(0),
      "TokenSale: purchase token address is zero"
    );

    name = _name;
    admin = _admin;
    hardcap = _hardcap;
    whitelistSaleTimeFrame = _whitelistSaleTimeFrame;
    publicSaleTimeFrame = _publicSaleTimeFrame;
    purchaseLevels = _purchaseLevels;
    publicSalePurchaseCap = _publicSalePurchaseCap;
    purchaseToken = _purchaseToken;
    purchaseToken_ = IERC20(purchaseToken);

    status = Status.ACTIVE;
    totalSaleAmount = 0;
    totalWhitelistSaleAmount = 0;
    totalPublicSaleAmount = 0;
    hardcapReached = false;

    _transferOwnership(_owner);
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() initializer {}

  /// @notice Configure token sale
  function configureTokenSale(
    uint256 _hardcap,
    TimeFrame calldata _whitelistSaleTimeFrame,
    TimeFrame calldata _publicSaleTimeFrame,
    uint256[] calldata _purchaseLevels,
    uint256 _publicSalePurchaseCap,
    address _purchaseToken,
    uint256 _status
  ) external onlyOwner {
    require(_hardcap > 0, "TokenSale: hardcap is zero");

    require(
      _whitelistSaleTimeFrame.startTime != 0 &&
        _whitelistSaleTimeFrame.endTime != 0 &&
        _whitelistSaleTimeFrame.startTime < _whitelistSaleTimeFrame.endTime,
      "TokenSale: invalid whitelist time frame"
    );

    require(
      _publicSaleTimeFrame.startTime != 0 &&
        _publicSaleTimeFrame.endTime != 0 &&
        _whitelistSaleTimeFrame.endTime <= _publicSaleTimeFrame.startTime &&
        _publicSaleTimeFrame.startTime < _publicSaleTimeFrame.endTime,
      "TokenSale: invalid public sale time frame"
    );

    require(_purchaseLevels.length != 0, "TokenSale: empty purchase levels");

    require(_publicSalePurchaseCap > 0, "TokenSale: public sale cap is zero");

    require(
      _purchaseToken != address(0),
      "TokenSale: purchase token address is zero"
    );

    require(
      _status == uint256(Status.INACTIVE) || _status == uint256(Status.ACTIVE),
      "TokenSale: invalid status"
    );

    hardcap = _hardcap;
    whitelistSaleTimeFrame = _whitelistSaleTimeFrame;
    publicSaleTimeFrame = _publicSaleTimeFrame;
    purchaseLevels = _purchaseLevels;
    publicSalePurchaseCap = _publicSalePurchaseCap;
    purchaseToken = _purchaseToken;
    purchaseToken_ = IERC20(purchaseToken);
    status = Status(_status);
  }

  /// @notice Query token sale data
  function tokenSaleData()
    external
    view
    returns (
      string memory name_,
      address admin_,
      uint256 hardcap_,
      TimeFrame memory whitelistSaleTimeFrame_,
      TimeFrame memory publicSaleTimeFrame_,
      uint256[] memory purchaseLevels_,
      uint256 publicSalePurchaseCap_,
      address purchaseTokenAddress_,
      Status status_,
      uint256 totalSaleAmount_,
      uint256 totalWhitelistSaleAmount_,
      uint256 totalPublicSaleAmount_
    )
  {
    return (
      name,
      admin,
      hardcap,
      whitelistSaleTimeFrame,
      publicSaleTimeFrame,
      purchaseLevels,
      publicSalePurchaseCap,
      purchaseToken,
      status,
      totalSaleAmount,
      totalWhitelistSaleAmount,
      totalPublicSaleAmount
    );
  }

  /// @notice Register (whitelist) investors
  /// @dev New data will override old ones if existed
  function registerInvestors(
    address[] calldata _investors,
    uint8[] calldata _whitelistPurchaseLevels
  ) external onlyOwner {
    require(
      _investors.length == _whitelistPurchaseLevels.length,
      "TokenSale: lengths do not match"
    );

    require(
      TokenSaleValidation.nonZeroAddresses(_investors),
      "TokenSale: investor address is zero"
    );

    require(
      TokenSaleValidation.validWhitelistPurchaseLevels(
        _whitelistPurchaseLevels,
        purchaseLevels.length
      ),
      "TokenSale: invalid whitelist purchase level"
    );

    for (uint256 i; i < _investors.length; ++i) {
      if (investors[_investors[i]].investor == address(0)) {
        investorAddresses.push(_investors[i]);
      }

      if (_whitelistPurchaseLevels[i] > 0) {
        investors[_investors[i]] = Investor(
          _investors[i],
          0,
          0,
          0,
          _whitelistPurchaseLevels[i],
          true
        );
      } else {
        investors[_investors[i]] = Investor(
          _investors[i],
          0,
          0,
          0,
          _whitelistPurchaseLevels[i],
          false
        );
      }
    }
  }

  function investorCount() public view returns (uint256) {
    return investorAddresses.length;
  }

  /// @notice Purchase token in whitelist sale
  function purchaseTokenWhitelistSale(uint256 amount)
    external
    activeTokenSale
    availableForPurchase
    whitelisted
  {
    require(
      block.timestamp >= whitelistSaleTimeFrame.startTime &&
        block.timestamp <= whitelistSaleTimeFrame.endTime,
      "TokenSale: not in whitelist sale time"
    );

    Investor storage investor = investors[msg.sender];
    uint256 purchaseCap = purchaseLevels[investor.whitelistPurchaseLevel - 1];

    require(
      investor.whitelistSale,
      "TokenSale: not eligible to participate in whitelist sale"
    );

    require(
      TokenSaleValidation.validPurchaseAmount(
        purchaseLevels,
        investor.whitelistPurchaseLevel - 1,
        amount
      ),
      "TokenSale: invalid purchase amount"
    );

    require(
      investor.whitelistSaleTotalInvestment < purchaseCap,
      "TokenSale: exceed maximum investment"
    );

    uint256 investmentAmount = amount;

    if (investmentAmount > hardcap.sub(totalSaleAmount)) {
      investmentAmount = hardcap.sub(totalSaleAmount);
    }

    if (
      investmentAmount > purchaseCap.sub(investor.whitelistSaleTotalInvestment)
    ) {
      investmentAmount = purchaseCap.sub(investor.whitelistSaleTotalInvestment);
    }

    totalSaleAmount = totalSaleAmount.add(investmentAmount);
    totalWhitelistSaleAmount = totalWhitelistSaleAmount.add(investmentAmount);
    investor.totalInvestment = investor.totalInvestment.add(investmentAmount);
    investor.whitelistSaleTotalInvestment = investor
      .whitelistSaleTotalInvestment
      .add(investmentAmount);

    if (totalSaleAmount >= hardcap) {
      hardcapReached = true;
    }

    purchaseToken_.safeTransferFrom(
      msg.sender,
      address(this),
      investmentAmount
    );
    emit NewInvestment(investor.investor, investmentAmount);
  }

  /// @notice Purchase token in public sale
  function purchaseTokenPublicSale(uint256 amount)
    external
    activeTokenSale
    availableForPurchase
    whitelisted
  {
    require(
      block.timestamp >= publicSaleTimeFrame.startTime &&
        block.timestamp <= publicSaleTimeFrame.endTime,
      "TokenSale: not in public sale time"
    );

    Investor storage investor = investors[msg.sender];

    require(
      investor.publicSaleTotalInvestment < publicSalePurchaseCap,
      "TokenSale: exceed maximum investment"
    );

    uint256 investmentAmount = amount;

    if (investmentAmount > hardcap.sub(totalSaleAmount)) {
      investmentAmount = hardcap.sub(totalSaleAmount);
    }

    if (
      investmentAmount >
      publicSalePurchaseCap.sub(investor.publicSaleTotalInvestment)
    ) {
      investmentAmount = publicSalePurchaseCap.sub(
        investor.publicSaleTotalInvestment
      );
    }

    totalSaleAmount = totalSaleAmount.add(investmentAmount);
    totalPublicSaleAmount = totalPublicSaleAmount.add(investmentAmount);
    investor.totalInvestment = investor.totalInvestment.add(investmentAmount);
    investor.publicSaleTotalInvestment = investor.publicSaleTotalInvestment.add(
      investmentAmount
    );

    if (totalSaleAmount >= hardcap) {
      hardcapReached = true;
    }

    purchaseToken_.safeTransferFrom(
      msg.sender,
      address(this),
      investmentAmount
    );
    emit NewInvestment(investor.investor, investmentAmount);
  }

  /// @notice Finalize token sale: send all funds to admin's wallet
  function finalize() external onlyOwner {
    require(
      hardcapReached || block.timestamp > publicSaleTimeFrame.endTime,
      "TokenSale: can not finalize"
    );
    require(!finalized, "TokenSale: finalized");

    finalized = true;

    uint256 balance = purchaseToken_.balanceOf(address(this));
    purchaseToken_.safeTransfer(admin, balance);
    emit Finalized(admin, balance);
  }

  /// @notice Emergency withdrawal
  ///   1. Send all funds to admin's wallet
  ///   2. Inactivate token sale
  function emergencyWithdraw() external onlyAdmin {
    status = Status.INACTIVE;

    uint256 balance = purchaseToken_.balanceOf(address(this));
    purchaseToken_.safeTransfer(admin, balance);
    emit EmergencyWithdrawal(admin, balance);
  }

  /// @notice Change investor wallet address
  function changeInvestorWalletAddress(address _oldAddress, address _newAddress)
    external
    onlyAdmin
  {
    require(!finalized, "TokenSale: finalized");

    require(_oldAddress != address(0), "TokenSale: invalid address");

    require(
      investors[_oldAddress].investor != address(0),
      "TokenSale: address is already taken"
    );

    // Change old mapping to have address(0), i.e. not whitelisted
    Investor storage investor = investors[_oldAddress];
    investor.investor = address(0);

    // Clone old investor data to new one & update new wallet address
    investors[_newAddress] = investor;
    investors[_newAddress].investor = _newAddress;

    // Update investor addresses to replace old with new one
    for (uint256 i; i < investorAddresses.length; ++i) {
      if (investorAddresses[i] == _oldAddress) {
        investorAddresses[i] = _newAddress;
        break;
      }
    }
  }

  /// @notice Refund to all investors
  /// @dev think twice 1: can we stuck at a specific index and can not proceed refund for other remaining investors?
  ///         currently this is impossible because we update the index before doing the transfer
  /// @dev think twice 2: if we should keep track of refunded investor by: 1. reset investor.totalInvestment to 0, or 2. store a mapping
  function refundAll() external onlyAdmin {
    if (status != Status.INACTIVE) {
      status = Status.INACTIVE;
    }

    for (uint256 i = nextRefundIdx; i < investorAddresses.length; ++i) {
      nextRefundIdx++;
      if (!refunded[investorAddresses[i]]) {
        refunded[investorAddresses[i]] = true;
        purchaseToken_.safeTransfer(
          investorAddresses[i],
          investors[investorAddresses[i]].totalInvestment
        );
      }
    }
  }
}
