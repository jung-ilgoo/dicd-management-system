// 데이터 조회 페이지 모듈
(function() {
    // 전역 변수
    let currentPage = 1;
    const pageSize = 10;
    let totalItems = 0;
    let measurementsCache = [];
    
    // 페이지 초기화
    async function initViewPage() {
        // 날짜 범위 선택기 초기화
        initDateRangePicker();
        
        // 필터 옵션 로드
        await loadFilterOptions();
        
        // 측정 데이터 로드 (초기 로드)
        await loadMeasurements();
        
        // 이벤트 리스너 설정
        setupEventListeners();
    }
    
    // 날짜 범위 선택기 초기화
    function initDateRangePicker() {
        $('#date-range').daterangepicker({
            startDate: moment().subtract(14, 'days'),
            endDate: moment(),
            ranges: {
               '오늘': [moment(), moment()],
               '어제': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
               '최근 7일': [moment().subtract(6, 'days'), moment()],
               '최근 30일': [moment().subtract(29, 'days'), moment()],
               '이번 달': [moment().startOf('month'), moment().endOf('month')],
               '지난 달': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
            },
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
            }
        });
    }
    
    // 필터 옵션 로드
    async function loadFilterOptions() {
        try {
            // 제품군 옵션 로드
            const productGroups = await api.getProductGroups();
            
            if (productGroups && productGroups.length > 0) {
                let options = '<option value="">전체</option>';
                productGroups.forEach(productGroup => {
                    options += `<option value="${productGroup.id}">${productGroup.name}</option>`;
                });
                document.getElementById('product-group').innerHTML = options;
            }
            
            // 장비 옵션 로드
            const equipments = await api.getEquipments();
            
            if (equipments && equipments.length > 0) {
                let options = '<option value="">전체</option>';
                equipments.forEach(equipment => {
                    options += `<option value="${equipment.id}">${equipment.name} (${equipment.type})</option>`;
                });
                document.getElementById('equipment-filter').innerHTML = options;
            }
            
        } catch (error) {
            console.error('필터 옵션 로드 실패:', error);
        }
    }
    
    // 측정 데이터 로드
    async function loadMeasurements(page = 1) {
        try {
            // 로딩 표시
            document.getElementById('data-table-body').innerHTML = `
            <tr>
                <td colspan="12" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">로딩 중...</span>
                    </div>
                </td>
            </tr>
            `;
            
            // 현재 페이지 저장
            currentPage = page;
            
            // 필터 파라미터 수집
            const filters = getFilterParams();
            
            // API 호출 파라미터
            const params = {
                ...filters,
                skip: (page - 1) * pageSize,
                limit: pageSize
            };
            
            // 측정 데이터 가져오기
            const measurements = await api.getMeasurements(params);
            
            // 캐시에 저장
            measurementsCache = measurements;
            
            // 테이블 업데이트
            updateDataTable(measurements);
            
            // 페이지네이션 업데이트
            // 임시로 총 항목 수를 100으로 가정 (실제로는 API에서 반환해야 함)
            totalItems = 100;
            updatePagination();
            
        } catch (error) {
            console.error('측정 데이터 로드 실패:', error);
            document.getElementById('data-table-body').innerHTML = `
            <tr>
                <td colspan="12" class="text-center text-danger">
                    <i class="fas fa-exclamation-circle mr-1"></i> 데이터를 불러오는 중 오류가 발생했습니다.
                </td>
            </tr>
            `;
        }
    }
    
    // 필터 파라미터 수집 함수 수정
    function getFilterParams() {
        const productGroupId = document.getElementById('product-group').value;
        const processId = document.getElementById('process').value;
        const targetId = document.getElementById('target').value;
        const equipmentId = document.getElementById('equipment-filter').value;
        const keyword = document.getElementById('keyword').value;
        
        // 날짜 범위
        const dateRange = $('#date-range').data('daterangepicker');
        const startDate = dateRange.startDate.format('YYYY-MM-DD');
        const endDate = dateRange.endDate.format('YYYY-MM-DD');
        
        const params = {};
        
        if (productGroupId) params.product_group_id = productGroupId;
        if (processId) params.process_id = processId;
        if (targetId) params.target_id = targetId;
        
        // 장비 선택 시, 세 가지 장비 타입 중 어느 것으로 필터링할지 선택 가능
        // (백엔드는 OR 조건으로 처리)
        if (equipmentId) params.equipment_id = equipmentId;
        
        if (keyword) params.keyword = keyword;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        
        return params;
    }
    
    // 테이블 업데이트 함수 내 장비 정보 부분 수정
    async function updateDataTable(measurements) {
        if (!measurements || measurements.length === 0) {
            document.getElementById('data-table-body').innerHTML = `
            <tr>
                <td colspan="12" class="text-center">
                    데이터가 없습니다.
                </td>
            </tr>
            `;
            return;
        }
        
        let tableHtml = '';
        
        // 각 측정 데이터에 대한 추가 정보 로드
        for (const measurement of measurements) {
            try {
                // 타겟 정보 가져오기
                const target = await api.get(`${API_CONFIG.ENDPOINTS.TARGETS}/${measurement.target_id}`);
                
                // 공정 정보 가져오기
                const process = await api.get(`${API_CONFIG.ENDPOINTS.PROCESSES}/${target.process_id}`);
                
                // 제품군 정보 가져오기
                const productGroup = await api.get(`${API_CONFIG.ENDPOINTS.PRODUCT_GROUPS}/${process.product_group_id}`);
                
                // 장비 정보 가져오기 - 세 가지 장비 모두 조회
                let equipmentInfo = '';
                
                if (measurement.coating_equipment_id) {
                    try {
                        const equipment = await api.get(`${API_CONFIG.ENDPOINTS.EQUIPMENTS}/${measurement.coating_equipment_id}`);
                        equipmentInfo += `코팅: ${equipment.name}<br>`;
                    } catch (error) {
                        console.warn(`장비 ID ${measurement.coating_equipment_id}에 대한 정보를 가져올 수 없습니다.`);
                    }
                }
                
                if (measurement.exposure_equipment_id) {
                    try {
                        const equipment = await api.get(`${API_CONFIG.ENDPOINTS.EQUIPMENTS}/${measurement.exposure_equipment_id}`);
                        equipmentInfo += `노광: ${equipment.name}<br>`;
                    } catch (error) {
                        console.warn(`장비 ID ${measurement.exposure_equipment_id}에 대한 정보를 가져올 수 없습니다.`);
                    }
                }
                
                if (measurement.development_equipment_id) {
                    try {
                        const equipment = await api.get(`${API_CONFIG.ENDPOINTS.EQUIPMENTS}/${measurement.development_equipment_id}`);
                        equipmentInfo += `현상: ${equipment.name}`;
                    } catch (error) {
                        console.warn(`장비 ID ${measurement.development_equipment_id}에 대한 정보를 가져올 수 없습니다.`);
                    }
                }
                
                if (!equipmentInfo) {
                    equipmentInfo = '-';
                }
                
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
                    <td>${equipmentInfo}</td>
                    <td>${measurement.device}</td>
                    <td>${measurement.lot_no}</td>
                    <td>${measurement.wafer_no}</td>
                    <td>${UTILS.formatNumber(measurement.avg_value)}</td>
                    <td>${UTILS.formatNumber(measurement.std_dev)}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-info view-detail" data-id="${measurement.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
                `;
            } catch (error) {
                console.error('측정 데이터 추가 정보 로드 실패:', error);
            }
        }
        
        // 테이블에 HTML 삽입
        document.getElementById('data-table-body').innerHTML = tableHtml;
        
        // 상세 정보 버튼 이벤트 설정
        document.querySelectorAll('.view-detail').forEach(button => {
            button.addEventListener('click', function() {
                const measurementId = this.dataset.id;
                showMeasurementDetail(measurementId);
            });
        });
    }
    
    // 페이지네이션 업데이트
    function updatePagination() {
        const totalPages = Math.ceil(totalItems / pageSize);
        let paginationHtml = '';
        
        // 이전 페이지 버튼
        paginationHtml += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">이전</a>
        </li>
        `;
        
        // 페이지 번호
        for (let i = 1; i <= totalPages; i++) {
            paginationHtml += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
            `;
        }
        
        // 다음 페이지 버튼
        paginationHtml += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">다음</a>
        </li>
        `;
        
        // 페이지네이션에 HTML 삽입
        document.getElementById('pagination').innerHTML = paginationHtml;
        
        // 페이지 버튼 이벤트 설정
        document.querySelectorAll('#pagination .page-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const page = parseInt(this.dataset.page);
                if (page !== currentPage && page >= 1 && page <= totalPages) {
                    loadMeasurements(page);
                }
            });
        });
    }
    
    // 측정 데이터 상세 정보 표시 함수 수정
    async function showMeasurementDetail(measurementId) {
        try {
            // 로딩 표시
            document.getElementById('detail-content').innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">로딩 중...</span>
                </div>
            </div>
            `;
            
            // 모달 표시
            $('#detail-modal').modal('show');
            
            // 측정 데이터 가져오기
            const measurement = await api.get(`${API_CONFIG.ENDPOINTS.MEASUREMENTS}/${measurementId}`);
            
            // 타겟 정보 가져오기
            const target = await api.get(`${API_CONFIG.ENDPOINTS.TARGETS}/${measurement.target_id}`);
            
            // 공정 정보 가져오기
            const process = await api.get(`${API_CONFIG.ENDPOINTS.PROCESSES}/${target.process_id}`);
            
            // 제품군 정보 가져오기
            const productGroup = await api.get(`${API_CONFIG.ENDPOINTS.PRODUCT_GROUPS}/${process.product_group_id}`);
            
            // 장비 정보 가져오기 - 세 가지 장비 정보 모두 조회
            let equipmentInfo = '';
            
            // 코팅 장비 정보
            if (measurement.coating_equipment_id) {
                try {
                    const equipment = await api.get(`${API_CONFIG.ENDPOINTS.EQUIPMENTS}/${measurement.coating_equipment_id}`);
                    equipmentInfo += `<tr><th>코팅 장비</th><td>${equipment.name}</td></tr>`;
                } catch (error) {
                    console.warn(`장비 ID ${measurement.coating_equipment_id}에 대한 정보를 가져올 수 없습니다.`);
                    equipmentInfo += `<tr><th>코팅 장비</th><td>-</td></tr>`;
                }
            } else {
                equipmentInfo += `<tr><th>코팅 장비</th><td>-</td></tr>`;
            }
            
            // 노광 장비 정보
            if (measurement.exposure_equipment_id) {
                try {
                    const equipment = await api.get(`${API_CONFIG.ENDPOINTS.EQUIPMENTS}/${measurement.exposure_equipment_id}`);
                    equipmentInfo += `<tr><th>노광 장비</th><td>${equipment.name}</td></tr>`;
                } catch (error) {
                    console.warn(`장비 ID ${measurement.exposure_equipment_id}에 대한 정보를 가져올 수 없습니다.`);
                    equipmentInfo += `<tr><th>노광 장비</th><td>-</td></tr>`;
                }
            } else {
                equipmentInfo += `<tr><th>노광 장비</th><td>-</td></tr>`;
            }
            
            // 현상 장비 정보
            if (measurement.development_equipment_id) {
                try {
                    const equipment = await api.get(`${API_CONFIG.ENDPOINTS.EQUIPMENTS}/${measurement.development_equipment_id}`);
                    equipmentInfo += `<tr><th>현상 장비</th><td>${equipment.name}</td></tr>`;
                } catch (error) {
                    console.warn(`장비 ID ${measurement.development_equipment_id}에 대한 정보를 가져올 수 없습니다.`);
                    equipmentInfo += `<tr><th>현상 장비</th><td>-</td></tr>`;
                }
            } else {
                equipmentInfo += `<tr><th>현상 장비</th><td>-</td></tr>`;
            }
            
            // SPEC 정보 가져오기
            let specInfo = '<span class="badge badge-secondary">SPEC 정보 없음</span>';
            try {
                const spec = await api.getActiveSpec(measurement.target_id);
                if (spec) {
                    specInfo = `LSL: ${spec.lsl.toFixed(3)}, USL: ${spec.usl.toFixed(3)}`;
                }
            } catch (error) {
                console.warn(`타겟 ID ${measurement.target_id}에 대한 활성 SPEC이 없습니다.`);
            }
            
            // 상세 정보 HTML 생성
            let detailHtml = `
            <div class="row">
                <div class="col-md-6">
                    <h5>기본 정보</h5>
                    <table class="table table-bordered">
                        <tr>
                            <th>날짜</th>
                            <td>${UTILS.formatDate(measurement.created_at)}</td>
                        </tr>
                        <tr>
                            <th>제품군</th>
                            <td>${productGroup.name}</td>
                        </tr>
                        <tr>
                            <th>공정</th>
                            <td>${process.name}</td>
                        </tr>
                        <tr>
                            <th>타겟</th>
                            <td>${target.name}</td>
                        </tr>
                        ${equipmentInfo}
                        <tr>
                            <th>DEVICE</th>
                            <td>${measurement.device}</td>
                        </tr>
                        <tr>
                            <th>LOT NO</th>
                            <td>${measurement.lot_no}</td>
                        </tr>
                        <tr>
                            <th>WAFER NO</th>
                            <td>${measurement.wafer_no}</td>
                        </tr>
                        <tr>
                            <th>Exposure Time</th>
                            <td>${measurement.exposure_time || '-'}</td>
                        </tr>
                        <tr>
                            <th>작성자</th>
                            <td>${measurement.author}</td>
                        </tr>
                        <tr>
                            <th>SPEC</th>
                            <td>${specInfo}</td>
                        </tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h5>측정 데이터</h5>
                    <table class="table table-bordered">
                        <tr>
                            <th>좌</th>
                            <td>${UTILS.formatNumber(measurement.value_left)}</td>
                        </tr>
                        <tr>
                            <th>상</th>
                            <td>${UTILS.formatNumber(measurement.value_top)}</td>
                        </tr>
                        <tr>
                            <th>중</th>
                            <td>${UTILS.formatNumber(measurement.value_center)}</td>
                        </tr>
                        <tr>
                            <th>하</th>
                            <td>${UTILS.formatNumber(measurement.value_bottom)}</td>
                        </tr>
                        <tr>
                            <th>우</th>
                            <td>${UTILS.formatNumber(measurement.value_right)}</td>
                        </tr>
                        <tr>
                            <th>평균값</th>
                            <td>${UTILS.formatNumber(measurement.avg_value)}</td>
                        </tr>
                        <tr>
                            <th>최소값</th>
                            <td>${UTILS.formatNumber(measurement.min_value)}</td>
                        </tr>
                        <tr>
                            <th>최대값</th>
                            <td>${UTILS.formatNumber(measurement.max_value)}</td>
                        </tr>
                        <tr>
                            <th>범위</th>
                            <td>${UTILS.formatNumber(measurement.range_value)}</td>
                        </tr>
                        <tr>
                            <th>표준편차</th>
                            <td>${UTILS.formatNumber(measurement.std_dev)}</td>
                        </tr>
                    </table>
                </div>
            </div>
            `;
            
            // 상세 정보 영역에 HTML 삽입
            document.getElementById('detail-content').innerHTML = detailHtml;
            
        } catch (error) {
            console.error('측정 데이터 상세 정보 로드 실패:', error);
            document.getElementById('detail-content').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle mr-1"></i> 데이터를 불러오는 중 오류가 발생했습니다.
            </div>
            `;
        }
    }
    
    // 이벤트 리스너 설정
    function setupEventListeners() {
        // 제품군 선택 변경 이벤트
        document.getElementById('product-group').addEventListener('change', async function() {
            const productGroupId = this.value;
            
            // 공정 선택기 초기화
            document.getElementById('process').innerHTML = '<option value="">전체</option>';
            document.getElementById('process').disabled = !productGroupId;
            
            // 타겟 선택기 초기화
            document.getElementById('target').innerHTML = '<option value="">전체</option>';
            document.getElementById('target').disabled = true;
            
            if (productGroupId) {
                try {
                    // 공정 옵션 로드
                    const processes = await api.getProcesses(productGroupId);
                    
                    if (processes && processes.length > 0) {
                        let options = '<option value="">전체</option>';
                        processes.forEach(process => {
                            options += `<option value="${process.id}">${process.name}</option>`;
                        });
                        document.getElementById('process').innerHTML = options;
                    }
                } catch (error) {
                    console.error('공정 옵션 로드 실패:', error);
                }
            }
        });
        
        // 공정 선택 변경 이벤트
        document.getElementById('process').addEventListener('change', async function() {
            const processId = this.value;
            
            // 타겟 선택기 초기화
            document.getElementById('target').innerHTML = '<option value="">전체</option>';
            document.getElementById('target').disabled = !processId;
            
            if (processId) {
                try {
                    // 타겟 옵션 로드
                    const targets = await api.getTargets(processId);
                    
                    if (targets && targets.length > 0) {
                        let options = '<option value="">전체</option>';
                        targets.forEach(target => {
                            options += `<option value="${target.id}">${target.name}</option>`;
                        });
                        document.getElementById('target').innerHTML = options;
                    }
                } catch (error) {
                    console.error('타겟 옵션 로드 실패:', error);
                }
            }
        });
        
        // 필터 폼 제출 이벤트
        document.getElementById('filter-form').addEventListener('submit', function(e) {
            e.preventDefault();
            loadMeasurements(1);
        });
        
        // 필터 폼 초기화 이벤트
        document.getElementById('filter-form').addEventListener('reset', function() {
            // 선택기 상태 초기화
            document.getElementById('process').disabled = true;
            document.getElementById('target').disabled = true;
            
            // 1초 후 데이터 리로드 (폼 리셋 완료 후)
            setTimeout(() => {
                loadMeasurements(1);
            }, 100);
        });
        
        // 내보내기 버튼 이벤트
        document.getElementById('export-csv').addEventListener('click', function(e) {
            e.preventDefault();
            exportData('csv');
        });
        
        document.getElementById('export-excel').addEventListener('click', function(e) {
            e.preventDefault();
            exportData('excel');
        });
    }
    
    // 데이터 내보내기
    function exportData(format) {
        if (!measurementsCache || measurementsCache.length === 0) {
            alert('내보낼 데이터가 없습니다.');
            return;
        }
        
        // 실제 구현은 서버에서 처리하거나 CSVàExport 라이브러리 사용 필요
        alert(`${format.toUpperCase()} 형식으로 데이터 내보내기 기능은 아직 구현되지 않았습니다.`);
    }
    
    // 페이지 로드 시 초기화
    document.addEventListener('DOMContentLoaded', initViewPage);
})();