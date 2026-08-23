/**
 * Modular Monolith DB Aggregator
 * Re-exports database client, schemas, and domain services
 */
export * from "./common/db";

// Re-export domain services for backwards compatibility
export * from "./modules/projects/projects.service";
export * from "./modules/members/members.service";
export * from "./modules/rooms/rooms.service";
export * from "./modules/rooms/rooms.automation";
export * from "./modules/issues/issues.service";
export * from "./modules/deliveries/deliveries.service";
export * from "./modules/analytics/analytics.service";
export * from "./modules/reports/reports.service";
