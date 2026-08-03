// Entity Zod schemas live here, one file per entity, added as each module
// is built (e.g. `employee.ts` when the Employees module is implemented).
// Both apps/api (as NestJS DTOs) and apps/web (as React Hook Form resolvers)
// import from here — never duplicate a validation shape in both places.
export * from './auth'
export * from './pagination'
export * from './employee'
export * from './role'
export * from './member'
export * from './plan'
export * from './subscription'
export * from './payment'
export * from './attendance'
