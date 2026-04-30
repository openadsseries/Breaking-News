// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title BNDistributorV2 — Tiered claim based on server-signed amount
/// @notice Server decides claim amount based on Neynar score, signs (user, day, amount).
contract BNDistributorV2 {
    address public owner;
    address public signer;
    IERC20 public token;
    uint256 public constant COOLDOWN = 24 hours;
    uint256 public maxClaimAmount = 69 * 10**18; // safety cap

    bool public paused;

    mapping(address => uint256) public lastClaimed;
    mapping(address => uint256) public totalClaimed;

    event Claimed(address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _token, address _signer) {
        owner = msg.sender;
        signer = _signer;
        token = IERC20(_token);
    }

    /// @notice Claim tokens. Amount is determined by server and included in signature.
    /// @param amount The token amount (server-decided, e.g. 69e18 or 6.9e18)
    /// @param signature Server-signed message: keccak256(user, day, amount)
    function claim(uint256 amount, bytes calldata signature) external {
        require(!paused, "Paused");
        require(amount > 0 && amount <= maxClaimAmount, "Bad amount");
        require(
            block.timestamp >= lastClaimed[msg.sender] + COOLDOWN,
            "Claim once per day"
        );
        require(
            token.balanceOf(address(this)) >= amount,
            "Distributor empty"
        );

        // Verify server signature — includes amount
        uint256 day = block.timestamp / 1 days;
        bytes32 hash = keccak256(abi.encodePacked(msg.sender, day, amount));
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        require(_recover(ethHash, signature) == signer, "Invalid signature");

        lastClaimed[msg.sender] = block.timestamp;
        totalClaimed[msg.sender] += amount;

        require(token.transfer(msg.sender, amount), "Transfer failed");
        emit Claimed(msg.sender, amount);
    }

    function _recover(bytes32 hash, bytes calldata sig) internal pure returns (address) {
        require(sig.length == 65, "Bad sig length");
        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        return ecrecover(hash, v, r, s);
    }

    // ── Owner ──
    function setSigner(address _signer) external onlyOwner { signer = _signer; }
    function setMaxClaimAmount(uint256 _max) external onlyOwner { maxClaimAmount = _max; }
    function setPaused(bool _p) external onlyOwner { paused = _p; }
    function withdraw(uint256 _amount) external onlyOwner {
        require(token.transfer(owner, _amount), "Transfer failed");
    }
    function remaining() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
