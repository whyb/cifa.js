#include <emscripten/bind.h>
#include "Cifa.h"
#include <sstream>

using namespace emscripten;
using namespace cifa;

// 错误信息结构体（用于导出到 JS）
struct JsErrorMessage {
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
};

// 将 Cifa 错误信息转换为 JsErrorMessage
template <typename T>
std::vector<JsErrorMessage> convertErrors(const T& src) {
    std::vector<JsErrorMessage> dst;
    for (const auto& e : src) {
        dst.push_back({e.line, e.col, e.message});
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
    
    Cifa cifa;
    
    // 设置死循环保护
    cifa.max_loop_iterations = 1000000;
    cifa.max_call_depth = 500;
    
    // 禁用 stderr 输出，通过 API 获取错误
    cifa.set_output_error(false);
    
    // 执行脚本
    Object obj = cifa.run_script(code);
    
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
            result.runtimeError = "Runtime error occurred";
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
    
    // 运行脚本以触发语法检查
    cifa.run_script(code);
    
    return convertErrors(cifa.get_errors());
}

// 获取内置函数列表（用于自动补全提示）
std::vector<std::string> getBuiltinFunctions() {
    return {
        "abs", "sqrt", "pow", "sin", "cos", "tan", "asin", "acos", "atan",
        "exp", "log", "log10", "ceil", "floor", "round", "max", "min",
        "println", "to_string", "size", "strlen", "strcmp", "strcat"
    };
}

EMSCRIPTEN_BINDINGS(cifa_module) {
    // 注册错误信息结构体
    value_object<JsErrorMessage>("JsErrorMessage")
        .field("line", &JsErrorMessage::line)
        .field("col", &JsErrorMessage::col)
        .field("message", &JsErrorMessage::message);
    
    // 注册执行结果结构体
    value_object<ExecuteResult>("ExecuteResult")
        .field("success", &ExecuteResult::success)
        .field("value", &ExecuteResult::value)
        .field("errors", &ExecuteResult::errors)
        .field("runtimeError", &ExecuteResult::runtimeError);
    
    // 注册向量类型
    register_vector<JsErrorMessage>("VectorJsErrorMessage");
    register_vector<std::string>("VectorString");
    
    // 导出函数
    function("execute", &execute);
    function("lint", &lint);
    function("getBuiltinFunctions", &getBuiltinFunctions);
}
