// 전역 변수
let cpkHeatmapData = [];
let monitoringCharts = [];
let monitoringTargets = [];

// 초기화 함수
function initDashboard() {
    // 공정능력지수 히트맵 로드
    loadCpkHeatmap();
    
    // 모니터링 타겟 로드 및 설정
    initMonitoringTargets();
    
    // 이벤트 리스너 설정
    setupEventListeners();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 히트맵 새로고침 버튼 이벤트
    document.getElementById('refresh-heatmap-btn').addEventListener('click', function() {
        loadCpkHeatmap();
    });
    
    // 타겟 설정 버튼 이벤트
    document.getElementById('configure-targets-btn').addEventListener('click', function() {
        openTargetConfigModal();
    });
    
    // 타겟 설정 저장 버튼 이벤트
    document.getElementById('save-target-config-btn').addEventListener('click', function() {
        saveMonitoringTargets();
    });
    
    // 제품군 선택 이벤트 (타겟 1, 2, 3)
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`target${i}-product-group`).addEventListener('change', function() {
            const productGroupId = this.value;
            loadProcessOptions(i, productGroupId);
        });
        
        document.getElementById(`target${i}-process`).addEventListener('change', function() {
            const processId = this.value;
            loadTargetOptions(i, processId);
        });
    }
}

// 공정능력지수 히트맵 로드
async function loadCpkHeatmap() {
    try {
        // 로딩 표시
        document.getElementById('cpk-heatmap-container').innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border text-primary" role="status">
                <span class="sr-only">로딩 중...</span>
            </div>
            <p class="mt-2">히트맵 데이터 로드 중...</p>
        </div>
        `;
        
        // 모든 제품군 가져오기
        const productGroups = await api.getProductGroups();
        
        // 히트맵 데이터 구성
        cpkHeatmapData = [];
        
        // 각 제품군에 대해 공정 및 타겟 정보 가져오기
        for (const productGroup of productGroups) {
            const processes = await api.getProcesses(productGroup.id);
            
            for (const process of processes) {
                const targets = await api.getTargets(process.id);
                
                for (const target of targets) {
                    try {
                        // 통계 정보 가져오기
                        const stats = await api.getTargetStatistics(target.id);
                        
                        // 공정능력지수 추출
                        let cpk = null;
                        if (stats && stats.process_capability && stats.process_capability.cpk !== undefined) {
                            cpk = stats.process_capability.cpk;
                        }
                        
                        // 히트맵 데이터에 추가
                        cpkHeatmapData.push({
                            productGroup: productGroup.name,
                            process: process.name,
                            target: target.name,
                            cpk: cpk,
                            targetId: target.id
                        });
                    } catch (error) {
                        console.warn(`타겟 ${target.id}에 대한 통계 정보를 가져올 수 없습니다.`, error);
                        
                        // 오류가 있어도 데이터에는 추가 (cpk = null)
                        cpkHeatmapData.push({
                            productGroup: productGroup.name,
                            process: process.name,
                            target: target.name,
                            cpk: null,
                            targetId: target.id
                        });
                    }
                }
            }
        }
        
        // 히트맵 렌더링
        renderCpkHeatmap();
        
    } catch (error) {
        console.error('공정능력지수 히트맵 로드 실패:', error);
        document.getElementById('cpk-heatmap-container').innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-circle mr-1"></i> 히트맵 데이터를 불러오는 중 오류가 발생했습니다.
        </div>
        `;
    }
}

