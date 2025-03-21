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
    
    // 추이 분석 실행
    async function analyzeTrend() {
        // 타겟 선택 확인
        if (!selectedTargetId) {
            alert('분석할 타겟을 선택하세요.');
            return;
        }
        
        try {
            // 로딩 표시
            document.getElementById('trend-chart-container').innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">로딩 중...</span>
                </div>
                <p class="mt-2">데이터 분석 중...</p>
            </div>
            `;
            
            document.getElementById('stats-container').innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">로딩 중...</span>
                </div>
            </div>
            `;
            
            // 일수 계산
            let days = 30; // 기본값
            if (dateRangeType === 'last7') days = 7;
            else if (dateRangeType === 'last30') days = 30;
            else if (dateRangeType === 'last90') days = 90;
            
            // API 요청 파라미터
            const params = { days };
            
            // 사용자 지정 날짜 범위인 경우
            if (dateRangeType === 'custom' && customStartDate && customEndDate) {
                // API에 맞게 파라미터 조정 (일수 대신 시작일/종료일 사용)
                delete params.days;
                params.start_date = customStartDate;
                params.end_date = customEndDate;
            }
            
            // 통계 API 호출
            const statsResult = await api.getTargetStatistics(selectedTargetId, params.days);
            currentStats = statsResult;
            
            // 측정 데이터 API 호출
            const measureParams = {
                target_id: selectedTargetId,
                limit: 1000, // 충분히 많은 데이터를 요청
                ...params // 날짜 관련 파라미터 전달
            };
            const measurementsResult = await api.getMeasurements(measureParams);
            
            // 결과 표시
            updateTrendChart(measurementsResult, statsResult);
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
    function updateTrendChart(measurements, stats) {
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
        } else if (chartType === 'scatter') {
            // 산점도 차트 데이터셋
            datasets = [
                {
                    label: '측정값',
                    data: avgValues.map((value, index) => ({ x: index, y: value })),
                    backgroundColor: '#3c8dbc',
                    pointRadius: 5,
                    pointHoverRadius: 7
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
                    <div class="card-body p-0">
                        <table class="table table-striped">
                            <tbody>
                                <tr>
                                    <th>샘플 수</th>
                                    <td>${stats.sample_count || 0}</td>
                                </tr>
                                <tr>
                                    <th>평균</th>
                                    <td>${overall.avg ? overall.avg.toFixed(3) : '-'}</td>
                                </tr>
                                <tr>
                                    <th>표준편차</th>
                                    <td>${overall.std_dev ? overall.std_dev.toFixed(3) : '-'}</td>
                                </tr>
                                <tr>
                                    <th>최소값</th>
                                    <td>${overall.min ? overall.min.toFixed(3) : '-'}</td>
                                </tr>
                                <tr>
                                    <th>최대값</th>
                                    <td>${overall.max ? overall.max.toFixed(3) : '-'}</td>
                                </tr>
                                <tr>
                                    <th>범위</th>
                                    <td>${overall.range ? overall.range.toFixed(3) : '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">공정능력지수</h3>
                    </div>
                    <div class="card-body p-0">
                        <table class="table table-striped">
                            <tbody>
                                <tr>
                                    <th>SPEC LSL</th>
                                    <td>${spec.lsl ? spec.lsl.toFixed(3) : '-'}</td>
                                </tr>
                                <tr>
                                    <th>SPEC USL</th>
                                    <td>${spec.usl ? spec.usl.toFixed(3) : '-'}</td>
                                </tr>
                                <tr>
                                    <th>타겟</th>
                                    <td>${spec.target ? spec.target.toFixed(3) : (spec.lsl && spec.usl ? ((spec.lsl + spec.usl) / 2).toFixed(3) : '-')}</td>
                                </tr>
                                <tr>
                                    <th>Cp</th>
                                    <td>${capability.cp ? capability.cp.toFixed(3) : '-'}</td>
                                </tr>
                                <tr>
                                    <th>Cpk</th>
                                    <td>${capability.cpk ? capability.cpk.toFixed(3) : '-'}</td>
                                </tr>
                                <tr>
                                    <th>Ppk</th>
                                    <td>${capability.ppk ? capability.ppk.toFixed(3) : '-'}</td>
                                </tr>
                            </tbody>
                        </table>
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
        
        // 차트 타입 라디오 버튼 변경 이벤트
        document.querySelectorAll('input[name="chart-type"]').forEach(radio => {
            radio.addEventListener('change', function() {
                chartType = this.value;
                
                // 차트가 이미 그려져 있으면 업데이트
                if (currentStats && selectedTargetId) {
                    analyzeTrend();
                }
            });
        });
    }
    
    // 페이지 로드 시 초기화
    document.addEventListener('DOMContentLoaded', initTrendPage);
})();