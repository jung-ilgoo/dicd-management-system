// 보고서 수신자 관리 JavaScript

// 수신자 데이터 관리 객체
class RecipientManager {
    constructor() {
        this.recipients = [];
        this.loadFromLocalStorage();
    }
    
    // 로컬 스토리지에서 수신자 목록 불러오기
    loadFromLocalStorage() {
        const savedRecipients = localStorage.getItem('report_recipients');
        if (savedRecipients) {
            try {
                this.recipients = JSON.parse(savedRecipients);
            } catch (e) {
                console.error('로컬 스토리지에서 수신자 목록 불러오기 오류:', e);
                this.recipients = [];
            }
        }
    }
    
    // 로컬 스토리지에 수신자 목록 저장
    saveToLocalStorage() {
        localStorage.setItem('report_recipients', JSON.stringify(this.recipients));
    }
    
    // 수신자 추가
    addRecipient(email) {
        // 이메일 형식 검증
        if (!this.validateEmail(email)) {
            return {
                success: false,
                message: '올바른 이메일 형식이 아닙니다.'
            };
        }
        
        // 중복 검사
        if (this.recipients.some(r => r.email.toLowerCase() === email.toLowerCase())) {
            return {
                success: false,
                message: '이미 등록된 이메일 주소입니다.'
            };
        }
        
        // 새 수신자 추가
        const newRecipient = {
            id: Date.now(), // 임시 ID로 타임스탬프 사용
            email: email,
            active: true,
            created_at: new Date().toISOString()
        };
        
        this.recipients.push(newRecipient);
        this.saveToLocalStorage();
        
        return {
            success: true,
            recipient: newRecipient
        };
    }
    
    // 수신자 상태 변경 (활성화/비활성화)
    toggleRecipientStatus(id) {
        const recipient = this.recipients.find(r => r.id === id);
        if (recipient) {
            recipient.active = !recipient.active;
            this.saveToLocalStorage();
            return {
                success: true,
                active: recipient.active
            };
        }
        
        return {
            success: false,
            message: '해당 수신자를 찾을 수 없습니다.'
        };
    }
    
    // 수신자 삭제
    removeRecipient(id) {
        const initialLength = this.recipients.length;
        this.recipients = this.recipients.filter(r => r.id !== id);
        
        if (initialLength !== this.recipients.length) {
            this.saveToLocalStorage();
            return {
                success: true
            };
        }
        
        return {
            success: false,
            message: '해당 수신자를 찾을 수 없습니다.'
        };
    }
    
    // 이메일 주소 형식 검증
    validateEmail(email) {
        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return regex.test(email);
    }
    
    // 모든 수신자 가져오기
    getAllRecipients() {
        return [...this.recipients];
    }
    
    // 활성화된 수신자만 가져오기
    getActiveRecipients() {
        return this.recipients.filter(r => r.active);
    }
}

// 보고서 설정 관리 객체
class ReportSettingsManager {
    constructor() {
        this.settings = {
            weekly: {
                day: 5, // 금요일
                time: 9, // 오전 9시
                subject: '[DICD측정관리시스템] {date} 주간 보고서',
                active: true
            },
            monthly: {
                date: 5, // 매월 5일
                time: 9, // 오전 9시
                subject: '[DICD측정관리시스템] {date} 월간 보고서',
                active: true
            }
        };
        
        this.loadFromLocalStorage();
    }
    
    // 로컬 스토리지에서 설정 불러오기
    loadFromLocalStorage() {
        const savedSettings = localStorage.getItem('report_settings');
        if (savedSettings) {
            try {
                this.settings = JSON.parse(savedSettings);
            } catch (e) {
                console.error('로컬 스토리지에서 보고서 설정 불러오기 오류:', e);
            }
        }
    }
    
    // 로컬 스토리지에 설정 저장
    saveToLocalStorage() {
        localStorage.setItem('report_settings', JSON.stringify(this.settings));
    }
    
