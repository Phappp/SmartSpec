export interface CreateLogDTO {
  project_id?: string;
  user_id?: string;
  action:
    | "create_input" | "update_input" | "delete_input"
    | "generate_output" | "update_output" | "delete_output" | "export_data"
    | "create_version" | "update_version" | "delete_version" | "rollback"
    | "create_project" | "update_project" | "delete_project" | "restore_project"
    | "create_user" | "failed_login" | "login" | "logout" | "performance" | "deploy" | "startup"
    | "update_user"
    | "generate_data" | "update_data" | "delete_data" | "resolve_conflict"
    | "invite_member" | "accept_invite" | "reject_invite" | "cancel_invite"
    | "remove_member" | "leave_project" | "change_member_role";
  
  target_id?: string;
  target_type: "input" | "output" | "project" | "version" | "system" | "requirement_model" | "member";
  version_number?: string;
  affects_requirement?: boolean;
  level: "info" | "warning" | "error";
  performed_by_ai?: boolean;
  details?: {
    before?: any;
    after?: any;
    message?: string; 
  };
  ip?: string;
  user_agent?: string;
}
