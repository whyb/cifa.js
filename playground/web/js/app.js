/**
 * Cifa Script Playground — VSCode-Inspired Multi-Tab Layout with File Explorer
 * 使用 IDBFS (IndexedDB) 实现持久化虚拟文件系统
 */

import CifaModule from '../cifa.js';

/* =========================================================
   SVG Icons (inline)
   ========================================================= */
const ICONS = {
    file: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 1h7.09L14 4.41V14a1 1 0 01-1 1h-9a1 1 0 01-1-1V2a1 1 0 011-1zm7.09 1L12 3.41H11a.5.5 0 01-.5-.5V1.59zM4 9h8v1H4V9zm0 2.5h8v1H4v-1zM4 11.5h8V13H4v-1.5z"/></svg>',
    error: '<svg width="14" height="14" viewBox="0 0 16 16" fill="#f48771"><circle cx="8" cy="8" r="7" fill="none" stroke="#f48771" stroke-width="1.5"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#f48771" stroke-width="1.5"/></svg>',
};

/* =========================================================
   Example Data (for toolbar dropdown)
   ========================================================= */
const EXAMPLE_GROUPS = [
    {
        name: '基础',
        items: [
            { id: 'hello', name: 'Hello World', code: `println("Hello, Cifa Script!");\n\nint x = 10;\ndouble y = 3.14;\nstring msg = "Welcome";\n\nprintln("x = ", x);\nprintln("y = ", y);\nprintln(msg);\n\nreturn 0;` },
            { id: 'empty_statement', name: '空语句', code: `int x = 10;;;\nif (x > 5) {}\nelse ;\nwhile(false){;}\nfor(;false;);\nreturn x;` },
        ]
    },
    {
        name: '循环与控制流',
        items: [
            { id: 'loop_math', name: '循环与算术', code: `int i;\ndouble sum = 0.0, product = 1.0, division = 100.0, difference = 50.0;\ndouble total_result = 0.0;\n\nfor (i = 1; i <= 5; i++) {\n    sum += i;\n}\n\nwhile (i <= 6) {\n    product *= i;\n    i++;\n}\n\ndo {\n    difference -= i;\n    i++;\n} while (difference > 0);\n\ndivision /= 5;\ntotal_result = sum + product + division + difference;\nreturn total_result;` },
            { id: 'loop_control', name: '循环控制', code: `int sum = 0;\nfor (int i = 0; i < 10; i++) {\n    if (i % 2 == 0) continue;\n    if (i > 7) break;\n    sum += i;\n}\nreturn sum;` },
            { id: 'recursion', name: '递归 factorial', code: `double factorial(double n) {\n    if (n <= 1) return 1;\n    return n * factorial(n - 1);\n}\n\nreturn factorial(5);` },
            { id: 'ternary_switch', name: '三目与 switch', code: `int x = 2;\nint res = 0;\n\nswitch (x) {\n    case 1: res = 10; break;\n    case 2: res = 20;\n    case 3: res = 30; break;\n    default: res = 40;\n}\n\nreturn x > 1 ? res : 0;` },
            { id: 'ternary_nested', name: '嵌套三目运算', code: `int a = 1, b = 0;\nreturn a > b ? (b > a ? 10 : 20) : 30;` },
        ]
    },
    {
        name: '字符串',
        items: [
            { id: 'string_ops', name: '字符串操作', code: `string s1 = "Hello ";\nstring s2 = "World";\nreturn s1 + s2;` },
            { id: 'sprintf_format', name: 'sprintf 和 format 格式化', code: `// --- sprintf (printf 风格) ---\nprintln(sprintf("Hello %s!", "World"));\nprintln(sprintf("%d + %.2f = %.2f", 3, 1.5, 4.5));\nprintln(sprintf("100%%"));\nprintln(sprintf("255 in hex = %x", 255));\nprintln(sprintf("%llu", 12345));\nprintln(sprintf("%08.2f", 3.14));\n\n// --- format (Python 风格) ---\nprintln(format("Hello {}!", "World"));\nprintln(format("{1} and {0}", "B", "A"));\nprintln(format("x = {}", 42));\nprintln(format("pi = {}", 3.14));\nprintln(format("{{{}}}", "ok"));\nprintln(format("{:.2f}", 3.14159));\nprintln(format("{0:d} / {1:.1f}", 7, 3.0));\nprintln(format("{:s}", "hi"));\nprintln(format("{:.2}", 3.14159));\n\nreturn 0;` },
        ]
    },
    {
        name: '数组 (Vector)',
        items: [
            { id: 'array_methods', name: '数组方法', code: `a = {1, 2, 3, 4, 5};\na.pop_back();\na.insert(1, 99);\nprintln("size = ", size(a));\nreturn a[1];` },
            { id: 'array_literal', name: '数组字面量', code: `array = {1, 2, 3, 4, 5};\nreturn array[0] + array[4];` },
            { id: 'multi_dim_array', name: '多维数组', code: `grid = {{1, 2}, {3, 4}};\nreturn grid[1][0];` },
            { id: 'vector_resize', name: 'Vector resize', code: `arr = {1, 2, 3};\nprintln("原始大小: ", size(arr));\n\narr.resize(5);\nprintln("resize后大小: ", size(arr));\n\narr.resize(2);\nprintln("缩小后大小: ", size(arr));\n\narr.push_back(99);\nreturn size(arr);` },
            { id: 'vector_contains', name: 'Vector contains', code: `arr = {10, 20, 30, 40, 50};\n\nif (arr.contains(30)) {\n    println("包含 30");\n}\n\nif (!arr.contains(100)) {\n    println("不包含 100");\n}\n\nint found = 0;\nfor (int i = 0; i < size(arr); i++) {\n    if (arr.contains(arr[i])) {\n        found = found + 1;\n    }\n}\n\nreturn found;` },
            { id: 'vector_clear', name: 'Vector clear', code: `arr = {1, 2, 3, 4, 5};\nprintln("清空前: ", size(arr));\n\narr.clear();\nprintln("清空后: ", size(arr));\n\narr.push_back(100);\narr.push_back(200);\nreturn arr[0] + arr[1];` },
            { id: 'vector_insert_erase', name: 'Vector insert 和 erase', code: `arr = {1, 3, 5};\nprintln("初始: ", arr[0], ", ", arr[1], ", ", arr[2]);\n\narr.insert(1, 2);\nprintln("插入后大小: ", size(arr));\n\narr.erase(0);\nprintln("删除后大小: ", size(arr));\n\nfor (int i = 0; i < size(arr); i++) {\n    println("arr[", i, "] = ", arr[i]);\n}\n\nreturn size(arr);` },
            { id: 'mixed_array', name: '混合类型数组', code: `arr = {1, "hello", 3.14, "world"};\nint i = 2;\ndouble n = arr[0];\nstring s = arr[1];\ndouble f = arr[i];\nprintln(s, " ", to_string(f));\nreturn n + f;` },
        ]
    },
    {
        name: 'Map',
        items: [
            { id: 'map_usage', name: 'Map 用法', code: `dict["name"] = "Alice";\ndict["age"] = 30;\nstring key = "name";\nprintln("Name: ", dict[key]);\nreturn dict["age"];` },
            { id: 'map_methods', name: 'Map 方法', code: `m["x"] = 10;\nm["y"] = 20;\nm["z"] = 30;\nm.erase("y");\nreturn size(m);` },
            { id: 'map_contains_keys', name: 'Map contains 和 keys', code: `dict["apple"] = 5;\ndict["banana"] = 3;\ndict["orange"] = 8;\n\nif (dict.contains("apple")) {\n    println("有苹果");\n}\n\nif (!dict.contains("grape")) {\n    println("没有葡萄");\n}\n\nkeys = dict.keys();\nprintln("键的数量: ", size(keys));\n\nfor (int i = 0; i < size(keys); i++) {\n    string key = keys[i];\n    println(key, " = ", dict[key]);\n}\n\nreturn size(dict);` },
            { id: 'map_clear', name: 'Map clear', code: `m["a"] = 1;\nm["b"] = 2;\nm["c"] = 3;\nprintln("清空前大小: ", size(m));\n\nm.clear();\nprintln("清空后大小: ", size(m));\n\nm["new"] = 100;\nreturn size(m);` },
        ]
    },
    {
        name: '运算符与类型',
        items: [
            { id: 'math_priority', name: '算术优先级', code: `return 2 + 3 * 4 / (1 + 1) - 5 % 2;` },
            { id: 'same_precedence_assoc', name: '同优先级左结合', code: `// 同优先级运算符从左到右结合：a/b*c == (a/b)*c\nprintln("100/10*2 = ", 100 / 10 * 2);\nprintln("100*10/2 = ", 100 * 10 / 2);\nprintln("100/10%3 = ", 100 / 10 % 3);\nprintln("10%4/2 = ", 10 % 4 / 2);\nprintln("10-3+1 = ", 10 - 3 + 1);\n\ndouble lW = 8, lH = 6;\nprintln("lW/2*lH/2 = ", lW / 2 * lH / 2);\n\nreturn 100 / 10 * 2;` },
            { id: 'unary_plus_minus', name: '一元正负号', code: `println("-5 = ", -5);\nprintln("-(2+3) = ", -(2 + 3));\nprintln("-(-3) = ", -(-3));\nprintln("1 - -2 = ", 1 - -2);\nprintln("10 - 3 - 2 = ", 10 - 3 - 2);\nprintln("-3 + 5 = ", -3 + 5);\nprintln("2 * -3 = ", 2 * -3);\nprintln("-(2*3) = ", -(2 * 3));\nprintln("-2 + -3 = ", -2 + -3);\nprintln("+5 = ", +5);\nprintln("+(2+3) = ", +(2 + 3));\nprintln("2 * +3 = ", 2 * +3);\nprintln("1 + +2 = ", 1 + +2);\n\nreturn 2 * -3;` },
            { id: 'compound_assign', name: '复合赋值', code: `int x = 10;\nx *= 2 + 3;\nx %= 7;\nreturn x;` },
            { id: 'bitwise', name: '位运算', code: `int a = 5;      // 0101\nint b = 3;      // 0011\nint res1 = a & b;  // 0001 (1)\nint res2 = a | b;  // 0111 (7)\nint res3 = a ^ b;  // 0110 (6)\nint res4 = a << 1; // 1010 (10)\nreturn res1 + res2 + res3 + res4;` },
            { id: 'type_promotion', name: '类型提升', code: `int a = 5;\nint b = 2;\ndouble res = floor(a / b);\ndouble res2 = a / 2.0;\nreturn res + res2;` },
            { id: 'scope_shadowing', name: '作用域遮蔽', code: `int x = 10;\n{\n    int x = 20;\n    if (x == 20) {\n        int x = 30;\n    }\n}\nreturn x;` },
        ]
    },
    {
        name: '内置函数',
        items: [
            { id: 'global_functions', name: '全局数学函数', code: `double x = 16.0;\ndouble y = 3.0;\n\nprintln("sqrt(16) = ", sqrt(x));\nprintln("pow(2, 3) = ", pow(2, y));\nprintln("max(5, 10) = ", max(5, 10));\nprintln("min(5, 10) = ", min(5, 10));\nprintln("abs(-5) = ", abs(-5));\nprintln("round(3.7) = ", round(3.7));\nprintln("floor(3.7) = ", floor(3.7));\nprintln("ceil(3.2) = ", ceil(3.2));\n\nreturn sqrt(x);` },
            { id: 'trig_functions', name: '三角函数', code: `double pi = 3.14159;\ndouble angle = pi / 4;  // 45度\n\nprintln("sin(45°) = ", sin(angle));\nprintln("cos(45°) = ", cos(angle));\nprintln("tan(45°) = ", tan(angle));\n\ndouble s = sin(angle);\ndouble c = cos(angle);\nreturn s * s + c * c;` },
            { id: 'random_function', name: 'Random 随机数', code: `println("随机数 [0,1): ", random());\nprintln("随机数 [0,10): ", random(10));\nprintln("随机数 [5,15): ", random(5, 15));\n\ndouble sum = 0;\nfor (int i = 0; i < 5; i++) {\n    sum = sum + random(1, 6);  // 模拟骰子\n}\nreturn sum;` },
            { id: 'to_string_number', name: '类型转换函数', code: `int n = 42;\ndouble f = 3.14;\nstring s = "123";\n\nstring str1 = to_string(n);\nstring str2 = to_string(f);\nprintln("字符串: ", str1, ", ", str2);\n\ndouble num = to_number(s);\nprintln("数字: ", num);\n\nreturn to_number("100") + 23;` },
            { id: 'size_function', name: 'Size 函数', code: `arr = {1, 2, 3, 4, 5};\nprintln("数组大小: ", size(arr));\n\nm["a"] = 1;\nm["b"] = 2;\nprintln("Map 大小: ", size(m));\n\nstring s = "Hello";\nprintln("字符串长度: ", size(s));\n\nreturn size(arr) + size(m);` },
        ]
    },
    {
        name: '结构体',
        items: [
            { id: 'struct_usage', name: 'Struct 结构体', code: `struct Point { int x; int y; };\nPoint p;\np.x = 10;\np.y = 20;\nt1 = p.x + p.y;\nprintln(t1);\n\nstruct Vec { int x; int y; int z; };\nVec v;\nv.x = 1; v.y = 2; v.z = 3;\nt2 = v.x * 100 + v.y * 10 + v.z;\nprintln(t2);\n\nstruct Counter { int n; };\nCounter cnt;\ncnt.n = 5;\ncnt.n += 3;\nt3 = cnt.n;\nprintln(t3);\n\nstruct Rect { int w; int h; };\narea(r) { return r.w * r.h; }\nRect r;\nr.w = 4; r.h = 5;\nt4 = area(r);\nprintln(t4);\n\nstruct Point { int x; int y; };\nPoint p;\np.x = 3;\np.y = 7;\nt5 = p.x + p.y;\nprintln(t5);\nreturn (t1+t2+t3+t4+t5);` },
        ]
    },
    {
        name: '错误示例',
        items: [
            { id: 'syntax_error_demo', name: '语法错误', code: `int x = 10;\nint y = undef;\nreturn y;` },
        ]
    },
];

