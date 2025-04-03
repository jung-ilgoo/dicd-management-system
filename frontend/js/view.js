// 데이터 조회 페이지 모듈
(function() {
    // 전역 변수
    let currentPage = 1;
    const pageSize = 20;
    let totalItems = 0;
    let measurementsCache = [];
    // 전역 캐시 추가
    let targetsCache = {};
    let processesCache = {};
    let productGroupsCache = {};
    let equipmentsCache = {};
    
    // 전역 변수 (함수 맨 위에 추가)
    let currentMeasurementId = null;

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
    
    // frontend/js/view.js 파일의 getFilterParams 함수 수정

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
        if (equipmentId) params.equipment_id = equipmentId;
        
        if (keyword) params.keyword = keyword;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        
        return params;
    }
    
    // 테이블 업데이트 함수 최적화
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
        
        // 필요한 모든 ID 목록 수집
        const targetIds = new Set();
        const processIds = new Set();
        const productGroupIds = new Set();
        const equipmentIds = new Set();
        
        measurements.forEach(measurement => {
            targetIds.add(measurement.target_id);
            if (measurement.coating_equipment_id) equipmentIds.add(measurement.coating_equipment_id);
            if (measurement.exposure_equipment_id) equipmentIds.add(measurement.exposure_equipment_id);
            if (measurement.development_equipment_id) equipmentIds.add(measurement.development_equipment_id);
        });
        
        // 캐시에 없는 타겟 정보 병렬로 로드
        const targetFetchPromises = Array.from(targetIds)
            .filter(id => !targetsCache[id])
            .map(async id => {
                try {
                    const target = await api.get(`${API_CONFIG.ENDPOINTS.TARGETS}/${id}`);
                    targetsCache[id] = target;
                    processIds.add(target.process_id);
                } catch (error) {
                    console.error(`타겟 ID ${id} 정보 로드 실패:`, error);
                }
            });
        
        await Promise.all(targetFetchPromises);
        
        // 캐시에 없는 공정 정보 병렬로 로드
        const processFetchPromises = Array.from(processIds)
            .filter(id => !processesCache[id])
            .map(async id => {
                try {
                    const process = await api.get(`${API_CONFIG.ENDPOINTS.PROCESSES}/${id}`);
                    processesCache[id] = process;
                    productGroupIds.add(process.product_group_id);
                } catch (error) {
                    console.error(`공정 ID ${id} 정보 로드 실패:`, error);
                }
            });
        
        await Promise.all(processFetchPromises);
        
        // 캐시에 없는 제품군 정보 병렬로 로드
        const productGroupFetchPromises = Array.from(productGroupIds)
            .filter(id => !productGroupsCache[id])
            .map(async id => {
                try {
                    const productGroup = await api.get(`${API_CONFIG.ENDPOINTS.PRODUCT_GROUPS}/${id}`);
                    productGroupsCache[id] = productGroup;
                } catch (error) {
                    console.error(`제품군 ID ${id} 정보 로드 실패:`, error);
                }
            });
        
        // 캐시에 없는 장비 정보 병렬로 로드
        const equipmentFetchPromises = Array.from(equipmentIds)
            .filter(id => !equipmentsCache[id])
            .map(async id => {
                try {
                    const equipment = await api.get(`${API_CONFIG.ENDPOINTS.EQUIPMENTS}/${id}`);
                    equipmentsCache[id] = equipment;
                } catch (error) {
                    console.error(`장비 ID ${id} 정보 로드 실패:`, error);
                }
            });
        
        // 모든 필요한 데이터 병렬로 로드
        await Promise.all([
            ...productGroupFetchPromises,
            ...equipmentFetchPromises
        ]);
        
        // 이제 모든 필요한 데이터가 캐시에 있으므로, 측정 데이터 테이블 생성
        for (const measurement of measurements) {
            try {
                const target = targetsCache[measurement.target_id];
                if (!target) continue;
                
                const process = processesCache[target.process_id];
                if (!process) continue;
                
                const productGroup = productGroupsCache[process.product_group_id];
                if (!productGroup) continue;
                
                // 장비 정보 생성
                let equipmentNames = [];
                
                if (measurement.coating_equipment_id && equipmentsCache[measurement.coating_equipment_id]) {
                    equipmentNames.push(equipmentsCache[measurement.coating_equipment_id].name);
                }
                
                if (measurement.exposure_equipment_id && equipmentsCache[measurement.exposure_equipment_id]) {
                    equipmentNames.push(equipmentsCache[measurement.exposure_equipment_id].name);
                }
                
                if (measurement.development_equipment_id && equipmentsCache[measurement.development_equipment_id]) {
                    equipmentNames.push(equipmentsCache[measurement.development_equipment_id].name);
                }
                
                const equipmentInfo = equipmentNames.length > 0 ? equipmentNames.join(', ') : '-';
                
                // SPEC 정보 가져오기
                let statusBadge = '<span class="badge badge-secondary">SPEC 없음</span>';
                try {
                    // 캐시된 활성 SPEC 확인
                    if (!window.activeSpecCache) window.activeSpecCache = {};
                    
                    if (!window.activeSpecCache[measurement.target_id]) {
                        window.activeSpecCache[measurement.target_id] = await api.getActiveSpec(measurement.target_id);
                    }
                    
                    const spec = window.activeSpecCache[measurement.target_id];
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
                    <td class="equipment-cell text-center">${equipmentInfo}</td>
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
    
    // frontend/js/view.js 파일의 showMeasurementDetail 함수만 수정

    async function showMeasurementDetail(measurementId) {
        try {
            // 현재 측정 ID 저장
            currentMeasurementId = measurementId;
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
            
            // 먼저 캐시된 데이터에서 측정 데이터 찾기
            const cachedMeasurement = measurementsCache.find(m => m.id == measurementId);
            
            if (!cachedMeasurement) {
                throw new Error('캐시된 측정 데이터를 찾을 수 없습니다.');
            }
            
            // 이미 캐시에 있는 데이터 사용
            let target, process, productGroup;
            
            // 타겟 정보
            if (targetsCache[cachedMeasurement.target_id]) {
                target = targetsCache[cachedMeasurement.target_id];
            } else {
                // 캐시에 없으면 새로 가져오기
                target = await api.get(`${API_CONFIG.ENDPOINTS.TARGETS}/${cachedMeasurement.target_id}`);
                targetsCache[cachedMeasurement.target_id] = target;
            }
            
            // 공정 정보
            if (processesCache[target.process_id]) {
                process = processesCache[target.process_id];
            } else {
                // 캐시에 없으면 새로 가져오기
                process = await api.get(`${API_CONFIG.ENDPOINTS.PROCESSES}/${target.process_id}`);
                processesCache[target.process_id] = process;
            }
            
            // 제품군 정보
            if (productGroupsCache[process.product_group_id]) {
                productGroup = productGroupsCache[process.product_group_id];
            } else {
                // 캐시에 없으면 새로 가져오기
                productGroup = await api.get(`${API_CONFIG.ENDPOINTS.PRODUCT_GROUPS}/${process.product_group_id}`);
                productGroupsCache[process.product_group_id] = productGroup;
            }
            
            // 장비 정보 준비
            let equipmentInfo = '';
            
            // 코팅 장비 정보
            if (cachedMeasurement.coating_equipment_id) {
                let equipment;
                if (equipmentsCache[cachedMeasurement.coating_equipment_id]) {
                    equipment = equipmentsCache[cachedMeasurement.coating_equipment_id];
                } else {
                    try {
                        equipment = await api.get(`${API_CONFIG.ENDPOINTS.EQUIPMENTS}/${cachedMeasurement.coating_equipment_id}`);
                        equipmentsCache[cachedMeasurement.coating_equipment_id] = equipment;
                    } catch (error) {
                        console.warn(`장비 ID ${cachedMeasurement.coating_equipment_id} 정보를 가져올 수 없습니다.`);
                    }
                }
                equipmentInfo += `<tr><th>코팅 장비</th><td>${equipment ? equipment.name : '-'}</td></tr>`;
            } else {
                equipmentInfo += `<tr><th>코팅 장비</th><td>-</td></tr>`;
            }
            
            // 노광 장비 정보
            if (cachedMeasurement.exposure_equipment_id) {
                let equipment;
                if (equipmentsCache[cachedMeasurement.exposure_equipment_id]) {
                    equipment = equipmentsCache[cachedMeasurement.exposure_equipment_id];
                } else {
                    try {
                        equipment = await api.get(`${API_CONFIG.ENDPOINTS.EQUIPMENTS}/${cachedMeasurement.exposure_equipment_id}`);
                        equipmentsCache[cachedMeasurement.exposure_equipment_id] = equipment;
                    } catch (error) {
                        console.warn(`장비 ID ${cachedMeasurement.exposure_equipment_id} 정보를 가져올 수 없습니다.`);
                    }
                }
                equipmentInfo += `<tr><th>노광 장비</th><td>${equipment ? equipment.name : '-'}</td></tr>`;
            } else {
                equipmentInfo += `<tr><th>노광 장비</th><td>-</td></tr>`;
            }
            
            // 현상 장비 정보
            if (cachedMeasurement.development_equipment_id) {
                let equipment;
                if (equipmentsCache[cachedMeasurement.development_equipment_id]) {
                    equipment = equipmentsCache[cachedMeasurement.development_equipment_id];
                } else {
                    try {
                        equipment = await api.get(`${API_CONFIG.ENDPOINTS.EQUIPMENTS}/${cachedMeasurement.development_equipment_id}`);
                        equipmentsCache[cachedMeasurement.development_equipment_id] = equipment;
                    } catch (error) {
                        console.warn(`장비 ID ${cachedMeasurement.development_equipment_id} 정보를 가져올 수 없습니다.`);
                    }
                }
                equipmentInfo += `<tr><th>현상 장비</th><td>${equipment ? equipment.name : '-'}</td></tr>`;
            } else {
                equipmentInfo += `<tr><th>현상 장비</th><td>-</td></tr>`;
            }
            
            // SPEC 정보 가져오기
            let specInfo = '<span class="badge badge-secondary">SPEC 정보 없음</span>';
            try {
                // 캐시된 활성 SPEC 확인
                if (!window.activeSpecCache) window.activeSpecCache = {};
                
                if (!window.activeSpecCache[cachedMeasurement.target_id]) {
                    try {
                        window.activeSpecCache[cachedMeasurement.target_id] = await api.getActiveSpec(cachedMeasurement.target_id);
                    } catch (error) {
                        console.warn(`타겟 ID ${cachedMeasurement.target_id}에 대한 활성 SPEC이 없습니다.`);
                    }
                }
                
                const spec = window.activeSpecCache[cachedMeasurement.target_id];
                if (spec) {
                    specInfo = `LSL: ${spec.lsl.toFixed(3)}, USL: ${spec.usl.toFixed(3)}`;
                }
            } catch (error) {
                console.warn(`타겟 ID ${cachedMeasurement.target_id}에 대한 활성 SPEC을 가져오는 중 오류:`, error);
            }
            
            // 상세 정보 HTML 생성
            let detailHtml = `
            <div class="row">
                <div class="col-md-6">
                    <h5>기본 정보</h5>
                    <table class="table table-bordered">
                        <tr>
                            <th>날짜</th>
                            <td>${UTILS.formatDate(cachedMeasurement.created_at)}</td>
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
                            <td>${cachedMeasurement.device}</td>
                        </tr>
                        <tr>
                            <th>LOT NO</th>
                            <td>${cachedMeasurement.lot_no}</td>
                        </tr>
                        <tr>
                            <th>WAFER NO</th>
                            <td>${cachedMeasurement.wafer_no}</td>
                        </tr>
                        <tr>
                            <th>Exposure Time</th>
                            <td>${cachedMeasurement.exposure_time || '-'}</td>
                        </tr>
                        <tr>
                            <th>작성자</th>
                            <td>${cachedMeasurement.author}</td>
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
                            <td>${UTILS.formatNumber(cachedMeasurement.value_left)}</td>
                        </tr>
                        <tr>
                            <th>상</th>
                            <td>${UTILS.formatNumber(cachedMeasurement.value_top)}</td>
                        </tr>
                        <tr>
                            <th>중</th>
                            <td>${UTILS.formatNumber(cachedMeasurement.value_center)}</td>
                        </tr>
                        <tr>
                            <th>하</th>
                            <td>${UTILS.formatNumber(cachedMeasurement.value_bottom)}</td>
                        </tr>
                        <tr>
                            <th>우</th>
                            <td>${UTILS.formatNumber(cachedMeasurement.value_right)}</td>
                        </tr>
                        <tr>
                            <th>평균값</th>
                            <td>${UTILS.formatNumber(cachedMeasurement.avg_value)}</td>
                        </tr>
                        <tr>
                            <th>최소값</th>
                            <td>${UTILS.formatNumber(cachedMeasurement.min_value)}</td>
                        </tr>
                        <tr>
                            <th>최대값</th>
                            <td>${UTILS.formatNumber(cachedMeasurement.max_value)}</td>
                        </tr>
                        <tr>
                            <th>범위</th>
                            <td>${UTILS.formatNumber(cachedMeasurement.range_value)}</td>
                        </tr>
                        <tr>
                            <th>표준편차</th>
                            <td>${UTILS.formatNumber(cachedMeasurement.std_dev)}</td>
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
                <i class="fas fa-exclamation-circle mr-1"></i> 데이터를 불러오는 중 오류가 발생했습니다: ${error.message}
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

        // 상세 정보에서 수정 버튼 클릭 이벤트
        document.getElementById('edit-detail-btn').addEventListener('click', function() {
            // 상세 모달 닫기
            $('#detail-modal').modal('hide');
            
            // 측정 ID 가져오기
            const measurementId = document.querySelector('.view-detail[data-id]').dataset.id;
            
            // 수정 폼 초기화
            populateEditForm(measurementId);
        });

        // 수정 저장 버튼 클릭 이벤트
        document.getElementById('save-edit-btn').addEventListener('click', function() {
            saveEditedMeasurement();
        });

        // 상세 정보에서 삭제 버튼 클릭 이벤트
        document.getElementById('delete-detail-btn').addEventListener('click', function() {
            // 상세 모달 닫기
            $('#detail-modal').modal('hide');
            
            // 저장된 측정 ID 사용
            const measurementId = currentMeasurementId;
            
            // 삭제 확인 모달에 ID 설정
            document.getElementById('delete-measurement-id').value = measurementId;
            
            // 삭제 확인 모달 표시
            $('#delete-confirm-modal').modal('show');
        });

        // 삭제 확인 버튼 클릭 이벤트
        document.getElementById('confirm-delete-btn').addEventListener('click', function() {
            const measurementId = document.getElementById('delete-measurement-id').value;
            deleteMeasurement(measurementId);
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

// 수정 폼 채우기
async function populateEditForm(measurementId) {
    try {
        // 먼저 캐시된 데이터에서 측정 데이터 찾기
        const cachedMeasurement = measurementsCache.find(m => m.id == measurementId);
        
        if (!cachedMeasurement) {
            throw new Error('캐시된 측정 데이터를 찾을 수 없습니다.');
        }
        
        // 측정 ID 설정
        document.getElementById('edit-measurement-id').value = measurementId;
        document.getElementById('edit-target-id').value = cachedMeasurement.target_id;
        
        // 폼 필드 채우기
        document.getElementById('edit-device').value = cachedMeasurement.device;
        document.getElementById('edit-lot-no').value = cachedMeasurement.lot_no;
        document.getElementById('edit-wafer-no').value = cachedMeasurement.wafer_no;
        document.getElementById('edit-exposure-time').value = cachedMeasurement.exposure_time || '';
        document.getElementById('edit-value-top').value = cachedMeasurement.value_top;
        document.getElementById('edit-value-center').value = cachedMeasurement.value_center;
        document.getElementById('edit-value-bottom').value = cachedMeasurement.value_bottom;
        document.getElementById('edit-value-left').value = cachedMeasurement.value_left;
        document.getElementById('edit-value-right').value = cachedMeasurement.value_right;
        document.getElementById('edit-author').value = cachedMeasurement.author;
        
        // 장비 옵션 로드
        await loadEquipmentOptions();
        
        // 장비 선택
        if (cachedMeasurement.coating_equipment_id) {
            document.getElementById('edit-coating-equipment').value = cachedMeasurement.coating_equipment_id;
        }
        
        if (cachedMeasurement.exposure_equipment_id) {
            document.getElementById('edit-exposure-equipment').value = cachedMeasurement.exposure_equipment_id;
        }
        
        if (cachedMeasurement.development_equipment_id) {
            document.getElementById('edit-development-equipment').value = cachedMeasurement.development_equipment_id;
        }
        
        // 수정 모달 표시
        $('#edit-modal').modal('show');
        
    } catch (error) {
        console.error('수정 폼 초기화 실패:', error);
        alert('데이터를 불러오는 중 오류가 발생했습니다: ' + error.message);
    }
}

// 장비 옵션 로드
async function loadEquipmentOptions() {
    try {
        const equipments = await api.getEquipments();
        
        if (equipments && equipments.length > 0) {
            // 코팅 장비 (type: 코팅)
            let coatingOptions = '<option value="">선택 안함</option>';
            // 노광 장비 (type: 노광)
            let exposureOptions = '<option value="">선택 안함</option>';
            // 현상 장비 (type: 현상)
            let developmentOptions = '<option value="">선택 안함</option>';
            
            equipments.forEach(equipment => {
                const option = `<option value="${equipment.id}">${equipment.name}</option>`;
                
                if (equipment.type === '코팅') {
                    coatingOptions += option;
                } else if (equipment.type === '노광') {
                    exposureOptions += option;
                } else if (equipment.type === '현상') {
                    developmentOptions += option;
                }
            });
            
            document.getElementById('edit-coating-equipment').innerHTML = coatingOptions;
            document.getElementById('edit-exposure-equipment').innerHTML = exposureOptions;
            document.getElementById('edit-development-equipment').innerHTML = developmentOptions;
        }
    } catch (error) {
        console.error('장비 옵션 로드 실패:', error);
        throw new Error('장비 목록을 불러오는데 실패했습니다.');
    }
}

// 수정된 데이터 저장
async function saveEditedMeasurement() {
    try {
        // 폼 유효성 검사
        const form = document.getElementById('edit-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        // 측정 ID 및 타겟 ID
        const measurementId = document.getElementById('edit-measurement-id').value;
        const targetId = document.getElementById('edit-target-id').value;
        
        // 폼 데이터 수집
        const measurementData = {
            target_id: parseInt(targetId),
            device: document.getElementById('edit-device').value,
            lot_no: document.getElementById('edit-lot-no').value,
            wafer_no: document.getElementById('edit-wafer-no').value,
            exposure_time: document.getElementById('edit-exposure-time').value ? parseInt(document.getElementById('edit-exposure-time').value) : null,
            value_top: parseFloat(document.getElementById('edit-value-top').value),
            value_center: parseFloat(document.getElementById('edit-value-center').value),
            value_bottom: parseFloat(document.getElementById('edit-value-bottom').value),
            value_left: parseFloat(document.getElementById('edit-value-left').value),
            value_right: parseFloat(document.getElementById('edit-value-right').value),
            author: document.getElementById('edit-author').value
        };
        
        // 장비 ID 설정
        const coatingEquipmentId = document.getElementById('edit-coating-equipment').value;
        const exposureEquipmentId = document.getElementById('edit-exposure-equipment').value;
        const developmentEquipmentId = document.getElementById('edit-development-equipment').value;
        
        if (coatingEquipmentId) {
            measurementData.coating_equipment_id = parseInt(coatingEquipmentId);
        }
        
        if (exposureEquipmentId) {
            measurementData.exposure_equipment_id = parseInt(exposureEquipmentId);
        }
        
        if (developmentEquipmentId) {
            measurementData.development_equipment_id = parseInt(developmentEquipmentId);
        }
        
        // API 호출하여 데이터 업데이트
        const updatedMeasurement = await api.put(`${API_CONFIG.ENDPOINTS.MEASUREMENTS}/${measurementId}`, measurementData);
        
        // 모달 닫기
        $('#edit-modal').modal('hide');
        
        // 캐시 업데이트
        const index = measurementsCache.findIndex(m => m.id == measurementId);
        if (index !== -1) {
            measurementsCache[index] = updatedMeasurement;
        }
        
        // 테이블 업데이트
        updateDataTable(measurementsCache);
        
        // 성공 메시지
        alert('측정 데이터가 성공적으로 업데이트되었습니다.');
        
    } catch (error) {
        console.error('측정 데이터 업데이트 실패:', error);
        alert('데이터 업데이트 중 오류가 발생했습니다: ' + error.message);
    }
}

// 측정 데이터 삭제
async function deleteMeasurement(measurementId) {
    try {
        // 삭제 확인 모달 닫기
        $('#delete-confirm-modal').modal('hide');
        
        // 로딩 표시
        const loadingHtml = `
        <div class="position-fixed w-100 h-100" style="top: 0; left: 0; background: rgba(0, 0, 0, 0.3); z-index: 9999;">
            <div class="d-flex justify-content-center align-items-center h-100">
                <div class="spinner-border text-light" role="status">
                    <span class="sr-only">삭제 중...</span>
                </div>
            </div>
        </div>
        `;
        const loadingElement = document.createElement('div');
        loadingElement.innerHTML = loadingHtml;
        document.body.appendChild(loadingElement.firstChild);
        
        // API 호출하여 데이터 삭제
        const success = await api.delete(`${API_CONFIG.ENDPOINTS.MEASUREMENTS}/${measurementId}`);
        
        // 로딩 제거
        document.body.removeChild(document.body.lastChild);
        
        if (success) {
            // 캐시에서 삭제
            measurementsCache = measurementsCache.filter(m => m.id != measurementId);
            
            // 테이블 업데이트
            updateDataTable(measurementsCache);
            
            // 성공 메시지
            alert('측정 데이터가 성공적으로 삭제되었습니다.');
        } else {
            alert('측정 데이터 삭제에 실패했습니다.');
        }
    } catch (error) {
        console.error('측정 데이터 삭제 실패:', error);
        
        // 로딩 제거 (오류 발생 시에도)
        if (document.body.lastChild.classList && document.body.lastChild.classList.contains('position-fixed')) {
            document.body.removeChild(document.body.lastChild);
        }
        
        alert('데이터 삭제 중 오류가 발생했습니다: ' + error.message);
    }
}
})();