// 공정능력지수 히트맵 렌더링
function renderCpkHeatmap() {
    if (!cpkHeatmapData || cpkHeatmapData.length === 0) {
        document.getElementById('cpk-heatmap-container').innerHTML = `
        <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle mr-1"></i> 분석할 데이터가 없습니다.
        </div>
        `;
        return;
    }
    
    // IC별 분류
    const groupedByIC = {};
    cpkHeatmapData.forEach(item => {
        if (!groupedByIC[item.productGroup]) {
            groupedByIC[item.productGroup] = {};
        }
        
        if (!groupedByIC[item.productGroup][item.process]) {
            groupedByIC[item.productGroup][item.process] = [];
        }
        
        groupedByIC[item.productGroup][item.process].push(item);
    });
    
    // IC별 총 타겟 수 계산
    const icTargetCounts = {};
    Object.keys(groupedByIC).forEach(ic => {
        let targetCount = 0;
        Object.keys(groupedByIC[ic]).forEach(process => {
            targetCount += groupedByIC[ic][process].length;
        });
        icTargetCounts[ic] = targetCount;
    });
    
    // 타겟 수에 따라 IC를 분류 (적은 것과 많은 것)
    const smallICs = [];
    const largeICs = [];
    
    // 타겟 수가 적은 IC 분류 (예: DIODE, RF)
    Object.keys(icTargetCounts).forEach(ic => {
        if (ic === 'DIODE' || ic === 'RF' || icTargetCounts[ic] <= 3) {
            smallICs.push(ic);
        } else {
            largeICs.push(ic);
        }
    });
    
    // 히트맵 HTML 생성
    let heatmapHtml = '<div class="row">';
    
    // 왼쪽 영역 (타겟 수가 많은 IC)
    heatmapHtml += '<div class="col-md-9">';
    heatmapHtml += '<div class="row">';
    
    // 타겟 수가 많은 IC들의 카드 생성
    largeICs.forEach(ic => {
        heatmapHtml += `
        <div class="col-md-6 mb-2">
            <div class="card card-outline card-primary h-100">
                <div class="card-header py-1">
                    <h3 class="card-title font-weight-bold">${ic}</h3>
                </div>
                <div class="card-body p-0">
                    <div class="treemap-container">
        `;
        
        // 각 공정별 블록 생성
        Object.keys(groupedByIC[ic]).forEach(process => {
            const targets = groupedByIC[ic][process];
            
            heatmapHtml += `
            <div class="process-block">
                <div class="process-header">
                    <span class="font-weight-bold">${process}</span>
                </div>
                <div class="target-container">
            `;
            
            // 각 타겟별 블록 생성
            targets.forEach(item => {
                // Cpk 상태에 따른 색상 결정
                let bgColor = '';
                let textColor = '';
                let status = '';
                
                if (item.cpk === null) {
                    bgColor = '#e9ecef'; // 회색
                    textColor = '#6c757d'; // 회색 텍스트
                    status = '데이터 없음';
                } else if (item.cpk >= 1.33) {
                    bgColor = '#d4edda'; // 녹색
                    textColor = '#155724'; // 진한 녹색 텍스트
                    status = '우수';
                } else if (item.cpk >= 1.00) {
                    bgColor = '#d1ecf1'; // 파란색
                    textColor = '#0c5460'; // 진한 파란색 텍스트
                    status = '적합';
                } else if (item.cpk >= 0.67) {
                    bgColor = '#fff3cd'; // 노란색
                    textColor = '#856404'; // 진한 노란색 텍스트
                    status = '부적합';
                } else {
                    bgColor = '#f8d7da'; // 빨간색
                    textColor = '#721c24'; // 진한 빨간색 텍스트
                    status = '매우 부적합';
                }
                
                heatmapHtml += `
                <div class="target-block" style="background-color: ${bgColor};">
                    <div class="target-value" style="color: ${textColor};">${item.target}</div>
                    <div class="cpk-value" style="color: ${textColor};">
                        ${item.cpk !== null ? item.cpk.toFixed(3) : '-'}
                    </div>
                    <div class="status-badge" style="color: ${textColor};">${status}</div>
                </div>
                `;
            });
            
            heatmapHtml += `
                </div>
            </div>
            `;
        });
        
        heatmapHtml += `
                    </div>
                </div>
            </div>
        </div>
        `;
    });
    
    heatmapHtml += '</div>'; // 왼쪽 영역 row 종료
    heatmapHtml += '</div>'; // 왼쪽 영역 col-md-9 종료
    
    // 오른쪽 영역 (타겟 수가 적은 IC)
    heatmapHtml += '<div class="col-md-3">';
    
    // 타겟 수가 적은 IC들의 카드 생성 (세로로 배치)
    smallICs.forEach(ic => {
        heatmapHtml += `
        <div class="card card-outline card-secondary mb-2">
            <div class="card-header py-1 bg-light">
                <h3 class="card-title font-weight-bold">${ic}</h3>
            </div>
            <div class="card-body p-0">
                <div class="small-treemap-container">
        `;
        
        // 각 공정별 블록 생성 (작은 영역)
        Object.keys(groupedByIC[ic]).forEach(process => {
            const targets = groupedByIC[ic][process];
            
            heatmapHtml += `
            <div class="small-process-block">
                <div class="small-process-header">
                    <span class="font-weight-bold">${process}</span>
                </div>
                <div class="small-target-container">
            `;
            
            // 각 타겟별 블록 생성 (작은 영역)
            targets.forEach(item => {
                // Cpk 상태에 따른 색상 결정
                let bgColor = '';
                let textColor = '';
                
                if (item.cpk === null) {
                    bgColor = '#e9ecef'; // 회색
                    textColor = '#6c757d'; // 회색 텍스트
                } else if (item.cpk >= 1.33) {
                    bgColor = '#d4edda'; // 녹색
                    textColor = '#155724'; // 진한 녹색 텍스트
                } else if (item.cpk >= 1.00) {
                    bgColor = '#d1ecf1'; // 파란색
                    textColor = '#0c5460'; // 진한 파란색 텍스트
                } else if (item.cpk >= 0.67) {
                    bgColor = '#fff3cd'; // 노란색
                    textColor = '#856404'; // 진한 노란색 텍스트
                } else {
                    bgColor = '#f8d7da'; // 빨간색
                    textColor = '#721c24'; // 진한 빨간색 텍스트
                }
                
                heatmapHtml += `
                <div class="small-target-block" style="background-color: ${bgColor};">
                    <div class="small-target-value" style="color: ${textColor};">${item.target}</div>
                    <div class="small-cpk-value" style="color: ${textColor};">
                        ${item.cpk !== null ? item.cpk.toFixed(3) : '-'}
                    </div>
                </div>
                `;
            });
            
            heatmapHtml += `
                </div>
            </div>
            `;
        });
        
        heatmapHtml += `
                </div>
            </div>
        </div>
        `;
    });
    
    heatmapHtml += '</div>'; // 오른쪽 영역 col-md-3 종료
    heatmapHtml += '</div>'; // 전체 row 종료
    
    document.getElementById('cpk-heatmap-container').innerHTML = heatmapHtml;
}

