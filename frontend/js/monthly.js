/**
 * 월간 보고서 페이지 스크립트
 */
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수 초기화
    let selectedProductGroupId = null;
    let selectedProcessId = null;
    let selectedTargetId = null;
    let selectedYear = new Date().getFullYear();
    let selectedMonth = new Date().getMonth() + 1; // JavaScript의 월은 0부터 시작하므로 +1
    let previewChart = null;
    let reportRecipients = [];

    // 초기화 함수
    const initialize = async () => {
        try {
            // 제품군 목록 로드
            await loadProductGroups();
            
            // 월 선택 초기화
            initMonthPicker();
            
            // 이벤트 리스너 설정
            setupEventListeners();
            
            // 버튼 상태 업데이트
            updateButtonState();
        } catch (error) {
            console.error('초기화 오류:', error);
            showAlert('페이지 초기화 중 오류가 발생했습니다.', 'error');
        }
    };

    // 제품군 로드
    const loadProductGroups = async () => {
        try {
            const productGroups = await api.getProductGroups();
            const select = document.getElementById('product-group-select');
            
            // 기존 옵션 제거 (첫 번째 기본 옵션 유지)
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // 새 옵션 추가
            productGroups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = group.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('제품군 로드 오류:', error);
            showAlert('제품군 목록을 로드하는 중 오류가 발생했습니다.', 'error');
        }
    };

    // 공정 로드
    const loadProcesses = async (productGroupId) => {
        try {
            const processes = await api.getProcesses(productGroupId);
            const select = document.getElementById('process-select');
            
            // 기존 옵션 제거 (첫 번째 기본 옵션 유지)
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // 새 옵션 추가
            processes.forEach(process => {
                const option = document.createElement('option');
                option.value = process.id;
                option.textContent = process.name;
                select.appendChild(option);
            });
            
            // 공정 선택 활성화
            select.disabled = false;
            
            // 타겟 선택 비활성화 및 초기화
            const targetSelect = document.getElementById('target-select');
            targetSelect.disabled = true;
            targetSelect.selectedIndex = 0;
            selectedTargetId = null;
            
            // 버튼 상태 업데이트
            updateButtonState();
        } catch (error) {
            console.error('공정 로드 오류:', error);
            showAlert('공정 목록을 로드하는 중 오류가 발생했습니다.', 'error');
        }
    };

    // 타겟 로드
    const loadTargets = async (processId) => {
        try {
            const targets = await api.getTargets(processId);
            const select = document.getElementById('target-select');
            
            // 기존 옵션 제거 (첫 번째 기본 옵션 유지)
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // 새 옵션 추가
            targets.forEach(target => {
                const option = document.createElement('option');
                option.value = target.id;
                option.textContent = target.name;
                select.appendChild(option);
            });
            
            // 타겟 선택 활성화
            select.disabled = false;
            
            // 버튼 상태 업데이트
            updateButtonState();
        } catch (error) {
            console.error('타겟 로드 오류:', error);
            showAlert('타겟 목록을 로드하는 중 오류가 발생했습니다.', 'error');
        }
    };

    // 월 선택 초기화
    const initMonthPicker = () => {
        $('#month-picker').datepicker({
            format: 'yyyy년 mm월',
            minViewMode: 'months',
            maxViewMode: 'years',
            startView: 'months',
            language: 'ko',
            autoclose: true,
            todayHighlight: true
        }).on('changeDate', function(e) {
            selectedYear = e.date.getFullYear();
            selectedMonth = e.date.getMonth() + 1;
            
            // 미리보기 업데이트
            if (selectedTargetId) {
                loadPreviewData();
            }
        });
        
        // 초기 날짜 설정
        $('#month-picker').datepicker('setDate', new Date(selectedYear, selectedMonth - 1, 1));
    };

    // 이벤트 리스너 설정
    const setupEventListeners = () => {
        // 제품군 선택 변경 이벤트
        document.getElementById('product-group-select').addEventListener('change', function() {
            const productGroupId = this.value;
            if (productGroupId) {
                selectedProductGroupId = parseInt(productGroupId);
                loadProcesses(selectedProductGroupId);
            } else {
                selectedProductGroupId = null;
                
                // 공정, 타겟 선택 비활성화 및 초기화
                const processSelect = document.getElementById('process-select');
                processSelect.disabled = true;
                processSelect.selectedIndex = 0;
                
                const targetSelect = document.getElementById('target-select');
                targetSelect.disabled = true;
                targetSelect.selectedIndex = 0;
                
                selectedProcessId = null;
                selectedTargetId = null;
                
                // 미리보기 초기화
                resetPreview();
            }
            
            // 버튼 상태 업데이트
            updateButtonState();
        });
        
        // 공정 선택 변경 이벤트
        document.getElementById('process-select').addEventListener('change', function() {
            const processId = this.value;
            if (processId) {
                selectedProcessId = parseInt(processId);
                loadTargets(selectedProcessId);
            } else {
                selectedProcessId = null;
                
                // 타겟 선택 비활성화 및 초기화
                const targetSelect = document.getElementById('target-select');
                targetSelect.disabled = true;
                targetSelect.selectedIndex = 0;
                
                selectedTargetId = null;
                
                // 미리보기 초기화
                resetPreview();
            }
            
            // 버튼 상태 업데이트
            updateButtonState();
        });
        
        // 타겟 선택 변경 이벤트
        document.getElementById('target-select').addEventListener('change', function() {
            const targetId = this.value;
            if (targetId) {
                selectedTargetId = parseInt(targetId);
                
                // 미리보기 로드
                loadPreviewData();
            } else {
                selectedTargetId = null;
                
                // 미리보기 초기화
                resetPreview();
            }
            
            // 버튼 상태 업데이트
            updateButtonState();
        });
        
        // 보고서 생성 버튼 클릭 이벤트
        document.getElementById('generate-report-btn').addEventListener('click', generateReport);
        
        // 수신자 추가 버튼 클릭 이벤트
        document.getElementById('add-recipient-btn').addEventListener('click', addRecipient);
    };

    // 미리보기 데이터 로드
    const loadPreviewData = async () => {
        if (!selectedTargetId) return;
        
        try {
            // 로딩 표시
            document.getElementById('preview-placeholder').innerHTML = '<div class="spinner-border text-primary" role="status"><span class="sr-only">로딩 중...</span></div>';
            
            // 선택한 년월의 일수 계산 (해당 월의 마지막 날)
            const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
            
            // SPC 분석 데이터 가져오기 (월간 데이터)
            const spcData = await api.analyzeSpc(selectedTargetId, daysInMonth);
            
            // 통계 데이터 가져오기
            const statsData = await api.getTargetStatistics(selectedTargetId, daysInMonth);
            
            // 미리보기 업데이트
            updatePreview(spcData, statsData);
        } catch (error) {
            console.error('미리보기 데이터 로드 오류:', error);
            document.getElementById('preview-placeholder').innerHTML = '<p class="text-danger">데이터를 불러오는 중 오류가 발생했습니다.</p>';
        }
    };

    // 미리보기 업데이트
    const updatePreview = (spcData, statsData) => {
        // 플레이스홀더 숨김, 미리보기 표시
        document.getElementById('preview-placeholder').classList.add('d-none');
        document.getElementById('report-preview').classList.remove('d-none');
        
        // 요약 정보 업데이트
        if (statsData && statsData.overall_statistics) {
            const avgValue = statsData.overall_statistics.avg || '-';
            document.getElementById('preview-avg').textContent = typeof avgValue === 'number' ? avgValue.toFixed(3) : avgValue;
            
            const stdDevValue = statsData.overall_statistics.std_dev || '-';
            document.getElementById('preview-std-dev').textContent = typeof stdDevValue === 'number' ? stdDevValue.toFixed(3) : stdDevValue;
        }
        
        if (statsData && statsData.process_capability) {
            const cpkValue = statsData.process_capability.cpk || '-';
            document.getElementById('preview-cpk').textContent = typeof cpkValue === 'number' ? cpkValue.toFixed(3) : cpkValue;
        }
        
        // SPC 패턴 수 업데이트
        const patternCount = spcData && spcData.patterns ? spcData.patterns.length : 0;
        document.getElementById('preview-pattern-count').textContent = patternCount;
        
        // 차트 업데이트
        updateChart(spcData);
    };

    // 차트 업데이트
    const updateChart = (spcData) => {
        if (!spcData || !spcData.data || !spcData.data.values) {
            // 데이터가 없을 경우 처리
            return;
        }

        const ctx = document.getElementById('preview-chart').getContext('2d');
        
        // 기존 차트가 있으면 파괴
        if (previewChart) {
            previewChart.destroy();
        }
        
        // 차트 데이터 준비
        const values = spcData.data.values;
        const labels = spcData.data.dates.map(d => {
            const date = new Date(d);
            return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
        });
        
        // CL, UCL, LCL 데이터
        const cl = spcData.control_limits.cl;
        const ucl = spcData.control_limits.ucl;
        const lcl = spcData.control_limits.lcl;
        
        // SPEC 데이터
        const hasSpec = spcData.spec ? true : false;
        const usl = hasSpec ? spcData.spec.usl : null;
        const lsl = hasSpec ? spcData.spec.lsl : null;
        
        // 차트 데이터셋
        const datasets = [
            {
                label: '측정값',
                data: values,
                borderColor: 'rgba(60, 141, 188, 1)',
                backgroundColor: 'rgba(60, 141, 188, 0.2)',
                pointBackgroundColor: values.map(v => {
                    if (hasSpec && (v > usl || v < lsl)) {
                        return 'rgba(220, 53, 69, 1)'; // 빨간색 - SPEC 초과
                    }
                    if (v > ucl || v < lcl) {
                        return 'rgba(255, 193, 7, 1)'; // 노란색 - 관리한계 초과
                    }
                    return 'rgba(60, 141, 188, 1)'; // 기본 파란색
                }),
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: false,
                tension: 0.1,
                borderWidth: 2
            }
        ];
        
        // CL, UCL, LCL 추가
        if (cl !== null) {
            datasets.push({
                label: 'CL',
                data: Array(labels.length).fill(cl),
                borderColor: 'rgba(40, 167, 69, 1)', // 녹색
                borderWidth: 1,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false
            });
            
            datasets.push({
                label: 'UCL',
                data: Array(labels.length).fill(ucl),
                borderColor: 'rgba(220, 53, 69, 1)', // 빨간색
                borderWidth: 1,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false
            });
            
            datasets.push({
                label: 'LCL',
                data: Array(labels.length).fill(lcl),
                borderColor: 'rgba(220, 53, 69, 1)', // 빨간색
                borderWidth: 1,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false
            });
        }
        
        // SPEC 추가
        if (hasSpec) {
            datasets.push({
                label: 'USL',
                data: Array(labels.length).fill(usl),
                borderColor: 'rgba(0, 123, 255, 1)', // 파란색
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false
            });
            
            datasets.push({
                label: 'LSL',
                data: Array(labels.length).fill(lsl),
                borderColor: 'rgba(0, 123, 255, 1)', // 파란색
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false
            });
        }
        
        // 차트 생성
        previewChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: '측정값'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '날짜'
                        }
                    }
                }
            }
        });
    };

    // 미리보기 초기화
    const resetPreview = () => {
        // 미리보기 숨김, 플레이스홀더 표시
        document.getElementById('preview-placeholder').classList.remove('d-none');
        document.getElementById('preview-placeholder').innerHTML = '<p class="text-muted">타겟과 월을 선택하면 보고서 미리보기가 표시됩니다.</p>';
        document.getElementById('report-preview').classList.add('d-none');
        
        // 요약 정보 초기화
        document.getElementById('preview-avg').textContent = '-';
        document.getElementById('preview-cpk').textContent = '-';
        document.getElementById('preview-std-dev').textContent = '-';
        document.getElementById('preview-pattern-count').textContent = '-';
        
        // 차트 초기화
        if (previewChart) {
            previewChart.destroy();
            previewChart = null;
        }
    };

    // 보고서 생성
    const generateReport = () => {
        if (!selectedTargetId) return;
        
        try {
            // 보고서 생성 API 호출 (월간 보고서)
            api.generateMonthlyReport(selectedTargetId, selectedYear, selectedMonth);
            
            // 성공 메시지 표시
            showAlert('보고서가 생성되었습니다. 다운로드가 시작됩니다.', 'success');
        } catch (error) {
            console.error('보고서 생성 오류:', error);
            showAlert('보고서 생성 중 오류가 발생했습니다.', 'error');
        }
    };

    // 수신자 추가 (weekly.js와 동일)
    const addRecipient = async () => {
        const emailInput = document.getElementById('recipient-email');
        const email = emailInput.value.trim();
        
        // 이메일 유효성 검사
        if (!isValidEmail(email)) {
            showAlert('유효한 이메일 주소를 입력하세요.', 'warning');
            return;
        }
        
        try {
            // TODO: 수신자 추가 API 호출 (아직 구현되지 않음)
            // const result = await api.addReportRecipient({
            //    report_id: selectedReportId,
            //    email: email
            // });
            
            // 임시 처리: 수신자 목록에 추가
            reportRecipients.push({
                id: Date.now(), // 임시 ID
                email: email,
                is_active: true
            });
            
            // 수신자 목록 업데이트
            updateRecipientsList();
            
            // 입력 필드 초기화
            emailInput.value = '';
            
            // 성공 메시지 표시
            showAlert('수신자가 추가되었습니다.', 'success');
        } catch (error) {
            console.error('수신자 추가 오류:', error);
            showAlert('수신자 추가 중 오류가 발생했습니다.', 'error');
        }
    };

    // 수신자 목록 업데이트 (weekly.js와 동일)
    const updateRecipientsList = () => {
        const tbody = document.querySelector('#recipients-table tbody');
        
        // 목록 초기화
        tbody.innerHTML = '';
        
        // 수신자가 없는 경우
        if (reportRecipients.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3" class="text-center">수신자가 없습니다</td>';
            tbody.appendChild(row);
            return;
        }
        
        // 수신자 목록 표시
        reportRecipients.forEach(recipient => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${recipient.email}</td>
                <td>
                    <span class="badge ${recipient.is_active ? 'badge-success' : 'badge-secondary'}">
                        ${recipient.is_active ? '활성' : '비활성'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-danger delete-recipient" data-id="${recipient.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // 삭제 버튼 이벤트 연결
        document.querySelectorAll('.delete-recipient').forEach(button => {
            button.addEventListener('click', function() {
                const recipientId = parseInt(this.getAttribute('data-id'));
                deleteRecipient(recipientId);
            });
        });
    };

    // 수신자 삭제 (weekly.js와 동일)
    const deleteRecipient = async (recipientId) => {
        try {
            // TODO: 수신자 삭제 API 호출 (아직 구현되지 않음)
            // await api.deleteReportRecipient(recipientId);
            
            // 임시 처리: 수신자 목록에서 제거
            reportRecipients = reportRecipients.filter(r => r.id !== recipientId);
            
            // 수신자 목록 업데이트
            updateRecipientsList();
            
            // 성공 메시지 표시
            showAlert('수신자가 삭제되었습니다.', 'success');
        } catch (error) {
            console.error('수신자 삭제 오류:', error);
            showAlert('수신자 삭제 중 오류가 발생했습니다.', 'error');
        }
    };

    // 버튼 상태 업데이트
    const updateButtonState = () => {
        const generateBtn = document.getElementById('generate-report-btn');
        generateBtn.disabled = !selectedTargetId;
    };

    // 알림 표시
    const showAlert = (message, type = 'info') => {
        // AdminLTE의 토스트 알림 사용
        $(document).Toasts('create', {
            title: type === 'error' ? '오류' : type === 'warning' ? '주의' : '알림',
            body: message,
            autohide: true,
            delay: 3000,
            class: type === 'error' ? 'bg-danger' : type === 'warning' ? 'bg-warning' : type === 'success' ? 'bg-success' : 'bg-info'
        });
    };

    // 이메일 유효성 검사
    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // 페이지 초기화
    initialize();
});