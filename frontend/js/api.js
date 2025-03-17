// API 클래스
class API {
    // 생성자
    constructor(config) {
        this.baseUrl = config.BASE_URL;
        this.endpoints = config.ENDPOINTS;
    }
    
    // GET 요청
    async get(endpoint, params = {}) {
        // URL 쿼리 파라미터 생성
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                queryParams.append(key, params[key]);
            }
        });
        
        // URL 구성
        const url = `${this.baseUrl}${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API GET 요청 오류:', error);
            throw error;
        }
    }
    
    // POST 요청
    async post(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API POST 요청 오류:', error);
            throw error;
        }
    }
    
    // PUT 요청
    async put(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API PUT 요청 오류:', error);
            throw error;
        }
    }
    
    // DELETE 요청
    async delete(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API DELETE 요청 오류:', error);
            throw error;
        }
    }
    
    // 제품군 관련 메서드
    async getProductGroups() {
        return this.get(this.endpoints.PRODUCT_GROUPS);
    }
    
    // 공정 관련 메서드
    async getProcesses(productGroupId = null) {
        const params = productGroupId ? { product_group_id: productGroupId } : {};
        return this.get(this.endpoints.PROCESSES, params);
    }
    
    // 타겟 관련 메서드
    async getTargets(processId = null) {
        const params = processId ? { process_id: processId } : {};
        return this.get(this.endpoints.TARGETS, params);
    }
    
    // 장비 관련 메서드
    async getEquipments() {
        return this.get(this.endpoints.EQUIPMENTS);
    }
    
    // 측정 데이터 관련 메서드
    async getMeasurements(params = {}) {
        return this.get(this.endpoints.MEASUREMENTS, params);
    }
    
    async createMeasurement(data) {
        return this.post(this.endpoints.MEASUREMENTS, data);
    }
    
    // SPEC 관련 메서드
    async getSpecs(targetId = null, isActive = null) {
        const params = {};
        if (targetId !== null) params.target_id = targetId;
        if (isActive !== null) params.is_active = isActive;
        return this.get(this.endpoints.SPECS, params);
    }
    
    async getActiveSpec(targetId) {
        return this.get(`${this.endpoints.SPECS}/target/${targetId}/active`);
    }
    
    // SPC 관련 메서드
    async analyzeSpc(targetId, days = 30) {
        return this.get(`${this.endpoints.SPC}/analyze/${targetId}`, { days });
    }
    
    // 통계 관련 메서드
    async getTargetStatistics(targetId, days = 14) {
        return this.get(`${this.endpoints.STATISTICS}/target/${targetId}`, { days });
    }
    
    // 보고서 관련 메서드
    async getReports(params = {}) {
        return this.get(this.endpoints.REPORTS, params);
    }
    
    // 새 메서드 추가
    checkDuplicateMeasurement(targetId, lotNo, waferNo) {
        // 새 엔드포인트 사용
        return this.get(`/api/duplicate-check`, {
            target_id: targetId,
            lot_no: lotNo,
            wafer_no: waferNo
        });
    }
    
    generateWeeklyReport(targetId, date = null) {
        const params = date ? { date } : {};
        const queryParams = new URLSearchParams(params).toString();
        const url = `${this.baseUrl}${this.endpoints.REPORTS}/weekly/${targetId}${queryParams ? '?' + queryParams : ''}`;
        window.open(url, '_blank');
    }
            
    generateMonthlyReport(targetId, year = null, month = null) {
        const params = {};
        if (year !== null) params.year = year;
        if (month !== null) params.month = month;
        const queryParams = new URLSearchParams(params).toString();
        const url = `${this.baseUrl}${this.endpoints.REPORTS}/monthly/${targetId}${queryParams ? '?' + queryParams : ''}`;
        window.open(url, '_blank');
    }
}
// API 인스턴스 생성
const api = new API(API_CONFIG);