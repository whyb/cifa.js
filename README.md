# Cifa Script Playground

Cifa 脚本引擎的 Web 在线解释器，网站地址是： [https://whyb.github.io/cifa.js/playground/web](https://whyb.github.io/cifa.js/playground/web)

## 缘起与致敬

这个项目的诞生，源于一次对“极简”的极致追求。

在寻找一种能够灵活表达**视频特效处理 Pipeline** 的轻量级脚本时，我偶然间闯入了超级牛逼的复刻版金庸群侠传(kys-cpp)作者的后宫群中，发现作者大大早在很久以前就实现了一个类C语法的脚本解释器 [cifa](https://github.com/scarsty/cifa) 仓库。

初读Cifa的设计与实现，我唯有对原作者 **[@scarsty](https://github.com/scarsty)** 表达*五体投地*的由衷佩服，之后有段时间我也有微薄的给源Cifa贡献了do while的实现和一些单元测试不值一提，惊叹Cifa在如此精简的代码体量下，展现出了令人惊叹的逻辑美感与工程智慧。令人扼腕的是，这样一个极其优秀的项目，至今仍处于“大隐隐于市”的状态，未被世间所了解或采用，完全被低估和埋没了，所以我决定做点啥。

**本项目存在的目的：**

1.  **致敬**: 向原作者 [@scarsty](https://github.com/scarsty) 这种纯粹的匠心精神致敬，让更多人看到 Cifa 的光芒。
2.  **生产力**: Cifa Script Playground 提供一个即开即用的 IDE 环境，方便开发者编写 Cifa 脚本并实时观测运行结果。

-----

## 功能特性

  - **Monaco Editor**: 采用 VS Code 同款内核，完美支持 C 语言语法高亮。
  - **实时 Linting**: 编码过程中即时识别并标注语法错误（红波浪线）。
  - **Web Worker 隔离执行**: 脚本运行于后台独立线程，即便代码出现逻辑瑕疵也不会阻塞 UI 响应。
  - **VS 风格错误列表**: 底部集成专业错误汇总看板，双击错误项即可自动跳转定位至源码行。
  - **运行安全保护**: 内置循环计数与递归深度限制，有效预防死循环导致的系统挂起。

## 本地构建步骤

### 1. 激活 Emscripten 环境

```bash
# 确保你的环境已配置好 wasm 编译链
conda activate wasm
```

### 2. 编译 Wasm 模块

进入 WebAssembly 目录执行构建脚本：

```bash
cd playground/wasm
build.bat
```

### 3. 启动本地服务器

进入 Web 目录并启动静态服务：

```bash
cd playground/web
python -m http.server 8080
```

### 4. 访问

打开浏览器访问：`http://localhost:8080`

## 浏览器兼容性

本工具依赖现代 Web 技术栈，需确保浏览器支持 **WebAssembly** 与 **Web Worker**：

  * Chrome 80+
  * Firefox 75+
  * Edge 80+
  * Safari 14+
