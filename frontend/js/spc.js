// SPC 분석 페이지 모듈
(function() {
    // 전역 변수
    let controlChart = null;
    let selectedProductGroupId = null;
    let selectedProcessId = null;
    let selectedTargetId = null;
    let rChart = null; // 추가: R 차트 변수
    
    
    // 페이지 초기화
    async function initSpcPage() {
        // 제품군 목록 로드
        await loadProductGroups();
        
        // 이벤트 리스너 설정
        setupEventListeners();
    }
    
    // 제품군 목록 로드
    async function loadProductGroups() {
        try {
            const productGroups = await api.getProductGroups();
            
            if (productGroups && productGroups.length > 0) {
                let options = '<option value="">제품군 선택</option>';
                productGroups.forEach(productGroup => {
                    options += `<option value="${productGroup.id}">${productGroup.name}</option>`;
                });
                document.getElementById('product-group').innerHTML = options;
            }
            
        } catch (error) {
            console.error('제품군 목록 로드 실패:', error);
        }
    }
    
    // 공정 목록 로드
    async function loadProcesses(productGroupId) {
        try {
            document.getElementById('process').innerHTML = '<option value="">로딩 중...</option>';
            document.getElementById('process').disabled = true;
            
            const processes = await api.getProcesses(productGroupId);
            
            if (processes && processes.length > 0) {
                let options = '<option value="">공정 선택</option>';
                processes.forEach(process => {
                    options += `<option value="${process.id}">${process.name}</option>`;
                });
                document.getElementById('process').innerHTML = options;
                document.getElementById('process').disabled = false;
            } else {
                document.getElementById('process').innerHTML = '<option value="">공정 없음</option>';
                document.getElementById('process').disabled = true;
            }
            
        } catch (error) {
            console.error('공정 목록 로드 실패:', error);
            document.getElementById('process').innerHTML = '<option value="">공정 로드 실패</option>';
            document.getElementById('process').disabled = true;
        }
    }
    
    // 타겟 목록 로드
    async function loadTargets(processId) {
        try {
            document.getElementById('target').innerHTML = '<option value="">로딩 중...</option>';
            document.getElementById('target').disabled = true;
            
            const targets = await api.getTargets(processId);
            
            if (targets && targets.length > 0) {
                let options = '<option value="">타겟 선택</option>';
                targets.forEach(target => {
                    options += `<option value="${target.id}">${target.name}</option>`;
                });
                document.getElementById('target').innerHTML = options;
                document.getElementById('target').disabled = false;
            } else {
                document.getElementById('target').innerHTML = '<option value="">타겟 없음</option>';
                document.getElementById('target').disabled = true;
            }
            
        } catch (error) {
            console.error('타겟 목록 로드 실패:', error);
            document.getElementById('target').innerHTML = '<option value="">타겟 로드 실패</option>';
            document.getElementById('target').disabled = true;
        }
    }
    
    // SPC 분석 실행
    async function analyzeSpc() {
        // 타겟 선택 확인
        if (!selectedTargetId) {
            alert('분석할 타겟을 선택하세요.');
            return;
        }
        
        // 분석 기간 가져오기
        const days = parseInt(document.getElementById('analysis-period').value);
        
        try {
            // 로딩 표시
            document.getElementById('control-chart-container').innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">로딩 중...</span>
                </div>
                <p class="mt-2">SPC 분석 중...</p>
            </div>
            `;
            
            // R 차트 로딩 표시 추가
            document.getElementById('r-chart-container').innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">로딩 중...</span>
                </div>
                <p class="mt-2">R 차트 분석 중...</p>
            </div>
            `;

            // SPC 분석 API 호출
            const result = await api.analyzeSpc(selectedTargetId, days);

            // API 응답 로깅 (디버깅용)
            console.log(`타겟 ID ${selectedTargetId}에 대한 SPC 분석 API 응답:`, result);
            
            // 결과 표시
            updateSpcResults(result);
            
        } catch (error) {
            console.error('SPC 분석 실패:', error);
            document.getElementById('control-chart-container').innerHTML = `
            <div class="text-center py-5">
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle mr-1"></i> SPC 분석 중 오류가 발생했습니다.
                </div>
            </div>
            `;
        }
    }
    
    // SPC 분석 결과 업데이트
    function updateSpcResults(result) {
        // 패턴 정보 로깅 (디버깅용)
        console.log("SPC 분석 전체 결과:", result);
        console.log("감지된 SPC 패턴:", result.patterns);

        // 결과 체크
        if (!result || result.sample_count === 0) {
            document.getElementById('control-chart-container').innerHTML = `
            <div class="text-center py-5">
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle mr-1"></i> 분석할 데이터가 없습니다.
                </div>
            </div>
            `;
            document.getElementById('r-chart-container').innerHTML = `
            <div class="text-center py-5">
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle mr-1"></i> 분석할 데이터가 없습니다.
                </div>
            </div>
            `;
            return;
        }
        
        // 관리도 차트 그리기
        createControlChart(result);
        
        // R 차트 그리기
        createRChart(result);
        
        // 관리 한계 테이블 업데이트
        updateControlLimitsTable(result.control_limits);
        
        // 공정능력지수 테이블 업데이트 (process_capability가 없을 수도 있음)
        updateCapabilityTable(result.process_capability || {});
        
        // SPEC 테이블 업데이트
        updateSpecTable(result.spec);
        
        // 패턴 감지 결과 업데이트
        updatePatternsTable(result.patterns);
    }
    
    // 관리도 차트 생성
    function createControlChart(data) {
        // 차트 컨테이너 준비
        document.getElementById('control-chart-container').innerHTML = `
        <canvas id="control-chart"></canvas>
        `;
        
        // 차트 데이터 준비
        // labels를 날짜에서 LOT NO로 변경
        const labels = data.data.lot_nos || data.data.dates.map(date => date.split('T')[0]);
        const values = data.data.values;
        
        // Chart.js 설정
        const ctx = document.getElementById('control-chart').getContext('2d');
        
        // 기존 차트 파괴
        if (controlChart) {
            controlChart.destroy();
        }
        
        // 시그마 구간 변수 초기화
        let cl = null, ucl = null, lcl = null;
        let sigma = null;
        let zone_a_upper = null, zone_a_lower = null;
        let zone_b_upper = null, zone_b_lower = null;
        
        // 데이터셋 준비
        const datasets = [
            {
                label: 'DICD 값',
                data: values,
                borderColor: '#3c8dbc',
                backgroundColor: 'rgba(60, 141, 188, 0.1)',
                fill: false,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            }
        ];
        
        // 차트 옵션 초기화
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'DICD 관리도 차트'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'LOT NO'  // X축 제목 변경
                    },
                    ticks: {
                        // LOT NO를 90도 회전시켜 세로로 표시
                        maxRotation: 90,
                        minRotation: 90,
                        autoSkip: true,
                        maxTicksLimit: 30,
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'DICD 값'
                    }
                }
            }
        };
        
        // 관리 한계선이 있는 경우
        if (data.control_limits && data.control_limits.cl !== undefined) {
            cl = data.control_limits.cl;
            ucl = data.control_limits.ucl;
            lcl = data.control_limits.lcl;
            
            // 시그마 구간 계산 (3-시그마 기준)
            sigma = (ucl - cl) / 3;
            zone_a_upper = cl + (2 * sigma);
            zone_a_lower = cl - (2 * sigma);
            zone_b_upper = cl + sigma;
            zone_b_lower = cl - sigma;
            
            // 중심선 추가
            datasets.push({
                label: 'CL',
                data: Array(labels.length).fill(cl),
                borderColor: '#28a745',
                borderDash: [5, 5],
                borderWidth: 2,
                pointRadius: 0,
                fill: false
            });
            
            // UCL 추가
            datasets.push({
                label: 'UCL',
                data: Array(labels.length).fill(ucl),
                borderColor: '#dc3545',
                borderDash: [5, 5],
                borderWidth: 2,
                pointRadius: 0,
                fill: false
            });
            
            // LCL 추가
            datasets.push({
                label: 'LCL',
                data: Array(labels.length).fill(lcl),
                borderColor: '#dc3545',
                borderDash: [5, 5],
                borderWidth: 2,
                pointRadius: 0,
                fill: false
            });
            
            // 시그마 구간이 계산된 경우에만 툴팁 콜백과 시그마 구간 표시 추가
            if (sigma !== null) {
                // 툴팁 콜백 추가
                chartOptions.plugins.tooltip.callbacks = {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        
                        if (label === 'DICD 값') {
                            const value = context.parsed.y;
                            let zoneInfo = '';
                            
                            // 시그마 구간 표시
                            if (value > zone_a_upper || value < zone_a_lower) {
                                zoneInfo = ' (Zone A)';
                            } else if (value > zone_b_upper || value < zone_b_lower) {
                                zoneInfo = ' (Zone B)';
                            } else {
                                zoneInfo = ' (Zone C)';
                            }
                            
                            return `${label}: ${value.toFixed(3)}${zoneInfo}`;
                        }
                        
                        return `${label}: ${context.parsed.y.toFixed(3)}`;
                    }
                };
                
                // 시그마 구간 애노테이션 추가
                chartOptions.plugins.annotation = {
                    annotations: [
                        {
                            // Zone A (2σ ~ 3σ) - 상단
                            type: 'box',
                            drawTime: 'beforeDatasetsDraw',
                            xScaleID: 'x',
                            yScaleID: 'y',
                            xMin: 0,
                            xMax: labels.length - 1,
                            yMin: zone_a_upper,
                            yMax: ucl,
                            backgroundColor: 'rgba(255, 200, 200, 0.2)',
                            borderWidth: 0
                        },
                        {
                            // Zone A (2σ ~ 3σ) - 하단
                            type: 'box',
                            drawTime: 'beforeDatasetsDraw',
                            xScaleID: 'x',
                            yScaleID: 'y',
                            xMin: 0,
                            xMax: labels.length - 1,
                            yMin: lcl,
                            yMax: zone_a_lower,
                            backgroundColor: 'rgba(255, 200, 200, 0.2)',
                            borderWidth: 0
                        },
                        {
                            // Zone B (1σ ~ 2σ) - 상단
                            type: 'box',
                            drawTime: 'beforeDatasetsDraw',
                            xScaleID: 'x',
                            yScaleID: 'y',
                            xMin: 0,
                            xMax: labels.length - 1,
                            yMin: zone_b_upper,
                            yMax: zone_a_upper,
                            backgroundColor: 'rgba(255, 230, 180, 0.2)',
                            borderWidth: 0
                        },
                        {
                            // Zone B (1σ ~ 2σ) - 하단
                            type: 'box',
                            drawTime: 'beforeDatasetsDraw',
                            xScaleID: 'x',
                            yScaleID: 'y',
                            xMin: 0,
                            xMax: labels.length - 1,
                            yMin: zone_a_lower,
                            yMax: zone_b_lower,
                            backgroundColor: 'rgba(255, 230, 180, 0.2)',
                            borderWidth: 0
                        },
                        {
                            // Zone C (0 ~ 1σ) - 상단
                            type: 'box',
                            drawTime: 'beforeDatasetsDraw',
                            xScaleID: 'x',
                            yScaleID: 'y',
                            xMin: 0,
                            xMax: labels.length - 1,
                            yMin: cl,
                            yMax: zone_b_upper,
                            backgroundColor: 'rgba(200, 255, 200, 0.2)',
                            borderWidth: 0
                        },
                        {
                            // Zone C (0 ~ 1σ) - 하단
                            type: 'box',
                            drawTime: 'beforeDatasetsDraw',
                            xScaleID: 'x',
                            yScaleID: 'y',
                            xMin: 0,
                            xMax: labels.length - 1,
                            yMin: zone_b_lower,
                            yMax: cl,
                            backgroundColor: 'rgba(200, 255, 200, 0.2)',
                            borderWidth: 0
                        }
                    ]
                };
            }
        }
        
        // SPEC 추가
        if (data.spec) {
            const usl = data.spec.usl;
            const lsl = data.spec.lsl;
            const target = data.spec.target || ((usl + lsl) / 2);
            
            // USL 추가
            datasets.push({
                label: 'USL',
                data: Array(labels.length).fill(usl),
                borderColor: '#3366ff',
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false
            });
            
            // LSL 추가
            datasets.push({
                label: 'LSL',
                data: Array(labels.length).fill(lsl),
                borderColor: '#3366ff',
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false
            });

            // 타겟값 추가 - 새로 추가하는 코드
            datasets.push({
                label: '타겟',
                data: Array(labels.length).fill(target),
                borderColor: '#FF9900',  // 주황색 사용
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false
            });
        }
        
        // 패턴 표시
        if (data.patterns && data.patterns.length > 0) {
            // Rule 1 (한계선 초과) 패턴만 표시
            const rule1Patterns = data.patterns.filter(pattern => pattern.rule === 1);
            
            if (rule1Patterns.length > 0) {
                // 이상점 데이터셋 생성 (나머지는 null)
                const outlierData = Array(values.length).fill(null);
                
                rule1Patterns.forEach(pattern => {
                    outlierData[pattern.position] = values[pattern.position];
                });
                
                // 이상점 데이터셋 추가
                datasets.push({
                    label: '이상점',
                    data: outlierData,
                    borderColor: '#dc3545',
                    backgroundColor: '#dc3545',
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointStyle: 'circle',
                    fill: false,
                    showLine: false
                });
            }
        }
        
        // 차트 생성
        controlChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: chartOptions
        });
    }
    // R 차트 생성
    function createRChart(data) {
        // 차트 컨테이너 준비
        document.getElementById('r-chart-container').innerHTML = `
        <canvas id="r-chart"></canvas>
        `;
        
        // 차트 데이터 준비
        const labels = data.data.dates.map(date => date.split('T')[0]);
        
        // 범위 값 계산 (subgroup 범위)
        // 현재 데이터에 범위값이 직접 포함되어 있지 않다면 계산 필요
        // 여기서는 예시로 위치별 최대값-최소값 차이를 범위로 사용
        const rValues = [];
        
        // 위치별 데이터가 있는 경우
        if (data.position_data) {
            const positions = ['top', 'center', 'bottom', 'left', 'right'];
            
            // 각 날짜별로 위치 데이터의 범위(최대-최소) 계산
            for (let i = 0; i < labels.length; i++) {
                let valuesAtPosition = [];
                positions.forEach(pos => {
                    if (data.position_data[pos] && typeof data.position_data[pos][i] === 'number') {
                        valuesAtPosition.push(data.position_data[pos][i]);
                    }
                });
                
                // 위치별 값이 있으면 범위 계산, 없으면 0
                if (valuesAtPosition.length > 1) {
                    const max = Math.max(...valuesAtPosition);
                    const min = Math.min(...valuesAtPosition);
                    rValues.push(max - min);
                } else {
                    // 범위 데이터가 없는 경우 0 또는 null로 처리
                    rValues.push(0);
                }
            }
        } else {
            // 위치별 데이터가 없는 경우, 값 자체가 범위를 나타낸다고 가정
            // 또는 data.data.values를 사용하여 이동 범위(moving range) 계산 가능
            for (let i = 1; i < data.data.values.length; i++) {
                const currentValue = data.data.values[i];
                const prevValue = data.data.values[i-1];
                const range = Math.abs(currentValue - prevValue);
                rValues.push(range);
            }
            
            // 첫 번째 데이터 포인트에 대한 범위 (앞의 데이터가 없으므로 두 번째 범위 값과 동일하게 처리)
            if (rValues.length > 0) {
                rValues.unshift(rValues[0]);
            }
        }
        
        // R 차트의 관리 한계 계산
        // 이 값은 API에서 제공하거나 직접 계산할 수 있음
        const rAvg = rValues.reduce((sum, value) => sum + value, 0) / rValues.length;
        const d2 = 2.326; // k=5 subgroup 크기에 대한 d2 상수 (위치 5개 기준)
        const d3 = 0.864; // k=5에 대한 d3 상수
        const rUcl = rAvg + (3 * rAvg * d3 / d2);
        const rLcl = Math.max(0, rAvg - (3 * rAvg * d3 / d2)); // LCL은 0보다 작을 수 없음
        
        // Chart.js 설정
        const ctx = document.getElementById('r-chart').getContext('2d');
        
        // 기존 차트 파괴
        if (rChart) {
            rChart.destroy();
        }
        
        // 데이터셋 준비
        const datasets = [
            {
                label: 'Range (R)',
                data: rValues,
                borderColor: '#3c8dbc',
                backgroundColor: 'rgba(60, 141, 188, 0.1)',
                fill: false,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            },
            {
                label: 'R-bar',
                data: Array(labels.length).fill(rAvg),
                borderColor: '#28a745',
                borderDash: [5, 5],
                borderWidth: 2,
                pointRadius: 0,
                fill: false
            },
            {
                label: 'UCL',
                data: Array(labels.length).fill(rUcl),
                borderColor: '#dc3545',
                borderDash: [5, 5],
                borderWidth: 2,
                pointRadius: 0,
                fill: false
            }
        ];
        
        // LCL이 0보다 크면 추가
        if (rLcl > 0) {
            datasets.push({
                label: 'LCL',
                data: Array(labels.length).fill(rLcl),
                borderColor: '#dc3545',
                borderDash: [5, 5],
                borderWidth: 2,
                pointRadius: 0,
                fill: false
            });
        }
        
        // 차트 생성
        rChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'R 차트 (범위 차트)'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '날짜'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '범위 (R)'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // 관리 한계 테이블 업데이트
    function updateControlLimitsTable(controlLimits) {
        if (!controlLimits) {
            return;
        }
        
        // 테이블 업데이트
        const tableBody = document.querySelector('#control-limits-table tbody');
        
        tableBody.innerHTML = `
        <tr>
            <th>중심선 (CL)</th>
            <td>${controlLimits.cl ? controlLimits.cl.toFixed(3) : '-'}</td>
        </tr>
        <tr>
            <th>상한 관리선 (UCL)</th>
            <td>${controlLimits.ucl ? controlLimits.ucl.toFixed(3) : '-'}</td>
        </tr>
        <tr>
            <th>하한 관리선 (LCL)</th>
            <td>${controlLimits.lcl ? controlLimits.lcl.toFixed(3) : '-'}</td>
        </tr>
        `;
    }
    
    // 공정능력지수 테이블 업데이트 함수 수정
    function updateCapabilityTable(capability) {
        // 테이블 업데이트
        const tableBody = document.querySelector('#capability-table tbody');
        
        // capability가 없거나 필요한 필드가 없는 경우 처리
        if (!capability) {
            tableBody.innerHTML = `
            <tr>
                <th>Cp</th>
                <td>-</td>
            </tr>
            <tr>
                <th>Cpk</th>
                <td>-</td>
            </tr>
            <tr>
                <th>Pp</th>
                <td>-</td>
            </tr>
            <tr>
                <th>Ppk</th>
                <td>-</td>
            </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = `
        <tr>
            <th>Cp</th>
            <td>${capability.cp !== undefined ? capability.cp.toFixed(3) : '-'}</td>
        </tr>
        <tr>
            <th>Cpk</th>
            <td>${capability.cpk !== undefined ? capability.cpk.toFixed(3) : '-'}</td>
        </tr>
        <tr>
            <th>Pp</th>
            <td>${capability.pp !== undefined ? capability.pp.toFixed(3) : '-'}</td>
        </tr>
        <tr>
            <th>Ppk</th>
            <td>${capability.ppk !== undefined ? capability.ppk.toFixed(3) : '-'}</td>
        </tr>
        `;
    }
    
    // SPEC 테이블 업데이트
    function updateSpecTable(spec) {
        if (!spec) {
            return;
        }
        
        // 테이블 업데이트
        const tableBody = document.querySelector('#spec-table tbody');
        
        tableBody.innerHTML = `
        <tr>
            <th>LSL</th>
            <td>${spec.lsl ? spec.lsl.toFixed(3) : '-'}</td>
        </tr>
        <tr>
            <th>USL</th>
            <td>${spec.usl ? spec.usl.toFixed(3) : '-'}</td>
        </tr>
        <tr>
            <th>타겟</th>
            <td>${spec.target ? spec.target.toFixed(3) : '-'}</td>
        </tr>
        `;
    }
    
    // updatePatternsTable 함수에 클릭 이벤트를 추가
function updatePatternsTable(patterns) {
    // 테이블 업데이트
    const tableBody = document.querySelector('#patterns-table tbody');
    
    if (!patterns || patterns.length === 0) {
        tableBody.innerHTML = `
        <tr>
            <td colspan="4" class="text-center">패턴 감지 데이터가 없습니다.</td>
        </tr>
        `;
        return;
    }
    
    let tableHtml = '';
    
    patterns.forEach((pattern, index) => {
        // 위치 대신 LOT NO를 표시 (backend에서 전달한 경우)
        const lotNoDisplay = pattern.lot_no || `LOT ${pattern.position + 1}`;
        
        tableHtml += `
        <tr data-pattern-index="${index}" class="pattern-row" style="cursor: pointer;">
            <td>Rule ${pattern.rule}</td>
            <td>${pattern.description}</td>
            <td>${lotNoDisplay}</td>
            <td>${pattern.value ? pattern.value.toFixed(3) : (pattern.length ? `길이: ${pattern.length}` : '-')}</td>
        </tr>
        `;
    });
    
    tableBody.innerHTML = tableHtml;
    
    // 패턴 행 클릭 이벤트 추가
    document.querySelectorAll('.pattern-row').forEach(row => {
        row.addEventListener('click', function() {
            const patternIndex = parseInt(this.getAttribute('data-pattern-index'));
            highlightPattern(patterns[patternIndex]);
            
            // 선택된 행 강조
            document.querySelectorAll('.pattern-row').forEach(r => r.classList.remove('table-primary'));
            this.classList.add('table-primary');
        });
    });
}

// 패턴 강조 함수 추가
function highlightPattern(pattern) {
    if (!controlChart) return;
    
    // 기존 데이터셋 상태 저장
    const originalDatasets = JSON.parse(JSON.stringify(controlChart.data.datasets));
    
    // 데이터셋 초기화 (기존 강조 제거)
    controlChart.data.datasets = originalDatasets.filter(ds => !ds.patternHighlight);
    
    // 패턴 유형에 따라 강조 방식 결정
    const highlightData = Array(controlChart.data.labels.length).fill(null);
    let positions = [];
    
    switch (pattern.rule) {
        case 1: // 한 점이 관리 한계선을 벗어남
            positions = [pattern.position];
            break;
        case 2: // 9개 연속 점이 중심선의 같은 쪽에 있음
            positions = Array.from({length: 9}, (_, i) => pattern.position + i);
            break;
        case 3: // 6개 연속 점이 증가하거나 감소함
            positions = Array.from({length: 6}, (_, i) => pattern.position + i);
            break;
        case 4: // 14개 연속 점이 교대로 증가/감소함
            positions = Array.from({length: 14}, (_, i) => pattern.position + i);
            break;
        case 5: // 2점 중 2점이 3-시그마 구간의 같은 쪽에 있음 (Zone A)
            positions = Array.from({length: 2}, (_, i) => pattern.position + i);
            break;
        case 6: // 4점 중 4점이 2-시그마 구간의 같은 쪽에 있음 (Zone B)
            positions = Array.from({length: 4}, (_, i) => pattern.position + i);
            break;
        case 7: // 15개 연속 점이 1-시그마 구간 안에 있음 (Zone C)
            positions = Array.from({length: 15}, (_, i) => pattern.position + i);
            break;
        case 8: // 8개 연속 점이 1-시그마 구간 바깥에 있음
            positions = Array.from({length: 8}, (_, i) => pattern.position + i);
            break;
    }
    
    // 유효한 위치만 필터링 (배열 범위를 벗어나는 위치 제거)
    positions = positions.filter(pos => pos >= 0 && pos < controlChart.data.labels.length);
    
    // 강조할 위치 데이터 설정
    positions.forEach(pos => {
        highlightData[pos] = controlChart.data.datasets[0].data[pos];
    });
    
    // 강조 데이터셋 추가
    controlChart.data.datasets.push({
        label: '강조된 패턴',
        data: highlightData,
        borderColor: '#dc3545',
        backgroundColor: '#dc3545',
        pointRadius: 8,
        pointHoverRadius: 10,
        pointStyle: 'circle',
        borderWidth: 3,
        fill: false,
        showLine: false,
        patternHighlight: true
    });
    
    // 패턴 설명 영역 표시
    showPatternExplanation(pattern, positions);
    
    // 차트 업데이트
    controlChart.update();
}

// 패턴 설명 영역 표시 함수
function showPatternExplanation(pattern, positions) {
    // 패턴 설명 컨테이너 찾기 (없으면 생성)
    let patternExplanationEl = document.querySelector('#pattern-explanation');
    
    if (!patternExplanationEl) {
        patternExplanationEl = document.createElement('div');
        patternExplanationEl.id = 'pattern-explanation';
        patternExplanationEl.className = 'alert alert-info mt-3';
        document.querySelector('#control-chart-container').after(patternExplanationEl);
    }
    
    // 시그마 구간 설명 준비
    let zoneExplanation = '';
    switch (pattern.rule) {
        case 5:
            zoneExplanation = '<span class="badge sigma-zone-a">Zone A (2σ-3σ)</span> 구간은 중심선(CL)에서 2-시그마와 3-시그마 사이의 영역입니다.';
            break;
        case 6:
            zoneExplanation = '<span class="badge sigma-zone-b">Zone B (1σ-2σ)</span> 구간은 중심선(CL)에서 1-시그마와 2-시그마 사이의 영역입니다.';
            break;
        case 7:
            zoneExplanation = '<span class="badge sigma-zone-c">Zone C (0-1σ)</span> 구간은 중심선(CL)에서 0-시그마와 1-시그마 사이의 영역입니다.';
            break;
    }
    
    // 패턴 설명 내용 설정
    patternExplanationEl.innerHTML = `
        <h5 class="mb-2">Rule ${pattern.rule} 패턴 설명</h5>
        <p class="mb-1"><strong>${pattern.description}</strong></p>
        <p class="mb-2 small">위치: ${positions.map(p => `포인트 ${p+1}`).join(', ')}</p>
        ${zoneExplanation ? `<p class="mb-0">${zoneExplanation}</p>` : ''}
        <button type="button" class="btn btn-sm btn-outline-secondary mt-2" id="reset-highlight">강조 표시 지우기</button>
    `;
    
    // 강조 표시 지우기 버튼 이벤트
    document.querySelector('#reset-highlight').addEventListener('click', resetPatternHighlight);
}

// 패턴 강조 표시 초기화 함수
function resetPatternHighlight() {
    if (!controlChart) return;
    
    // 강조 데이터셋 제거
    controlChart.data.datasets = controlChart.data.datasets.filter(ds => !ds.patternHighlight);
    
    // 차트 업데이트
    controlChart.update();
    
    // 패턴 설명 영역 제거
    const patternExplanationEl = document.querySelector('#pattern-explanation');
    if (patternExplanationEl) {
        patternExplanationEl.remove();
    }
    
    // 테이블에서 선택된 행 강조 제거
    document.querySelectorAll('.pattern-row').forEach(r => r.classList.remove('table-primary'));
}
    
    // 이벤트 리스너 설정
    function setupEventListeners() {
        // 제품군 선택 변경 이벤트
        document.getElementById('product-group').addEventListener('change', function() {
            selectedProductGroupId = this.value;
            selectedProcessId = null;
            selectedTargetId = null;
            
            // 공정 목록 로드
            if (selectedProductGroupId) {
                loadProcesses(selectedProductGroupId);
            } else {
                document.getElementById('process').innerHTML = '<option value="">공정 선택</option>';
                document.getElementById('process').disabled = true;
                document.getElementById('target').innerHTML = '<option value="">타겟 선택</option>';
                document.getElementById('target').disabled = true;
            }
        });
        
        // 공정 선택 변경 이벤트
        document.getElementById('process').addEventListener('change', function() {
            selectedProcessId = this.value;
            selectedTargetId = null;
            
            // 타겟 목록 로드
            if (selectedProcessId) {
                loadTargets(selectedProcessId);
            } else {
                document.getElementById('target').innerHTML = '<option value="">타겟 선택</option>';
                document.getElementById('target').disabled = true;
            }
        });
        
        // 타겟 선택 변경 이벤트
        document.getElementById('target').addEventListener('change', function() {
            selectedTargetId = this.value;
        });
        
        // 분석 버튼 클릭 이벤트
        document.getElementById('analyze-btn').addEventListener('click', function() {
            analyzeSpc();
        });
    }
    
    // 페이지 로드 시 초기화
    document.addEventListener('DOMContentLoaded', initSpcPage);
})();