// 모니터링 타겟 초기화
async function initMonitoringTargets() {
    // 로컬 스토리지에서 저장된 타겟 가져오기
    const savedTargets = localStorage.getItem('monitoring_targets');
    
    if (savedTargets) {
        monitoringTargets = JSON.parse(savedTargets);
        
        // 유효한 타겟이 있으면 차트 로드
        if (monitoringTargets.length > 0) {
            loadMonitoringCharts();
        }
    }
    
    // 제품군 옵션 로드 (설정 모달용)
    await loadProductGroupOptions();
}

// 제품군 옵션 로드 (설정 모달용)
async function loadProductGroupOptions() {
    try {
        const productGroups = await api.getProductGroups();
        
        if (productGroups && productGroups.length > 0) {
            // 각 타겟 선택기에 대해 제품군 옵션 설정
            for (let i = 1; i <= 3; i++) {
                let options = '<option value="">제품군 선택</option>';
                productGroups.forEach(productGroup => {
                    options += `<option value="${productGroup.id}">${productGroup.name}</option>`;
                });
                document.getElementById(`target${i}-product-group`).innerHTML = options;
            }
        }
    } catch (error) {
        console.error('제품군 옵션 로드 실패:', error);
    }
}

// 공정 옵션 로드 (설정 모달용)
async function loadProcessOptions(targetNum, productGroupId) {
    try {
        const processSelect = document.getElementById(`target${targetNum}-process`);
        const targetSelect = document.getElementById(`target${targetNum}-target`);
        
        // 초기화
        processSelect.innerHTML = '<option value="">로딩 중...</option>';
        processSelect.disabled = true;
        targetSelect.innerHTML = '<option value="">타겟 선택</option>';
        targetSelect.disabled = true;
        
        if (!productGroupId) {
            processSelect.innerHTML = '<option value="">공정 선택</option>';
            return;
        }
        
        const processes = await api.getProcesses(productGroupId);
        
        if (processes && processes.length > 0) {
            let options = '<option value="">공정 선택</option>';
            processes.forEach(process => {
                options += `<option value="${process.id}">${process.name}</option>`;
            });
            processSelect.innerHTML = options;
            processSelect.disabled = false;
        } else {
            processSelect.innerHTML = '<option value="">공정 없음</option>';
        }
    } catch (error) {
        console.error(`타겟 ${targetNum} 공정 옵션 로드 실패:`, error);
        document.getElementById(`target${targetNum}-process`).innerHTML = '<option value="">오류 발생</option>';
    }
}