    // 설정 업데이트
    updateSettings(type, settings) {
        if (type !== 'weekly' && type !== 'monthly') {
            return {
                success: false,
                message: '잘못된 보고서 유형입니다.'
            };
        }
        
        this.settings[type] = {
            ...this.settings[type],
            ...settings
        };
        
        this.saveToLocalStorage();
        
        return {
            success: true,
            settings: this.settings[type]
        };
    }
    
    // 설정 가져오기
    getSettings(type) {
        if (type && (type === 'weekly' || type === 'monthly')) {
            return this.settings[type];
        }
        
        return this.settings;
    }
    
    // 여기에 새 메서드 추가
    format_subject(template, date, type) {
        // 날짜 형식 지정
        const dateStr = date.toLocaleDateString('ko-KR', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        });
        
        // {date} 플레이스홀더 대체
        let subject = template.replace('{date}', dateStr);
        
        // {type} 플레이스홀더가 있으면 대체
        if (subject.includes('{type}')) {
            const typeStr = type === 'weekly' ? '주간' : '월간';
            subject = subject.replace('{type}', typeStr);
        }
        
        return subject;
    }
}

// 보고서 전송 이력 관리 객체
class ReportHistoryManager {
    constructor() {
        this.history = [];
        this.loadFromLocalStorage();
    }
    
    // 로컬 스토리지에서 이력 불러오기
    loadFromLocalStorage() {
        const savedHistory = localStorage.getItem('report_history');
        if (savedHistory) {
            try {
                this.history = JSON.parse(savedHistory);
            } catch (e) {
                console.error('로컬 스토리지에서 보고서 이력 불러오기 오류:', e);
                this.history = [];
            }
        }
    }
    
    // 로컬 스토리지에 이력 저장
    saveToLocalStorage() {
        localStorage.setItem('report_history', JSON.stringify(this.history));
    }
    
    // 이력 추가
    addHistory(type, recipientCount, status) {
        const newEntry = {
            id: Date.now(),
            date: new Date().toISOString(),
            type: type,
            recipientCount: recipientCount,
            status: status
        };
        
        this.history.unshift(newEntry); // 최신 항목을 맨 앞에 추가
        
        // 최대 20개의 이력만 유지
        if (this.history.length > 20) {
            this.history = this.history.slice(0, 20);
        }
        
        this.saveToLocalStorage();
        
        return {
            success: true,
            entry: newEntry
        };
    }
    
    // 모든 이력 가져오기
    getAllHistory() {
        return [...this.history];
    }
    
    // 이력 초기화
    clearHistory() {
        this.history = [];
        this.saveToLocalStorage();
        return {
            success: true
        };
    }
}

// 전역 객체 인스턴스
const recipientManager = new RecipientManager();
const reportSettingsManager = new ReportSettingsManager();
const reportHistoryManager = new ReportHistoryManager();

// 페이지 로드 시 초기화
$(document).ready(function() {
    // UI 초기화
    initializeUI();
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    // 데이터 로드
    loadData();
});

// UI 초기화
function initializeUI() {
    // 주간 보고서 설정 초기화
    const weeklySettings = reportSettingsManager.getSettings('weekly');
    $('#weekly-report-day').val(weeklySettings.day);
    $('#weekly-report-time').val(weeklySettings.time);
    $('#weekly-report-subject').val(weeklySettings.subject);
    $('#weekly-report-active').prop('checked', weeklySettings.active);
    
    // 월간 보고서 설정 초기화
    const monthlySettings = reportSettingsManager.getSettings('monthly');
    $('#monthly-report-date').val(monthlySettings.date);
    $('#monthly-report-time').val(monthlySettings.time);
    $('#monthly-report-subject').val(monthlySettings.subject);
    $('#monthly-report-active').prop('checked', monthlySettings.active);
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 수신자 추가 버튼 클릭
    $('#add-recipient-btn').on('click', function() {
        addRecipient();
    });
    
    // 수신자 이메일 입력 필드에서 엔터 키 처리
    $('#new-recipient-email').on('keypress', function(e) {
        if (e.which === 13) { // 엔터 키
            e.preventDefault();
            addRecipient();
        }
    });
    
    // 주간 보고서 설정 저장 버튼 클릭
    $('#save-weekly-settings').on('click', function() {
        saveWeeklySettings();
    });
    
    // 월간 보고서 설정 저장 버튼 클릭
    $('#save-monthly-settings').on('click', function() {
        saveMonthlySettings();
    });
    
    // 테스트 보고서 전송 버튼 클릭
    $('#send-test-report-btn').on('click', function() {
        prepareTestReportModal();
    });
    
    // 테스트 보고서 전송 확인 버튼 클릭
    $('#send-test-report-confirm').on('click', function() {
        sendTestReport();
    });
    
    // 이력 새로고침 버튼 클릭
    $('#refresh-history-btn').on('click', function() {
        refreshHistory();
    });
}

