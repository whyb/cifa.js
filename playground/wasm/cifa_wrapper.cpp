#include <emscripten/bind.h>
#include <emscripten.h>
#include "Cifa.h"
#include <cstdio>
#include <fstream>

#ifdef _WIN32
#include <io.h>
#include <fcntl.h>
#define dup _dup
#define dup2 _dup2
#define close _close
#define fileno _fileno
#else
#include <unistd.h>
#endif

using namespace emscripten;
using namespace cifa;

// 在 C 层重定向 stdout（std::print/printf 写入的是 stdout，不是 std::cout）
// 用于捕获 print/println 的输出到 result.output
class StdoutCapture {
public:
    StdoutCapture() {
        fflush(stdout);
        saved_fd_ = dup(fileno(stdout));
        tmp_ = tmpfile();
        if (!tmp_) {
            tmp_ = std::fopen("/tmp/cifa_stdout.tmp", "w+");
        }
        if (tmp_) {
            dup2(fileno(tmp_), fileno(stdout));
        }
    }

    ~StdoutCapture() {
        restore();
    }

    // 恢复原始 stdout 并返回捕获到的输出
    std::string finish() {
        std::string out = str();
        restore();
        return out;
    }

    // 获取当前捕获到的输出（不恢复 stdout）
    std::string str() {
        if (!tmp_) return "";
        fflush(stdout);
        fflush(tmp_);
        fseek(tmp_, 0, SEEK_END);
        long size = ftell(tmp_);
        fseek(tmp_, 0, SEEK_SET);
        std::string s;
        if (size > 0) {
            s.resize(static_cast<size_t>(size));
            size_t n = fread(s.data(), 1, static_cast<size_t>(size), tmp_);
            s.resize(n);
        }
        return s;
    }

private:
    void restore() {
        if (restored_) return;
        if (tmp_) {
            fflush(stdout);
            if (saved_fd_ >= 0) {
                dup2(saved_fd_, fileno(stdout));
            }
            fclose(tmp_);
            tmp_ = nullptr;
        }
        if (saved_fd_ >= 0) {
            close(saved_fd_);
            saved_fd_ = -1;
        }
        restored_ = true;
    }

    int saved_fd_ = -1;
    FILE* tmp_ = nullptr;
    bool restored_ = false;
};

// 将捕获的输出逐行输出到浏览器控制台，保留原本的 console.log 行为
static void logToConsole(const std::string& text) {
    if (text.empty()) return;
    size_t start = 0;
    while (true) {
        size_t pos = text.find('\n', start);
        std::string line = (pos == std::string::npos)
            ? text.substr(start)
            : text.substr(start, pos - start);
        EM_ASM({ console.log(UTF8ToString($0)); }, line.c_str());
        if (pos == std::string::npos) break;
        start = pos + 1;
    }
}

// 错误信息结构体（用于导出到 JS）
struct JsErrorMessage {
    std::string filename;
    size_t line;
    size_t col;
    std::string message;
    std::string source;    // 出错行源码文本（引擎提供时才有）
};

// 执行结果结构体
struct ExecuteResult {
    bool success;
    std::string value;
    std::vector<JsErrorMessage> errors;
    std::string runtimeError;
    std::string output;
};

// 将 Cifa 错误信息转换为 JsErrorMessage（并携带出错行源码文本）
template <typename T>
std::vector<JsErrorMessage> convertErrors(const T& src) {
    std::vector<JsErrorMessage> dst;
    for (const auto& e : src) {
        JsErrorMessage j = {e.filename, e.line, e.col, e.message, ""};
        if (e.has_source_text) {
            j.source = e.source_text;
        }
        dst.push_back(std::move(j));
    }
    return dst;
}

static std::string objectToString(const Object& obj);    // 前向声明（定义在下方）

// 编译失败时组装错误结果（execute / executeWithFiles 共用）
static ExecuteResult makeCompileErrorResult(Cifa& cifa, StdoutCapture& capture) {
    ExecuteResult result;
    result.success = false;
    result.output = capture.finish();
    logToConsole(result.output);
    result.errors = convertErrors(cifa.get_errors());
    return result;
}