// 타겟 옵션 로드 (설정 모달용)
async function loadTargetOptions(targetNum, processId) {
    try {
        const targetSelect = document.getElementById(`target${targetNum}-target`);
        
        // 초기화
        targetSelect.innerHTML = '<option value="">로딩 중...</option>';
        targetSelect.disabled = true;
        
        if (!processId) {
            targetSelect.innerHTML = '<option value="">타겟 선택</option>';
            return;
        }
        
        const targets = await api.getTargets(processId);
        
        if (targets && targets.length > 0) {
            let options = '<option value="">타겟 선택</option>';
            targets.forEach(target => {
                options += `<option value="${target.id}">${target.name}</option>`;
            });
            targetSelect.innerHTML = options;
            targetSelect.disabled = false;
        } else {
            targetSelect.innerHTML = '<option value="">타겟 없음</option>';
        }
    } catch (error) {
        console.error(`타겟 ${targetNum} 타겟 옵션 로드 실패:`, error);
        document.getElementById(`target${targetNum}-target`).innerHTML = '<option value="">오류 발생</option>';
    }
}

// 타겟 설정 모달 열기
async function openTargetConfigModal() {
    // 현재 설정된 타겟 정보로 모달 필드 설정
    try {
        // 저장된 타겟 정보 로드
        for (let i = 0; i < monitoringTargets.length; i++) {
            const targetConfig = monitoringTargets[i];
            if (targetConfig) {
                const targetNum = i + 1;
                
                // 제품군 선택
                document.getElementById(`target${targetNum}-product-group`).value = targetConfig.productGroupId || '';
                
                // 공정 옵션 로드 후 선택
                if (targetConfig.productGroupId) {
                    await loadProcessOptions(targetNum, targetConfig.productGroupId);
                    document.getElementById(`target${targetNum}-process`).value = targetConfig.processId || '';
                }
                
                // 타겟 옵션 로드 후 선택
                if (targetConfig.processId) {
                    await loadTargetOptions(targetNum, targetConfig.processId);
                    document.getElementById(`target${targetNum}-target`).value = targetConfig.targetId || '';
                }
            }
        }
    } catch (error) {
        console.error('타겟 설정 모달 초기화 실패:', error);
    }
    
    // 모달 표시
    $('#target-config-modal').modal('show');
}

// 모니터링 타겟 저장
async function saveMonitoringTargets() {
    // 현재 선택된 타겟 정보 수집
    const newTargets = [];
    
    for (let i = 1; i <= 3; i++) {
        const productGroupId = document.getElementById(`target${i}-product-group`).value;
        const processId = document.getElementById(`target${i}-process`).value;
        const targetId = document.getElementById(`target${i}-target`).value;
        
        // 모든 필드가 채워진 경우에만 유효한 타겟으로 간주
        if (productGroupId && processId && targetId) {
            // 제품군, 공정, 타겟 이름 가져오기
            const productGroup = await api.get(`${API_CONFIG.ENDPOINTS.PRODUCT_GROUPS}/${productGroupId}`);
            const process = await api.get(`${API_CONFIG.ENDPOINTS.PROCESSES}/${processId}`);
            const target = await api.get(`${API_CONFIG.ENDPOINTS.TARGETS}/${targetId}`);
            
            newTargets.push({
                productGroupId,
                processId,
                targetId,
                productGroupName: productGroup.name,
                processName: process.name,
                targetName: target.name
            });
        }
    }
    
    // 새 타겟 정보 저장
    monitoringTargets = newTargets;
    localStorage.setItem('monitoring_targets', JSON.stringify(monitoringTargets));
    
    // 모달 닫기
    $('#target-config-modal').modal('hide');
    
    // 모니터링 차트 로드
    loadMonitoringCharts();
}

