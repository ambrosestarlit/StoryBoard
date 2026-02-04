class StoryboardEditor {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        this.canvasWidth = 1920;
        this.canvasHeight = 1080;
        this.projectName = 'storyboard';
        
        this.storyboards = [];
        this.currentStoryboardIndex = -1;
        this.storyboardIdCounter = 1;
        
        this.tool = 'pen';
        this.brushSize = 3;
        this.isDrawing = false;
        this.points = [];
        this.lineStart = null;
        
        this.tempCanvas = document.createElement('canvas');
        this.tempCanvas.width = this.canvasWidth;
        this.tempCanvas.height = this.canvasHeight;
        this.tempCtx = this.tempCanvas.getContext('2d');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.addStoryboard();
    }
    
    createLayerStructure() {
        return [
            { id: 1, name: 'レイヤー 1', visible: true, history: [], historyIndex: -1, canvas: null, ctx: null },
            { id: 2, name: 'レイヤー 2', visible: true, history: [], historyIndex: -1, canvas: null, ctx: null },
            { id: 3, name: 'レイヤー 3', visible: true, history: [], historyIndex: -1, canvas: null, ctx: null },
            { id: 4, name: 'レイヤー 4', visible: true, history: [], historyIndex: -1, canvas: null, ctx: null }
        ].map(layer => {
            layer.canvas = document.createElement('canvas');
            layer.canvas.width = this.canvasWidth;
            layer.canvas.height = this.canvasHeight;
            layer.ctx = layer.canvas.getContext('2d', { willReadFrequently: true });
            
            const imageData = layer.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
            layer.history.push(imageData);
            layer.historyIndex = 0;
            
            return layer;
        });
    }
    
    resizeAllCanvases(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.tempCanvas.width = width;
        this.tempCanvas.height = height;
        
        this.storyboards.forEach(storyboard => {
            storyboard.layers.forEach(layer => {
                const oldCanvas = layer.canvas;
                layer.canvas = document.createElement('canvas');
                layer.canvas.width = width;
                layer.canvas.height = height;
                layer.ctx = layer.canvas.getContext('2d', { willReadFrequently: true });
                layer.ctx.drawImage(oldCanvas, 0, 0);
                
                layer.history = [];
                const imageData = layer.ctx.getImageData(0, 0, width, height);
                layer.history.push(imageData);
                layer.historyIndex = 0;
            });
        });
        
        this.renderStoryboards();
        this.redrawCanvas();
    }
    
    addStoryboard() {
        const storyboard = {
            id: this.storyboardIdCounter++,
            name: `C-${String(this.storyboards.length + 1).padStart(3, '0')}`,
            layers: this.createLayerStructure(),
            currentLayerIndex: 0
        };
        
        this.storyboards.push(storyboard);
        this.currentStoryboardIndex = this.storyboards.length - 1;
        
        this.renderStoryboards();
        this.renderLayers();
        this.updateUndoRedoButtons();
        this.redrawCanvas();
    }
    
    deleteStoryboard(index) {
        if (this.storyboards.length <= 1) {
            alert('最後のコンテは削除できません');
            return;
        }
        
        if (confirm(`${this.storyboards[index].name}を削除しますか？`)) {
            this.storyboards.splice(index, 1);
            
            this.storyboards.forEach((sb, idx) => {
                sb.name = `C-${String(idx + 1).padStart(3, '0')}`;
            });
            
            if (this.currentStoryboardIndex >= this.storyboards.length) {
                this.currentStoryboardIndex = this.storyboards.length - 1;
            }
            
            this.renderStoryboards();
            this.renderLayers();
            this.updateUndoRedoButtons();
            this.redrawCanvas();
        }
    }
    
    switchStoryboard(index) {
        this.currentStoryboardIndex = index;
        this.renderStoryboards();
        this.renderLayers();
        this.updateUndoRedoButtons();
        this.redrawCanvas();
    }
    
    getCurrentStoryboard() {
        return this.storyboards[this.currentStoryboardIndex];
    }
    
    getCurrentLayers() {
        return this.getCurrentStoryboard().layers;
    }
    
    getCurrentLayerIndex() {
        return this.getCurrentStoryboard().currentLayerIndex;
    }
    
    setCurrentLayerIndex(index) {
        this.getCurrentStoryboard().currentLayerIndex = index;
    }
    
    setupEventListeners() {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.tool = btn.dataset.tool;
                this.updateCursor();
            });
        });
        
        const brushSizeInput = document.getElementById('brushSize');
        const brushSizeValue = document.getElementById('brushSizeValue');
        brushSizeInput.addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            brushSizeValue.textContent = this.brushSize;
        });
        
        const projectNameInput = document.getElementById('projectName');
        projectNameInput.addEventListener('input', (e) => {
            this.projectName = e.target.value || 'storyboard';
        });
        
        document.getElementById('applyCanvasSize').addEventListener('click', () => {
            const width = parseInt(document.getElementById('canvasWidth').value);
            const height = parseInt(document.getElementById('canvasHeight').value);
            if (width >= 100 && width <= 4096 && height >= 100 && height <= 4096) {
                this.resizeAllCanvases(width, height);
            } else {
                alert('キャンバスサイズは100～4096の範囲で指定してください');
            }
        });
        
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('clearLayerBtn').addEventListener('click', () => this.clearCurrentLayer());
        
        document.getElementById('addStoryboardBtn').addEventListener('click', () => this.addStoryboard());
        
        document.getElementById('saveProjectBtn').addEventListener('click', () => this.saveProject());
        document.getElementById('loadProjectBtn').addEventListener('click', () => {
            document.getElementById('loadProjectInput').click();
        });
        document.getElementById('loadProjectInput').addEventListener('change', (e) => this.loadProject(e));
        
        const exportBtn = document.getElementById('exportBtn');
        const exportMenu = document.getElementById('exportMenu');
        
        exportBtn.addEventListener('click', () => {
            exportMenu.classList.toggle('show');
        });
        
        document.addEventListener('click', (e) => {
            if (!exportBtn.contains(e.target) && !exportMenu.contains(e.target)) {
                exportMenu.classList.remove('show');
            }
        });
        
        document.querySelectorAll('.export-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const exportType = e.target.dataset.export;
                exportMenu.classList.remove('show');
                
                if (exportType === 'all') {
                    this.exportAllStoryboards();
                } else if (exportType === 'individual') {
                    this.exportIndividualStoryboards();
                }
            });
        });
        
        this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
        this.canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
        this.canvas.addEventListener('pointerup', (e) => this.handlePointerUp(e));
        this.canvas.addEventListener('pointerleave', (e) => this.handlePointerUp(e));
        
        // タブレット対応：タッチイベント追加
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handlePointerDown(e);
        }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handlePointerMove(e);
        }, { passive: false });
        this.canvas.addEventListener('touchend', (e) => {
            this.handlePointerUp(e);
        }, { passive: false });
        
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    this.undo();
                } else if (e.key === 'z' && e.shiftKey || e.key === 'y') {
                    e.preventDefault();
                    this.redo();
                } else if (e.key === 's') {
                    e.preventDefault();
                    this.saveProject();
                }
            }
        });
    }
    
    updateCursor() {
        this.canvas.className = '';
        if (this.tool === 'eraser') {
            this.canvas.classList.add('eraser-cursor');
        } else if (this.tool === 'line') {
            this.canvas.classList.add('line-cursor');
        }
    }
    
    drawStoryboardNumber(ctx, number, x, y) {
        const label = `C-${String(number).padStart(3, '0')}`;
        const fontSize = Math.max(24, this.canvasWidth / 60);
        const padding = fontSize * 0.4;
        
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        const textMetrics = ctx.measureText(label);
        const textWidth = textMetrics.width;
        const textHeight = fontSize;
        
        const bgWidth = textWidth + padding * 2;
        const bgHeight = textHeight + padding * 2;
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(x, y, bgWidth, bgHeight);
        
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'top';
        ctx.fillText(label, x + padding, y + padding);
    }
    
    renderStoryboards() {
        const storyboardList = document.getElementById('storyboardList');
        storyboardList.innerHTML = '';
        
        this.storyboards.forEach((storyboard, index) => {
            const item = document.createElement('div');
            item.className = 'storyboard-item';
            if (index === this.currentStoryboardIndex) {
                item.classList.add('active');
            }
            
            const thumb = document.createElement('div');
            thumb.className = 'storyboard-thumb';
            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = this.canvasWidth;
            thumbCanvas.height = this.canvasHeight;
            const thumbCtx = thumbCanvas.getContext('2d');
            
            storyboard.layers.forEach(layer => {
                if (layer.visible) {
                    thumbCtx.drawImage(layer.canvas, 0, 0);
                }
            });
            
            thumb.appendChild(thumbCanvas);
            
            const info = document.createElement('div');
            info.className = 'storyboard-info';
            
            const name = document.createElement('div');
            name.className = 'storyboard-name';
            name.textContent = storyboard.name;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'storyboard-delete';
            deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteStoryboard(index);
            });
            
            info.appendChild(name);
            info.appendChild(deleteBtn);
            
            item.appendChild(thumb);
            item.appendChild(info);
            
            item.addEventListener('click', () => this.switchStoryboard(index));
            
            storyboardList.appendChild(item);
        });
    }
    
    renderLayers() {
        const layerList = document.getElementById('layerList');
        layerList.innerHTML = '';
        
        const layers = this.getCurrentLayers();
        const currentLayerIndex = this.getCurrentLayerIndex();
        
        [...layers].reverse().forEach((layer, reverseIndex) => {
            const index = layers.length - 1 - reverseIndex;
            const item = document.createElement('div');
            item.className = 'layer-item';
            if (index === currentLayerIndex) {
                item.classList.add('active');
            }
            
            const visibility = document.createElement('div');
            visibility.className = 'layer-visibility';
            visibility.innerHTML = layer.visible 
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
            
            visibility.addEventListener('click', (e) => {
                e.stopPropagation();
                layer.visible = !layer.visible;
                this.renderLayers();
                this.redrawCanvas();
                this.renderStoryboards();
            });
            
            const name = document.createElement('div');
            name.className = 'layer-name';
            name.textContent = layer.name;
            
            item.appendChild(visibility);
            item.appendChild(name);
            
            item.addEventListener('click', () => {
                this.setCurrentLayerIndex(index);
                this.renderLayers();
                this.updateUndoRedoButtons();
            });
            
            layerList.appendChild(item);
        });
    }
    
    getPointerPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        // タッチイベントの場合はtouchesから取得
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            // touchendの場合
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
            pressure: e.pressure || 0.5
        };
    }
    
    handlePointerDown(e) {
        const pos = this.getPointerPosition(e);
        this.isDrawing = true;
        
        if (this.tool === 'pen' || this.tool === 'eraser') {
            this.points = [pos];
        } else if (this.tool === 'line') {
            this.lineStart = pos;
            this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
        }
    }
    
    handlePointerMove(e) {
        if (!this.isDrawing) return;
        
        const pos = this.getPointerPosition(e);
        
        if (this.tool === 'pen' || this.tool === 'eraser') {
            // タブレット用：前の点との間を補間して滑らかに
            if (this.points.length > 0) {
                const lastPoint = this.points[this.points.length - 1];
                const distance = Math.sqrt(
                    Math.pow(pos.x - lastPoint.x, 2) + 
                    Math.pow(pos.y - lastPoint.y, 2)
                );
                
                // 距離が大きい場合は中間点を補間
                if (distance > 5) {
                    const steps = Math.ceil(distance / 5);
                    for (let i = 1; i <= steps; i++) {
                        const t = i / steps;
                        const interpolated = {
                            x: lastPoint.x + (pos.x - lastPoint.x) * t,
                            y: lastPoint.y + (pos.y - lastPoint.y) * t,
                            pressure: lastPoint.pressure + (pos.pressure - lastPoint.pressure) * t
                        };
                        this.points.push(interpolated);
                        if (this.points.length >= 2) {
                            this.drawSmooth();
                        }
                    }
                } else {
                    this.points.push(pos);
                    this.drawSmooth();
                }
            } else {
                this.points.push(pos);
            }
        } else if (this.tool === 'line' && this.lineStart) {
            this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
            this.tempCtx.strokeStyle = '#000000';
            this.tempCtx.lineWidth = this.brushSize;
            this.tempCtx.lineCap = 'round';
            this.tempCtx.beginPath();
            this.tempCtx.moveTo(this.lineStart.x, this.lineStart.y);
            this.tempCtx.lineTo(pos.x, pos.y);
            this.tempCtx.stroke();
            
            this.redrawCanvas();
        }
    }
    
    handlePointerUp(e) {
        if (!this.isDrawing) return;
        
        if (this.tool === 'line' && this.lineStart) {
            const pos = this.getPointerPosition(e);
            const layers = this.getCurrentLayers();
            const layer = layers[this.getCurrentLayerIndex()];
            
            layer.ctx.strokeStyle = '#000000';
            layer.ctx.lineWidth = this.brushSize;
            layer.ctx.lineCap = 'round';
            layer.ctx.beginPath();
            layer.ctx.moveTo(this.lineStart.x, this.lineStart.y);
            layer.ctx.lineTo(pos.x, pos.y);
            layer.ctx.stroke();
            
            this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
        }
        
        this.isDrawing = false;
        this.points = [];
        this.lineStart = null;
        this.saveState();
        this.updateUndoRedoButtons();
        this.redrawCanvas();
        this.renderStoryboards();
    }
    
    drawSmooth() {
        if (this.points.length < 2) return;
        
        const layers = this.getCurrentLayers();
        const layer = layers[this.getCurrentLayerIndex()];
        const ctx = layer.ctx;
        
        ctx.strokeStyle = '#000000';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (this.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }
        
        const len = this.points.length;
        const p1 = this.points[len - 2];
        const p2 = this.points[len - 1];
        
        const width1 = this.brushSize * (0.5 + p1.pressure * 0.5);
        const width2 = this.brushSize * (0.5 + p2.pressure * 0.5);
        const avgWidth = (width1 + width2) / 2;
        
        ctx.lineWidth = avgWidth;
        ctx.beginPath();
        
        if (len === 2) {
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
        } else {
            const p0 = this.points[len - 3];
            const midX = (p0.x + p1.x) / 2;
            const midY = (p0.y + p1.y) / 2;
            
            ctx.moveTo(midX, midY);
            ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        }
        
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        
        if (this.isDrawing) {
            this.redrawCanvas();
        }
    }
    
    saveState() {
        const layers = this.getCurrentLayers();
        const layer = layers[this.getCurrentLayerIndex()];
        
        layer.history = layer.history.slice(0, layer.historyIndex + 1);
        
        const imageData = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
        layer.history.push(imageData);
        layer.historyIndex++;
        
        if (layer.history.length > 50) {
            layer.history.shift();
            layer.historyIndex--;
        }
    }
    
    undo() {
        const layers = this.getCurrentLayers();
        const layer = layers[this.getCurrentLayerIndex()];
        if (layer.historyIndex > 0) {
            layer.historyIndex--;
            this.restoreState();
            this.updateUndoRedoButtons();
        }
    }
    
    redo() {
        const layers = this.getCurrentLayers();
        const layer = layers[this.getCurrentLayerIndex()];
        if (layer.historyIndex < layer.history.length - 1) {
            layer.historyIndex++;
            this.restoreState();
            this.updateUndoRedoButtons();
        }
    }
    
    restoreState() {
        const layers = this.getCurrentLayers();
        const layer = layers[this.getCurrentLayerIndex()];
        if (layer.history[layer.historyIndex]) {
            layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
            layer.ctx.putImageData(layer.history[layer.historyIndex], 0, 0);
            this.redrawCanvas();
            this.renderStoryboards();
        }
    }
    
    updateUndoRedoButtons() {
        const layers = this.getCurrentLayers();
        const layer = layers[this.getCurrentLayerIndex()];
        document.getElementById('undoBtn').disabled = layer.historyIndex <= 0;
        document.getElementById('redoBtn').disabled = layer.historyIndex >= layer.history.length - 1;
    }
    
    redrawCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const layers = this.getCurrentLayers();
        layers.forEach((layer) => {
            if (layer.visible) {
                this.ctx.drawImage(layer.canvas, 0, 0);
            }
        });
        
        if (this.tool === 'line' && this.isDrawing && this.lineStart) {
            this.ctx.drawImage(this.tempCanvas, 0, 0);
        }
    }
    
    clearCurrentLayer() {
        const layers = this.getCurrentLayers();
        const layer = layers[this.getCurrentLayerIndex()];
        
        if (confirm('現在のレイヤーをクリアしますか？この操作は取り消せません。')) {
            layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
            this.saveState();
            this.redrawCanvas();
            this.renderStoryboards();
        }
    }
    
    saveProject() {
        const projectData = {
            version: 1,
            projectName: this.projectName,
            canvasWidth: this.canvasWidth,
            canvasHeight: this.canvasHeight,
            storyboards: this.storyboards.map(storyboard => ({
                id: storyboard.id,
                name: storyboard.name,
                currentLayerIndex: storyboard.currentLayerIndex,
                layers: storyboard.layers.map(layer => ({
                    id: layer.id,
                    name: layer.name,
                    visible: layer.visible,
                    imageData: layer.canvas.toDataURL('image/png')
                }))
            })),
            currentStoryboardIndex: this.currentStoryboardIndex,
            storyboardIdCounter: this.storyboardIdCounter
        };
        
        const json = JSON.stringify(projectData);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.projectName}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    async loadProject(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const projectData = JSON.parse(text);
            
            if (projectData.projectName) {
                this.projectName = projectData.projectName;
                document.getElementById('projectName').value = this.projectName;
            }
            
            if (projectData.canvasWidth && projectData.canvasHeight) {
                this.canvasWidth = projectData.canvasWidth;
                this.canvasHeight = projectData.canvasHeight;
                this.canvas.width = this.canvasWidth;
                this.canvas.height = this.canvasHeight;
                this.tempCanvas.width = this.canvasWidth;
                this.tempCanvas.height = this.canvasHeight;
                
                document.getElementById('canvasWidth').value = this.canvasWidth;
                document.getElementById('canvasHeight').value = this.canvasHeight;
            }
            
            this.storyboardIdCounter = projectData.storyboardIdCounter;
            this.currentStoryboardIndex = projectData.currentStoryboardIndex;
            
            const loadPromises = projectData.storyboards.map(async (sbData) => {
                const storyboard = {
                    id: sbData.id,
                    name: sbData.name,
                    currentLayerIndex: sbData.currentLayerIndex,
                    layers: []
                };
                
                const layerPromises = sbData.layers.map(async (layerData) => {
                    const layer = {
                        id: layerData.id,
                        name: layerData.name,
                        visible: layerData.visible,
                        history: [],
                        historyIndex: 0,
                        canvas: document.createElement('canvas'),
                        ctx: null
                    };
                    
                    layer.canvas.width = this.canvasWidth;
                    layer.canvas.height = this.canvasHeight;
                    layer.ctx = layer.canvas.getContext('2d', { willReadFrequently: true });
                    
                    if (layerData.imageData) {
                        await new Promise((resolve) => {
                            const img = new Image();
                            img.onload = () => {
                                layer.ctx.drawImage(img, 0, 0);
                                const imageData = layer.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
                                layer.history.push(imageData);
                                layer.historyIndex = 0;
                                resolve();
                            };
                            img.src = layerData.imageData;
                        });
                    } else {
                        const imageData = layer.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
                        layer.history.push(imageData);
                        layer.historyIndex = 0;
                    }
                    
                    return layer;
                });
                
                storyboard.layers = await Promise.all(layerPromises);
                return storyboard;
            });
            
            this.storyboards = await Promise.all(loadPromises);
            
            this.renderStoryboards();
            this.renderLayers();
            this.updateUndoRedoButtons();
            this.redrawCanvas();
            
            alert('プロジェクトを読み込みました');
        } catch (error) {
            console.error('Load error:', error);
            alert('プロジェクトの読み込みに失敗しました');
        }
        
        e.target.value = '';
    }
    
    async exportAllStoryboards() {
        const padding = 20;
        const borderWidth = 2;
        
        const totalHeight = (this.canvasHeight + borderWidth * 2 + padding) * this.storyboards.length - padding;
        const totalWidth = this.canvasWidth + borderWidth * 2 + padding * 2;
        
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = totalWidth;
        exportCanvas.height = totalHeight;
        const exportCtx = exportCanvas.getContext('2d');
        
        exportCtx.fillStyle = '#ffffff';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        let currentY = padding;
        
        this.storyboards.forEach((storyboard, index) => {
            const x = padding;
            
            exportCtx.fillStyle = '#000000';
            exportCtx.fillRect(x - borderWidth, currentY - borderWidth, 
                this.canvasWidth + borderWidth * 2, this.canvasHeight + borderWidth * 2);
            
            exportCtx.fillStyle = '#ffffff';
            exportCtx.fillRect(x, currentY, this.canvasWidth, this.canvasHeight);
            
            storyboard.layers.forEach(layer => {
                if (layer.visible) {
                    exportCtx.drawImage(layer.canvas, x, currentY);
                }
            });
            
            this.drawStoryboardNumber(exportCtx, index + 1, x, currentY);
            
            currentY += this.canvasHeight + borderWidth * 2 + padding;
        });
        
        exportCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.projectName}_all.png`;
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/png');
    }
    
    async exportIndividualStoryboards() {
        if (typeof JSZip === 'undefined') {
            alert('ZIPライブラリの読み込みに失敗しました。ページを再読み込みしてください。');
            return;
        }
        
        const padding = 20;
        const borderWidth = 2;
        const totalWidth = this.canvasWidth + borderWidth * 2 + padding * 2;
        const totalHeight = this.canvasHeight + borderWidth * 2 + padding * 2;
        
        const zip = new JSZip();
        
        for (let index = 0; index < this.storyboards.length; index++) {
            const storyboard = this.storyboards[index];
            
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = totalWidth;
            exportCanvas.height = totalHeight;
            const exportCtx = exportCanvas.getContext('2d');
            
            exportCtx.fillStyle = '#ffffff';
            exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            
            const x = padding;
            const y = padding;
            
            exportCtx.fillStyle = '#000000';
            exportCtx.fillRect(x - borderWidth, y - borderWidth, 
                this.canvasWidth + borderWidth * 2, this.canvasHeight + borderWidth * 2);
            
            exportCtx.fillStyle = '#ffffff';
            exportCtx.fillRect(x, y, this.canvasWidth, this.canvasHeight);
            
            storyboard.layers.forEach(layer => {
                if (layer.visible) {
                    exportCtx.drawImage(layer.canvas, x, y);
                }
            });
            
            this.drawStoryboardNumber(exportCtx, index + 1, x, y);
            
            const blob = await new Promise(resolve => {
                exportCanvas.toBlob(resolve, 'image/png');
            });
            
            // C-001形式のファイル名
            const filename = `C-${String(index + 1).padStart(3, '0')}.png`;
            zip.file(filename, blob);
        }
        
        const content = await zip.generateAsync({ 
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });
        
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.projectName}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new StoryboardEditor();
});
