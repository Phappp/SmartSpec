import Project from "../../../../../internal/model/project";
import User from "../../../../../internal/model/user";
import {
  ServiceResponse,
  ResponseStatus,
} from "../../../services/serviceResponse";
import mongoose, { Types } from "mongoose";
import mailService from "../../../services/sendMail.service";
import jwt from "jsonwebtoken";
import { notificationService } from "../../../services/notification.service";
import { NotificationServiceImpl } from "../../notification/domain/service";
export class ShareProjectService {
  async inviteMemberByEmail(
    projectId: string,
    subId: string,
    email: string,
    role: "editor" | "viewer"
  ): Promise<ServiceResponse> {
    const project = await Project.findById(projectId);
    const sender = await User.findOne({ _id: subId });

    if (!project)
      return new ServiceResponse(
        ResponseStatus.Failed,
        "Project not found",
        null,
        404
      );

    // chỉ owner mới có quyền mời
    if (
      !project.members.some(
        (m) => m.user_id.equals(subId) && m.role === "owner"
      )
    ) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        "You do not have permission to invite",
        null,
        403
      );
    }

    // tìm user theo email
    const user = await User.findOne({ email });
    if (!user)
      return new ServiceResponse(
        ResponseStatus.Failed,
        "User not found",
        null,
        404
      );

    const userId = user._id;

    const inviteToken = jwt.sign(
      { projectId, userId },
      process.env.JWT_EMAIL_SECRET!,
      { expiresIn: "7d" }
    );
    const backendHost = process.env.BACKEND_HOST || "localhost";
    const backendPort = process.env.PORT || "8000";
    const backendUrl = `http://${backendHost}:${backendPort}`;
    const acceptUrl = `${backendUrl}/api/projects/${projectId}/members/${userId}/accept?token=${inviteToken}`;
    const rejectUrl = `${backendUrl}/api/projects/${projectId}/members/${userId}/reject?token=${inviteToken}`;
    const notificationServiceDomain = new NotificationServiceImpl();
    // tìm xem user đã có record member chưa
    const existingMember = project.members.find((m) =>
      m.user_id.equals(userId)
    );

    if (existingMember) {
      if (existingMember.status === "accepted") {
        return new ServiceResponse(
          ResponseStatus.Failed,
          "User is already a member",
          null,
          400
        );
      }

      if (existingMember.status === "pending") {
        existingMember.role = role;
        existingMember.invited_by = new Types.ObjectId(subId);
        existingMember.invited_at = new Date();
        existingMember.history.push({
          action: "invited",
          by: new Types.ObjectId(subId),
          at: new Date(),
        });

        await project.save();

        const mailIsSent = await this.sendInviteEmail(
          user.email,
          user.name,
          project.name,
          role,
          projectId,
          userId.toString(),
          inviteToken
        );
        if (!mailIsSent) {
          return new ServiceResponse<any>(
            ResponseStatus.Failed,
            "Invitation already exists but email not sent again",
            { status: "pending" },
            500
          );
        }
        await notificationService.sendSocketNotification(
          user.id,
          sender.id,
          "Request to join",
          `${sender.name} has re-sent you an invitation to join the project ${project.name} as an ${role}.`,
          acceptUrl,
          rejectUrl
        );

        await notificationServiceDomain.createNotification(
          user.id,
          subId,
          "INVITATION",
          "Request to join",
          `${sender.name} has re-sent you an invitation to join the project ${project.name} as an ${role}.`,
          ""
        );

        return new ServiceResponse<any>(
          ResponseStatus.Success,
          "Invitation already pending, email resent",
          { status: "pending" },
          200
        );
      }

      if (["canceled", "rejected", "left"].includes(existingMember.status)) {
        existingMember.role = role;
        existingMember.status = "pending";
        existingMember.invited_by = new Types.ObjectId(subId);
        existingMember.invited_at = new Date();
        existingMember.responded_at = null;
        existingMember.history.push({
          action: "invited",
          by: new Types.ObjectId(subId),
          at: new Date(),
        });

        await project.save();

        const mailIsSent = await this.sendInviteEmail(
          user.email,
          user.name,
          project.name,
          role,
          projectId,
          userId.toString(),
          inviteToken
        );
        if (!mailIsSent) {
          return new ServiceResponse<any>(
            ResponseStatus.Failed,
            "Re-invitation created but email not sent",
            { status: "pending" },
            500
          );
        }

        await notificationService.sendSocketNotification(
          user.id,
          sender.id,
          "Request to join",
          `${sender.name} has invited you to re-join the project ${project.name} as an ${role}.`,
          acceptUrl,
          rejectUrl
        );

        await notificationServiceDomain.createNotification(
          user.id,
          subId,
          "INVITATION",
          "Request to join",
          `${sender.name} has invited you to re-join the project ${project.name} as an ${role}.`,
          ""
        );

        return new ServiceResponse<any>(
          ResponseStatus.Success,
          "User re-invited successfully",
          { status: "pending" },
          200
        );
      }
    } else {
      // chưa có record → push mới
      project.members.push({
        user_id: new Types.ObjectId(userId),
        role,
        status: "pending",
        invited_by: new Types.ObjectId(subId),
        invited_at: new Date(),
        history: [
          {
            action: "invited",
            by: new Types.ObjectId(subId),
            at: new Date(),
          },
        ],
      });

      await project.save();

      const mailIsSent = await this.sendInviteEmail(
        user.email,
        user.name,
        project.name,
        role,
        projectId,
        userId.toString(),
        inviteToken
      );
      if (!mailIsSent) {
        return new ServiceResponse<any>(
          ResponseStatus.Failed,
          "Invitation created but email not sent",
          { status: "pending" },
          500
        );
      }
      await notificationService.sendSocketNotification(
        user.id,
        sender.id,
        "Request to join",
        `${sender.name} has invited you to join the project ${project.name} as an ${role}.`,
        acceptUrl,
        rejectUrl
      );

      await notificationServiceDomain.createNotification(
        user.id,
        subId,
        "INVITATION",
        "Request to join",
        `${sender.name} has invited you to join the project ${project.name} as an ${role}.`,
        ""
      );
      return new ServiceResponse<any>(
        ResponseStatus.Success,
        "Invite sent successfully",
        { status: "pending" },
        200
      );
    }
  }

  private async sendInviteEmail(
    email: string,
    userName: string,
    projectName: string,
    role: string,
    projectId: string,
    userId: string,
    inviteToken: string
  ): Promise<boolean> {
    const backendHost = process.env.BACKEND_HOST || "localhost";
    const backendPort = process.env.PORT || "8000";
    const backendUrl = `http://${backendHost}:${backendPort}`;
    const acceptUrl = `${backendUrl}/api/projects/${projectId}/members/${userId}/accept?token=${inviteToken}`;
    const rejectUrl = `${backendUrl}/api/projects/${projectId}/members/${userId}/reject?token=${inviteToken}`;

    const subject = "Project Invitation";
    const data = `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:20px auto;padding:20px;border:1px solid #eee;border-radius:10px;">
            <p>Dear <b>${userName}</b>,</p>
            <p>
            You are invited to join the project <b>${projectName}</b> 
            as a <b>${role}</b>.
            </p>
            <p>Please confirm your decision:</p>
            <p style="margin:20px 0;">
            <a href="${acceptUrl}" style="padding:10px 18px;background:#28a745;color:#fff;text-decoration:none;border-radius:5px;">Accept</a>
            &nbsp;
            <a href="${rejectUrl}" style="padding:10px 18px;background:#dc3545;color:#fff;text-decoration:none;border-radius:5px;">Reject</a>
            </p>
            <p style="margin-top:25px;">Thank you.</p>
            <p style="font-size:12px;color:#777;">If you did not expect this invitation, please disregard this email.</p>
        </div>
        `;

    try {
      const mailIsSent = await mailService.sendEmail({
        emailFrom: process.env.EMAIL_USER!,
        emailTo: email,
        emailSubject: subject,
        emailText: data,
      });

      return mailIsSent;
    } catch (ex) {
      console.error("Error sending email:", (ex as Error).message);
      return false;
    }
  }

  async getProjectInvites(projectId: string, userId: string) {
    const project = await Project.findById(projectId)
      .populate({
        path: "members.user_id",
        select: "name email",
        model: "users",
      })
      .populate({
        path: "members.invited_by",
        select: "name email",
        model: "users",
      })
      .lean();

    if (!project)
      return new ServiceResponse(
        ResponseStatus.Failed,
        "Project not found",
        null,
        404
      );

    // Kiểm tra quyền user phải là thành viên
    const member = project.members.find(
      (m) => m.user_id._id.toString() === userId
    );
    if (!member || !["owner", "editor", "viewer"].includes(member.role)) {
      return new ServiceResponse(ResponseStatus.Failed, "Forbidden", null, 403);
    }

    const invites = await Project.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(projectId) } },
      { $unwind: "$members" },
      { $match: { "members.status": "pending" } },
      {
        $lookup: {
          from: "users",
          localField: "members.user_id",
          foreignField: "_id",
          as: "invitee",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "members.invited_by",
          foreignField: "_id",
          as: "inviter",
        },
      },
      { $unwind: "$invitee" },
      { $unwind: "$inviter" },
      {
        $project: {
          invite_id: "$members._id",
          project_id: "$_id",
          role: "$members.role",
          status: "$members.status",
          created_at: "$members.invited_at",
          inviter: {
            _id: "$inviter._id",
            name: "$inviter.name",
            email: "$inviter.email",
          },
          invitee: {
            _id: "$invitee._id",
            name: "$invitee.name",
            email: "$invitee.email",
          },
        },
      },
    ]);

    return new ServiceResponse(ResponseStatus.Success, "OK", invites, 200);
  }

  async getUserInvites(userId: string) {
    const invites = await Project.aggregate([
      { $unwind: "$members" },
      {
        $match: {
          "members.user_id": new mongoose.Types.ObjectId(userId),
          "members.status": "pending",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "members.user_id",
          foreignField: "_id",
          as: "invitee",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "members.invited_by",
          foreignField: "_id",
          as: "inviter",
        },
      },
      { $unwind: "$invitee" },
      { $unwind: "$inviter" },
      {
        $project: {
          invite_id: "$members._id",
          project_id: "$_id",
          role: "$members.role",
          status: "$members.status",
          created_at: "$members.invited_at",
          inviter: {
            _id: "$inviter._id",
            name: "$inviter.name",
            email: "$inviter.email",
          },
          invitee: {
            _id: "$invitee._id",
            name: "$invitee.name",
            email: "$invitee.email",
          },
        },
      },
    ]);

    return new ServiceResponse(ResponseStatus.Success, "OK", invites, 200);
  }

  /**
   * Người được mời chấp nhận invite
   */
  async acceptInvite(
    projectId: string,
    userId: string
  ): Promise<ServiceResponse<{ status: string }>> {
    const project = await Project.findById(projectId);
    if (!project)
      return new ServiceResponse(
        ResponseStatus.Failed,
        "Project not found",
        null,
        404
      );

    const member = project.members.find((m) => m.user_id.equals(userId));
    if (!member)
      return new ServiceResponse(
        ResponseStatus.Failed,
        "Invite not found",
        null,
        404
      );

    if (member.status !== "pending")
      return new ServiceResponse(
        ResponseStatus.Failed,
        "Invalid or expired invite",
        null,
        400
      );

    // Cập nhật trạng thái
    member.status = "accepted";
    member.responded_at = new Date();
    member.history.push({
      action: "accepted",
      by: new Types.ObjectId(userId),
      at: new Date(),
    });

    await project.save();
    return new ServiceResponse(
      ResponseStatus.Success,
      "You have joined the project",
      { status: "accepted" },
      200
    );
  }

  /**
   * Người được mời từ chối invite
   */
  async rejectInvite(
    projectId: string,
    userId: string
  ): Promise<ServiceResponse<{ status: string }>> {
    const project = await Project.findById(projectId);
    if (!project) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        "Project not found",
        null,
        404
      );
    }

    const member = project.members.find((m) => m.user_id.equals(userId));
    if (!member) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        "Invite not found",
        null,
        404
      );
    }

    if (member.status !== "pending") {
      return new ServiceResponse(
        ResponseStatus.Failed,
        "Invalid or expired invitation",
        null,
        400
      );
    }

    //Cập nhật trạng thái
    member.status = "rejected";
    member.responded_at = new Date();
    member.history.push({
      action: "rejected",
      by: new Types.ObjectId(userId),
      at: new Date(),
    });

    await project.save();

    return new ServiceResponse(
      ResponseStatus.Success,
      "You have rejected the invite",
      { status: "rejected" },
      200
    );
  }

  /**
   * Cancel an invite to join a project
   */
  async cancelInvite(
    projectId: string,
    memberId: string,
    userId: string
  ): Promise<ServiceResponse> {
    if (
      !Types.ObjectId.isValid(projectId) ||
      !Types.ObjectId.isValid(memberId)
    ) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        "Invalid projectId or memberId",
        null,
        400
      );
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        "Project not found",
        null,
        404
      );
    }

    const member = project.members.find(
      (m: any) => m.user_id.toString() === memberId
    );
    if (!member) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        "No invitation found",
        null,
        404
      );
    }
    if (
      project.owner_id.toString() !== userId &&
      member.invited_by.toString() !== userId
    ) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        "You do not have the right to cancel the invitation.",
        null,
        403
      );
    }

    if (member.status !== "pending") {
      return new ServiceResponse(
        ResponseStatus.Failed,
        "Cannot cancel a processed invitation",
        null,
        400
      );
    }

    member.status = "canceled";
    member.responded_at = new Date();
    member.history.push({ action: "canceled", by: userId, at: new Date() });

    await project.save();

    return new ServiceResponse<any>(
      ResponseStatus.Success,
      "Invite has been canceled",
      { status: "canceled" },
      200
    );
  }

  async removeMember(
    projectId: string,
    memberId: string,
    userId: string
  ): Promise<ServiceResponse> {
    if (
      !Types.ObjectId.isValid(projectId) ||
      !Types.ObjectId.isValid(memberId)
    ) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        "Invalid projectId or memberId",
        null,
        400
      );
    }

    try {
      const project = await Project.findById(projectId);
      if (!project) {
        return new ServiceResponse(
          ResponseStatus.Failed,
          "Project not found",
          null,
          404
        );
      }
      // chỉ owner mới được quyền gỡ
      const isOwner = project.members.some(
        (m) => m.user_id.equals(userId) && m.role === "owner"
      );
      if (!isOwner) {
        return new ServiceResponse(
          ResponseStatus.Failed,
          "Only project owner can remove member",
          null,
          403
        );
      }

      // tìm member
      const memberIndex = project.members.findIndex(
        (m: any) => m.user_id.toString() === memberId
      );
      if (memberIndex === -1) {
        return new ServiceResponse(
          ResponseStatus.Failed,
          "Member not found",
          null,
          404
        );
      }

      const member = project.members[memberIndex];

      // push log trước khi xoá
      member.history.push({
        action: "unshared",
        by: new Types.ObjectId(userId),
        at: new Date(),
      });

      // xoá hẳn member
      project.members.splice(memberIndex, 1);
      await project.save();

      return new ServiceResponse<any>(
        ResponseStatus.Success,
        "Member has been removed from project",
        { memberId },
        200
      );
    } catch (err: any) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        "Internal Server Error",
        err.message,
        500
      );
    }
  }

  async leaveProject(
    projectId: string,
    userId: string
  ): Promise<ServiceResponse> {
    if (!Types.ObjectId.isValid(projectId)) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        "Invalid projectId",
        null,
        400
      );
    }

    try {
      const project = await Project.findById(projectId);
      if (!project) {
        return new ServiceResponse(
          ResponseStatus.Failed,
          "Project not found",
          null,
          404
        );
      }

      // tìm thành viên là chính user
      const memberIndex = project.members.findIndex(
        (m: any) => m.user_id.toString() === userId
      );
      if (memberIndex === -1) {
        return new ServiceResponse(
          ResponseStatus.Failed,
          "You are not a member of this project",
          null,
          404
        );
      }

      const member = project.members[memberIndex];

      // không cho owner rời
      if (member.role === "owner") {
        return new ServiceResponse(
          ResponseStatus.Failed,
          "Project owner cannot leave the project",
          null,
          403
        );
      }

      // log trước khi xoá
      member.history.push({
        action: "left",
        by: new Types.ObjectId(userId),
        at: new Date(),
      });

      // xoá thành viên
      project.members.splice(memberIndex, 1);
      await project.save();

      return new ServiceResponse<any>(
        ResponseStatus.Success,
        "You have left the project",
        { status: "left" },
        200
      );
    } catch (err: any) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        "Internal Server Error",
        err.message,
        500
      );
    }
  }
}
