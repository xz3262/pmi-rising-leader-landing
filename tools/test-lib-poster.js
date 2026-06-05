// 加载 .env.local 后，直接调用生产函数 lib/poster.generatePosterPortrait
const fs = require('fs');
fs.readFileSync('.env.local','utf8').split(/\r?\n/).forEach(l=>{
  const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if(m&&!process.env[m[1]])process.env[m[1]]=m[2];
});
const { generatePosterPortrait } = require('../lib/poster');
const b64 = fs.readFileSync('assets/8b206eea95e860424b13175377c11853.png').toString('base64');
const dataUrl = 'data:image/png;base64,' + b64;
(async()=>{
  const t0=Date.now();
  const r = await generatePosterPortrait(dataUrl);
  console.log('OK 耗时', ((Date.now()-t0)/1000).toFixed(1)+'s', '| mime', r.mime, '| usage', JSON.stringify(r.usage));
  fs.writeFileSync('tools/nominee-preview-libtest.png', Buffer.from(r.base64,'base64'));
  console.log('saved tools/nominee-preview-libtest.png');
})().catch(e=>{console.error('FAIL', e.message); process.exit(1);});
