// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract BNDistributor {
    address public owner;
    address public signer;  // server that verifies reading
    IERC20 public token;
    uint256 public claimAmount = 69 * 10**18;
    uint256 public constant COOLDOWN = 24 hours;

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

    /// @notice Claim tokens. Requires a signature from our server proving you read.
    /// @param signature Server-signed message: keccak256(user, day)
    function claim(bytes calldata signature) external {
        require(!paused, "Paused");
        require(
            block.timestamp >= lastClaimed[msg.sender] + COOLDOWN,
            "Claim once per day"
        );
        require(
            token.balanceOf(address(this)) >= claimAmount,
            "Distributor empty"
        );

        // Verify server signature
        uint256 day = block.timestamp / 1 days;
        bytes32 hash = keccak256(abi.encodePacked(msg.sender, day));
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        require(_recover(ethHash, signature) == signer, "Invalid signature");

        lastClaimed[msg.sender] = block.timestamp;
        totalClaimed[msg.sender] += claimAmount;

        require(token.transfer(msg.sender, claimAmount), "Transfer failed");
        emit Claimed(msg.sender, claimAmount);
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
    function setClaimAmount(uint256 _amount) external onlyOwner { claimAmount = _amount; }
    function setPaused(bool _p) external onlyOwner { paused = _p; }
    function withdraw(uint256 _amount) external onlyOwner {
        require(token.transfer(owner, _amount), "Transfer failed");
    }
    function remaining() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
