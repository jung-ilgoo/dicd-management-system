// SPC 분석 페이지 모듈
(function() {
    // 전역 변수
    let controlChart = null;
    let selectedProductGroupId = null;
    let selectedProcessId = null;
    let selectedTargetId = null;
    
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
            
            // SPC 분석 API 호출
            const result = await api.analyzeSpc(selectedTargetId, days);
            
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
        // 결과 체크
        if (!result || result.sample_count === 0) {
            document.getElementById('control-chart-container').innerHTML = `
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
        
        // 관리 한계 테이블 업데이트
        updateControlLimitsTable(result.control_limits);
        
        // 공정능력지수 테이블 업데이트
        updateCapabilityTable(result.process_capability);
        
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
        const labels = data.data.dates.map(date => date.split('T')[0]);
        const values = data.data.values;
        
        // Chart.js 설정
        const ctx = document.getElementById('control-chart').getContext('2d');
        
        // 기존 차트 파괴
        if (controlChart) {
            controlChart.destroy();
        }
        
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
        
        // 관리 한계선 추가
        if (data.control_limits) {
            const cl = data.control_limits.cl;
            const ucl = data.control_limits.ucl;
            const lcl = data.control_limits.lcl;
            
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
        }
        
        // SPEC 추가
        if (data.spec) {
            const usl = data.spec.usl;
            const lsl = data.spec.lsl;
            
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
            options: {
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
                            text: '날짜'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'DICD 값'
                        }
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
    
    // 공정능력지수 테이블 업데이트
    function updateCapabilityTable(capability) {
        if (!capability) {
            return;
        }
        
        // 테이블 업데이트
        const tableBody = document.querySelector('#capability-table tbody');
        
        tableBody.innerHTML = `
        <tr>
            <th>Cp</th>
            <td>${capability.cp ? capability.cp.toFixed(3) : '-'}</td>
        </tr>
        <tr>
            <th>Cpk</th>
            <td>${capability.cpk ? capability.cpk.toFixed(3) : '-'}</td>
        </tr>
        <tr>
            <th>Pp</th>
            <td>${capability.pp ? capability.pp.toFixed(3) : '-'}</td>
        </tr>
        <tr>
            <th>Ppk</th>
            <td>${capability.ppk ? capability.ppk.toFixed(3) : '-'}</td>
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
    
    // 패턴 감지 결과 테이블 업데이트
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
        
        patterns.forEach(pattern => {
            tableHtml += `
            <tr>
                <td>Rule ${pattern.rule}</td>
                <td>${pattern.description}</td>
                <td>${pattern.position + 1}</td>
                <td>${pattern.value ? pattern.value.toFixed(3) : (pattern.length ? `길이: ${pattern.length}` : '-')}</td>
            </tr>
            `;
        });
        
        tableBody.innerHTML = tableHtml;
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