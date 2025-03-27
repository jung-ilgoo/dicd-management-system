// 추이 분석 페이지 모듈
(function() {
    // 전역 변수
    let trendChart = null;
    let selectedProductGroupId = null;
    let selectedProcessId = null;
    let selectedTargetId = null;
    let currentStats = null;
    let dateRangeType = 'last30'; // 기본값: 최근 30일
    let customStartDate = null;
    let customEndDate = null;
    let chartType = 'line'; // 기본값: 선 차트
    
    // 페이지 초기화
    async function initTrendPage() {
        // 날짜 범위 선택기 초기화
        initDateRangePicker();
        
        // 제품군 목록 로드
        await loadProductGroups();
        
        // 이벤트 리스너 설정
        setupEventListeners();
    }
    
    // 날짜 범위 선택기 초기화
    function initDateRangePicker() {
        $('#date-range-picker').daterangepicker({
            startDate: moment().subtract(29, 'days'),
            endDate: moment(),
            locale: {
                format: 'YYYY-MM-DD',
                separator: ' ~ ',
                applyLabel: '적용',
                cancelLabel: '취소',
                fromLabel: '시작일',
                toLabel: '종료일',
                customRangeLabel: '사용자 지정',
                weekLabel: '주',
                daysOfWeek: ['일', '월', '화', '수', '목', '금', '토'],
                monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
                firstDay: 0
            },
            ranges: {
                '오늘': [moment(), moment()],
                '어제': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
                '최근 7일': [moment().subtract(6, 'days'), moment()],
                '최근 30일': [moment().subtract(29, 'days'), moment()],
                '이번 달': [moment().startOf('month'), moment().endOf('month')],
                '지난 달': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
            }
        }, function(start, end, label) {
            customStartDate = start.format('YYYY-MM-DD');
            customEndDate = end.format('YYYY-MM-DD');
            dateRangeType = 'custom';
            
            // 이미 타겟이 선택되어 있으면 데이터 다시 로드
            if (selectedTargetId) {
                analyzeTrend();
            }
        });
        
        // 기본적으로 날짜 선택기 숨김
        $('#date-range-picker-container').hide();
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
    
    // 장비 정보를 로드하는 함수 (새로 추가)
    async function loadEquipments() {
        try {
            const equipments = await api.getEquipments();
            // 장비 ID를 키로, 장비 이름을 값으로 하는 객체 생성
            const equipmentMap = {};
            equipments.forEach(equipment => {
                equipmentMap[equipment.id] = equipment.name;
            });
            return equipmentMap;
        } catch (error) {
            console.error('장비 정보 로드 실패:', error);
            return {};
        }
    }

    // 추이 분석 실행
    async function analyzeTrend() {
        // 타겟 선택 확인
        if (!selectedTargetId) {
            alert('분석할 타겟을 선택하세요.');
            return;
        }
        
        try {
            // 로딩 표시 (기존 코드)
            document.getElementById('trend-chart-container').innerHTML = `...`;
            document.getElementById('stats-container').innerHTML = `...`;
            
            // 장비 정보 로드 (새로 추가)
            const equipmentMap = await loadEquipments();
            
            // 일수 계산 (기존 코드)
            let days = 30;
            if (dateRangeType === 'last7') days = 7;
            else if (dateRangeType === 'last30') days = 30;
            else if (dateRangeType === 'last90') days = 90;
            
            // API 요청 파라미터 (기존 코드)
            const params = { days };
            // ... 기존 코드 ...
            
            // 통계 API 호출 (기존 코드)
            const statsResult = await api.getTargetStatistics(selectedTargetId, params.days);
            currentStats = statsResult;
            
            // 측정 데이터 API 호출 (기존 코드)
            const measureParams = {
                target_id: selectedTargetId,
                limit: 1000,
                ...params
            };
            const measurementsResult = await api.getMeasurements(measureParams);
            
            // 결과 표시 (equipmentMap 전달)
            updateTrendChart(measurementsResult, statsResult, equipmentMap);
            updateStatsTable(statsResult);
            
        } catch (error) {
            console.error('추이 분석 실패:', error);
            document.getElementById('trend-chart-container').innerHTML = `
            <div class="text-center py-5">
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle mr-1"></i> 데이터 분석 중 오류가 발생했습니다.
                </div>
            </div>
            `;
            
            document.getElementById('stats-container').innerHTML = `
            <div class="text-center py-5">
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle mr-1"></i> 통계 데이터 로드 중 오류가 발생했습니다.
                </div>
            </div>
            `;
        }
    }
    
    // 추이 차트 업데이트
    function updateTrendChart(measurements, stats, equipmentMap = {}) {
        // 데이터 체크
        if (!measurements || measurements.length === 0) {
            document.getElementById('trend-chart-container').innerHTML = `
            <div class="text-center py-5">
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle mr-1"></i> 분석할 데이터가 없습니다.
                </div>
            </div>
            `;
            return;
        }
        
        // 차트 컨테이너 준비
        document.getElementById('trend-chart-container').innerHTML = `
        <canvas id="trend-chart"></canvas>
        `;
        
        // 데이터 정렬 (날짜순)
        measurements.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        // 차트 데이터 준비
        const labels = measurements.map(m => {
            const date = new Date(m.created_at);
            return date.toLocaleDateString();
        });
        
        // 값 데이터
        const avgValues = measurements.map(m => m.avg_value);
        const minValues = measurements.map(m => m.min_value);
        const maxValues = measurements.map(m => m.max_value);
        const stdDevValues = measurements.map(m => m.std_dev);
        
        // 데이터셋 준비
        let datasets = [];
        
        // 차트 타입에 따라 다른 설정
        if (chartType === 'line') {
            // 라인 차트 데이터셋
            datasets = [
                {
                    label: '평균값',
                    data: avgValues,
                    borderColor: '#3c8dbc',
                    backgroundColor: 'rgba(60, 141, 188, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: false
                },
                {
                    label: '최대값',
                    data: maxValues,
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    borderWidth: 1,
                    tension: 0.4,
                    fill: false
                },
                {
                    label: '최소값',
                    data: minValues,
                    borderColor: '#00c0ef',
                    backgroundColor: 'rgba(0, 192, 239, 0.1)',
                    borderWidth: 1,
                    tension: 0.4,
                    fill: false
                }
            ];
        
        } else if (chartType === 'bar') {
            // 막대 차트 데이터셋
            datasets = [
                {
                    label: '평균값',
                    data: avgValues,
                    backgroundColor: 'rgba(60, 141, 188, 0.7)',
                    borderWidth: 1
                }
            ];
        }
        
        // SPEC 정보 추가
        if (stats && stats.spec) {
            const spec = stats.spec;
            const specLSL = spec.lsl;
            const specUSL = spec.usl;
            const target = spec.target || ((specLSL + specUSL) / 2);
            
            // SPEC 라인 추가
            datasets.push(
                {
                    label: 'LSL',
                    data: Array(labels.length).fill(specLSL),
                    borderColor: '#3366ff',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false,
                    borderDash: [5, 5]
                },
                {
                    label: 'USL',
                    data: Array(labels.length).fill(specUSL),
                    borderColor: '#3366ff',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false,
                    borderDash: [5, 5]
                },
                {
                    label: '타겟',
                    data: Array(labels.length).fill(target),
                    borderColor: '#ff9900',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false
                }
            );
        }
        
        // Chart.js 설정
        const ctx = document.getElementById('trend-chart').getContext('2d');
        
        // 기존 차트 파괴
        if (trendChart) {
            trendChart.destroy();
        }
        
        // 차트 옵션
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'DICD 추이 분석'
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
        };
        // 새 코드 (추가):
        if (chartType === 'scatter') {
            // 장비 정보 수집
            const equipmentData = {};
            
            // 장비 ID가 있는 측정 데이터만 필터링
            const measurementsWithEquipment = measurements.filter(m => 
                m.coating_equipment_id || m.exposure_equipment_id || m.development_equipment_id);
            
            if (measurementsWithEquipment.length === 0) {
                // 장비 정보가 없는 경우 안내 메시지 표시
                document.getElementById('trend-chart-container').innerHTML = `
                <div class="text-center py-5">
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle mr-1"></i> 장비 정보가 있는 측정 데이터가 없습니다. 다른 차트 유형을 선택하세요.
                    </div>
                </div>
                `;
                return;
            }
            
            // 장비 유형 선택 (coating, exposure, development)
            const equipmentType = document.querySelector('input[name="equipment-type"]:checked')?.value || 'coating';
            
            // 장비 유형에 따른 필드 선택
            const equipmentField = `${equipmentType}_equipment_id`;
            
            // 장비별로 데이터 그룹화할 때 장비 이름 사용
            measurementsWithEquipment.forEach((m, index) => {
                const equipmentId = m[equipmentField];
                if (equipmentId) {
                    // 장비 이름을 맵에서 가져오거나, 없으면 ID 사용
                    const equipmentName = equipmentMap[equipmentId] || `장비 ID: ${equipmentId}`;
                    
                    if (!equipmentData[equipmentId]) {
                        equipmentData[equipmentId] = {
                            id: equipmentId,
                            name: equipmentName,
                            data: []
                        };
                    }
                    // X 좌표는 장비 ID, Y 좌표는 측정값
                    // 지터링을 위해 랜덤 오프셋 추가 (±0.2)
                    const jitter = (Math.random() - 0.5) * 0.4;
                    equipmentData[equipmentId].data.push({
                        x: equipmentId + jitter,
                        y: m.avg_value,
                        date: new Date(m.created_at).toLocaleDateString(),
                        lot: m.lot_no,
                        wafer: m.wafer_no
                    });
                }
            });
            
            // 장비별 데이터셋 생성
            const colors = ['#3c8dbc', '#f39c12', '#00a65a', '#dd4b39', '#605ca8', '#00c0ef'];
            datasets = Object.values(equipmentData).map((equipment, index) => ({
                label: equipment.name,
                data: equipment.data,
                backgroundColor: colors[index % colors.length],
                pointRadius: 6,
                pointHoverRadius: 8
            }));
            
            // X축 설정 수정
            chartOptions.scales.x = {
                type: 'linear',
                title: {
                    display: true,
                    text: `${equipmentType.charAt(0).toUpperCase() + equipmentType.slice(1)} 장비`
                },
                // 여기에 ticks callback 추가
                ticks: {
                    callback: function(value) {
                        // 가장 가까운 장비 ID 찾기
                        const ids = Object.keys(equipmentData).map(Number);
                        if (ids.length === 0) return value;
                        
                        const closestId = ids.reduce((prev, curr) => {
                            return (Math.abs(curr - value) < Math.abs(prev - value)) ? curr : prev;
                        });
                        // 해당 ID의 장비 이름 반환
                        return equipmentData[closestId]?.name || value;
                    }
                }
            };
        }
            
            // 차트 생성
            trendChart = new Chart(ctx, {
                type: chartType === 'scatter' ? 'scatter' : (chartType === 'bar' ? 'bar' : 'line'),
                data: {
                    labels: chartType === 'scatter' ? null : labels,
                    datasets: datasets
                },
                options: chartOptions
            });
        }
    
    // 통계 테이블 업데이트
    function updateStatsTable(stats) {
        if (!stats) {
            document.getElementById('stats-container').innerHTML = `
            <div class="text-center py-5">
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle mr-1"></i> 통계 데이터가 없습니다.
                </div>
            </div>
            `;
            return;
        }
        
        // 기본 통계
        const overall = stats.overall_statistics || {};
        
        // 공정능력지수
        const capability = stats.process_capability || {};
        
        // SPEC 정보
        const spec = stats.spec || {};
        
        // 통계 테이블 HTML
        let statsHtml = `
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">기본 통계</h3>
                    </div>
                    <div class="card-body">
                        <div class="d-flex justify-content-center">
                            <div class="d-flex flex-column align-items-center">
                                <div class="font-weight-bold text-center" style="font-size: 24px;">
                                    ${stats.sample_count || 0}
                                </div>
                                <div class="text-muted">샘플 수</div>
                            </div>
                        </div>
                        
                        <div class="row mt-4">
                            <div class="col-md-6">
                                <div class="info-box bg-light">
                                    <div class="info-box-content">
                                        <span class="info-box-text text-center text-muted">평균</span>
                                        <span class="info-box-number text-center text-muted mb-0">${overall.avg ? overall.avg.toFixed(3) : '-'}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="info-box bg-light">
                                    <div class="info-box-content">
                                        <span class="info-box-text text-center text-muted">표준편차</span>
                                        <span class="info-box-number text-center text-muted mb-0">${overall.std_dev ? overall.std_dev.toFixed(3) : '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row mt-3">
                            <div class="col-md-4">
                                <div class="info-box bg-light">
                                    <div class="info-box-content">
                                        <span class="info-box-text text-center text-muted">최소값</span>
                                        <span class="info-box-number text-center text-muted mb-0">${overall.min ? overall.min.toFixed(3) : '-'}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="info-box bg-light">
                                    <div class="info-box-content">
                                        <span class="info-box-text text-center text-muted">최대값</span>
                                        <span class="info-box-number text-center text-muted mb-0">${overall.max ? overall.max.toFixed(3) : '-'}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="info-box bg-light">
                                    <div class="info-box-content">
                                        <span class="info-box-text text-center text-muted">범위</span>
                                        <span class="info-box-number text-center text-muted mb-0">${overall.range ? overall.range.toFixed(3) : '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">공정능력지수</h3>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <p class="mb-1 text-bold">공정능력지수 평가기준:</p>
                            <div class="d-flex flex-wrap">
                                <div class="mr-3"><span class="badge badge-success">Cp/Cpk ≥ 1.67</span> 매우 우수</div>
                                <div class="mr-3"><span class="badge badge-success">1.33 ≤ Cp/Cpk < 1.67</span> 우수</div>
                                <div class="mr-3"><span class="badge badge-warning">1.00 ≤ Cp/Cpk < 1.33</span> 적합</div>
                                <div class="mr-3"><span class="badge badge-warning">0.67 ≤ Cp/Cpk < 1.00</span> 부적합</div>
                                <div><span class="badge badge-danger">Cp/Cpk < 0.67</span> 매우 부적합</div>
                            </div>
                        </div>
                        <div class="mt-4">
                            ${createCapabilityGauge(capability.cp, 'Cp')}
                            ${createCapabilityGauge(capability.cpk, 'Cpk')}
                            ${createCapabilityGauge(capability.ppk, 'Ppk')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 위치별 통계 -->
        <div class="card mt-3">
            <div class="card-header">
                <h3 class="card-title">위치별 통계</h3>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>위치</th>
                                <th>평균</th>
                                <th>표준편차</th>
                                <th>최소값</th>
                                <th>최대값</th>
                                <th>범위</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        // 위치별 통계 추가
        const positions = stats.position_statistics || {};
        const positionNames = { top: '상', center: '중', bottom: '하', left: '좌', right: '우' };
        
        for (const [position, positionStats] of Object.entries(positions)) {
            statsHtml += `
            <tr>
                <th>${positionNames[position] || position}</th>
                <td>${positionStats.avg ? positionStats.avg.toFixed(3) : '-'}</td>
                <td>${positionStats.std_dev ? positionStats.std_dev.toFixed(3) : '-'}</td>
                <td>${positionStats.min ? positionStats.min.toFixed(3) : '-'}</td>
                <td>${positionStats.max ? positionStats.max.toFixed(3) : '-'}</td>
                <td>${positionStats.range ? positionStats.range.toFixed(3) : '-'}</td>
            </tr>
            `;
        }
        
        statsHtml += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;
        
        document.getElementById('stats-container').innerHTML = statsHtml;
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
            analyzeTrend();
        });
        
        // 날짜 범위 라디오 버튼 변경 이벤트
        document.querySelectorAll('input[name="date-range"]').forEach(radio => {
            radio.addEventListener('change', function() {
                dateRangeType = this.value;
                
                // 사용자 지정 날짜 선택기 표시/숨김
                if (dateRangeType === 'custom') {
                    $('#date-range-picker-container').show();
                } else {
                    $('#date-range-picker-container').hide();
                }
                
                // 이미 타겟이 선택되어 있으면 데이터 다시 로드
                if (selectedTargetId) {
                    analyzeTrend();
                }
            });
        });
        
        // 차트 타입 라디오 버튼 변경 이벤트 (수정)
        document.querySelectorAll('input[name="chart-type"]').forEach(radio => {
            radio.addEventListener('change', function() {
                chartType = this.value;
                
                // 산점도가 선택된 경우에만 장비 유형 선택 표시
                const equipmentTypeContainer = document.getElementById('equipment-type-container');
                if (chartType === 'scatter') {
                    equipmentTypeContainer.style.display = 'block';
                } else {
                    equipmentTypeContainer.style.display = 'none';
                }
                
                // 차트가 이미 그려져 있으면 업데이트
                if (currentStats && selectedTargetId) {
                    analyzeTrend();
                }
            });
        });

        // 장비 유형 라디오 버튼 변경 이벤트 (추가)
        document.querySelectorAll('input[name="equipment-type"]').forEach(radio => {
            radio.addEventListener('change', function() {
                // 차트가 이미 그려져 있고 산점도 모드인 경우에만 업데이트
                if (currentStats && selectedTargetId && chartType === 'scatter') {
                    analyzeTrend();
                }
            });
        });
    }
    
    // 공정 능력 지수 게이지 생성 함수
    function createCapabilityGauge(value, type) {
        if (!value) return `<div>${type}: - (데이터 없음)</div>`;
        
        // 게이지 설정
        const gaugeWidth = 100;
        const gaugeHeight = 12;
        
        // 평가 기준에 따른 색상 및 텍스트 결정
        let fillColor = '#dc3545'; // 기본: 부적합 (빨간색)
        let statusText = '매우 부적합';
        let statusClass = 'text-danger';
        
        // Cp/Cpk 평가 기준
        if (value >= 1.67) {
        fillColor = '#28a745'; // 매우 우수 (녹색)
        statusText = '매우 우수';
        statusClass = 'text-success';
        } else if (value >= 1.33) {
        fillColor = '#5cb85c'; // 우수 (연한 녹색)
        statusText = '우수';
        statusClass = 'text-success';
        } else if (value >= 1.0) {
        fillColor = '#ffc107'; // 적합 (노란색)
        statusText = '적합';
        statusClass = 'text-warning';
        } else if (value >= 0.67) {
        fillColor = '#fd7e14'; // 부적합 (주황색)
        statusText = '부적합';
        statusClass = 'text-warning';
        }
        
        // 게이지 채우기 너비 계산 (최대 100%, 최소 0%)
        const fillWidth = Math.min(100, Math.max(0, value * 60)); // 1.67 이상이면 100%
        
        return `
        <div class="d-flex align-items-center mb-2">
            <div class="mr-2 font-weight-bold" style="width: 40px;">${type}</div>
            <div style="position: relative; width: ${gaugeWidth}px; height: ${gaugeHeight}px; background-color: #e9ecef; border-radius: 4px;">
            <div style="position: absolute; width: ${fillWidth}%; height: 100%; background-color: ${fillColor}; border-radius: 4px;"></div>
            </div>
            <div class="ml-2">
            <span class="font-weight-bold">${value.toFixed(3)}</span>
            <span class="ml-2 ${statusClass}">(${statusText})</span>
            </div>
        </div>
        `;
    }

    // 페이지 로드 시 초기화
    document.addEventListener('DOMContentLoaded', initTrendPage);
})();