// 데이터 로드
function loadData() {
    // 수신자 목록 로드
    loadRecipients();
    
    // 보고서 이력 로드
    loadReportHistory();
    
    // 타겟 목록 로드
    loadTargets();
}

// 수신자 목록 로드
function loadRecipients() {
    const recipients = recipientManager.getAllRecipients();
    const $recipientList = $('#recipient-list');
    
    // 목록 초기화
    $recipientList.empty();
    
    if (recipients.length === 0) {
        $recipientList.append(`
            <tr>
                <td colspan="3" class="text-center">
                    등록된 수신자가 없습니다.
                </td>
            </tr>
        `);
        return;
    }
    
    // 수신자 목록 표시
    recipients.forEach(recipient => {
        const statusBadge = recipient.active ?
            '<span class="badge badge-success">활성</span>' :
            '<span class="badge badge-secondary">비활성</span>';
            
        const toggleButton = recipient.active ?
            `<button type="button" class="btn btn-xs btn-warning toggle-status" data-id="${recipient.id}"><i class="fas fa-ban"></i></button>` :
            `<button type="button" class="btn btn-xs btn-success toggle-status" data-id="${recipient.id}"><i class="fas fa-check"></i></button>`;
            
        $recipientList.append(`
            <tr>
                <td>${recipient.email}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="btn-group">
                        ${toggleButton}
                        <button type="button" class="btn btn-xs btn-danger remove-recipient" data-id="${recipient.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `);
    });
    
    // 상태 토글 버튼 이벤트 핸들러
    $('.toggle-status').on('click', function() {
        const id = parseInt($(this).data('id'));
        toggleRecipientStatus(id);
    });
    
    // 삭제 버튼 이벤트 핸들러
    $('.remove-recipient').on('click', function() {
        const id = parseInt($(this).data('id'));
        removeRecipient(id);
    });
    
    // 테스트 모달의 수신자 목록도 업데이트
    updateTestReportRecipients();
}

// 보고서 이력 로드
function loadReportHistory() {
    const history = reportHistoryManager.getAllHistory();
    const $historyList = $('#report-history-list');
    
    // 목록 초기화
    $historyList.empty();
    
    if (history.length === 0) {
        $historyList.append(`
            <tr>
                <td colspan="4" class="text-center">
                    전송 이력이 없습니다.
                </td>
            </tr>
        `);
        return;
    }
    
    // 이력 목록 표시
    history.forEach(entry => {
        const date = new Date(entry.date);
        const dateStr = date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const typeLabel = entry.type === 'weekly' ? '주간 보고서' : '월간 보고서';
        
        let statusBadge;
        switch (entry.status) {
            case 'success':
                statusBadge = '<span class="badge badge-success">성공</span>';
                break;
            case 'partial':
                statusBadge = '<span class="badge badge-warning">일부 성공</span>';
                break;
            case 'failure':
                statusBadge = '<span class="badge badge-danger">실패</span>';
                break;
            default:
                statusBadge = '<span class="badge badge-info">처리 중</span>';
        }
        
        $historyList.append(`
            <tr>
                <td>${dateStr}</td>
                <td>${typeLabel}</td>
                <td>${entry.recipientCount}</td>
                <td>${statusBadge}</td>
            </tr>
        `);
    });
}

