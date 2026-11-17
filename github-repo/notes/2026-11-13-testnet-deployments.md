# Reactive Builder Camp 测试网部署记录

## CampOrigin

- 日期：2026-11-13（北京时间）
- 网络：Ethereum Sepolia 测试网（chain ID：`11155111`）
- 源码：[`starter/src/CampOrigin.sol`](../starter/src/CampOrigin.sol)
- 合约地址：`0x71a70535389B0F6619f55418Be595F0E1EF57da5`
- 部署交易哈希：`0x77fc845c9cc0466790b94c74491973520c7fcf690beadc2d96a3fcb4389ee9c1`
- [区块浏览器：部署交易](https://sepolia.etherscan.io/tx/0x77fc845c9cc0466790b94c74491973520c7fcf690beadc2d96a3fcb4389ee9c1)
- [区块浏览器：合约地址](https://sepolia.etherscan.io/address/0x71a70535389B0F6619f55418Be595F0E1EF57da5)
- 结果：交易回执状态为成功；部署使用 MetaMask Account 1 签名。
- 作用：源链事件合约；后续部署 CampReactive 时作为被监听的源合约。

## CampReactive

- 日期：2026-11-13（北京时间）
- 网络：Reactive Lasna 测试网（chain ID：`5318007`）
- 源码：[`starter/src/CampReactive.sol`](../starter/src/CampReactive.sol)
- 合约地址：`0xCd3A06f2aAB3D7c1844C945C236bE54B01c0EefD`
- 部署交易哈希：`0xabb65489562437483ac5eebdf284ec8874c4f4b095fd7adeb5013431e9839c6f`
- [区块浏览器：部署交易](https://lasna.reactscan.net/tx/0xabb65489562437483ac5eebdf284ec8874c4f4b095fd7adeb5013431e9839c6f)
- [区块浏览器：合约地址](https://lasna.reactscan.net/address/0xCd3A06f2aAB3D7c1844C945C236bE54B01c0EefD)
- 结果：交易回执状态为成功；链上读取的源合约地址与 CampOrigin 一致，阈值为 100。
- 部署配置：源链和目标链均为 Sepolia，最多处理 5 次；部署时向合约转入 0.5 lREACT。

## CampCallback

- 日期：2026-11-13（北京时间）
- 网络：Ethereum Sepolia 测试网（chain ID：`11155111`）
- 源码：[`starter/src/CampCallback.sol`](../starter/src/CampCallback.sol)
- 合约地址：`0x9f8180Fa77B13dD025b2e81c6F66Fd2ce0390dc5`
- 部署交易哈希：`0xc41ad5c540b24d6532095a2eee97c370f4faf09dc2036ccae24830bbbc30493d`
- [区块浏览器：部署交易](https://sepolia.etherscan.io/tx/0xc41ad5c540b24d6532095a2eee97c370f4faf09dc2036ccae24830bbbc30493d)
- [区块浏览器：合约地址](https://sepolia.etherscan.io/address/0x9f8180Fa77B13dD025b2e81c6F66Fd2ce0390dc5)
- 结果：交易回执成功；链上读取的授权 Reactive 地址与本记录一致，服务提供方为 Sepolia Proxy `0xAa14d9Cd0f788Ca23d11805986C1d8bd035D23b4`。
- 部署时向合约转入 0.02 Sepolia ETH，用于目标链回调费用。

## Ping 500 端到端测试

- 日期：2026-11-13（北京时间）；由用户发起 Sepolia `ping(500)`。
- [源链 Ping 交易](https://sepolia.etherscan.io/tx/0x7ab7c27132658be3c97ee61c8cd4b19c8880b0b4ad200f40e932c9fc03a5918c)：回执成功，产生 Ping 事件。
- [Lasna Reactive 处理交易](https://lasna.reactscan.net/tx/0x89f872adf89133669853011702e4f8879c26b2b1bac5aa1caa4d6334d62c5615)：回执成功，CampReactive 的 Seen 日志包含源交易哈希及数值 500。
- [Sepolia 回调交易](https://sepolia.etherscan.io/tx/0xd54e6185b6930021cbd5bec06db5f7b1e88e857767e06e632ab5b745c4556c25)：回执成功，CampCallback 的 Handled 日志包含同一源交易哈希及数值 500。
- 只读查询：CampCallback `count = 1`、`lastValue = 500`；CampReactive `remaining = 4`。
- 验证边界：此记录证明本次测试网示例跑通，不代表其他输入、网络或主网安全性已验证。

## 当前进度

- 三个合约已部署；链上读取确认 `recipient` 已设为上述 CampCallback 地址；设置交易的哈希尚未记录。
- 一次 `ping(500)` 已在测试网完成并验证源事件、Reactive 处理和目标链回调。

本文件只记录公开链上信息，请勿在此记录密码、私钥或助记词。
