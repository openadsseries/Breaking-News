// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SignalToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18; // 100M tokens
    uint256 public constant CLAIM_AMOUNT = 69 * 10**18; // 69 tokens per claim
    
    mapping(address => uint256) public totalClaimed;

    constructor() ERC20("Signal", "SIGNAL") Ownable(msg.sender) {
        // Mint a small initial supply to the owner for liquidity/testing (optional)
        _mint(msg.sender, 1_000_000 * 10**18);
    }

    /**
     * @dev Allows users to claim 69 tokens. In a production environment, 
     * this should be protected by a server signature (EIP-712) to prevent botting.
     * For MVP/Testnet, we leave it open to anyone who calls it, 
     * but we can add a simple cooldown or limit later.
     */
    function claim() external {
        require(totalSupply() + CLAIM_AMOUNT <= MAX_SUPPLY, "Max supply reached");
        
        // For MVP: Simple claim. 
        // We track it so we know how much a specific address has claimed.
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
