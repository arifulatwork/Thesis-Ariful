document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const table = document.getElementById('house-of-quality');
    const tbody = table.querySelector('tbody');
    const thead = table.querySelector('thead');
    const submitBtn = document.getElementById('generate-plans');
    let competitorsVisible = true;

    // Initialize the application
    function init() {
        initializeSelectBoxes();
        updateImportanceValues();
        setupCompetitorColumns();      // now a no-op, kept for safety
        ensureTechnicalComparisonRow();
        ensureCriticalCharacteristicsRow();
        updateCriticalCharacteristics();
        syncTopCharacteristicRow();    // 🔹 Target Direction row
        syncRoofRow();                 // 🔹 Roof TRi–TRj correlation row (+ / 0 / -)
        setupEventListeners();
        setupFormValidation();
        validateForm();
        updateCompetitiveResults();    // Initialize Highlight Competitive Advantages + summary
    }

    function updateSelectedIcon(select) {
        const selectedOption = select.options[select.selectedIndex];
        select.setAttribute('data-selected-icon', selectedOption.getAttribute('data-icon'));
    }

    function initializeSelectBoxes() {
        document.querySelectorAll('.relationship-select').forEach(select => {
            updateSelectedIcon(select);
            select.addEventListener('change', function () {
                updateSelectedIcon(this);
                updateImportanceValues();
                validateForm();
            });
        });
    }

    // 🔹 Target Direction row above Technical Characteristics (0, ↑, ↓)
    function syncTopCharacteristicRow() {
        const topRow = thead.querySelector('.characteristic-top-row');
        if (!topRow) return;

        // Get how many characteristics we have
        const nameInputs = Array.from(thead.querySelectorAll('.characteristic-name'));
        const charCount = nameInputs.length || 3;

        // Save previous targetdirection values (if any) to keep them on re-render
        const prevValues = Array.from(topRow.querySelectorAll('.target-direction'))
            .map(sel => sel.value);

        const totalCompetitorCols = 6; // 5 companies + 1 Highlight column

        // Rebuild the entire top row
        topRow.innerHTML = '';

        // 1) First cell above "Customer Requirements" + "Importance"
        const labelTh = document.createElement('th');
        labelTh.colSpan = 2;
        labelTh.className = 'target-direction-header';
        labelTh.textContent = 'Target Direction';
        topRow.appendChild(labelTh);

        // 2) One targetdirection select per characteristic column
        for (let i = 0; i < charCount; i++) {
            const th = document.createElement('th');
            th.className = 'target-direction-cell';

            const select = document.createElement('select');
            select.className = 'target-direction';

            select.innerHTML = `
                <option value="0">0</option>
                <option value="↑">↑</option>
                <option value="↓">↓</option>
            `;

            // Restore previous value if exists
            if (prevValues[i]) {
                select.value = prevValues[i];
            }

            th.appendChild(select);
            topRow.appendChild(th);
        }

        // 3) One empty cell above "Importance of Service"
        let th = document.createElement('th');
        topRow.appendChild(th);

        // 4) One empty cell above toggle column
        th = document.createElement('th');
        topRow.appendChild(th);

        // 5) Six empty cells above Competitor + Highlight columns
        for (let i = 0; i < totalCompetitorCols; i++) {
            th = document.createElement('th');
            topRow.appendChild(th);
        }
    }

    // 🔹 NEW: Roof row with TRi–TRj pairwise correlations
    // For each characteristic j:
    //   - If j = 0: no previous TR, cell is empty
    //   - If j > 0: create one row per i < j:
    //       TRi [ + / 0 / - ]
    function syncRoofRow() {
        const roofRow = thead.querySelector('.roof-row');
        if (!roofRow) return;

        const nameInputs = Array.from(thead.querySelectorAll('.characteristic-name'));
        const charCount = nameInputs.length || 3;
        const totalCompetitorCols = 6; // 5 companies + highlight

        // Save previous correlation values so they survive re-renders
        // Key = "i-j" (e.g. "0-2" means correlation between TR1 and TR3)
        const prevMap = {};
        roofRow.querySelectorAll('.roof-corr-select').forEach(sel => {
            const i = sel.getAttribute('data-i');
            const j = sel.getAttribute('data-j');
            if (i !== null && j !== null) {
                prevMap[`${i}-${j}`] = sel.value;
            }
        });

        // Rebuild the roof row
        roofRow.innerHTML = '';

        // 1) First two cells (Customer Req + Importance)
        let th = document.createElement('th');
        roofRow.appendChild(th);
        th = document.createElement('th');
        roofRow.appendChild(th);

        // 2) One roof cell per characteristic column (TRj)
        for (let j = 0; j < charCount; j++) {
            const roofTh = document.createElement('th');
            roofTh.className = 'roof-cell';

            // For the first characteristic (TR1), there is no previous TR to compare with
            if (j === 0) {
                // leave empty (or put a dash if you want)
                roofRow.appendChild(roofTh);
                continue;
            }

            // Container for all TRi–TRj rows inside this cell
            const group = document.createElement('div');
            group.className = 'roof-corr-group';

            // For each i < j, create a small "TRi [select]" row
            for (let i = 0; i < j; i++) {
                const row = document.createElement('div');
                row.className = 'roof-corr-row';

                const label = document.createElement('span');
                label.className = 'roof-corr-label';
                label.textContent = `TR${i + 1}`; // or use nameInputs[i].value if you prefer

                const select = document.createElement('select');
                select.className = 'roof-corr-select';
                select.setAttribute('data-i', i);
                select.setAttribute('data-j', j);

                select.innerHTML = `
                    <option value=""> </option>
                    <option value="+">+</option>
                    <option value="0">0</option>
                    <option value="-">-</option>
                `;

                // Restore previous value if exists
                const key = `${i}-${j}`;
                if (prevMap[key]) {
                    select.value = prevMap[key];
                }

                row.appendChild(label);
                row.appendChild(select);
                group.appendChild(row);
            }

            roofTh.appendChild(group);
            roofRow.appendChild(roofTh);
        }

        // 3) Empty cell above "Importance of Service"
        th = document.createElement('th');
        roofRow.appendChild(th);

        // 4) Empty cell above toggle
        th = document.createElement('th');
        roofRow.appendChild(th);

        // 5) Empty cells above competitor columns
        for (let i = 0; i < totalCompetitorCols; i++) {
            th = document.createElement('th');
            roofRow.appendChild(th);
        }
    }

    // Toggle competitor columns visibility
    function toggleCompetitorColumns() {
        competitorsVisible = !competitorsVisible;
        const toggleBtn = document.getElementById('toggle-competitors');
        toggleBtn.textContent = competitorsVisible ? '-' : '+';

        document.querySelectorAll(
            '.competitor-column, .competitor-header, .tech-competitor-cell, .competitive-result-column, .competitive-result-header'
        ).forEach(el => {
            el.style.display = competitorsVisible ? 'table-cell' : 'none';
        });
    }

    function updateImportanceValues() {
        const requirementRows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.id);
        const absImpRow = document.getElementById('absolute-importance-row');
        const relImpRow = document.getElementById('relative-importance-row');

        if (!absImpRow || !relImpRow) return;

        const absImpCells = absImpRow.querySelectorAll('.absolute-importance');
        const relImpCells = relImpRow.querySelectorAll('.relative-importance');

        absImpCells.forEach(cell => cell.value = 0);
        relImpCells.forEach(cell => cell.value = 0);

        requirementRows.forEach(row => {
            const importance = parseFloat(row.querySelector('.importance').value) || 0;
            row.querySelectorAll('.relationship-select').forEach((select, index) => {
                const relValue = parseFloat(select.value) || 0;
                absImpCells[index].value =
                    (parseFloat(absImpCells[index].value) || 0) + (importance * relValue);
            });
        });

        const totalAbsImp = Array.from(absImpCells)
            .reduce((sum, cell) => sum + (parseFloat(cell.value) || 0), 0);

        absImpCells.forEach((cell, index) => {
            const absValue = parseFloat(cell.value) || 0;
            relImpCells[index].value =
                totalAbsImp === 0 ? 0 : ((absValue / totalAbsImp) * 100).toFixed(2);
        });

        updateCriticalCharacteristics();
        updateCompetitiveResults(); // Update Highlight Competitive Advantages when importance changes
    }

    // ===== GLOBAL COMPETITOR SUMMARY BELOW TABLE =====

    function ensureCompetitorSummaryContainer() {
        let summary = document.getElementById('competitor-summary');
        if (!summary) {
            summary = document.createElement('div');
            summary.id = 'competitor-summary';
            summary.className = 'competitor-summary';
            table.parentNode.appendChild(summary);
        }
        return summary;
    }

    // Compute Σ(Importance × OurRating) vs Σ(Importance × BestCompetitorRating)
    function updateCompetitorSummary() {
        const summary = ensureCompetitorSummaryContainer();

        const requirementRows = Array.from(tbody.querySelectorAll('tr'))
            .filter(row => !row.id); // only requirement rows

        if (requirementRows.length === 0) {
            summary.innerHTML = 'No competitor data available.';
            return;
        }

        let totalOur = 0;
        let totalBest = 0;

        requirementRows.forEach(row => {
            const importance = parseFloat(
                row.querySelector('.importance')?.value
            ) || 0;

            if (importance <= 0) return;

            const competitorInputs = row.querySelectorAll('.competitor-column input');
            const ratings = Array.from(competitorInputs).map(input => {
                const v = parseFloat(input.value);
                return isNaN(v) ? 0 : v;
            });

            if (ratings.length === 0) return;

            const ourRating = ratings[0] || 0;            // Company 1 = Us
            const competitorRatings = ratings.slice(1);   // Company 2–5
            const bestCompetitorRating = competitorRatings.length
                ? Math.max(...competitorRatings)
                : 0;

            const ourWeighted = importance * ourRating;
            const bestWeighted = importance * bestCompetitorRating;

            totalOur += ourWeighted;
            totalBest += bestWeighted;
        });

        if (totalOur === 0 && totalBest === 0) {
            summary.innerHTML = 'Not enough valid competitor data for summary.';
            return;
        }

        let verdict = '';
        const eps = 1e-6;

        if (totalOur > totalBest + eps) {
            verdict = 'Verdict: Company 1 (Our Company) is overall BEST based on weighted competitor analysis.';
        } else if (Math.abs(totalOur - totalBest) <= eps) {
            verdict = 'Verdict: Company 1 (Our Company) is overall at PARITY with the best competitor.';
        } else {
            verdict = 'Verdict: Company 1 (Our Company) is NOT the best overall – competitors lead in weighted score.';
        }

        summary.innerHTML = `
            <strong>Competitor Analysis (weighted by customer requirement importance)</strong><br>
            Total Our Company (Σ Importance × Company 1): <strong>${totalOur.toFixed(2)}</strong><br>
            Total Best Competitor (Σ Importance × Best Competitor): <strong>${totalBest.toFixed(2)}</strong><br>
            ${verdict}
        `;
    }

    // NEW: Update Highlight Competitive Advantage using:
    // Score = Importance × Σ(Company1 – Competitor 2–5)
    // NEW: Update Highlight Competitive Advantage using:
