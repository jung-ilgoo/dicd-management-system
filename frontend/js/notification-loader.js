// notification-loader.js
document.addEventListener('DOMContentLoaded', function() {
    // 알림 데이터 로드 및 표시
    loadNotifications();
    
    // 30초마다 알림 업데이트
    setInterval(loadNotifications, 30000);
    
    // 이벤트 리스너 설정
    setupNotificationListeners();
});

// 알림 데이터 로드
async function loadNotifications() {
    try {
        // API에서 알림 데이터 가져오기
        const notifications = await fetch('http://127.0.0.1:8080/api/notifications/').then(r => r.json());
        
        // 안 읽은 알림 개수 계산
        const unreadCount = notifications.filter(n => !n.is_read).length;
        
        // 알림 배지 업데이트
        updateNotificationBadge(unreadCount);
        
        // 알림 목록 업데이트
        updateNotificationList(notifications);
    } catch (error) {
        console.error('알림 로드 오류:', error);
    }
}

// 알림 배지 업데이트
function updateNotificationBadge(count) {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;
    
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
}

// 알림 목록 업데이트
function updateNotificationList(notifications) {
    const notificationList = document.getElementById('notification-list');
    if (!notificationList) return;
    
    notificationList.innerHTML = '';
    
    if (notifications.length === 0) {
        notificationList.innerHTML = '<div class="dropdown-item text-center"><p class="text-muted mb-0">새로운 알림이 없습니다.</p></div>';
        return;
    }
    
    // 알림 항목 생성
    notifications.slice(0, 10).forEach(notification => {
        const listItem = document.createElement('a');
        listItem.href = '#';
        listItem.className = 'dropdown-item';
        listItem.dataset.id = notification.id;
        
        // 알림 유형에 따른 아이콘 설정
        let icon = 'info-circle';
        let colorClass = 'text-info';
        
        if (notification.type === 'alert') {
            icon = 'exclamation-circle';
            colorClass = 'text-danger';
        } else if (notification.type === 'warning') {
            icon = 'exclamation-triangle';
            colorClass = 'text-warning';
        }
        
        // 날짜 형식화
        const date = new Date(notification.created_at);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // 읽음 상태에 따른 스타일
        const fontWeight = notification.is_read ? '' : 'font-weight-bold';
        
        listItem.innerHTML = `
            <div class="d-flex">
                <div class="mr-2">
                    <i class="fas fa-${icon} ${colorClass}"></i>
                </div>
                <div class="${fontWeight}">
                    <div>${notification.title}</div>
                    <div class="text-sm text-muted">${formattedDate}</div>
                </div>
            </div>
        `;
        
        // 클릭 이벤트 설정
        listItem.addEventListener('click', function(e) {
            e.preventDefault();
            showNotificationDetail(notification);
        });
        
        notificationList.appendChild(listItem);
        
        // 구분선 추가
        if (notifications.indexOf(notification) < notifications.length - 1) {
            const divider = document.createElement('div');
            divider.className = 'dropdown-divider';
            notificationList.appendChild(divider);
        }
    });
    
    // 알림 개수 업데이트
    const countElement = document.getElementById('notification-count');
    if (countElement) {
        countElement.textContent = notifications.length;
    }
}

// 알림 상세 보기
function showNotificationDetail(notification) {
    // 알림을 읽음으로 표시
    markAsRead(notification.id);
    
    // 알림 내용을 모달로 표시
    alert(`${notification.title}\n\n${notification.message}`);
}

// 알림을 읽음으로 표시
async function markAsRead(id) {
    try {
        await fetch(`http://127.0.0.1:8080/api/notifications/${id}/read`, {
            method: 'PUT'
        });
        
        // 알림 목록 새로고침
        loadNotifications();
    } catch (error) {
        console.error('알림 읽음 처리 오류:', error);
    }
}

// 모든 알림을 읽음으로 표시
async function markAllAsRead() {
    try {
        await fetch('http://127.0.0.1:8080/api/notifications/read-all', {
            method: 'PUT'
        });
        
        // 알림 목록 새로고침
        loadNotifications();
    } catch (error) {
        console.error('모든 알림 읽음 처리 오류:', error);
    }
}

// 이벤트 리스너 설정
function setupNotificationListeners() {
    const markAllReadBtn = document.getElementById('mark-all-read');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            markAllAsRead();
        });
    }
}