// 타겟 목록 로드
async function loadTargets() {
    try {
        // 제품군 목록 가져오기
        const productGroups = await api.getProductGroups();
        
        // 모든 공정의 모든 타겟 가져오기
        let allTargets = [];
        
        for (const group of productGroups) {
            try {
                const processes = await api.getProcesses(group.id);
                
                for (const process of processes) {
                    try {
                        const targets = await api.getTargets(process.id);
                        
                        // 각 타겟에 제품군 및 공정 정보 추가
                        const targetsWithInfo = targets.map(target => ({
                            ...target,
                            productGroupName: group.name,
                            processName: process.name
                        }));
                        
                        allTargets = [...allTargets, ...targetsWithInfo];
                    } catch (error) {
                        console.error(`공정 ID ${process.id}의 타겟 로드 오류:`, error);
                    }
                }
            } catch (error) {
                console.error(`제품군 ID ${group.id}의 공정 로드 오류:`, error);
            }
        }
        
        // 테스트 보고서 모달의 타겟 목록 업데이트
        updateTestReportTargets(allTargets);
        
    } catch (error) {
        console.error('타겟 목록 로드 오류:', error);
        showNotification('타겟 목록을 불러오는데 실패했습니다.', 'error');
    }
}

// 테스트 보고서 모달의 타겟 목록 업데이트
function updateTestReportTargets(targets) {
    const $targetSelect = $('#test-report-target');
    
    // 목록 초기화
    $targetSelect.empty();
    
    if (!targets || targets.length === 0) {
        $targetSelect.append('<option value="">사용 가능한 타겟이 없습니다</option>');
        return;
    }
    
    // 타겟 옵션 추가
    targets.forEach(target => {
        $targetSelect.append(`
            <option value="${target.id}">
                ${target.productGroupName} - ${target.processName} - ${target.name}
            </option>
        `);
    });
}

// 테스트 보고서 모달의 수신자 목록 업데이트
function updateTestReportRecipients() {
    const recipients = recipientManager.getActiveRecipients();
    const $recipientSelect = $('#test-report-recipient');
    
    // 목록 초기화
    $recipientSelect.empty();
    
    if (recipients.length === 0) {
        $recipientSelect.append('<option value="">활성화된 수신자가 없습니다</option>');
        return;
    }
    
    // 수신자 옵션 추가
    recipients.forEach(recipient => {
        $recipientSelect.append(`
            <option value="${recipient.id}">${recipient.email}</option>
        `);
    });
}

// 수신자 추가
function addRecipient() {
    const email = $('#new-recipient-email').val().trim();
    
    if (!email) {
        showNotification('이메일 주소를 입력하세요.', 'warning');
        return;
    }
    
    const result = recipientManager.addRecipient(email);
    
    if (result.success) {
        // 입력 필드 초기화
        $('#new-recipient-email').val('');
        
        // 수신자 목록 새로고침
        loadRecipients();
        
        showNotification('수신자가 추가되었습니다.', 'success');
    } else {
        showNotification(result.message, 'error');
    }
}

// 수신자 상태 토글
function toggleRecipientStatus(id) {
    const result = recipientManager.toggleRecipientStatus(id);
    
    if (result.success) {
        // 수신자 목록 새로고침
        loadRecipients();
        
        const message = result.active ? 
            '수신자가 활성화되었습니다.' : 
            '수신자가 비활성화되었습니다.';
            
        showNotification(message, 'success');
    } else {
        showNotification(result.message, 'error');
    }
}

// 수신자 삭제
function removeRecipient(id) {
    if (!confirm('이 수신자를 삭제하시겠습니까?')) {
        return;
    }
    
    const result = recipientManager.removeRecipient(id);
    
    if (result.success) {
        // 수신자 목록 새로고침
        loadRecipients();
        
        showNotification('수신자가 삭제되었습니다.', 'success');
    } else {
        showNotification(result.message, 'error');
    }
}

