# D3：监听 Sepolia 代币转账

`src/TransferMonitor.sol` 是一个学习用的 Reactive 合约。部署到 Lasna 后，它订阅 Ethereum Sepolia 上符合 ERC-20 Transfer 格式的事件，记录处理结果，处理次数达到上限后退订。它不发起跨链回调，也不会替用户转账。

部署时需要两个参数：

- `tokenFilter_`：Sepolia 上要监听的 ERC-20 合约地址。填零地址表示不限合约，但会更快触发并消耗测试币；初次练习建议指定已知的测试代币合约。
- `limit_`：最多处理多少条符合格式的事件，必须大于 0，例如 3。

部署者也可以调用 `stop()` 提前停止。这个版本没有重新开启功能；如需重新监听，请部署新合约。先为合约提供足够的 Lasna 测试币，才能支付触发费用。测试前应确认余额和欠款状态。

## 如何确认

1. 查看 Lasna 上的部署交易和合约地址，确认订阅信息。
2. 在 Sepolia 对所选代币发起一笔真实测试转账；如果选择不限合约，别人的转账也可能触发。
3. 在 Lasna 区块浏览器查看该合约的 Reactive 交易和 `TransferObserved` 事件，核对 `originTxHash` 与来源交易。
4. 查看 `processed` 和 `remaining`。达到上限后，查看 `MonitoringStopped` 并确认订阅已取消；再发一笔符合条件的转账验证不会继续处理。

`amount` 和 `totalByToken` 是代币最小单位的整数，展示为常见代币数量时需结合代币的 decimals；不同代币分别累计。事件格式检查不代表能够证明发出事件的合约是可信的 ERC-20。

## 本地编译

此目录复用同一项目中的 `../github-repo/starter/lib/reactive-lib-omni`，移动目录时要一起保留该依赖。安装 Foundry 后，在本目录运行 `forge build`。不要把私钥写进本目录或提交到 Git。
