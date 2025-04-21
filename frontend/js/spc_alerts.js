// SPC 위반 조회 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 검색 버튼 이벤트 리스너
    document.getElementById('search-btn').addEventListener('click', loadSpcAlerts);
    
    // 페이지 로드 시 데이터 로드
    loadSpcAlerts();
});

// SPC 위반 내역 로드
async function loadSpcAlerts() {
    try {
        // 필터 값 가져오기
        const startDate = document.getElementById('filter-start-date').value;
        const endDate = document.getElementById('filter-end-date').value;
        const status = document.getElementById('filter-status').value;
        
        console.log('필터 설정:', { startDate, endDate, status });
        
        // 로딩 표시
        const tbody = document.querySelector('#alerts-table tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">로딩 중...</span>
                    </div>
                </td>
            </tr>
        `;
        
        // API 호출
        const response = await api.getSpcAlerts({
            start_date: startDate,
            end_date: endDate,
            status: status
        });
        
        console.log('API 응답:', response);
        
        // 데이터가 배열인지 확인하고 처리
        const alerts = Array.isArray(response) ? response : response.data || [];
        
        // 테이블 업데이트
        updateTable(alerts);
        
    } catch (error) {
        console.error('SPC 위반 내역 로드 실패:', error);
        alert('데이터를 불러오는 중 오류가 발생했습니다.');
    }
}

// 테이블 업데이트 - 컬럼 수 조정
function updateTable(alerts) {
    const tbody = document.querySelector('#alerts-table tbody');
    
    if (!alerts || alerts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">조회된 데이터가 없습니다.</td>
            </tr>
        `;
        return;
    }
    
    // 테이블 데이터 생성
    const rows = alerts.map(alert => {
        const createdAt = new Date(alert.created_at).toLocaleString();
        const statusBadge = getStatusBadge(alert.status);
        
        // NULL 체크 및 옵셔널 체이닝 사용
        const productGroup = alert.product_group?.name || '정보 없음';
        const process = alert.process?.name || '정보 없음';
        const target = alert.target?.name || '정보 없음';
        const lotNo = alert.measurement?.lot_no || '-';
        const waferNo = alert.measurement?.wafer_no || '-';
        const avgValue = alert.measurement?.avg_value ? alert.measurement.avg_value.toFixed(3) : '-';
        const spcRule = alert.spc_rule?.name || '정보 없음';
        const description = alert.description || '';
        
        return `
            <tr>
                <td>${createdAt}</td>
                <td>${productGroup}</td>
                <td>${process}</td>
                <td>${target}</td>
                <td>${lotNo}</td>
                <td>${waferNo}</td>
                <td>${avgValue}</td>
                <td>${spcRule}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = rows;
}

// 상태 배지 생성
function getStatusBadge(status) {
    const badges = {
        'new': '<span class="badge badge-danger">새로운 위반</span>',
        'in_review': '<span class="badge badge-warning">검토 중</span>',
        'resolved': '<span class="badge badge-success">해결됨</span>',
        'exception': '<span class="badge badge-secondary">예외 처리</span>'
    };
    
    return badges[status] || status;
}