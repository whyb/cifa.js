/**
 * Cifa Web Worker
 * 在独立线程中运行 Wasm 模块，防止脚本执行阻塞主线程 UI
 */

import './cifa.js';

let cifaModule = null;
let isReady = false;

// 初始化 Wasm 模块
async function initModule() {
    if (isReady) return;
    
    try {
        // Module 是由 emcc 生成的全局变量
        cifaModule = await Module();
        isReady = true;
        self.postMessage({ type: 'ready' });
    } catch (err) {
        self.postMessage({ 
            type: 'error', 
            message: 'Failed to initialize Cifa module: ' + err.message 
        });
    }
}

// 处理消息
self.onmessage = async function(e) {
    const { type, code, requestId } = e.data;
    
    // 确保模块已初始化
    if (!isReady) {
        await initModule();
    }
    
    if (!isReady) {
        self.postMessage({ 
            type: 'error', 
            requestId,
            message: 'Module not ready' 
        });
        return;
    }
    
    try {
        switch (type) {
            case 'execute':
                handleExecute(code, requestId);
                break;
            case 'lint':
                handleLint(code, requestId);
                break;
            case 'getBuiltinFunctions':
                handleGetBuiltinFunctions(requestId);
                break;
            default:
                self.postMessage({ 
                    type: 'error', 
                    requestId,
                    message: 'Unknown message type: ' + type 
                });
        }
    } catch (err) {
        self.postMessage({ 
            type: 'error', 
            requestId,
            message: 'Worker error: ' + err.message 
        });
    }
};

// 执行脚本
function handleExecute(code, requestId) {
    const startTime = performance.now();
    
    try {
        const result = cifaModule.execute(code);
        const duration = performance.now() - startTime;
        
        self.postMessage({
            type: 'execute_result',
            requestId,
            result: {
                success: result.success,
                value: result.value,
                errors: result.errors.map(e => ({
                    line: e.line,
                    col: e.col,
                    message: e.message
                })),
                runtimeError: result.runtimeError,
                duration: Math.round(duration * 100) / 100
            }
        });
    } catch (err) {
        self.postMessage({
            type: 'execute_result',
            requestId,
            result: {
                success: false,
                runtimeError: 'Execution crashed: ' + err.message,
                errors: [],
                value: ''
            }
        });
    }
}

// 语法检查（用于实时 linting）
function handleLint(code, requestId) {
    try {
        const errors = cifaModule.lint(code);
        
        self.postMessage({
            type: 'lint_result',
            requestId,
            errors: errors.map(e => ({
                line: e.line,
                col: e.col,
                message: e.message
            }))
        });
    } catch (err) {
        // Linting 失败不抛出错误，返回空错误列表
        self.postMessage({
            type: 'lint_result',
            requestId,
            errors: []
        });
    }
}

// 获取内置函数列表
function handleGetBuiltinFunctions(requestId) {
    try {
        const functions = cifaModule.getBuiltinFunctions();
        self.postMessage({
            type: 'builtin_functions',
            requestId,
            functions: functions
        });
    } catch (err) {
        self.postMessage({
            type: 'builtin_functions',
            requestId,
            functions: []
        });
    }
}

// 立即开始初始化
initModule();