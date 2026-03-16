# 📥 安装指南

## 详细安装步骤

### 1. 系统要求检查

**检查 Node.js 版本：**
```bash
node --version  # 需要 v18.0.0+
npm --version
```

**检查 Kali 工具：**
```bash
which nmap nuclei dirsearch sqlmap hydra
# 应该显示所有工具的路径
```

### 2. 安装 Kali 工具 (如果缺失)

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install nmap hydra sqlmap

# 安装 dirsearch
sudo apt install dirsearch
# 或者使用 Python pip
pip3 install dirsearch

# 安装 nuclei
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
```

**macOS:**
```bash
brew install nmap hydra sqlmap
pip3 install dirsearch nuclei
```

**Kali Linux:**
所有工具通常已预装。

### 3. 安装 Kali 字典 (可选)

**解压 rockyou 字典：**
```bash
sudo gzip -dk /usr/share/wordlists/rockyou.txt.gz
```

### 4. 项目安装

**克隆仓库：**
```bash
git clone https://github.com/Xc1Ym/kali-tools-mcp.git
cd kali-tools-mcp
```

**安装 Node.js 依赖：**
```bash
npm install
```

**构建项目：**
```bash
npm run build
```

### 5. 配置 MCP 服务器

**编辑配置文件：**
```bash
nano config/default.json
```

**添加允许的目标：**
```json
{
  "allowedTargets": [
    "192.168.1.0/24",
    "example.com",
    "testphp.vulnweb.com"
  ],
  "blockedTargets": [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1"
  ],
  "defaultTimeout": 300,
  "maxConcurrentScans": 3,
  "logLevel": "info"
}
```

### 6. 在 Claude Code 中配置 MCP

**找到 Claude Code 配置文件：**
- **Linux**: `~/.config/claude-code/config.json`
- **macOS**: `~/Library/Application Support/Claude Code/config.json`
- **Windows**: `%APPDATA%\Claude Code\config.json`

**添加 MCP 服务器配置：**
```json
{
  "mcpServers": {
    "kali-tools": {
      "command": "node",
      "args": [
        "/absolute/path/to/kali-tools-mcp/build/index.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**重要：** 将 `/absolute/path/to/kali-tools-mcp` 替换为实际的项目路径。

### 7. 验证安装

**测试 MCP 连接：**
1. 重启 Claude Code
2. 在聊天中输入：`使用 nmap 扫描 localhost`
3. 应该看到扫描结果

**查看日志：**
```bash
# MCP 日志通常在：
tail -f ~/.config/claude-code/logs/mcp.log
```

## 故障排除

### 问题 1: 找不到工具
**错误：** `Tool nmap is not available on this system`

**解决：**
```bash
# 检查工具是否安装
which nmap

# 如果未安装，安装对应工具
sudo apt install nmap  # Ubuntu/Debian
brew install nmap      # macOS
```

### 问题 2: 权限错误
**错误：** `Permission denied` 或 `EACCES`

**解决：**
```bash
# 给予脚本执行权限
chmod +x build/index.js

# 或者使用 npm start
npm start
```

### 问题 3: 端口被占用
**错误：** `Port 3000 already in use`

**解决：**
```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>
```

### 问题 4: 目标被阻止
**错误：** `Target validation failed`

**解决：**
1. 编辑 `config/default.json`
2. 将目标添加到 `allowedTargets` 数组
3. 从 `blockedTargets` 中移除

### 问题 5: 字典文件未找到
**错误：** `Dictionary file not found`

**解决：**
```bash
# 检查字典是否存在
ls -la /usr/share/wordlists/

# 解压 rockyou 字典
sudo gzip -dk /usr/share/wordlists/rockyou.txt.gz
```

## 高级配置

### 自定义字典路径
```json
{
  "customDictionaries": {
    "myPasswords": "/path/to/custom/passwords.txt",
    "myUsernames": "/path/to/usernames.txt"
  }
}
```

### 调整性能参数
```json
{
  "defaultTimeout": 600,        // 10分钟超时
  "maxConcurrentScans": 5,       // 最多5个并发扫描
  "rateLimit": {
    "requestsPerMinute": 100,
    "burstSize": 20
  }
}
```

### 日志配置
```json
{
  "logLevel": "debug",           // trace, debug, info, warn, error
  "logFile": "/var/log/kali-mcp.log",
  "enableAuditLog": true
}
```

## 安全建议

### 1. 网络隔离
- 在隔离的测试网络中使用
- 使用 VPN 或专用网络
- 避免在生产环境中测试

### 2. 访问控制
```json
{
  "allowedTargets": [
    // 只添加你拥有或授权测试的目标
  ],
  "blockedTargets": [
    // 阻止敏感目标
    "internal.company.com",
    "production.server.com"
  ]
}
```

### 3. 审计日志
- 定期检查 `security.log`
- 监控异常活动
- 设置日志轮转

### 4. 法律合规
- ⚠️ 只扫描你拥有或明确授权的目标
- ⚠️ 遵守当地法律法规
- ⚠️ 获得书面授权 before 测试

## 卸载

**停止 MCP 服务器：**
```bash
# 从 Claude Code 配置中移除 kali-tools 配置
# 重启 Claude Code
```

**删除项目文件：**
```bash
rm -rf kali-tools-mcp
```

**删除全局依赖 (可选)：**
```bash
npm uninstall -g kali-tools-mcp
```

## 需要帮助？

- 📖 查看 [README.md](README.md)
- 🐛 报告问题: [GitHub Issues](https://github.com/Xc1Ym/kali-tools-mcp/issues)
- 💬 讨论: [GitHub Discussions](https://github.com/Xc1Ym/kali-tools-mcp/discussions)
