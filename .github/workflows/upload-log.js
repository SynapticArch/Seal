const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const iconv = require('iconv-lite');
const chardet = require('chardet');

// 日志文件路径支持通过环境变量传入（由 workflow 传递 LOG_FILE_PATH，适配构建失败日志自动上传）
const filePath = process.env.LOG_FILE_PATH || './build.log';
// 根据主日志文件名自动生成 UTF-8 文件名（如 build.log -> build_utf8.log）
const utf8FilePath = filePath.replace(/(\.[^.]*)?$/, '_utf8.log');
// 授权Token
const ST = 'OvwKx5qgJtf7PZgCKbtyojSU.MTcwMTUxNzY1MTgwMw';

// 自动转码为UTF-8
function convertToUtf8(srcPath, destPath) {
  const buffer = fs.readFileSync(srcPath);
  const encoding = chardet.detect(buffer) || 'UTF-8';
  const content = iconv.decode(buffer, encoding);
  fs.writeFileSync(destPath, content, { encoding: 'utf8' });
}

// 上传函数，支持http和https
async function uploadLog() {
  // 上传前先转码
  convertToUtf8(filePath, utf8FilePath);
  const form = new FormData();
  form.append('file', fs.createReadStream(utf8FilePath));

  const headers = {
    ...form.getHeaders(),
    'Authorization': ST
  };

  // 先尝试HTTP
  try {
    const httpRes = await axios.post(
      'http://hpaste.spiritlhl.net/api/UL/upload',
      form,
      { headers, timeout: 10000 }
    );
    if (httpRes.data && typeof httpRes.data === 'string' && httpRes.data.includes('show')) {
      const fileId = httpRes.data.trim().split('/').pop();
      console.log('HTTP上传成功:');
      console.log('短链:', `https://paste.spiritlhl.net/#/show/${fileId}`);
      return;
    }
  } catch (err) {
    // HTTP失败，继续尝试HTTPS
  }

  // 再尝试HTTPS
  try {
    const form2 = new FormData();
    form2.append('file', fs.createReadStream(utf8FilePath));
    const headers2 = {
      ...form2.getHeaders(),
      'Authorization': ST
    };
    const httpsRes = await axios.post(
      'https://paste.spiritlhl.net/api/UL/upload',
      form2,
      { headers: headers2, timeout: 10000 }
    );
    if (httpsRes.data && typeof httpsRes.data === 'string' && httpsRes.data.includes('show')) {
      const fileId = httpsRes.data.trim().split('/').pop();
      console.log('HTTPS上传成功:');
      console.log('短链:', `https://paste.spiritlhl.net/#/show/${fileId}`);
      return;
    }
    console.error('HTTPS上传失败，返回内容:', httpsRes.data);
  } catch (err) {
    console.error('日志上传失败:', err.response ? err.response.data : err.message);
  }
}

uploadLog(); 