// 执行已编译的 Ast 并组装完整结果（execute / executeWithFiles 共用）
static ExecuteResult finishRun(Cifa& cifa, Ast& program, StdoutCapture& capture) {
    ExecuteResult result;
    result.success = false;

    // 通过新 API run(Ast) 执行；entry_label 为空表示从第一个顶层节点开始
    Object obj = cifa.run(program);

    result.output = capture.finish();
    // 同时保留浏览器控制台输出（console.log）
    logToConsole(result.output);

    // 检查语法/静态错误
    if (cifa.has_error()) {
        result.errors = convertErrors(cifa.get_errors());
        return result;
    }

    // 检查运行时错误
    if (obj.getSpecialType() == "Error") {
        auto runtimeErrors = convertErrors(cifa.get_errors());
        if (!runtimeErrors.empty()) {
            result.errors = runtimeErrors;
            result.runtimeError = runtimeErrors.front().message;
        } else {
            std::string runtimeErr = cifa.get_runtime_error();
            result.runtimeError = runtimeErr.empty() ? "Runtime error occurred" : runtimeErr;
        }
        return result;
    }

    // 成功执行
    result.success = true;
    result.value = objectToString(obj);
    return result;
}

// 将 Object 转换为字符串（处理所有类型）
std::string objectToString(const Object& obj) {
    if (!obj.hasValue()) {
        return "(no return value)";
    }
    if (obj.isType<std::string>()) {
        return obj.to<std::string>();
    }
    if (obj.isNumber()) {
        double val = obj.toDouble();
        // 检查是否为整数
        if (val == std::floor(val) && !std::isinf(val) && !std::isnan(val)) {
            return std::to_string((long long)val);
        }
        return std::to_string(val);
    }
    // 其他类型，尝试获取类型名
    return "<" + std::string(obj.getType().name()) + ">";
}

// 执行脚本（完整执行，用于运行）
ExecuteResult execute(const std::string& code) {
    ExecuteResult result;
    result.success = false;

    // 重定向 C 层 stdout 以捕获 print/println 输出
    StdoutCapture capture;

    Cifa cifa;

    // 设置死循环保护
    cifa.max_loop_iterations = 1000000;
    cifa.max_call_depth = 500;

    // 禁用 stderr 输出，通过 API 获取错误
    cifa.set_output_error(false);

    // 使用新的编译/执行分离 API：先编译成 Ast（不执行），编译失败时直接返回语法/静态错误
    auto program = cifa.compile_script(code);
    if (!program) {
        return makeCompileErrorResult(cifa, capture);
    }

    // 编译成功后再执行
    return finishRun(cifa, program, capture);
}

// 仅语法检查（用于实时 linting）
// 新引擎提供 compile_script：只编译不执行，实时检查更快，且不会触发运行时副作用（如死循环）
std::vector<JsErrorMessage> lint(const std::string& code) {
    Cifa cifa;
    cifa.set_output_error(false);

    cifa.compile_script(code);

    return convertErrors(cifa.get_errors());
}

// 获取内置函数列表（用于自动补全提示）
std::vector<std::string> getBuiltinFunctions() {
    return {
        // 输出 / 字符串 / 类型转换
        "print", "println", "sprintf", "format", "to_string", "to_number", "type", "size",
        "strlen", "strcmp", "strcat", "random", "exit",
        // 数学函数
        "abs", "sqrt", "cbrt", "round", "trunc", "nearbyint", "rint", "ceil", "floor",
        "sin", "cos", "tan", "asin", "acos", "atan", "atan2",
        "sinh", "cosh", "tanh", "exp", "log", "log2", "log10", "pow", "hypot", "fmod",
        "remainder", "erf", "erfc", "tgamma", "lgamma", "copysign", "fdim", "fmax", "fmin",
        "max", "min",
        // 动态执行
        "run_string", "run_file"
    };
}

// 辅助函数：将单个文件写入 Emscripten VFS（用于以编辑器最新内容覆盖入口文件）
static void writeFileToVFS(const std::string& relPath, const std::string& content) {
    const std::string fullPath = "/workspace/" + relPath;
    const size_t lastSlash = fullPath.find_last_of('/');
    if (lastSlash != std::string::npos) {
        const std::string parentDir = fullPath.substr(0, lastSlash);
        const std::string js = "FS.mkdirTree('" + parentDir + "')";
        emscripten_run_script(js.c_str());
    }
    std::ofstream ofs(fullPath);
    if (ofs.is_open()) {
        ofs << content;
        ofs.close();
    }
}

