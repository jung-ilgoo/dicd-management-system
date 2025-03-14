// 대시보드 모듈
(function() {
    // 대시보드 초기화
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
    
    // 이벤트 리스너 설정
    function setupEventListeners() {
        // 알림 드롭다운 클릭 이벤트
        document.querySelector('.nav-item.dropdown').addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('show');
            this.querySelector('.dropdown-menu').classList.toggle('show');
        });
    }
    
    // 페이지 로드 시 대시보드 초기화
    document.addEventListener('DOMContentLoaded', initDashboard);
})();