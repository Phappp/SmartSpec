import { reactive, computed } from 'vue';
import { getVersionStatus, retryProjectAnalysis } from '@/api/project';

// Trạng thái reactive để lưu các project đang được polling
const state = reactive({
    // key: projectId, value: thông tin polling
    pollingProjects: {},
});

const stopPollingForProject = (projectId) => {
    if (state.pollingProjects[projectId]?.intervalId) {
        clearInterval(state.pollingProjects[projectId].intervalId);
    }
    delete state.pollingProjects[projectId];
    // Lưu trạng thái vào localStorage sau khi xóa
    localStorage.setItem('pollingProjects', JSON.stringify(state.pollingProjects));
};

const startPolling = async (projectId, versionId) => {
    if (state.pollingProjects[projectId]) {
        stopPollingForProject(projectId);
    }

    console.log(`[Store] Starting polling for Project ${projectId}, Version ${versionId}`);

    state.pollingProjects[projectId] = {
        versionId,
        status: 'polling',
        progress: 0,
        stage: 'Initializing...',
        intervalId: null,
    };
    localStorage.setItem('pollingProjects', JSON.stringify(state.pollingProjects));

    try {
        // Kích hoạt retry trên server. Lệnh này chỉ cần gửi đi.
        await retryProjectAnalysis(projectId, versionId);

        const intervalId = setInterval(async () => {
            try {
                const response = await getVersionStatus(versionId);
                const { status, stage, progress } = response.data.data;

                if (!state.pollingProjects[projectId]) {
                    clearInterval(intervalId);
                    return;
                }

                // Cập nhật trạng thái
                state.pollingProjects[projectId].status = status === 'processing' ? 'polling' : status;
                state.pollingProjects[projectId].stage = stage || 'Processing...';
                state.pollingProjects[projectId].progress = progress || 0;
                localStorage.setItem('pollingProjects', JSON.stringify(state.pollingProjects));

                if (status !== 'processing') {
                    console.log(`[Store] Polling finished for Project ${projectId} with status: ${status}`);
                    stopPollingForProject(projectId);
                    window.dispatchEvent(new CustomEvent('polling-finished', { detail: { projectId, versionId, status } }));
                }
            } catch (error) {
                console.error(`[Store] Polling API error for Project ${projectId}:`, error);
                state.pollingProjects[projectId].status = 'failed';
                state.pollingProjects[projectId].stage = 'Polling Error';
                stopPollingForProject(projectId);
                window.dispatchEvent(new CustomEvent('polling-finished', { detail: { projectId, versionId, status: 'failed' } }));
            }
        }, 3000); // Tăng thời gian polling lên 3s để giảm tải

        state.pollingProjects[projectId].intervalId = intervalId;

    } catch (error) {
        console.error(`[Store] Failed to trigger retry API for Project ${projectId}:`, error);
        state.pollingProjects[projectId].status = 'failed';
        state.pollingProjects[projectId].stage = 'Retry Start Failed';
        stopPollingForProject(projectId); // Dừng lại nếu không thể kích hoạt
    }
};

// Khôi phục trạng thái từ localStorage khi store được load
const initializeStore = () => {
    const savedState = localStorage.getItem('pollingProjects');
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        // Khởi động lại polling cho các project chưa hoàn thành
        for (const projectId in parsedState) {
            const project = parsedState[projectId];
            if (project.status === 'polling') {
                startPolling(projectId, project.versionId);
            }
        }
    }
};


export const useProjectPolling = () => {
    return {
        pollingProjects: computed(() => state.pollingProjects),
        startPolling,
        stopPolling: stopPollingForProject,
        initializeStore,
        getPollingState: (projectId) => computed(() => state.pollingProjects[projectId]),
    };
};