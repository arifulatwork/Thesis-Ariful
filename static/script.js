document.addEventListener('DOMContentLoaded', function () {
  // ===================== DOM ELEMENTS =====================
  const table = document.getElementById('house-of-quality');
  if (!table) return;

  const tbody = table.querySelector('tbody');
  const thead = table.querySelector('thead');
  const submitBtn = document.getElementById('generate-plans');

  let competitorsVisible = true;

  // ===================== INIT =====================
  function init() {
    initializeSelectBoxes();
    updateImportanceValues();
    setupCompetitorColumns(); // no-op
    ensureTechnicalComparisonRow();
    initializeTechCompetitorDefaults();
    ensureCriticalCharacteristicsRow();
    updateCriticalCharacteristics();
    syncTopCharacteristicRow();
    syncRoofRow();
    setupEventListeners();
    setupFormValidation();
    validateForm();
    updateCompetitiveResults();
    updateServiceImportance();
  }

  // ===================== RELATIONSHIP ICONS =====================
  function updateSelectedIcon(select) {
    const selectedOption = select.options[select.selectedIndex];
    select.setAttribute('data-selected-icon', selectedOption?.getAttribute('data-icon') || '');
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

  // ===================== TARGET DIRECTION ROW =====================
  function syncTopCharacteristicRow() {
    const topRow = thead.querySelector('.characteristic-top-row');
    if (!topRow) return;

    const nameInputs = Array.from(thead.querySelectorAll('.characteristic-name'));
    const charCount = nameInputs.length || 3;

    const prevValues = Array.from(topRow.querySelectorAll('.target-direction')).map(sel => sel.value);
    const totalCompetitorCols = 6; // 5 companies + 1 highlight

    topRow.innerHTML = '';

    const labelTh = document.createElement('th');
    labelTh.colSpan = 2;
    labelTh.className = 'target-direction-header';
    labelTh.textContent = 'Target Direction';
    topRow.appendChild(labelTh);

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

      if (prevValues[i]) {
        select.value = prevValues[i];
      } else {
        // Smart defaults
        switch (i) {
          case 0: select.value = '↓'; break; // response time
          case 1: select.value = '↑'; break; // accuracy
          case 2: select.value = '↓'; break; // UI steps/complexity
          case 3:
          case 4:
          case 5: select.value = '↑'; break; // security/automation
          default: select.value = '0';
        }
      }

      th.appendChild(select);
      topRow.appendChild(th);
    }

    // tail alignment (importance-of-service + toggle)
    let th = document.createElement('th');
    topRow.appendChild(th);

    th = document.createElement('th');
    topRow.appendChild(th);

    // competitor group alignment
    for (let i = 0; i < totalCompetitorCols; i++) {
      th = document.createElement('th');
      topRow.appendChild(th);
    }
  }

  // ===================== ROOF CORRELATION MATRIX =====================
  const correlationDefaults = {
    '0-1': '-', '0-2': '-', '0-3': '-', '0-4': '0', '0-5': '0',
    '1-2': '0', '1-3': '+', '1-4': '+', '1-5': '+',
    '2-3': '0', '2-4': '0', '2-5': '0',
    '3-4': '+', '3-5': '0',
    '4-5': '+'
  };

  function getCorrelationDefault(i, j) {
    const low = Math.min(i, j);
    const high = Math.max(i, j);
    const key = `${low}-${high}`;
    return correlationDefaults[key] || '';
  }

  function syncRoofRow() {
    const roofRow = thead.querySelector('.roof-row');
    if (!roofRow) return;

    const nameInputs = Array.from(thead.querySelectorAll('.characteristic-name'));
    const charCount = nameInputs.length || 3;
    const totalCompetitorCols = 6;

    // keep previous selections if already built
    const prevMap = {};
    roofRow.querySelectorAll('.roof-corr-select').forEach(sel => {
      const i = sel.getAttribute('data-i');
      const j = sel.getAttribute('data-j');
      if (i !== null && j !== null) prevMap[`${i}-${j}`] = sel.value;
    });

    roofRow.innerHTML = '';

    // two blank cells before characteristics
    let th = document.createElement('th');
    roofRow.appendChild(th);
    th = document.createElement('th');
    roofRow.appendChild(th);

    for (let j = 0; j < charCount; j++) {
      const roofTh = document.createElement('th');
      roofTh.className = 'roof-cell';

      if (j === 0) {
        roofRow.appendChild(roofTh);
        continue;
      }

      const group = document.createElement('div');
      group.className = 'roof-corr-group';

      for (let i = 0; i < j; i++) {
        const row = document.createElement('div');
        row.className = 'roof-corr-row';

        const label = document.createElement('span');
        label.className = 'roof-corr-label';
        label.textContent = `TR${i + 1}`;

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

        const key = `${i}-${j}`;
        if (prevMap[key]) {
          select.value = prevMap[key];
        } else {
          const def = getCorrelationDefault(i, j);
          if (def) select.value = def;
        }

        row.appendChild(label);
        row.appendChild(select);
        group.appendChild(row);
      }

      roofTh.appendChild(group);
      roofRow.appendChild(roofTh);
    }

    // tail alignment
    th = document.createElement('th');
    roofRow.appendChild(th); // above Importance of Service
    th = document.createElement('th');
    roofRow.appendChild(th); // above toggle

    for (let i = 0; i < totalCompetitorCols; i++) {
      th = document.createElement('th');
      roofRow.appendChild(th);
    }
  }

  // ===================== TOGGLE COMPETITOR COLUMNS =====================
  function toggleCompetitorColumns() {
    competitorsVisible = !competitorsVisible;

    const toggleBtn = document.getElementById('toggle-competitors');
    if (toggleBtn) toggleBtn.textContent = competitorsVisible ? '-' : '+';

    document.querySelectorAll(
      '.competitor-column, .competitor-header, .tech-competitor-cell, .competitive-result-column, .competitive-result-header'
    ).forEach(el => {
      el.style.display = competitorsVisible ? 'table-cell' : 'none';
    });
  }

  // ===================== IMPORTANCE CALCULATIONS (ABS & REL) =====================
  function updateImportanceValues() {
    const requirementRows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.id);
    const absImpRow = document.getElementById('absolute-importance-row');
    const relImpRow = document.getElementById('relative-importance-row');
    if (!absImpRow || !relImpRow) return;

    const absImpCells = absImpRow.querySelectorAll('.absolute-importance');
    const relImpCells = relImpRow.querySelectorAll('.relative-importance');

    absImpCells.forEach(cell => (cell.value = 0));
    relImpCells.forEach(cell => (cell.value = 0));

    requirementRows.forEach(row => {
      const importance = parseFloat(row.querySelector('.importance')?.value) || 0;
      const selects = row.querySelectorAll('.relationship-select');
      selects.forEach((select, index) => {
        const relValue = parseFloat(select.value) || 0;
        if (!absImpCells[index]) return;
        absImpCells[index].value = (parseFloat(absImpCells[index].value) || 0) + importance * relValue;
      });
    });

    const totalAbsImp = Array.from(absImpCells).reduce((sum, cell) => sum + (parseFloat(cell.value) || 0), 0);

    absImpCells.forEach((cell, index) => {
      const absValue = parseFloat(cell.value) || 0;
      if (!relImpCells[index]) return;
      relImpCells[index].value = totalAbsImp === 0 ? 0 : ((absValue / totalAbsImp) * 100).toFixed(2);
    });

    updateCriticalCharacteristics();
    updateCompetitiveResults();
    updateServiceImportance();
  }

  // ===================== GLOBAL COMPETITOR SUMMARY =====================
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

  function computeCompetitorSummaryForPrompt() {
    const requirementRows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.id);

    let totalOur = 0;
    let totalBest = 0;

    requirementRows.forEach(row => {
      const importance = parseFloat(row.querySelector('.importance')?.value) || 0;
      if (importance <= 0) return;

      const competitorInputs = row.querySelectorAll('.competitor-column input');
      const ratings = Array.from(competitorInputs).map(input => {
        const v = parseFloat(input.value);
        return isNaN(v) ? 0 : v;
      });

      if (!ratings.length) return;

      const ourRating = ratings[0] || 0;
      const competitorRatings = ratings.slice(1);
      const bestCompetitorRating = competitorRatings.length ? Math.max(...competitorRatings) : 0;

      totalOur += importance * ourRating;
      totalBest += importance * bestCompetitorRating;
    });

    const eps = 1e-6;
    let verdict = '';
    if (totalOur === 0 && totalBest === 0) verdict = 'Not enough valid competitor data.';
    else if (totalOur > totalBest + eps) verdict = 'Our company is overall BEST based on weighted competitor analysis.';
    else if (Math.abs(totalOur - totalBest) <= eps) verdict = 'Our company is overall at PARITY with the best competitor.';
    else verdict = 'Our company is NOT the best overall – competitors lead in weighted score.';

    return { totalOurScore: totalOur, totalBestCompetitorScore: totalBest, verdict };
  }

  function updateCompetitorSummary() {
    const summary = ensureCompetitorSummaryContainer();
    const stats = computeCompetitorSummaryForPrompt();

    if (stats.totalOurScore === 0 && stats.totalBestCompetitorScore === 0) {
      summary.innerHTML = 'Not enough valid competitor data for summary.';
      return;
    }

    summary.innerHTML = `
      <strong>Competitor Analysis (weighted by customer requirement importance)</strong><br>
      Total Our Company (Σ Importance × Company 1): <strong>${stats.totalOurScore.toFixed(2)}</strong><br>
      Total Best Competitor (Σ Importance × Best Competitor): <strong>${stats.totalBestCompetitorScore.toFixed(2)}</strong><br>
      ${stats.verdict}
    `;
  }

  // ===================== PER-REQUIREMENT COMPETITIVE RESULT =====================
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

      const ourRating = ratings[0];
      const competitorRatings = ratings.slice(1).filter(v => v > 0);

      if (ourRating <= 0) {
        competitiveResultCell.textContent = 'No valid score for Our Company';
        return;
      }
      if (!competitorRatings.length) {
        competitiveResultCell.textContent = 'No competitor data';
        return;
      }

      const bestCompetitorRating = Math.max(...competitorRatings);
      const diff = ourRating - bestCompetitorRating;
      const totalScore = importance * diff;

      let comment = '';
      if (totalScore > 0) comment = 'Overall advantage vs best competitor (positive score).';
      else if (totalScore < 0) comment = 'Overall disadvantage – best competitor leads (negative score).';
      else comment = 'At parity with best competitor (no net advantage).';

      competitiveResultCell.textContent =
        `Score: ${totalScore.toFixed(2)} | Importance: ${importance.toFixed(2)}, ` +
        `Our Rating: ${ourRating.toFixed(1)}/5, Best Competitor: ${bestCompetitorRating.toFixed(1)}/5, ` +
        `Others: ${competitorRatings.join(', ')}. ` +
        comment;
    });

    updateCompetitorSummary();
  }

  // ===================== IMPORTANCE OF SERVICE (1–10) =====================
  function updateServiceImportance() {
    const requirementRows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.id);
    if (!requirementRows.length) return;

    const rawScores = [];

    requirementRows.forEach(row => {
      const importance = parseFloat(row.querySelector('.importance')?.value) || 0;
      const competitorInputs = row.querySelectorAll('.competitor-column input');
      const ratings = Array.from(competitorInputs).map(input => {
        const v = parseFloat(input.value);
        return isNaN(v) ? 0 : v;
      });

      if (importance <= 0 || ratings.length < 2) {
        rawScores.push(0);
        return;
      }

      const ourRating = ratings[0] || 0;
      const competitorRatings = ratings.slice(1).filter(v => v > 0);

      if (ourRating <= 0 || !competitorRatings.length) {
        rawScores.push(0);
        return;
      }

      const bestCompetitor = Math.max(...competitorRatings);
      const gapPos = Math.max(0, bestCompetitor - ourRating);
      const raw = importance * (1 + gapPos);
      rawScores.push(raw);
    });

    const maxRaw = Math.max(...rawScores);
    const minRaw = Math.min(...rawScores);

    requirementRows.forEach((row, idx) => {
      const serviceInput = row.querySelector('.characteristic-importance');
      if (!serviceInput) return;

      const raw = rawScores[idx];
      let score;

      if (!isFinite(raw) || raw <= 0 || maxRaw === minRaw) {
        const importance = parseFloat(row.querySelector('.importance')?.value) || 0;
        score = Math.max(1, Math.min(10, Math.round(importance)));
      } else {
        const norm = (raw - minRaw) / (maxRaw - minRaw);
        score = 1 + 9 * norm;
        score = Math.max(1, Math.min(10, Math.round(score)));
      }

      serviceInput.value = score;
    });
  }

  // ===================== TECH COMPETITOR + CRITICAL ROWS =====================
  function buildTechCompetitorCell() {
    const td = document.createElement('td');
    td.className = 'tech-competitor-cell';
    td.innerHTML = `
      <div class="tech-competitor-group">
        <label>Company A</label><select class="tech-competitor-input">
          <option value="">-</option><option value="5">++ (5)</option><option value="4">+ (4)</option>
          <option value="3">0 (3)</option><option value="2">– (2)</option><option value="1">–– (1)</option>
        </select>
        <label>Company B</label><select class="tech-competitor-input">
          <option value="">-</option><option value="5">++ (5)</option><option value="4">+ (4)</option>
          <option value="3">0 (3)</option><option value="2">– (2)</option><option value="1">–– (1)</option>
        </select>
        <label>Company C</label><select class="tech-competitor-input">
          <option value="">-</option><option value="5">++ (5)</option><option value="4">+ (4)</option>
          <option value="3">0 (3)</option><option value="2">– (2)</option><option value="1">–– (1)</option>
        </select>
        <label>Company D</label><select class="tech-competitor-input">
          <option value="">-</option><option value="5">++ (5)</option><option value="4">+ (4)</option>
          <option value="3">0 (3)</option><option value="2">– (2)</option><option value="1">–– (1)</option>
        </select>
        <label>Company E</label><select class="tech-competitor-input">
          <option value="">-</option><option value="5">++ (5)</option><option value="4">+ (4)</option>
          <option value="3">0 (3)</option><option value="2">– (2)</option><option value="1">–– (1)</option>
        </select>
      </div>
    `;
    return td;
  }

  function initializeTechCompetitorDefaults() {
    const techCells = Array.from(
      document.querySelectorAll('#technical-competitor-comparison-row .tech-competitor-cell')
    );
    if (!techCells.length) return;

    const techRatings = [
      [5, 4, 3, 4, 2],
      [4, 5, 3, 4, 2],
      [5, 3, 3, 4, 2],
      [5, 4, 3, 4, 2],
      [5, 4, 3, 4, 2],
      [4, 3, 2, 5, 1]
    ];

    techCells.forEach((cell, index) => {
      const ratings = techRatings[index];
      if (!ratings) return;

      const selects = Array.from(cell.querySelectorAll('.tech-competitor-input'));
      selects.forEach((sel, companyIndex) => {
        if (sel.value && sel.value !== '') return;
        const rating = ratings[companyIndex];
        if (!rating) return;
        sel.value = String(rating);
      });
    });
  }

  function buildCriticalCharacteristicCell() {
    const td = document.createElement('td');
    td.innerHTML = `<input type="text" class="critical-characteristic" value="No" readonly>`;
    return td;
  }

  function ensureTechnicalComparisonRow() {
    const relRow = document.getElementById('relative-importance-row');
    if (!relRow) return;

    const charCount = thead.querySelectorAll('.characteristic-name').length || 3;
    const techRow = document.getElementById('technical-competitor-comparison-row');
    if (!techRow) return; // your HTML already includes it

    // Ensure number of cells = charCount
    const existing = techRow.querySelectorAll('.tech-competitor-cell').length;

    if (existing < charCount) {
      const anchor = techRow.querySelector('.importance-column');
      for (let i = 0; i < charCount - existing; i++) {
        techRow.insertBefore(buildTechCompetitorCell(), anchor);
      }
    } else if (existing > charCount) {
      for (let i = 0; i < existing - charCount; i++) {
        const anchor = techRow.querySelector('.importance-column');
        const candidate = anchor?.previousElementSibling;
        if (candidate?.classList?.contains('tech-competitor-cell')) techRow.removeChild(candidate);
      }
    }

    if (!competitorsVisible) {
      techRow.querySelectorAll('.tech-competitor-cell').forEach(el => (el.style.display = 'none'));
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

      // Insert right after techRow
      if (techRow.nextSibling) tbody.insertBefore(criticalRow, techRow.nextSibling);
      else tbody.appendChild(criticalRow);
    } else {
      // Resize row if chars changed
      const existing = criticalRow.querySelectorAll('.critical-characteristic').length;
      if (existing < charCount) {
        const anchor = criticalRow.querySelector('.importance-column');
        for (let i = 0; i < charCount - existing; i++) {
          criticalRow.insertBefore(buildCriticalCharacteristicCell(), anchor);
        }
      } else if (existing > charCount) {
        for (let i = 0; i < existing - charCount; i++) {
          const anchor = criticalRow.querySelector('.importance-column');
          const candidate = anchor?.previousElementSibling;
          if (candidate?.querySelector?.('.critical-characteristic')) criticalRow.removeChild(candidate);
        }
      }
    }

    updateCriticalCharacteristics();
  }

  function updateCriticalCharacteristics() {
    const criticalRow = document.getElementById('critical-characteristics-row');
    const orgRow = document.getElementById('organization-difficulty-row');
    const relRow = document.getElementById('relative-importance-row');
    if (!criticalRow || !orgRow || !relRow) return;

    const criticalInputs = criticalRow.querySelectorAll('.critical-characteristic');
    const difficultyInputs = orgRow.querySelectorAll('.difficulty');
    const relInputs = relRow.querySelectorAll('.relative-importance');
    const charCount = thead.querySelectorAll('.characteristic-name').length || 0;

    const sumImportancePerChar = new Array(charCount).fill(0);
    const countPerChar = new Array(charCount).fill(0);

    const requirementRows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.id);

    requirementRows.forEach(row => {
      const importance = parseFloat(row.querySelector('.importance')?.value) || 0;
      if (importance <= 0) return;

      row.querySelectorAll('.relationship-select').forEach((select, index) => {
        if (index >= charCount) return;
        const relVal = parseFloat(select.value) || 0;
        if (relVal > 0) {
          sumImportancePerChar[index] += importance;
          countPerChar[index] += 1;
        }
      });
    });

    for (let j = 0; j < charCount; j++) {
      const ccInput = criticalInputs[j];
      const relInput = relInputs[j];
      const diffInput = difficultyInputs[j];

      if (!ccInput || !relInput || !diffInput) continue;

      const avgCustomerImportance = countPerChar[j] ? (sumImportancePerChar[j] / countPerChar[j]) : 0;
      const relValue = parseFloat(relInput.value) || 0;
      const diffValue = parseFloat(diffInput.value) || 0;

      const isHighRelImportance = relValue >= 30;
      const isHighCustomerImportance = avgCustomerImportance >= 7;
      const isHighDifficulty = diffValue >= 7;

      ccInput.value = (isHighRelImportance && isHighCustomerImportance && isHighDifficulty) ? 'Yes' : 'No';
    }
  }

  // ===================== REQUIREMENT ROWS (ADD/DELETE) =====================
  function addRequirement() {
    const newRow = document.createElement('tr');
    const rowCount = Array.from(tbody.querySelectorAll('tr')).filter(r => !r.id).length;
    const characteristicCount = thead.querySelectorAll('.characteristic-name').length || 3;

    newRow.innerHTML = `
      <td><input type="text" class="requirement-name" value="Requirement ${rowCount + 1}"></td>
      <td><input type="number" class="importance" value="5"></td>

      ${Array.from({ length: characteristicCount }, () => `
        <td>
          <select class="relationship-select">
            <option value="0">-</option>
            <option value="9" data-icon="●">Strong (9)</option>
            <option value="3" data-icon="○">Medium (3)</option>
            <option value="1" data-icon="▲">Weak (1)</option>
          </select>
        </td>
      `).join('')}

      <td class="importance-column">
        <input type="number" class="characteristic-importance" value="5" min="1" max="10">
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
    if (orgDiffRow) tbody.insertBefore(newRow, orgDiffRow);
    else tbody.appendChild(newRow);

    initializeSelectBoxes();
    updateImportanceValues();
    validateForm();

    newRow.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', function () {
        validateForm();
        if (this.classList.contains('importance')) {
          updateImportanceValues();
          updateCompetitiveResults();
          updateServiceImportance();
        }
        if (this.closest('.competitor-column')) {
          updateCompetitiveResults();
          updateServiceImportance();
        }
      });
    });

    updateCompetitiveResults();
    updateServiceImportance();
  }

  function deleteRequirement() {
    const requirementRows = Array.from(tbody.querySelectorAll('tr')).filter(r => !r.id);
    if (requirementRows.length > 3) {
      tbody.removeChild(requirementRows[requirementRows.length - 1]);
      updateImportanceValues();
      validateForm();
      updateCompetitiveResults();
      updateServiceImportance();
    } else {
      alert('At least 3 requirements must remain.');
    }
  }

  // ===================== CHARACTERISTICS (ADD/DELETE) =====================
  function addCharacteristic() {
    const headerRow = thead.querySelector('tr:last-child');
    if (!headerRow) return;

    const newHeader = document.createElement('th');
    newHeader.innerHTML = `<input type="text" class="characteristic-name" value="Characteristic">`;

    const firstCompetitorHeader = headerRow.querySelector('.competitor-column');
    headerRow.insertBefore(newHeader, firstCompetitorHeader);

    const techCharHeader = thead.querySelector('tr:nth-child(3) th[colspan]');
    if (techCharHeader) {
      techCharHeader.setAttribute('colspan', parseInt(techCharHeader.getAttribute('colspan')) + 1);
    }

    tbody.querySelectorAll('tr').forEach(row => {
      // Tech competitor row
      if (row.id === 'technical-competitor-comparison-row') {
        const anchor = row.querySelector('.importance-column');
        row.insertBefore(buildTechCompetitorCell(), anchor);
        return;
      }

      // Critical row
      if (row.id === 'critical-characteristics-row') {
        const anchor = row.querySelector('.importance-column');
        row.insertBefore(buildCriticalCharacteristicCell(), anchor);
        return;
      }

      // All other rows: insert cell before importance column
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
    initializeTechCompetitorDefaults();
    ensureCriticalCharacteristicsRow();
    syncTopCharacteristicRow();
    syncRoofRow();
    updateCompetitiveResults();
    updateServiceImportance();
  }

  function deleteCharacteristic() {
    const headerRow = thead.querySelector('tr:last-child');
    if (!headerRow) return;

    const charHeaders = headerRow.querySelectorAll('.characteristic-name');
    if (charHeaders.length <= 3) {
      alert('At least 3 characteristics must remain.');
      return;
    }

    const firstCompetitorHeader = headerRow.querySelector('.competitor-column');
    const candidate = firstCompetitorHeader?.previousElementSibling;
    if (candidate) headerRow.removeChild(candidate);

    const techCharHeader = thead.querySelector('tr:nth-child(3) th[colspan]');
    if (techCharHeader) {
      techCharHeader.setAttribute('colspan', parseInt(techCharHeader.getAttribute('colspan')) - 1);
    }

    tbody.querySelectorAll('tr').forEach(row => {
      if (row.id === 'technical-competitor-comparison-row') {
        const anchor = row.querySelector('.importance-column');
        const cell = anchor?.previousElementSibling;
        if (cell?.classList?.contains('tech-competitor-cell')) row.removeChild(cell);
        return;
      }
      if (row.id === 'critical-characteristics-row') {
        const anchor = row.querySelector('.importance-column');
        const cell = anchor?.previousElementSibling;
        if (cell?.querySelector?.('.critical-characteristic')) row.removeChild(cell);
        return;
      }

      const anchor = row.querySelector('.importance-column');
      const cell = anchor?.previousElementSibling;
      if (cell && cell.tagName === 'TD') row.removeChild(cell);
    });

    updateImportanceValues();
    validateForm();
    ensureTechnicalComparisonRow();
    initializeTechCompetitorDefaults();
    ensureCriticalCharacteristicsRow();
    syncTopCharacteristicRow();
    syncRoofRow();
    updateCompetitiveResults();
    updateServiceImportance();
  }

  function setupCompetitorColumns() {
    // HTML defines columns
  }

  // ===================== FORM VALIDATION =====================
  function validateForm() {
    const requirementsValid = validateRequirements();
    const characteristicsValid = validateCharacteristics();
    const relationshipsValid = validateRelationships();
    const characteristicImportanceValid = validateCharacteristicImportance();

    const isValid = requirementsValid && characteristicsValid && relationshipsValid && characteristicImportanceValid;
    if (submitBtn) submitBtn.style.display = isValid ? 'block' : 'none';
    return isValid;
  }

  function validateRequirements() {
    let isValid = true;
    document.querySelectorAll('.requirement-name, .importance').forEach(input => {
      if (!input.value.trim()) {
        isValid = false;
        input.style.border = '1px solid red';
      } else input.style.border = '';
    });
    return isValid;
  }

  function validateCharacteristics() {
    let isValid = true;
    document.querySelectorAll('.characteristic-name').forEach(input => {
      if (!input.value.trim()) {
        isValid = false;
        input.style.border = '1px solid red';
      } else input.style.border = '';
    });
    return isValid;
  }

  function validateRelationships() {
    let isValid = true;
    document.querySelectorAll('.relationship-select').forEach(select => {
      if (select.value === '0') {
        isValid = false;
        select.style.border = '1px solid red';
      } else select.style.border = '';
    });
    return isValid;
  }

  function validateCharacteristicImportance() {
    let isValid = true;
    document.querySelectorAll('.characteristic-importance').forEach(input => {
      const v = parseFloat(input.value);
      if (!input.value.trim() || isNaN(v) || v < 1 || v > 10) {
        isValid = false;
        input.style.border = '1px solid red';
      } else input.style.border = '';
    });
    return isValid;
  }

  // ===================== EVENT LISTENERS =====================
  function setupEventListeners() {
    document.getElementById('add-requirement')?.addEventListener('click', addRequirement);
    document.getElementById('delete-requirement')?.addEventListener('click', deleteRequirement);
    document.getElementById('add-characteristic')?.addEventListener('click', addCharacteristic);
    document.getElementById('delete-characteristic')?.addEventListener('click', deleteCharacteristic);
    document.getElementById('toggle-competitors')?.addEventListener('click', toggleCompetitorColumns);

    // Input listeners
    document
      .querySelectorAll('.requirement-name, .importance, .characteristic-name, .relationship-select, .characteristic-importance')
      .forEach(el => {
        el.addEventListener('input', function () {
          validateForm();

          if (this.classList.contains('characteristic-name')) {
            syncTopCharacteristicRow();
            syncRoofRow();
          }

          if (this.classList.contains('importance') || this.classList.contains('relationship-select')) {
            updateImportanceValues();
            updateCompetitiveResults();
            updateServiceImportance();
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
        updateServiceImportance();
      });
    });

    document.querySelectorAll('.difficulty').forEach(input => {
      input.addEventListener('input', function () {
        validateForm();
        updateCriticalCharacteristics();
      });
    });
  }

  // ===================== HOQ DATA EXTRACTOR =====================
  function extractHoQDataForAI() {
    // Requirements
    const requirementNames = Array.from(document.querySelectorAll('.requirement-name'));
    const importanceInputs = document.querySelectorAll('.importance');
    const relativeReqImp = document.querySelectorAll('#relative-importance-row .relative-importance'); // tech-only row
    const serviceImpInputs = document.querySelectorAll('.characteristic-importance'); // per requirement
    const competitiveTexts = document.querySelectorAll('.competitive-result-text');

    const requirements = requirementNames
      .map((input, index) => ({
        name: input.value.trim(),
        importance: importanceInputs[index]?.value || '0',
        relativeImportance: '0', // requirements relative importance isn't computed in your sheet
        serviceImportanceScore: serviceImpInputs[index]?.value || '0',
        competitiveResult: competitiveTexts[index]?.textContent || 'No analysis'
      }))
      .filter(r => r.name);

    // Technical characteristics
    const charNameInputs = document.querySelectorAll('.characteristic-name');
    const difficultyInputs = document.querySelectorAll('#organization-difficulty-row .difficulty');
    const absImpInputs = document.querySelectorAll('#absolute-importance-row .absolute-importance');
    const relImpInputs = document.querySelectorAll('#relative-importance-row .relative-importance');
    const criticalInputs = document.querySelectorAll('#critical-characteristics-row .critical-characteristic');
    const targetDirs = Array.from(document.querySelectorAll('.target-direction')).map(s => s.value || '0');

    const characteristics = Array.from(charNameInputs)
      .map((input, index) => ({
        name: input.value.trim(),
        difficulty: difficultyInputs[index]?.value || '1',
        absoluteImportance: absImpInputs[index]?.value || '0',
        relativeImportance: relImpInputs[index]?.value || '0',
        manualImportance: relImpInputs[index]?.value || '0',
        targetDirection: targetDirs[index] || '0',
        criticalFlag: criticalInputs[index]?.value || 'No'
      }))
      .filter(c => c.name);

    // Roof correlations
    const charNames = Array.from(charNameInputs).map(inp => inp.value.trim());
    const correlations = [];
    document.querySelectorAll('.roof-corr-select').forEach(sel => {
      const i = parseInt(sel.getAttribute('data-i'), 10);
      const j = parseInt(sel.getAttribute('data-j'), 10);
      const v = sel.value;
      if (!isNaN(i) && !isNaN(j) && v) {
        correlations.push({
          fromIndex: i,
          toIndex: j,
          from: charNames[i] || `TR${i + 1}`,
          to: charNames[j] || `TR${j + 1}`,
          correlation: v
        });
      }
    });

    const competitorSummary = computeCompetitorSummaryForPrompt();

    // Sort requirements by service importance then importance
    requirements.sort(
      (a, b) =>
        (parseFloat(b.serviceImportanceScore) || 0) - (parseFloat(a.serviceImportanceScore) || 0) ||
        (parseFloat(b.importance) || 0) - (parseFloat(a.importance) || 0)
    );

    // Sort characteristics by rel importance
    characteristics.sort(
      (a, b) => (parseFloat(b.relativeImportance) || 0) - (parseFloat(a.relativeImportance) || 0)
    );

    return { requirements, characteristics, correlations, competitorSummary };
  }

  // ===================== AI PROMPTS =====================
  function buildPrompt(docType) {
    const { requirements, characteristics, correlations, competitorSummary } = extractHoQDataForAI();

    const commonHeader = `
You are an expert software project manager and requirements engineer.

You are given a fully evaluated extended 15-step House of Quality (HoQ) for a software/digital product project.
You MUST use the HoQ data as the decision backbone. Avoid inventing unrelated features.

HoQ-derived structured data:
- Customer Requirements (sorted by priority and service importance):
${JSON.stringify(requirements, null, 2)}

- Technical Characteristics (sorted by relative importance and criticality):
${JSON.stringify(characteristics, null, 2)}

- Technical Correlation Matrix (roof TRi–TRj pairs, '+', '0', '-'):
${JSON.stringify(correlations, null, 2)}

- Global Competitor Summary (weighted by requirement importance):
${JSON.stringify(competitorSummary, null, 2)}

Interpretation hints:
- High "importance" and "serviceImportanceScore" = very critical customer requirement.
- High "relativeImportance" = strong leverage on customer value.
- "criticalFlag" = "Yes" means this characteristic is critical (high importance + high difficulty).
- "competitiveResult" indicates where we are strong/weak vs best competitor.
- Correlations '+'/'-' influence trade-offs and risks.
`.trim();

    if (docType === 'PMP') {
      return `
${commonHeader}

Your task:
Generate ONLY a **complete Project Management Plan (PMP)** in strict ISO/IEEE style.
Output text in the exact structure below (no extra top-level sections):

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

### 5. Work Packages, Timetable, and Budget
5.1. Work Packages and Budget  
5.2. Dependencies  
5.3. Resource Requirements  
5.4. Budget and Allocation of Resources  
5.5. Timetable  

STRICT RULES:
- Use HoQ priorities to justify scope, work packages, testing, and risk.
- Reflect critical technical characteristics in risks, methods/tools, and budget emphasis.
- Use competitor weaknesses/strengths to justify priorities and quality targets.
- Do NOT add separate documents inside PMP.
`.trim();
    }

    if (docType === 'SCOPE') {
      return `
${commonHeader}

Your task:
Generate ONLY a **Scope Management Plan** (ISO/IEEE style) derived from the HoQ.

You MUST output text in this exact structure (no extra top-level sections):

## 2. Scope Management Plan

### 2.1 Scope Statement
2.1.1 Project Objectives  
2.1.2 In-Scope Deliverables  
2.1.3 Out-of-Scope Items  
2.1.4 Assumptions and Constraints  
2.1.5 Acceptance Criteria  

### 2.2 Requirements Management
2.2.1 Requirements Baseline (from HoQ)  
2.2.2 Prioritization Rules (importance, serviceImportanceScore, competitive gaps)  
2.2.3 Traceability Strategy (Requirement ↔ Technical Characteristic ↔ Deliverables)  
2.2.4 Change Control for Requirements  

### 2.3 Scope Verification and Control
2.3.1 Verification Activities (reviews, demos, tests)  
2.3.2 Control Mechanisms (scope creep prevention)  
2.3.3 Definition of Done (DoD) criteria  

STRICT RULES:
- Use top HoQ requirements as the core scope drivers.
- Translate top technical characteristics into measurable deliverables and acceptance criteria.
- Use competitor disadvantages to strengthen acceptance criteria and priorities.
`.trim();
    }

    if (docType === 'RISK') {
      return `
${commonHeader}

Your task:
Generate ONLY a **Risk Register** derived from HoQ (not a narrative essay).

You MUST output in this exact structure:

## 3. Risk Register (HoQ-Derived)

### 3.1 Risk Scoring Method
- Explain a simple scoring (Probability 1–5, Impact 1–5, Exposure = P×I).
- Explain how HoQ drives risks:
  - High technical difficulty => higher probability
  - criticalFlag "Yes" => higher impact
  - Negative roof correlations '-' => integration/trade-off risk
  - Competitive disadvantage => market/quality risk

### 3.2 Risk Table
Provide a markdown table with columns EXACTLY:
| ID | HoQ Driver (Req/Tech/Correlation/Competition) | Risk Description | Category | Probability (1-5) | Impact (1-5) | Exposure | Mitigation | Owner | Trigger | Status |

STRICT RULES:
- Create 12–18 risks minimum.
- Every risk must cite a specific HoQ driver: a requirement name, a technical characteristic name, or a roof correlation pair.
- Include at least: technical, schedule, cost, quality, security/privacy, integration, stakeholder risks.
`.trim();
    }

    if (docType === 'STORIES') {
      return `
${commonHeader}

Your task:
Generate ONLY **User Stories** derived from the HoQ.

You MUST output in this exact structure:

## 4. User Stories (HoQ-Derived)

### 4.1 Story Writing Rules
- Explain mapping: top requirements → epics; technical characteristics → acceptance criteria/constraints.
- Mention competitor disadvantage → stricter acceptance criteria.

### 4.2 Prioritized Backlog (User Stories)
Provide 12–20 user stories minimum.
Each story MUST follow this template:

**US-<number>: <Title>**  
As a <user/persona>, I want <goal>, so that <benefit>.  
**Priority:** (High/Medium/Low)  
**HoQ Traceability:** Requirement(s): <names> | Technical Characteristic(s): <names>  
**Acceptance Criteria:**  
- <Given/When/Then bullets, minimum 3>  
**Non-Functional Notes:** (performance/security/usability/etc, based on targetDirection and difficulty)

STRICT RULES:
- Highest priority stories must map to highest serviceImportanceScore requirements and highest relativeImportance technical characteristics.
- At least 5 stories must include measurable NFRs.
`.trim();
    }

    if (docType === 'BENEFITS') {
      return `
${commonHeader}

Your task:
Generate ONLY a **Benefits Plan / Benefits Register** derived from HoQ.

You MUST output in this exact structure:

## 5. Benefits Plan (HoQ-Derived)

### 5.1 Benefit Identification Logic
- Explain how benefits are derived:
  - High importance + competitor disadvantage => high strategic benefit
  - High relativeImportance tech characteristics => leverage benefits
  - targetDirection indicates improvement direction (↑ or ↓)
- Define benefit types: customer, business, operational, compliance, quality.

### 5.2 Benefits Register
Provide a markdown table with columns EXACTLY:
| ID | Benefit Statement | Benefit Type | HoQ Driver (Req/Tech/Competition) | Measurement KPI | Target | Baseline Assumption | Owner | Timeframe |

STRICT RULES:
- Create 10–15 benefits minimum.
- Each benefit must cite at least one HoQ driver.
- KPIs must be measurable (e.g., defect rate, response time, conversion, NPS, accuracy, churn).
`.trim();
    }

    return `${commonHeader}\n\nERROR: Unknown docType.`;
  }

  // ===================== AI CALL + RENDER =====================
  async function callAI(prompt) {
    const response = await fetch('/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2500
      })
    });

    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  function formatContent(text) {
    let t = (text || '');
    t = t.replace(/^##\s*(\d\.\s+.*)$/gm, '<h2>$1</h2>');
    t = t.replace(/^###\s*(.*)$/gm, '<h3>$1</h3>');
    t = t.replace(/\n/g, '<br>');
    return t;
  }

  function safeSetTabHtml(selector, html) {
    const el = document.querySelector(selector);
    if (el) el.innerHTML = html;
  }

  async function generateAllPlans() {
    const prompts = {
      PMP: buildPrompt('PMP'),
      SCOPE: buildPrompt('SCOPE'),
      RISK: buildPrompt('RISK'),
      STORIES: buildPrompt('STORIES'),
      BENEFITS: buildPrompt('BENEFITS')
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Generating...';

    safeSetTabHtml('#pmp .result-text', 'Generating PMP...');
    safeSetTabHtml('#scope .result-text', 'Generating Scope Plan...');
    safeSetTabHtml('#risk .result-text', 'Generating Risk Register...');
    safeSetTabHtml('#stories .result-text', 'Generating User Stories...');
    safeSetTabHtml('#benefits .result-text', 'Generating Benefits Plan...');

    try {
      const [pmp, scope, risk, stories, benefits] = await Promise.all([
        callAI(prompts.PMP),
        callAI(prompts.SCOPE),
        callAI(prompts.RISK),
        callAI(prompts.STORIES),
        callAI(prompts.BENEFITS)
      ]);

      safeSetTabHtml('#pmp .result-text', formatContent(pmp));
      safeSetTabHtml('#scope .result-text', formatContent(scope));
      safeSetTabHtml('#risk .result-text', formatContent(risk));
      safeSetTabHtml('#stories .result-text', formatContent(stories));
      safeSetTabHtml('#benefits .result-text', formatContent(benefits));

      const tabs = document.getElementById('result-tabs');
      if (tabs) tabs.style.display = 'block';

      const pmpButton = document.querySelector('.tab-button[data-tab="pmp"]') || document.querySelector('.tab-button');
      if (pmpButton) pmpButton.click();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate documents. Try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
    }
  }

  // ===================== SUBMIT =====================
  function setupFormValidation() {
    submitBtn.style.display = 'none';
    submitBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (!validateForm()) return;
      generateAllPlans();
    });
  }

  // ===================== TABS INIT =====================
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', function () {
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(tab => (tab.style.display = 'none'));

      const id = this.getAttribute('data-tab');
      const tab = document.getElementById(id);
      if (tab) tab.style.display = 'block';
    });
  });

  // ===================== START =====================
  init();
});
