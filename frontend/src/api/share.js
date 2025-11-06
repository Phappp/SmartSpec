import axiosClient from "./../utils/axiosClient";

// ========== SHARE - COMPLETELY FIXED APIS ====================
export const getProjectInvites = (projectId) => {
    return axiosClient.get(`/api/projects/${projectId}/members/invites`);
};

// 🔍 Tìm kiếm user toàn hệ thống
export const searchUsers = (searchTerm) => {
    return axiosClient.get(`/api/projects/users/search?q=${encodeURIComponent(searchTerm)}`);
};

export const cancelInvite = (projectId, memberId) => {
    return axiosClient.delete(`/api/projects/${projectId}/members/${memberId}/cancel`);
};

// 🔥 FIXED: Sửa hoàn toàn cách gọi API accept và reject
export const acceptInvite = (projectId, memberId, token = null) => {
    // Gửi token trong request body
    const data = token ? { token } : {};
    return axiosClient.post(`/api/projects/${projectId}/members/${memberId}/accept`, data);
};

export const rejectInvite = (projectId, memberId, token = null) => {
    // Gửi token trong request body  
    const data = token ? { token } : {};
    return axiosClient.post(`/api/projects/${projectId}/members/${memberId}/reject`, data);
};

export const removeMember = (projectId, memberId) => {
    return axiosClient.delete(`/api/projects/${projectId}/members/${memberId}`);
};

export const leaveProject = (projectId) => {
    return axiosClient.post(`/api/projects/${projectId}/leave`);
};

export const inviteMember = (projectId, email, role) => {
    return axiosClient.post(`/api/projects/${projectId}/members/invite`, {
        email,
        role
    });
};

// Invitations
export const getMyInvitations = () => {
    return axiosClient.get('/api/users/me/invites');
}


export default {
    getProjectInvites,
    searchUsers,
    cancelInvite,
    acceptInvite,
    rejectInvite,
    removeMember,
    leaveProject,
    inviteMember,
    getMyInvitations,
};
