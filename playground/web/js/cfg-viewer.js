export class CfgGraphViewer {
    constructor() {
        this.overlay = document.getElementById('cfg-overlay');
        this.dialog = document.getElementById('cfg-dialog');
        this.canvas = document.getElementById('cfg-canvas');
        this.canvasWrap = document.getElementById('cfg-canvas-wrap');
        this.ctx = this.canvas.getContext('2d');
        this.functionList = document.getElementById('cfg-function-list');
        this.functionCount = document.getElementById('cfg-function-count');
        this.inspector = document.getElementById('cfg-inspector');
        this.stats = document.getElementById('cfg-stats');
        this.currentFunction = document.getElementById('cfg-current-function');
        this.zoomValue = document.getElementById('cfg-zoom-value');
        this.nodeSummary = document.getElementById('cfg-node-summary');
        this.selectionSummary = document.getElementById('cfg-selection-summary');
        this.windowTitle = document.getElementById('cfg-window-title');

        this.payload = null;
        this.meta = {};
        this.functions = [];
        this.functionMap = new Map();
        this.activeFunctionId = '';
        this.graph = { nodes: [], edges: [], nodeMap: new Map(), data: null };
        this.selectionId = '';
        this.showCallEdges = true;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.viewWidth = 1;
        this.viewHeight = 1;
        this.dpr = 1;
        this.worldBounds = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
        this.drag = null;
        this._bindEvents();
    }

    show(payload, meta = {}) {
        this.payload = payload || {};
        this.meta = meta || {};
        this.functions = Array.isArray(this.payload.functions) ? this.payload.functions : [];
        this.functionMap = new Map(this.functions.map((fn) => [fn.id, fn]));
        this.windowTitle.textContent = '程序控制流图' + (this.meta.fileName ? ' — ' + this.meta.fileName : '');

        this.overlay.classList.remove('hidden');
        document.body.classList.add('cfg-open');
        this._renderFunctionList();
        this._updateStats();

        const preferred = this.functions.find((fn) => fn.id === 'root') || this.functions[0];
        if (preferred && this.payload.success !== false) {
            this.selectFunction(preferred.id, true);
        } else {
            this.activeFunctionId = '';
            this.graph = { nodes: [], edges: [], nodeMap: new Map(), data: null };
            this.selectionId = '';
            this._renderInspector(null);
            this._updateStats();
            this._resizeCanvas();
            this._render();
        }

        requestAnimationFrame(() => {
            this._resizeCanvas();
            if (this.graph.nodes.length) this.fit();
            else this._render();
        });
    }

    hide() {
        this.overlay.classList.add('hidden');
        document.body.classList.remove('cfg-open');
        this.drag = null;
    }

    selectFunction(id, shouldFit = false) {
        const fn = this.functionMap.get(id);
        if (!fn) return;
        this.activeFunctionId = id;
        this.selectionId = '';
        this._renderFunctionList();
        this.currentFunction.textContent = fn.name + (fn.arity ? '/' + fn.arity : '') + ' · ' + fn.blocks.length + ' blocks';
        this._buildGraph(fn);
        this._layoutGraph();
        this._renderInspector(null);
        this._updateStats();
        this._resizeCanvas();
        if (shouldFit) this.fit();
        else this._render();
    }

    fit() {
        if (!this.graph.nodes.length) {
            this.zoom = 1;
            this.panX = this.viewWidth / 2;
            this.panY = this.viewHeight / 2;
            this._render();
            return;
        }
        const padding = 42;
        const width = Math.max(1, this.worldBounds.maxX - this.worldBounds.minX);
        const height = Math.max(1, this.worldBounds.maxY - this.worldBounds.minY);
        const scaleX = (this.viewWidth - padding * 2) / width;
        const scaleY = (this.viewHeight - padding * 2) / height;
        this.zoom = Math.max(0.06, Math.min(2.5, Math.min(scaleX, scaleY)));
        const centerX = (this.worldBounds.minX + this.worldBounds.maxX) / 2;
        const centerY = (this.worldBounds.minY + this.worldBounds.maxY) / 2;
        this.panX = this.viewWidth / 2 - centerX * this.zoom;
        this.panY = this.viewHeight / 2 - centerY * this.zoom;
        this._render();
    }

    zoomBy(factor) {
        this._zoomAt(this.viewWidth / 2, this.viewHeight / 2, this.zoom * factor);
    }

    _bindEvents() {
        document.getElementById('cfg-close').addEventListener('click', () => this.hide());
        document.getElementById('cfg-maximize').addEventListener('click', () => {
            this.dialog.classList.toggle('maximized');
            requestAnimationFrame(() => {
                this._resizeCanvas();
                this.fit();
            });
        });
        document.getElementById('cfg-fit').addEventListener('click', () => this.fit());
        document.getElementById('cfg-zoom-in').addEventListener('click', () => this.zoomBy(1.2));
        document.getElementById('cfg-zoom-out').addEventListener('click', () => this.zoomBy(1 / 1.2));
        document.getElementById('cfg-call-edges').addEventListener('change', (event) => {
            this.showCallEdges = event.target.checked;
            const fn = this.functionMap.get(this.activeFunctionId);
            if (!fn) return;
            this._buildGraph(fn);
            this._layoutGraph();
            this._updateStats();
            this.fit();
        });

        this.functionList.addEventListener('click', (event) => {
            const item = event.target.closest('.cfg-function-item');
            if (item) this.selectFunction(item.dataset.functionId, true);
        });

        this.inspector.addEventListener('click', (event) => {
            const button = event.target.closest('[data-target-function]');
            if (!button) return;
            this.selectFunction(button.dataset.targetFunction, true);
        });

        this.overlay.addEventListener('pointerdown', (event) => {
            if (event.target === this.overlay) this.hide();
        });

        this.canvas.addEventListener('pointerdown', (event) => this._onPointerDown(event));
        this.canvas.addEventListener('pointermove', (event) => this._onPointerMove(event));
        this.canvas.addEventListener('pointerup', (event) => this._onPointerUp(event));
        this.canvas.addEventListener('pointercancel', () => {
            this.drag = null;
            this.canvas.classList.remove('dragging');
        });
        this.canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            const factor = Math.exp(-event.deltaY * 0.0012);
            this._zoomAt(event.offsetX, event.offsetY, this.zoom * factor);
        }, { passive: false });

        document.addEventListener('keydown', (event) => {
            if (this.overlay.classList.contains('hidden')) return;
            if (event.key === 'Escape') this.hide();
            else if (event.key === '0' && !event.ctrlKey && !event.metaKey) this.fit();
            else if ((event.key === '+' || event.key === '=') && !event.ctrlKey && !event.metaKey) this.zoomBy(1.2);
            else if (event.key === '-' && !event.ctrlKey && !event.metaKey) this.zoomBy(1 / 1.2);
        });

        if (window.ResizeObserver) {
            this._resizeObserver = new ResizeObserver(() => {
                this._resizeCanvas();
                this._render();
            });
            this._resizeObserver.observe(this.canvasWrap);
        }
    }

    _renderFunctionList() {
        this.functionCount.textContent = String(this.functions.length);
        this.functionList.innerHTML = '';
        for (const fn of this.functions) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'cfg-function-item' + (fn.id === this.activeFunctionId ? ' active' : '');
            button.dataset.functionId = fn.id;
            const parameters = fn.parameters && fn.parameters.length ? fn.parameters.join(', ') : 'void';
            const returnType = fn.returnType ? fn.returnType + ' ' : '';
            button.innerHTML =
                '<div class="cfg-function-name"><span>' + this._escape(fn.name) + '</span>' +
                (fn.root ? '<span class="cfg-function-root">ENTRY</span>' : '') + '</div>' +
                '<div class="cfg-function-meta">' + returnType + '(' + this._escape(parameters) + ') · ' +
                fn.blocks.length + ' blocks</div>';
            this.functionList.appendChild(button);
        }
    }

    _updateStats() {
        const fn = this.functionMap.get(this.activeFunctionId);
        if (!this.payload || this.payload.success === false) {
            const error = this._errorMessage();
            this.stats.innerHTML =
                '<span>状态</span><span>失败</span>' +
                '<span>函数</span><span>' + this.functions.length + '</span>';
            this.nodeSummary.textContent = '编译失败，无法生成 CFG';
            this.selectionSummary.textContent = '';
            this.inspector.innerHTML = '<div class="cfg-error-state">' + this._escape(error) + '</div>';
            return;
        }
        const blocks = fn ? fn.blocks.filter((block) => !block.synthetic).length : 0;
        const instructions = fn ? fn.blocks.reduce((sum, block) => sum + block.instructions.length, 0) : 0;
        const edges = this.graph.edges.length;
        this.stats.innerHTML =
            '<span>函数</span><span>' + this.functions.length + '</span>' +
            '<span>基本块</span><span>' + blocks + '</span>' +
            '<span>指令</span><span>' + instructions + '</span>' +
            '<span>控制边</span><span>' + edges + '</span>';
        this.nodeSummary.textContent = '节点 ' + this.graph.nodes.length + ' · 边 ' + this.graph.edges.length;
    }

    _buildGraph(fn) {
        const nodes = [];
        const edges = [];
        const originalIndex = new Map();

        for (let index = 0; index < fn.blocks.length; index++) {
            const block = fn.blocks[index];
            const visibleLimit = 14;
            const visibleInstructions = block.instructions.slice(0, visibleLimit);
            const displayLines = visibleInstructions.map((instruction) => instruction.pc + ': ' + instruction.text);
            if (block.instructions.length > visibleLimit) {
                displayLines.push('+' + (block.instructions.length - visibleLimit) + ' 条指令…');
            }
            if (!displayLines.length) displayLines.push(block.synthetic ? 'EXIT' : '(empty block)');
            const labelText = block.labels && block.labels.length ? ' · ' + block.labels.join(', ') : '';
            const title = block.synthetic
                ? 'EXIT'
                : block.id.toUpperCase() + ' · PC ' + block.start + '–' + Math.max(block.start, block.end - 1) + labelText;
            const node = {
                id: block.id,
                title,
                block,
                instructions: block.instructions,
                lines: displayLines,
                synthetic: !!block.synthetic,
                entry: block.id === fn.entryBlock,
                callTarget: false,
                virtual: false,
                x: 0,
                y: 0,
                w: 0,
                h: 0,
                order: index
            };
            originalIndex.set(node.id, index);
            nodes.push(node);
        }

        for (const edge of fn.edges) edges.push({ ...edge });

        const callNodes = new Map();
        const callEdges = new Set();
        if (this.showCallEdges) {
            for (const block of fn.blocks) {
                for (const instruction of block.instructions) {
                    const call = instruction.call;
                    if (!call || !call.targetFunction || !this.functionMap.has(call.targetFunction)) continue;
                    const target = this.functionMap.get(call.targetFunction);
                    const nodeId = 'call:' + call.targetFunction;
                    if (!callNodes.has(nodeId)) {
                        const targetLabel = target.name + '/' + target.arity;
                        const callNode = {
                            id: nodeId,
                            title: 'CALL ' + targetLabel,
                            block: null,
                            instructions: [],
                            lines: ['↳ ' + targetLabel],
                            synthetic: false,
                            entry: false,
                            callTarget: true,
                            virtual: true,
                            targetFunction: call.targetFunction,
                            x: 0,
                            y: 0,
                            w: 0,
                            h: 0,
                            order: 100000 + callNodes.size
                        };
                        callNodes.set(nodeId, callNode);
                        nodes.push(callNode);
                        originalIndex.set(nodeId, callNode.order);
                    }
                    const key = block.id + '>' + nodeId;
                    if (callEdges.has(key)) continue;
                    callEdges.add(key);
                    edges.push({
                        from: block.id,
                        to: nodeId,
                        fromPc: instruction.pc,
                        toPc: 0,
                        kind: 'call',
                        label: call.name + '/' + call.arity
                    });
                }
            }
        }

        const mono = getComputedStyle(document.documentElement).getPropertyValue('--font-mono');
        this.ctx.font = '11px ' + mono;
        for (const node of nodes) {
            const maxText = node.lines.reduce((max, line) => Math.max(max, this.ctx.measureText(line).width), 0);
            const titleWidth = this.ctx.measureText(node.title).width;
            node.w = Math.max(170, Math.min(360, Math.ceil(Math.max(maxText + 24, titleWidth + 28))));
            node.h = 32 + node.lines.length * 17 + 8;
        }

        this.graph = {
            nodes,
            edges,
            nodeMap: new Map(nodes.map((node) => [node.id, node])),
            data: fn,
            originalIndex
        };
    }

    _layoutGraph() {
        const nodes = this.graph.nodes;
        const edges = this.graph.edges;
        if (!nodes.length) {
            this.worldBounds = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
            return;
        }

        const nodeMap = this.graph.nodeMap;
        const adjacency = new Map(nodes.map((node) => [node.id, []]));
        for (const edge of edges) {
            if (!nodeMap.has(edge.from) || !nodeMap.has(edge.to)) continue;
            adjacency.get(edge.from).push(edge.to);
        }

        const entry = this.graph.data && this.graph.data.entryBlock && nodeMap.has(this.graph.data.entryBlock)
            ? this.graph.data.entryBlock
            : nodes[0].id;
        const depths = new Map([[entry, 0]]);
        const queue = [entry];
        const edgeLookup = new Map();
        for (const edge of edges) edgeLookup.set(edge.from + '>' + edge.to, edge);
        for (let head = 0; head < queue.length; head++) {
            const id = queue[head];
            const depth = depths.get(id) || 0;
            for (const target of adjacency.get(id) || []) {
                const edge = edgeLookup.get(id + '>' + target);
                if (edge && edge.kind === 'call') continue;
                if (!depths.has(target)) {
                    depths.set(target, depth + 1);
                    queue.push(target);
                }
            }
        }

        for (const node of nodes) {
            if (!depths.has(node.id)) depths.set(node.id, 0);
        }

        let maxDepth = Math.max(...nodes.map((node) => depths.get(node.id) || 0));
        for (const node of nodes) {
            if (node.callTarget) depths.set(node.id, maxDepth + 1);
        }
        maxDepth = Math.max(...nodes.map((node) => depths.get(node.id) || 0));

        const layers = Array.from({ length: maxDepth + 1 }, () => []);
        for (const node of nodes) layers[depths.get(node.id) || 0].push(node);
        for (const layer of layers) layer.sort((left, right) => left.order - right.order);

        const layerIndex = new Map();
        const refreshIndex = () => {
            layerIndex.clear();
            for (const layer of layers) layer.forEach((node, index) => layerIndex.set(node.id, index));
        };
        const predecessors = new Map(nodes.map((node) => [node.id, []]));
        const successors = new Map(nodes.map((node) => [node.id, []]));
        for (const edge of edges) {
            if (!nodeMap.has(edge.from) || !nodeMap.has(edge.to) || edge.kind === 'call') continue;
            predecessors.get(edge.to).push(edge.from);
            successors.get(edge.from).push(edge.to);
        }

        for (let pass = 0; pass < 4; pass++) {
            refreshIndex();
            if (pass % 2 === 0) {
                for (let index = 1; index < layers.length; index++) {
                    for (const node of layers[index]) {
                        const values = predecessors.get(node.id).filter((id) => layerIndex.has(id)).map((id) => layerIndex.get(id));
                        node._barycenter = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : layerIndex.get(node.id);
                    }
                    layers[index].sort((left, right) => (left._barycenter - right._barycenter) || (left.order - right.order));
                }
            } else {
                for (let index = layers.length - 2; index >= 0; index--) {
                    for (const node of layers[index]) {
                        const values = successors.get(node.id).filter((id) => layerIndex.has(id)).map((id) => layerIndex.get(id));
                        node._barycenter = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : layerIndex.get(node.id);
                    }
                    layers[index].sort((left, right) => (left._barycenter - right._barycenter) || (left.order - right.order));
                }
            }
        }

        const rowGap = 78;
        const nodeGap = 38;
        const rowWidths = layers.map((layer) => layer.reduce((sum, node) => sum + node.w, 0) + Math.max(0, layer.length - 1) * nodeGap);
        const maxRowWidth = Math.max(1, ...rowWidths);
        let y = 0;
        let minX = 0;
        let maxX = maxRowWidth;
        for (let layerIndexValue = 0; layerIndexValue < layers.length; layerIndexValue++) {
            const layer = layers[layerIndexValue];
            let x = -(rowWidths[layerIndexValue] / 2);
            let maxHeight = 0;
            for (const node of layer) {
                node.x = x;
                node.y = y;
                x += node.w + nodeGap;
                maxHeight = Math.max(maxHeight, node.h);
            }
            y += maxHeight + rowGap;
            minX = Math.min(minX, -rowWidths[layerIndexValue] / 2);
            maxX = Math.max(maxX, rowWidths[layerIndexValue] / 2);
        }

        this.worldBounds = {
            minX: minX - 30,
            minY: -30,
            maxX: maxX + 30,
            maxY: y - rowGap + 30
        };
    }

    _resizeCanvas() {
        const rect = this.canvasWrap.getBoundingClientRect();
        this.viewWidth = Math.max(1, Math.floor(rect.width));
        this.viewHeight = Math.max(1, Math.floor(rect.height));
        this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const width = Math.max(1, Math.floor(this.viewWidth * this.dpr));
        const height = Math.max(1, Math.floor(this.viewHeight * this.dpr));
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
    }

    _render() {
        this._resizeCanvas();
        const ctx = this.ctx;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);

        if (!this.graph.nodes.length) {
            ctx.save();
            ctx.fillStyle = '#9d9d9d';
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(this.payload && this.payload.success === false ? '字节码编译失败，无法生成控制流图' : '暂无可显示的字节码', this.viewWidth / 2, this.viewHeight / 2);
            ctx.restore();
            this.zoomValue.textContent = '100%';
            return;
        }

        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);

        const margin = 80 / this.zoom;
        const visible = {
            minX: (-this.panX / this.zoom) - margin,
            minY: (-this.panY / this.zoom) - margin,
            maxX: (this.viewWidth - this.panX) / this.zoom + margin,
            maxY: (this.viewHeight - this.panY) / this.zoom + margin
        };

        for (const edge of this.graph.edges) {
            const source = this.graph.nodeMap.get(edge.from);
            const target = this.graph.nodeMap.get(edge.to);
            if (!source || !target) continue;
            if (Math.max(source.x + source.w, target.x + target.w) < visible.minX
                || Math.min(source.x, target.x) > visible.maxX
                || Math.max(source.y + source.h, target.y + target.h) < visible.minY
                || Math.min(source.y, target.y) > visible.maxY) continue;
            this._drawEdge(edge, source, target);
        }

        for (const node of this.graph.nodes) {
            if (node.x + node.w < visible.minX || node.x > visible.maxX || node.y + node.h < visible.minY || node.y > visible.maxY) continue;
            this._drawNode(node);
        }

        ctx.restore();
        this.zoomValue.textContent = Math.round(this.zoom * 100) + '%';
    }

    _drawEdge(edge, source, target) {
        const ctx = this.ctx;
        const backEdge = target.y <= source.y || (target.y < source.y + source.h && target.x < source.x);
        const sideRoute = backEdge || edge.kind === 'call';
        let start;
        let end;
        let control1;
        let control2;

        if (sideRoute) {
            const goRight = target.x >= source.x;
            start = { x: goRight ? source.x + source.w : source.x, y: source.y + source.h / 2 };
            end = { x: goRight ? target.x : target.x + target.w, y: target.y + target.h / 2 };
            const distance = Math.max(55, Math.abs(end.x - start.x) * 0.45);
            control1 = { x: start.x + (goRight ? distance : -distance), y: start.y };
            control2 = { x: end.x + (goRight ? distance : -distance), y: end.y };
        } else {
            start = { x: source.x + source.w / 2, y: source.y + source.h };
            end = { x: target.x + target.w / 2, y: target.y };
            const midpoint = (start.y + end.y) / 2;
            control1 = { x: start.x, y: midpoint };
            control2 = { x: end.x, y: midpoint };
        }

        const style = this._edgeStyle(edge.kind, backEdge);
        ctx.save();
        ctx.strokeStyle = style.color;
        ctx.fillStyle = style.color;
        ctx.lineWidth = (style.width || 1.45) / this.zoom;
        ctx.setLineDash(style.dash ? style.dash.map((value) => value / this.zoom) : []);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.bezierCurveTo(control1.x, control1.y, control2.x, control2.y, end.x, end.y);
        ctx.stroke();
        ctx.setLineDash([]);
        this._drawArrowHead(end, control2);
        ctx.restore();

        if (edge.label && (edge.kind === 'true' || edge.kind === 'false' || edge.kind === 'short-circuit' || edge.kind === 'call')) {
            const t = 0.5;
            const oneMinus = 1 - t;
            const labelX = oneMinus * oneMinus * oneMinus * start.x + 3 * oneMinus * oneMinus * t * control1.x + 3 * oneMinus * t * t * control2.x + t * t * t * end.x;
            const labelY = oneMinus * oneMinus * oneMinus * start.y + 3 * oneMinus * oneMinus * t * control1.y + 3 * oneMinus * t * t * control2.y + t * t * t * end.y;
            ctx.save();
            const mono = getComputedStyle(document.documentElement).getPropertyValue('--font-mono');
            ctx.font = (10 / this.zoom) + 'px ' + mono;
            const labelWidth = ctx.measureText(edge.label).width + 8 / this.zoom;
            ctx.fillStyle = '#1e1e1e';
            ctx.strokeStyle = '#3e3e42';
            ctx.lineWidth = 1 / this.zoom;
            ctx.beginPath();
            ctx.roundRect(labelX - labelWidth / 2, labelY - 8 / this.zoom, labelWidth, 16 / this.zoom, 3 / this.zoom);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = style.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(edge.label, labelX, labelY + 0.5 / this.zoom);
            ctx.restore();
        }
    }

    _drawArrowHead(point, control) {
        const ctx = this.ctx;
        const angle = Math.atan2(point.y - control.y, point.x - control.x);
        const size = 7 / this.zoom;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.x - size * Math.cos(angle - Math.PI / 6), point.y - size * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(point.x - size * Math.cos(angle + Math.PI / 6), point.y - size * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }

    _edgeStyle(kind, backEdge) {
        if (backEdge) return { color: '#dcdcaa', dash: [5, 4], width: 1.4 };
        switch (kind) {
            case 'true': return { color: '#4ec9b0', width: 1.6 };
            case 'false': return { color: '#f48771', width: 1.6 };
            case 'short-circuit': return { color: '#dcdcaa', width: 1.5 };
            case 'call': return { color: '#569cd6', dash: [7, 5], width: 1.35 };
            case 'return': return { color: '#c586c0', width: 1.5 };
            case 'exit': return { color: '#f48771', width: 1.6 };
            case 'jump': return { color: '#9d9d9d', width: 1.5 };
            default: return { color: '#858585', width: 1.35 };
        }
    }

    _drawNode(node) {
        const ctx = this.ctx;
        const selected = node.id === this.selectionId;
        ctx.save();
        ctx.shadowColor = selected ? 'rgba(0, 122, 204, 0.5)' : 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = selected ? 12 / this.zoom : 6 / this.zoom;
        ctx.shadowOffsetY = 2 / this.zoom;
        ctx.fillStyle = '#252526';
        ctx.strokeStyle = selected ? '#4fc1ff' : node.callTarget ? '#569cd6' : node.entry ? '#0e639c' : node.synthetic ? '#8a4b4b' : '#4a4a4f';
        ctx.lineWidth = (selected ? 2 : 1.2) / this.zoom;
        ctx.beginPath();
        ctx.roundRect(node.x, node.y, node.w, node.h, 5 / this.zoom);
        ctx.fill();
        ctx.stroke();
        ctx.shadowColor = 'transparent';

        const headerHeight = 27 / this.zoom;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(node.x, node.y, node.w, node.h, 5 / this.zoom);
        ctx.clip();
        ctx.fillStyle = node.callTarget ? '#1f3b52' : node.entry ? '#0e639c' : node.synthetic ? '#5a2f2f' : '#303033';
        ctx.fillRect(node.x, node.y, node.w, headerHeight);
        ctx.restore();

        ctx.fillStyle = '#e7e7e7';
        const mono = getComputedStyle(document.documentElement).getPropertyValue('--font-mono');
        ctx.font = '600 ' + (11 / this.zoom) + 'px ' + mono;
        ctx.textBaseline = 'middle';
        ctx.fillText(this._elide(node.title, node.w - 16 / this.zoom, ctx), node.x + 8 / this.zoom, node.y + headerHeight / 2);

        const lineHeight = 17 / this.zoom;
        const startY = node.y + headerHeight + 8 / this.zoom;
        ctx.font = (10.5 / this.zoom) + 'px ' + mono;
        for (let index = 0; index < node.lines.length; index++) {
            const line = node.lines[index];
            const isInstruction = /^\d+:/.test(line);
            const isMore = line.startsWith('+');
            const isExit = line === 'EXIT';
            ctx.fillStyle = isMore ? '#808080' : isExit ? '#f48771' : node.callTarget ? '#9cdcfe' : isInstruction ? '#cccccc' : '#9d9d9d';
            ctx.fillText(this._elide(line, node.w - 16 / this.zoom, ctx), node.x + 8 / this.zoom, startY + index * lineHeight);
        }
        ctx.restore();
    }

    _elide(text, maxWidth, ctx) {
        if (ctx.measureText(text).width <= maxWidth) return text;
        const suffix = '…';
        let low = 0;
        let high = text.length;
        while (low < high) {
            const middle = Math.ceil((low + high) / 2);
            if (ctx.measureText(text.slice(0, middle) + suffix).width <= maxWidth) low = middle;
            else high = middle - 1;
        }
        return text.slice(0, low) + suffix;
    }

    _onPointerDown(event) {
        this.canvas.setPointerCapture(event.pointerId);
        const point = this._screenToWorld(event.offsetX, event.offsetY);
        const node = this._nodeAt(point.x, point.y);
        if (node) {
            this.drag = {
                type: 'node',
                pointerId: event.pointerId,
                node,
                offsetX: point.x - node.x,
                offsetY: point.y - node.y,
                moved: false,
                startX: event.clientX,
                startY: event.clientY
            };
        } else {
            this.drag = {
                type: 'pan',
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                panX: this.panX,
                panY: this.panY,
                moved: false
            };
        }
        this.canvas.classList.add('dragging');
    }

    _onPointerMove(event) {
        if (!this.drag) {
            const point = this._screenToWorld(event.offsetX, event.offsetY);
            this.canvas.classList.toggle('node-hover', !!this._nodeAt(point.x, point.y));
            return;
        }
        const dx = event.clientX - this.drag.startX;
        const dy = event.clientY - this.drag.startY;
        if (Math.abs(dx) + Math.abs(dy) > 3) this.drag.moved = true;
        if (this.drag.type === 'node') {
            const point = this._screenToWorld(event.offsetX, event.offsetY);
            this.drag.node.x = point.x - this.drag.offsetX;
            this.drag.node.y = point.y - this.drag.offsetY;
        } else {
            this.panX = this.drag.panX + dx;
            this.panY = this.drag.panY + dy;
        }
        this._render();
    }

    _onPointerUp(event) {
        if (!this.drag) return;
        const drag = this.drag;
        this.drag = null;
        this.canvas.classList.remove('dragging');
        try { this.canvas.releasePointerCapture(event.pointerId); } catch (_error) { /* ignore */ }
        if (drag.type === 'node' && !drag.moved) this._setSelection(drag.node.id);
    }

    _zoomAt(screenX, screenY, nextZoom) {
        const clamped = Math.max(0.06, Math.min(3.5, nextZoom));
        const worldX = (screenX - this.panX) / this.zoom;
        const worldY = (screenY - this.panY) / this.zoom;
        this.zoom = clamped;
        this.panX = screenX - worldX * this.zoom;
        this.panY = screenY - worldY * this.zoom;
        this._render();
    }

    _screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.panX) / this.zoom,
            y: (screenY - this.panY) / this.zoom
        };
    }

    _nodeAt(x, y) {
        for (let index = this.graph.nodes.length - 1; index >= 0; index--) {
            const node = this.graph.nodes[index];
            if (x >= node.x && x <= node.x + node.w && y >= node.y && y <= node.y + node.h) return node;
        }
        return null;
    }

    _setSelection(id) {
        this.selectionId = id;
        this._renderInspector(this.graph.nodeMap.get(id) || null);
        this._render();
    }

    _renderInspector(node) {
        if (!node) {
            this.inspector.innerHTML = '<div class="cfg-inspector-empty">选择节点查看详细信息</div>';
            this.selectionSummary.textContent = '';
            return;
        }

        this.selectionSummary.textContent = node.title;
        const meta = node.block
            ? 'PC ' + node.block.start + '–' + Math.max(node.block.start, node.block.end - 1)
            : (node.callTarget ? '跨函数调用' : '虚拟节点');
        let html = '<div class="cfg-inspector-content">' +
            '<div class="cfg-inspector-title">' + this._escape(node.title) + '</div>' +
            '<div class="cfg-inspector-subtitle">' + this._escape(meta) + '</div>';

        if (node.callTarget) {
            const target = this.functionMap.get(node.targetFunction);
            html += '<div class="cfg-inspector-section"><div class="cfg-inspector-section-label">调用目标</div>' +
                '<div class="cfg-call-box">' + this._escape(target ? target.name + '/' + target.arity : node.targetFunction) +
                '<button type="button" class="cfg-call-target" data-target-function="' + this._escape(node.targetFunction) + '">打开函数 CFG</button></div></div>';
        }

        if (node.instructions && node.instructions.length) {
            html += '<div class="cfg-inspector-section"><div class="cfg-inspector-section-label">指令</div>';
            for (const instruction of node.instructions) {
                const source = instruction.source || {};
                const location = [source.file, source.line ? 'L' + source.line : '', source.col ? 'C' + source.col : ''].filter(Boolean).join(':');
                html += '<div class="cfg-instruction">' +
                    '<div class="cfg-instruction-head"><span class="cfg-pc">#' + instruction.pc + '</span><span class="cfg-opcode">' +
                    this._escape(instruction.op) + '</span></div>' +
                    '<div class="cfg-instruction-text">' + this._escape(instruction.text) + '</div>' +
                    (location ? '<div class="cfg-source-location">' + this._escape(location) + '</div>' : '') +
                    (source.text ? '<pre class="cfg-source-code">' + this._escape(source.text) + '</pre>' : '') +
                    '</div>';
            }
            html += '</div>';
        }
        html += '</div>';
        this.inspector.innerHTML = html;
    }

    _errorMessage() {
        if (!this.payload) return '无法加载 CFG 数据';
        if (this.payload.translationError) return this.payload.translationError;
        if (Array.isArray(this.payload.errors) && this.payload.errors.length) {
            return this.payload.errors.map((error) => {
                const location = [error.filename, error.line ? 'L' + error.line : '', error.col ? 'C' + error.col : ''].filter(Boolean).join(':');
                return (location ? location + '\n' : '') + (error.message || '');
            }).join('\n\n');
        }
        return '字节码编译失败';
    }

    _escape(value) {
        const element = document.createElement('div');
        element.textContent = String(value == null ? '' : value);
        return element.innerHTML;
    }
}
