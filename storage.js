class StoragePage {
    constructor() {
        this.items = {};
        this.filteredItems = [];
        this.scannerStream = null;
        this.scannerDetector = null;
        this.currentMode = 'add';
        this.scannerLoopActive = false;
        this.lastScannedValue = '';
        this.scanCooldown = false;
        this.lastRemovedItem = null;
        this.editingSku = null;
        this.loadElements();
        this.bindEvents();
        this.loadItems();
        this.renderStorageList();
    }

    loadElements() {
        this.elements = {
            uploadBtn: document.getElementById('uploadBtn'),
            fileInput: document.getElementById('fileInput'),
            uploadStatus: document.getElementById('uploadStatus'),
            loadedSkuCount: document.getElementById('loadedSkuCount'),
            loadedRows: document.getElementById('loadedRows'),
            storageCount: document.getElementById('storageCount'),
            filterInput: document.getElementById('filterInput'),
            storageTableBody: document.getElementById('storageTableBody'),
            addItemBtn: document.getElementById('addItemBtn'),
            cancelItemBtn: document.getElementById('cancelItemBtn'),
            closeItemModalBtn: document.getElementById('closeItemModalBtn'),
            itemFormSection: document.getElementById('itemFormSection'),
            itemFormTitle: document.getElementById('itemFormTitle'),
            itemForm: document.getElementById('itemForm'),
            itemName: document.getElementById('itemName'),
            itemSku: document.getElementById('itemSku'),
            itemPrice: document.getElementById('itemPrice'),
            itemQuantity: document.getElementById('itemQuantity'),
            itemMeasurement: document.getElementById('itemMeasurement'),
            itemServing: document.getElementById('itemServing'),
            storageModeAddBtn: document.getElementById('storageModeAddBtn'),
            storageModeInBtn: document.getElementById('storageModeInBtn'),
            storageModeOutBtn: document.getElementById('storageModeOutBtn'),
            clearStorageBtn: document.getElementById('clearStorageBtn'),
            undoRemoveBtn: document.getElementById('undoRemoveBtn'),
            scannerModal: document.getElementById('scannerModal'),
            scannerModalVideo: document.getElementById('scannerModalVideo'),
            scannerModalStatus: document.getElementById('scannerModalStatus'),
            startScannerBtn: document.getElementById('startScannerBtn'),
            stopScannerBtn: document.getElementById('stopScannerBtn'),
            closeScannerBtn: document.getElementById('closeScannerBtn'),
            manualEntryBtn: document.getElementById('manualEntryBtn'),
            detectedSkuText: document.getElementById('detectedSkuText'),
            toast: document.getElementById('toast'),
        };
    }

    bindEvents() {
        this.elements.uploadBtn.addEventListener('click', () => this.elements.fileInput.click());
        this.elements.fileInput.addEventListener('change', (event) => this.handleFileUpload(event));
        this.elements.filterInput.addEventListener('input', () => this.handleFilter());
        this.elements.addItemBtn.addEventListener('click', () => {
            if (this.currentMode === 'add') {
                this.openScannerPopup();
            } else {
                this.showToast('Use the Check In/Out buttons in the storage list for quick stock changes.');
            }
        });
        this.elements.cancelItemBtn.addEventListener('click', () => this.closeItemModal());
        this.elements.closeItemModalBtn.addEventListener('click', () => this.closeItemModal());
        this.elements.itemForm.addEventListener('submit', (event) => this.handleItemSubmit(event));
        this.elements.storageModeAddBtn.addEventListener('click', () => this.setMode('add'));
        this.elements.storageModeInBtn.addEventListener('click', () => this.setMode('check_in'));
        this.elements.storageModeOutBtn.addEventListener('click', () => this.setMode('check_out'));
        this.elements.clearStorageBtn.addEventListener('click', () => this.clearStorage());
        this.elements.undoRemoveBtn.addEventListener('click', () => this.undoLastRemoval());
        this.elements.startScannerBtn.addEventListener('click', () => this.startScanner());
        this.elements.stopScannerBtn.addEventListener('click', () => this.stopScanner());
        this.elements.closeScannerBtn.addEventListener('click', () => this.closeScannerPopup());
        this.elements.manualEntryBtn.addEventListener('click', () => {
            this.closeScannerPopup();
            this.showManualAddForm();
        });

        this.elements.scannerModal.addEventListener('click', (event) => {
            if (event.target === this.elements.scannerModal) {
                this.closeScannerPopup();
            }
        });

        this.elements.itemFormSection.addEventListener('click', (event) => {
            if (event.target === this.elements.itemFormSection) {
                this.closeItemModal();
            }
        });
    }

    loadItems() {
        const saved = localStorage.getItem('apparelEaseInventory');
        if (saved) {
            try {
                this.items = JSON.parse(saved);
            } catch (e) {
                this.items = {};
            }
        }
        this.filteredItems = Object.values(this.items);
        this.updateStorageCount();
        this.setMode(this.currentMode, false);
        if (this.elements.loadedSkuCount) {
            const savedCount = Object.keys(this.items).length;
            this.elements.loadedSkuCount.textContent = savedCount;
            this.elements.loadedRows.textContent = savedCount;
            this.elements.uploadStatus.textContent = savedCount > 0 ? 'Loaded saved inventory from browser storage.' : 'Waiting for file';
        }
    }

    saveItems() {
        localStorage.setItem('apparelEaseInventory', JSON.stringify(this.items));
        this.filteredItems = Object.values(this.items);
        this.updateStorageCount();
        this.renderStorageList();
    }

    clearStorage() {
        if (!confirm('Clear all stored inventory? This cannot be undone.')) {
            return;
        }
        this.items = {};
        localStorage.removeItem('apparelEaseInventory');
        this.filteredItems = [];
        this.updateStorageCount();
        this.renderStorageList();
        this.showToast('Storage cleared.');
    }

    setMode(mode, showFeedback = true) {
        this.currentMode = mode;
        const buttons = [
            this.elements.storageModeAddBtn,
            this.elements.storageModeInBtn,
            this.elements.storageModeOutBtn,
        ];
        buttons.forEach((button) => {
            button.classList.toggle('active', button.id === `storageMode${mode === 'add' ? 'Add' : mode === 'check_in' ? 'In' : 'Out'}Btn`);
        });

        const modeLabel = mode === 'check_in' ? 'Check In' : mode === 'check_out' ? 'Check Out' : 'Add Item';
        this.elements.scannerModalStatus.textContent = `${modeLabel} mode selected. Scan a barcode or enter details.`;
        this.elements.detectedSkuText.textContent = `Ready to ${mode === 'check_out' ? 'check out' : 'check in'} a family item.`;
        this.elements.addItemBtn.textContent = mode === 'add' ? 'Open Scanner' : 'Use List Actions';
        if (showFeedback) {
            this.showToast(`${modeLabel} mode active.`);
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }
        this.elements.uploadStatus.textContent = `Loading ${file.name}...`;
        const extension = file.name.split('.').pop().toLowerCase();
        const reader = new FileReader();

        reader.onload = () => {
            try {
                let workbook;
                if (extension === 'csv' || extension === 'txt') {
                    workbook = XLSX.read(reader.result, { type: 'string' });
                } else {
                    workbook = XLSX.read(new Uint8Array(reader.result), { type: 'array' });
                }
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = this.parseSheetRows(firstSheet);
                const imported = this.importRows(rows);
                this.elements.uploadStatus.textContent = `Loaded ${imported.rows} rows and ${imported.skus} unique SKUs from ${file.name}.`;
                this.elements.loadedSkuCount.textContent = imported.skus;
                this.elements.loadedRows.textContent = imported.rows;
                this.showToast('Inventory uploaded to storage.');
            } catch (error) {
                console.error(error);
                this.elements.uploadStatus.textContent = 'Upload failed. Please use XLSX or CSV.';
                this.showToast('Upload failed.');
            }
        };

        if (extension === 'csv' || extension === 'txt') {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
        event.target.value = '';
    }

    parseSheetRows(sheet) {
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (rawRows.length === 0) {
            return [];
        }

        const headerAliases = new Set([
            'name', 'itemname', 'product', 'item', 'productname',
            'sku', 'barcode', 'itemcode', 'productcode',
            'price', 'cost', 'estimatedpricepercase',
            'quantity', 'qty', 'totalquantity', 'totalqty', 'stock', 'casesordered', 'totalcounts', 'casecount', 'cases',
            'measurement', 'unit', 'unitmeasure', 'measure',
            'servingsize', 'servings', 'size',
        ]);

        let headerRow = null;
        let headerIndex = 0;
        for (let rowIndex = 0; rowIndex < Math.min(rawRows.length, 12); rowIndex += 1) {
            const row = rawRows[rowIndex];
            if (!Array.isArray(row)) {
                continue;
            }
            const normalizedRow = row.map((cell) => cell.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
            const matches = normalizedRow.filter((cell) => cell && headerAliases.has(cell));
            if (matches.length >= 2) {
                headerRow = row;
                headerIndex = rowIndex;
                break;
            }
        }

        if (!headerRow) {
            return XLSX.utils.sheet_to_json(sheet, { defval: '' });
        }

        const headers = headerRow.map((cell) => cell.toString().trim());
        const rows = [];
        for (let rowIndex = headerIndex + 1; rowIndex < rawRows.length; rowIndex += 1) {
            const row = rawRows[rowIndex];
            if (!Array.isArray(row)) {
                continue;
            }
            const hasContent = row.some((cell) => cell !== null && cell !== '');
            if (!hasContent) {
                continue;
            }
            const rowObject = {};
            headers.forEach((header, index) => {
                if (header) {
                    rowObject[header] = row[index] !== undefined ? row[index] : '';
                }
            });
            rows.push(rowObject);
        }
        return rows;
    }

    normalizeRow(row) {
        const normalized = {};
        Object.keys(row).forEach((rawKey) => {
            const key = rawKey.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            const value = row[rawKey];
            if (['name', 'itemname', 'product', 'item', 'productname'].includes(key)) {
                normalized.item_name = value.toString().trim();
            } else if (['sku', 'barcode', 'itemcode', 'productcode'].includes(key)) {
                normalized.sku = value.toString().trim();
            } else if (['price', 'cost', 'estimatedpricepercase', 'pricepercase'].includes(key)) {
                normalized.price = parseFloat(value) || 0;
            } else if (['quantity', 'qty', 'totalquantity', 'totalqty', 'stock', 'casesordered', 'totalcounts', 'casecount', 'cases', 'casequantity'].includes(key)) {
                normalized.total_quantity = parseInt(value, 10) || 0;
            } else if (['measurement', 'unit', 'unitmeasure', 'measure', 'percase', 'percasevalue'].includes(key)) {
                normalized.measurement = value.toString().trim();
            } else if (['servingsize', 'servings', 'size', 'totallbpercase', 'ozperpiece'].includes(key)) {
                normalized.serving_size = value.toString().trim();
            }
        });
        return normalized;
    }

    importRows(rows) {
        let rowCount = 0;
        rows.forEach((row) => {
            const item = this.normalizeRow(row);
            if (!item.sku) {
                return;
            }
            rowCount += 1;
            const existing = this.items[item.sku] || null;
            this.items[item.sku] = {
                sku: item.sku,
                item_name: item.item_name || existing?.item_name || 'Unnamed Item',
                price: item.price || Number(existing?.price || 0),
                total_quantity: Number(item.total_quantity || existing?.total_quantity || 0),
                measurement: item.measurement || existing?.measurement || '',
                serving_size: item.serving_size || existing?.serving_size || '',
            };
        });
        this.saveItems();
        return { rows: rowCount, skus: Object.keys(this.items).length };
    }

    handleFilter() {
        const query = this.elements.filterInput.value.trim().toLowerCase();
        this.filteredItems = Object.values(this.items).filter((item) => {
            return item.item_name.toLowerCase().includes(query) || item.sku.toLowerCase().includes(query);
        });
        this.renderStorageList();
    }

    showManualAddForm(sku = '') {
        this.editingSku = null;
        this.elements.itemFormSection.classList.add('show');
        this.elements.itemFormSection.classList.remove('hidden');
        this.elements.itemFormSection.setAttribute('aria-hidden', 'false');
        const modeLabel = this.currentMode === 'check_in' ? 'Check In' : this.currentMode === 'check_out' ? 'Check Out' : 'Add Item';
        this.elements.itemFormTitle.textContent = `${modeLabel} — Family Stock`;
        this.elements.itemSku.value = sku;
        this.elements.itemName.value = '';
        this.elements.itemPrice.value = 0;
        this.elements.itemQuantity.value = this.currentMode === 'check_out' ? 0 : 1;
        this.elements.itemMeasurement.value = '';
        this.elements.itemServing.value = '';
    }

    openScannerPopup() {
        if (!('BarcodeDetector' in window)) {
            this.showToast('Barcode detection is not supported in this browser. Using manual add form.');
            this.showManualAddForm();
            return;
        }

        this.elements.scannerModal.classList.add('show');
        this.elements.scannerModal.setAttribute('aria-hidden', 'false');
        this.elements.scannerModalStatus.textContent = 'Requesting camera access...';
        this.elements.detectedSkuText.textContent = 'Scan a barcode to fill the SKU field.';
        this.elements.startScannerBtn.classList.remove('hidden');
        this.elements.stopScannerBtn.classList.add('hidden');
        this.startScanner();
    }

    closeScannerPopup() {
        this.elements.scannerModal.classList.remove('show');
        this.elements.scannerModal.setAttribute('aria-hidden', 'true');
        this.stopScanner();
    }

    async startScanner() {
        if (this.scannerLoopActive) {
            return;
        }

        try {
            const formats = await BarcodeDetector.getSupportedFormats();
            this.scannerDetector = new BarcodeDetector({ formats });
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            this.scannerStream = stream;
            this.elements.scannerModalVideo.srcObject = stream;
            await this.elements.scannerModalVideo.play();
            this.elements.scannerModalStatus.textContent = 'Scanning for barcode...';
            this.elements.startScannerBtn.classList.add('hidden');
            this.elements.stopScannerBtn.classList.remove('hidden');
            this.scannerLoopActive = true;
            this.lastScannedValue = '';
            this.scanCooldown = false;
            this.runScannerLoop();
        } catch (error) {
            console.error(error);
            this.elements.scannerModalStatus.textContent = 'Camera access failed. Open manual form to add an item.';
            this.showToast('Unable to start camera. Use the manual form instead.');
            this.showManualAddForm();
        }
    }

    stopScanner() {
        this.scannerLoopActive = false;
        if (this.scannerStream) {
            this.scannerStream.getTracks().forEach((track) => track.stop());
            this.scannerStream = null;
        }
        if (this.elements.scannerModalVideo) {
            this.elements.scannerModalVideo.srcObject = null;
        }
        this.elements.startScannerBtn.classList.remove('hidden');
        this.elements.stopScannerBtn.classList.add('hidden');
        this.elements.scannerModalStatus.textContent = 'Scanner stopped.';
    }

    async runScannerLoop() {
        if (!this.scannerLoopActive || !this.elements.scannerModalVideo || !this.scannerDetector) {
            return;
        }

        try {
            const barcodes = await this.scannerDetector.detect(this.elements.scannerModalVideo);
            if (barcodes.length > 0) {
                const barcode = barcodes[0];
                if (barcode.rawValue && barcode.rawValue !== this.lastScannedValue) {
                    this.lastScannedValue = barcode.rawValue;
                    this.handleScannerDetected(barcode.rawValue);
                }
            }
        } catch (error) {
            console.warn('Barcode detection error', error);
        }

        if (this.scannerLoopActive) {
            requestAnimationFrame(() => this.runScannerLoop());
        }
    }

    handleScannerDetected(code) {
        if (this.scanCooldown) {
            return;
        }

        this.scanCooldown = true;
        this.elements.scannerModalStatus.textContent = `Detected: ${code}`;
        this.elements.detectedSkuText.textContent = `Detected SKU: ${code}`;
        this.showToast(`Detected SKU ${code}. Fill details and save.`);
        this.showManualAddForm(code);
        this.closeScannerPopup();
        setTimeout(() => {
            this.scanCooldown = false;
        }, 1500);
    }

    hideItemForm() {
        this.closeItemModal();
    }

    closeItemModal() {
        this.elements.itemFormSection.classList.remove('show');
        this.elements.itemFormSection.classList.add('hidden');
        this.elements.itemFormSection.setAttribute('aria-hidden', 'true');
    }

    showEditForm(sku) {
        const item = this.items[sku];
        if (!item) {
            return;
        }

        this.editingSku = sku;
        this.elements.itemFormSection.classList.add('show');
        this.elements.itemFormSection.classList.remove('hidden');
        this.elements.itemFormSection.setAttribute('aria-hidden', 'false');
        this.elements.itemFormTitle.textContent = 'Edit Item — Family Stock';
        this.elements.itemSku.value = item.sku;
        this.elements.itemName.value = item.item_name || '';
        this.elements.itemPrice.value = item.price ?? 0;
        this.elements.itemQuantity.value = item.total_quantity ?? 0;
        this.elements.itemMeasurement.value = item.measurement || '';
        this.elements.itemServing.value = item.serving_size || '';
    }

    handleItemSubmit(event) {
        event.preventDefault();
        const sku = this.elements.itemSku.value.trim();
        if (!sku) {
            this.showToast('SKU is required.');
            return;
        }
        const itemName = this.elements.itemName.value.trim() || 'Unnamed Item';
        const price = parseFloat(this.elements.itemPrice.value) || 0;
        const quantity = Math.max(parseInt(this.elements.itemQuantity.value, 10) || 0, 0);
        const measurement = this.elements.itemMeasurement.value.trim();
        const servingSize = this.elements.itemServing.value.trim();

        if (this.editingSku) {
            const originalSku = this.editingSku;
            if (originalSku !== sku) {
                delete this.items[originalSku];
            }
            this.items[sku] = {
                sku,
                item_name: itemName,
                price,
                total_quantity: quantity,
                measurement,
                serving_size: servingSize,
            };
            this.editingSku = null;
            this.saveItems();
            this.hideItemForm();
            this.showToast(`Updated item ${sku}.`);
            return;
        }

        const existing = this.items[sku] || null;
        let totalQuantity = quantity;

        if (this.currentMode === 'check_in') {
            totalQuantity = (existing?.total_quantity || 0) + quantity;
        } else if (this.currentMode === 'check_out') {
            totalQuantity = Math.max((existing?.total_quantity || 0) - quantity, 0);
        } else if (existing) {
            totalQuantity = (existing?.total_quantity || 0) + quantity;
        }

        this.items[sku] = {
            sku,
            item_name: itemName,
            price,
            total_quantity: totalQuantity,
            measurement,
            serving_size: servingSize,
        };
        this.saveItems();
        this.hideItemForm();
        this.showToast(`${this.currentMode === 'check_out' ? 'Checked out' : this.currentMode === 'check_in' ? 'Checked in' : 'Saved'} item ${sku}.`);
    }

    renderStorageList() {
        const hasFilter = this.elements.filterInput.value.trim() !== '';
        const rows = hasFilter ? this.filteredItems : Object.values(this.items);
        if (rows.length === 0) {
            this.elements.storageTableBody.innerHTML = '<tr><td colspan="7" class="muted" style="text-align:center; padding: 24px;">No stored inventory yet. Upload a file or add items to begin.</td></tr>';
            return;
        }

        this.elements.storageTableBody.innerHTML = rows.map((item) => `
            <tr>
                <td>${item.item_name}</td>
                <td>${item.sku}</td>
                <td>${item.price}</td>
                <td>${item.total_quantity}</td>
                <td>${item.measurement || '-'}</td>
                <td>${item.serving_size || '-'}</td>
                <td>
                    <div class="quick-actions">
                        <input class="quick-qty-input" type="number" min="1" step="1" value="1" data-sku="${item.sku}">
                        <button class="btn primary small quick-action-btn" data-action="check_in" data-sku="${item.sku}" title="Add stock">+</button>
                        <button class="btn ghost small quick-action-btn" data-action="check_out" data-sku="${item.sku}" title="Reduce stock">−</button>
                        <button class="btn ghost small edit-item-btn" data-sku="${item.sku}">Edit</button>
                        <button class="btn ghost small remove-item-btn" data-sku="${item.sku}">Remove</button>
                    </div>
                </td>
            </tr>
        `).join('');

        this.elements.storageTableBody.querySelectorAll('.remove-item-btn').forEach((button) => {
            button.addEventListener('click', (event) => {
                const sku = event.currentTarget.dataset.sku;
                this.deleteItem(sku);
            });
        });

        this.elements.storageTableBody.querySelectorAll('.edit-item-btn').forEach((button) => {
            button.addEventListener('click', (event) => {
                const sku = event.currentTarget.dataset.sku;
                this.showEditForm(sku);
            });
        });

        this.elements.storageTableBody.querySelectorAll('.quick-action-btn').forEach((button) => {
            button.addEventListener('click', (event) => {
                const sku = event.currentTarget.dataset.sku;
                const action = event.currentTarget.dataset.action;
                this.adjustStock(sku, action);
            });
        });

        this.updateStorageCount(rows.length);
    }

    adjustStock(sku, action) {
        const item = this.items[sku];
        if (!item) {
            return;
        }

        const quantityInput = this.elements.storageTableBody.querySelector(`.quick-qty-input[data-sku="${sku}"]`);
        const quantity = parseInt(quantityInput?.value, 10) || 1;
        if (quantity <= 0) {
            this.showToast('Quantity must be greater than zero.');
            return;
        }

        if (action === 'check_out') {
            item.total_quantity = Math.max(item.total_quantity - quantity, 0);
        } else {
            item.total_quantity += quantity;
        }

        this.saveItems();
        this.showToast(`${action === 'check_out' ? 'Checked out' : 'Checked in'} ${quantity} ${item.item_name}.`);
    }

    updateStorageCount(count = null) {
        const activeCount = count === null ? Object.keys(this.items).length : count;
        this.elements.storageCount.textContent = activeCount;
    }

    deleteItem(sku) {
        const item = this.items[sku];
        if (!item) {
            return;
        }
        if (!confirm(`Remove item ${sku} from storage?`)) {
            return;
        }
        this.lastRemovedItem = { sku, item: { ...item } };
        delete this.items[sku];
        this.saveItems();
        this.handleFilter();
        this.toggleUndoButton(true);
        this.showToast(`Item ${sku} removed from storage. Undo available.`);
    }

    undoLastRemoval() {
        if (!this.lastRemovedItem) {
            this.showToast('Nothing to undo.');
            return;
        }
        const { sku, item } = this.lastRemovedItem;
        this.items[sku] = item;
        this.lastRemovedItem = null;
        this.saveItems();
        this.handleFilter();
        this.toggleUndoButton(false);
        this.showToast(`Restored ${item.item_name || sku}.`);
    }

    toggleUndoButton(visible) {
        this.elements.undoRemoveBtn.classList.toggle('hidden', !visible);
    }

    showToast(message) {
        this.elements.toast.textContent = message;
        this.elements.toast.classList.remove('hidden');
        this.elements.toast.classList.add('show');
        setTimeout(() => {
            this.elements.toast.classList.remove('show');
        }, 2500);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new StoragePage();
});
