/**
 * Cifa Script Playground 主应用
 */

import CifaModule from '../cifa.js';

class CifaPlayground {
    constructor() {
        this.editor = null;
        this.cifaModule = null;
        this.isReady = false;
        this.lintTimeout = null;
        this.lintDelay = 500;

        this.examples = [
            {
                id: 'hello',
                name: 'Hello World',
                code: `println("Hello, Cifa Script!");

int x = 10;
double y = 3.14;
string msg = "Welcome";

println("x = ", x);
println("y = ", y);
println(msg);

return 0;`
            },
            {
                id: 'loop_math',
                name: '循环与算术',
                code: `int i;
double sum = 0.0, product = 1.0, division = 100.0, difference = 50.0;
double total_result = 0.0;

for (i = 1; i <= 5; i++) {
    sum += i;
}

while (i <= 6) {
    product *= i;
    i++;
}

do {
    difference -= i;
    i++;
} while (difference > 0);

division /= 5;
total_result = sum + product + division + difference;
return total_result;`
            },
            {
                id: 'loop_control',
                name: '循环控制',
                code: `int sum = 0;
for (int i = 0; i < 10; i++) {
    if (i % 2 == 0) continue;
    if (i > 7) break;
    sum += i;
}
return sum;`
            },
            {
                id: 'recursion',
                name: '递归 factorial',
                code: `double factorial(double n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

return factorial(5);`
            },
            {
                id: 'string_ops',
                name: '字符串操作',
                code: `string s1 = "Hello ";
string s2 = "World";
return s1 + s2;`
            },
            {
                id: 'array_methods',
                name: '数组方法',
                code: `a = {1, 2, 3, 4, 5};
a.pop_back();
a.insert(1, 99);
println("size = ", size(a));
return a[1];`
            },
            {
                id: 'array_literal',
                name: '数组字面量',
                code: `array = {1, 2, 3, 4, 5};
return array[0] + array[4];`
            },
            {
                id: 'multi_dim_array',
                name: '多维数组',
                code: `grid = {{1, 2}, {3, 4}};
return grid[1][0];`
            },
            {
                id: 'map_usage',
                name: 'Map 用法',
                code: `dict["name"] = "Alice";
dict["age"] = 30;
string key = "name";
println("Name: ", dict[key]);
return dict["age"];`
            },
            {
                id: 'map_methods',
                name: 'Map 方法',
                code: `m["x"] = 10;
m["y"] = 20;
m["z"] = 30;
m.erase("y");
return size(m);`
            },
            {
                id: 'map_contains_keys',
                name: 'Map contains 和 keys',
                code: `dict["apple"] = 5;
dict["banana"] = 3;
dict["orange"] = 8;

// 检查是否包含某个键
if (dict.contains("apple")) {
    println("有苹果");
}

if (!dict.contains("grape")) {
    println("没有葡萄");
}

// 获取所有键
keys = dict.keys();
println("键的数量: ", size(keys));

// 遍历打印所有键值对
for (int i = 0; i < size(keys); i++) {
    string key = keys[i];
    println(key, " = ", dict[key]);
}

return size(dict);`
            },
            {
                id: 'map_clear',
                name: 'Map clear 清空',
                code: `m["a"] = 1;
m["b"] = 2;
m["c"] = 3;
println("清空前大小: ", size(m));

m.clear();
println("清空后大小: ", size(m));

// 重新添加元素
m["new"] = 100;
return size(m);`
            },
            {
                id: 'vector_resize',
                name: 'Vector resize 调整大小',
                code: `arr = {1, 2, 3};
println("原始大小: ", size(arr));

arr.resize(5);
println("resize后大小: ", size(arr));

arr.resize(2);
println("缩小后大小: ", size(arr));

// 添加新元素
arr.push_back(99);
return size(arr);`
            },
            {
                id: 'vector_contains',
                name: 'Vector contains 查找元素',
                code: `arr = {10, 20, 30, 40, 50};

if (arr.contains(30)) {
    println("包含 30");
}

if (!arr.contains(100)) {
    println("不包含 100");
}

// 查找并统计包含关系
int found = 0;
for (int i = 0; i < size(arr); i++) {
    if (arr.contains(arr[i])) {
        found = found + 1;
    }
}

return found;`
            },
            {
                id: 'vector_clear',
                name: 'Vector clear 清空',
                code: `arr = {1, 2, 3, 4, 5};
println("清空前: ", size(arr));

arr.clear();
println("清空后: ", size(arr));

// 清空后重新使用
arr.push_back(100);
arr.push_back(200);
return arr[0] + arr[1];`
            },
            {
                id: 'vector_insert_erase',
                name: 'Vector insert 和 erase',
                code: `arr = {1, 3, 5};
println("初始: ", arr[0], ", ", arr[1], ", ", arr[2]);

// 在位置 1 插入 2
arr.insert(1, 2);
println("插入后大小: ", size(arr));

// 删除位置 0 的元素
arr.erase(0);
println("删除后大小: ", size(arr));

// 打印剩余元素
for (int i = 0; i < size(arr); i++) {
    println("arr[", i, "] = ", arr[i]);
}

return size(arr);`
            },
            {
                id: 'global_functions',
                name: '全局数学函数',
                code: `double x = 16.0;
double y = 3.0;

println("sqrt(16) = ", sqrt(x));
println("pow(2, 3) = ", pow(2, y));
println("max(5, 10) = ", max(5, 10));
println("min(5, 10) = ", min(5, 10));
println("abs(-5) = ", abs(-5));
println("round(3.7) = ", round(3.7));
println("floor(3.7) = ", floor(3.7));
println("ceil(3.2) = ", ceil(3.2));

return sqrt(x);`
            },
            {
                id: 'trig_functions',
                name: '三角函数',
                code: `double pi = 3.14159;
double angle = pi / 4;  // 45度

println("sin(45°) = ", sin(angle));
println("cos(45°) = ", cos(angle));
println("tan(45°) = ", tan(angle));

double s = sin(angle);
double c = cos(angle);
// sin² + cos² = 1
return s * s + c * c;`
            },
            {
                id: 'random_function',
                name: 'Random 随机数',
                code: `// 生成一些随机数
println("随机数 [0,1): ", random());
println("随机数 [0,10): ", random(10));
println("随机数 [5,15): ", random(5, 15));

// 生成多个随机数求和
double sum = 0;
for (int i = 0; i < 5; i++) {
    sum = sum + random(1, 6);  // 模拟骰子
}
return sum;`
            },
            {
                id: 'to_string_number',
                name: '类型转换函数',
                code: `int n = 42;
double f = 3.14;
string s = "123";

// 数字转字符串
string str1 = to_string(n);
string str2 = to_string(f);
println("字符串: ", str1, ", ", str2);

// 字符串转数字
double num = to_number(s);
println("数字: ", num);

// 结合使用
return to_number("100") + 23;`
            },
            {
                id: 'size_function',
                name: 'Size 函数多种用法',
                code: `// 数组大小
arr = {1, 2, 3, 4, 5};
println("数组大小: ", size(arr));

// Map 大小
m["a"] = 1;
m["b"] = 2;
println("Map 大小: ", size(m));

// 字符串长度
string s = "Hello";
println("字符串长度: ", size(s));

return size(arr) + size(m);`
            },
            {
                id: 'ternary_switch',
                name: '三目与 switch',
                code: `int x = 2;
int res = 0;

switch (x) {
    case 1: res = 10; break;
    case 2: res = 20;
    case 3: res = 30; break;
    default: res = 40;
}

return x > 1 ? res : 0;`
            },
            {
                id: 'ternary_nested',
                name: '嵌套三目运算',
                code: `int a = 1, b = 0;
return a > b ? (b > a ? 10 : 20) : 30;`
            },
            {
                id: 'bitwise',
                name: '位运算',
                code: `int a = 5;      // 0101
int b = 3;      // 0011
int res1 = a & b;  // 0001 (1)
int res2 = a | b;  // 0111 (7)
int res3 = a ^ b;  // 0110 (6)
int res4 = a << 1; // 1010 (10)
return res1 + res2 + res3 + res4;`
            },
            {
                id: 'scope_shadowing',
                name: '作用域遮蔽',
                code: `int x = 10;
{
    int x = 20;
    if (x == 20) {
        int x = 30;
    }
}
return x;`
            },
            {
                id: 'math_priority',
                name: '算术优先级',
                code: `return 2 + 3 * 4 / (1 + 1) - 5 % 2;`
            },
            {
                id: 'same_precedence_assoc',
                name: '同优先级左结合',
                code: `// 同优先级运算符从左到右结合：a/b*c == (a/b)*c
println("100/10*2 = ", 100 / 10 * 2);
println("100*10/2 = ", 100 * 10 / 2);
println("100/10%3 = ", 100 / 10 % 3);
println("10%4/2 = ", 10 % 4 / 2);
println("10-3+1 = ", 10 - 3 + 1);

double lW = 8, lH = 6;
println("lW/2*lH/2 = ", lW / 2 * lH / 2);

return 100 / 10 * 2;`
            },
            {
                id: 'unary_plus_minus',
                name: '一元正负号',
                code: `println("-5 = ", -5);
println("-(2+3) = ", -(2 + 3));
println("-(-3) = ", -(-3));
println("1 - -2 = ", 1 - -2);
println("10 - 3 - 2 = ", 10 - 3 - 2);
println("-3 + 5 = ", -3 + 5);
println("2 * -3 = ", 2 * -3);
println("-(2*3) = ", -(2 * 3));
println("-2 + -3 = ", -2 + -3);
println("+5 = ", +5);
println("+(2+3) = ", +(2 + 3));
println("2 * +3 = ", 2 * +3);
println("1 + +2 = ", 1 + +2);

return 2 * -3;`
            },
            {
                id: 'compound_assign',
                name: '复合赋值',
                code: `int x = 10;
x *= 2 + 3;
x %= 7;
return x;`
            },
            {
                id: 'type_promotion',
                name: '类型提升',
                code: `int a = 5;
int b = 2;
double res = floor(a / b);
double res2 = a / 2.0;
return res + res2;`
            },
            {
                id: 'sprintf_format',
                name: 'sprintf 和 format 格式化',
                code: `// --- sprintf (printf 风格) ---
// %s 字符串
println(sprintf("Hello %s!", "World"));

// %d 整数和 %.2f 浮点
println(sprintf("%d + %.2f = %.2f", 3, 1.5, 4.5));

// %% 转义
println(sprintf("100%%"));

// %x 十六进制
println(sprintf("255 in hex = %x", 255));

// %llu 显式长度修饰符
println(sprintf("%llu", 12345));

// 零填充 + 精度
println(sprintf("%08.2f", 3.14));

// --- format (Python 风格) ---
// 自动 {}
println(format("Hello {}!", "World"));

// 显式索引 {N}
println(format("{1} and {0}", "B", "A"));

// 整数数字不带小数点
println(format("x = {}", 42));

// 浮点数字
println(format("pi = {}", 3.14));

// {{ }} 转义
println(format("{{{}}}", "ok"));

// {:格式说明符} 自动索引
println(format("{:.2f}", 3.14159));

// {N:格式说明符} 显式索引
println(format("{0:d} / {1:.1f}", 7, 3.0));

// {:s} 字符串格式
println(format("{:s}", "hi"));

// {:.2} 无类型尾缀 — 数字按 %g 保留2位有效数字
println(format("{:.2}", 3.14159));

return 0;`
            },
            {
                id: 'mixed_array',
                name: '混合类型数组',
                code: `arr = {1, "hello", 3.14, "world"};
int i = 2;
double n = arr[0];
string s = arr[1];
double f = arr[i];
println(s, " ", to_string(f));
return n + f;`
            },
            {
                id: 'empty_statement',
                name: '空语句',
                code: `int x = 10;;;
if (x > 5) {}
else ;
while(false){;}
for(;false;);
return x;`
            },
            {
                id: 'struct_usage',
                name: 'Struct 结构体',
                code: `struct Point { int x; int y; };
Point p;
p.x = 10;
p.y = 20;
t1 = p.x + p.y;
println(t1);

struct Vec { int x; int y; int z; };
Vec v;
v.x = 1; v.y = 2; v.z = 3;
t2 = v.x * 100 + v.y * 10 + v.z;
println(t2);

struct Counter { int n; };
Counter cnt;
cnt.n = 5;
cnt.n += 3;
t3 = cnt.n;
println(t3);

struct Rect { int w; int h; };
area(r) { return r.w * r.h; }
Rect r;
r.w = 4; r.h = 5;
t4 = area(r);
println(t4);

struct Point { int x; int y; };
Point p;
p.x = 3;
p.y = 7;
t5 = p.x + p.y;
println(t5);
return (t1+t2+t3+t4+t5);`
            },
            {
                id: 'syntax_error_demo',
                name: '错误示例: 语法错误',
                code: `int x = 10;
int y = undef;
return y;`
            }
        ];
    }

