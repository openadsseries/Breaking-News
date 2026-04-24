// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SignalToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18; // 100M tokens
    uint256 public constant CLAIM_AMOUNT = 69 * 10**18; // 69 tokens per claim
    uint256 public constant COOLDOWN = 24 hours;
    
    mapping(address => uint256) public totalClaimed;
    mapping(address => uint256) public lastClaimed;

    constructor() ERC20("Signal", "SIGNAL") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000 * 10**18);
    }

    /**
     * @dev Allows users to claim 69 tokens once per 24 hours.
     */
    function claim() external {
        require(totalSupply() + CLAIM_AMOUNT <= MAX_SUPPLY, "Max supply reached");
        require(
            block.timestamp >= lastClaimed[msg.sender] + COOLDOWN,
            "Claim once per day"
        );

        lastClaimed[msg.sender] = block.timestamp;
        totalClaimed[msg.sender] += CLAIM_AMOUNT;
        _mint(msg.sender, CLAIM_AMOUNT);
    }

    /**
     * @dev Owner can mint manually (e.g. for rewards given retroactively)
     */
    function ownerMint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply reached");
        _mint(to, amount);
    }
}
