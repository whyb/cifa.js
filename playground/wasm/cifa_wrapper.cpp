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
};

// 执行结果结构体
struct ExecuteResult {
    bool success;
    std::string value;
    std::vector<JsErrorMessage> errors;
    std::string runtimeError;
    std::string output;
};

// 将 Cifa 错误信息转换为 JsErrorMessage
template <typename T>
std::vector<JsErrorMessage> convertErrors(const T& src) {
    std::vector<JsErrorMessage> dst;
    for (const auto& e : src) {
        dst.push_back({e.filename, e.line, e.col, e.message});
    }
    return dst;
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

    // 执行脚本（新版 run_script 已支持 #include 处理）
    Object obj = cifa.run_script(code);

    // 获取捕获的输出
    result.output = capture.finish();
    // 同时保留浏览器控制台输出（console.log）
    logToConsole(result.output);

    // 检查语法错误
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

// 仅语法检查（用于实时 linting）
std::vector<JsErrorMessage> lint(const std::string& code) {
    Cifa cifa;
    cifa.set_output_error(false);

    // 设置较短的循环限制，因为 lint 不需要真正执行
    cifa.max_loop_iterations = 100;
    cifa.max_call_depth = 10;

    // 运行脚本以触发语法检查（新版 run_script 已支持 #include 处理）
    cifa.run_script(code);

    return convertErrors(cifa.get_errors());
}

// 获取内置函数列表（用于自动补全提示）
std::vector<std::string> getBuiltinFunctions() {
    return {
        "abs", "sqrt", "pow", "sin", "cos", "tan", "asin", "acos", "atan",
        "exp", "log", "log10", "ceil", "floor", "round", "max", "min",
        "println", "to_string", "size", "strlen", "strcmp", "strcat",
        // 新增的数学函数
        "cbrt", "trunc", "nearbyint", "rint", "atan2", "log2",
        "hypot", "fmod", "remainder", "erf", "erfc", "tgamma", "lgamma",
        "copysign", "fdim", "fmax", "fmin"
    };
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

    // 重定向 C 层 stdout
    StdoutCapture capture;

    Cifa cifa;
    cifa.max_loop_iterations = 1000000;
    cifa.max_call_depth = 500;
    cifa.set_output_error(false);

    // 设置 #include 搜索目录为 /workspace
    cifa.set_include_dirs({"/workspace"});

    // 使用 run_script 执行，新版 API 会自动处理 #include
    // 同时设置当前文件的目录作为搜索路径
    std::string currentDir = "/workspace";
    size_t lastSlash = filename.find_last_of('/');
    if (lastSlash != std::string::npos) {
        currentDir = "/workspace/" + filename.substr(0, lastSlash);
    }

    // 构建完整文件路径用于设置文件名上下文
    std::string fullPath = std::string("/workspace/") + filename;

    // 读取文件内容（如果存在于 VFS 中）
    std::ifstream ifs(fullPath);
    Object obj;
    if (ifs.is_open()) {
        std::string fileContent((std::istreambuf_iterator<char>(ifs)), std::istreambuf_iterator<char>());
        // 合并 code 和文件内容（code 优先，因为可能是从编辑器直接传入的最新内容）
        obj = cifa.run_script(code);
    } else {
        // 文件不在 VFS 中，直接使用传入的 code
        obj = cifa.run_script(code);
    }

    ExecuteResult result;
    result.output = capture.finish();
    // 同时保留浏览器控制台输出（console.log）
    logToConsole(result.output);

    if (cifa.has_error()) {
        result.success = false;
        result.errors = convertErrors(cifa.get_errors());
        return result;
    }

    if (obj.getSpecialType() == "Error") {
        result.success = false;
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

    result.success = true;
    result.value = objectToString(obj);
    return result;
}

// 将虚拟文件写入 Emscripten VFS，然后进行语法检查（支持 #include）
std::vector<JsErrorMessage> lintWithFiles(const std::string& code, const std::string& filename,
    const std::vector<std::string>& paths, const std::vector<std::string>& contents) {
    writeToVFS(paths, contents);

    Cifa cifa;
    cifa.set_output_error(false);
    cifa.max_loop_iterations = 100;
    cifa.max_call_depth = 10;

    // 设置 #include 搜索目录为 /workspace
    cifa.set_include_dirs({"/workspace"});

    // 使用 run_script 进行语法检查，新版 API 会自动处理 #include
    cifa.run_script(code);

    return convertErrors(cifa.get_errors());
}

EMSCRIPTEN_BINDINGS(cifa_module) {
    // 注册错误信息结构体
    value_object<JsErrorMessage>("JsErrorMessage")
        .field("filename", &JsErrorMessage::filename)
        .field("line", &JsErrorMessage::line)
        .field("col", &JsErrorMessage::col)
        .field("message", &JsErrorMessage::message);

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
