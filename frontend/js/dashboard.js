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

    // 알림 대시보드 로드
    loadNotificationsDashboard();
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

// 기존 loadCpkHeatmap 함수를 아래 코드로 교체
async function loadCpkHeatmap() {
    try {
        // 히트맵 기간 설정 (백엔드 기본값과 일치시킴)
        const heatmapDays = 14;
        
        // 히트맵 기간 표시 업데이트
        document.getElementById('cpk-heatmap-period').textContent = `(최근 ${heatmapDays}일)`;

        // 로딩 표시
        document.getElementById('cpk-heatmap-container').innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border text-primary" role="status">
                <span class="sr-only">로딩 중...</span>
            </div>
            <p class="mt-2">히트맵 데이터 로드 중...</p>
        </div>
        `;
        
        // 히트맵 데이터 초기화
        cpkHeatmapData = [];
        
        // 제품군 목록 한 번에 가져오기 
        const productGroups = await api.getProductGroups();
        
        // 모든 공정 정보 병렬로 가져오기
        const processPromises = productGroups.map(productGroup => 
            api.getProcesses(productGroup.id).then(processes => 
                ({ productGroup, processes })
            )
        );
        
        const processResults = await Promise.all(processPromises);
        
        // 모든 타겟 정보 병렬로 가져오기 
        const targetPromises = [];
        processResults.forEach(result => {
            result.processes.forEach(process => {
                targetPromises.push(
                    api.getTargets(process.id).then(targets => 
                        ({ 
                            productGroup: result.productGroup, 
                            process, 
                            targets 
                        })
                    )
                );
            });
        });
        
        const targetResults = await Promise.all(targetPromises);
        
        // 각 타겟에 대한 통계 정보 한 번에 요청 (병렬 처리)
        const statisticsPromises = [];
        const targetMap = {};  // 타겟 ID를 키로 하는 맵 (통계 결과와 연결하기 위함)
        
        targetResults.forEach(result => {
            result.targets.forEach(target => {
                // 통계 정보 가져오기 (비동기)
                statisticsPromises.push(
                    api.getTargetStatistics(target.id)
                        .then(stats => ({ targetId: target.id, stats }))
                        .catch(error => {
                            console.warn(`타겟 ${target.id}에 대한 통계 정보를 가져올 수 없습니다.`, error);
                            return { targetId: target.id, stats: null };
                        })
                );
                
                // 타겟 정보 맵에 저장
                targetMap[target.id] = {
                    productGroup: result.productGroup,
                    process: result.process,
                    target
                };
            });
        });
        
        // 모든 통계 정보 요청을 병렬로 처리하고 결과 받기
        const statisticsResults = await Promise.all(statisticsPromises);
        
        // 모든 데이터를 결합하여 히트맵 데이터 생성
        statisticsResults.forEach(({ targetId, stats }) => {
            const targetInfo = targetMap[targetId];
            if (!targetInfo) return;
            
            // 공정능력지수 추출
            let cpk = null;
            if (stats && stats.process_capability && stats.process_capability.cpk !== undefined) {
                cpk = stats.process_capability.cpk;
            }
            
            // 히트맵 데이터에 추가
            cpkHeatmapData.push({
                productGroup: targetInfo.productGroup.name,
                process: targetInfo.process.name,
                target: targetInfo.target.name,
                cpk: cpk,
                targetId: targetId
            });
        });
        
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
    
    // DocumentFragment 생성 (메모리에서만 존재하는 DOM 조각)
    const fragment = document.createDocumentFragment();
    
    // 최상위 row 생성
    const rowDiv = document.createElement('div');
    rowDiv.className = 'row';
    fragment.appendChild(rowDiv);
    
    // 왼쪽 영역 (타겟 수가 많은 IC)
    const leftCol = document.createElement('div');
    leftCol.className = 'col-md-9';
    rowDiv.appendChild(leftCol);
    
    const leftRowDiv = document.createElement('div');
    leftRowDiv.className = 'row';
    leftCol.appendChild(leftRowDiv);
    
    // 타겟 수가 많은 IC들의 카드 생성
    largeICs.forEach(ic => {
        const colDiv = document.createElement('div');
        colDiv.className = 'col-md-6 mb-2';
        
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card card-outline card-primary h-100';
        colDiv.appendChild(cardDiv);
        
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header py-1';
        cardDiv.appendChild(cardHeader);
        
        const cardTitle = document.createElement('h3');
        cardTitle.className = 'card-title font-weight-bold';
        cardTitle.textContent = ic;
        cardHeader.appendChild(cardTitle);
        
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body p-0';
        cardDiv.appendChild(cardBody);
        
        const treemapContainer = document.createElement('div');
        treemapContainer.className = 'treemap-container';
        cardBody.appendChild(treemapContainer);
        
        // 각 공정별 블록 생성
        Object.keys(groupedByIC[ic]).forEach(process => {
            const targets = groupedByIC[ic][process];
            
            const processBlock = document.createElement('div');
            processBlock.className = 'process-block';
            treemapContainer.appendChild(processBlock);
            
            const processHeader = document.createElement('div');
            processHeader.className = 'process-header';
            processBlock.appendChild(processHeader);
            
            const processName = document.createElement('span');
            processName.className = 'font-weight-bold';
            processName.textContent = process;
            processHeader.appendChild(processName);
            
            const targetContainer = document.createElement('div');
            targetContainer.className = 'target-container';
            processBlock.appendChild(targetContainer);
            
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
                
                const targetBlock = document.createElement('div');
                targetBlock.className = 'target-block';
                targetBlock.style.backgroundColor = bgColor;
                targetBlock.style.cursor = 'pointer'; // 커서를 포인터로 변경
                targetBlock.dataset.targetId = item.targetId; // 데이터 속성으로 타겟 ID 저장
                targetBlock.addEventListener('click', function() {
                    navigateToSpcPage(item.targetId, item.productGroup, item.process, item.target);
                });
                targetContainer.appendChild(targetBlock);
                
                const targetValue = document.createElement('div');
                targetValue.className = 'target-value';
                targetValue.style.color = textColor;
                targetValue.textContent = item.target;
                targetBlock.appendChild(targetValue);
                
                const cpkValue = document.createElement('div');
                cpkValue.className = 'cpk-value';
                cpkValue.style.color = textColor;
                cpkValue.textContent = item.cpk !== null ? item.cpk.toFixed(3) : '-';
                targetBlock.appendChild(cpkValue);
                
                const statusBadge = document.createElement('div');
                statusBadge.className = 'status-badge';
                statusBadge.style.color = textColor;
                statusBadge.textContent = status;
                targetBlock.appendChild(statusBadge);
            });
        });
        
        leftRowDiv.appendChild(colDiv);
    });
    
    // 오른쪽 영역 (타겟 수가 적은 IC)
    const rightCol = document.createElement('div');
    rightCol.className = 'col-md-3';
    rowDiv.appendChild(rightCol);
    
    // 타겟 수가 적은 IC들의 카드 생성 (세로로 배치)
    smallICs.forEach(ic => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card card-outline card-secondary mb-2';
        rightCol.appendChild(cardDiv);
        
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header py-1 bg-light';
        cardDiv.appendChild(cardHeader);
        
        const cardTitle = document.createElement('h3');
        cardTitle.className = 'card-title font-weight-bold';
        cardTitle.textContent = ic;
        cardHeader.appendChild(cardTitle);
        
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body p-0';
        cardDiv.appendChild(cardBody);
        
        const treemapContainer = document.createElement('div');
        treemapContainer.className = 'small-treemap-container';
        cardBody.appendChild(treemapContainer);
        
        // 각 공정별 블록 생성 (작은 영역)
        Object.keys(groupedByIC[ic]).forEach(process => {
            const targets = groupedByIC[ic][process];
            
            const processBlock = document.createElement('div');
            processBlock.className = 'small-process-block';
            treemapContainer.appendChild(processBlock);
            
            const processHeader = document.createElement('div');
            processHeader.className = 'small-process-header';
            processBlock.appendChild(processHeader);
            
            const processName = document.createElement('span');
            processName.className = 'font-weight-bold';
            processName.textContent = process;
            processHeader.appendChild(processName);
            
            const targetContainer = document.createElement('div');
            targetContainer.className = 'small-target-container';
            processBlock.appendChild(targetContainer);
            
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
                
                const targetBlock = document.createElement('div');
                targetBlock.className = 'small-target-block';
                targetBlock.style.backgroundColor = bgColor;
                targetBlock.style.cursor = 'pointer'; // 커서를 포인터로 변경
                targetBlock.dataset.targetId = item.targetId; // 데이터 속성으로 타겟 ID 저장
                targetBlock.addEventListener('click', function() {
                    navigateToSpcPage(item.targetId, item.productGroup, item.process, item.target);
                });
                targetContainer.appendChild(targetBlock);
                
                const targetValue = document.createElement('div');
                targetValue.className = 'small-target-value';
                targetValue.style.color = textColor;
                targetValue.textContent = item.target;
                targetBlock.appendChild(targetValue);
                
                const cpkValue = document.createElement('div');
                cpkValue.className = 'small-cpk-value';
                cpkValue.style.color = textColor;
                cpkValue.textContent = item.cpk !== null ? item.cpk.toFixed(3) : '-';
                targetBlock.appendChild(cpkValue);
            });
        });
    });
    
    // 기존 내용 지우고 새로운 내용 추가
    const container = document.getElementById('cpk-heatmap-container');
    container.innerHTML = '';
    container.appendChild(fragment);
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

function navigateToSpcPage(targetId, productGroup, process, targetName) {
    // URL 인코딩
    const params = new URLSearchParams();
    params.set('targetId', targetId);
    params.set('productGroup', encodeURIComponent(productGroup));
    params.set('process', encodeURIComponent(process));
    params.set('targetName', encodeURIComponent(targetName));
    
    // SPC 분석 페이지로 이동 (URL 파라미터 사용)
    window.location.href = `pages/analysis/spc.html?${params.toString()}`;
}

// 알림 대시보드 관련 함수들
async function loadNotificationsDashboard() {
    try {
        // 알림 컨테이너
        const container = document.getElementById('notifications-dashboard-container');
        
        // 로딩 표시
        container.innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border text-primary" role="status">
                <span class="sr-only">로딩 중...</span>
            </div>
            <p class="mt-2">알림 데이터 로드 중...</p>
        </div>
        `;
        
        // 알림 데이터 가져오기 (읽지 않은 알림만)
        const notifications = await api.get(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS}`, { 
            limit: 15,
            include_read: false  // 읽지 않은 알림만 포함하도록 변경
        });
        
        // 알림이 없는 경우
        if (!notifications || notifications.length === 0) {
            container.innerHTML = `
            <div class="text-center py-3">
                <i class="fas fa-check-circle text-success fa-3x mb-3"></i>
                <p class="text-muted">현재 표시할 알림이 없습니다.</p>
            </div>
            `;
            return;
        }
        
        // 알림 컨텐츠 생성
        html = '<div class="list-group">';
        
        // 알림 타입별 아이콘 및 색상 설정
        const typeIcons = {
            'alert': { icon: 'exclamation-circle', color: 'danger' },
            'warning': { icon: 'exclamation-triangle', color: 'warning' },
            'info': { icon: 'info-circle', color: 'info' }
        };
        
        // 각 알림에 대한 리스트 아이템 생성
        notifications.forEach(notification => {
            const { icon, color } = typeIcons[notification.type] || typeIcons.info;
            const formattedDate = new Date(notification.created_at).toLocaleString();
            
            // SPC 규칙 위반 알림 확인 (제목에 'SPC 규칙 위반'이 포함된 경우)
            const isSpcViolation = notification.title.includes('SPC 규칙 위반');
            
            html += `
            <div class="list-group-item list-group-item-action d-flex align-items-start ${notification.is_read ? 'bg-light' : ''}">
                <div class="d-flex w-100 flex-column">
                    <div class="d-flex justify-content-between mb-1">
                        <h5 class="mb-0 text-${color}">
                            <i class="fas fa-${icon} mr-1"></i> 
                            ${notification.title}
                        </h5>
                        <small class="text-muted">${formattedDate}</small>
                    </div>
                    <div class="mb-2">
                        <p class="mb-0">${notification.message.length > 150 ? notification.message.substring(0, 150) + '...' : notification.message}</p>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        ${!notification.is_read ? `
                        <button class="btn btn-sm btn-outline-success mark-read-inline-btn" data-id="${notification.id}">
                            <i class="fas fa-check-circle mr-1"></i> 읽음으로 표시
                        </button>
                        ` : `<span class="badge badge-light"><i class="fas fa-check mr-1"></i> 읽음</span>`}
                        
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-secondary view-notification-btn" data-id="${notification.id}">
                                <i class="fas fa-eye mr-1"></i> 상세 보기
                            </button>
                            ${isSpcViolation && notification.target_id ? `
                            <button class="btn btn-sm btn-outline-primary go-to-spc-btn" data-target-id="${notification.target_id}">
                                <i class="fas fa-chart-line mr-1"></i> SPC 분석
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
            `;
        });
        
        html += '</div>';
        
        // 컨테이너에 내용 추가
        container.innerHTML = html;
        
        // 이벤트 리스너 추가
        setupNotificationDashboardListeners();
        
    } catch (error) {
        console.error('알림 대시보드 로드 실패:', error);
        document.getElementById('notifications-dashboard-container').innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-circle mr-1"></i> 알림 데이터를 불러오는 중 오류가 발생했습니다.
        </div>
        `;
    }
}

// 이벤트 리스너 추가
function setupNotificationDashboardListeners() {
    // setupNotificationDashboardListeners 함수 내 추가
    // 인라인 읽음 표시 버튼
    document.querySelectorAll('.mark-read-inline-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation(); // 클릭 이벤트 전파 방지
            
            const notificationId = this.dataset.id;
            try {
                // 버튼 비활성화 및 로딩 상태 표시
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> 처리 중...';
                
                // API 호출로 읽음 표시
                await api.markNotificationAsRead(notificationId);
                
                // 알림 대시보드 새로고침
                loadNotificationsDashboard();
            } catch (error) {
                console.error('알림 읽음 표시 실패:', error);
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i> 오류 발생';
                
                // 실패 안내
                alert('알림을 읽음으로 표시하는 중 오류가 발생했습니다. 다시 시도해주세요.');
            }
        });
    });
    // 상세 보기 버튼
    document.querySelectorAll('.view-notification-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const notificationId = this.dataset.id;
            try {
                const notification = await api.get(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS}/${notificationId}`);
                showNotificationDetailModal(notification);
            } catch (error) {
                console.error('알림 상세 정보 로드 실패:', error);
            }
        });
    });
    
    // SPC 분석 버튼
    document.querySelectorAll('.go-to-spc-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const targetId = this.dataset.targetId;
            try {
                // 버튼 상태 업데이트
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> 로딩 중...';
                
                // 타겟 정보 가져오기
                const target = await api.get(`${API_CONFIG.ENDPOINTS.TARGETS}/${targetId}`);
                // 공정 정보 가져오기
                const process = await api.get(`${API_CONFIG.ENDPOINTS.PROCESSES}/${target.process_id}`);
                // 제품군 정보 가져오기
                const productGroup = await api.get(`${API_CONFIG.ENDPOINTS.PRODUCT_GROUPS}/${process.product_group_id}`);
                
                // URL 파라미터로 정보 전달
                const params = new URLSearchParams();
                params.set('targetId', targetId);
                params.set('productGroup', encodeURIComponent(productGroup.name));
                params.set('process', encodeURIComponent(process.name));
                params.set('targetName', encodeURIComponent(target.name));
                
                // SPC 분석 페이지로 이동
                window.location.href = `pages/analysis/spc.html?${params.toString()}`;
                
            } catch (error) {
                console.error('타겟 정보 로드 실패:', error);
                // 버튼 상태 복원
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-chart-line mr-1"></i> SPC 분석';
                alert('SPC 분석 페이지로 이동하는 중 오류가 발생했습니다.');
            }
        });
    });
}