// 辅助函数：清理 VFS 中的 /workspace 目录
static void cleanVFS() {
    // 递归删除 /workspace 目录下的所有文件和子目录
    emscripten_run_script(R"(
        try {
            function cleanDir(path) {
                var entries = FS.readdir(path);
                for (var i = 0; i < entries.length; i++) {
                    var name = entries[i];
                    if (name === '.' || name === '..') continue;
                    var fullPath = path + '/' + name;
                    var stat = FS.stat(fullPath);
                    if (FS.isDir(stat.mode)) {
                        cleanDir(fullPath);
                        FS.rmdir(fullPath);
                    } else {
                        FS.unlink(fullPath);
                    }
                }
            }
            if (FS.analyzePath('/workspace').exists) {
                cleanDir('/workspace');
            }
        } catch(e) { console.warn('VFS cleanup error:', e); }
    )");
}

// 辅助函数：将文件列表写入 Emscripten VFS
static void writeToVFS(const std::vector<std::string>& paths, const std::vector<std::string>& contents) {
    // 先清理旧文件，确保 VFS 与文件树同步
    cleanVFS();

    // 重新创建 /workspace 目录
    emscripten_run_script("FS.mkdirTree('/workspace')");

    for (size_t i = 0; i < paths.size(); ++i) {
        std::string fullPath = std::string("/workspace/") + paths[i];
        // 确保父目录存在
        size_t lastSlash = fullPath.find_last_of('/');
        if (lastSlash != std::string::npos) {
            std::string parentDir = fullPath.substr(0, lastSlash);
            std::string js = std::string("FS.mkdirTree('") + parentDir + "')";
            emscripten_run_script(js.c_str());
        }
        std::ofstream ofs(fullPath);
        if (ofs.is_open()) {
            ofs << contents[i];
            ofs.close();
        }
    }
}

// 将虚拟文件写入 Emscripten VFS，然后执行（支持 #include）
ExecuteResult executeWithFiles(const std::string& code, const std::string& filename,
    const std::vector<std::string>& paths, const std::vector<std::string>& contents) {
    writeToVFS(paths, contents);

    // 用编辑器中当前内容覆盖入口文件（filename 为相对 /workspace 的路径）
    writeFileToVFS(filename, code);

    // 重定向 C 层 stdout
    StdoutCapture capture;

    Cifa cifa;
    cifa.max_loop_iterations = 1000000;
    cifa.max_call_depth = 500;
    cifa.set_output_error(false);

    // 设置 #include 搜索目录为 /workspace
    cifa.set_include_dirs({"/workspace"});

    // 通过 compile_file / run 执行。run_file 会把入口文件所在目录加入 #include 搜索路径，
    // 因此子目录文件之间的相对 include 也能正确解析
    auto program = cifa.compile_file("/workspace/" + filename);
    if (!program) {
        return makeCompileErrorResult(cifa, capture);
    }
    return finishRun(cifa, program, capture);
}

// 将虚拟文件写入 Emscripten VFS，然后进行语法检查（支持 #include）
std::vector<JsErrorMessage> lintWithFiles(const std::string& code, const std::string& filename,
    const std::vector<std::string>& paths, const std::vector<std::string>& contents) {
    writeToVFS(paths, contents);
    writeFileToVFS(filename, code);

    Cifa cifa;
    cifa.set_output_error(false);

    // 设置 #include 搜索目录为 /workspace
    cifa.set_include_dirs({"/workspace"});

    // 只编译不执行，纯静态检查（compile_file 会把入口文件所在目录加入 #include 搜索路径）
    cifa.compile_file("/workspace/" + filename);

    return convertErrors(cifa.get_errors());
}

EMSCRIPTEN_BINDINGS(cifa_module) {
    // 注册错误信息结构体
    value_object<JsErrorMessage>("JsErrorMessage")
        .field("filename", &JsErrorMessage::filename)
        .field("line", &JsErrorMessage::line)
        .field("col", &JsErrorMessage::col)
        .field("message", &JsErrorMessage::message)
        .field("source", &JsErrorMessage::source);

    // 注册执行结果结构体
    value_object<ExecuteResult>("ExecuteResult")
        .field("success", &ExecuteResult::success)
        .field("value", &ExecuteResult::value)
        .field("errors", &ExecuteResult::errors)
        .field("runtimeError", &ExecuteResult::runtimeError)
        .field("output", &ExecuteResult::output);

    // 注册向量类型
    register_vector<JsErrorMessage>("VectorJsErrorMessage");
    register_vector<std::string>("VectorString");

    // 导出函数
    function("execute", &execute);
    function("lint", &lint);
    function("getBuiltinFunctions", &getBuiltinFunctions);
    function("executeWithFiles", &executeWithFiles);
    function("lintWithFiles", &lintWithFiles);
}
