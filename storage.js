class StoragePage {
    constructor() {
        // Check if user is authenticated
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        if (!this.currentUser) {
            window.location.href = 'auth.html';
            return;
        }

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
        this.displayUserInfo();
        this.bindEvents();
        this.loadItems();
        this.renderStorageList();
    }

    displayUserInfo() {
        const userInfoDiv = document.getElementById('userInfo');
        const currentUserName = document.getElementById('currentUserName');
        const currentUserTeam = document.getElementById('currentUserTeam');
        const logoutBtn = document.getElementById('logoutBtn');

        if (this.currentUser && userInfoDiv) {
            currentUserName.textContent = this.currentUser.name;
            currentUserTeam.textContent = `${this.currentUser.team} • ${this.currentUser.role}`;
            userInfoDiv.style.display = 'block';
            logoutBtn.style.display = 'block';

            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }

    logout() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        // Log activity before logout
        AuthManager.logActivityFromPage('logout', `${this.currentUser.name} logged out from storage`);
        window.location.href = 'auth.html';
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
            itemBarcode: document.getElementById('itemBarcode'),
            itemName: document.getElementById('itemName'),
            itemSku: document.getElementById('itemSku'),
            itemPricePerCase: document.getElementById('itemPricePerCase'),
            itemCasesOrdered: document.getElementById('itemCasesOrdered'),
            itemCountsPerCase: document.getElementById('itemCountsPerCase'),
            itemQuantity: document.getElementById('itemQuantity'),
            itemUnit: document.getElementById('itemUnit'),
            itemTotalOzPc: document.getElementById('itemTotalOzPc'),
            itemServingsNeeded: document.getElementById('itemServingsNeeded'),
            itemServingsTotal: document.getElementById('itemServingsTotal'),
            itemNeedToServe: document.getElementById('itemNeedToServe'),
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
        this.applyInitialFilter();
        if (this.elements.loadedSkuCount) {
            const savedCount = Object.keys(this.items).length;
            this.elements.loadedSkuCount.textContent = savedCount;
            this.elements.loadedRows.textContent = savedCount;
            this.elements.uploadStatus.textContent = savedCount > 0 ? 'Loaded saved inventory from browser storage.' : 'Waiting for file';
        }
    }

    applyInitialFilter() {
        const params = new URLSearchParams(window.location.search);
        const filter = params.get('filter');
        if (filter) {
            this.elements.filterInput.value = filter;
            this.handleFilter();
            this.showToast(`Filtered storage for ${filter}`);
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
            'name', 'productname', 'product', 'itemname', 'item',
            'sku', 'skufillin', 'sku_fillin', 'barcode', 'upc', 'ean', 'productbarcode', 'itemcode', 'productcode',
            'price', 'cost', 'estimatedpricepercase', 'pricepercase',
            'casesordered', 'caseordered', 'cases', 'casecount', 'totalcases',
            'totalcountspercase', 'countspercase', 'countpercase',
            'unit', 'measurement', 'unitmeasure', 'measure',
            'totalozpc', 'ozpc', 'totalpieces',
            'servingsneeded', 'servingstotal', 'needtoserve', 'needtoservecount',
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
            } else if (['barcode', 'upc', 'ean', 'productbarcode', 'gs1'].includes(key)) {
                normalized.barcode = value.toString().trim();
            } else if (['sku', 'itemcode', 'productcode', 'skufillin', 'sku_fillin'].includes(key)) {
                normalized.sku = value.toString().trim();
            } else if (['price', 'cost', 'estimatedpricepercase', 'pricepercase'].includes(key)) {
                normalized.price_per_case = parseFloat(value) || 0;
            } else if (['casesordered', 'caseordered', 'cases', 'casecount', 'totalcases'].includes(key)) {
                normalized.cases_ordered = parseInt(value, 10) || 0;
            } else if (['totalcountspercase', 'totalcountpercase', 'countspercase', 'countpercase'].includes(key)) {
                normalized.counts_per_case = parseInt(value, 10) || 0;
            } else if (['unit', 'measurement', 'unitmeasure', 'measure'].includes(key)) {
                normalized.unit = value.toString().trim();
            } else if (['totalozpc', 'totaloz', 'ozpc', 'ozperpiece', 'totalpieces'].includes(key)) {
                normalized.total_oz_pc = value.toString().trim();
            } else if (['servingsneeded', 'needtoserve', 'needtoservecount'].includes(key)) {
                normalized.need_to_serve = parseInt(value, 10) || 0;
            } else if (['servingstotal', 'totalservings'].includes(key)) {
                normalized.servings_total = parseInt(value, 10) || 0;
            } else if (['servingsize', 'servings', 'size'].includes(key)) {
                normalized.servings_needed = parseInt(value, 10) || 0;
            } else if (['quantity', 'qty', 'totalquantity', 'totalqty', 'stock'].includes(key)) {
                normalized.total_quantity = parseInt(value, 10) || 0;
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
                barcode: item.barcode || existing?.barcode || '',
                sku: item.sku,
                item_name: item.item_name || existing?.item_name || 'Unnamed Item',
                price_per_case: item.price_per_case || Number(existing?.price_per_case || 0),
                cases_ordered: item.cases_ordered || Number(existing?.cases_ordered || 0),
                counts_per_case: item.counts_per_case || Number(existing?.counts_per_case || 0),
                total_quantity: Number(item.total_quantity || existing?.total_quantity || 0),
                unit: item.unit || existing?.unit || '',
                total_oz_pc: item.total_oz_pc || existing?.total_oz_pc || '',
                servings_needed: item.servings_needed || Number(existing?.servings_needed || 0),
                servings_total: item.servings_total || Number(existing?.servings_total || 0),
                need_to_serve: item.need_to_serve || Number(existing?.need_to_serve || 0),
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

    showManualAddForm(sku = '', barcode = '') {
        this.editingSku = null;
        this.elements.itemFormSection.classList.add('show');
        this.elements.itemFormSection.classList.remove('hidden');
        this.elements.itemFormSection.setAttribute('aria-hidden', 'false');
        const modeLabel = this.currentMode === 'check_in' ? 'Check In' : this.currentMode === 'check_out' ? 'Check Out' : 'Add Item';
        this.elements.itemFormTitle.textContent = `${modeLabel} — Family Stock`;
        this.elements.itemBarcode.value = barcode;
        this.elements.itemSku.value = sku;
        this.elements.itemName.value = '';
        this.elements.itemPricePerCase.value = 0;
        this.elements.itemCasesOrdered.value = 0;
        this.elements.itemCountsPerCase.value = 0;
        this.elements.itemQuantity.value = this.currentMode === 'check_out' ? 0 : 1;
        this.elements.itemUnit.value = '';
        this.elements.itemTotalOzPc.value = '';
        this.elements.itemServingsNeeded.value = 0;
        this.elements.itemServingsTotal.value = 0;
        this.elements.itemNeedToServe.value = 0;
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
        this.elements.detectedSkuText.textContent = 'Scan a barcode to remove the item from storage or open manual entry.';
        this.elements.startScannerBtn.classList.remove('hidden');
        this.elements.stopScannerBtn.classList.add('hidden');
        this.startScanner();
    }

    findItem(code) {
        if (!code) {
            return null;
        }
        const direct = this.items[code];
        if (direct) {
            return direct;
        }
        return Object.values(this.items).find((item) => item.sku === code || item.barcode === code) || null;
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
        this.elements.scannerModalStatus.textContent = `Detected barcode: ${code}`;
        this.elements.detectedSkuText.textContent = `Detected barcode value. Looking up item...`;

        const item = this.findItem(code);
        if (item) {
            this.showToast(`Found item ${item.item_name}. Opening form with barcode and SKU.`);
            this.closeScannerPopup();
            this.showEditForm(item.sku);
        } else {
            this.showToast(`Barcode ${code} not found. Open manual entry to add it.`);
            this.closeScannerPopup();
            this.showManualAddForm('', code);
        }

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
        this.elements.itemBarcode.value = item.barcode || '';
        this.elements.itemSku.value = item.sku;
        this.elements.itemName.value = item.item_name || '';
        this.elements.itemPricePerCase.value = item.price_per_case ?? 0;
        this.elements.itemCasesOrdered.value = item.cases_ordered ?? 0;
        this.elements.itemCountsPerCase.value = item.counts_per_case ?? 0;
        this.elements.itemQuantity.value = item.total_quantity ?? 0;
        this.elements.itemUnit.value = item.unit || '';
        this.elements.itemTotalOzPc.value = item.total_oz_pc || '';
        this.elements.itemServingsNeeded.value = item.servings_needed ?? 0;
        this.elements.itemServingsTotal.value = item.servings_total ?? 0;
        this.elements.itemNeedToServe.value = item.need_to_serve ?? 0;
    }

    handleItemSubmit(event) {
        event.preventDefault();
        const sku = this.elements.itemSku.value.trim();
        if (!sku) {
            this.showToast('SKU is required.');
            return;
        }
        const barcode = this.elements.itemBarcode.value.trim();
        const itemName = this.elements.itemName.value.trim() || 'Unnamed Item';
        const pricePerCase = parseFloat(this.elements.itemPricePerCase.value) || 0;
        const casesOrdered = Math.max(parseInt(this.elements.itemCasesOrdered.value, 10) || 0, 0);
        const countsPerCase = Math.max(parseInt(this.elements.itemCountsPerCase.value, 10) || 0, 0);
        const quantity = Math.max(parseInt(this.elements.itemQuantity.value, 10) || 0, 0);
        const unit = this.elements.itemUnit.value.trim();
        const totalOzPc = this.elements.itemTotalOzPc.value.trim();
        const servingsNeeded = Math.max(parseInt(this.elements.itemServingsNeeded.value, 10) || 0, 0);
        const servingsTotal = Math.max(parseInt(this.elements.itemServingsTotal.value, 10) || 0, 0);
        const needToServe = Math.max(parseInt(this.elements.itemNeedToServe.value, 10) || 0, 0);

        if (this.editingSku) {
            const originalSku = this.editingSku;
            if (originalSku !== sku) {
                delete this.items[originalSku];
            }
            this.items[sku] = {
                barcode,
                sku,
                item_name: itemName,
                price_per_case: pricePerCase,
                cases_ordered: casesOrdered,
                counts_per_case: countsPerCase,
                total_quantity: quantity,
                unit,
                total_oz_pc: totalOzPc,
                servings_needed: servingsNeeded,
                servings_total: servingsTotal,
                need_to_serve: needToServe,
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
            barcode,
            sku,
            item_name: itemName,
            price_per_case: pricePerCase,
            cases_ordered: casesOrdered,
            counts_per_case: countsPerCase,
            total_quantity: totalQuantity,
            unit,
            total_oz_pc: totalOzPc,
            servings_needed: servingsNeeded,
            servings_total: servingsTotal,
            need_to_serve: needToServe,
        };
        this.saveItems();
        
        // Log activity
        const action = this.currentMode === 'check_out' ? 'checked out' : this.currentMode === 'check_in' ? 'checked in' : 'saved';
        AuthManager.logActivityFromPage('inventory_' + this.currentMode, `${action.toUpperCase()} ${quantity} units of SKU ${sku} (${itemName})`);
        
        this.hideItemForm();
        this.showToast(`${this.currentMode === 'check_out' ? 'Checked out' : this.currentMode === 'check_in' ? 'Checked in' : 'Saved'} item ${sku}.`);
    }

    renderStorageList() {
        const hasFilter = this.elements.filterInput.value.trim() !== '';
        const rows = hasFilter ? this.filteredItems : Object.values(this.items);
        if (rows.length === 0) {
            this.elements.storageTableBody.innerHTML = '<tr><td colspan="11" class="muted" style="text-align:center; padding: 24px;">No stored inventory yet. Upload a file or add items to begin.</td></tr>';
            return;
        }

        this.elements.storageTableBody.innerHTML = rows.map((item) => `
            <tr>
                <td>${item.item_name}</td>
                <td>${item.sku}</td>
                <td>${item.barcode || '-'}</td>
                <td>${item.price_per_case ?? 0}</td>
                <td>${item.cases_ordered ?? 0}</td>
                <td>${item.counts_per_case ?? 0}</td>
                <td>${item.total_quantity ?? 0}</td>
                <td>${item.unit || '-'}</td>
                <td>${item.total_oz_pc || '-'}</td>
                <td>${item.need_to_serve ?? 0}</td>
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

    deleteItem(sku, askConfirm = true) {
        const item = this.items[sku];
        if (!item) {
            return;
        }
        if (askConfirm && !confirm(`Remove item ${sku} from storage?`)) {
            return;
        }
        this.lastRemovedItem = { sku, item: { ...item } };
        delete this.items[sku];
        this.saveItems();
        
        // Log activity
        AuthManager.logActivityFromPage('remove_item', `Removed SKU ${sku} (${item.item_name}) from storage`);
        
        this.handleFilter();
        this.toggleUndoButton(true);
        if (askConfirm) {
            this.showToast(`Item ${sku} removed from storage. Undo available.`);
        }
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
