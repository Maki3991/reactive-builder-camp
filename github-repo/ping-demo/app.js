'use strict';

// 合约地址来自本项目的测试网部署记录。读取与发送均发生在 Sepolia。
const ORIGIN = '0x71a70535389B0F6619f55418Be595F0E1EF57da5';
const CALLBACK = '0x9f8180Fa77B13dD025b2e81c6F66Fd2ce0390dc5';
const SEPOLIA = '0xaa36a7';
const MAX_UINT256 = (1n << 256n) - 1n;
const $ = id => document.getElementById(id);
let account = null;
let pendingHash = null;
let polling = false;

function status(title, detail, kind = '') {
  $('status-title').textContent = title;
  $('status-detail').textContent = detail;
  $('status').dataset.kind = kind;
}

function explain(error) {
  if (error?.code === 4001) return '你取消了钱包请求，可以随时重试。';
  if (error?.code === 4902) return '钱包中没有 Sepolia 网络，请先在 MetaMask 中启用。';
  return error?.shortMessage || error?.message || '请求未完成，请检查钱包和网络。';
}

async function read(selector) {
  const raw = await window.ethereum.request({ method: 'eth_call', params: [{ to: CALLBACK, data: selector }, 'latest'] });
  if (!raw || raw === '0x') throw new Error('回调合约没有返回数据，请检查网络和合约地址。');
  return BigInt(raw);
}

async function refresh() {
  if (!window.ethereum || !account) { status('等待连接钱包', '连接后可以读取回调合约的最新记录。'); return null; }
  const chain = await window.ethereum.request({ method: 'eth_chainId' });
  if (chain.toLowerCase() !== SEPOLIA) { status('请切换到 Sepolia', '当前网页连接的网络不是 Sepolia；可在 MetaMask 中切换后刷新。', 'error'); return null; }
  const [count, value, hash] = await Promise.all([read('0x06661abd'), read('0x43183834'), read('0xa3a06964')]);
  $('count').textContent = count.toString();
  $('last-value').textContent = count === 0n ? '—' : value.toString();
  if (pendingHash && hash === BigInt(pendingHash)) {
    status('本次回调已记录', `源交易哈希匹配；回调合约最近记录的数字是 ${value}。`, 'success');
    pendingHash = null;
  } else if (!pendingHash) {
    status('合约数据已更新', count === 0n ? '目前还没有回调记录。' : '显示的是合约的全局最新记录，不一定来自本次操作。', 'success');
  }
  return { count, value, hash };
}

async function connect() {
  if (!window.ethereum) { status('未找到钱包', '请在已安装 MetaMask 的浏览器中打开此页面。', 'error'); return; }
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts.length) throw new Error('没有可用账户。');
    account = accounts[0];
    const chain = await window.ethereum.request({ method: 'eth_chainId' });
    if (chain.toLowerCase() !== SEPOLIA) await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SEPOLIA }] });
    $('wallet-status').textContent = `${account.slice(0, 6)}…${account.slice(-4)} · Sepolia`;
    $('connect').textContent = '已连接 ✓';
    $('send').disabled = false;
    await refresh();
  } catch (error) { $('send').disabled = true; status('连接未完成', explain(error), 'error'); }
}

async function waitForReceipt(hash) {
  for (let i = 0; i < 60; i++) {
    const receipt = await window.ethereum.request({ method: 'eth_getTransactionReceipt', params: [hash] });
    if (receipt) return receipt;
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  return null;
}

async function observeCallback() {
  if (polling) return;
  polling = true;
  try {
    for (let i = 0; i < 30 && pendingHash; i++) {
      await new Promise(resolve => setTimeout(resolve, 4000));
      await refresh();
    }
    if (pendingHash) status('仍在等待回调', '尚未匹配到本次交易。你可以稍后刷新，或通过区块浏览器检查；请勿仅凭等待就重复发送。');
  } finally { polling = false; }
}

$('connect').addEventListener('click', connect);
$('refresh').addEventListener('click', async () => { try { await refresh(); } catch (error) { status('读取失败', explain(error), 'error'); } });
$('ping-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!account || !window.ethereum) return;
  const text = $('value').value.trim();
  if (!/^\d+$/.test(text)) { status('请输入非负整数', '例如 500；不支持小数或负数。', 'error'); return; }
  const value = BigInt(text);
  if (value > MAX_UINT256) { status('数字过大', '请输入 uint256 范围内的整数。', 'error'); return; }
  $('send').disabled = true;
  try {
    const chain = await window.ethereum.request({ method: 'eth_chainId' });
    if (chain.toLowerCase() !== SEPOLIA) throw new Error('请先将当前网页的钱包网络切换到 Sepolia。');
    status('等待钱包确认', '请在 MetaMask 查看账户、Sepolia 网络和网络费。');
    const data = '0x773acdef' + value.toString(16).padStart(64, '0');
    const hash = await window.ethereum.request({ method: 'eth_sendTransaction', params: [{ from: account, to: ORIGIN, data }] });
    $('tx-link').href = `https://sepolia.etherscan.io/tx/${hash}`;
    $('tx-link').hidden = false;
    status('Ping 已提交', '正在等待 Sepolia 确认；这还不代表回调已经成功。');
    const receipt = await waitForReceipt(hash);
    if (!receipt) { status('交易仍待确认', '请通过交易链接查看状态，暂时不要重复发送。'); return; }
    if (receipt.status !== '0x1') { status('Ping 交易失败', '请查看交易详情；回调尚未确认。', 'error'); return; }
    if (value < 100n) { await refresh().catch(() => {}); status('Ping 交易已确认', '输入低于 100，按当前示例配置不会请求回调。', 'success'); return; }
    pendingHash = hash;
    status('Ping 已确认，等待回调', '页面将核对回调合约记录的源交易哈希。若已达到处理次数上限，回调不会触发。');
    await observeCallback();
  } catch (error) { status('操作未完成', explain(error), 'error'); }
  finally { $('send').disabled = !account; }
});
if (window.ethereum) {
  window.ethereum.on('accountsChanged', accounts => { account = accounts[0] || null; $('send').disabled = !account; $('wallet-status').textContent = account ? `${account.slice(0, 6)}…${account.slice(-4)} · 请确认网络` : '钱包未连接'; });
  window.ethereum.on('chainChanged', () => { if (account) refresh().catch(error => status('读取失败', explain(error), 'error')); });
}
