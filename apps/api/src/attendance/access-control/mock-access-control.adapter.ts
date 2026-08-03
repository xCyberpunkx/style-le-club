import { Injectable } from '@nestjs/common'
import type { AccessControlAdapter, AccessControlDecision } from './access-control-adapter.interface'

/**
 * No real turnstile/RFID hardware exists yet — this always grants.
 * When real hardware integration happens, write a new adapter class
 * implementing AccessControlAdapter and change the binding in
 * attendance.module.ts; AttendanceService and everything else in this
 * module stays untouched.
 */
@Injectable()
export class MockAccessControlAdapter implements AccessControlAdapter {
  async evaluateEntry(): Promise<AccessControlDecision> {
    return { granted: true }
  }
}
