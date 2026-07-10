# 服务端部署指南 (Railway)

## 部署步骤

1. **注册 Railway 账号**：访问 https://railway.app，点击 "Login with GitHub" 用 GitHub 账号登录。
2. **推送代码到 GitHub**：将本项目推送到你的 GitHub 仓库。
3. **创建新项目**：在 Railway Dashboard 点击 "New Project" → "Deploy from GitHub repo"。
4. **选择仓库**：授权 Railway 访问你的 GitHub，然后选择本项目的仓库。
5. **设置 Root Directory**：在部署设置中将 **Root Directory** 设为 `server`。
6. **自动部署**：Railway 会自动检测到 `package.json` 并执行 `npm install` 和 `npm start`。
7. **获取 URL**：部署完成后，Railway 会生成一个可公网访问的 URL，例如 `https://your-app.up.railway.app`。
8. **配置小程序**：将该 URL 填入小程序设置页的 **API 地址** 中（注意不要丢掉末尾的 `/api` 部分）。

## 注意事项

- 数据存储在 `data.json` 文件中，Railway 的磁盘是**临时**的，重启后数据会丢失。如需持久化，建议后续迁移到 MongoDB 等数据库。
- 端口由 Railway 通过 `PORT` 环境变量自动分配，代码已兼容 (`process.env.PORT || 3000`)。
- 可在 Railway Dashboard 的 "Variables" 选项卡中配置环境变量。
