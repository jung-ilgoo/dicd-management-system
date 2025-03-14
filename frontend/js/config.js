// API 설정
const API_CONFIG = {
    BASE_URL: 'http://127.0.0.1:8080/api',
    // API 엔드포인트
    ENDPOINTS: {
        // 제품군 관련 엔드포인트
        PRODUCT_GROUPS: '/product-groups',
        // 공정 관련 엔드포인트
        PROCESSES: '/processes',
        // 타겟 관련 엔드포인트
        TARGETS: '/targets',
        // 장비 관련 엔드포인트
        EQUIPMENTS: '/equipments',
        // 측정 데이터 관련 엔드포인트
        MEASUREMENTS: '/measurements',
        // SPEC 관련 엔드포인트
        SPECS: '/specs',
        // SPC 관련 엔드포인트
        SPC: '/spc',
        // 통계 관련 엔드포인트
        STATISTICS: '/statistics',
        // 보고서 관련 엔드포인트
        REPORTS: '/reports'
    }
};

// 공통 유틸리티 함수
const UTILS = {
    // 날짜 포맷팅
    formatDate: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    },
    
    // 숫자 포맷팅 (소수점 3자리)
    formatNumber: function(number) {
        return number.toFixed(3);
    },
    
    // SPEC 상태에 따른 클래스 반환
    getStatusClass: function(value, lsl, usl) {
        if (value < lsl || value > usl) {
            return 'text-danger';
        } else if (value < lsl + (usl - lsl) * 0.1 || value > usl - (usl - lsl) * 0.1) {
            return 'text-warning';
        } else {
            return 'text-success';
        }
    },
    
    // SPEC 상태에 따른 배지 반환
    getStatusBadge: function(value, lsl, usl) {
        if (value < lsl || value > usl) {
            return '<span class="badge badge-danger">SPEC 위반</span>';
        } else if (value < lsl + (usl - lsl) * 0.1 || value > usl - (usl - lsl) * 0.1) {
            return '<span class="badge badge-warning">주의</span>';
        } else {
            return '<span class="badge badge-success">정상</span>';
        }
    },
    
    // 로딩 스피너 생성
    createLoadingSpinner: function() {
        return `
        <div class="loading-spinner">
            <div class="spinner-border text-primary" role="status">
                <span class="sr-only">Loading...</span>
            </div>
        </div>
        `;
    },
    
    // 에러 메시지 표시
    showError: function(message) {
        return `
        <div class="alert alert-danger" role="alert">
            <i class="fas fa-exclamation-circle mr-2"></i> ${message}
        </div>
        `;
    }
};