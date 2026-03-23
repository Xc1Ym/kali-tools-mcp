# Acunetix 集成使用指南

## 📖 目录

- [简介](#简介)
- [配置](#配置)
- [功能概览](#功能概览)
- [使用示例](#使用示例)
- [API 参考](#api-参考)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)

## 简介

Acunetix 是企业级 Web 应用漏洞扫描器，本 MCP 服务器通过 API 集成了 Acunetix 的核心功能，让你可以在 Claude Code 中直接管理扫描目标、启动扫描、查看漏洞和生成报告。

### 主要功能

- ✅ **目标管理** - 创建、更新、删除扫描目标
- ✅ **扫描管理** - 启动、停止、监控扫描任务
- ✅ **漏洞管理** - 查询、分类、更新漏洞状态
- ✅ **报告生成** - 生成多种格式的安全报告
- ✅ **完整 API 支持** - 覆盖所有 Acunetix API v1 功能

## 配置

### 1. 获取 API Key

1. 登录 Acunetix Web UI
2. 点击右上角头像，进入 **Profile**
3. 找到 **API Key** 部分
4. 点击 "Show" 显示并复制 API Key

### 2. 配置 MCP 服务器

**方式一：通过配置文件**

编辑 `config/default.json`：

```json
{
  "acunetix": {
    "apiBaseUrl": "https://192.168.46.128:3443/api/v1",
    "apiKey": "your_api_key_here",
    "timeout": 30000,
    "rejectUnauthorized": false
  }
}
```

**方式二：通过环境变量**

```bash
export ACUNETIX_API_URL="https://192.168.46.128:3443/api/v1"
export ACUNETIX_API_KEY="your_api_key_here"
```

### 3. 支持的 Acunetix 版本

- ✅ Acunetix On-Premise (v13+)
- ✅ Acunetix Online (online.acunetix.com)
- ✅ Invicti (app.invicti.com, app-eu.invicti.com)

**不同版本的 Base URL**：

```bash
# On-Premise (默认)
https://127.0.0.1:3443/api/v1

# Acunetix Online
https://online.acunetix.com/api/v1

# Invicti (US)
https://app.invicti.com/api/v1

# Invicti (EU)
https://app-eu.invicti.com/api/v1
```

## 功能概览

### 目标管理

| 操作 | 说明 |
|------|------|
| `list_targets` | 列出所有扫描目标 |
| `get_target` | 获取目标详情 |
| `create_target` | 创建新目标 |
| `update_target` | 更新目标配置 |
| `delete_target` | 删除目标 |

### 扫描管理

| 操作 | 说明 |
|------|------|
| `list_scans` | 列出所有扫描 |
| `get_scan` | 获取扫描详情 |
| `create_scan` | 创建新扫描 |
| `start_scan` | 启动扫描 |
| `abort_scan` | 停止扫描 |
| `resume_scan` | 恢复扫描 |

### 漏洞管理

| 操作 | 说明 |
|------|------|
| `list_vulnerabilities` | 列出所有漏洞 |
| `get_vulnerability` | 获取漏洞详情 |
| `update_vuln_status` | 更新漏洞状态 |
| `recheck_vuln` | 重新检查漏洞 |

### 报告管理

| 操作 | 说明 |
|------|------|
| `list_reports` | 列出所有报告 |
| `get_report` | 获取报告详情 |
| `create_report` | 创建新报告 |
| `delete_report` | 删除报告 |
| `download_report` | 下载报告文件 |
| `get_templates` | 获取报告模板 |

## 使用示例

### 1. 测试连接

首先验证 Acunetix 连接是否正常：

```
使用 Acunetix 测试连接
```

### 2. 创建扫描目标

创建一个新的扫描目标：

```
使用 Acunetix 创建目标，地址为 http://example.com，描述为 "测试网站"
```

### 3. 查看所有目标

列出所有已配置的目标：

```
使用 Acunetix 列出所有目标
```

### 4. 创建并启动扫描

创建扫描并立即启动：

```
使用 Acunetix 为目标 [target_id] 创建扫描，使用配置文件 11111111-1111-1111-1111-111111111111
```

```
使用 Acunetix 启动扫描 [scan_id]
```

### 5. 查看扫描状态

监控扫描进度：

```
使用 Acunetix 获取扫描 [scan_id] 的详情
```

### 6. 查看漏洞

查看扫描发现的漏洞：

```
使用 Acunetix 列出所有漏洞，按严重程度排序
```

```
使用 Acunetix 获取漏洞 [vuln_id] 的详情
```

### 7. 更新漏洞状态

标记漏洞状态：

```
使用 Acunetix 将漏洞 [vuln_id] 状态更新为 fixed
```

### 8. 生成报告

生成安全报告：

```
使用 Acunetix 创建 PDF 报告，包含扫描 [scan_id] 的结果
```

### 9. 完整工作流示例

一个完整的漏洞扫描流程：

```
# 1. 创建目标
使用 Acunetix 创建目标，地址为 http://testphp.vulnweb.com

# 2. 创建扫描
使用 Acunetix 为目标创建扫描，使用默认配置文件

# 3. 启动扫描
使用 Acunetix 启动刚创建的扫描

# 4. 等待扫描完成（监控状态）
使用 Acunetix 获取扫描状态

# 5. 查看发现的漏洞
使用 Acunetix 列出该扫描的所有漏洞

# 6. 生成报告
使用 Acunetix 生成 PDF 格式的漏洞报告

# 7. 下载报告
使用 Acunetix 下载报告文件
```

## API 参考

### action 参数

所有 Acunetix 操作都需要 `action` 参数指定操作类型：

```typescript
'action': 'list_targets' | 'get_target' | 'create_target' | 'update_target' | 'delete_target' |
         'list_scans' | 'get_scan' | 'create_scan' | 'start_scan' | 'abort_scan' | 'resume_scan' |
         'list_vulnerabilities' | 'get_vulnerability' | 'update_vuln_status' | 'recheck_vuln' |
         'list_reports' | 'get_report' | 'create_report' | 'delete_report' | 'download_report' |
         'get_templates' | 'test_connection'
```

### 目标操作参数

**创建目标 (`create_target`)**:
- `address` (string): 目标地址（URL 或 IP）
- `description` (string, optional): 目标描述
- `type` (enum, optional): 目标类型 - `default` 或 `api`
- `criticality` (number, optional): 重要性等级 (0-100)

**更新目标 (`update_target`)**:
- `target_id` (string): 目标 ID
- `description` (string, optional): 新描述
- `criticality` (number, optional): 新重要性等级

### 扫描操作参数

**创建扫描 (`create_scan`)**:
- `target_id` (string): 目标 ID
- `profile_id` (string): 扫描配置文件 ID

**扫描控制**:
- `scan_id` (string): 扫描 ID

### 漏洞操作参数

**更新漏洞状态 (`update_vuln_status`)**:
- `vuln_id` (string): 漏洞 ID
- `status` (enum): 新状态 - `open` | `fixed` | `false_positive` | `ignored` | `risk_accepted` | `retested`

### 报告操作参数

**创建报告 (`create_report`)**:
- `type` (enum): 报告类型
  - `scan_vulnerabilities` - 扫描漏洞报告
  - `comparison` - 对比报告
  - `sla` - SLA 报告
  - `weekly` - 周报
  - `executive_summary` - 执行摘要
  - `compliance` - 合规报告
- `format` (enum): 报告格式 - `pdf` | `html` | `json` | `xml` | `mobile` | `rtf`
- `source` (object): 报告源配置
  - `source.list_type` (enum): `scans` | `targets` | `scan_groups` | `target_groups`
  - `source.id_list` (array): ID 列表
- `template_id` (string, optional): 报告模板 ID

### 分页参数

所有列表操作都支持分页：

- `cursor` (string, optional): 分页游标
- `limit` (number, optional): 每页结果数 (1-100)
- `query` (string, optional): 搜索查询
- `sort` (string, optional): 排序字段和方向 (例如：`severity:desc`)

## 最佳实践

### 1. 目标组织

- 使用描述性的目标名称
- 合理设置 criticality 等级
- 定期清理不再使用的目标

### 2. 扫描策略

- 选择合适的扫描配置文件
- 避免在工作时间进行激进扫描
- 使用目标组管理批量扫描

### 3. 漏洞管理

- 及时更新漏洞状态
- 使用标签组织漏洞
- 定期重新检查重要漏洞

### 4. 报告生成

- 根据受众选择合适的报告模板
- 定期生成合规报告
- 保存重要报告用于对比分析

### 5. 安全建议

- 不要在代码中硬编码 API Key
- 使用环境变量或配置文件管理密钥
- 定期轮换 API Key
- 限制 API 访问权限

## 故障排除

### 连接问题

**问题**: 无法连接到 Acunetix

**解决方案**:
1. 检查 `apiBaseUrl` 是否正确
2. 确认 Acunetix 服务正在运行
3. 验证网络连接
4. 检查防火墙设置
5. 如果使用自签名证书，设置 `rejectUnauthorized: false`

### 认证问题

**问题**: API 认证失败

**解决方案**:
1. 验证 API Key 是否正确
2. 确认 API Key 未过期
3. 检查用户权限
4. 重新生成 API Key

### 扫描问题

**问题**: 扫描无法启动

**解决方案**:
1. 确认目标地址可访问
2. 检查扫描配置文件 ID
3. 验证许可证限制
4. 检查目标配置（例如登录序列）

### 性能优化

**建议**:
- 使用 `limit` 参数分页获取大量数据
- 使用 `query` 参数过滤结果
- 缓存常用的配置数据（如扫描配置文件）
- 异步执行长时间运行的操作

## 更多资源

- [Acunetix 官方文档](https://www.acunetix.com/support/)
- [Acunetix API 文档](https://www.acunetix.com/support/docs/api/)
- [MCP 协议规范](https://modelcontextprotocol.io/)
- [项目 GitHub](https://github.com/Xc1Ym/kali-tools-mcp)

## 版本历史

- **v1.0.0** (2024) - 初始版本
  - 目标管理
  - 扫描管理
  - 漏洞管理
  - 报告生成
  - 完整 API v1 支持
