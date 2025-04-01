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
    
    // 테스트 보고서 전송 처리 (백엔드 API가 아직 구현되지 않았으므로 모의 처리)
    simulateReportSending(reportType, targetId, recipients);
}

// 보고서 전송 시뮬레이션
function simulateReportSending(reportType, targetId, recipients) {
    // 로딩 메시지 표시
    showNotification('테스트 보고서를 전송 중입니다...', 'info');
    
    // 3초 후 성공 응답 (실제로는 백엔드 API 호출)
    setTimeout(() => {
        const status = Math.random() > 0.8 ? 'partial' : 'success'; // 20% 확률로 일부 성공
        
        // 이력에 추가
        reportHistoryManager.addHistory(reportType, recipients.length, status);
        
        // 이력 목록 새로고침
        loadReportHistory();
        
        showNotification('테스트 보고서가 전송되었습니다.', 'success');
    }, 3000);
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