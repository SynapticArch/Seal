// create-android-keystore.js
// 交互式生成 Android 签名密钥并输出 GitHub Actions 所需的 secrets（Node.js 版）

const readline = require('readline');
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(question, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function main() {
  // 检查 keytool
  try {
    execSync('keytool -help', { stdio: 'ignore' });
  } catch (e) {
    console.error('\n未检测到 keytool，请确保已安装 JDK 并将 keytool 加入 PATH 环境变量！');
    process.exit(1);
  }

  // 交互输入
  let keystoreFile = (await ask('请输入要生成的 keystore 文件名（如 my-release-key.jks）: ')).trim();
  if (!keystoreFile) keystoreFile = 'my-release-key.jks';
  let alias = (await ask('请输入密钥别名（alias，建议用 my-key-alias）: ')).trim();
  if (!alias) alias = 'my-key-alias';
  let storePass = (await ask('请输入 keystore 密码（记住它！）: ')).trim();
  let keyPass = (await ask('请输入 key 密码（可与 keystore 密码相同）: ')).trim();

  // 生成 keystore
  console.log('\n正在生成 keystore...');
  const dname = 'CN=Android Debug,O=MyOrg,C=CN';
  const keytoolCmd = [
    'keytool',
    '-genkeypair',
    '-v',
    '-keystore', keystoreFile,
    '-keyalg', 'RSA',
    '-keysize', '2048',
    '-validity', '10000',
    '-alias', alias,
    '-storepass', storePass,
    '-keypass', keyPass,
    '-dname', dname
  ];
  try {
    spawnSync(keytoolCmd[0], keytoolCmd.slice(1), { stdio: 'inherit' });
  } catch (e) {
    console.error('keystore 生成失败，请检查 keytool 是否可用。');
    process.exit(1);
  }
  if (!fs.existsSync(keystoreFile)) {
    console.error('keystore 生成失败，请检查 keytool 是否可用。');
    process.exit(1);
  }

  // base64 编码
  console.log('\n正在 base64 编码 keystore...');
  const keystoreBuf = fs.readFileSync(keystoreFile);
  const base64Content = keystoreBuf.toString('base64');

  // 输出 GitHub secrets 填写内容
  console.log('\n请将以下内容填写到 GitHub Secrets：');
  console.log('----------------------------------------');
  console.log('SIGNING_KEY（内容很长，全部复制）：');
  console.log(base64Content);
  console.log('\nALIAS：');
  console.log(alias);
  console.log('\nKEY_STORE_PASSWORD：');
  console.log(storePass);
  console.log('\nKEY_PASSWORD：');
  console.log(keyPass);
  console.log('----------------------------------------');
  console.log('\n全部添加到 GitHub 仓库的 Settings → Secrets and variables → Actions 即可。');
  console.log('\n如需运行本脚本，请在命令行输入：');
  console.log('  node create-android-keystore.js');
}

main(); 