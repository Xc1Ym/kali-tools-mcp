# Metasploit Framework (MSF) MCP 集成使用指南

## 🎯 功能概述

MSF MCP 工具提供了完整的 Metasploit Framework 集成，支持渗透测试的各个阶段。

## ✅ 可用功能

### 1. 系统基础功能
- **获取版本**: `get_version` - 获取 Metasploit 版本信息
- **系统统计**: `get_stats` - 获取模块统计数据

### 2. 模块管理功能
- **搜索模块**: `search_modules` - 搜索特定关键词的模块
- **获取模块信息**: `get_module_info` - 获取模块详细信息
- **获取模块选项**: `get_module_options` - 获取模块配置选项
- **模块统计**: `get_module_stats` - 获取各类模块数量统计

### 3. 会话管理功能
- **列出会话**: `list_sessions` - 列出所有活动会话
- **获取会话**: `get_session` - 获取特定会话详情
- **执行命令**: `execute_command` - 在会话中执行命令
- **终止会话**: `kill_session` - 终止指定会话
- **会话统计**: `get_session_stats` - 获取会话统计信息

### 4. 工作区管理功能
- **列出工作区**: `list_workspaces` - 列出所有工作区
- **设置工作区**: `set_workspace` - 切换工作区
- **创建工作区**: `create_workspace` - 创建新工作区
- **列出主机**: `list_hosts` - 列出工作区中的主机
- **列出服务**: `list_services` - 列出工作区中的服务
- **列出漏洞**: `list_vulnerabilities` - 列出工作区中的漏洞
- **列出凭证**: `list_credentials` - 列出工作区中的凭证
- **工作区统计**: `get_workspace_stats` - 获取工作区统计信息

### 5. 任务管理功能
- **列出任务**: `list_jobs` - 列出所有后台任务
- **停止任务**: `stop_job` - 停止指定任务
- **任务统计**: `get_job_stats` - 获取任务统计信息

## 🚀 使用示例

### 示例 1: 搜索 Linux 相关模块
```javascript
// 在 Claude Code 中运行
const result = await msfTool.execute({
  action: 'search_modules',
  query: 'linux'
});
// 返回 1422 个 linux 相关模块
```

### 示例 2: 获取反向 TCP 模块
```javascript
const reverseTcp = await msfTool.execute({
  action: 'search_modules',
  query: 'reverse tcp'
});
// 返回 642 个反向 TCP 模块
```

### 示例 3: 查看模块详细信息
```javascript
const moduleInfo = await msfTool.execute({
  action: 'get_module_info',
  module_name: 'linux/x86/meterpreter/reverse_tcp'
});
// 返回模块的详细信息，包括描述、作者、引用等
```

### 示例 4: 管理会话
```javascript
// 列出所有活动会话
const sessions = await msfTool.execute({
  action: 'list_sessions'
});

// 在特定会话中执行命令
const result = await msfTool.execute({
  action: 'execute_command',
  session_id: 1,
  command: 'whoami'
});
```

### 示例 5: 工作区管理
```javascript
// 创建新工作区
await msfTool.execute({
  action: 'create_workspace',
  workspace_name: 'pentest_project'
});

// 获取工作区统计
const stats = await msfTool.execute({
  action: 'get_workspace_stats',
  workspace_name: 'pentest_project'
});
```

## 📊 性能指标

- **总模块数**: 6000+ 模块
  - Exploits: 2623
  - Auxiliary: 1326
  - Post: 432
  - Payloads: 1710
- **搜索速度**: ~1-2秒
- **连接时间**: ~0.1秒
- **响应时间**: <0.5秒

## 🔧 配置要求

### 1. 启动 MSFRPC 服务
```bash
# 方法 1: 使用 msfrpcd
msfrpcd -P your_password -U msf

# 方法 2: 使用 msfconsole
msfconsole
msf6> load msgrpc ServerHost=127.0.0.1 ServerPort=55553 User=msf Pass=your_password
```

### 2. 配置文件设置
在 `config/default.json` 中添加：
```json
{
  "msfrpc": {
    "host": "localhost",
    "port": 55553,
    "username": "msf",
    "password": "your_password",
    "uri": "/api/",
    "timeout": 30000
  }
}
```

## 🎯 典型使用场景

### 场景 1: 漏洞利用
1. 搜索目标系统的 exploit 模块
2. 获取模块详细信息和选项
3. 配置并执行 exploit
4. 管理建立的会话

### 场景 2: 后渗透
1. 列出活动会话
2. 在会话中执行提权命令
3. 收集凭证和敏感信息
4. 生成报告

### 场景 3: 信息收集
1. 创建专用工作区
2. 使用 auxiliary 模块扫描目标
3. 记录发现的主机和服务
4. 管理漏洞信息

## ⚠️ 注意事项

1. **权限要求**: 需要适当授权才能使用 MSF 工具
2. **网络连接**: 确保 MSFRPC 服务可访问
3. **资源消耗**: 模块搜索和扫描可能消耗较多资源
4. **会话管理**: 注意管理活动会话，避免资源泄漏

## 🚨 安全警告

- ⚠️ 只在授权环境中使用
- ⚠️ 遵守相关法律法规
- ⚠️ 负责任地使用渗透测试工具
- ⚠️ 不得用于非法目的

## 📞 故障排除

### 问题 1: 连接失败
```bash
# 检查 MSFRPC 服务是否运行
ps aux | grep msfrpc

# 检查端口是否监听
netstat -tlnp | grep 55553
```

### 问题 2: 模块搜索返回空结果
- 检查搜索关键词是否正确
- 尝试使用更通用的关键词
- 确认 MSF 数据库已更新

### 问题 3: 会话操作失败
- 确认会话 ID 是否正确
- 检查会话是否仍然活跃
- 验证命令格式是否正确

## 🎓 学习资源

- [Metasploit Framework](https://www.metasploit.com/)
- [Metasploit RPC API](https://help.rapid7.com/metasploit/Content/api/rpc/overview.html)
- [Metasploit Unleashed](http://www.offensive-security.com/metasploit-unleashed/)
- [MSF 开发文档](https://github.com/rapid7/metasploit-framework)

---

**状态**: ✅ 生产就绪
**版本**: 1.0.0
**最后更新**: 2026-03-23
