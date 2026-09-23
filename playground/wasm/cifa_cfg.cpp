#include "CifaBytecode.h"

#include <algorithm>
#include <format>
#include <map>
#include <set>
#include <string>
#include <string_view>
#include <tuple>
#include <vector>

namespace cifa
{
namespace
{
void appendJsonString(std::string& output, std::string_view value)
{
    output.push_back('"');
    for (const unsigned char character : value)
    {
        switch (character)
        {
        case '"': output += "\\\""; break;
        case '\\': output += "\\\\"; break;
        case '\b': output += "\\b"; break;
        case '\f': output += "\\f"; break;
        case '\n': output += "\\n"; break;
        case '\r': output += "\\r"; break;
        case '\t': output += "\\t"; break;
        default:
            if (character < 0x20) output += std::format("\\u{:04x}", static_cast<unsigned>(character));
            else output.push_back(static_cast<char>(character));
            break;
        }
    }
    output.push_back('"');
}

std::string jsonString(std::string_view value)
{
    std::string result;
    result.reserve(value.size() + 2);
    appendJsonString(result, value);
    return result;
}
}

std::string CifaBytecode::get_profile_json() const
{
    std::string output;
    output.reserve(32768);
    output += "{\"version\":1,\"enabled\":";
    output += profile_state.enabled ? "true" : "false";
    output += ",\"truncated\":";
    output += profile_state.truncated ? "true" : "false";
    output += ",\"instructionLimit\":";
    output += std::to_string(profile_state.instruction_limit);
    output += ",\"instructionCount\":";
    output += std::to_string(profile_state.instruction_count);
    output += ",\"totalNs\":";
    output += std::to_string(profile_state.total_ns);

    auto sortedKeys = [](const auto& values)
    {
        std::vector<std::string> keys;
        keys.reserve(values.size());
        for (const auto& [key, value] : values) keys.push_back(key);
        std::sort(keys.begin(), keys.end());
        return keys;
    };

    output += ",\"instructions\":[";
    {
        const auto keys = sortedKeys(profile_state.instructions);
        for (size_t index = 0; index < keys.size(); ++index)
        {
            if (index != 0) output += ",";
            const auto& key = keys[index];
            const auto& metric = profile_state.instructions.at(key);
            const size_t separator = key.rfind('#');
            const std::string function = separator == std::string::npos ? key : key.substr(0, separator);
            const std::string pc = separator == std::string::npos ? "0" : key.substr(separator + 1);
            output += "{\"key\":";
            output += jsonString(key);
            output += ",\"function\":";
            output += jsonString(function);
            output += ",\"pc\":";
            output += pc;
            output += ",\"count\":";
            output += std::to_string(metric.count);
            output += ",\"timeNs\":";
            output += std::to_string(metric.time_ns);
            output += "}";
        }
    }
    output += "],\"functions\":[";
    {
        const auto keys = sortedKeys(profile_state.functions);
        for (size_t index = 0; index < keys.size(); ++index)
        {
            if (index != 0) output += ",";
            const auto& key = keys[index];
            const auto& metric = profile_state.functions.at(key);
            output += "{\"id\":";
            output += jsonString(key);
            output += ",\"calls\":";
            output += std::to_string(metric.calls);
            output += ",\"instructions\":";
            output += std::to_string(metric.instructions);
            output += ",\"selfNs\":";
            output += std::to_string(metric.self_ns);
            output += ",\"totalNs\":";
            output += std::to_string(metric.total_ns);
            output += "}";
        }
    }
    output += "],\"edges\":[";
    {
        const auto keys = sortedKeys(profile_state.edges);
        for (size_t index = 0; index < keys.size(); ++index)
        {
            if (index != 0) output += ",";
            const auto& key = keys[index];
            const auto& metric = profile_state.edges.at(key);
            const size_t separator = key.rfind('#');
            const size_t arrow = key.find('>', separator == std::string::npos ? 0 : separator + 1);
            const std::string function = separator == std::string::npos ? key : key.substr(0, separator);
            const std::string fromPc = separator == std::string::npos || arrow == std::string::npos
                ? "0" : key.substr(separator + 1, arrow - separator - 1);
            const std::string toPc = arrow == std::string::npos ? "0" : key.substr(arrow + 1);
            output += "{\"key\":";
            output += jsonString(key);
            output += ",\"function\":";
            output += jsonString(function);
            output += ",\"fromPc\":";
            output += fromPc;
            output += ",\"toPc\":";
            output += toPc;
            output += ",\"count\":";
            output += std::to_string(metric.count);
            output += ",\"timeNs\":";
            output += std::to_string(metric.time_ns);
            output += "}";
        }
    }
    output += "],\"flames\":[";
    {
        const auto keys = sortedKeys(profile_state.flames);
        for (size_t index = 0; index < keys.size(); ++index)
        {
            if (index != 0) output += ",";
            const auto& key = keys[index];
            const auto& metric = profile_state.flames.at(key);
            output += "{\"path\":[";
            size_t start = 0;
            size_t pathIndex = 0;
            while (start <= key.size())
            {
                const size_t separator = key.find('\x1f', start);
                if (pathIndex != 0) output += ",";
                output += jsonString(key.substr(start, separator == std::string::npos ? std::string::npos : separator - start));
                ++pathIndex;
                if (separator == std::string::npos) break;
                start = separator + 1;
            }
            output += "],\"selfNs\":";
            output += std::to_string(metric.self_ns);
            output += ",\"totalNs\":";
            output += std::to_string(metric.total_ns);
            output += "}";
        }
    }
    output += "]}";
    return output;
}

std::string CifaBytecode::get_cfg_json() const
{
    std::string output;
    output.reserve(65536);

    auto appendSource = [&](std::string& target, const SourceLocation* location)
    {
        target += "{\"file\":";
        target += jsonString(location == nullptr ? std::string_view{} : std::string_view(location->filename));
        target += ",\"line\":";
        target += std::to_string(location == nullptr ? 0 : location->line);
        target += ",\"col\":";
        target += std::to_string(location == nullptr ? 0 : location->col);
        target += ",\"text\":";
        target += jsonString(location == nullptr ? std::string_view{} : std::string_view(location->text));
        target += ",\"node\":";
        target += jsonString(location == nullptr ? std::string_view{} : std::string_view(location->str));
        target += "}";
    };

    auto sourceAt = [&](const SourceRef& reference) -> const SourceLocation*
    {
        if (reference.id == 0 || reference.id > sources.size()) return nullptr;
        return &sources[reference.id - 1];
    };

    auto nameAt = [&](size_t index) -> const std::string&
    {
        static const std::string unknown = "<unknown>";
        return index < names.size() ? names[index] : unknown;
    };

    auto opcodeName = [](Opcode opcode) -> std::string_view
    {
        switch (opcode)
        {
        case Opcode::Constant: return "Constant";
        case Opcode::ConstantLocal: return "ConstantLocal";
        case Opcode::Load: return "Load";
        case Opcode::LoadLocal: return "LoadLocal";
        case Opcode::DeclareLocal: return "DeclareLocal";
        case Opcode::StoreLocal: return "StoreLocal";
        case Opcode::IncrementLocal: return "IncrementLocal";
        case Opcode::Add: return "Add";
        case Opcode::Subtract: return "Subtract";
        case Opcode::Multiply: return "Multiply";
        case Opcode::Divide: return "Divide";
        case Opcode::Modulo: return "Modulo";
        case Opcode::Less: return "Less";
        case Opcode::Greater: return "Greater";
        case Opcode::LessEqual: return "LessEqual";
        case Opcode::GreaterEqual: return "GreaterEqual";
        case Opcode::Equal: return "Equal";
        case Opcode::NotEqual: return "NotEqual";
        case Opcode::BitAnd: return "BitAnd";
        case Opcode::BitOr: return "BitOr";
        case Opcode::BitXor: return "BitXor";
        case Opcode::ShiftLeft: return "ShiftLeft";
        case Opcode::ShiftRight: return "ShiftRight";
        case Opcode::Positive: return "Positive";
        case Opcode::Negative: return "Negative";
        case Opcode::LogicalNot: return "LogicalNot";
        case Opcode::BitNot: return "BitNot";
        case Opcode::Cast: return "Cast";
        case Opcode::Size: return "Size";
        case Opcode::MathUnary: return "MathUnary";
        case Opcode::MathBinary: return "MathBinary";
        case Opcode::Empty: return "Empty";
        case Opcode::Jump: return "Jump";
        case Opcode::Branch: return "Branch";
        case Opcode::AndBranch: return "AndBranch";
        case Opcode::OrBranch: return "OrBranch";
        case Opcode::LogicalAnd: return "LogicalAnd";
        case Opcode::LogicalOr: return "LogicalOr";
        case Opcode::Return: return "Return";
        case Opcode::ReleaseLocal: return "ReleaseLocal";
        case Opcode::PrepareStore: return "PrepareStore";
        case Opcode::Store: return "Store";
        case Opcode::Increment: return "Increment";
        case Opcode::Switch: return "Switch";
        case Opcode::CallBegin: return "CallBegin";
        case Opcode::Call: return "Call";
        case Opcode::Peek: return "Peek";
        case Opcode::Array: return "Array";
        case Opcode::Index: return "Index";
        case Opcode::IndexLocal: return "IndexLocal";
        case Opcode::Range: return "Range";
        case Opcode::MethodCheck: return "MethodCheck";
        case Opcode::MethodCall: return "MethodCall";
        case Opcode::MethodPush: return "MethodPush";
        case Opcode::ArrayPushGlobal: return "ArrayPushGlobal";
        case Opcode::ArrayPushGlobalLocal: return "ArrayPushGlobalLocal";
        case Opcode::Member: return "Member";
        case Opcode::NumericBinary: return "NumericBinary";
        case Opcode::NumericBinaryLocal: return "NumericBinaryLocal";
        case Opcode::NumericCompareBranch: return "NumericCompareBranch";
        case Opcode::NumericForNext: return "NumericForNext";
        case Opcode::IntIncrementLocal: return "IntIncrementLocal";
        case Opcode::IntForNext: return "IntForNext";
        case Opcode::RegisterBinary: return "RegisterBinary";
        case Opcode::Exit: return "Exit";
        case Opcode::Removed: return "Removed";
        }
        return "Unknown";
    };

    auto mathKindName = [](MathKind kind) -> std::string_view
    {
        switch (kind)
        {
        case MathKind::None: return "";
        case MathKind::Abs: return "abs";
        case MathKind::Sqrt: return "sqrt";
        case MathKind::Cbrt: return "cbrt";
        case MathKind::Round: return "round";
        case MathKind::Trunc: return "trunc";
        case MathKind::NearbyInt: return "nearbyint";
        case MathKind::Rint: return "rint";
        case MathKind::Ceil: return "ceil";
        case MathKind::Floor: return "floor";
        case MathKind::Sin: return "sin";
        case MathKind::Cos: return "cos";
        case MathKind::Tan: return "tan";
        case MathKind::Asin: return "asin";
        case MathKind::Acos: return "acos";
        case MathKind::Atan: return "atan";
        case MathKind::Sinh: return "sinh";
        case MathKind::Cosh: return "cosh";
        case MathKind::Tanh: return "tanh";
        case MathKind::Exp: return "exp";
        case MathKind::Log: return "log";
        case MathKind::Log2: return "log2";
        case MathKind::Log10: return "log10";
        case MathKind::Erf: return "erf";
        case MathKind::Erfc: return "erfc";
        case MathKind::TGamma: return "tgamma";
        case MathKind::LGamma: return "lgamma";
        case MathKind::Atan2: return "atan2";
        case MathKind::Pow: return "pow";
        case MathKind::Hypot: return "hypot";
        case MathKind::Fmod: return "fmod";
        case MathKind::Remainder: return "remainder";
        case MathKind::CopySign: return "copysign";
        case MathKind::FDim: return "fdim";
        case MathKind::FMax: return "fmax";
        case MathKind::FMin: return "fmin";
        }
        return "";
    };

    auto constantSummary = [&](size_t index) -> std::string
    {
        if (index >= constants.size()) return "<invalid constant>";
        const auto& constant = constants[index];
        const auto& value = constant.value;
        std::string summary;
        if (value.empty()) summary = "empty";
        else if (const auto* integer = value.get_if<std::int64_t>()) summary = std::format("int {}", *integer);
        else if (const auto* floating = value.get_if<double>()) summary = std::format("float {}", *floating);
        else if (const auto* boolean = value.get_if<bool>()) summary = *boolean ? "bool true" : "bool false";
        else if (const auto* text = value.resource<std::pmr::string>()) summary = "string " + jsonString(*text);
        else summary = "resource";
        return summary;
    };

    auto writeOperationName = [](WriteOperation operation) -> std::string_view
    {
        switch (operation)
        {
        case WriteOperation::Assign: return "=";
        case WriteOperation::Add: return "+=";
        case WriteOperation::Subtract: return "-=";
        case WriteOperation::Multiply: return "*=";
        case WriteOperation::Divide: return "/=";
        case WriteOperation::Modulo: return "%=";
        case WriteOperation::BitAnd: return "&=";
        case WriteOperation::BitOr: return "|=";
        case WriteOperation::BitXor: return "^=";
        case WriteOperation::ShiftLeft: return "<<=";
        case WriteOperation::ShiftRight: return ">>=";
        case WriteOperation::PostAdd: return "post++";
        case WriteOperation::PostSubtract: return "post--";
        case WriteOperation::Invalid: return "invalid";
        }
        return "invalid";
    };

    auto callAt = [&](size_t index) -> const CallSite*
    {
        return index < calls.size() ? &calls[index] : nullptr;
    };

    auto instructionText = [&](const Instruction& instruction, const Instructions& instructions) -> std::string
    {
        const auto opcode = opcodeName(instruction.opcode);
        switch (instruction.opcode)
        {
        case Opcode::Constant: return std::format("{} #{} = {}", opcode, instruction.operand, constantSummary(instruction.operand));
        case Opcode::ConstantLocal:
            return std::format("{} slot {} #{} = {}", opcode, instruction.auxiliary - 1, instruction.operand, constantSummary(instruction.operand));
        case Opcode::Load: return std::format("{} {}", opcode, nameAt(instruction.operand));
        case Opcode::LoadLocal:
        case Opcode::DeclareLocal:
        case Opcode::StoreLocal:
        case Opcode::IncrementLocal:
        case Opcode::ReleaseLocal: return std::format("{} slot {}", opcode, instruction.operand);
        case Opcode::IntIncrementLocal:
            return std::format("{} slot {} [{}]", opcode, instruction.operand, writeOperationName(instruction.write));
        case Opcode::IntForNext:
        {
            if (instruction.member_site != 0 && instruction.member_site - 1 < instructions.integer_loops.size())
            {
                const auto& loop = instructions.integer_loops[instruction.member_site - 1];
                return std::format("{} slot {} -> body {} / exit {} [{}]", opcode, instruction.operand,
                    loop.body, loop.exit, writeOperationName(instruction.write));
            }
            return std::format("{} slot {} -> {} [{}]", opcode, instruction.operand,
                instruction.auxiliary, writeOperationName(instruction.write));
        }
        case Opcode::Cast: return std::format("{} {}", opcode, nameAt(instruction.operand));
        case Opcode::Size: return std::format("{} operand={} auxiliary={}", opcode, instruction.operand, instruction.auxiliary);
        case Opcode::MathUnary:
        case Opcode::MathBinary:
        {
            const auto* call = callAt(instruction.operand);
            return std::format("{} {}{}", opcode, call == nullptr ? std::string_view("<invalid>") : mathKindName(call->math_kind),
                call == nullptr ? std::string{} : std::format(" ({})", nameAt(call->name_id)));
        }
        case Opcode::Jump: return std::format("{} -> {}", opcode, instruction.operand);
        case Opcode::Branch:
        case Opcode::AndBranch:
        case Opcode::OrBranch:
        case Opcode::NumericCompareBranch: return std::format("{} -> {} (condition false/short-circuit)", opcode, instruction.operand);
        case Opcode::NumericForNext:
            return std::format("{} slot {} -> {} [{}]", opcode, instruction.operand, instruction.auxiliary, writeOperationName(instruction.write));
        case Opcode::Peek: return std::format("{} {}", opcode, nameAt(instruction.operand));
        case Opcode::Array: return std::format("{} {} element(s)", opcode, instruction.operand);
        case Opcode::Index:
        case Opcode::IndexLocal: return std::format("{} dimensions={} site={}", opcode, instruction.operand, instruction.auxiliary);
        case Opcode::Range:
        {
            const std::string_view phase = instruction.auxiliary == 0 ? "begin"
                : instruction.auxiliary == 1 ? "next" : "end";
            if (instruction.variable_site != 0 && instruction.variable_site <= variable_sites.size())
            {
                const auto& variable = variable_sites[instruction.variable_site - 1];
                return std::format("{} range={} phase={} var={}", opcode, instruction.operand, phase,
                    nameAt(variable.name_id));
            }
            return std::format("{} range={} phase={}", opcode, instruction.operand, phase);
        }
        case Opcode::Switch:
        {
            const std::string_view phase = instruction.auxiliary == 0 ? "begin"
                : instruction.auxiliary == 1 ? "active"
                : instruction.auxiliary == 2 ? "default"
                : instruction.auxiliary == 3 ? "case" : "end";
            return std::format("{} frame={} phase={}", opcode, instruction.operand, phase);
        }
        case Opcode::CallBegin:
        case Opcode::Call:
        case Opcode::MethodCheck:
        case Opcode::MethodCall:
        case Opcode::MethodPush:
        case Opcode::ArrayPushGlobal:
        case Opcode::ArrayPushGlobalLocal:
        {
            const auto* call = callAt(instruction.operand);
            if (call == nullptr) return std::format("{} <invalid>", opcode);
            const size_t arity = instruction.opcode == Opcode::MethodCall
                ? instruction.auxiliary : call->arguments.size();
            return std::format("{} {} (arity {})", opcode, nameAt(call->name_id), arity);
        }
        case Opcode::Member:
            if (instruction.member_site != 0 && instruction.member_site <= member_sites.size())
            {
                const auto& member = member_sites[instruction.member_site - 1];
                return std::format("{} {}.{}", opcode, nameAt(member.first), nameAt(member.second));
            }
            return std::string(opcode);
        case Opcode::PrepareStore:
        case Opcode::Store:
        case Opcode::Increment:
            if (instruction.variable_site != 0 && instruction.variable_site <= variable_sites.size())
            {
                const auto& variable = variable_sites[instruction.variable_site - 1];
                return std::format("{} {} [{}]", opcode, nameAt(variable.name_id), writeOperationName(instruction.write));
            }
            return std::format("{} [{}]", opcode, writeOperationName(instruction.write));
        case Opcode::NumericBinary:
        case Opcode::NumericBinaryLocal:
            if (instruction.auxiliary < instructions.numeric_operations.size())
            {
                const auto& operation = instructions.numeric_operations[instruction.auxiliary];
                return std::format("{} op={} flags={} site={}", opcode, operation.opcode, operation.flags, instruction.auxiliary);
            }
            return std::format("{} site={}", opcode, instruction.auxiliary);
        case Opcode::RegisterBinary:
            if (instruction.operand < module_data->register_binary_sites.size())
            {
                const auto& site = module_data->register_binary_sites[instruction.operand];
                return std::format("{} {} site={}", opcode, opcodeName(static_cast<Opcode>(site.code.opcode)), instruction.operand);
            }
            return std::format("{} site={}", opcode, instruction.operand);
        case Opcode::Removed: return "Removed";
        default: return std::string(opcode);
        }
    };

    std::map<std::string, std::map<size_t, std::string>> functionIds;
    functionIds["<main>"][0] = "root";
    for (const auto& [name, overloads] : function_code)
        for (const auto& [arity, function] : overloads)
            functionIds[name][arity] = "fn:" + name + "@" + std::to_string(arity);

    auto functionId = [&](const std::string& name, size_t arity) -> std::string
    {
        const auto nameIt = functionIds.find(name);
        if (nameIt == functionIds.end()) return {};
        const auto arityIt = nameIt->second.find(arity);
        return arityIt == nameIt->second.end() ? std::string{} : arityIt->second;
    };

    auto writeInstruction = [&](std::string& target, const Instruction& instruction, const Instructions& instructions, size_t pc)
    {
        target += "{\"pc\":";
        target += std::to_string(pc);
        target += ",\"op\":";
        target += jsonString(opcodeName(instruction.opcode));
        target += ",\"text\":";
        target += jsonString(instructionText(instruction, instructions));
        target += ",\"operand\":";
        target += std::to_string(instruction.operand);
        target += ",\"auxiliary\":";
        target += std::to_string(instruction.auxiliary);
        target += ",\"inputOffset\":";
        target += std::to_string(instruction.input_offset);
        target += ",\"inputCount\":";
        target += std::to_string(instruction.input_count);
        target += ",\"destination\":";
        target += std::to_string(instruction.destination);
        target += ",\"write\":";
        target += jsonString(writeOperationName(instruction.write));
        target += ",\"discardResult\":";
        target += instruction.discard_result ? "true" : "false";
        target += ",\"target\":";
        if (instruction.opcode == Opcode::Jump || instruction.opcode == Opcode::Branch
            || instruction.opcode == Opcode::AndBranch || instruction.opcode == Opcode::OrBranch
            || instruction.opcode == Opcode::NumericCompareBranch)
            target += std::to_string(instruction.operand);
        else if (instruction.opcode == Opcode::NumericForNext || instruction.opcode == Opcode::IntForNext)
        {
            if (instruction.member_site != 0 && instruction.member_site - 1 < instructions.integer_loops.size())
                target += std::to_string(instructions.integer_loops[instruction.member_site - 1].body);
            else
                target += std::to_string(instruction.auxiliary);
        }
        else target += "null";
        target += ",\"source\":";
        const SourceRef source = pc < instructions.diagnostics.size() ? instructions.diagnostics[pc].source : SourceRef{};
        appendSource(target, sourceAt(source));

        if (instruction.opcode == Opcode::Call || instruction.opcode == Opcode::CallBegin
            || instruction.opcode == Opcode::MethodCheck || instruction.opcode == Opcode::MethodCall
            || instruction.opcode == Opcode::MethodPush || instruction.opcode == Opcode::ArrayPushGlobal
            || instruction.opcode == Opcode::ArrayPushGlobalLocal)
        {
            if (const auto* call = callAt(instruction.operand))
            {
                const auto name = nameAt(call->name_id);
                const size_t arity = call->arguments.size();
                target += ",\"call\":{\"name\":";
                target += jsonString(name);
                target += ",\"arity\":";
                target += std::to_string(arity);
                target += ",\"targetFunction\":";
                target += jsonString(functionId(name, arity));
                target += "}";
            }
        }
        target += "}";
    };

    auto writeModule = [&](std::string& target, const Instructions& instructions,
        const std::vector<std::string>& labels)
    {
        struct Block
        {
            size_t start = 0;
            size_t end = 0;
            std::vector<std::string> labels;
        };
        struct Edge
        {
            size_t from = 0;
            size_t to = 0;
            size_t fromPc = 0;
            size_t toPc = 0;
            std::string kind;
            std::string label;
        };

        const size_t count = instructions.code.size();
        std::vector<bool> leader(count + 1, false);
        if (count != 0) leader[0] = true;
        for (size_t pc = 0; pc < count; ++pc)
        {
            const auto opcode = instructions.code[pc].opcode;
            if (opcode == Opcode::Jump || opcode == Opcode::Branch || opcode == Opcode::AndBranch
                || opcode == Opcode::OrBranch || opcode == Opcode::NumericCompareBranch)
            {
                if (instructions.code[pc].operand <= count) leader[instructions.code[pc].operand] = true;
                if (pc + 1 <= count) leader[pc + 1] = true;
            }
            else if (opcode == Opcode::NumericForNext || opcode == Opcode::IntForNext)
            {
                if (instructions.code[pc].member_site != 0
                    && instructions.code[pc].member_site - 1 < instructions.integer_loops.size())
                {
                    const auto& loop = instructions.integer_loops[instructions.code[pc].member_site - 1];
                    if (loop.body <= count) leader[loop.body] = true;
                    if (loop.exit <= count) leader[loop.exit] = true;
                }
                else if (instructions.code[pc].auxiliary <= count)
                {
                    leader[instructions.code[pc].auxiliary] = true;
                }
                if (pc + 1 <= count) leader[pc + 1] = true;
            }
            else if (opcode == Opcode::Return || opcode == Opcode::Exit)
            {
                if (pc + 1 <= count) leader[pc + 1] = true;
            }
        }

        std::vector<Block> blocks;
        for (size_t pc = 0; pc < count; ++pc)
        {
            if (!leader[pc]) continue;
            const size_t start = pc;
            size_t end = pc + 1;
            while (end < count && !leader[end]) ++end;
            blocks.push_back({start, end, {}});
        }
        if (blocks.empty() && count == 0) blocks.push_back({0, 0, {}});

        for (size_t blockIndex = 0; blockIndex < blocks.size(); ++blockIndex)
        {
            auto& blockLabels = blocks[blockIndex].labels;
            for (const auto& label : labels)
            {
                const size_t separator = label.find('@');
                if (separator == std::string::npos) continue;
                const size_t pc = static_cast<size_t>(std::stoull(label.substr(separator + 1)));
                if (pc >= blocks[blockIndex].start && pc < blocks[blockIndex].end)
                    blockLabels.push_back(label.substr(0, separator));
            }
        }

        const size_t exitBlock = blocks.size();
        std::vector<size_t> blockFor(count + 1, exitBlock);
        for (size_t blockIndex = 0; blockIndex < blocks.size(); ++blockIndex)
            for (size_t pc = blocks[blockIndex].start; pc < blocks[blockIndex].end; ++pc)
                blockFor[pc] = blockIndex;

        std::vector<Edge> edges;
        std::set<std::tuple<size_t, size_t, std::string>> seenEdges;
        auto addEdge = [&](size_t from, size_t to, const std::string& kind, const std::string& label, size_t fromPc, size_t toPc)
        {
            if (from == to && kind == "fallthrough") return;
            if (!seenEdges.emplace(from, to, kind).second) return;
            edges.push_back({from, to, fromPc, toPc, kind, label});
        };

        for (size_t blockIndex = 0; blockIndex < blocks.size(); ++blockIndex)
        {
            const auto& block = blocks[blockIndex];
            if (block.start == block.end) continue;
            const size_t lastPc = block.end - 1;
            const auto& instruction = instructions.code[lastPc];
            if (instruction.opcode == Opcode::Jump)
                addEdge(blockIndex, blockFor[instruction.operand], "jump", "jump", lastPc, instruction.operand);
            else if (instruction.opcode == Opcode::Branch)
            {
                addEdge(blockIndex, blockFor[instruction.operand], "false", "false", lastPc, instruction.operand);
                addEdge(blockIndex, blockFor[block.end], "true", "true", lastPc, block.end);
            }
            else if (instruction.opcode == Opcode::AndBranch || instruction.opcode == Opcode::OrBranch
                || instruction.opcode == Opcode::NumericCompareBranch)
            {
                addEdge(blockIndex, blockFor[instruction.operand], "short-circuit", "short-circuit", lastPc, instruction.operand);
                addEdge(blockIndex, blockFor[block.end], "fallthrough", "", lastPc, block.end);
            }
            else if (instruction.opcode == Opcode::NumericForNext || instruction.opcode == Opcode::IntForNext)
            {
                if (instruction.member_site != 0 && instruction.member_site - 1 < instructions.integer_loops.size())
                {
                    const auto& loop = instructions.integer_loops[instruction.member_site - 1];
                    addEdge(blockIndex, blockFor[loop.body], "true", "loop", lastPc, loop.body);
                    addEdge(blockIndex, blockFor[loop.exit], "false", "exit", lastPc, loop.exit);
                }
                else
                {
                    addEdge(blockIndex, blockFor[instruction.auxiliary], "jump", "loop", lastPc, instruction.auxiliary);
                    addEdge(blockIndex, blockFor[block.end], "fallthrough", "", lastPc, block.end);
                }
            }
            else if (instruction.opcode == Opcode::Return)
                addEdge(blockIndex, exitBlock, "return", "return", lastPc, count);
            else if (instruction.opcode == Opcode::Exit)
                addEdge(blockIndex, exitBlock, "exit", "exit", lastPc, count);
            else
                addEdge(blockIndex, blockFor[block.end], block.end == count ? "fallthrough" : "fallthrough",
                    "", lastPc, block.end);
        }

        target += "\"blocks\":[";
        for (size_t blockIndex = 0; blockIndex < blocks.size(); ++blockIndex)
        {
            const auto& block = blocks[blockIndex];
            if (blockIndex != 0) target += ",";
            target += "{\"id\":";
            target += jsonString("b" + std::to_string(blockIndex));
            target += ",\"start\":";
            target += std::to_string(block.start);
            target += ",\"end\":";
            target += std::to_string(block.end);
            target += ",\"synthetic\":false,\"labels\":[";
            for (size_t labelIndex = 0; labelIndex < block.labels.size(); ++labelIndex)
            {
                if (labelIndex != 0) target += ",";
                target += jsonString(block.labels[labelIndex]);
            }
            target += "],\"instructions\":[";
            for (size_t pc = block.start; pc < block.end; ++pc)
            {
                if (pc != block.start) target += ",";
                writeInstruction(target, instructions.code[pc], instructions, pc);
            }
            target += "]}";
        }
        if (!blocks.empty()) target += ",";
        target += "{\"id\":\"exit\",\"start\":";
        target += std::to_string(count);
        target += ",\"end\":";
        target += std::to_string(count);
        target += ",\"synthetic\":true,\"labels\":[],\"instructions\":[]}],";
        target += "\"edges\":[";
        for (size_t edgeIndex = 0; edgeIndex < edges.size(); ++edgeIndex)
        {
            const auto& edge = edges[edgeIndex];
            if (edgeIndex != 0) target += ",";
            target += "{\"from\":";
            target += jsonString("b" + std::to_string(edge.from));
            target += ",\"to\":";
            target += jsonString(edge.to == exitBlock ? "exit" : "b" + std::to_string(edge.to));
            target += ",\"fromPc\":";
            target += std::to_string(edge.fromPc);
            target += ",\"toPc\":";
            target += std::to_string(edge.toPc);
            target += ",\"kind\":";
            target += jsonString(edge.kind);
            target += ",\"label\":";
            target += jsonString(edge.label);
            target += "}";
        }
        target += "],\"entryBlock\":";
        target += jsonString(blocks.empty() ? "exit" : "b0");
    };

    output += "{\"version\":1,\"success\":";
    output += valid() ? "true" : "false";
    output += ",\"translationError\":";
    output += jsonString(get_translation_error());
    output += ",\"errors\":[";
    const auto errors = get_errors();
    for (size_t index = 0; index < errors.size(); ++index)
    {
        if (index != 0) output += ",";
        output += "{\"filename\":";
        output += jsonString(errors[index].filename);
        output += ",\"line\":";
        output += std::to_string(errors[index].line);
        output += ",\"col\":";
        output += std::to_string(errors[index].col);
        output += ",\"message\":";
        output += jsonString(errors[index].message);
        output += ",\"source\":";
        output += jsonString(errors[index].source_text);
        output += "}";
    }
    output += "],\"entry\":\"root\",\"functions\":[";

    size_t functionIndex = 0;
    auto beginFunction = [&](const std::string& id, const std::string& name, size_t arity, const std::string& returnType,
        const std::vector<std::string>& parameters, const SourceLocation* bodySource, bool root)
    {
        if (functionIndex++ != 0) output += ",";
        output += "{\"id\":";
        output += jsonString(id);
        output += ",\"name\":";
        output += jsonString(name);
        output += ",\"arity\":";
        output += std::to_string(arity);
        output += ",\"returnType\":";
        output += jsonString(returnType);
        output += ",\"parameters\":[";
        for (size_t parameterIndex = 0; parameterIndex < parameters.size(); ++parameterIndex)
        {
            if (parameterIndex != 0) output += ",";
            output += jsonString(parameters[parameterIndex]);
        }
        output += "],\"root\":";
        output += root ? "true" : "false";
        output += ",\"source\":";
        appendSource(output, bodySource);
        output += ",";
    };

    std::vector<std::string> rootLabels;
    for (const auto& [label, entry] : entry_labels)
    {
        if (entry < root_entries.size())
            rootLabels.push_back(label + "@" + std::to_string(root_entries[entry]));
    }
    beginFunction("root", "<main>", 0, "", {}, sourceAt(root_source), true);
    writeModule(output, root_instructions, rootLabels);
    output += "}";

    for (const auto& [name, overloads] : functionIds)
    {
        if (name == "<main>") continue;
        for (const auto& [arity, id] : overloads)
        {
            const auto functionIt = function_code.find(name);
            if (functionIt == function_code.end()) continue;
            const auto overloadIt = functionIt->second.find(arity);
            if (overloadIt == functionIt->second.end() || overloadIt->second == nullptr) continue;
            const auto& function = *overloadIt->second;
            std::vector<std::string> parameters;
            for (const auto& parameter : function.parameters)
            {
                const std::string type = parameter.type_name.empty() ? "auto" : parameter.type_name;
                parameters.push_back(type + " " + parameter.name);
            }
            beginFunction(id, name, arity, function.return_type, parameters, sourceAt(function.body_source), false);
            writeModule(output, function.instructions, {});
            output += "}";
        }
    }

    output += "]}";
    return output;
}
}
