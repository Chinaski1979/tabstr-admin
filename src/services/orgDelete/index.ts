/**
 * Barrel for the recursive organization delete service.
 * Components must consume hooks (`@/hooks/useOrgDelete`), not these directly.
 */
export {
  checkDeleteCapability,
  probeDeleteCapability,
  verifyExecSql,
  buildDryRunPlan,
  executeOrgDelete,
} from "./orgDeleteService";
export { saveAuditReport, listAuditReports, downloadAuditReport } from "./orgDeleteAudit";
export {
  ORG_SCOPED_TABLES,
  SKIP_TABLES,
  REGISTRY_TABLES,
  buildPhase1Statements,
  buildPhase2Statements,
  buildPhase2DeleteStatement,
  buildAllStatements,
} from "./orgDeleteTables";
