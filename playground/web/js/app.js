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
                id: 'map_usage',
                name: 'Map 用法',
                code: `dict["name"] = "Alice";
dict["age"] = 30;
string key = "name";
println("Name: ", dict[key]);
return dict["age"];`
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
                    keywords: ['auto', 'break', 'case', 'continue', 'default', 'do', 'else', 'for', 'if', 'return', 'switch', 'while', 'int', 'float', 'double', 'string', 'char', 'true', 'false'],
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
