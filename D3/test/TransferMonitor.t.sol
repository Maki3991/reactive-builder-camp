// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {TransferMonitor} from "../src/TransferMonitor.sol";

contract MockSystem {
    uint256 public subscriptions;
    uint256 public unsubscriptions;
    function subscribe(uint256, address, uint256, uint256, uint256, uint256) external { subscriptions++; }
    function unsubscribe(uint256, address, uint256, uint256, uint256, uint256) external { unsubscriptions++; }
}

contract TransferMonitorTest is Test {
    address constant SYSTEM = 0x8888888888888888888888888888888888888888;
    address constant TOKEN = address(0x1234);
    TransferMonitor monitor;

    function setUp() public {
        MockSystem mock = new MockSystem();
        vm.etch(SYSTEM, address(mock).code);
        monitor = new TransferMonitor(TOKEN, 2);
    }

    function record() internal view returns (IReactive.LogRecord memory log_) {
        log_.chainId = 11155111;
        log_.contractAddress = TOKEN;
        log_.topic0 = monitor.TRANSFER_TOPIC();
        log_.topic1 = uint256(uint160(address(0x1111)));
        log_.topic2 = uint256(uint160(address(0x2222)));
        log_.data = abi.encode(uint256(10));
        log_.opCode = 3;
        log_.txHash = 42;
    }

    function testLimitAndUnsubscribe() public {
        assertEq(MockSystem(SYSTEM).subscriptions(), 1);
        IReactive.LogRecord memory log_ = record();
        vm.prank(SYSTEM); monitor.react(log_);
        assertEq(monitor.remaining(), 1);
        assertEq(monitor.totalByToken(TOKEN), 10);
        vm.prank(SYSTEM); monitor.react(log_);
        assertEq(monitor.remaining(), 0);
        assertEq(monitor.processed(), 2);
        assertEq(monitor.lastOriginTxHash(), 42);
        assertEq(MockSystem(SYSTEM).unsubscriptions(), 1);
        vm.prank(SYSTEM); monitor.react(log_);
        assertEq(monitor.processed(), 2);
    }

    function testInvalidFormatDoesNotConsumeLimit() public {
        IReactive.LogRecord memory log_ = record();
        log_.opCode = 4;
        vm.prank(SYSTEM); monitor.react(log_);
        assertEq(monitor.remaining(), 2);
        assertEq(monitor.processed(), 0);
    }

    function testOnlySystemCanReact() public {
        IReactive.LogRecord memory log_ = record();
        vm.expectRevert();
        monitor.react(log_);
    }

    function testZeroLimitRejected() public {
        vm.expectRevert(TransferMonitor.InvalidLimit.selector);
        new TransferMonitor(TOKEN, 0);
    }

    function testOnlyOwnerCanStop() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert(TransferMonitor.NotOwner.selector);
        monitor.stop();
        monitor.stop();
        assertEq(monitor.remaining(), 0);
        assertEq(MockSystem(SYSTEM).unsubscriptions(), 1);
    }
}
