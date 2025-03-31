/**
 * 보고서 이력 페이지 스크립트
 */
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수 초기화
    let dataTable = null;
    let selectedReportId = null;
    let startDate = moment().subtract(30, 'days');
    let endDate = moment();
    let selectedReportType = '';
    let selectedTargetId = '';
    
    // 초기화 함수
    const initialize = async () => {
        try {
            // 날짜 필터 초기화
            initDateFilter();
            
            // 타겟 목록 로드
            await loadTargets();
            
            // 데이터 테이블 초기화
            initDataTable();
            
            // 이벤트 리스너 설정
            setupEventListeners();
            
            // 초기 데이터 로드
            loadReportsData();
        } catch (error) {
            console.error('초기화 오류:', error);
            showAlert('페이지 초기화 중 오류가 발생했습니다.', 'error');
        }
    };

    // 날짜 필터 초기화
    const initDateFilter = () => {
        $('#date-range-filter').daterangepicker({
            startDate: startDate,
            endDate: endDate,
            locale: {
                format: 'YYYY-MM-DD',
                applyLabel: '적용',
                cancelLabel: '취소',
                customRangeLabel: '사용자 지정',
                daysOfWeek: ['일', '월', '화', '수', '목', '금', '토'],
                monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
                firstDay: 1
            },
            ranges: {
                '오늘': [moment(), moment()],
                '어제': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
                '최근 7일': [moment().subtract(6, 'days'), moment()],
                '최근 30일': [moment().subtract(29, 'days'), moment()],
                '이번 달': [moment().startOf('month'), moment().endOf('month')],
                '지난 달': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
            }
        }, function(start, end) {
            startDate = start;
            endDate = end;
        });
    };

    // 타겟 목록 로드
    const loadTargets = async () => {
        try {
            // 모든 제품군 가져오기
            const productGroups = await api.getProductGroups();
            
            // 각 제품군에 대한 공정 목록 가져오기
            const promises = productGroups.map(async (group) => {
                const processes = await api.getProcesses(group.id);
                
                // 각 공정에 대한 타겟 목록 가져오기
                const processPromises = processes.map(async (process) => {
                    const targets = await api.getTargets(process.id);
                    return {
                        process,
                        targets
                    };
                });
                
                const processData = await Promise.all(processPromises);
                return {
                    group,
                    processData
                };
            });
            
            const groupData = await Promise.all(promises);
            
            // 타겟 선택 옵션 생성
            const targetSelect = document.getElementById('target-filter');
            
            // 기존 옵션 제거 (첫 번째 기본 옵션 유지)
            while (targetSelect.options.length > 1) {
                targetSelect.remove(1);
            }
            
            // 제품군 > 공정 > 타겟 계층 구조로 옵션 추가
            groupData.forEach(groupItem => {
                // 제품군 옵션 그룹 생성
                const groupOptGroup = document.createElement('optgroup');
                groupOptGroup.label = groupItem.group.name;
                
                // 각 공정 및 타겟 추가
                groupItem.processData.forEach(processItem => {
                    // 공정 옵션 그룹 생성
                    const processOptGroup = document.createElement('optgroup');
                    processOptGroup.label = `-- ${processItem.process.name}`;
                    processOptGroup.style.marginLeft = '10px';
                    
                    // 타겟 옵션 추가
                    processItem.targets.forEach(target => {
                        const option = document.createElement('option');
                        option.value = target.id;
                        option.textContent = `---- ${target.name}`;
                        processOptGroup.appendChild(option);
                    });
                    
                    groupOptGroup.appendChild(processOptGroup);
                });
                
                targetSelect.appendChild(groupOptGroup);
            });
        } catch (error) {
            console.error('타겟 로드 오류:', error);
            showAlert('타겟 목록을 로드하는 중 오류가 발생했습니다.', 'error');
        }
    };

    // 데이터 테이블 초기화
    const initDataTable = () => {
        dataTable = $('#reports-table').DataTable({
            columns: [
                { data: 'id' },
                { data: 'title' },
                { 
                    data: 'report_type',
                    render: function(data) {
                        return data === 'weekly' ? '주간 보고서' : '월간 보고서';
                    }
                },
                { 
                    data: null,
                    render: function(data) {
                        const startDate = new Date(data.start_date).toLocaleDateString();
                        const endDate = new Date(data.end_date).toLocaleDateString();
                        return `${startDate} ~ ${endDate}`;
                    }
                },
                { 
                    data: 'created_at',
                    render: function(data) {
                        return new Date(data).toLocaleString();
                    }
                },
                { 
                    data: null,
                    orderable: false,
                    render: function(data) {
                        return `
                            <button class="btn btn-sm btn-info view-report" data-id="${data.id}">
                                <i class="fas fa-eye"></i> 상세
                            </button>
                            <button class="btn btn-sm btn-primary download-report" data-id="${data.id}" data-file="${data.file_path}">
                                <i class="fas fa-download"></i> 다운로드
                            </button>
                        `;
                    }
                }
            ],
            order: [[0, 'desc']], // ID 기준 내림차순 정렬
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.10.25/i18n/Korean.json'
            },
            lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "전체"]],
            pageLength: 10,
            responsive: true
        });
    };

    // 이벤트 리스너 설정
    const setupEventListeners = () => {
        // 필터 적용 버튼 클릭 이벤트
        document.getElementById('apply-filter-btn').addEventListener('click', function() {
            // 필터값 가져오기
            selectedReportType = document.getElementById('report-type-filter').value;
            selectedTargetId = document.getElementById('target-filter').value;
            
            // 보고서 데이터 다시 로드
            loadReportsData();
        });
        
        // 필터 초기화 버튼 클릭 이벤트
        document.getElementById('reset-filter-btn').addEventListener('click', function() {
            // 필터값 초기화
            document.getElementById('report-type-filter').selectedIndex = 0;
            document.getElementById('target-filter').selectedIndex = 0;
            
            // 날짜 초기화
            startDate = moment().subtract(30, 'days');
            endDate = moment();
            $('#date-range-filter').data('daterangepicker').setStartDate(startDate);
            $('#date-range-filter').data('daterangepicker').setEndDate(endDate);
            
            // 필터값 변수 초기화
            selectedReportType = '';
            selectedTargetId = '';
            
            // 보고서 데이터 다시 로드
            loadReportsData();
        });
        
        // 보고서 테이블 상세 버튼 클릭 이벤트
        $('#reports-table').on('click', '.view-report', function() {
            const reportId = $(this).data('id');
            openReportDetailModal(reportId);
        });
        
        // 보고서 테이블 다운로드 버튼 클릭 이벤트
        $('#reports-table').on('click', '.download-report', function() {
            const filePath = $(this).data('file');
            downloadReport(filePath);
        });
        
        // 모달 다운로드 버튼 클릭 이벤트
        document.getElementById('download-report-btn').addEventListener('click', function() {
            if (selectedReportId) {
                const filePath = document.getElementById('detail-file-path').textContent;
                downloadReport(filePath);
            }
        });
    };

    // 보고서 데이터 로드
    const loadReportsData = async () => {
        try {
            // 로딩 메시지 표시
            dataTable.clear().draw();
            $('#reports-table tbody').html('<tr><td colspan="6" class="text-center">데이터를 불러오는 중입니다...</td></tr>');
            
            // API 요청 파라미터 준비
            const params = {};
            
            if (selectedReportType) {
                params.report_type = selectedReportType;
            }
            
            if (selectedTargetId) {
                params.target_id = selectedTargetId;
            }
            
            // 날짜 범위가 설정된 경우 (백엔드 API에 날짜 필터가 추가된다면 사용)
            // params.start_date = startDate.format('YYYY-MM-DD');
            // params.end_date = endDate.format('YYYY-MM-DD');
            
            // 보고서 목록 가져오기
            const reports = await api.getReports(params);
            
            // 데이터 테이블 업데이트
            dataTable.clear();
            
            if (reports && reports.length > 0) {
                // 날짜 필터 적용 (API에서 지원하지 않는 경우 클라이언트 측 필터링)
                const filteredReports = reports.filter(report => {
                    const reportDate = new Date(report.created_at);
                    return reportDate >= startDate.toDate() && reportDate <= endDate.toDate();
                });
                
                dataTable.rows.add(filteredReports).draw();
            } else {
                $('#reports-table tbody').html('<tr><td colspan="6" class="text-center">보고서가 없습니다</td></tr>');
            }
        } catch (error) {
            console.error('보고서 데이터 로드 오류:', error);
            showAlert('보고서 목록을 로드하는 중 오류가 발생했습니다.', 'error');
            $('#reports-table tbody').html('<tr><td colspan="6" class="text-center text-danger">데이터를 불러오는 중 오류가 발생했습니다</td></tr>');
        }
    };

    // 보고서 상세 모달 열기
    const openReportDetailModal = async (reportId) => {
        try {
            // 모달 초기화
            selectedReportId = reportId;
            const modal = $('#report-detail-modal');
            
            // 모달 내용 초기화
            document.getElementById('detail-id').textContent = '';
            document.getElementById('detail-title').textContent = '';
            document.getElementById('detail-type').textContent = '';
            document.getElementById('detail-period').textContent = '';
            document.getElementById('detail-created-at').textContent = '';
            document.getElementById('detail-file-path').textContent = '';
            
            // 수신자 목록 초기화
            document.querySelector('#report-recipients-table tbody').innerHTML = '<tr><td colspan="4" class="text-center">데이터를 불러오는 중입니다...</td></tr>';
            
            // 보고서 데이터 가져오기
            // 아직 API가 구현되지 않았으므로, 테이블에서 해당 보고서 데이터를 찾아서 사용
            const reportData = dataTable.rows().data().toArray().find(r => r.id === reportId);
            
            if (reportData) {
                // 모달 내용 업데이트
                document.getElementById('detail-id').textContent = reportData.id;
                document.getElementById('detail-title').textContent = reportData.title;
                document.getElementById('detail-type').textContent = reportData.report_type === 'weekly' ? '주간 보고서' : '월간 보고서';
                
                const startDateStr = new Date(reportData.start_date).toLocaleDateString();
                const endDateStr = new Date(reportData.end_date).toLocaleDateString();
                document.getElementById('detail-period').textContent = `${startDateStr} ~ ${endDateStr}`;
                
                document.getElementById('detail-created-at').textContent = new Date(reportData.created_at).toLocaleString();
                document.getElementById('detail-file-path').textContent = reportData.file_path;
                
                // 수신자 목록 가져오기 (아직 API가 구현되지 않음)
                // TODO: 수신자 목록 API 구현 후 업데이트
                document.querySelector('#report-recipients-table tbody').innerHTML = '<tr><td colspan="4" class="text-center">수신자가 없습니다</td></tr>';
                
                // 모달 열기
                modal.modal('show');
            } else {
                showAlert('보고서 정보를 찾을 수 없습니다.', 'error');
            }
        } catch (error) {
            console.error('보고서 상세 정보 로드 오류:', error);
            showAlert('보고서 상세 정보를 로드하는 중 오류가 발생했습니다.', 'error');
        }
    };

    // 보고서 다운로드
    const downloadReport = (filePath) => {
        // 백엔드에서 파일을 다운로드하기 위한 URL 생성
        const fileName = filePath.split('/').pop();
        
        // 파일 경로 사용하는 대신 보고서 ID로 다운로드
        // 실제 구현 시에는 API를 통해 파일을 다운로드해야 함
        showAlert('보고서 다운로드 기능이 아직 구현되지 않았습니다.', 'warning');
        
        // 구현 예시
        // const downloadUrl = `${API_CONFIG.BASE_URL}/api/reports/download?file_path=${encodeURIComponent(filePath)}`;
        // window.open(downloadUrl, '_blank');
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

    // 페이지 초기화
    initialize();
});