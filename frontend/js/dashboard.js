// 전역 변수 추가 - 히트맵과 모니터링 차트 관련
let cpkHeatmapData = [];
let monitoringCharts = [];
let monitoringTargets = [];

// 초기화 함수에 히트맵과 모니터링 차트 로드 추가
function initDashboard() {
    // 대시보드 요약 정보 로드
    loadDashboardSummary();
    
    // 메인 차트 초기화
    initMainChart();
    
    // 최근 측정 데이터 로드
    loadRecentMeasurements();
    
    // 공정별 상태 로드
    loadProcessStatus();
    
    // 최근 알림 로드
    loadRecentAlerts();
    
    // 공정능력지수 히트맵 로드
    loadCpkHeatmap();
    
    // 모니터링 타겟 로드 및 설정
    initMonitoringTargets();
    
    // 이벤트 리스너 설정
    setupEventListeners();
}
    
    // 대시보드 요약 정보 로드
    async function loadDashboardSummary() {
        try {
            // 측정 데이터 통계 로드
            const measurements = await api.getMeasurements({ limit: 1000 });
            document.getElementById('total-measurements').textContent = measurements.length;
            
            // 공정 수 로드
            const processes = await api.getProcesses();
            document.getElementById('total-processes').textContent = processes.length;
            
            // 알림 및 SPEC 위반 수 계산
            let alertCount = 0;
            let specViolationCount = 0;
            
            // 최근 측정 데이터에서 SPEC 위반 수 계산
            for (const measurement of measurements.slice(0, 100)) {
                // SPEC 정보 가져오기
                try {
                    const spec = await api.getActiveSpec(measurement.target_id);
                    if (spec && (measurement.avg_value < spec.lsl || measurement.avg_value > spec.usl)) {
                        specViolationCount++;
                    }
                } catch (error) {
                    console.warn(`타겟 ID ${measurement.target_id}에 대한 활성 SPEC이 없습니다.`);
                }
            }
            
            // SPC 알림 수 계산 (임시로 랜덤 수 사용)
            alertCount = Math.floor(Math.random() * 5) + 1;
            
            document.getElementById('total-alerts').textContent = alertCount;
            document.getElementById('spec-violations').textContent = specViolationCount;
            
        } catch (error) {
            console.error('대시보드 요약 정보 로드 실패:', error);
        }
    }
    
    // 메인 차트 초기화
    async function initMainChart() {
        try {
            // 측정 데이터 로드 (최근 30일)
            const measurements = await api.getMeasurements({ days: 30, limit: 100 });
            
            // 측정 데이터가 없는 경우 처리
            if (!measurements || measurements.length === 0) {
                document.getElementById('main-chart').parentElement.innerHTML = UTILS.showError('측정 데이터가 없습니다.');
                return;
            }
            
            // 날짜별로 데이터 그룹화
            const groupedData = {};
            measurements.forEach(measurement => {
                const date = new Date(measurement.created_at).toLocaleDateString();
                if (!groupedData[date]) {
                    groupedData[date] = [];
                }
                groupedData[date].push(measurement.avg_value);
            });
            
            // 차트 데이터 준비
            const labels = Object.keys(groupedData).sort((a, b) => new Date(a) - new Date(b));
            const data = labels.map(date => {
                const values = groupedData[date];
                return values.reduce((sum, value) => sum + value, 0) / values.length;
            });
            
            // 차트 생성
            const ctx = document.getElementById('main-chart').getContext('2d');
            const mainChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'DICD 평균값',
                        data: data,
                        borderColor: '#3c8dbc',
                        backgroundColor: 'rgba(60, 141, 188, 0.1)',
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#3c8dbc',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            beginAtZero: false
                        }
                    }
                }
            });
            
            // 차트 필터 이벤트 리스너
            document.getElementById('filter-week').addEventListener('click', async function(e) {
                e.preventDefault();
                updateMainChartPeriod(7, mainChart);
                updateFilterActive(this);
            });
            
            document.getElementById('filter-month').addEventListener('click', async function(e) {
                e.preventDefault();
                updateMainChartPeriod(30, mainChart);
                updateFilterActive(this);
            });
            
            document.getElementById('filter-3months').addEventListener('click', async function(e) {
                e.preventDefault();
                updateMainChartPeriod(90, mainChart);
                updateFilterActive(this);
            });
            
        } catch (error) {
            console.error('메인 차트 초기화 실패:', error);
            document.getElementById('main-chart').parentElement.innerHTML = UTILS.showError('차트 데이터 로드 중 오류가 발생했습니다.');
        }
    }
    
    // 차트 기간 업데이트
    async function updateMainChartPeriod(days, chart) {
        try {
            // 측정 데이터 로드
            const measurements = await api.getMeasurements({ days, limit: 100 });
            
            // 측정 데이터가 없는 경우 처리
            if (!measurements || measurements.length === 0) {
                return;
            }
            
            // 날짜별로 데이터 그룹화
            const groupedData = {};
            measurements.forEach(measurement => {
                const date = new Date(measurement.created_at).toLocaleDateString();
                if (!groupedData[date]) {
                    groupedData[date] = [];
                }
                groupedData[date].push(measurement.avg_value);
            });
            
            // 차트 데이터 업데이트
            const labels = Object.keys(groupedData).sort((a, b) => new Date(a) - new Date(b));
            const data = labels.map(date => {
                const values = groupedData[date];
                return values.reduce((sum, value) => sum + value, 0) / values.length;
            });
            
            chart.data.labels = labels;
            chart.data.datasets[0].data = data;
            chart.update();
            
        } catch (error) {
            console.error('차트 기간 업데이트 실패:', error);
        }
    }
    
    // 필터 버튼 활성화 상태 업데이트
    function updateFilterActive(element) {
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.classList.remove('active');
        });
        element.classList.add('active');
    }
    
    // 최근 측정 데이터 로드
    async function loadRecentMeasurements() {
        try {
            // 측정 데이터 로드 (최근 10개)
            const measurements = await api.getMeasurements({ limit: 10 });
            
            // 측정 데이터가 없는 경우 처리
            if (!measurements || measurements.length === 0) {
                document.getElementById('recent-data-table').innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">측정 데이터가 없습니다.</td>
                </tr>
                `;
                return;
            }
            
            // 테이블 HTML 생성
            let tableHtml = '';
            
            // 각 측정 데이터에 대한 추가 정보 로드
            for (const measurement of measurements) {
                // 타겟 정보 가져오기
                const target = await api.get(`${API_CONFIG.ENDPOINTS.TARGETS}/${measurement.target_id}`);
                
                // 공정 정보 가져오기
                const process = await api.get(`${API_CONFIG.ENDPOINTS.PROCESSES}/${target.process_id}`);
                
                // 제품군 정보 가져오기
                const productGroup = await api.get(`${API_CONFIG.ENDPOINTS.PRODUCT_GROUPS}/${process.product_group_id}`);
                
                // SPEC 정보 가져오기
                let statusBadge = '<span class="badge badge-secondary">SPEC 없음</span>';
                try {
                    const spec = await api.getActiveSpec(measurement.target_id);
                    if (spec) {
                        statusBadge = UTILS.getStatusBadge(measurement.avg_value, spec.lsl, spec.usl);
                    }
                } catch (error) {
                    console.warn(`타겟 ID ${measurement.target_id}에 대한 활성 SPEC이 없습니다.`);
                }
                
                // 행 HTML 생성
                tableHtml += `
                <tr>
                    <td>${UTILS.formatDate(measurement.created_at)}</td>
                    <td>${productGroup.name}</td>
                    <td>${process.name}</td>
                    <td>${target.name}</td>
                    <td>${measurement.lot_no}</td>
                    <td>${UTILS.formatNumber(measurement.avg_value)}</td>
                    <td>${statusBadge}</td>
                </tr>
                `;
            }
            
            // 테이블에 HTML 삽입
            document.getElementById('recent-data-table').innerHTML = tableHtml;
            
        } catch (error) {
            console.error('최근 측정 데이터 로드 실패:', error);
            document.getElementById('recent-data-table').innerHTML = `
            <tr>
                <td colspan="7" class="text-center">데이터 로드 중 오류가 발생했습니다.</td>
            </tr>
            `;
        }
    }
    
    // 공정별 상태 로드
    async function loadProcessStatus() {
        try {
            // 공정 목록 가져오기
            const processes = await api.getProcesses();
            
            // 공정이 없는 경우 처리
            if (!processes || processes.length === 0) {
                document.getElementById('process-status-list').innerHTML = `
                <li class="item">
                    <div class="product-info">
                        <div class="product-title">공정 정보가 없습니다.</div>
                    </div>
                </li>
                `;
                return;
            }
            
            // 목록 HTML 생성
            let listHtml = '';
            
            // 표시할 공정 수 제한 (최대 5개)
            const displayProcesses = processes.slice(0, 5);
            
            // 각 공정에 대한 상태 표시
            for (const process of displayProcesses) {
                // 제품군 정보 가져오기
                const productGroup = await api.get(`${API_CONFIG.ENDPOINTS.PRODUCT_GROUPS}/${process.product_group_id}`);
                
                // 공정 상태 임의 설정 (실제로는 측정 데이터 분석 필요)
                const statusOptions = ['green', 'yellow', 'red'];
                const randomStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)];
                
                // 상태에 따른 텍스트
                let statusText = '';
                switch (randomStatus) {
                    case 'green':
                        statusText = '정상';
                        break;
                    case 'yellow':
                        statusText = '주의';
                        break;
                    case 'red':
                        statusText = '경고';
                        break;
                }
                
                // 항목 HTML 추가
                listHtml += `
                <li class="item">
                    <div class="product-info">
                        <div class="product-title">
                            <span class="process-status-light process-status-light-${randomStatus}"></span>
                            ${productGroup.name} - ${process.name}
                        </div>
                        <span class="product-description">
                            ${statusText} - 최근 업데이트: ${UTILS.formatDate(new Date())}
                        </span>
                    </div>
                </li>
                `;
            }
            
            // 목록에 HTML 삽입
            document.getElementById('process-status-list').innerHTML = listHtml;
            
        } catch (error) {
            console.error('공정별 상태 로드 실패:', error);
            document.getElementById('process-status-list').innerHTML = `
            <li class="item">
                <div class="product-info">
                    <div class="product-title">데이터 로드 중 오류가 발생했습니다.</div>
                </div>
            </li>
            `;
        }
    }
    
    // 최근 알림 로드
    function loadRecentAlerts() {
        // 임시 알림 데이터 (실제로는 API에서 가져와야 함)
        const alerts = [
            {
                id: 1,
                title: 'SPEC 위반 발생',
                description: 'IC 제품군 - BUR 공정 - 1.0 타겟에서 SPEC 위반이 발생했습니다.',
                created_at: '2025-03-14T09:30:00',
                status: 'danger'
            },
            {
                id: 2,
                title: 'SPC 규칙 위반 (Rule 1)',
                description: 'FET 제품군 - ACT 공정 - 3.0 타겟에서 관리 한계선을 벗어났습니다.',
                created_at: '2025-03-13T15:45:00',
                status: 'warning'
            },
            {
                id: 3,
                title: 'SPC 규칙 위반 (Rule 3)',
                description: 'DIODE 제품군 - ACT 공정 - 1.6 타겟에서 6개 연속 점이 증가하고 있습니다.',
                created_at: '2025-03-12T11:20:00',
                status: 'info'
            }
        ];
        
        // 알림 수 표시
        document.getElementById('alert-count').textContent = alerts.length;
        
        // 알림 드롭다운 메뉴 업데이트
        let alertHtml = '';
        
        if (alerts.length > 0) {
            alertHtml += `<span class="dropdown-item dropdown-header">${alerts.length}개의 알림</span>`;
            alertHtml += '<div class="dropdown-divider"></div>';
            
            // 각 알림 추가
            alerts.forEach(alert => {
                alertHtml += `
                <a href="#" class="dropdown-item">
                    <i class="fas fa-exclamation-circle mr-2 text-${alert.status}"></i> ${alert.title}
                    <span class="float-right text-muted text-sm">${UTILS.formatDate(alert.created_at)}</span>
                </a>
                <div class="dropdown-divider"></div>
                `;
            });
            
            alertHtml += '<a href="#" class="dropdown-item dropdown-footer">모든 알림 보기</a>';
        } else {
            alertHtml += '<span class="dropdown-item dropdown-header">알림 없음</span>';
        }
        
        document.getElementById('alert-container').innerHTML = alertHtml;
        
        // 알림 목록 업데이트
        let listHtml = '';
        
        if (alerts.length > 0) {
            // 각 알림 추가
            alerts.forEach(alert => {
                listHtml += `
                <li class="item">
                    <div class="product-info">
                        <div class="product-title">
                            <i class="fas fa-exclamation-circle mr-1 text-${alert.status}"></i> ${alert.title}
                        </div>
                        <span class="product-description">
                            ${alert.description}<br>
                            <small class="text-muted">${UTILS.formatDate(alert.created_at)}</small>
                        </span>
                    </div>
                </li>
                `;
            });
        } else {
            listHtml += `
            <li class="item">
                <div class="product-info">
                    <div class="product-title">알림 없음</div>
                </div>
            </li>
            `;
        }
        
        document.getElementById('recent-alerts-list').innerHTML = listHtml;
    }
    
    // 이벤트 리스너 설정에 새 기능 추가
function setupEventListeners() {
    // 알림 드롭다운 클릭 이벤트
    document.querySelector('.nav-item.dropdown').addEventListener('click', function(e) {
        e.stopPropagation();
        this.classList.toggle('show');
        this.querySelector('.dropdown-menu').classList.toggle('show');
    });
    
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
    
    // 제품군별 분류
    const groupedData = {};
    cpkHeatmapData.forEach(item => {
        if (!groupedData[item.productGroup]) {
            groupedData[item.productGroup] = {};
        }
        
        if (!groupedData[item.productGroup][item.process]) {
            groupedData[item.productGroup][item.process] = [];
        }
        
        groupedData[item.productGroup][item.process].push(item);
    });
    
    // 히트맵 HTML 생성
    let heatmapHtml = '';
    
    // 각 제품군별 카드 생성
    for (const [productGroup, processes] of Object.entries(groupedData)) {
        heatmapHtml += `
        <div class="card mb-3">
            <div class="card-header bg-light">
                <h5 class="mb-0">${productGroup}</h5>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-bordered table-sm mb-0">
                        <thead>
                            <tr>
                                <th>공정</th>
                                <th>타겟</th>
                                <th>Cpk</th>
                                <th>상태</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        // 각 공정 및 타겟별 행 추가
        for (const [process, targets] of Object.entries(processes)) {
            // 첫 번째 행은 공정명 표시, 나머지는 빈칸
            let isFirstRow = true;
            let processRowspan = targets.length;
            
            for (const target of targets) {
                heatmapHtml += '<tr>';
                
                if (isFirstRow) {
                    heatmapHtml += `<td rowspan="${processRowspan}">${process}</td>`;
                    isFirstRow = false;
                }
                
                // 타겟 정보 및 Cpk 값 표시
                heatmapHtml += `<td>${target.target}</td>`;
                
                // Cpk 값과 상태 표시
                if (target.cpk === null) {
                    heatmapHtml += `<td class="text-center">-</td>`;
                    heatmapHtml += `<td class="text-center"><span class="badge bg-secondary">데이터 없음</span></td>`;
                } else {
                    // Cpk 상태에 따른 배지 색상 결정
                    let badgeClass = '';
                    let status = '';
                    
                    if (target.cpk >= 1.33) {
                        badgeClass = 'bg-success';
                        status = '우수';
                    } else if (target.cpk >= 1.00) {
                        badgeClass = 'bg-info';
                        status = '적합';
                    } else if (target.cpk >= 0.67) {
                        badgeClass = 'bg-warning';
                        status = '부적합';
                    } else {
                        badgeClass = 'bg-danger';
                        status = '매우 부적합';
                    }
                    
                    heatmapHtml += `<td class="text-center">${target.cpk.toFixed(3)}</td>`;
                    heatmapHtml += `<td class="text-center"><span class="badge ${badgeClass}">${status}</span></td>`;
                }
                
                heatmapHtml += '</tr>';
            }
        }
        
        heatmapHtml += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;
    }
    
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
// 페이지 로드 시 대시보드 초기화
document.addEventListener('DOMContentLoaded', initDashboard);