// 데이터 입력 페이지 모듈
(function() {
    // 전역 변수
    let selectedProductGroupId = null;
    let selectedProcessId = null;
    let selectedTargetId = null;
    let currentSpec = null;
    
    // 페이지 초기화
    async function initInputPage() {
        // 제품군 버튼 로드
        await loadProductGroups();
        
        // 장비 목록 로드
        await loadEquipments();
        
        // 이벤트 리스너 설정
        setupEventListeners();
    }
    
    // 제품군 버튼 로드
    async function loadProductGroups() {
        try {
            const productGroups = await api.getProductGroups();
            
            if (!productGroups || productGroups.length === 0) {
                document.getElementById('product-group-buttons').innerHTML = '<p class="text-danger">제품군 정보가 없습니다.</p>';
                return;
            }
            
            let buttonsHtml = '';
            productGroups.forEach(productGroup => {
                buttonsHtml += `
                <button type="button" class="btn btn-outline-primary product-group-btn" data-id="${productGroup.id}">
                    ${productGroup.name}
                </button>
                `;
            });
            
            document.getElementById('product-group-buttons').innerHTML = buttonsHtml;
            
            // 제품군 버튼 클릭 이벤트 설정
            document.querySelectorAll('.product-group-btn').forEach(button => {
                button.addEventListener('click', function() {
                    // 이전 선택 초기화
                    document.querySelectorAll('.product-group-btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    
                    // 현재 버튼 활성화
                    this.classList.add('active');
                    
                    // 선택된 제품군 ID 저장
                    selectedProductGroupId = this.dataset.id;
                    
                    // 공정 버튼 로드
                    loadProcesses(selectedProductGroupId);
                    
                    // 타겟 선택 초기화
                    document.getElementById('target-buttons').innerHTML = '<p class="text-muted">공정을 먼저 선택하세요.</p>';
                    selectedTargetId = null;
                    
                    // SPEC 정보 초기화
                    resetSpecInfo();
                });
            });
            
        } catch (error) {
            console.error('제품군 로드 실패:', error);
            document.getElementById('product-group-buttons').innerHTML = '<p class="text-danger">제품군 정보를 불러오는 중 오류가 발생했습니다.</p>';
        }
    }
    
    // 공정 버튼 로드
    async function loadProcesses(productGroupId) {
        try {
            // 버튼 영역 로딩 표시
            document.getElementById('process-buttons').innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">로딩 중...</span>
                </div>
            </div>
            `;
            
            const processes = await api.getProcesses(productGroupId);
            
            if (!processes || processes.length === 0) {
                document.getElementById('process-buttons').innerHTML = '<p class="text-danger">해당 제품군에 공정 정보가 없습니다.</p>';
                return;
            }
            
            let buttonsHtml = '';
            processes.forEach(process => {
                buttonsHtml += `
                <button type="button" class="btn btn-outline-info process-btn" data-id="${process.id}">
                    ${process.name}
                </button>
                `;
            });
            
            document.getElementById('process-buttons').innerHTML = buttonsHtml;
            
            // 공정 버튼 클릭 이벤트 설정
            document.querySelectorAll('.process-btn').forEach(button => {
                button.addEventListener('click', function() {
                    // 이전 선택 초기화
                    document.querySelectorAll('.process-btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    
                    // 현재 버튼 활성화
                    this.classList.add('active');
                    
                    // 선택된 공정 ID 저장
                    selectedProcessId = this.dataset.id;
                    
                    // 타겟 버튼 로드
                    loadTargets(selectedProcessId);
                    
                    // SPEC 정보 초기화
                    resetSpecInfo();
                });
            });
            
        } catch (error) {
            console.error('공정 로드 실패:', error);
            document.getElementById('process-buttons').innerHTML = '<p class="text-danger">공정 정보를 불러오는 중 오류가 발생했습니다.</p>';
        }
    }
    
    // 타겟 버튼 로드
    async function loadTargets(processId) {
        try {
            // 버튼 영역 로딩 표시
            document.getElementById('target-buttons').innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">로딩 중...</span>
                </div>
            </div>
            `;
            
            const targets = await api.getTargets(processId);
            
            if (!targets || targets.length === 0) {
                document.getElementById('target-buttons').innerHTML = '<p class="text-danger">해당 공정에 타겟 정보가 없습니다.</p>';
                return;
            }
            
            let buttonsHtml = '';
            targets.forEach(target => {
                buttonsHtml += `
                <button type="button" class="btn btn-outline-success target-btn" data-id="${target.id}">
                    ${target.name}
                </button>
                `;
            });
            
            document.getElementById('target-buttons').innerHTML = buttonsHtml;
            
            // 타겟 버튼 클릭 이벤트 설정
            document.querySelectorAll('.target-btn').forEach(button => {
                button.addEventListener('click', function() {
                    // 이전 선택 초기화
                    document.querySelectorAll('.target-btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    
                    // 현재 버튼 활성화
                    this.classList.add('active');
                    
                    // 선택된 타겟 ID 저장
                    selectedTargetId = this.dataset.id;
                    
                    // SPEC 정보 로드
                    loadSpecInfo(selectedTargetId);
                });
            });
            
        } catch (error) {
            console.error('타겟 로드 실패:', error);
            document.getElementById('target-buttons').innerHTML = '<p class="text-danger">타겟 정보를 불러오는 중 오류가 발생했습니다.</p>';
        }
    }
    
    // SPEC 정보 로드
    async function loadSpecInfo(targetId) {
        try {
            // SPEC 영역 로딩 표시
            document.getElementById('spec-info').innerHTML = `
            <i class="fas fa-spinner fa-spin mr-1"></i> SPEC 정보를 불러오는 중...
            `;
            
            // 활성 SPEC 정보 가져오기
            try {
                currentSpec = await api.getActiveSpec(targetId);
                
                if (currentSpec) {
                    document.getElementById('spec-info').innerHTML = `
                    <i class="fas fa-info-circle mr-1"></i> SPEC 정보: LSL = ${currentSpec.lsl.toFixed(3)}, USL = ${currentSpec.usl.toFixed(3)}
                    <br>
                    <small class="text-muted">타겟에 대한 활성 SPEC이 설정되어 있습니다. 측정값이 SPEC 범위를 벗어나면 경고가 표시됩니다.</small>
                    `;
                    document.getElementById('spec-info').classList.remove('alert-info', 'alert-danger');
                    document.getElementById('spec-info').classList.add('alert-success');
                } else {
                    document.getElementById('spec-info').innerHTML = `
                    <i class="fas fa-exclamation-triangle mr-1"></i> 이 타겟에 설정된 SPEC 정보가 없습니다.
                    <br>
                    <small class="text-muted">SPEC 설정 없이 측정 데이터를 입력할 수 있지만, SPEC 검사가 수행되지 않습니다.</small>
                    `;
                    document.getElementById('spec-info').classList.remove('alert-info', 'alert-success');
                    document.getElementById('spec-info').classList.add('alert-warning');
                    currentSpec = null;
                }
            } catch (error) {
                console.warn(`타겟 ID ${targetId}에 대한 활성 SPEC이 없습니다.`);
                document.getElementById('spec-info').innerHTML = `
                <i class="fas fa-exclamation-triangle mr-1"></i> 이 타겟에 설정된 SPEC 정보가 없습니다.
                <br>
                <small class="text-muted">SPEC 설정 없이 측정 데이터를 입력할 수 있지만, SPEC 검사가 수행되지 않습니다.</small>
                `;
                document.getElementById('spec-info').classList.remove('alert-info', 'alert-success');
                document.getElementById('spec-info').classList.add('alert-warning');
                currentSpec = null;
            }
            
        } catch (error) {
            console.error('SPEC 정보 로드 실패:', error);
            document.getElementById('spec-info').innerHTML = `
            <i class="fas fa-exclamation-circle mr-1"></i> SPEC 정보를 불러오는 중 오류가 발생했습니다.
            `;
            document.getElementById('spec-info').classList.remove('alert-info', 'alert-success', 'alert-warning');
            document.getElementById('spec-info').classList.add('alert-danger');
            currentSpec = null;
        }
    }
    
    // SPEC 정보 초기화
    function resetSpecInfo() {
        document.getElementById('spec-info').innerHTML = `
        <i class="fas fa-info-circle mr-1"></i> 제품군, 공정, 타겟을 선택하면 SPEC 정보가 표시됩니다.
        `;
        document.getElementById('spec-info').classList.remove('alert-success', 'alert-danger', 'alert-warning');
        document.getElementById('spec-info').classList.add('alert-info');
        currentSpec = null;
    }
    
    // 장비 목록 로드
    async function loadEquipments() {
        try {
            const equipments = await api.getEquipments();
            
            if (!equipments || equipments.length === 0) {
                return;
            }
            
            // 코팅 장비 버튼 생성
            const coatingEquipments = equipments.filter(eq => eq.type === '코팅');
            let coatingButtonsHtml = '';
            coatingEquipments.forEach(equipment => {
                coatingButtonsHtml += `
                <button type="button" class="btn btn-outline-primary equipment-btn mr-2 mb-2" 
                        data-type="coating" 
                        data-id="${equipment.id}">
                    ${equipment.name}
                </button>
                `;
            });
            document.getElementById('coating-equipment-buttons').innerHTML = coatingButtonsHtml;
            
            // 노광 장비 버튼 생성 (유사한 로직)
            const exposureEquipments = equipments.filter(eq => eq.type === '노광');
            let exposureButtonsHtml = '';
            exposureEquipments.forEach(equipment => {
                exposureButtonsHtml += `
                <button type="button" class="btn btn-outline-primary equipment-btn mr-2 mb-2" 
                        data-type="exposure" 
                        data-id="${equipment.id}">
                    ${equipment.name}
                </button>
                `;
            });
            document.getElementById('exposure-equipment-buttons').innerHTML = exposureButtonsHtml;
            
            // 현상 장비 버튼 생성 (유사한 로직)
            const developmentEquipments = equipments.filter(eq => eq.type === '현상');
            let developmentButtonsHtml = '';
            developmentEquipments.forEach(equipment => {
                developmentButtonsHtml += `
                <button type="button" class="btn btn-outline-primary equipment-btn mr-2 mb-2" 
                        data-type="development" 
                        data-id="${equipment.id}">
                    ${equipment.name}
                </button>
                `;
            });
            document.getElementById('development-equipment-buttons').innerHTML = developmentButtonsHtml;
            
            // 장비 버튼 클릭 이벤트 추가
            document.querySelectorAll('.equipment-btn').forEach(button => {
                button.addEventListener('click', function() {
                    // 같은 타입의 다른 버튼들 비활성화
                    const type = this.dataset.type;
                    document.querySelectorAll(`.equipment-btn[data-type="${type}"]`).forEach(btn => {
                        btn.classList.remove('active');
                    });
                    
                    // 현재 버튼 활성화
                    this.classList.add('active');
                    
                    // 해당 타입의 hidden input에 ID 설정
                    document.getElementById(`${type}-equipment`).value = this.dataset.id;
                });
            });
        
        } catch (error) {
            console.error('장비 목록 로드 실패:', error);
        }
    }
    
    // 측정값 검사
    function validateMeasurementValues() {
        if (!currentSpec) {
            return true; // SPEC이 없으면 검사를 건너뜀
        }
        
        const valueInputs = document.querySelectorAll('.measurement-value');
        let allValid = true;
        
        valueInputs.forEach(input => {
            const value = parseFloat(input.value);
            
            // 값이 SPEC 범위를 벗어나는지 확인
            if (value < currentSpec.lsl || value > currentSpec.usl) {
                input.classList.add('is-invalid');
                
                // 기존 피드백 제거
                const nextSibling = input.nextElementSibling;
                if (nextSibling && nextSibling.classList.contains('invalid-feedback')) {
                    nextSibling.remove();
                }
                
                // 오류 메시지 추가
                const feedback = document.createElement('div');
                feedback.classList.add('invalid-feedback');
                feedback.textContent = `SPEC 범위(${currentSpec.lsl.toFixed(3)} ~ ${currentSpec.usl.toFixed(3)})를 벗어났습니다.`;
                input.parentNode.appendChild(feedback);
                
                allValid = false;
            } else {
                input.classList.remove('is-invalid');
                
                // 기존 피드백 제거
                const nextSibling = input.nextElementSibling;
                if (nextSibling && nextSibling.classList.contains('invalid-feedback')) {
                    nextSibling.remove();
                }
            }
        });
        
        return allValid;
    }
    
    // 이벤트 리스너 설정
    function setupEventListeners() {
        // 폼 제출 이벤트 핸들러 수정 (세 가지 장비 ID를 올바르게 처리)
    document.getElementById('measurement-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // 모든 필수 입력 항목 확인
        if (!selectedTargetId) {
            alert('제품군, 공정, 타겟을 선택해주세요.');
            return;
        }
        
        // 측정값 검사
        if (!validateMeasurementValues()) {
            if (!confirm('측정값이 SPEC 범위를 벗어났습니다. 계속 진행하시겠습니까?')) {
                return;
            }
        }
        
        // 폼 데이터 수집
        const formData = {
            target_id: selectedTargetId,
            // 각 장비별로 ID 설정
            coating_equipment_id: document.getElementById('coating-equipment').value || null,
            exposure_equipment_id: document.getElementById('exposure-equipment').value || null,
            development_equipment_id: document.getElementById('development-equipment').value || null,
            device: document.getElementById('device').value,
            lot_no: document.getElementById('lot-no').value,
            wafer_no: document.getElementById('wafer-no').value,
            exposure_time: document.getElementById('exposure-time').value || null,
            value_top: parseFloat(document.getElementById('value-top').value),
            value_center: parseFloat(document.getElementById('value-center').value),
            value_bottom: parseFloat(document.getElementById('value-bottom').value),
            value_left: parseFloat(document.getElementById('value-left').value),
            value_right: parseFloat(document.getElementById('value-right').value),
            author: document.getElementById('author').value
        };
        
        try {
            // 제출 버튼 비활성화
            const submitBtn = document.getElementById('submit-btn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> 저장 중...';
            
            // API 호출
            const result = await api.createMeasurement(formData);
            
            // 성공 메시지
            alert('측정 데이터가 성공적으로 저장되었습니다.');
            
            // 폼 초기화
            document.getElementById('measurement-form').reset();
            
            // 제출 버튼 활성화
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save mr-1"></i> 저장';
            
        } catch (error) {
            console.error('측정 데이터 저장 실패:', error);
            alert('측정 데이터 저장 중 오류가 발생했습니다.');
            
            // 제출 버튼 활성화
            const submitBtn = document.getElementById('submit-btn');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save mr-1"></i> 저장';
        }
    });
        
        // 측정값 입력 이벤트
        document.querySelectorAll('.measurement-value').forEach(input => {
            input.addEventListener('input', function() {
                // SPEC 검사 수행
                if (currentSpec) {
                    const value = parseFloat(this.value);
                    
                    if (isNaN(value)) {
                        this.classList.remove('is-invalid', 'is-valid');
                        return;
                    }
                    
                    if (value < currentSpec.lsl || value > currentSpec.usl) {
                        this.classList.remove('is-valid');
                        this.classList.add('is-invalid');
                    } else {
                        this.classList.remove('is-invalid');
                        this.classList.add('is-valid');
                    }
                }
            });
        });
    }
    
    // 페이지 로드 시 초기화
    document.addEventListener('DOMContentLoaded', initInputPage);
})();