const EXAMPLES_MAP = new Map();
for (const g of EXAMPLE_GROUPS) for (const i of g.items) EXAMPLES_MAP.set(i.id, i);

/* =========================================================
   Unique ID Generator
   ========================================================= */
let _idCounter = 0;
function nextId() { return 'f_' + (++_idCounter); }

/* =========================================================
   IDBFS - 基于 IndexedDB 的持久化文件系统
   ========================================================= */
class IDBFileSystem {
    constructor() {
        this.dbName = 'cifa_playground_fs';
        this.dbVersion = 1;
        this.storeName = 'files';
        this.db = null;
        this.root = null;
        this._initialized = false;
    }

    /**
     * 初始化 IDBFS，从 IndexedDB 加载或创建默认文件系统
     */
    async init() {
        this.db = await this._openDB();
        this.root = await this._loadFromDB();

        if (!this.root) {
            // 首次使用，创建默认文件系统
            this.root = this._createDefaultFS();
            await this._saveToDB();
        }

        this._initialized = true;
        return this;
    }

    /**
     * 打开 IndexedDB 数据库
     */
    _openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };

            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * 从 IndexedDB 加载文件系统
     */
    async _loadFromDB() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get('root');

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const data = request.result;
                if (data && data.tree) {
                    resolve(this._deserializeNode(data.tree));
                } else {
                    resolve(null);
                }
            };
        });
    }

    /**
     * 保存文件系统到 IndexedDB
     */
    async _saveToDB() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put({
                id: 'root',
                tree: this._serializeNode(this.root),
                timestamp: Date.now()
            });

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    /**
     * 序列化节点（去除循环引用）
     */
    _serializeNode(node) {
        const serialized = {
            id: node.id,
            name: node.name,
            type: node.type,
            content: node.content || ''
        };

        if (node.type === 'folder' && node.children) {
            serialized.children = node.children.map(child => this._serializeNode(child));
        }

        return serialized;
    }

    /**
     * 反序列化节点（重建 parent 引用）
     */
    _deserializeNode(data, parent = null) {
        const node = {
            id: data.id,
            name: data.name,
            type: data.type,
            content: data.content || '',
            parent: parent,
            children: null
        };

        if (data.type === 'folder' && data.children) {
            node.children = data.children.map(child => this._deserializeNode(child, node));
        }

        return node;
    }

    /**
     * 创建默认文件系统
     */
    _createDefaultFS() {
        const root = {
            id: nextId(),
            name: 'workspace',
            type: 'folder',
            content: '',
            children: [],
            parent: null
        };

        const mainFile = {
            id: nextId(),
            name: 'main.c',
            type: 'file',
            content: 'println("Hello, Cifa Script!");\n\nreturn 0;',
            children: null,
            parent: root
        };

        root.children.push(mainFile);
        return root;
    }

    /**
     * 查找节点
     */
    findNode(id, node = this.root) {
        if (!node) return null;
        if (node.id === id) return node;
        if (node.children) {
            for (const child of node.children) {
                const found = this.findNode(id, child);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * 判断是否为文件夹
     */
    isFolder(id) {
        const node = this.findNode(id);
        return node && node.type === 'folder';
    }

    /**
     * 添加文件
     */
    async addFile(parentId, name, content = '') {
        const parent = this.findNode(parentId);
        if (!parent || parent.type !== 'folder') return null;
        if (parent.children.some(c => c.name === name && c.type === 'file')) return null;

        const file = {
            id: nextId(),
            name: name,
            type: 'file',
            content: content,
            children: null,
            parent: parent
        };

        parent.children.push(file);
        this.sortChildren(parent);
        await this._saveToDB();
        return file;
    }

    /**
     * 添加文件夹
     */
    async addFolder(parentId, name) {
        const parent = this.findNode(parentId);
        if (!parent || parent.type !== 'folder') return null;
        if (parent.children.some(c => c.name === name && c.type === 'folder')) return null;

        const folder = {
            id: nextId(),
            name: name,
            type: 'folder',
            content: '',
            children: [],
            parent: parent
        };

        parent.children.push(folder);
        this.sortChildren(parent);
        await this._saveToDB();
        return folder;
    }

    /**
     * 删除节点
     */
    async deleteNode(id) {
        const node = this.findNode(id);
        if (!node || !node.parent) return false;
        const idx = node.parent.children.indexOf(node);
        if (idx === -1) return false;
        node.parent.children.splice(idx, 1);
        await this._saveToDB();
        return true;
    }

    /**
     * 重命名节点
     */
    async renameNode(id, newName) {
        const node = this.findNode(id);
        if (!node || !node.parent) return false;
        if (node.parent.children.some(c => c.name === newName && c.id !== id)) return false;
        node.name = newName;
        await this._saveToDB();
        return true;
    }

    /**
     * 更新文件内容
     */
    async updateContent(id, content) {
        const node = this.findNode(id);
        if (!node || node.type !== 'file') return false;
        node.content = content;
        await this._saveToDB();
        return true;
    }

    /**
     * 获取路径
     */
    getPath(id, node = this.root) {
        if (node.id === id) return node.name;
        if (node.children) {
            for (const child of node.children) {
                const p = this.getPath(id, child);
                if (p !== null) return node.name === 'workspace' ? p : node.name + '/' + p;
            }
        }
        return null;
    }

    /**
     * 收集所有文件（用于写入 VFS）
     */
    collectFiles(node = this.root, prefix = '') {
        const files = [];
        if (node.type === 'file') {
            files.push({ path: prefix + node.name, content: node.content });
        }
        if (node.children) {
            const dir = prefix;
            for (const child of node.children) {
                if (child.type === 'folder') {
                    files.push(...this.collectFiles(child, dir + child.name + '/'));
                } else {
                    files.push({ path: dir + child.name, content: child.content });
                }
            }
        }
        return files;
    }

    /**
     * 排序子节点（文件夹优先，然后按字母排序）
     */
    sortChildren(node) {
        if (!node.children) return;
        node.children.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * 获取唯一名称（避免重名）
     */
    getUniqueName(parentId, baseName, type) {
        const parent = this.findNode(parentId);
        if (!parent) return baseName;
        const names = new Set(parent.children.filter(c => c.type === type).map(c => c.name));
        if (!names.has(baseName)) return baseName;
        const dot = baseName.lastIndexOf('.');
        const namePart = dot > 0 ? baseName.substring(0, dot) : baseName;
        const ext = dot > 0 ? baseName.substring(dot) : '';
        let i = 2;
        while (names.has(namePart + i + ext)) i++;
        return namePart + i + ext;
    }

    /**
     * 导出整个文件系统为 JSON（用于备份）
     */
    exportJSON() {
        return JSON.stringify(this._serializeNode(this.root), null, 2);
    }

    /**
     * 从 JSON 导入文件系统（用于恢复备份）
     */
    async importJSON(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            this.root = this._deserializeNode(data);
            await this._saveToDB();
            return true;
        } catch (e) {
            console.error('Failed to import filesystem:', e);
            return false;
        }
    }

    /**
     * 重置为默认文件系统
     */
    async reset() {
        this.root = this._createDefaultFS();
        await this._saveToDB();
    }
}

/* =========================================================
   Tab Model
   ========================================================= */
const DEFAULT_OUTPUT_HTML = '<div class="empty-state" id="output-empty"><div>点击"运行"按钮执行代码</div></div>';
const DEFAULT_PROBLEMS_HTML = '<div class="empty-state" id="problems-empty"><div>暂无问题</div></div>';

let _tabCounter = 0;

function createTabModel(name, fileId, code) {
    _tabCounter++;
    return {
        id: 'tab_' + _tabCounter,
        name: name || ('Untitled-' + _tabCounter),
        fileId: fileId,
        code: code || '',
        originalCode: code || '',
        modified: false,
        outputHtml: DEFAULT_OUTPUT_HTML,
        problemsHtml: DEFAULT_PROBLEMS_HTML,
        errorCount: 0,
        activeBottomTab: 'output',
        editorViewState: null,
    };
}

/* =========================================================
   Context Menu Helper
   ========================================================= */
class ContextMenu {
    constructor(elementId) {
        this.el = document.getElementById(elementId);
        this._hideOnClick = () => this.hide();
    }

    show(x, y, onAction) {
        this.el.style.left = x + 'px';
        this.el.style.top = y + 'px';
        this.el.classList.add('visible');
        this._onAction = onAction;
        this.el.querySelectorAll('.context-menu-item').forEach(item => {
            item.onclick = (e) => {
                e.stopPropagation();
                this.hide();
                if (this._onAction) this._onAction(item.dataset.action);
            };
        });
        setTimeout(() => document.addEventListener('click', this._hideOnClick), 0);
    }

    hide() {
        this.el.classList.remove('visible');
        document.removeEventListener('click', this._hideOnClick);
    }
}

/* =========================================================
   Main Class
   ========================================================= */
class CifaPlayground {
    constructor() {
        this.editor = null;
        this.cifaModule = null;
        this.isReady = false;
        this.lintTimeout = null;
        this.lintDelay = 500;

        this.fs = new IDBFileSystem();

        // Multi-tab state
        this.tabs = [];
        this.activeTabId = null;

        this._suppressContentChange = false;

        // Expanded folder state
        this.expandedFolders = new Set();

        // Context menus
        this.fileContextMenu = new ContextMenu('context-menu-file');
        this.folderContextMenu = new ContextMenu('context-menu-folder');
        this.tabContextMenu = new ContextMenu('context-menu-tab');

        // Track context menu target
        this._contextTargetId = null;
        this._contextTabId = null;
    }

    /* ---- Bootstrap ---- */
    async init() {
        this.checkFileProtocolWarning();

        // 初始化 IDBFS
        await this.fs.init();
        this.expandedFolders.add(this.fs.root.id); // root always expanded

        await this.initCifa();
        await this.initEditor();
        this.initUI();
        this.initSashes();
    }

    /* ---- Protocol Warning ---- */
    checkFileProtocolWarning() {
        if (window.location.protocol === 'file:') {
            const tip = '检测到 file:// 打开页面。WASM 在多数浏览器会被跨域/安全策略拦截，请改用本地 HTTP 服务访问。';
            this.appendOutput('error', tip);
            console.warn(tip);
        }
    }

    /* ---- WASM Init ---- */
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

    /* ---- Monaco Editor ---- */
    async initEditor() {
        return new Promise((resolve) => {
            require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' } });
            require(['vs/editor/editor.main'], () => {
                monaco.languages.register({ id: 'cifa' });
                monaco.languages.setMonarchTokensProvider('cifa', {
                    keywords: ['auto', 'break', 'case', 'continue', 'default', 'do', 'else', 'for', 'if', 'return', 'struct', 'switch', 'while', 'int', 'float', 'double', 'string', 'char', 'true', 'false', 'include'],
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
                    value: '',
                    language: 'cifa',
                    theme: 'vs-dark',
                    fontSize: 14,
                    fontFamily: "'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace",
                    minimap: { enabled: true },
                    automaticLayout: true,
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorSmoothCaretAnimation: 'on',
                    bracketPairColorization: { enabled: true },
                });

                this.editor.onDidChangeModelContent(() => {
                    this.scheduleLint();
                    if (this._suppressContentChange) return;
                    const tab = this.getActiveTab();
                    if (tab) {
                        const currentCode = this.editor.getValue();
                        tab.modified = (currentCode !== tab.originalCode);
                        tab.code = currentCode;
                        // Sync to file tree
                        this.syncTabToFile(tab);
                        this.renderTabs();
                    }
                });

                this.editor.onDidChangeCursorPosition((e) => {
                    const el = document.getElementById('status-cursor');
                    if (el) {
                        el.textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
                    }
                });

                resolve();
            });
        });
    }

    /* ---- UI Initialization ---- */
    initUI() {
        this.renderFileTree();
        this.populateSelect();
        this.bindToolbar();
        this.bindBottomTabs();
        this.bindActivityBar();
        this.bindPanelToggle();
        this.bindTabBarDoubleClick();
        this.bindNewFileFolderButtons();
        this.bindContextMenuHide();

        // Open default main.c
        const mainNode = this.fs.root.children.find(c => c.name === 'main.c');
        if (mainNode) {
            this.openFile(mainNode.id);
        }
    }

    /* ---- Get active tab ---- */
    getActiveTab() {
        return this.tabs.find(t => t.id === this.activeTabId) || null;
    }

    /* ---- Switch to tab by file name ---- */
    switchToTabByName(fileName) {
        const tab = this.tabs.find(t => t.name === fileName);
        if (tab) this.activateTab(tab.id);
    }

    /* ---- Convert JS array to Emscripten VectorString ---- */
    toVectorString(arr) {
        const v = new this.cifaModule.VectorString();
        for (const s of arr) v.push_back(s);
        return v;
    }

    disposeVectorString(...vecs) {
        for (const v of vecs) this.disposeEmbind(v);
    }

    /* ---- Populate Toolbar Select ---- */
    populateSelect() {
        const select = document.getElementById('example-select');
        for (const group of EXAMPLE_GROUPS) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = group.name;
            for (const item of group.items) {
                const opt = document.createElement('option');
                opt.value = item.id;
                opt.textContent = item.name;
                optgroup.appendChild(opt);
            }
            select.appendChild(optgroup);
        }
    }

    /* ---- Bind Toolbar ---- */
    bindToolbar() {
        document.getElementById('btn-run').onclick = () => this.run();
        document.getElementById('btn-clear').onclick = () => {
            const tab = this.getActiveTab();
            if (tab) {
                tab.outputHtml = DEFAULT_OUTPUT_HTML;
                this.renderOutputView();
            }
        };

        const select = document.getElementById('example-select');
        select.onchange = () => {
            if (select.value) {
                this.openExampleAsFile(select.value);
                select.value = '';
            }
        };
    }

    /* ---- Bind New File/Folder Buttons ---- */
    bindNewFileFolderButtons() {
        document.getElementById('btn-new-file').onclick = () => this.createNewFile(this.fs.root.id);
        document.getElementById('btn-new-folder').onclick = () => this.createNewFolder(this.fs.root.id);
    }

    /* ---- Bind context menu hide on scroll/resize ---- */
    bindContextMenuHide() {
        const hideAll = () => {
            this.fileContextMenu.hide();
            this.folderContextMenu.hide();
            this.tabContextMenu.hide();
        };
        document.getElementById('file-tree').addEventListener('scroll', hideAll);
        window.addEventListener('resize', hideAll);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideAll(); });
    }

    /* ---- Bind Bottom Tabs ---- */
    bindBottomTabs() {
        document.querySelectorAll('.bottom-tab').forEach((tab) => {
            tab.addEventListener('click', () => this.selectBottomTab(tab.dataset.tab));
        });
    }

    /* ---- Bind Activity Bar ---- */
    bindActivityBar() {
        document.getElementById('activity-explorer').addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            const sash = document.getElementById('sash-sidebar');
            const activityItem = document.getElementById('activity-explorer');

            const isHidden = sidebar.classList.toggle('hidden');
            sash.style.display = isHidden ? 'none' : '';
            activityItem.classList.toggle('active', !isHidden);
        });
    }

    /* ---- Bind Panel Toggle ---- */
    bindPanelToggle() {
        document.getElementById('btn-toggle-panel').addEventListener('click', () => {
            const panel = document.getElementById('bottom-panel');
            const sash = document.getElementById('sash-horizontal');
            const collapsed = panel.classList.toggle('collapsed');
            sash.style.display = collapsed ? 'none' : '';
        });
    }

    /* ---- Bind Tab Bar Double-Click ---- */
    bindTabBarDoubleClick() {
        const tabBar = document.getElementById('editor-tabs-bar');
        tabBar.addEventListener('dblclick', (e) => {
            if (e.target === tabBar || e.target.closest('.editor-tab') === null) {
                this.createNewFile(this.fs.root.id);
            }
        });
    }

    /* =========================================================
       Open Example as File (from dropdown)
       ========================================================= */
    async openExampleAsFile(exampleId) {
        const item = EXAMPLES_MAP.get(exampleId);
        if (!item) return;

        let fileName = item.name + '.c';

        // Check if a file with this name already exists in root
        const existing = this.fs.root.children.find(c => c.type === 'file' && c.name === fileName);
        if (existing) {
            // Update existing file content
            await this.fs.updateContent(existing.id, item.code);
            // Close existing tab so openFile creates a fresh one
            const existingTab = this.tabs.find(t => t.fileId === existing.id);
            if (existingTab) {
                this.closeTab(existingTab.id);
            }
            this.openFile(existing.id);
        } else {
            // Create new file in root with unique name
            fileName = this.fs.getUniqueName(this.fs.root.id, fileName, 'file');
            const fileNode = await this.fs.addFile(this.fs.root.id, fileName, item.code);
            if (fileNode) {
                this.openFile(fileNode.id);
                this.renderFileTree();
            }
        }
    }

    /* =========================================================
       File Explorer Operations
       ========================================================= */

    /* ---- Create New File ---- */
    async createNewFile(parentId) {
        const name = this.fs.getUniqueName(parentId, 'untitled.c', 'file');
        const fileNode = await this.fs.addFile(parentId, name, '');
        if (fileNode) {
            this.expandedFolders.add(parentId);
            this.renderFileTree();
            this.openFile(fileNode.id);
            this.startRename(fileNode.id);
        }
    }

    /* ---- Create New Folder ---- */
    async createNewFolder(parentId) {
        const name = this.fs.getUniqueName(parentId, 'newFolder', 'folder');
        const folderNode = await this.fs.addFolder(parentId, name);
        if (folderNode) {
            this.expandedFolders.add(parentId);
            this.renderFileTree();
            this.startRename(folderNode.id);
        }
    }

    /* ---- Open File in Tab ---- */
    openFile(fileId) {
        // Check if already open
        const existingTab = this.tabs.find(t => t.fileId === fileId);
        if (existingTab) {
            this.activateTab(existingTab.id);
            return;
        }

        const node = this.fs.findNode(fileId);
        if (!node || node.type !== 'file') return;

        const fileContent = node.content;
        const tab = createTabModel(node.name, node.id, fileContent);
        tab.originalCode = fileContent;
        this.tabs.push(tab);
        this.activeTabId = tab.id;

        this._suppressContentChange = true;
        try {
            this.editor.setValue(fileContent);
        } finally {
            this._suppressContentChange = false;
        }

        this.restoreBottomPanelState(tab);
        this.scheduleLint();
        this.renderTabs();
        this.renderFileTree();
    }

    /* ---- Sync Tab Content to File Node ---- */
    async syncTabToFile(tab) {
        if (!tab.fileId) return;
        await this.fs.updateContent(tab.fileId, tab.code);
    }

    /* =========================================================
       Multi-Tab Core Logic
       ========================================================= */

    /* ---- Activate Tab ---- */
    activateTab(tabId, forceRefresh = false) {
        const oldTab = this.getActiveTab();
        const newTab = this.tabs.find(t => t.id === tabId);
        if (!newTab) return;
        if (oldTab && oldTab.id === tabId && !forceRefresh) return;

        if (oldTab && oldTab.id !== tabId) {
            oldTab.code = this.editor.getValue();
            oldTab.editorViewState = this.editor.saveViewState();
            this.saveBottomPanelState(oldTab);
        }

        this.activeTabId = tabId;

        this._suppressContentChange = true;
        try {
            this.editor.setValue(newTab.code);
            if (newTab.editorViewState) {
                this.editor.restoreViewState(newTab.editorViewState);
            }
        } finally {
            this._suppressContentChange = false;
        }

        this.restoreBottomPanelState(newTab);
        this.scheduleLint();
        this.renderTabs();
        this.renderFileTree();
    }

    /* ---- Save Bottom Panel State ---- */
    saveBottomPanelState(tab) {
        if (!tab) return;
        const outputView = document.getElementById('view-output');
        const problemsView = document.getElementById('view-problems');
        if (outputView) tab.outputHtml = outputView.innerHTML;
        if (problemsView) tab.problemsHtml = problemsView.innerHTML;

        const badge = document.getElementById('error-count');
        if (badge) tab.errorCount = parseInt(badge.textContent, 10) || 0;

        const activeBottomTab = document.querySelector('.bottom-tab.active');
        if (activeBottomTab) tab.activeBottomTab = activeBottomTab.dataset.tab;
    }

    /* ---- Restore Bottom Panel State ---- */
    restoreBottomPanelState(tab) {
        if (!tab) return;
        const outputView = document.getElementById('view-output');
        const problemsView = document.getElementById('view-problems');
        if (outputView) outputView.innerHTML = tab.outputHtml;
        if (problemsView) problemsView.innerHTML = tab.problemsHtml;

        const badge = document.getElementById('error-count');
        if (badge) {
            badge.textContent = String(tab.errorCount);
            badge.classList.toggle('visible', tab.errorCount > 0);
        }

        this.selectBottomTab(tab.activeBottomTab);
    }

    /* ---- Close Tab ---- */
    closeTab(tabId) {
        const index = this.tabs.findIndex(t => t.id === tabId);
        if (index === -1) return;

        if (tabId === this.activeTabId) {
            let nextIndex = index > 0 ? index - 1 : index + 1;
            if (nextIndex >= this.tabs.length) nextIndex = this.tabs.length - 1;

            this.tabs.splice(index, 1);

            if (this.tabs.length === 0) {
                const newTab = createTabModel(null, null, '');
                this.tabs.push(newTab);
                this.activateTab(newTab.id, true);
            } else {
                const nextTabId = this.tabs[Math.min(nextIndex, this.tabs.length - 1)].id;
                this.activateTab(nextTabId, true);
            }
        } else {
            this.tabs.splice(index, 1);
            this.renderTabs();
        }
    }

    /* ---- Close Other Tabs ---- */
    closeOtherTabs(tabId) {
        this.tabs = this.tabs.filter(t => t.id === tabId);
        this.activeTabId = null;
        this.activateTab(tabId, true);
    }

    /* ---- Close All Tabs ---- */
    closeAllTabs() {
        this.tabs = [];
        this.activeTabId = null;
        const newTab = createTabModel(null, null, '');
        this.tabs.push(newTab);
        this.activateTab(newTab.id, true);
    }

    /* ---- Render Tabs ---- */
    renderTabs() {
        const container = document.getElementById('editor-tabs-bar');
        container.innerHTML = '';

        for (const tab of this.tabs) {
            const el = document.createElement('div');
            el.className = 'editor-tab' + (tab.id === this.activeTabId ? ' active' : '') + (tab.modified ? ' modified' : '');
            el.dataset.tabId = tab.id;

            const nameSpan = document.createElement('span');
            nameSpan.textContent = tab.name;

            const dotSpan = document.createElement('span');
            dotSpan.className = 'modified-dot';

            const closeBtn = document.createElement('span');
            closeBtn.className = 'close-btn';
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTab(tab.id);
            });

            el.appendChild(nameSpan);
            el.appendChild(dotSpan);
            el.appendChild(closeBtn);

            el.addEventListener('click', () => this.activateTab(tab.id));

            el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._contextTabId = tab.id;
                this.tabContextMenu.show(e.clientX, e.clientY, (action) => {
                    if (action === 'close') this.closeTab(this._contextTabId);
                    else if (action === 'close-others') this.closeOtherTabs(this._contextTabId);
                    else if (action === 'close-all') this.closeAllTabs();
                });
            });

            container.appendChild(el);
        }
    }

    /* =========================================================
       File Tree Rendering
       ========================================================= */
    renderFileTree() {
        const container = document.getElementById('file-tree');
        container.innerHTML = '';
        this.renderTreeNode(container, this.fs.root, 0);
    }

    renderTreeNode(container, node, depth) {
        if (node.type === 'folder') {
            const header = document.createElement('div');
            header.className = 'file-tree-folder-header';
            if (!this.expandedFolders.has(node.id)) header.classList.add('collapsed');
            header.style.setProperty('--depth', depth);
            header.innerHTML = `<span class="folder-chevron">&#9660;</span><span class="folder-icon">${this.getFolderIcon(!this.expandedFolders.has(node.id))}</span><span class="folder-name">${this.escapeHtml(node.name)}</span>`;
            header.dataset.id = node.id;

            const children = document.createElement('div');
            children.className = 'file-tree-children';
            if (!this.expandedFolders.has(node.id)) children.classList.add('collapsed');

            header.addEventListener('click', (e) => {
                if (e.target.classList.contains('rename-input')) return;
                this.expandedFolders.has(node.id) ? this.expandedFolders.delete(node.id) : this.expandedFolders.add(node.id);
                this.renderFileTree();
            });

            header.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._contextTargetId = node.id;
                this.folderContextMenu.show(e.clientX, e.clientY, (action) => {
                    this.handleFolderContextAction(action, node.id);
                });
            });

            container.appendChild(header);

            if (node.children) {
                for (const child of node.children) {
                    this.renderTreeNode(children, child, depth + 1);
                }
            }
            container.appendChild(children);
        } else {
            const item = document.createElement('div');
            item.className = 'file-tree-item';
            const activeTab = this.getActiveTab();
            if (activeTab && activeTab.fileId === node.id) item.classList.add('active');
            item.style.setProperty('--depth', depth);
            item.dataset.id = node.id;
            item.innerHTML = `<span class="file-icon">&#128196;</span><span class="file-name">${this.escapeHtml(node.name)}</span>`;

            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('rename-input')) return;
                this.openFile(node.id);
            });

            item.addEventListener('dblclick', (e) => {
                e.preventDefault();
                this.startRename(node.id);
            });

            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._contextTargetId = node.id;
                this.fileContextMenu.show(e.clientX, e.clientY, (action) => {
                    if (action === 'rename') this.startRename(node.id);
                    else if (action === 'delete') this.deleteFileItem(node.id);
                });
            });

            container.appendChild(item);
        }
    }

    getFolderIcon(collapsed) {
        return collapsed ? '📁' : '📂';
    }

    /* ---- Handle Folder Context Action ---- */
    handleFolderContextAction(action, folderId) {
        if (action === 'new-file') {
            this.expandedFolders.add(folderId);
            this.createNewFile(folderId);
        } else if (action === 'new-folder') {
            this.expandedFolders.add(folderId);
            this.createNewFolder(folderId);
        } else if (action === 'rename') {
            this.startRename(folderId);
        } else if (action === 'delete') {
            this.deleteFileItem(folderId);
        }
    }

    /* ---- Start Rename ---- */
    startRename(nodeId) {
        const node = this.fs.findNode(nodeId);
        if (!node) return;

        const el = document.querySelector(`[data-id="${nodeId}"]`);
        if (!el) return;

        const nameSpan = el.querySelector('.file-name, .folder-name');
        if (!nameSpan) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'rename-input';
        input.value = node.name;

        nameSpan.replaceWith(input);
        input.focus();
        if (node.type === 'file') {
            const dot = node.name.lastIndexOf('.');
            if (dot > 0) input.setSelectionRange(0, dot);
            else input.select();
        } else {
            input.select();
        }

        const commitRename = async () => {
            let newName = input.value.trim();
            if (newName && newName !== node.name) {
                if (!await this.fs.renameNode(nodeId, newName)) {
                    newName = node.name;
                }
                node.name = newName;
            }
            const tab = this.tabs.find(t => t.fileId === nodeId);
            if (tab) {
                tab.name = node.name;
                this.renderTabs();
            }
            this.renderFileTree();
        };

        input.addEventListener('blur', commitRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { input.value = node.name; input.blur(); }
        });
    }

    /* ---- Delete File/Folder ---- */
    async deleteFileItem(nodeId) {
        const node = this.fs.findNode(nodeId);
        if (!node) return;

        const fileIds = new Set();
        if (node.type === 'file') {
            fileIds.add(nodeId);
        } else {
            const collect = (n) => {
                if (n.type === 'file') fileIds.add(n.id);
                if (n.children) n.children.forEach(collect);
            };
            collect(node);
        }

        for (const fid of fileIds) {
            const tab = this.tabs.find(t => t.fileId === fid);
            if (tab) this.closeTab(tab.id);
        }

        await this.fs.deleteNode(nodeId);
        this.renderFileTree();
    }

    /* =========================================================
       Lint & Error
       ========================================================= */
    scheduleLint() {
        if (this.lintTimeout) clearTimeout(this.lintTimeout);
        this.lintTimeout = setTimeout(() => this.lint(), this.lintDelay);
    }

    async lint() {
        if (!this.isReady) return;
        const code = this.editor.getValue();
        const tab = this.getActiveTab();

        let rawErrors;
        if (tab && tab.fileId) {
            // Multi-file lint
            const allFiles = this.fs.collectFiles();
            const paths = this.toVectorString(allFiles.map(f => f.path));
            const contents = this.toVectorString(allFiles.map(f => f.content));
            const node = this.fs.findNode(tab.fileId);
            const filename = node ? node.name : 'main.c';
            rawErrors = this.cifaModule.lintWithFiles(code, filename, paths, contents);
            this.disposeVectorString(paths, contents);
        } else {
            rawErrors = this.cifaModule.lint(code);
        }

        const errors = this.normalizeErrors(rawErrors);
        this.disposeEmbind(rawErrors);
        this.updateProblems(errors);
    }

    normalizeErrors(errors) {
        const mapError = (e) => ({
            filename: String(e.filename || ''),
            line: Number(e.line) || 1,
            col: Number(e.col) || 1,
            message: String(e.message || 'Unknown error')
        });
        if (!errors) return [];
        if (Array.isArray(errors)) {
            return errors.map(mapError);
        }
        if (typeof errors.size === 'function' && typeof errors.get === 'function') {
            const arr = [];
            const sz = errors.size();
            for (let i = 0; i < sz; i++) { arr.push(mapError(errors.get(i))); }
            return arr;
        }
        if (typeof errors.length === 'number') {
            const arr = [];
            for (let i = 0; i < errors.length; i++) { arr.push(mapError(errors[i])); }
            return arr;
        }
        return [];
    }

    disposeEmbind(obj) {
        if (obj && typeof obj.delete === 'function') {
            try { obj.delete(); } catch (_e) { /* ignore */ }
        }
    }

    /* ---- Update Problems Panel ---- */
    updateProblems(errors) {
        errors = errors || [];

        // 只对当前活动文件的错误设置 Monaco 标记（其他文件的行号在当前编辑器中无意义）
        const tab = this.getActiveTab();
        const currentFileName = tab ? tab.name : '';
        const currentFileErrors = errors.filter((e) => !e.filename || e.filename === '<script>' || e.filename === currentFileName);
        const markers = currentFileErrors.map((e) => ({
            startLineNumber: e.line, startColumn: e.col,
            endLineNumber: e.line, endColumn: e.col + 1,
            message: e.message, severity: monaco.MarkerSeverity.Error
        }));
        monaco.editor.setModelMarkers(this.editor.getModel(), 'cifa', markers);

        const badge = document.getElementById('error-count');
        badge.textContent = String(errors.length);
        badge.classList.toggle('visible', errors.length > 0);

        const view = document.getElementById('view-problems');
        if (!errors.length) {
            view.innerHTML = '<div class="empty-state" id="problems-empty"><div>暂无问题</div></div>';
        } else {
            let html = '<table class="problems-table"><thead><tr><th></th><th>描述</th><th>文件</th><th>行</th></tr></thead><tbody>';
            for (let i = 0; i < errors.length; i++) {
                const e = errors[i];
                const fileName = (e.filename && e.filename !== '<script>') ? e.filename : (currentFileName || 'main.c');
                html += `<tr data-line="${e.line}" data-col="${e.col}" data-file="${this.escapeHtml(fileName)}">` +
                    `<td>${ICONS.error}</td>` +
                    `<td class="problem-message">${this.escapeHtml(e.message)}</td>` +
                    `<td class="problem-file">${this.escapeHtml(fileName)}</td>` +
                    `<td class="problem-line">${e.line}</td></tr>`;
            }
            html += '</tbody></table>';
            view.innerHTML = html;

            view.querySelectorAll('tr[data-line]').forEach((row) => {
                row.addEventListener('click', () => {
                    const line = parseInt(row.dataset.line, 10);
                    const col = parseInt(row.dataset.col, 10);
                    const fileName = row.dataset.file;
                    // 如果错误来自其他文件，先切换到该文件的标签页
                    if (fileName && fileName !== '<script>' && fileName !== currentFileName) {
                        this.switchToTabByName(fileName);
                    }
                    this.editor.revealLineInCenter(line);
                    this.editor.setPosition({ lineNumber: line, column: col });
                    this.editor.focus();
                });
            });
        }

        if (tab) tab.errorCount = errors.length;
    }

    /* =========================================================
       Output
       ========================================================= */
    clearOutput() {
        const view = document.getElementById('view-output');
        if (view) view.innerHTML = '';
    }

    appendOutput(type, text) {
        const output = document.getElementById('view-output');
        if (!output) return;

        const line = document.createElement('div');
        line.className = `output-line output-${type}`;
        line.textContent = text;
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    }

    /* =========================================================
       Run (Multi-File Support)
       ========================================================= */
    async run() {
        if (!this.isReady) return;

        this.clearOutput();
        this.updateProblems([]);

        const tab = this.getActiveTab();
        if (!tab) return;

        // Sync current editor content to file tree
        await this.syncTabToFile(tab);

        const code = tab.code;
        const startTime = performance.now();
        let result;

        try {
            if (tab.fileId) {
                // Multi-file execution
                const allFiles = this.fs.collectFiles();
                const paths = this.toVectorString(allFiles.map(f => f.path));
                const contents = this.toVectorString(allFiles.map(f => f.content));
                const node = this.fs.findNode(tab.fileId);
                const filename = node ? node.name : 'main.c';
                result = this.cifaModule.executeWithFiles(code, filename, paths, contents);
                this.disposeVectorString(paths, contents);
            } else {
                result = this.cifaModule.execute(code);
            }
        } catch (err) {
            result = { success: false, runtimeError: 'Execution crashed: ' + err.message, errors: [], value: '', output: '' };
        }

        const duration = Math.round((performance.now() - startTime) * 100) / 100;
        const rawErrors = result && result.errors ? result.errors : [];
        const errors = this.normalizeErrors(rawErrors);
        this.disposeEmbind(rawErrors);
        this.updateProblems(errors);

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
            this.selectBottomTab('problems');
        } else {
            this.selectBottomTab('output');
        }
    }

    /* =========================================================
       Sashes (Draggable Dividers)
       ========================================================= */
    initSashes() {
        this.initHorizontalSash();
        this.initVerticalSash();
    }

    initHorizontalSash() {
        const sash = document.getElementById('sash-horizontal');
        const panel = document.getElementById('bottom-panel');
        const centerArea = document.querySelector('.center-area');
        if (!sash || !panel || !centerArea) return;

        let startY = 0;
        let startHeight = 0;

        const onMouseDown = (e) => {
            e.preventDefault();
            startY = e.clientY;
            startHeight = panel.offsetHeight;
            sash.classList.add('active');
            document.body.classList.add('no-select');

            const overlay = document.createElement('div');
            overlay.className = 'drag-overlay';
            overlay.style.cursor = 'ns-resize';
            document.body.appendChild(overlay);

            const onMouseMove = (ev) => {
                const dy = startY - ev.clientY;
                const centerHeight = centerArea.offsetHeight;
                const minPanel = 80;
                const maxPanel = centerHeight - 100 - 4;
                panel.style.height = Math.max(minPanel, Math.min(startHeight + dy, maxPanel)) + 'px';
                if (this.editor) this.editor.layout();
            };

            const onMouseUp = () => {
                sash.classList.remove('active');
                document.body.classList.remove('no-select');
                overlay.remove();
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                if (this.editor) this.editor.layout();
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        sash.addEventListener('mousedown', onMouseDown);

        sash.addEventListener('dblclick', () => {
            panel.style.height = '220px';
            if (this.editor) this.editor.layout();
        });
    }

    initVerticalSash() {
        const sash = document.getElementById('sash-sidebar');
        const sidebar = document.getElementById('sidebar');
        if (!sash || !sidebar) return;

        let startX = 0;
        let startWidth = 0;

        const onMouseDown = (e) => {
            e.preventDefault();
            startX = e.clientX;
            startWidth = sidebar.offsetWidth;
            sash.classList.add('active');
            document.body.classList.add('no-select');

            const overlay = document.createElement('div');
            overlay.className = 'drag-overlay';
            overlay.style.cursor = 'ew-resize';
            document.body.appendChild(overlay);

            const onMouseMove = (ev) => {
                const dx = ev.clientX - startX;
                const newWidth = Math.max(180, Math.min(startWidth + dx, 500));
                sidebar.style.width = newWidth + 'px';
                if (this.editor) this.editor.layout();
            };

            const onMouseUp = () => {
                sash.classList.remove('active');
                document.body.classList.remove('no-select');
                overlay.remove();
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                if (this.editor) this.editor.layout();
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        sash.addEventListener('mousedown', onMouseDown);

        sash.addEventListener('dblclick', () => {
            sidebar.style.width = '260px';
            if (this.editor) this.editor.layout();
        });
    }

    /* =========================================================
       Bottom Tabs
       ========================================================= */
    selectBottomTab(tabName) {
        document.querySelectorAll('.bottom-tab').forEach((t) => t.classList.remove('active'));
        document.querySelectorAll('.bottom-panel-view').forEach((v) => v.classList.remove('active'));

        const tab = document.querySelector(`.bottom-tab[data-tab="${tabName}"]`);
        const view = document.getElementById(`view-${tabName}`);
        if (tab) tab.classList.add('active');
        if (view) view.classList.add('active');

        const activeTab = this.getActiveTab();
        if (activeTab) activeTab.activeBottomTab = tabName;
    }

    /* ---- Render Output View ---- */
    renderOutputView() {
        const tab = this.getActiveTab();
        if (!tab) return;
        const view = document.getElementById('view-output');
        if (view) view.innerHTML = tab.outputHtml;
    }

    /* ---- Status Bar ---- */
    updateStatus(ready, message) {
        const dot = document.getElementById('status-dot');
        const text = document.getElementById('status-text');

        dot.classList.remove('loading');
        if (ready) {
            dot.style.background = '#4caf50';
            text.textContent = '就绪';
            return;
        }

        dot.style.background = '#f48771';
        text.textContent = message ? `初始化失败: ${message}` : '初始化失败';
    }

    /* =========================================================
       Utility
       ========================================================= */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/* ---- Launch ---- */
const app = new CifaPlayground();
app.init();
