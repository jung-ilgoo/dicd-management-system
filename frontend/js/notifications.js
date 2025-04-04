// 알림 관리 모듈
(function() {
    // 전역 변수
    let notificationsCache = [];
    let unreadCount = 0;
    let isNotificationDropdownOpen = false;
    
    // 페이지 초기화
    function initNotificationSystem() {
        // 알림 드롭다운 및 버튼 추가
        addNotificationDropdown();
        
        // 알림 폴링 시작 (1분마다 알림 업데이트)
        fetchNotifications();
        setInterval(fetchNotifications, 60000);
        
        // 이벤트 리스너 설정
        setupEventListeners();
    }
    
    // 알림 드롭다운 구조 추가
    function addNotificationDropdown() {
        // 네비게이션 바의 알림 영역에 드롭다운 추가
        const navbarRight = document.querySelector('.navbar-nav.ml-auto');
        
        if (!navbarRight) {
            console.error('네비게이션 바를 찾을 수 없습니다.');
            return;
        }
        
        // 새로운 알림 드롭다운 생성
        const notificationDropdown = document.createElement('li');
        notificationDropdown.className = 'nav-item dropdown';
        
        // 드롭다운 HTML 설정
        notificationDropdown.innerHTML = `
        <a class="nav-link" data-toggle="dropdown" href="#" id="notification-toggle">
            <i class="far fa-bell"></i>
            <span class="badge badge-danger navbar-badge" id="notification-badge" style="display: none;">0</span>
        </a>
        <div class="dropdown-menu dropdown-menu-lg dropdown-menu-right" id="notification-dropdown">
            <span class="dropdown-header"><span id="notification-count">0</span> 개의 알림</span>
            <div class="dropdown-divider"></div>
            <div id="notification-list" style="max-height: 300px; overflow-y: auto;">
                <!-- 알림 항목이 여기에 동적으로 추가됩니다 -->
                <div class="dropdown-item text-center">
                    <i class="fas fa-spinner fa-spin mr-2"></i> 알림 로딩 중...
                </div>
            </div>
            <div class="dropdown-divider"></div>
            <a href="#" class="dropdown-item dropdown-footer" id="mark-all-read">모든 알림 읽음으로 표시</a>
        </div>
        `;
        
        // 알림 드롭다운을 네비게이션 바에 추가
        navbarRight.prepend(notificationDropdown);
    }
    
    // 알림 목록 가져오기
    async function fetchNotifications() {
        try {
            // 알림 API에서 최신 알림 가져오기
            const notifications = await api.get(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS}`, { limit: 10 });
            
            // 캐시 업데이트
            notificationsCache = notifications;
            
            // 안 읽은 알림 개수 설정
            unreadCount = notifications.filter(n => !n.is_read).length;
            
            // UI 업데이트
            updateNotificationUI();
            
        } catch (error) {
            console.error('알림 정보 로드 실패:', error);
        }
    }
    
    // 알림 UI 업데이트
    function updateNotificationUI() {
        // 알림 배지 업데이트
        const badge = document.getElementById('notification-badge');
        const count = document.getElementById('notification-count');
        
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
        
        count.textContent = notificationsCache.length;
        
        // 알림 목록 업데이트
        updateNotificationList();
    }
    
    // 알림 목록 업데이트
    function updateNotificationList() {
        const notificationList = document.getElementById('notification-list');
        
        if (!notificationList) {
            return;
        }
        
        // 목록 초기화
        notificationList.innerHTML = '';
        
        // 알림이 없는 경우
        if (notificationsCache.length === 0) {
            notificationList.innerHTML = `
            <div class="dropdown-item text-center">
                <p class="text-muted mb-0">새로운 알림이 없습니다.</p>
            </div>
            `;
            return;
        }
        
        // 각 알림에 대한 항목 생성
        notificationsCache.forEach(notification => {
            const listItem = document.createElement('div');
            
            // 알림 유형에 따른 아이콘 및 색상 설정
            let icon, color;
            switch (notification.type) {
                case 'alert':
                    icon = 'exclamation-circle';
                    color = 'danger';
                    break;
                case 'warning':
                    icon = 'exclamation-triangle';
                    color = 'warning';
                    break;
                case 'info':
                default:
                    icon = 'info-circle';
                    color = 'info';
                    break;
            }
            
            // 날짜 포맷팅
            const date = new Date(notification.created_at);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // 읽음 상태에 따른 스타일 설정
            const readStatus = notification.is_read ? '' : 'font-weight-bold';
            
            // 알림 항목 HTML 설정
            listItem.className = `dropdown-item ${readStatus}`;
            listItem.innerHTML = `
            <div class="d-flex align-items-start">
                <div class="flex-shrink-0 mr-3">
                    <i class="fas fa-${icon} text-${color}"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="dropdown-item-title ${readStatus}">
                        ${notification.title}
                    </h6>
                    <p class="text-sm text-truncate">${notification.message}</p>
                    <p class="text-sm text-muted">
                        <i class="far fa-clock mr-1"></i> ${formattedDate}
                    </p>
                </div>
                <div class="flex-shrink-0 ml-2">
                    <button class="btn btn-sm btn-link p-0 mark-read-btn" data-id="${notification.id}" title="읽음으로 표시">
                        <i class="far ${notification.is_read ? 'fa-check-circle' : 'fa-circle'}"></i>
                    </button>
                </div>
            </div>
            `;
            
            // 알림 클릭 이벤트 (알림 상세 보기)
            listItem.addEventListener('click', function(e) {
                // 읽음 버튼 클릭 시 이벤트 전파 방지
                if (e.target.closest('.mark-read-btn')) {
                    e.stopPropagation();
                    return;
                }
                
                showNotificationDetail(notification);
            });
            
            // 알림 목록에 항목 추가
            notificationList.appendChild(listItem);
            
            // 구분선 추가 (마지막 항목 제외)
            if (notificationsCache.indexOf(notification) < notificationsCache.length - 1) {
                const divider = document.createElement('div');
                divider.className = 'dropdown-divider';
                notificationList.appendChild(divider);
            }
        });
        
        // 읽음 버튼 이벤트 리스너 설정
        document.querySelectorAll('.mark-read-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const notificationId = this.dataset.id;
                markAsRead(notificationId);
            });
        });
    }
    
    // 알림 상세 보기
    function showNotificationDetail(notification) {
        // 알림 상세 정보 모달 표시
        const modalHtml = `
        <div class="modal fade" id="notification-detail-modal" tabindex="-1" role="dialog">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${notification.title}</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p>${notification.message.replace(/\\n/g, '<br>')}</p>
                        <p class="text-muted">
                            <small>
                                <i class="far fa-clock"></i> ${new Date(notification.created_at).toLocaleString()}
                            </small>
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">닫기</button>
                        <button type="button" class="btn btn-primary" id="detail-mark-read-btn">읽음으로 표시</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        // 기존 모달 제거
        const oldModal = document.getElementById('notification-detail-modal');
        if (oldModal) {
            oldModal.remove();
        }
        
        // 새 모달 추가
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 모달 표시
        $('#notification-detail-modal').modal('show');
        
        // 읽음 버튼 이벤트 리스너 설정
        document.getElementById('detail-mark-read-btn').addEventListener('click', function() {
            markAsRead(notification.id);
            $('#notification-detail-modal').modal('hide');
        });
        
        // 모달이 닫히면 자동으로 읽음 상태로 변경
        $('#notification-detail-modal').on('hidden.bs.modal', function() {
            markAsRead(notification.id);
        });
    }
    
    // 알림을 읽음 상태로 표시
    async function markAsRead(notificationId) {
        try {
            // API 호출
            await api.put(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS}/${notificationId}/read`, {});
            
            // 캐시 업데이트
            const notification = notificationsCache.find(n => n.id == notificationId);
            if (notification) {
                notification.is_read = true;
                
                // 안 읽은 알림 개수 업데이트
                unreadCount = notificationsCache.filter(n => !n.is_read).length;
                
                // UI 업데이트
                updateNotificationUI();
            }
        } catch (error) {
            console.error('알림 읽음 표시 실패:', error);
        }
    }
    
    // 모든 알림을 읽음 상태로 표시
    async function markAllAsRead() {
        try {
            // API 호출
            await api.put(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS}/read-all`, {});
            
            // 캐시 업데이트
            notificationsCache.forEach(notification => {
                notification.is_read = true;
            });
            
            // 안 읽은 알림 개수 초기화
            unreadCount = 0;
            
            // UI 업데이트
            updateNotificationUI();
        } catch (error) {
            console.error('모든 알림 읽음 표시 실패:', error);
        }
    }
    
    // 이벤트 리스너 설정
    function setupEventListeners() {
        // 모든 알림 읽음으로 표시 버튼
        document.getElementById('mark-all-read').addEventListener('click', function(e) {
            e.preventDefault();
            markAllAsRead();
        });
        
        // 알림 드롭다운 토글 버튼 클릭 이벤트
        document.getElementById('notification-toggle').addEventListener('click', function(e) {
            e.preventDefault();
            isNotificationDropdownOpen = !isNotificationDropdownOpen;
        });
        
        // 드롭다운 영역 외 클릭 시 닫기
        document.addEventListener('click', function(e) {
            if (isNotificationDropdownOpen && !e.target.closest('#notification-dropdown') && !e.target.closest('#notification-toggle')) {
                isNotificationDropdownOpen = false;
            }
        });
    }
    
    // API 모듈에 알림 관련 메서드 추가
    function extendApiForNotifications() {
        // API 클래스가 있는지 확인
        if (typeof api === 'undefined') {
            console.error('API 모듈을 찾을 수 없습니다.');
            return;
        }
        
        // API_CONFIG에 알림 엔드포인트 추가
        if (!API_CONFIG.ENDPOINTS.NOTIFICATIONS) {
            API_CONFIG.ENDPOINTS.NOTIFICATIONS = '/notifications';
        }
    }
    
    // 모듈 초기화
    function init() {
        // API 확장
        extendApiForNotifications();
        
        // 알림 시스템 초기화
        initNotificationSystem();
    }
    
    // 페이지 로드 시 초기화
    document.addEventListener('DOMContentLoaded', init);
})();