// 주간 보고서 설정 저장
function saveWeeklySettings() {
    const settings = {
        day: parseInt($('#weekly-report-day').val()),
        time: parseInt($('#weekly-report-time').val()),
        subject: $('#weekly-report-subject').val().trim(),
        active: $('#weekly-report-active').is(':checked')
    };
    
    if (!settings.subject) {
        showNotification('보고서 제목 형식을 입력하세요.', 'warning');
        return;
    }
    
    const result = reportSettingsManager.updateSettings('weekly', settings);
    
    if (result.success) {
        showNotification('주간 보고서 설정이 저장되었습니다.', 'success');
    } else {
        showNotification(result.message, 'error');
    }
}

// 월간 보고서 설정 저장
function saveMonthlySettings() {
    const settings = {
        date: $('#monthly-report-date').val(),
        time: parseInt($('#monthly-report-time').val()),
        subject: $('#monthly-report-subject').val().trim(),
        active: $('#monthly-report-active').is(':checked')
    };
    
    if (!settings.subject) {
        showNotification('보고서 제목 형식을 입력하세요.', 'warning');
        return;
    }
    
    const result = reportSettingsManager.updateSettings('monthly', settings);
    
    if (result.success) {
        showNotification('월간 보고서 설정이 저장되었습니다.', 'success');
    } else {
        showNotification(result.message, 'error');
    }
}

// 테스트 보고서 모달 준비
function prepareTestReportModal() {
    // 수신자 목록 업데이트
    updateTestReportRecipients();
    
    // 모달 표시
    $('#test-report-modal').modal('show');
}

// 테스트 보고서 전송
function sendTestReport() {
    const reportType = $('#test-report-type').val();
    const targetId = $('#test-report-target').val();
    const selectedRecipients = $('#test-report-recipient').val() || [];
    
    if (!targetId) {
        showNotification('타겟을 선택하세요.', 'warning');
        return;
    }
    
    if (selectedRecipients.length === 0) {
        showNotification('수신자를 선택하세요.', 'warning');
        return;
    }
    
    // 모달 닫기
    $('#test-report-modal').modal('hide');
    
    // 수신자 이메일 배열 생성
    const recipients = selectedRecipients.map(id => {
        const recipient = recipientManager.recipients.find(r => r.id == id);
        return recipient ? recipient.email : null;
    }).filter(Boolean);
    
    sendReport(reportType, targetId, recipients);
}

