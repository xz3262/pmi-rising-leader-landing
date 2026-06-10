# PMI Rising Leader 2026 · 落地页（占位版）

中国新锐项目管理精英大会暨全国百强新锐年度颁奖典礼活动落地页。
纯静态实现（HTML / CSS / 原生 JS），无需构建，桌面端与移动端均已适配。

## 预览

直接用浏览器打开 `index.html` 即可；或在目录下起一个静态服务：

```bash
python3 -m http.server 8080
# 然后访问 http://localhost:8080
```

## 文件结构

```
landing page/
├── index.html          # 主落地页（Hero / 价值 / 企业 / 议程 / 报名）
├── success.html        # 支付成功页（活动信息票券 + 验票二维码）
├── css/styles.css      # 设计系统 + 全部样式 + 响应式
├── js/main.js          # 海报墙 / logo 墙 / 议程 / 票种 / 表单 / 短信占位
├── js/success.js       # 成功页信息回填 + 占位二维码生成
└── assets/             # 预留（logo、图片等真实素材）
```

## 配色

取自主视觉渐变（深紫底 + 品红 / 橙 / 蓝 / 薰衣草紫），定义在 `:root` CSS 变量：
`--magenta #e0359a`、`--pink #ff4d8d`、`--orange #ff6b3d`、`--blue #4d6ef5`、`--purple #7c4dbb`、`--lavender #b3a0d9`。
主渐变 `--grad-full` 应用于按钮、标题、二维码票券、短信视觉等。

## 占位 / 待接入项

| 位置 | 现状（占位） | 真实接入 |
| --- | --- | --- |
| **企业 Logo** | `js/main.js` 中 `COMPANIES` 数组，纯文字色块 | 替换为 `assets/` 真实 logo 图 |
| **Rising Leader 海报** | JS 生成的渐变占位卡 | 替换为 100 位获奖者真实头图 |
| **支付** | `initForm()` 内 `setTimeout` 模拟，1.8s 后跳成功页 | POST 报名信息到后端，换取微信 / 支付宝支付链接后跳转 |
| **验票二维码** | `success.js` 生成的确定性占位图案 | 后端按订单号生成一次性可核销二维码 |
| **短信** | `sendSms()` 仅 `console.log` 打印模板 | 后端触发短信网关（阿里云 / 腾讯云短信） |

### 短信触发时点（占位模板已写好）

- `confirm`：报名 + 支付成功后立即发送
- `remindD3`：活动前 3 天发送行前须知
- `remindD1`：活动前 1 天发送最终确认

> 价格：持证人 ¥799（渠道折扣价 ¥499）/ 非持证人 ¥999（渠道折扣价 ¥699）。渠道码（默认 QD2026）、免费邀请码（PMI100）与测试码（TEST）在 js/main.js 与 api/order.js 两处需保持一致。
