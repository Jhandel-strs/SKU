class InventoryApp {
    constructor() {
        // Check if user is authenticated
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        if (!this.currentUser) {
            window.location.href = 'auth.html';
            return;
        }

        this.items = {};
        this.mode = 'check_in';
        this.reviewRecords = [];
        this.reviewSet = new Set();
        this.isScanning = false;
        this.lastDetected = null;
        this.videoStream = null;
        this.barcodeDetector = null;
        this.barcodeLoopActive = false;
        this.scannerUsingQuagga = false;
        this.toastTimeout = null;
        this.scanHistory = [];
        this.transactions = [];
        this.loadElements();
        this.displayUserInfo();
        this.bindEvents();
        this.loadItems();
        this.setMode(this.mode, false);
        this.loadTransactions();
        this.updateSummary();
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
        AuthManager.logActivityFromPage('logout', `${this.currentUser.name} logged out from inventory system`);
        window.location.href = 'auth.html';
    }

    loadElements() {
        this.elements = {
            uploadBtn: document.getElementById('uploadBtn'),
            fileInput: document.getElementById('fileInput'),
            uploadStatus: document.getElementById('uploadStatus'),
            loadedSkuCount: document.getElementById('loadedSkuCount'),
            loadedRows: document.getElementById('loadedRows'),
            skuCount: document.getElementById('skuCount'),
            itemCount: document.getElementById('itemCount'),
            lastScanned: document.getElementById('lastScanned'),
            scannerVideo: document.getElementById('scannerVideo'),
            startScanBtn: document.getElementById('startScanBtn'),
            stopScanBtn: document.getElementById('stopScanBtn'),
            finishReviewBtn: document.getElementById('finishReviewBtn'),
            clearHistoryBtn: document.getElementById('clearHistoryBtn'),
            cameraStatus: document.getElementById('cameraStatus'),
            scanHistory: document.getElementById('scanHistory'),
            scannerMessage: document.getElementById('scannerMessage'),
            currentModeLabel: document.getElementById('currentModeLabel'),
            currentModeSummary: document.getElementById('currentModeSummary'),
            modeCheckInBtn: document.getElementById('modeCheckInBtn'),
            modeCheckOutBtn: document.getElementById('modeCheckOutBtn'),
            modeReviewBtn: document.getElementById('modeReviewBtn'),
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
            itemServingsPerCount: document.getElementById('itemServingsPerCount'),
            cancelItemBtn: document.getElementById('cancelItemBtn'),
            saveOpenStorageBtn: document.getElementById('saveOpenStorageBtn'),
            reviewSection: document.getElementById('reviewSection'),
            reviewList: document.getElementById('reviewList'),
            exportReviewBtn: document.getElementById('exportReviewBtn'),
            clearStorageBtn: document.getElementById('clearStorageBtn'),
            calcCases: document.getElementById('calcCases'),
            calcPricePerCase: document.getElementById('calcPricePerCase'),
            calcCountsPerCase: document.getElementById('calcCountsPerCase'),
            calcOzPerCount: document.getElementById('calcOzPerCount'),
            calcServingsPerCount: document.getElementById('calcServingsPerCount'),
            calcTotalCounts: document.getElementById('calcTotalCounts'),
            calcTotalValue: document.getElementById('calcTotalValue'),
            calcTotalOz: document.getElementById('calcTotalOz'),
            calcTotalServings: document.getElementById('calcTotalServings'),
            calcBtn: document.getElementById('calcBtn'),
            calcResetBtn: document.getElementById('calcResetBtn'),
            userIdInput: document.getElementById('userIdInput'),
            actionTypeSelect: document.getElementById('actionTypeSelect'),
            transactionNoteInput: document.getElementById('transactionNoteInput'),
            addTransactionBtn: document.getElementById('addTransactionBtn'),
            clearTransactionBtn: document.getElementById('clearTransactionBtn'),
            transactionHistoryList: document.getElementById('transactionHistoryList'),
            toast: document.getElementById('toast'),
                cameraHelpBtn: document.getElementById('cameraHelpBtn'),
                cameraHelpModal: document.getElementById('cameraHelpModal'),
                cameraRetryBtn: document.getElementById('cameraRetryBtn'),
                cameraHelpCloseBtn: document.getElementById('cameraHelpCloseBtn'),
        };
    }

    bindEvents() {
        this.elements.uploadBtn.addEventListener('click', () => this.elements.fileInput.click());
        this.elements.fileInput.addEventListener('change', (event) => this.handleFileUpload(event));
        this.elements.startScanBtn.addEventListener('click', () => this.startScanning());
        this.elements.stopScanBtn.addEventListener('click', () => this.stopScanning());
        this.elements.finishReviewBtn.addEventListener('click', () => this.finishReview());
        this.elements.modeCheckInBtn.addEventListener('click', () => this.setMode('check_in'));
        this.elements.modeCheckOutBtn.addEventListener('click', () => this.setMode('check_out'));
        this.elements.modeReviewBtn.addEventListener('click', () => this.setMode('review'));
        this.elements.clearHistoryBtn.addEventListener('click', () => this.clearScanHistory());
        this.elements.cancelItemBtn.addEventListener('click', () => this.hideItemForm());
        if (this.elements.saveOpenStorageBtn) {
            this.elements.saveOpenStorageBtn.addEventListener('click', () => this.saveAndOpenStorage());
        }
        this.elements.itemForm.addEventListener('submit', (event) => this.handleItemSubmit(event));
        this.elements.exportReviewBtn.addEventListener('click', () => this.exportReviewCsv());
        this.elements.clearStorageBtn.addEventListener('click', () => this.resetStorage());
        this.elements.calcBtn.addEventListener('click', () => this.calculateValue());
        this.elements.calcResetBtn.addEventListener('click', () => this.resetCalculator());
        this.elements.addTransactionBtn.addEventListener('click', () => this.addTransaction());
        this.elements.clearTransactionBtn.addEventListener('click', () => this.clearTransactions());
        [
            this.elements.calcCases,
            this.elements.calcPricePerCase,
            this.elements.calcCountsPerCase,
            this.elements.calcOzPerCount,
            this.elements.calcServingsPerCount,
        ].forEach((input) => {
            input.addEventListener('input', () => this.calculateValue());
        });
    }

    calculateValue() {
        const cases = Number(this.elements.calcCases.value) || 0;
        const pricePerCase = Number(this.elements.calcPricePerCase.value) || 0;
        const countsPerCase = Number(this.elements.calcCountsPerCase.value) || 0;
        const ozPerCount = Number(this.elements.calcOzPerCount.value) || 0;
        const servingsPerCount = Number(this.elements.calcServingsPerCount.value) || 0;

        const totalCounts = cases * countsPerCase;
        const totalValue = cases * pricePerCase;
        const totalOz = totalCounts * ozPerCount;
        const totalServings = totalCounts * servingsPerCount;

        this.elements.calcTotalCounts.value = totalCounts.toFixed(0);
        this.elements.calcTotalValue.value = totalValue.toFixed(2);
        this.elements.calcTotalOz.value = totalOz.toFixed(2);
        this.elements.calcTotalServings.value = totalServings.toFixed(1);
    }

    resetCalculator() {
        this.elements.calcCases.value = 0;
        this.elements.calcPricePerCase.value = 0;
        this.elements.calcCountsPerCase.value = 0;
        this.elements.calcOzPerCount.value = 0;
        this.elements.calcServingsPerCount.value = 0;
        this.elements.calcTotalCounts.value = '';
        this.elements.calcTotalValue.value = '';
        this.elements.calcTotalOz.value = '';
        this.elements.calcTotalServings.value = '';
    }

    loadItems() {
        const saved = localStorage.getItem('apparelEaseInventory');
        if (saved) {
            try {
                this.items = JSON.parse(saved);
            } catch (error) {
                this.items = {};
            }
        }
    }

    saveItems() {
        localStorage.setItem('apparelEaseInventory', JSON.stringify(this.items));
    }

    loadTransactions() {
        const saved = localStorage.getItem('apparelEaseTransactions');
        if (saved) {
            try {
                this.transactions = JSON.parse(saved);
            } catch (error) {
            if (this.elements.cameraHelpBtn) {
                this.elements.cameraHelpBtn.addEventListener('click', () => this.showCameraHelp());
            }
            if (this.elements.cameraHelpCloseBtn) {
                this.elements.cameraHelpCloseBtn.addEventListener('click', () => this.closeCameraHelp());
            }
            if (this.elements.cameraRetryBtn) {
                this.elements.cameraRetryBtn.addEventListener('click', () => this.tryEnableCamera());
            }
                this.transactions = [];
            }
        }
        this.renderTransactions();
    }

    setMode(mode, showFeedback = true) {
        this.mode = mode;
        const buttons = [
            this.elements.modeCheckInBtn,
            this.elements.modeCheckOutBtn,
            this.elements.modeReviewBtn,
        ];
        buttons.forEach((button) => {
            button.classList.toggle('active', button.id === `mode${mode === 'check_in' ? 'CheckIn' : mode === 'check_out' ? 'CheckOut' : 'Review'}Btn`);
        });
        const modeLabel = mode === 'check_in' ? 'Check In' : mode === 'check_out' ? 'Check Out' : 'Review';
        this.elements.currentModeLabel.textContent = `Mode: ${modeLabel}`;
        if (this.elements.currentModeSummary) {
            this.elements.currentModeSummary.textContent = modeLabel;
        }
        this.elements.scannerMessage.textContent = `${modeLabel} mode selected. Press Start to scan.`;
        this.elements.finishReviewBtn.classList.toggle('hidden', mode !== 'review');
        if (showFeedback) {
            this.showToast(`${modeLabel} mode selected.`);
        }
    }

    saveTransactions() {
        localStorage.setItem('apparelEaseTransactions', JSON.stringify(this.transactions));
    }

    addTransaction() {
        const userId = this.currentUser.id || this.elements.userIdInput.value.trim() || 'Unknown';
        const userName = this.currentUser.name || 'Unknown';
        const action = this.elements.actionTypeSelect.value;
        const note = this.elements.transactionNoteInput.value.trim() || 'No details';

        this.transactions.unshift({
            userId,
            userName,
            action,
            note,
            time: new Date().toLocaleString(),
        });

        // Log activity
        AuthManager.logActivityFromPage('transaction', `${action}: ${note}`);

        if (this.transactions.length > 15) {
            this.transactions.length = 15;
        }

        this.saveTransactions();
        this.renderTransactions();
        this.elements.userIdInput.value = '';
        this.elements.transactionNoteInput.value = '';
        this.showToast('Transaction recorded by ' + userName);
    }

    renderTransactions() {
        if (this.transactions.length === 0) {
            this.elements.transactionHistoryList.innerHTML = '<p class="muted">No transactions yet.</p>';
            return;
        }

        this.elements.transactionHistoryList.innerHTML = this.transactions.map((entry) => `
            <div class="review-card">
                <div>
                    <strong>${entry.action}</strong>
                    <p class="muted">User ID: ${entry.userId}</p>
                </div>
                <div>
                    <p>${entry.note}</p>
                    <p class="muted">${entry.time}</p>
                </div>
            </div>
        `).join('');
    }

    clearTransactions() {
        this.transactions = [];
        this.saveTransactions();
        this.renderTransactions();
        this.showToast('Transaction history cleared.');
    }

    addScanHistory(code) {
        const item = this.findItem(code);
        this.scanHistory.unshift({
            code,
            time: new Date(),
            matched: Boolean(item),
            item_name: item?.item_name || 'Unknown SKU',
        });
        if (this.scanHistory.length > 12) {
            this.scanHistory.length = 12;
        }
        this.renderScanHistory();
    }

    renderScanHistory() {
        if (this.scanHistory.length === 0) {
            this.elements.scanHistory.innerHTML = '<p class="muted">No scans yet. Start scanning to see recent barcode results here.</p>';
            return;
        }
        this.elements.scanHistory.innerHTML = this.scanHistory.map((entry) => {
            const label = entry.matched ? 'Matched' : 'Missing';
            const statusClass = entry.matched ? '' : 'missing';
            return `
                <div class="review-card ${statusClass}">
                    <div>
                        <strong>${entry.item_name}</strong>
                        <p class="muted">SKU: ${entry.code}</p>
                    </div>
                    <div>
                        <p>${label}</p>
                        <p class="muted">${entry.time.toLocaleTimeString()}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    clearScanHistory() {
        this.scanHistory = [];
        this.renderScanHistory();
        this.showToast('Scan history cleared.');
    }

    resetStorage() {
        if (!confirm('Delete saved inventory data and reset the app?')) {
            return;
        }
        localStorage.removeItem('apparelEaseInventory');
        this.items = {};
        this.updateSummary();
        this.showToast('Saved inventory cleared.');
    }

    updateSummary() {
        const skuCount = Object.keys(this.items).length;
        const quantityCount = Object.values(this.items).reduce((sum, item) => sum + (Number(item.total_quantity) || 0), 0);
        this.elements.skuCount.textContent = skuCount;
        this.elements.itemCount.textContent = quantityCount;
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
                this.updateSummary();
                this.showToast('Inventory upload complete. SKUs ready for scanning.');
            } catch (error) {
                console.error(error);
                this.elements.uploadStatus.textContent = 'Upload failed. Use XLSX or CSV file format.';
                this.showToast('Upload failed. Please try a valid spreadsheet file.');
            }
        };

        if (extension === 'csv' || extension === 'txt') {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
        event.target.value = '';
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
                servings_per_count: item.servings_per_count || Number(existing?.servings_per_count || 0),
            };
        });
        this.saveItems();
        return { rows: rowCount, skus: Object.keys(this.items).length };
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
            } else if (['barcode', 'upc', 'ean', 'itemcode', 'productcode', 'skufillin', 'sku_fillin'].includes(key)) {
                normalized.barcode = value.toString().trim();
            } else if (['sku', 'itemcode', 'productcode', 'skufillin', 'sku_fillin'].includes(key)) {
                normalized.sku = value.toString().trim();
            } else if (['price', 'cost', 'estimatedpricepercase', 'pricepercase'].includes(key)) {
                normalized.price_per_case = parseFloat(value) || 0;
            } else if (['casesordered', 'caseordered', 'cases', 'casecount', 'totalcases'].includes(key)) {
                normalized.cases_ordered = parseInt(value, 10) || 0;
            } else if (['totalcountspercase', 'countspercase', 'countpercase'].includes(key)) {
                normalized.counts_per_case = parseInt(value, 10) || 0;
            } else if (['measurement', 'unit', 'unitmeasure', 'measure'].includes(key)) {
                normalized.unit = value.toString().trim();
            } else if (['totalozpc', 'ozpc', 'ozpercount', 'ozperpiece'].includes(key)) {
                normalized.total_oz_pc = value.toString().trim();
            } else if (['servingspercount', 'servingsperpiece', 'servingsperunit'].includes(key)) {
                normalized.servings_per_count = parseFloat(value) || 0;
            } else if (['quantity', 'qty', 'totalquantity', 'totalqty', 'stock'].includes(key)) {
                normalized.total_quantity = parseInt(value, 10) || 0;
            }
        });
        return normalized;
    }

    async initScanner() {
        // Prefer native BarcodeDetector on modern mobile browsers
        if ('BarcodeDetector' in window) {
            try {
                const formats = await BarcodeDetector.getSupportedFormats();
                this.barcodeDetector = new BarcodeDetector({ formats });
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                this.videoStream = stream;
                this.elements.scannerVideo.srcObject = stream;
                await this.elements.scannerVideo.play();
                this.scannerUsingQuagga = false;
                this.barcodeLoopActive = true;
                this.runBarcodeLoop();
                return true;
            } catch (err) {
                console.warn('BarcodeDetector init failed, falling back to Quagga', err);
                // fall through to Quagga fallback
            }
        }

        if (!window.Quagga) {
            this.showToast('No supported barcode scanner available in this browser.');
            return false;
        }

        return new Promise((resolve) => {
            Quagga.init({
                inputStream: {
                    name: 'Live',
                    type: 'LiveStream',
                    target: this.elements.scannerVideo,
                    constraints: {
                        facingMode: 'environment',
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                    },
                },
                locator: { patchSize: 'medium', halfSample: true },
                numOfWorkers: navigator.hardwareConcurrency || 2,
                decoder: {
                    readers: ['code_128_reader', 'ean_reader', 'ean_8_reader', 'code_39_reader', 'upc_reader', 'upc_e_reader'],
                },
                locate: true,
            }, (err) => {
                if (err) {
                    console.error('Quagga init error', err);
                    this.showToast('Unable to initialize barcode camera. Please refresh and allow camera permission.');
                    resolve(false);
                    return;
                }
                Quagga.onDetected((result) => this.handleDetected(result));
                this.scannerUsingQuagga = true;
                resolve(true);
            });
        });
    }

    async runBarcodeLoop() {
        if (!this.barcodeDetector || !this.elements.scannerVideo) return;
        while (this.barcodeLoopActive) {
            try {
                const barcodes = await this.barcodeDetector.detect(this.elements.scannerVideo);
                if (barcodes && barcodes.length > 0) {
                    const code = barcodes[0].rawValue;
                    if (code && this.lastDetected !== code) {
                        this.lastDetected = code;
                        // debounce
                        setTimeout(() => { this.lastDetected = null; }, 1500);
                        this.handleDetected({ codeResult: { code } });
                    }
                }
            } catch (error) {
                // detection may fail intermittently; log and continue
                // console.warn('Barcode detection error', error);
            }
            // small delay to avoid tight loop
            await new Promise((res) => setTimeout(res, 200));
        }
    }

    async startScanning() {
        if (!this.mode) {
            this.showToast('Select a mode first: Check In, Check Out, or Review.');
            return;
        }
        if (this.isScanning) {
            return;
        }
        const ready = await this.initScanner();
        if (!ready) {
            return;
        }
        if (this.scannerUsingQuagga) {
            Quagga.start();
        }
        this.isScanning = true;
        this.elements.startScanBtn.classList.add('hidden');
        this.elements.stopScanBtn.classList.remove('hidden');
        this.elements.scannerMessage.textContent = 'Scanning... hold the barcode steady inside the frame.';
    }

    stopScanning() {
        if (!this.isScanning) {
            return;
        }
        if (this.scannerUsingQuagga && window.Quagga) {
            Quagga.stop();
        } else {
            // stop native BarcodeDetector video loop
            this.barcodeLoopActive = false;
            if (this.videoStream) {
                this.videoStream.getTracks().forEach((track) => track.stop());
                this.videoStream = null;
            }
            if (this.elements.scannerVideo) {
                this.elements.scannerVideo.srcObject = null;
            }
        }
        this.isScanning = false;
        this.elements.startScanBtn.classList.remove('hidden');
        this.elements.stopScanBtn.classList.add('hidden');
        this.elements.scannerMessage.textContent = 'Scanner stopped. You can restart or change mode.';
    }

    handleDetected(result) {
        if (!result || !result.codeResult) {
            return;
        }
        const code = result.codeResult.code;
        if (!code || this.lastDetected === code) {
            return;
        }
        this.lastDetected = code;
        setTimeout(() => {
            this.lastDetected = null;
        }, 1500);
        this.elements.lastScanned.textContent = code;

        if (this.mode === 'review') {
            this.addReviewRecord(code);
            return;
        }

        const item = this.findItem(code);
        this.stopScanning();
        if (item) {
            if (this.mode === 'check_in') {
                // allow editing/existing item to be adjusted and saved
                this.showFormForCode(code, item);
                this.elements.itemQuantity.value = 1;
                const message = `Item found. Edit details or increase quantity and Save.`;
                this.elements.scannerMessage.textContent = message;
                this.showToast(message);
                return;
            }
            if (this.mode === 'check_out') {
                this.showFormForCode(code, item);
                const message = `Checking out ${item.item_name || code}. Confirm quantity and save.`;
                this.elements.scannerMessage.textContent = message;
                this.showToast(message);
                return;
            }
        }

        if (this.mode === 'check_in') {
            // new item flow
            this.showFormForCode(code, item);
            const message = `SKU ${code} not found. Fill details and Save to add to inventory.`;
            this.elements.scannerMessage.textContent = message;
            this.showToast(message);
            return;
        }

        if (this.mode === 'check_out') {
            const message = `SKU ${code} not found in inventory. Cannot check out missing item.`;
            this.elements.scannerMessage.textContent = message;
            this.showToast(message);
            return;
        }
    }

    findItem(code) {
        const direct = this.items[code];
        if (direct) {
            return direct;
        }
        return Object.values(this.items).find((item) => item.sku === code || item.barcode === code) || null;
    }

    showFormForCode(code, item) {
        this.elements.itemFormSection.classList.remove('hidden');
        this.elements.reviewSection.classList.add('hidden');
        const modeText = this.mode === 'check_in' ? 'Check In' : 'Check Out';
        this.elements.itemFormTitle.textContent = item ? `${modeText} — ${item.item_name}` : `${modeText} — Add New Item`;
        this.elements.itemBarcode.value = item?.barcode || '';
        this.elements.itemSku.value = item?.sku || code;
        this.elements.itemName.value = item?.item_name || '';
        this.elements.itemPricePerCase.value = item?.price_per_case || 0;
        this.elements.itemCasesOrdered.value = item?.cases_ordered || 0;
        this.elements.itemCountsPerCase.value = item?.counts_per_case || 0;
        this.elements.itemQuantity.value = this.mode === 'check_in' ? 1 : item?.total_quantity || 0;
        this.elements.itemUnit.value = item?.unit || '';
        this.elements.itemTotalOzPc.value = item?.total_oz_pc || '';
        this.elements.itemServingsPerCount.value = item?.servings_per_count || 0;
        // focus and smooth scroll for convenience on mobile
        setTimeout(() => {
            try {
                this.elements.itemName.focus();
                this.elements.itemSku.select();
                this.elements.itemFormSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (e) {}
        }, 120);
    }

    hideItemForm() {
        this.elements.itemFormSection.classList.add('hidden');
    }

    handleItemSubmit(event) {
        event.preventDefault();
        const sku = this.elements.itemSku.value.trim();
        if (!sku) {
            this.showToast('SKU is required.');
            return;
        }
        const barcode = this.elements.itemBarcode.value.trim();
        const name = this.elements.itemName.value.trim() || 'Unnamed Item';
        const pricePerCase = parseFloat(this.elements.itemPricePerCase.value) || 0;
        const casesOrdered = Math.max(parseInt(this.elements.itemCasesOrdered.value, 10) || 0, 0);
        const countsPerCase = Math.max(parseInt(this.elements.itemCountsPerCase.value, 10) || 0, 0);
        const quantity = Math.max(parseInt(this.elements.itemQuantity.value, 10) || 0, 0);
        const unit = this.elements.itemUnit.value.trim();
        const totalOzPc = this.elements.itemTotalOzPc.value.trim();
        const servingsPerCount = parseFloat(this.elements.itemServingsPerCount.value) || 0;
        const existing = this.items[sku] || null;
        let totalQuantity = quantity;

        if (this.mode === 'check_in' || this.mode === 'manual') {
            totalQuantity = (existing?.total_quantity || 0) + quantity;
        } else if (this.mode === 'check_out') {
            totalQuantity = Math.max((existing?.total_quantity || 0) - quantity, 0);
        }

        this.items[sku] = {
            barcode,
            sku,
            item_name: name,
            price_per_case: pricePerCase,
            cases_ordered: casesOrdered,
            counts_per_case: countsPerCase,
            total_quantity: totalQuantity,
            unit,
            total_oz_pc: totalOzPc,
            servings_per_count: servingsPerCount,
        };
        this.saveItems();
        this.updateSummary();
        this.hideItemForm();
        const actionText = this.mode === 'check_in' ? 'Checked in' : this.mode === 'check_out' ? 'Checked out' : 'Added';
        this.showToast(`${actionText} item ${sku} successfully.`);
    }

    saveAndOpenStorage() {
        // replicate save logic but then redirect to storage with filter
        const sku = this.elements.itemSku.value.trim();
        if (!sku) {
            this.showToast('SKU is required.');
            return;
        }
        const barcode = this.elements.itemBarcode.value.trim();
        const name = this.elements.itemName.value.trim() || 'Unnamed Item';
        const pricePerCase = parseFloat(this.elements.itemPricePerCase.value) || 0;
        const casesOrdered = Math.max(parseInt(this.elements.itemCasesOrdered.value, 10) || 0, 0);
        const countsPerCase = Math.max(parseInt(this.elements.itemCountsPerCase.value, 10) || 0, 0);
        const quantity = Math.max(parseInt(this.elements.itemQuantity.value, 10) || 0, 0);
        const unit = this.elements.itemUnit.value.trim();
        const totalOzPc = this.elements.itemTotalOzPc.value.trim();
        const servingsPerCount = parseFloat(this.elements.itemServingsPerCount.value) || 0;
        const existing = this.items[sku] || null;
        let totalQuantity = quantity;

        if (this.mode === 'check_in' || this.mode === 'manual') {
            totalQuantity = (existing?.total_quantity || 0) + quantity;
        } else if (this.mode === 'check_out') {
            totalQuantity = Math.max((existing?.total_quantity || 0) - quantity, 0);
        }

        this.items[sku] = {
            barcode,
            sku,
            item_name: name,
            price_per_case: pricePerCase,
            cases_ordered: casesOrdered,
            counts_per_case: countsPerCase,
            total_quantity: totalQuantity,
            unit,
            total_oz_pc: totalOzPc,
            servings_per_count: servingsPerCount,
        };
        this.saveItems();
        this.updateSummary();
        this.hideItemForm();
        this.showToast(`Saved ${sku} and opening storage.`);
        // small delay to allow toast to show before navigation
        setTimeout(() => {
            window.location.href = `storage.html?filter=${encodeURIComponent(sku)}`;
        }, 500);
    }

    addReviewRecord(code) {
        if (this.reviewSet.has(code)) {
            this.elements.scannerMessage.textContent = `${code} already scanned in review.`;
            return;
        }
        this.reviewSet.add(code);
        const item = this.findItem(code);
        const record = {
            sku: code,
            item_name: item?.item_name || 'Unknown SKU',
            price: item?.price || 0,
            total_quantity: item?.total_quantity || 0,
            measurement: item?.measurement || '',
            serving_size: item?.serving_size || '',
            matched: Boolean(item),
        };
        this.reviewRecords.push(record);
        this.elements.scannerMessage.textContent = `Captured ${code}. Scan more or finish review.`;
        this.renderReviewList();
    }

    renderReviewList() {
        if (this.reviewRecords.length === 0) {
            this.elements.reviewList.innerHTML = '<p class="muted">No items scanned yet.</p>';
            return;
        }
        this.elements.reviewList.innerHTML = this.reviewRecords.map((record) => `
            <div class="review-card ${record.matched ? '' : 'missing'}">
                <div>
                    <strong>${record.item_name}</strong>
                    <p class="muted">SKU: ${record.sku}</p>
                </div>
                <div>
                    <p>${record.matched ? `Price: ₱${record.price}` : 'Not found'}</p>
                    <p>Total qty: ${record.total_quantity}</p>
                    <p>Measure: ${record.measurement || '-'} | Serving: ${record.serving_size || '-'}</p>
                </div>
            </div>
        `).join('');
    }

    finishReview() {
        this.stopScanning();
        this.elements.reviewSection.classList.remove('hidden');
        this.renderReviewList();
        this.showToast('Review complete. You can export the report.');
    }

    exportReviewCsv() {
        if (this.reviewRecords.length === 0) {
            this.showToast('No review items to export.');
            return;
        }
        const header = ['Item Name', 'SKU', 'Price', 'Total Quantity', 'Measurement', 'Serving Size', 'Matched'];
        const rows = this.reviewRecords.map((record) => [
            record.item_name,
            record.sku,
            record.price,
            record.total_quantity,
            record.measurement,
            record.serving_size,
            record.matched ? 'Yes' : 'No',
        ]);
        const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const link = document.createElement('a');
        link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        link.download = `inventory_review_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


    showToast(message) {
        this.elements.toast.textContent = message;
        this.elements.toast.classList.remove('hidden');
        this.elements.toast.classList.add('show');
        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            this.elements.toast.classList.remove('show');
        }, 2500);
    }

    showCameraHelp() {
        if (!this.elements.cameraHelpModal) return;
        this.elements.cameraHelpModal.classList.remove('hidden');
    }

    closeCameraHelp() {
        if (!this.elements.cameraHelpModal) return;
        this.elements.cameraHelpModal.classList.add('hidden');
    }

    async tryEnableCamera() {
        try {
            // Prompt browser permission for camera
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            // stop tracks immediately - this was only to prompt permission
            stream.getTracks().forEach((t) => t.stop());
            this.elements.cameraStatus.textContent = 'Camera permission granted';
            this.showToast('Camera permission granted. Press Start Scanning.');
            this.closeCameraHelp();
        } catch (err) {
            console.error('Camera access denied or unavailable', err);
            this.showToast('Unable to access camera. Check browser settings or use HTTPS/localhost.');
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new InventoryApp();
});

