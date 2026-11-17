// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {AbstractReactive} from "@reactive/src/base/AbstractReactive.sol";

/// @title D3: monitor ERC-20 transfers on Ethereum Sepolia from Lasna
contract TransferMonitor is AbstractReactive {
    uint256 public constant ORIGIN_CHAIN_ID = 11155111;
    uint256 public constant TRANSFER_TOPIC =
        0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef;

    address public immutable owner;
    // address(0) watches all contracts with this event signature.
    address public immutable tokenFilter;
    uint256 public remaining;
    uint256 public processed;
    uint256 public lastOriginTxHash;
    mapping(address token => uint256 amount) public totalByToken;

    event TransferObserved(
        address indexed token,
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 originTxHash,
        uint256 remaining
    );
    event MonitoringStopped(uint256 processed);

    error InvalidLimit();
    error NotOwner();

    /// @param tokenFilter_ ERC-20 contract on Sepolia, or address(0) for all.
    /// @param limit_ Number of matching, correctly formatted events to process.
    constructor(address tokenFilter_, uint256 limit_) payable {
        if (limit_ == 0) revert InvalidLimit();
        owner = msg.sender;
        tokenFilter = tokenFilter_;
        remaining = limit_;
        _subscribe();
    }

    /// @notice Called only by Reactive's system contract for matching events.
    function react(LogRecord calldata log_) external override onlySystem {
        if (remaining == 0 || log_.chainId != ORIGIN_CHAIN_ID || log_.topic0 != TRANSFER_TOPIC) return;
        if (tokenFilter != address(0) && log_.contractAddress != tokenFilter) return;
        // Standard ERC-20 Transfer has three topics and one 32-byte amount.
        if (log_.opCode != 3 || log_.data.length != 32) return;

        uint256 amount = abi.decode(log_.data, (uint256));
        address from = address(uint160(log_.topic1));
        address to = address(uint160(log_.topic2));

        lastOriginTxHash = log_.txHash;
        totalByToken[log_.contractAddress] += amount;
        processed += 1;
        remaining -= 1;
        emit TransferObserved(log_.contractAddress, from, to, amount, log_.txHash, remaining);

        if (remaining == 0) {
            _unsubscribe();
            emit MonitoringStopped(processed);
        }
    }

    /// @notice The deployer can stop monitoring before the limit is reached.
    function stop() external {
        if (msg.sender != owner) revert NotOwner();
        if (remaining == 0) return;
        remaining = 0;
        _unsubscribe();
        emit MonitoringStopped(processed);
    }

    function _subscribe() internal {
        SYSTEM.subscribe(ORIGIN_CHAIN_ID, tokenFilter, TRANSFER_TOPIC, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE);
    }

    function _unsubscribe() internal {
        SYSTEM.unsubscribe(ORIGIN_CHAIN_ID, tokenFilter, TRANSFER_TOPIC, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE);
    }
}
