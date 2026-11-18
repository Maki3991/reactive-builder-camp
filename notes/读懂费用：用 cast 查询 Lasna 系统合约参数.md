### 一次 react() 的费用怎么算？（fee = 基础 gas 价格 × 系数 × (实际消耗 gas + 固定附加 gas)）

费用 gas 价格、费用系数、执行过程中消耗的相关 gas 和固定附加 gas 决定

gas 是计算资源的计量单位。计费价格取交易的 gas price 和区块的 base fee 中较大的值

我用 Cast 查询 Lasna 上的 System Contract，得到以下结果：

```powershell
& "C:\Users\Maki1\.foundry\bin\cast.exe" call 0x8888888888888888888888888888888888888888 "_gasPriceCoeffPer1000()(uint256)" --rpc-url https://lasna-rpc.rnk.dev/
# 输出：1000

& "C:\Users\Maki1\.foundry\bin\cast.exe" call 0x8888888888888888888888888888888888888888 "_extraGas()(uint256)" --rpc-url https://lasna-rpc.rnk.dev/
# 输出：100000 [1e5]

& "C:\Users\Maki1\.foundry\bin\cast.exe" call 0x8888888888888888888888888888888888888888 "_maxChargeGas()(uint256)" --rpc-url https://lasna-rpc.rnk.dev/
# 输出：50000 [5e4]
```

费用系数要除以 1000；固定附加 gas 为 100000

公式可写成：

```text
费用 = 计费使用的 gas 价格 × 1 ×（执行消耗的相关 gas + 100000）
```

`_maxChargeGas()` 的 50000 是付款步骤可以使用的 gas 上限

### balance、reserves、debt 分别是什么？为什么「只要有一点 debt，合约就停止执行」？

balance 指存放在我们自己写的 reactive contract 或者callback contract 里面的余额

reserves 是我们给 reactive 的 system contract 或者 callback proxy 支付的预金额

当链上产生 gas 费用后，reactive system contract 和callback proxy 会优先扣除 reserves，直到 reserves 归零后

若仍然产生费用，默认会将自己合约中的 balance 作为抵扣

若 balance 也消耗完。则将费用记为 debt，即欠账，那么没有钱支持网络运转，合约停止执行

### react() 执行回滚了，还收费吗？这对你的合约设计意味着什么？

会收费

回滚前我们已经对链上数据做出了修改，这个修改需要支付其费用

回滚也是对链上数据进行修改，即便是修改回原样，因此也需要收费