// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract BNDistributor {
    address public owner;
    IERC20 public token;
    uint256 public claimAmount = 69 * 10**18;
    uint256 public constant COOLDOWN = 24 hours;

    // Anti-bot: daily global cap
    uint256 public dailyCap = 100;          // max 100 claims per day
    uint256 public dailyClaimed;            // claims today
    uint256 public lastResetDay;            // day number of last reset

    // Anti-bot: pause
    bool public paused;

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
        lastResetDay = block.timestamp / 1 days;
    }

    function claim() external {
        require(!paused, "Paused");
        require(
            block.timestamp >= lastClaimed[msg.sender] + COOLDOWN,
            "Claim once per day"
        );
        require(
            token.balanceOf(address(this)) >= claimAmount,
            "Distributor empty"
        );

        // Reset daily counter if new day
        uint256 today = block.timestamp / 1 days;
        if (today > lastResetDay) {
            dailyClaimed = 0;
            lastResetDay = today;
        }
        require(dailyClaimed < dailyCap, "Daily cap reached");

        lastClaimed[msg.sender] = block.timestamp;
        totalClaimed[msg.sender] += claimAmount;
        dailyClaimed++;

        require(token.transfer(msg.sender, claimAmount), "Transfer failed");
        emit Claimed(msg.sender, claimAmount);
    }

    // ── Owner functions ──

    function setClaimAmount(uint256 _amount) external onlyOwner {
        claimAmount = _amount;
    }

    function setDailyCap(uint256 _cap) external onlyOwner {
        dailyCap = _cap;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function withdraw(uint256 _amount) external onlyOwner {
        require(token.transfer(owner, _amount), "Transfer failed");
    }

    function remaining() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function claimsLeftToday() external view returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        if (today > lastResetDay) return dailyCap;
        if (dailyClaimed >= dailyCap) return 0;
        return dailyCap - dailyClaimed;
    }
}