// 알림 상세 정보 모달 표시
function showNotificationDetailModal(notification) {
    // 기존 모달 제거
    const existingModal = document.getElementById('notification-detail-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 알림 타입별 색상 설정
    const typeColors = {
        'alert': 'danger',
        'warning': 'warning',
        'info': 'info'
    };
    
    const color = typeColors[notification.type] || 'info';
    const formattedDate = new Date(notification.created_at).toLocaleString();
    const formattedMessage = notification.message.replace(/\n/g, '<br>');
    
    // SPC 규칙 위반 알림 확인
    const isSpcViolation = notification.title.includes('SPC 규칙 위반');
    
    // 모달 HTML 생성 부분 수정
    const modalHtml = `
    <div class="modal fade" id="notification-detail-modal" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header bg-${color} text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-${notification.type === 'alert' ? 'exclamation-circle' : 
                                    notification.type === 'warning' ? 'exclamation-triangle' : 
                                    'info-circle'} mr-1"></i>
                        ${notification.title}
                    </h5>
                    <button type="button" class="close text-white" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <p>${formattedMessage}</p>
                    <hr>
                    <small class="text-muted">
                        <i class="far fa-clock mr-1"></i> ${formattedDate}
                    </small>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">닫기</button>
                    ${!notification.is_read ? `
                    <button type="button" class="btn btn-success" id="modal-mark-read-btn" data-id="${notification.id}">
                        <i class="fas fa-check-circle mr-1"></i> 읽음으로 표시
                    </button>
                    ` : ''}
                    ${isSpcViolation && notification.target_id ? `
                    <button type="button" class="btn btn-primary" id="modal-go-to-spc-btn" data-target-id="${notification.target_id}">
                        <i class="fas fa-chart-line mr-1"></i> SPC 분석 페이지로 이동
                    </button>
                    ` : ''}
                </div>
            </div>
        </div>
    </div>
    `;
    
    // 모달을 body에 추가
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 모달 표시
    $('#notification-detail-modal').modal('show');
    
    // 읽음 표시 버튼 이벤트 리스너 부분 수정
    const markReadBtn = document.getElementById('modal-mark-read-btn');
    if (markReadBtn) {
        markReadBtn.addEventListener('click', async function() {
            try {
                const notificationId = this.dataset.id;
                
                // 버튼 비활성화 및 로딩 상태 표시
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> 처리 중...';
                
                // API 호출로 읽음 표시
                await api.markNotificationAsRead(notificationId);
                
                // 버튼 상태 업데이트
                this.classList.remove('btn-success');
                this.classList.add('btn-secondary');
                this.innerHTML = '<i class="fas fa-check mr-1"></i> 읽음 처리됨';
                
                // 알림 대시보드 새로고침
                loadNotificationsDashboard();
                
                // 잠시 후 모달 닫기 (사용자에게 피드백 보여주기 위해 지연)
                setTimeout(() => {
                    $('#notification-detail-modal').modal('hide');
                }, 1000);
            } catch (error) {
                console.error('알림 읽음 표시 실패:', error);
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i> 오류 발생 - 재시도';
            }
        });
    }
    
    // SPC 분석 페이지로 이동 버튼 이벤트 리스너
    const goToSpcBtn = document.getElementById('modal-go-to-spc-btn');
    if (goToSpcBtn) {
        goToSpcBtn.addEventListener('click', async function() {
            const targetId = this.dataset.targetId;
            try {
                // 타겟 정보 가져오기
                const target = await api.get(`${API_CONFIG.ENDPOINTS.TARGETS}/${targetId}`);
                // 공정 정보 가져오기
                const process = await api.get(`${API_CONFIG.ENDPOINTS.PROCESSES}/${target.process_id}`);
                // 제품군 정보 가져오기
                const productGroup = await api.get(`${API_CONFIG.ENDPOINTS.PRODUCT_GROUPS}/${process.product_group_id}`);
                
                // SPC 분석 페이지로 이동하기 위한 정보 저장
                const targetInfo = {
                    targetId: targetId,
                    productGroup: productGroup.name,
                    process: process.name,
                    targetName: target.name
                };
                
                localStorage.setItem('selected_target_for_spc', JSON.stringify(targetInfo));
                
                // 모달 닫기
                $('#notification-detail-modal').modal('hide');
                
                // SPC 분석 페이지로 이동
                window.location.href = 'pages/analysis/spc.html';
            } catch (error) {
                console.error('타겟 정보 로드 실패:', error);
                alert('SPC 분석 페이지로 이동하는 중 오류가 발생했습니다.');
            }
        });
    }
}

// 페이지 로드 시 대시보드 초기화
document.addEventListener('DOMContentLoaded', initDashboard);