// 모니터링 차트 로드
async function loadMonitoringCharts() {
    try {
        // 모니터링 타겟이 없는 경우 안내 메시지 표시
        if (!monitoringTargets || monitoringTargets.length === 0) {
            document.getElementById('monitoring-charts-container').innerHTML = `
            <div class="col-md-12 text-center py-3">
                <p class="text-muted">모니터링할 타겟이 설정되지 않았습니다. 우측 상단의 '설정' 버튼을 클릭하여 타겟을 설정하세요.</p>
            </div>
            `;
            return;
        }
        
        // 로딩 표시
        document.getElementById('monitoring-charts-container').innerHTML = `
        <div class="col-md-12 text-center py-3">
            <div class="spinner-border text-primary" role="status">
                <span class="sr-only">로딩 중...</span>
            </div>
            <p class="mt-2">모니터링 차트 로드 중...</p>
        </div>
        `;
        
        // 기존 차트 파괴
        for (const chart of monitoringCharts) {
            if (chart) {
                chart.destroy();
            }
        }
        monitoringCharts = [];
        
        // 차트 컨테이너 HTML 준비
        let chartsHtml = '';
        
        // 각 타겟별로 차트 컨테이너 생성
        for (let i = 0; i < monitoringTargets.length; i++) {
            const target = monitoringTargets[i];
            const colWidth = monitoringTargets.length === 1 ? 12 : (monitoringTargets.length === 2 ? 6 : 4);
            
            chartsHtml += `
            <div class="col-md-${colWidth}">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">${target.productGroupName} - ${target.processName} - ${target.targetName}</h3>
                    </div>
                    <div class="card-body">
                        <canvas id="monitoring-chart-${i}"></canvas>
                    </div>
                </div>
            </div>
            `;
        }
        
        // 차트 컨테이너 업데이트
        document.getElementById('monitoring-charts-container').innerHTML = chartsHtml;
        
        // 각 타겟별로 차트 생성
        for (let i = 0; i < monitoringTargets.length; i++) {
            await createMonitoringChart(i);
        }
        
    } catch (error) {
        console.error('모니터링 차트 로드 실패:', error);
        document.getElementById('monitoring-charts-container').innerHTML = `
        <div class="col-md-12 text-center py-3">
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle mr-1"></i> 모니터링 차트를 불러오는 중 오류가 발생했습니다.
            </div>
        </div>
        `;
    }
}

// 모니터링 차트 생성
async function createMonitoringChart(index) {
    const target = monitoringTargets[index];
    
    try {
        // SPC 분석 데이터 가져오기 (최근 30일)
        const spcResult = await api.analyzeSpc(target.targetId, 30);
        
        // 차트 데이터 준비
        const labels = spcResult.data.dates.map(date => date.split('T')[0]);
        const values = spcResult.data.values;
        
        // 관리 한계 가져오기
        const cl = spcResult.control_limits.cl;
        const ucl = spcResult.control_limits.ucl;
        const lcl = spcResult.control_limits.lcl;
        
        // SPEC 가져오기
        let usl, lsl;
        if (spcResult.spec) {
            usl = spcResult.spec.usl;
            lsl = spcResult.spec.lsl;
        }
        
        // 데이터셋 준비
        const datasets = [
            {
                label: 'DICD 값',
                data: values,
                borderColor: '#3c8dbc',
                backgroundColor: 'rgba(60, 141, 188, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: false
            },
            {
                label: 'CL',
                data: Array(labels.length).fill(cl),
                borderColor: '#28a745',
                borderDash: [5, 5],
                borderWidth: 1,
                pointRadius: 0,
                fill: false
            },
            {
                label: 'UCL',
                data: Array(labels.length).fill(ucl),
                borderColor: '#dc3545',
                borderDash: [5, 5],
                borderWidth: 1,
                pointRadius: 0,
                fill: false
            },
            {
                label: 'LCL',
                data: Array(labels.length).fill(lcl),
                borderColor: '#dc3545',
                borderDash: [5, 5],
                borderWidth: 1,
                pointRadius: 0,
                fill: false
            }
        ];
        
        // SPEC 추가
        if (usl && lsl) {
            datasets.push(
                {
                    label: 'USL',
                    data: Array(labels.length).fill(usl),
                    borderColor: '#3366ff',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: 'LSL',
                    data: Array(labels.length).fill(lsl),
                    borderColor: '#3366ff',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false
                }
            );
        }
        
        // 차트 생성
        const ctx = document.getElementById(`monitoring-chart-${index}`).getContext('2d');
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 10,
                            font: {
                                size: 10
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 5
                        }
                    },
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
        
        // 차트 저장
        monitoringCharts[index] = chart;
        
    } catch (error) {
        console.error(`타겟 ${target.targetId} 모니터링 차트 생성 실패:`, error);
        document.getElementById(`monitoring-chart-${index}`).parentNode.innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-circle mr-1"></i> 차트 데이터를 불러오는 중 오류가 발생했습니다.
        </div>
        `;
    }
}

// 유틸리티 객체 - 날짜 포맷, 상태 표시 등에 사용
const DASHBOARD_UTILS = {
    // 날짜 포맷 함수
    formatDate: function(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString();
    },
    
    // 숫자 포맷 함수
    formatNumber: function(value) {
        return value.toFixed(3);
    },
    
    // 오류 메시지 표시
    showError: function(message) {
        return `<div class="alert alert-danger"><i class="fas fa-exclamation-circle mr-1"></i> ${message}</div>`;
    }
};

// 페이지 로드 시 대시보드 초기화
document.addEventListener('DOMContentLoaded', initDashboard);