    async init() {
        this.checkFileProtocolWarning();
        await this.initCifa();
        await this.initEditor();
        this.initUI();
        this.initResizeHandle();
    }

    checkFileProtocolWarning() {
        if (window.location.protocol === 'file:') {
            const tip = '检测到 file:// 打开页面。WASM 在多数浏览器会被跨域/安全策略拦截，请改用本地 HTTP 服务访问。';
            this.appendOutput('error', tip);
            console.warn(tip);
        }
    }

    async initCifa() {
        try {
            this.cifaModule = await CifaModule({
                locateFile: (path) => {
                    const base = new URL('../', import.meta.url);
                    return new URL(path, base).toString();
                }
            });
            this.isReady = true;
            this.updateStatus(true);
            document.getElementById('loading-overlay').classList.add('hidden');
            document.getElementById('btn-run').disabled = false;
        } catch (err) {
            console.error('Failed to initialize Cifa:', err);
            this.updateStatus(false, err && err.message ? err.message : 'unknown error');
        }
    }

    async initEditor() {
        return new Promise((resolve) => {
            require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' } });
            require(['vs/editor/editor.main'], () => {
                monaco.languages.register({ id: 'cifa' });
                monaco.languages.setMonarchTokensProvider('cifa', {
                    keywords: ['auto', 'break', 'case', 'continue', 'default', 'do', 'else', 'for', 'if', 'return', 'struct', 'switch', 'while', 'int', 'float', 'double', 'string', 'char', 'true', 'false'],
                    operators: ['=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=', '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%', '<<', '>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=', '%='],
                    tokenizer: {
                        root: [
                            [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
                            [/\d*\.\d+/, 'number.float'],
                            [/\d+/, 'number'],
                            [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
                            [/\/\/.*$/, 'comment'],
                            [/[{}()\[\]]/, '@brackets']
                        ],
                        string: [[/[^\\"]+/, 'string'], [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]]
                    }
                });

                this.editor = monaco.editor.create(document.getElementById('monaco-editor'), {
                    value: this.examples[0].code,
                    language: 'cifa',
                    theme: 'vs-dark',
                    fontSize: 14,
                    fontFamily: 'Consolas, monospace',
                    minimap: { enabled: true },
                    automaticLayout: true,
                    lineNumbers: 'on',
                    renderLineHighlight: 'all'
                });

                this.editor.onDidChangeModelContent(() => this.scheduleLint());
                resolve();
            });
        });
    }

    scheduleLint() {
        if (this.lintTimeout) {
            clearTimeout(this.lintTimeout);
        }
        this.lintTimeout = setTimeout(() => this.lint(), this.lintDelay);
    }

    async lint() {
        if (!this.isReady) return;
        const code = this.editor.getValue();
        const rawErrors = this.cifaModule.lint(code);
        const errors = this.normalizeErrors(rawErrors);
        this.disposeEmbind(rawErrors);
        this.updateErrors(errors);
    }

    normalizeErrors(errors) {
        if (!errors) return [];

        if (Array.isArray(errors)) {
            return errors.map((e) => ({
                line: Number(e.line) || 1,
                col: Number(e.col) || 1,
                message: String(e.message || 'Unknown error')
            }));
        }

        if (typeof errors.size === 'function' && typeof errors.get === 'function') {
            const arr = [];
            const size = errors.size();
            for (let i = 0; i < size; i++) {
                const e = errors.get(i);
                arr.push({
                    line: Number(e.line) || 1,
                    col: Number(e.col) || 1,
                    message: String(e.message || 'Unknown error')
                });
            }
            return arr;
        }

        if (typeof errors.length === 'number') {
            const arr = [];
            for (let i = 0; i < errors.length; i++) {
                const e = errors[i];
                arr.push({
                    line: Number(e.line) || 1,
                    col: Number(e.col) || 1,
                    message: String(e.message || 'Unknown error')
                });
            }
            return arr;
        }

        return [];
    }

    disposeEmbind(obj) {
        if (obj && typeof obj.delete === 'function') {
            try {
                obj.delete();
            } catch (_err) {
                // Ignore embind cleanup errors.
            }
        }
    }

    updateErrors(errors) {
        errors = errors || [];
        const markers = errors.map((e) => ({
            startLineNumber: e.line,
            startColumn: e.col,
            endLineNumber: e.line,
            endColumn: e.col + 1,
            message: e.message,
            severity: monaco.MarkerSeverity.Error
        }));
        monaco.editor.setModelMarkers(this.editor.getModel(), 'cifa', markers);

        const errorContent = document.getElementById('error-content');
        const badge = document.getElementById('error-count');
        badge.textContent = String(errors.length);
        badge.style.display = errors.length ? 'inline' : 'none';

        if (!errors.length) {
            errorContent.innerHTML = '<div class="empty-state"><div>暂无错误</div></div>';
            return;
        }

        errorContent.innerHTML = '<table class="error-table"><thead><tr><th>代码</th><th>描述</th><th>文件</th><th>行</th></tr></thead><tbody>' +
            errors.map((e, i) => `<tr data-line="${e.line}" data-col="${e.col}"><td class="error-code">C${100 + i}</td><td class="error-desc">${this.escapeHtml(e.message)}</td><td class="error-file">main.cifa</td><td class="error-line">${e.line}</td></tr>`).join('') +
            '</tbody></table>';

        errorContent.querySelectorAll('tr[data-line]').forEach((row) => {
            row.addEventListener('click', () => {
                const line = parseInt(row.dataset.line, 10);
                const col = parseInt(row.dataset.col, 10);
                this.editor.revealLineInCenter(line);
                this.editor.setPosition({ lineNumber: line, column: col });
                this.editor.focus();
            });
        });
    }

    populateExamples() {
        const select = document.getElementById('example-select');
        this.examples.forEach((example) => {
            const option = document.createElement('option');
            option.value = example.id;
            option.textContent = example.name;
            select.appendChild(option);
        });
    }

    selectTab(tabName) {
        document.querySelectorAll('.panel-tab').forEach((tab) => tab.classList.remove('active'));
        document.querySelectorAll('.panel-content').forEach((content) => content.classList.remove('active'));

        const tab = document.querySelector(`.panel-tab[data-tab="${tabName}"]`);
        const content = document.getElementById(`${tabName}-content`);
        if (tab && content) {
            tab.classList.add('active');
            content.classList.add('active');
        }
    }

    initUI() {
        this.populateExamples();

        document.getElementById('btn-run').onclick = () => this.run();
        document.getElementById('btn-clear').onclick = () => {
            document.getElementById('output-content').innerHTML = '<div class="empty-state"><div>点击"运行"按钮执行代码</div></div>';
        };

        const exampleSelect = document.getElementById('example-select');
        exampleSelect.onchange = () => {
            const found = this.examples.find((item) => item.id === exampleSelect.value);
            if (!found) return;
            this.editor.setValue(found.code);
            this.selectTab('output');
        };

        document.querySelectorAll('.panel-tab').forEach((tab) => {
            tab.onclick = () => this.selectTab(tab.dataset.tab);
        });
    }

    appendOutput(type, text) {
        const output = document.getElementById('output-content');
        const line = document.createElement('div');
        line.className = `output-line output-${type}`;
        line.textContent = text;

        if (output.querySelector('.empty-state')) {
            output.innerHTML = '';
        }

        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    }

    async run() {
        if (!this.isReady) return;

        const code = this.editor.getValue();

        const startTime = performance.now();
        let result;

        try {
            result = this.cifaModule.execute(code);
        } catch (err) {
            result = {
                success: false,
                runtimeError: 'Execution crashed: ' + err.message,
                errors: [],
                value: '',
                output: ''
            };
        }

        const duration = Math.round((performance.now() - startTime) * 100) / 100;
        const rawErrors = result && result.errors ? result.errors : [];
        const errors = this.normalizeErrors(rawErrors);
        this.disposeEmbind(rawErrors);

        this.updateErrors(errors);

        // 显示 print/println 的输出
        if (result && result.output) {
            this.appendOutput('info', result.output);
        }

        if (result && result.success) {
            this.appendOutput('success', `执行成功 (${duration}ms)`);
            this.appendOutput('info', `返回值: ${result.value || '(no return value)'}`);
        } else {
            this.appendOutput('error', `执行失败 (${duration}ms)`);
            if (result && result.runtimeError) {
                this.appendOutput('error', result.runtimeError);
            }
        }

        if (errors.length > 0) {
            this.selectTab('error');
        } else {
            this.selectTab('output');
        }
    }

    initResizeHandle() {
        const panel = document.getElementById('bottom-panel');
        let startY;
        let startH;

        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        panel.appendChild(handle);

        handle.onmousedown = (e) => {
            startY = e.clientY;
            startH = panel.offsetHeight;
            document.body.style.cursor = 'ns-resize';

            document.onmousemove = (event) => {
                const dy = startY - event.clientY;
                panel.style.height = Math.max(100, Math.min(startH + dy, window.innerHeight * 0.5)) + 'px';
            };

            document.onmouseup = () => {
                document.body.style.cursor = '';
                document.onmousemove = null;
                document.onmouseup = null;
            };
        };
    }

    updateStatus(ready, message) {
        const indicator = document.getElementById('status-indicator');
        const text = document.getElementById('status-text');

        indicator.classList.remove('loading');
        if (ready) {
            text.textContent = '就绪';
            return;
        }

        text.textContent = message ? `初始化失败: ${message}` : '初始化失败';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const app = new CifaPlayground();
app.init();
