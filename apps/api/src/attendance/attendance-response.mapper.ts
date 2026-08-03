import { toMemberResponse } from '../members/member-response.mapper'
import type { AttendanceRecordWithMember } from './attendance.repository'

export function toAttendanceResponse(record: AttendanceRecordWithMember) {
  return {
    id: record.id,
    method: record.method,
    checkInAt: record.checkInAt,
    checkOutAt: record.checkOutAt,
    member: toMemberResponse(record.member),
    createdAt: record.createdAt,
  }
}