// Score = Importance × (OurCompany - BestCompetitor)
function updateCompetitiveResults() {
    const requirementRows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.id);

    requirementRows.forEach(row => {
        const competitiveResultCell = row.querySelector('.competitive-result-text');
        if (!competitiveResultCell) return;

        const importance = parseFloat(row.querySelector('.importance')?.value) || 0;
        const competitorInputs = row.querySelectorAll('.competitor-column input');
        const ratings = Array.from(competitorInputs).map(input => {
            const v = parseFloat(input.value);
            return isNaN(v) ? 0 : v;
        });

        if (ratings.length < 2 || importance === 0) {
            competitiveResultCell.textContent = 'No data';
            return;
        }

        const ourRating = ratings[0]; // Company 1 = Our Company
        const competitorRatings = ratings.slice(1).filter(v => v > 0); // Companies 2–5

        if (ourRating <= 0) {
            competitiveResultCell.textContent = 'No valid score for Our Company';
            return;
        }

        if (competitorRatings.length === 0) {
            competitiveResultCell.textContent = 'No competitor data';
            return;
        }

        // ✅ Best competitor among Companies 2–5
        const bestCompetitorRating = Math.max(...competitorRatings);

        // ✅ Step 14 formula: Importance × (Our – BestCompetitor)
        const diff = ourRating - bestCompetitorRating;
        const totalScore = importance * diff;

        let comment = '';
        if (totalScore > 0) {
            comment = 'Overall advantage vs best competitor (positive score).';
        } else if (totalScore < 0) {
            comment = 'Overall disadvantage – best competitor leads (negative score).';
        } else {
            comment = 'At parity with best competitor (no net advantage).';
        }

        competitiveResultCell.textContent =
            `Score: ${totalScore.toFixed(2)} | Importance: ${importance.toFixed(2)}, ` +
            `Our Rating: ${ourRating.toFixed(1)}/5, Best Competitor: ${bestCompetitorRating.toFixed(1)}/5, ` +
            `Others: ${competitorRatings.join(', ')}. ` +
            comment;
    });

    // Global summary under the table (this is already OK)
    updateCompetitorSummary();
}


    function buildTechCompetitorCell() {
        const td = document.createElement('td');
        td.className = 'tech-competitor-cell';
        td.innerHTML = `
            <div class="tech-competitor-group">
                <label>Company A</label><select class="tech-competitor-input">
                    <option value="">-</option>
                    <option value="5">++ (5)</option>
                    <option value="4">+ (4)</option>
                    <option value="3">0 (3)</option>
                    <option value="2">– (2)</option>
                    <option value="1">–– (1)</option>
                </select>
                <label>Company B</label><select class="tech-competitor-input">
                    <option value="">-</option>
                    <option value="5">++ (5)</option>
                    <option value="4">+ (4)</option>
                    <option value="3">0 (3)</option>
                    <option value="2">– (2)</option>
                    <option value="1">–– (1)</option>
                </select>
                <label>Company C</label><select class="tech-competitor-input">
                    <option value="">-</option>
                    <option value="5">++ (5)</option>
                    <option value="4">+ (4)</option>
                    <option value="3">0 (3)</option>
                    <option value="2">– (2)</option>
                    <option value="1">–– (1)</option>
                </select>
                <label>Company D</label><select class="tech-competitor-input">
                    <option value="">-</option>
                    <option value="5">++ (5)</option>
                    <option value="4">+ (4)</option>
                    <option value="3">0 (3)</option>
                    <option value="2">– (2)</option>
                    <option value="1">–– (1)</option>
                </select>
                <label>Company E</label><select class="tech-competitor-input">
                    <option value="">-</option>
                    <option value="5">++ (5)</option>
                    <option value="4">+ (4)</option>
                    <option value="3">0 (3)</option>
                    <option value="2">– (2)</option>
                    <option value="1">–– (1)</option>
                </select>
            </div>
        `;
        return td;
    }

    // UPDATED: Critical cell -> Yes/No text
    function buildCriticalCharacteristicCell() {
        const td = document.createElement('td');
        td.innerHTML = `<input type="text" class="critical-characteristic" value="No" readonly>`;
        return td;
    }

    function ensureTechnicalComparisonRow() {
        const relRow = document.getElementById('relative-importance-row');
        if (!relRow) return;

        let techRow = document.getElementById('technical-competitor-comparison-row');

        const charCount = thead.querySelectorAll('.characteristic-name').length || 3;

        if (!techRow) {
            techRow = document.createElement('tr');
            techRow.id = 'technical-competitor-comparison-row';

            const titleCell = document.createElement('td');
            titleCell.colSpan = 2;
            titleCell.innerHTML = '<strong>Technical Competitor Comparison</strong>';
            techRow.appendChild(titleCell);

            for (let i = 0; i < charCount; i++) {
                techRow.appendChild(buildTechCompetitorCell());
            }

            const importanceTail = document.createElement('td');
            importanceTail.className = 'importance-column';
            techRow.appendChild(importanceTail);

            const toggleTail = document.createElement('td');
            toggleTail.className = 'toggle-cell';
            techRow.appendChild(toggleTail);

            for (let i = 0; i < 5; i++) {
                const tdEmpty = document.createElement('td');
                tdEmpty.className = 'competitor-column';
                techRow.appendChild(tdEmpty);
            }

            const competitiveResultTail = document.createElement('td');
            competitiveResultTail.className = 'competitive-result-column';
            techRow.appendChild(competitiveResultTail);

            if (relRow.nextSibling) {
                tbody.insertBefore(techRow, relRow.nextSibling);
            } else {
                tbody.appendChild(techRow);
            }
        } else {
            const existing = techRow.querySelectorAll('.tech-competitor-cell').length;

            if (existing < charCount) {
                const anchor = techRow.querySelector('.importance-column');
                for (let i = 0; i < (charCount - existing); i++) {
                    techRow.insertBefore(buildTechCompetitorCell(), anchor);
                }
            }
            if (existing > charCount) {
                for (let i = 0; i < (existing - charCount); i++) {
                    const anchor = techRow.querySelector('.importance-column');
                    const candidate = anchor.previousElementSibling;
                    if (candidate.classList.contains('tech-competitor-cell'))
                        techRow.removeChild(candidate);
                }
            }
        }

        if (!competitorsVisible) {
            techRow.querySelectorAll('.tech-competitor-cell')
                .forEach(el => el.style.display = 'none');
        }
    }

    function ensureCriticalCharacteristicsRow() {
        const techRow = document.getElementById('technical-competitor-comparison-row');
        if (!techRow) return;

        let criticalRow = document.getElementById('critical-characteristics-row');

        const charCount = thead.querySelectorAll('.characteristic-name').length || 3;

        if (!criticalRow) {
            criticalRow = document.createElement('tr');
            criticalRow.id = 'critical-characteristics-row';

            const titleCell = document.createElement('td');
            titleCell.colSpan = 2;
            titleCell.innerHTML = `
                <div class="critical-header">
                    Critical Characteristics
                    <div class="critical-subtext">(Describe critical technical requirements)</div>
                </div>
            `;
            criticalRow.appendChild(titleCell);

            for (let i = 0; i < charCount; i++) {
                criticalRow.appendChild(buildCriticalCharacteristicCell());
            }

            const importanceTail = document.createElement('td');
            importanceTail.className = 'importance-column';
            criticalRow.appendChild(importanceTail);

            const toggleTail = document.createElement('td');
            toggleTail.className = 'toggle-cell';
            criticalRow.appendChild(toggleTail);

            for (let i = 0; i < 5; i++) {
                const tdEmpty = document.createElement('td');
                tdEmpty.className = 'competitor-column';
                criticalRow.appendChild(tdEmpty);
            }

            const competitiveResultTail = document.createElement('td');
            competitiveResultTail.className = 'competitive-result-column';
            criticalRow.appendChild(competitiveResultTail);

            if (techRow.nextSibling) {
                tbody.insertBefore(criticalRow, techRow.nextSibling);
            } else {
                tbody.appendChild(criticalRow);
            }
        } else {
            const existing = criticalRow.querySelectorAll('.critical-characteristic').length;

            if (existing < charCount) {
                const anchor = criticalRow.querySelector('.importance-column');
                for (let i = 0; i < (charCount - existing); i++) {
                    criticalRow.insertBefore(buildCriticalCharacteristicCell(), anchor);
                }
            }
            if (existing > charCount) {
                for (let i = 0; i < (existing - charCount); i++) {
                    const anchor = criticalRow.querySelector('.importance-column');
                    const candidate = anchor.previousElementSibling;
                    if (candidate.querySelector('.critical-characteristic'))
                        criticalRow.removeChild(candidate);
                }
            }
        }

        updateCriticalCharacteristics();
    }

    // NEW: Critical logic = AND of 3 "High" checks
    function updateCriticalCharacteristics() {
        const criticalRow = document.getElementById('critical-characteristics-row');
        const orgRow = document.getElementById('organization-difficulty-row');
        const relRow = document.getElementById('relative-importance-row');

        if (!criticalRow || !orgRow || !relRow) return;

        const criticalInputs = criticalRow.querySelectorAll('.critical-characteristic');
               const difficultyInputs = orgRow.querySelectorAll('.difficulty');
        const relInputs = relRow.querySelectorAll('.relative-importance');

        const charCount = thead.querySelectorAll('.characteristic-name').length || 0;

        // 1) Sum / count customer importance per characteristic based on relationships
        const sumImportancePerChar = new Array(charCount).fill(0);
        const countPerChar = new Array(charCount).fill(0);

        // requirement rows = rows without id
        const requirementRows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.id);

        requirementRows.forEach(row => {
            const importance = parseFloat(row.querySelector('.importance')?.value) || 0;
            if (importance <= 0) return;

            const relSelects = row.querySelectorAll('.relationship-select');

            relSelects.forEach((select, index) => {
                if (index >= charCount) return;
                const relVal = parseFloat(select.value) || 0;
                // Only count requirements that are linked (relationship > 0)
                if (relVal > 0) {
                    sumImportancePerChar[index] += importance;
                    countPerChar[index] += 1;
                }
            });
        });

        // 2) For each characteristic, decide Yes/No
        for (let j = 0; j < charCount; j++) {
            const ccInput = criticalInputs[j];
            const relInput = relInputs[j];
            const diffInput = difficultyInputs[j];

            if (!ccInput || !relInput || !diffInput) continue;

            const avgCustomerImportance =
                countPerChar[j] ? (sumImportancePerChar[j] / countPerChar[j]) : 0;

            const relValue = parseFloat(relInput.value) || 0;   // Relative Importance (%)
            const diffValue = parseFloat(diffInput.value) || 0; // Organization Difficulty

            const isHighRelImportance = relValue >= 30;                 // ≥ 30%
            const isHighCustomerImportance = avgCustomerImportance >= 7;// ≥ 7
            const isHighDifficulty = diffValue >= 7;                    // ≥ 7

            const isCritical =
                isHighRelImportance &&
                isHighCustomerImportance &&
                isHighDifficulty;

            ccInput.value = isCritical ? 'Yes' : 'No';
        }
    }

    // Requirement rows
    function addRequirement() {
        const newRow = document.createElement('tr');
        const rowCount = Array.from(tbody.querySelectorAll('tr')).filter(r => !r.id).length;
        const characteristicCount =
            thead.querySelectorAll('.characteristic-name').length || 3;

        newRow.innerHTML = `
            <td><input type="text" class="requirement-name" value="Requirement ${rowCount + 1}"></td>
            <td><input type="number" class="importance" value="5"></td>
            ${Array.from({ length: characteristicCount }, () =>
                `<td><select class="relationship-select">
                    <option value="0">-</option>
                    <option value="9" data-icon="●">Strong (9)</option>
                    <option value="3" data-icon="○">Medium (3)</option>
                    <option value="1" data-icon="▲">Weak (1)</option>
                </select></td>`
            ).join('')}
            <td class="importance-column">
                <input type="number" class="characteristic-importance" value="0"
                       min="0" max="100">
            </td>
            <td class="toggle-cell"></td>
            <td class="competitor-column"><input type="number" value="3" min="1" max="5"></td>
            <td class="competitor-column"><input type="number" value="3" min="1" max="5"></td>
            <td class="competitor-column"><input type="number" value="3" min="1" max="5"></td>
            <td class="competitor-column"><input type="number" value="3" min="1" max="5"></td>
            <td class="competitor-column"><input type="number" value="3" min="1" max="5"></td>
            <td class="competitive-result-column">
                <div class="competitive-result-text">No analysis</div>
            </td>
        `;

        const orgDiffRow = document.getElementById('organization-difficulty-row');
        tbody.insertBefore(newRow, orgDiffRow);

        initializeSelectBoxes();
        updateImportanceValues();
        validateForm();

        newRow.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', function () {
                validateForm();
                if (this.classList.contains('importance')) {
                    updateImportanceValues();
                    updateCompetitiveResults();
                }
                if (this.closest('.competitor-column')) {
                    updateCompetitiveResults();
                }
            });
        });

        const imp = newRow.querySelector('.characteristic-importance');
        if (imp) imp.addEventListener('input', validateForm);

        updateCompetitiveResults();
    }

    function deleteRequirement() {
        const requirementRows = Array.from(tbody.querySelectorAll('tr')).filter(r => !r.id);
        if (requirementRows.length > 3) {
            tbody.removeChild(requirementRows[requirementRows.length - 1]);
            updateImportanceValues();
            validateForm();
            updateCompetitiveResults();
        } else {
            alert('At least 3 requirements must remain.');
        }
    }

    // Characteristics
    function addCharacteristic() {
        const headerRow = thead.querySelector('tr:last-child'); // row with .characteristic-name

        const newHeader = document.createElement('th');
        newHeader.innerHTML = `<input type="text" class="characteristic-name" value="Characteristic">`;

        // insert before first competitor-column header
        const firstCompetitorHeader = headerRow.querySelector('.competitor-column');
        headerRow.insertBefore(newHeader, firstCompetitorHeader);

        // Fix: techCharHeader is now in the THIRD header row (because of roof + target direction)
        const techCharHeader = thead.querySelector('tr:nth-child(3) th[colspan]');
        if (techCharHeader) {
            techCharHeader.setAttribute(
                'colspan',
                parseInt(techCharHeader.getAttribute('colspan')) + 1
            );
        }

        tbody.querySelectorAll('tr').forEach(row => {
            if (row.id === 'technical-competitor-comparison-row') {
                const anchor = row.querySelector('.importance-column');
                row.insertBefore(buildTechCompetitorCell(), anchor);
                return;
            }
            if (row.id === 'critical-characteristics-row') {
                const anchor = row.querySelector('.importance-column');
                row.insertBefore(buildCriticalCharacteristicCell(), anchor);
                return;
            }

            const newCell = document.createElement('td');

            if (row.id === 'organization-difficulty-row') {
                newCell.innerHTML = `<input type="number" class="difficulty" value="1" min="0" max="10">`;
            } else if (row.id === 'how-muches-row') {
                newCell.innerHTML = `<input type="text" class="how-much" value="">`;
            } else if (row.id === 'absolute-importance-row') {
                newCell.innerHTML = `<input type="number" class="absolute-importance" value="0" readonly>`;
            } else if (row.id === 'relative-importance-row') {
                newCell.innerHTML = `<input type="number" class="relative-importance" value="0" readonly>`;
            } else if (!row.id) {
                newCell.innerHTML = `
                    <select class="relationship-select">
                        <option value="0">-</option>
                        <option value="9" data-icon="●">Strong (9)</option>
                        <option value="3" data-icon="○">Medium (3)</option>
                        <option value="1" data-icon="▲">Weak (1)</option>
                    </select>
                `;
            }

            const anchor = row.querySelector('.importance-column');
            row.insertBefore(newCell, anchor);
        });

        initializeSelectBoxes();
        updateImportanceValues();
        validateForm();
        ensureTechnicalComparisonRow();
        ensureCriticalCharacteristicsRow();
        syncTopCharacteristicRow();    // 🔹 refresh Target Direction
        syncRoofRow();                 // 🔹 refresh roof
        updateCompetitiveResults();
    }

    function deleteCharacteristic() {
        const headerRow = thead.querySelector('tr:last-child'); // row with .characteristic-name

        // count characteristic headers
        const charHeaders = headerRow.querySelectorAll('.characteristic-name');
        if (charHeaders.length > 3) {
            const firstCompetitorHeader = headerRow.querySelector('.competitor-column');
            const candidate = firstCompetitorHeader.previousElementSibling;
            if (candidate) {
                headerRow.removeChild(candidate);
            }

            // Fix: techCharHeader is now in THIRD header row
            const techCharHeader = thead.querySelector('tr:nth-child(3) th[colspan]');
            if (techCharHeader) {
                techCharHeader.setAttribute(
                    'colspan',
                    parseInt(techCharHeader.getAttribute('colspan')) - 1
                );
            }

            tbody.querySelectorAll('tr').forEach(row => {
                if (row.id === 'technical-competitor-comparison-row') {
                    const anchor = row.querySelector('.importance-column');
                    const candidateCell = anchor.previousElementSibling;
                    if (candidateCell && candidateCell.classList.contains('tech-competitor-cell')) {
                        row.removeChild(candidateCell);
                    }
                    return;
                }
                if (row.id === 'critical-characteristics-row') {
                    const anchor = row.querySelector('.importance-column');
                    const candidateCell = anchor.previousElementSibling;
                    if (candidateCell && candidateCell.querySelector('.critical-characteristic')) {
                        row.removeChild(candidateCell);
                    }
                    return;
                }
                const anchor = row.querySelector('.importance-column');
                const candidateCell = anchor ? anchor.previousElementSibling : null;
                if (candidateCell && candidateCell.tagName === 'TD') {
                    row.removeChild(candidateCell);
                }
            });

            updateImportanceValues();
            validateForm();
            ensureTechnicalComparisonRow();
            ensureCriticalCharacteristicsRow();
            syncTopCharacteristicRow();    // 🔹 refresh Target Direction
            syncRoofRow();                 // 🔹 refresh roof
            updateCompetitiveResults();
        } else {
            alert('At least 3 characteristics must remain.');
        }
    }

    // Competitor columns – now a no-op (HTML already has headers & result column)
    function setupCompetitorColumns() {
        // Intentionally left empty: structure is defined in HTML,
        // and dynamic rows already include competitive-result-column.
    }

    // Form validation
    function validateForm() {
        const requirementsValid = validateRequirements();
        const characteristicsValid = validateCharacteristics();
        const relationshipsValid = validateRelationships();
        const characteristicImportanceValid = validateCharacteristicImportance();

        const isValid =
            requirementsValid &&
            characteristicsValid &&
            relationshipsValid &&
            characteristicImportanceValid;

        submitBtn.style.display = isValid ? 'block' : 'none';

        return isValid;
    }

    function validateRequirements() {
        let isValid = true;
        document.querySelectorAll('.requirement-name, .importance').forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.style.border = '1px solid red';
            } else {
                input.style.border = '';
            }
        });
        return isValid;
    }

    function validateCharacteristics() {
        let isValid = true;
        document.querySelectorAll('.characteristic-name').forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.style.border = '1px solid red';
            } else {
                input.style.border = '';
            }
        });
        return isValid;
    }

    function validateRelationships() {
        let isValid = true;
        document.querySelectorAll('.relationship-select').forEach(select => {
            if (select.value === "0") {
                isValid = false;
                select.style.border = '1px solid red';
            } else {
                select.style.border = '';
            }
        });
        return isValid;
    }

    function validateCharacteristicImportance() {
        let isValid = true;
        document.querySelectorAll('.characteristic-importance').forEach(input => {
            if (!input.value.trim() || isNaN(input.value) || input.value < 0) {
                isValid = false;
                input.style.border = '1px solid red';
            } else {
                input.style.border = '';
            }
        });
        return isValid;
    }

    // Event Listeners
    function setupEventListeners() {
        document.getElementById('add-requirement').addEventListener('click', addRequirement);
        document.getElementById('delete-requirement').addEventListener('click', deleteRequirement);
        document.getElementById('add-characteristic').addEventListener('click', addCharacteristic);
        document.getElementById('delete-characteristic').addEventListener('click', deleteCharacteristic);
        document.getElementById('toggle-competitors').addEventListener('click', toggleCompetitorColumns);

        document
            .querySelectorAll(
                '.requirement-name, .importance, .characteristic-name, .relationship-select, .characteristic-importance'
            )
            .forEach(el => {
                el.addEventListener('input', function () {
                    validateForm();

                    if (this.classList.contains('characteristic-name')) {
                        // 🔹 sync the top row when a characteristic name changes
                        syncTopCharacteristicRow();
                        syncRoofRow();
                    }

                    if (
                        this.classList.contains('importance') ||
                        this.classList.contains('relationship-select')
                    ) {
                        updateImportanceValues();
                        updateCompetitiveResults();
                    }
                });
                el.addEventListener('change', function () {
                    validateForm();
                    if (this.classList.contains('characteristic-name')) {
                        syncTopCharacteristicRow();
                        syncRoofRow();
                    }
                });
            });

        document.querySelectorAll('.competitor-column input').forEach(input => {
            input.addEventListener('input', function () {
                validateForm();
                updateCompetitiveResults();
            });
        });

        document.querySelectorAll('.importance').forEach(input => {
            input.addEventListener('input', function () {
                updateImportanceValues();
                updateCompetitiveResults();
            });
        });

        document.querySelectorAll('.difficulty').forEach(input => {
            input.addEventListener('input', function () {
                validateForm();
                updateCriticalCharacteristics();
            });
        });
    }

    // AI PROMPT BUILDER
    function generateAIPrompt() {
        const requirements = Array.from(
            document.querySelectorAll('.requirement-name')
        )
            .map((input, index) => ({
                name: input.value.trim(),
                importance: document.querySelectorAll('.importance')[index].value,
                relativeImportance:
                    document.querySelectorAll('.relative-importance')[index]?.value || "0",
                competitiveResult:
                    document.querySelectorAll('.competitive-result-text')[index]?.textContent ||
                    "No analysis"
            }))
            .filter(req => req.name);

        const characteristics = Array.from(
            document.querySelectorAll('.characteristic-name')
        )
            .map((input, index) => ([...document.querySelectorAll('.characteristic-name')] && {
                name: input.value.trim(),
                difficulty: document.querySelectorAll('.difficulty')[index]?.value || "1",
                absoluteImportance:
                    document.querySelectorAll('.absolute-importance')[index]?.value || "0",
                relativeImportance:
                    document.querySelectorAll('.relative-importance')[index]?.value || "0",
                manualImportance:
                    document.querySelectorAll('.characteristic-importance')[index]?.value || "0",
                criticalDescription:
                    document.querySelectorAll('.critical-characteristic')[index]?.value || ""
            }))
            .filter(char => char && char.name);

        requirements.sort(
            (a, b) => parseFloat(b.importance) - parseFloat(a.importance)
        );
        characteristics.sort(
            (a, b) => parseFloat(b.manualImportance) - parseFloat(a.manualImportance)
        );

        return `
        You are tasked to generate a comprehensive, ISO/IEEE-standard Project Management Documentation based on the following House of Quality (HoQ) analysis.

        The following JSON-like data is available:

        - Customer Requirements (sorted by importance):
        ${JSON.stringify(requirements, null, 2)}

        - Technical Characteristics (sorted by manualImportance):
        ${JSON.stringify(characteristics, null, 2)}

        You MUST structure your response exactly as follows:

        ## 1. Project Management Plan

        ### 1. Overview
        1.1. Project Summary  
        1.2. Project Deliverables  
        1.3. Evaluation of the Plan  
        1.4. References  
        1.5. Definition  

        ### 2. Project Organization
        2.1. Process Model  
        2.2. Project Organization  
        2.3. Organizational Boundaries and Interfaces  
        2.4. Project Responsible Persons  

        ### 3. Management Process
        3.1. Management Scope and Priorities  
        3.2. Supposition, Dependencies and Restrictions  
        3.3. Risk Management  
        3.4. Monitoring and Control Mechanisms  
        3.5. Staffing Plan  

        ### 4. Technical Process
        4.1. Methods, Tools and Techniques  
        4.2. Software Documentation  
        4.3. Project Support Functions  
            - 4.3.1. Software Configuration Management (SCM)
            - 4.3.2. Software Quality Assurance
            - 4.3.3. Software Testing  

        ## 5. Work Packages, Timetable, and Budget
        5.1. Work Packages and Budget  
        5.2. Dependencies  
        5.3. Resource Requirements  
        5.4. Budget and Allocation of Resources  
        5.5. Timetable  

        ## 2. Scope Plan
        - Scope Inclusions
        - Scope Exclusions

        ## 3. User Stories
        - Top 3 User Stories with Acceptance Criteria

        ## 4. Risk Management Plan
        - Top 3 Identified Risks
        - Mitigation Strategies

        Strict rules:
        - Keep exact numbering
        - No extra sections
        - Professional, concise, complete
        `;
    }

    async function generatePlans() {
        const prompt = generateAIPrompt();
        submitBtn.disabled = true;
        submitBtn.textContent = "Generating...";

        try {
            const response = await fetch("/generate-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "tngtech/deepseek-r1t-chimera:free",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7,
                    max_tokens: 2000
                })
            });

            if (!response.ok) throw new Error("API request failed");
            const data = await response.json();
            displayAIResults(data.choices?.[0]?.message?.content);
        } catch (error) {
            console.error("Error:", error);
            alert("Failed to generate plans. Try again.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit";
        }
    }

    function displayAIResults(aiText) {
        const sections = aiText.split(/(?=^##\s*\d\.\s+)/gm);

        function formatContent(text) {
            text = text.replace(/^##\s*(\d\.\s+.*)$/gm, '<h2>$1</h2>');
            text = text.replace(/^###\s*(.*)$/gm, '<h3>$1</h3>');
            text = text.replace(/\n/g, "<br>");
            return text;
        }

        if (sections.length < 4) {
            document.querySelectorAll('.tab-content .result-text')
                .forEach(tab => (tab.innerHTML = formatContent(aiText)));
        } else {
            document.querySelector('#pmp .result-text').innerHTML =
                formatContent(sections[0] || '');
            document.querySelector('#scope .result-text').innerHTML =
                formatContent(sections[1] || '');
            document.querySelector('#stories .result-text').innerHTML =
                formatContent(sections[2] || '');
            document.querySelector('#risk .result-text').innerHTML =
                formatContent(sections[3] || '');
        }

        document.getElementById('result-tabs').style.display = 'block';
        document.querySelector('.tab-button').click();
    }

    function setupFormValidation() {
        submitBtn.style.display = 'none';

        submitBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (!validateForm()) return;
            generatePlans();
        });
    }

    // Tabs
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function () {
            document
                .querySelectorAll('.tab-button')
                .forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            document
                .querySelectorAll('.tab-content')
                .forEach(tab => (tab.style.display = 'none'));

            document.getElementById(this.getAttribute('data-tab')).style.display =
                'block';
        });
    });

    init();
});