// 보고서 전송 함수 
async function sendReport(reportType, targetId, recipients) {
    try {
        // moment 라이브러리 확인
        if (typeof moment === 'undefined') {
            throw new Error('moment 라이브러리를 찾을 수 없습니다. 페이지를 새로고침한 후 다시 시도하세요.');
        }

        // 로딩 메시지 표시
        showNotification('보고서를 생성하고 전송 중입니다...', 'info');
        
        // 날짜 범위 설정 (주간 또는 월간)
        const endDate = moment();
        let startDate;
        
        if (reportType === 'weekly') {
            // 주간 보고서: 현재 날짜로부터 7일 전
            startDate = moment().subtract(6, 'days');
        } else {
            // 월간 보고서: 현재 날짜로부터 30일 전
            startDate = moment().subtract(29, 'days');
        }
        
        // 타겟 정보 가져오기
        const target = await api.get(`${api.endpoints.TARGETS}/${targetId}`);
        if (!target) {
            throw new Error('타겟 정보를 가져올 수 없습니다.');
        }
        
        // 공정 정보 가져오기
        const process = await api.get(`${api.endpoints.PROCESSES}/${target.process_id}`);
        if (!process) {
            throw new Error('공정 정보를 가져올 수 없습니다.');
        }
        
        // 제품군 정보 가져오기
        const productGroup = await api.get(`${api.endpoints.PRODUCT_GROUPS}/${process.product_group_id}`);
        if (!productGroup) {
            throw new Error('제품군 정보를 가져올 수 없습니다.');
        }
        
        // 측정 데이터 가져오기
        const measurements = await api.getMeasurements({
            target_id: targetId,
            start_date: startDate.format('YYYY-MM-DD'),
            end_date: endDate.format('YYYY-MM-DD')
        });
        
        // SPEC 데이터 가져오기
        const specData = await api.getActiveSpec(targetId);
        
        // PDF 생성
        // 수정된 코드:
        let pdf;
        // jsPDF 라이브러리 접근 방식 확인
        if (window.jspdf && window.jspdf.jsPDF) {
            // UMD 방식으로 로드된 경우
            const { jsPDF } = window.jspdf;
            pdf = new jsPDF('l', 'mm', 'a4');
        } else if (window.jsPDF) {
            // 전역 객체로 로드된 경우
            pdf = new window.jsPDF('l', 'mm', 'a4');
        } else {
            throw new Error('jsPDF 라이브러리를 찾을 수 없습니다. 페이지를 새로고침한 후 다시 시도하세요.');
        }
        
        // 페이지 설정
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = {
            top: 10,
            bottom: 10,
            left: 15,
            right: 15
        };
        
        // 제목 추가
        const reportTitle = reportType === 'weekly' ? '주간 보고서' : '월간 보고서';
        const dateRange = `${startDate.format('YYYY-MM-DD')} ~ ${endDate.format('YYYY-MM-DD')}`;
        pdf.setFontSize(16);
        pdf.text(`${productGroup.name} - ${process.name} - ${target.name} ${reportTitle}`, pageWidth / 2, margin.top + 10, { align: 'center' });
        pdf.setFontSize(12);
        pdf.text(`기간: ${dateRange}`, pageWidth / 2, margin.top + 20, { align: 'center' });
        
        // 측정 데이터가 있는 경우 차트 추가
        if (measurements && measurements.length > 0) {
            // 차트 컨테이너 생성
            const chartContainer = document.createElement('div');
            chartContainer.style.width = '600px';
            chartContainer.style.height = '300px';
            document.body.appendChild(chartContainer);
            
            // 차트 캔버스 생성
            const canvas = document.createElement('canvas');
            chartContainer.appendChild(canvas);
            
            // 차트 생성
            const ctx = canvas.getContext('2d');
            const chartData = {
                labels: measurements.map(m => moment(m.created_at).format('MM-DD')),
                datasets: [{
                    label: '측정값',
                    data: measurements.map(m => m.avg_value),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderWidth: 2,
                    fill: false
                }]
            };
            
            // SPEC 라인 추가
            if (specData) {
                if (specData.usl) {
                    chartData.datasets.push({
                        label: 'USL',
                        data: Array(measurements.length).fill(specData.usl),
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderDash: [5, 5],
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0
                    });
                }
                
                if (specData.lsl) {
                    chartData.datasets.push({
                        label: 'LSL',
                        data: Array(measurements.length).fill(specData.lsl),
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderDash: [5, 5],
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0
                    });
                }
            }
            
            const chart = new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
            
            // 차트 이미지 추가
            await new Promise(resolve => setTimeout(resolve, 200)); // 차트 렌더링 시간 확보
            const chartImage = canvas.toDataURL('image/png');
            pdf.addImage(chartImage, 'PNG', margin.left, margin.top + 30, pageWidth - margin.left - margin.right, 100);
            
            // 차트 제거
            chart.destroy();
            document.body.removeChild(chartContainer);
        }
        
        // 요약 정보 추가
        pdf.setFontSize(14);
        pdf.text('측정 데이터 요약', margin.left, margin.top + 140);
        
        // 통계 데이터 계산
        let avgValue = 0;
        let minValue = 0;
        let maxValue = 0;
        let stdDev = 0;
        
        if (measurements && measurements.length > 0) {
            const values = measurements.map(m => m.avg_value);
            avgValue = values.reduce((a, b) => a + b, 0) / values.length;
            minValue = Math.min(...values);
            maxValue = Math.max(...values);
            
            // 표준편차 계산
            const mean = avgValue;
            const squareDiffs = values.map(value => {
                const diff = value - mean;
                return diff * diff;
            });
            const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
            stdDev = Math.sqrt(avgSquareDiff);
        }
        
        // 테이블 데이터
        pdf.setFontSize(10);
        pdf.text(`측정 데이터 수: ${measurements ? measurements.length : 0}`, margin.left, margin.top + 150);
        pdf.text(`평균: ${avgValue.toFixed(3)}`, margin.left, margin.top + 160);
        pdf.text(`최소값: ${minValue.toFixed(3)}`, margin.left, margin.top + 170);
        pdf.text(`최대값: ${maxValue.toFixed(3)}`, margin.left, margin.top + 180);
        pdf.text(`표준편차: ${stdDev.toFixed(3)}`, margin.left, margin.top + 190);
        
        if (specData) {
            pdf.text(`USL: ${specData.usl}`, margin.left + 100, margin.top + 160);
            pdf.text(`LSL: ${specData.lsl}`, margin.left + 100, margin.top + 170);
        }
        
        // PDF를 Base64로 변환
        const pdfBase64 = pdf.output('datauristring');
        
        // 이메일 제목 가져오기
        const settings = reportSettingsManager.getSettings(reportType);
        const emailSubject = reportSettingsManager.format_subject(
            settings.subject, 
            new Date(), 
            reportType
        );
        
        // 이메일 본문 생성
        const emailBody = `
            <html>
            <body>
                <h2>${productGroup.name} - ${process.name} - ${target.name} ${reportType === 'weekly' ? '주간' : '월간'} 보고서</h2>
                <p>기간: ${dateRange}</p>
                <p>첨부된 PDF 보고서를 확인해 주세요.</p>
                <p>감사합니다.</p>
            </body>
            </html>
        `;
        
        // 이메일 전송 API 호출
        const formData = new FormData();
        formData.append('recipients', JSON.stringify(recipients.map(r => r.email || r)));
        formData.append('subject', emailSubject);
        formData.append('body', emailBody);
        formData.append('pdf_base64', pdfBase64);
        
        const response = await fetch(`${api.baseUrl}/email/send`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`이메일 전송 실패: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // 이력에 추가
        reportHistoryManager.addHistory(reportType, recipients.length, 'success');
        
        // 이력 목록 새로고침
        loadReportHistory();
        
        showNotification('보고서가 성공적으로 전송되었습니다.', 'success');
        
    } catch (error) {
        console.error('보고서 전송 오류:', error);
        
        // 이력에 실패 상태로 추가
        reportHistoryManager.addHistory(reportType, recipients.length, 'failure');
        
        // 이력 목록 새로고침
        loadReportHistory();
        
        showNotification(`보고서 전송 중 오류가 발생했습니다: ${error.message}`, 'error');
    }
}

// 이력 새로고침
function refreshHistory() {
    loadReportHistory();
    showNotification('전송 이력이 새로고침되었습니다.', 'info');
}

// 알림 표시 함수
function showNotification(message, type = 'info') {
    // 개발 환경에서는 콘솔에 출력
    console.log(`[${type}] ${message}`);
    
    // 알림 유형에 따른 아이콘 및 색상
    let icon, color;
    switch (type) {
        case 'success':
            icon = 'fas fa-check-circle';
            color = '#28a745';
            break;
        case 'warning':
            icon = 'fas fa-exclamation-triangle';
            color = '#ffc107';
            break;
        case 'error':
            icon = 'fas fa-times-circle';
            color = '#dc3545';
            break;
        default:
            icon = 'fas fa-info-circle';
            color = '#17a2b8';
    }
    
    // 페이지 상단에 알림 표시
    const $notification = $(`
        <div class="alert alert-${type} alert-dismissible fade show" style="position: fixed; top: 20px; right: 20px; z-index: 9999;">
            <i class="${icon} mr-2"></i> ${message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    `);
    
    $('body').append($notification);
    
    // 5초 후 자동으로 사라짐
    setTimeout(() => {
        $notification.alert('close');
    }, 5000);
}