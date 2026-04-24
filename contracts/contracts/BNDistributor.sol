// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract BNDistributor {
    address public owner;
    IERC20 public token;
    uint256 public claimAmount = 69 * 10**18; // 69 tokens per claim
    uint256 public constant COOLDOWN = 24 hours;

    mapping(address => uint256) public lastClaimed;
    mapping(address => uint256) public totalClaimed;

    event Claimed(address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _token) {
        owner = msg.sender;
        token = IERC20(_token);
    }

    function claim() external {
        require(
            block.timestamp >= lastClaimed[msg.sender] + COOLDOWN,
            "Claim once per day"
        );
        require(
            token.balanceOf(address(this)) >= claimAmount,
            "Distributor empty"
        );

        lastClaimed[msg.sender] = block.timestamp;
        totalClaimed[msg.sender] += claimAmount;

        require(token.transfer(msg.sender, claimAmount), "Transfer failed");

        emit Claimed(msg.sender, claimAmount);
    }

    // Owner can adjust claim amount
    function setClaimAmount(uint256 _amount) external onlyOwner {
        claimAmount = _amount;
    }

    // Owner can withdraw tokens
    function withdraw(uint256 _amount) external onlyOwner {
        require(token.transfer(owner, _amount), "Transfer failed");
    }

    // Check remaining balance
    function remaining() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
