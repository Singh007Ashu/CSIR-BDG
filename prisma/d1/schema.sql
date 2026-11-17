-- CreateTable
CREATE TABLE "Role" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    PRIMARY KEY ("roleId", "permissionId"),
    CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordSalt" TEXT,
    "role" TEXT NOT NULL DEFAULT 'APPLICANT',
    "roleId" INTEGER,
    "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "organizationId" INTEGER,
    "assignedLabId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_assignedLabId_fkey" FOREIGN KEY ("assignedLabId") REFERENCES "Lab" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lab" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "location" TEXT,
    "expertise" TEXT,
    "labId" TEXT,
    "piName" TEXT,
    "authorizedPerson" TEXT,
    "designation" TEXT,
    "officialEmail" TEXT,
    "mobileNumber" TEXT,
    "passwordHash" TEXT,
    "passwordSalt" TEXT,
    "primaryRole" TEXT NOT NULL DEFAULT 'LAB_COORDINATOR',
    "accountStatus" TEXT NOT NULL DEFAULT 'UNREGISTERED',
    "registeredAt" DATETIME,
    "approvedAt" DATETIME,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DatasetCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DatasetImport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "categoryId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "recordsTotal" INTEGER NOT NULL DEFAULT 0,
    "recordsImported" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorLog" TEXT,
    "importedById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "DatasetImport_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DatasetCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DatasetImport_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Technology" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "labId" INTEGER NOT NULL,
    "datasetCategoryId" INTEGER,
    "sourceKey" TEXT,
    "briefDescription" TEXT NOT NULL,
    "piName" TEXT,
    "advantages" TEXT,
    "applications" TEXT,
    "keyFeatures" TEXT,
    "classification" TEXT NOT NULL DEFAULT 'NON_IP',
    "ipStatus" TEXT NOT NULL DEFAULT 'NON_IP',
    "trl" INTEGER,
    "crl" INTEGER,
    "sector" TEXT,
    "industryMap" TEXT,
    "applicationMap" TEXT,
    "servicesOffered" TEXT,
    "sourceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IDENTIFIED',
    "recordScope" TEXT NOT NULL DEFAULT 'MASTER',
    "recordFinancialYear" INTEGER,
    "theme" TEXT,
    "subSector" TEXT,
    "technologyType" TEXT,
    "commercialisationStage" TEXT,
    "partnerClient" TEXT,
    "responsibleBdOfficer" TEXT,
    "remarks" TEXT,
    "ecfInformation" TEXT,
    "businessValueInformation" TEXT,
    "impactInformation" TEXT,
    "evidenceReference" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "sopCompletion" INTEGER NOT NULL DEFAULT 0,
    "sopLegacyExempt" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" DATETIME,
    "approvedAt" DATETIME,
    "approvedById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Technology_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Technology_datasetCategoryId_fkey" FOREIGN KEY ("datasetCategoryId") REFERENCES "DatasetCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Technology_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TechnologyFinancialYear" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technologyId" INTEGER NOT NULL,
    "financialYear" INTEGER NOT NULL,
    "recordType" TEXT NOT NULL,
    "royaltyAmountLakhs" REAL,
    "royaltyRatePercent" REAL,
    "commercialProductionValueLakhs" REAL,
    "sector" TEXT,
    "sourceFileName" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TechnologyFinancialYear_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "labId" INTEGER NOT NULL,
    "technologyId" INTEGER,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER,
    "changeType" TEXT NOT NULL,
    "proposedData" TEXT NOT NULL,
    "currentData" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "headRemarks" TEXT,
    "decidedById" INTEGER,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChangeRequest_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChangeRequest_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChangeRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "changeRequestId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "comments" TEXT,
    "proposedSnapshot" TEXT,
    "actedByUserId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalHistory_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "ChangeRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApprovalHistory_actedByUserId_fkey" FOREIGN KEY ("actedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "technologyId" INTEGER,
    "coDevelopmentProjectId" INTEGER,
    "mouId" INTEGER,
    "governanceProjectId" INTEGER,
    "commercialEngagementId" INTEGER,
    "sourceKey" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "mimeType" TEXT,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER,
    "versionGroup" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "supersedesId" INTEGER,
    "uploadedByLabId" INTEGER,
    "uploadedByUserId" INTEGER,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_coDevelopmentProjectId_fkey" FOREIGN KEY ("coDevelopmentProjectId") REFERENCES "CoDevelopmentProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_mouId_fkey" FOREIGN KEY ("mouId") REFERENCES "Mou" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_governanceProjectId_fkey" FOREIGN KEY ("governanceProjectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_commercialEngagementId_fkey" FOREIGN KEY ("commercialEngagementId") REFERENCES "CommercialEngagement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_uploadedByLabId_fkey" FOREIGN KEY ("uploadedByLabId") REFERENCES "Lab" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "recipientType" TEXT NOT NULL,
    "recipientLabId" INTEGER,
    "recipientUserId" INTEGER,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_recipientLabId_fkey" FOREIGN KEY ("recipientLabId") REFERENCES "Lab" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "actorType" TEXT NOT NULL,
    "actorLabId" INTEGER,
    "actorUserId" INTEGER,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" INTEGER,
    "details" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "recordLabel" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorLabId_fkey" FOREIGN KEY ("actorLabId") REFERENCES "Lab" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoginHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "labId" INTEGER,
    "success" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LoginHistory_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TechnologyRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technologyId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "requestType" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "impactNotes" TEXT,
    "headStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "headRemarks" TEXT,
    "decidedById" INTEGER,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TechnologyRequest_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TechnologyRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TechnologyRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProblemStatement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "organizationId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "currentStatus" TEXT,
    "painPoints" TEXT,
    "budget" REAL,
    "timeline" TEXT,
    "expectedOutcome" TEXT,
    "domain" TEXT,
    "labId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "nonEngagementReason" TEXT,
    "headStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "headRemarks" TEXT,
    "decidedById" INTEGER,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProblemStatement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProblemStatement_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProblemStatement_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "problemStatementId" INTEGER NOT NULL,
    "scopeOfWork" TEXT NOT NULL,
    "milestones" TEXT,
    "deliverables" TEXT,
    "estimatedCost" REAL,
    "timeline" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Proposal_problemStatementId_fkey" FOREIGN KEY ("problemStatementId") REFERENCES "ProblemStatement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Partnership" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "organizationId" INTEGER NOT NULL,
    "labId" INTEGER,
    "challengeStatement" TEXT,
    "expectedOutcome" TEXT,
    "commercialPotential" TEXT,
    "technologyGap" TEXT,
    "matchedApproach" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONSULTATION',
    "mouSigned" BOOLEAN NOT NULL DEFAULT false,
    "royaltyNotes" TEXT,
    "headStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "headRemarks" TEXT,
    "decidedById" INTEGER,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Partnership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Partnership_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Partnership_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Company" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CoDevelopmentProject" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "technologyArea" TEXT,
    "labId" INTEGER NOT NULL,
    "piName" TEXT NOT NULL,
    "coPiName" TEXT,
    "companyId" INTEGER NOT NULL,
    "duration" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "objectives" TEXT,
    "scopeOfWork" TEXT,
    "deliverablesSummary" TEXT,
    "milestones" TEXT,
    "totalProjectCost" REAL,
    "csirContribution" REAL,
    "industryContribution" REAL,
    "fundingAgency" TEXT,
    "paymentStatus" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoDevelopmentProject_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CoDevelopmentProject_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CoDevelopmentProject_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommercializationDetail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "royaltyApplicable" BOOLEAN NOT NULL DEFAULT false,
    "royaltyDetails" TEXT,
    "licensing" BOOLEAN NOT NULL DEFAULT false,
    "technologyTransfer" BOOLEAN NOT NULL DEFAULT false,
    "patentFiled" BOOLEAN NOT NULL DEFAULT false,
    "patentGranted" BOOLEAN NOT NULL DEFAULT false,
    "startupCreated" BOOLEAN NOT NULL DEFAULT false,
    "equity" TEXT,
    "revenueSharing" TEXT,
    "commercialPartner" TEXT,
    "marketStatus" TEXT,
    "stage" TEXT,
    "trl" INTEGER,
    "revenueGenerated" REAL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommercializationDetail_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CoDevelopmentProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommercialEngagement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "referenceNo" TEXT NOT NULL,
    "engagementType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "labId" INTEGER NOT NULL,
    "technologyId" INTEGER NOT NULL,
    "proposerName" TEXT NOT NULL,
    "designationDepartment" TEXT NOT NULL,
    "teamMembers" TEXT,
    "knowledgeProductType" TEXT,
    "title" TEXT NOT NULL,
    "clientName" TEXT,
    "clientAddress" TEXT,
    "serviceDetails" TEXT,
    "phasesWorkPackages" TEXT,
    "timeline" TEXT,
    "deliverables" TEXT,
    "clientBenefits" TEXT,
    "inventors" TEXT,
    "patentApplied" BOOLEAN,
    "patentDetails" TEXT,
    "preLicensingEvaluated" BOOLEAN,
    "preLicensingDetails" TEXT,
    "trl" INTEGER,
    "biologicalResources" BOOLEAN,
    "biologicalDetails" TEXT,
    "possibleTransfers" INTEGER,
    "annualClientBenefit" REAL,
    "similarMarketPrice" REAL,
    "territory" TEXT,
    "clientNature" TEXT,
    "clientNatureDetails" TEXT,
    "licenseNature" TEXT,
    "feeProposed" REAL,
    "licensingPeriodYears" REAL,
    "demonstrationDurationValue" INTEGER,
    "demonstrationDurationUnit" TEXT,
    "documentSubmissionDurationValue" INTEGER,
    "documentSubmissionDurationUnit" TEXT,
    "trainingDurationValue" INTEGER,
    "trainingDurationUnit" TEXT,
    "otherInformation" TEXT,
    "assumedProjectCost" REAL,
    "temporaryStaffCost" REAL,
    "capitalCost" REAL,
    "consumablesCost" REAL,
    "servicesUtilitiesCost" REAL,
    "equipmentUsageCost" REAL,
    "externalPaymentsCost" REAL,
    "taDaCost" REAL,
    "contingenciesCost" REAL,
    "otherOutOfPocketCost" REAL,
    "overheadRate" REAL NOT NULL DEFAULT 0,
    "directExpenditureTotal" REAL,
    "laboratoryShareRate" REAL,
    "laboratoryShareAmount" REAL,
    "projectFeeRate" REAL,
    "projectFeeAmount" REAL,
    "gstRate" REAL NOT NULL DEFAULT 18,
    "totalProjectCostExcludingTax" REAL,
    "gstAmount" REAL,
    "totalCharges" REAL,
    "headRemarks" TEXT,
    "submittedAt" DATETIME,
    "approvedAt" DATETIME,
    "decidedAt" DATETIME,
    "createdByUserId" INTEGER,
    "decidedById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommercialEngagement_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CommercialEngagement_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CommercialEngagement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CommercialEngagement_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommercialManDay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "engagementId" INTEGER NOT NULL,
    "personnelGroup" TEXT NOT NULL,
    "numberOfDays" INTEGER NOT NULL,
    "numberOfPeople" INTEGER NOT NULL,
    "ratePerDay" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CommercialManDay_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CommercialEngagement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectDeliverable" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectDeliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CoDevelopmentProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mou" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mouNumber" TEXT,
    "title" TEXT NOT NULL,
    "projectId" INTEGER,
    "companyId" INTEGER NOT NULL,
    "labId" INTEGER NOT NULL,
    "piName" TEXT,
    "signedDate" DATETIME,
    "expiryDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "renewalReminderDays" INTEGER NOT NULL DEFAULT 60,
    "notes" TEXT,
    "createdByUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mou_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CoDevelopmentProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Mou_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Mou_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Mou_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "projectType" TEXT NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "responsibleOfficerId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "folderPath" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_responsibleOfficerId_fkey" FOREIGN KEY ("responsibleOfficerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectTechnology" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "technologyId" INTEGER NOT NULL,
    "relationshipType" TEXT NOT NULL DEFAULT 'LINKED_MASTER',
    "projectStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "projectStage" TEXT,
    "projectData" TEXT,
    "reportingRequired" BOOLEAN NOT NULL DEFAULT true,
    "linkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedById" INTEGER,
    CONSTRAINT "ProjectTechnology_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectTechnology_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReferenceList" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReferenceOption" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "listId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" DATETIME,
    CONSTRAINT "ReferenceOption_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ReferenceList" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sop" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SopStage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sopId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "stageNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT,
    "mandatoryForNew" BOOLEAN NOT NULL DEFAULT true,
    "responsibleUnit" TEXT,
    "accountableUnit" TEXT,
    "consultedUnits" TEXT,
    "informedUnits" TEXT,
    CONSTRAINT "SopStage_sopId_fkey" FOREIGN KEY ("sopId") REFERENCES "Sop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TechnologyParameter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "fieldType" TEXT NOT NULL,
    "unit" TEXT,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "projectId" INTEGER,
    "sopStageId" INTEGER,
    "referenceListKey" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TechnologyParameter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TechnologyParameter_sopStageId_fkey" FOREIGN KEY ("sopStageId") REFERENCES "SopStage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParameterOption" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "parameterId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ParameterOption_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "TechnologyParameter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TechnologyParameterValue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technologyId" INTEGER NOT NULL,
    "parameterId" INTEGER NOT NULL,
    "projectTechnologyId" INTEGER,
    "scopeKey" TEXT NOT NULL DEFAULT 'MASTER',
    "value" TEXT,
    "valueJson" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TechnologyParameterValue_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TechnologyParameterValue_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "TechnologyParameter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TechnologyParameterValue_projectTechnologyId_fkey" FOREIGN KEY ("projectTechnologyId") REFERENCES "ProjectTechnology" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TechnologySOPStatus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technologyId" INTEGER NOT NULL,
    "sopStageId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "completionPercent" INTEGER NOT NULL DEFAULT 0,
    "missingItems" TEXT,
    "validatedAt" DATETIME,
    "validatedById" INTEGER,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TechnologySOPStatus_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TechnologySOPStatus_sopStageId_fkey" FOREIGN KEY ("sopStageId") REFERENCES "SopStage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reportType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "projectId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "responsibleUnit" TEXT NOT NULL,
    "accountableUnit" TEXT NOT NULL,
    "consultedUnits" TEXT,
    "informedUnits" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportSubmission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reportId" INTEGER NOT NULL,
    "labId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dataJson" TEXT,
    "submittedAt" DATETIME,
    "reviewedAt" DATETIME,
    "reviewedById" INTEGER,
    "reviewRemarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReportSubmission_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportSubmission_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReportSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Query" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "queryType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "targetLabId" INTEGER,
    "projectId" INTEGER,
    "technologyId" INTEGER,
    "reportId" INTEGER,
    "sopStageId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "dueAt" DATETIME,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Query_targetLabId_fkey" FOREIGN KEY ("targetLabId") REFERENCES "Lab" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Query_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Query_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Query_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Query_sopStageId_fkey" FOREIGN KEY ("sopStageId") REFERENCES "SopStage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Query_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QueryResponse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "queryId" INTEGER NOT NULL,
    "response" TEXT NOT NULL,
    "respondedByUserId" INTEGER,
    "respondedByLabId" INTEGER,
    "evidenceRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QueryResponse_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "Query" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QueryResponse_respondedByUserId_fkey" FOREIGN KEY ("respondedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QueryResponse_respondedByLabId_fkey" FOREIGN KEY ("respondedByLabId") REFERENCES "Lab" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Note" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "noteType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "targetLabId" INTEGER,
    "entityType" TEXT,
    "entityId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Note_targetLabId_fkey" FOREIGN KEY ("targetLabId") REFERENCES "Lab" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Note_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "evidenceType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "technologyId" INTEGER,
    "projectId" INTEGER,
    "labId" INTEGER,
    "fileName" TEXT,
    "filePath" TEXT,
    "certifiedBy" TEXT,
    "certificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "uploadedById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Evidence_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evidence_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RaciAssignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activityKey" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "responsibleUnit" TEXT NOT NULL,
    "accountableUnit" TEXT NOT NULL,
    "consultedUnits" TEXT,
    "informedUnits" TEXT,
    "source" TEXT NOT NULL DEFAULT 'SOP_V1',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "ExcelTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SopDataRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "recordType" TEXT NOT NULL,
    "labId" INTEGER NOT NULL,
    "technologyId" INTEGER,
    "projectId" INTEGER,
    "projectTechnologyId" INTEGER,
    "periodLabel" TEXT,
    "dataJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdByType" TEXT NOT NULL,
    "createdById" INTEGER,
    "sourceRecordId" INTEGER,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SopDataRecord_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SopDataRecord_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SopDataRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SopDataRecord_projectTechnologyId_fkey" FOREIGN KEY ("projectTechnologyId") REFERENCES "ProjectTechnology" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SopRecordHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sopDataRecordId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "previousData" TEXT,
    "revisedData" TEXT NOT NULL,
    "reason" TEXT,
    "actorType" TEXT NOT NULL,
    "actorUserId" INTEGER,
    "actorLabId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SopRecordHistory_sopDataRecordId_fkey" FOREIGN KEY ("sopDataRecordId") REFERENCES "SopDataRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentAnalysis" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "documentId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'LOCAL_RULES',
    "model" TEXT,
    "detectedType" TEXT,
    "summary" TEXT,
    "localExtractJson" TEXT,
    "resultJson" TEXT,
    "confidence" REAL,
    "error" TEXT,
    "requestedByUserId" INTEGER,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentAnalysis_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentAnalysis_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowPacket" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "referenceNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "packetType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ANALYZING',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "currentUnit" TEXT,
    "labId" INTEGER NOT NULL,
    "technologyId" INTEGER,
    "sopStageId" INTEGER,
    "submittedByType" TEXT NOT NULL,
    "submittedByUserId" INTEGER,
    "submittedByLabId" INTEGER,
    "aiSummary" TEXT,
    "analysisJson" TEXT,
    "routeReason" TEXT,
    "dueAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkflowPacket_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkflowPacket_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkflowPacket_sopStageId_fkey" FOREIGN KEY ("sopStageId") REFERENCES "SopStage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkflowPacket_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowDocument" (
    "packetId" INTEGER NOT NULL,
    "documentId" INTEGER NOT NULL,

    PRIMARY KEY ("packetId", "documentId"),
    CONSTRAINT "WorkflowDocument_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "WorkflowPacket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkflowDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "packetId" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "unitRole" TEXT NOT NULL,
    "raciType" TEXT NOT NULL DEFAULT 'RESPONSIBLE',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "instructions" TEXT,
    "assignedUserId" INTEGER,
    "receivedAt" DATETIME,
    "completedAt" DATETIME,
    "decision" TEXT,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkflowStep_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "WorkflowPacket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkflowStep_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "packetId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "fromUnit" TEXT,
    "toUnit" TEXT,
    "comments" TEXT,
    "actorType" TEXT NOT NULL,
    "actorUserId" INTEGER,
    "actorLabId" INTEGER,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowEvent_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "WorkflowPacket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkflowEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TechnologyRevisionRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technologyId" INTEGER NOT NULL,
    "labId" INTEGER NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "instructions" TEXT NOT NULL,
    "requestedFieldsJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "labResponse" TEXT,
    "dueAt" DATETIME,
    "submittedAt" DATETIME,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TechnologyRevisionRequest_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TechnologyRevisionRequest_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TechnologyRevisionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_accountStatus_idx" ON "User"("accountStatus");

-- CreateIndex
CREATE INDEX "User_assignedLabId_idx" ON "User"("assignedLabId");

-- CreateIndex
CREATE UNIQUE INDEX "Lab_name_key" ON "Lab"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Lab_code_key" ON "Lab"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Lab_labId_key" ON "Lab"("labId");

-- CreateIndex
CREATE UNIQUE INDEX "Lab_officialEmail_key" ON "Lab"("officialEmail");

-- CreateIndex
CREATE INDEX "Lab_accountStatus_idx" ON "Lab"("accountStatus");

-- CreateIndex
CREATE INDEX "Lab_name_idx" ON "Lab"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetCategory_name_key" ON "DatasetCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetCategory_slug_key" ON "DatasetCategory"("slug");

-- CreateIndex
CREATE INDEX "DatasetImport_categoryId_createdAt_idx" ON "DatasetImport"("categoryId", "createdAt");

-- CreateIndex
CREATE INDEX "DatasetImport_status_idx" ON "DatasetImport"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Technology_sourceKey_key" ON "Technology"("sourceKey");

-- CreateIndex
CREATE INDEX "Technology_labId_name_idx" ON "Technology"("labId", "name");

-- CreateIndex
CREATE INDEX "Technology_datasetCategoryId_status_idx" ON "Technology"("datasetCategoryId", "status");

-- CreateIndex
CREATE INDEX "Technology_sector_idx" ON "Technology"("sector");

-- CreateIndex
CREATE INDEX "Technology_piName_idx" ON "Technology"("piName");

-- CreateIndex
CREATE INDEX "Technology_recordScope_approvalStatus_idx" ON "Technology"("recordScope", "approvalStatus");

-- CreateIndex
CREATE INDEX "Technology_theme_idx" ON "Technology"("theme");

-- CreateIndex
CREATE INDEX "Technology_commercialisationStage_idx" ON "Technology"("commercialisationStage");

-- CreateIndex
CREATE INDEX "Technology_recordFinancialYear_idx" ON "Technology"("recordFinancialYear");

-- CreateIndex
CREATE INDEX "TechnologyFinancialYear_financialYear_recordType_idx" ON "TechnologyFinancialYear"("financialYear", "recordType");

-- CreateIndex
CREATE INDEX "TechnologyFinancialYear_technologyId_financialYear_idx" ON "TechnologyFinancialYear"("technologyId", "financialYear");

-- CreateIndex
CREATE UNIQUE INDEX "TechnologyFinancialYear_technologyId_financialYear_recordType_key" ON "TechnologyFinancialYear"("technologyId", "financialYear", "recordType");

-- CreateIndex
CREATE INDEX "ChangeRequest_labId_status_idx" ON "ChangeRequest"("labId", "status");

-- CreateIndex
CREATE INDEX "ChangeRequest_technologyId_idx" ON "ChangeRequest"("technologyId");

-- CreateIndex
CREATE INDEX "ChangeRequest_status_createdAt_idx" ON "ChangeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ApprovalHistory_changeRequestId_createdAt_idx" ON "ApprovalHistory"("changeRequestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Document_sourceKey_key" ON "Document"("sourceKey");

-- CreateIndex
CREATE INDEX "Document_entityType_entityId_isCurrent_idx" ON "Document"("entityType", "entityId", "isCurrent");

-- CreateIndex
CREATE INDEX "Document_technologyId_idx" ON "Document"("technologyId");

-- CreateIndex
CREATE INDEX "Document_coDevelopmentProjectId_idx" ON "Document"("coDevelopmentProjectId");

-- CreateIndex
CREATE INDEX "Document_mouId_idx" ON "Document"("mouId");

-- CreateIndex
CREATE INDEX "Document_governanceProjectId_idx" ON "Document"("governanceProjectId");

-- CreateIndex
CREATE INDEX "Document_versionGroup_version_idx" ON "Document"("versionGroup", "version");

-- CreateIndex
CREATE INDEX "Document_uploadedByLabId_idx" ON "Document"("uploadedByLabId");

-- CreateIndex
CREATE INDEX "Notification_recipientLabId_read_createdAt_idx" ON "Notification"("recipientLabId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_read_createdAt_idx" ON "Notification"("recipientUserId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorLabId_createdAt_idx" ON "AuditLog"("actorLabId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "LoginHistory_userId_createdAt_idx" ON "LoginHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LoginHistory_labId_createdAt_idx" ON "LoginHistory"("labId", "createdAt");

-- CreateIndex
CREATE INDEX "LoginHistory_success_createdAt_idx" ON "LoginHistory"("success", "createdAt");

-- CreateIndex
CREATE INDEX "TechnologyRequest_technologyId_status_idx" ON "TechnologyRequest"("technologyId", "status");

-- CreateIndex
CREATE INDEX "TechnologyRequest_organizationId_createdAt_idx" ON "TechnologyRequest"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "TechnologyRequest_headStatus_createdAt_idx" ON "TechnologyRequest"("headStatus", "createdAt");

-- CreateIndex
CREATE INDEX "ProblemStatement_organizationId_createdAt_idx" ON "ProblemStatement"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ProblemStatement_labId_status_idx" ON "ProblemStatement"("labId", "status");

-- CreateIndex
CREATE INDEX "ProblemStatement_headStatus_createdAt_idx" ON "ProblemStatement"("headStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_problemStatementId_key" ON "Proposal"("problemStatementId");

-- CreateIndex
CREATE INDEX "Partnership_organizationId_createdAt_idx" ON "Partnership"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Partnership_labId_status_idx" ON "Partnership"("labId", "status");

-- CreateIndex
CREATE INDEX "Partnership_headStatus_createdAt_idx" ON "Partnership"("headStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CoDevelopmentProject_projectId_key" ON "CoDevelopmentProject"("projectId");

-- CreateIndex
CREATE INDEX "CoDevelopmentProject_labId_status_idx" ON "CoDevelopmentProject"("labId", "status");

-- CreateIndex
CREATE INDEX "CoDevelopmentProject_companyId_idx" ON "CoDevelopmentProject"("companyId");

-- CreateIndex
CREATE INDEX "CoDevelopmentProject_technologyArea_idx" ON "CoDevelopmentProject"("technologyArea");

-- CreateIndex
CREATE INDEX "CoDevelopmentProject_startDate_endDate_idx" ON "CoDevelopmentProject"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "CommercializationDetail_projectId_key" ON "CommercializationDetail"("projectId");

-- CreateIndex
CREATE INDEX "CommercializationDetail_stage_idx" ON "CommercializationDetail"("stage");

-- CreateIndex
CREATE INDEX "CommercializationDetail_patentFiled_patentGranted_idx" ON "CommercializationDetail"("patentFiled", "patentGranted");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialEngagement_referenceNo_key" ON "CommercialEngagement"("referenceNo");

-- CreateIndex
CREATE INDEX "CommercialEngagement_labId_status_updatedAt_idx" ON "CommercialEngagement"("labId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "CommercialEngagement_technologyId_engagementType_idx" ON "CommercialEngagement"("technologyId", "engagementType");

-- CreateIndex
CREATE INDEX "CommercialEngagement_engagementType_status_idx" ON "CommercialEngagement"("engagementType", "status");

-- CreateIndex
CREATE INDEX "CommercialManDay_engagementId_displayOrder_idx" ON "CommercialManDay"("engagementId", "displayOrder");

-- CreateIndex
CREATE INDEX "ProjectDeliverable_projectId_status_idx" ON "ProjectDeliverable"("projectId", "status");

-- CreateIndex
CREATE INDEX "ProjectDeliverable_type_idx" ON "ProjectDeliverable"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Mou_mouNumber_key" ON "Mou"("mouNumber");

-- CreateIndex
CREATE INDEX "Mou_companyId_status_idx" ON "Mou"("companyId", "status");

-- CreateIndex
CREATE INDEX "Mou_labId_status_idx" ON "Mou"("labId", "status");

-- CreateIndex
CREATE INDEX "Mou_projectId_idx" ON "Mou"("projectId");

-- CreateIndex
CREATE INDEX "Mou_expiryDate_status_idx" ON "Mou"("expiryDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Project_status_name_idx" ON "Project"("status", "name");

-- CreateIndex
CREATE INDEX "Project_projectType_idx" ON "Project"("projectType");

-- CreateIndex
CREATE INDEX "ProjectTechnology_technologyId_idx" ON "ProjectTechnology"("technologyId");

-- CreateIndex
CREATE INDEX "ProjectTechnology_projectId_projectStatus_idx" ON "ProjectTechnology"("projectId", "projectStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTechnology_projectId_technologyId_key" ON "ProjectTechnology"("projectId", "technologyId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceList_key_key" ON "ReferenceList"("key");

-- CreateIndex
CREATE INDEX "ReferenceOption_listId_active_displayOrder_idx" ON "ReferenceOption"("listId", "active", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceOption_listId_value_key" ON "ReferenceOption"("listId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Sop_code_key" ON "Sop"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SopStage_code_key" ON "SopStage"("code");

-- CreateIndex
CREATE INDEX "SopStage_sopId_mandatoryForNew_idx" ON "SopStage"("sopId", "mandatoryForNew");

-- CreateIndex
CREATE UNIQUE INDEX "SopStage_sopId_stageNumber_key" ON "SopStage"("sopId", "stageNumber");

-- CreateIndex
CREATE INDEX "TechnologyParameter_projectId_active_displayOrder_idx" ON "TechnologyParameter"("projectId", "active", "displayOrder");

-- CreateIndex
CREATE INDEX "TechnologyParameter_sopStageId_idx" ON "TechnologyParameter"("sopStageId");

-- CreateIndex
CREATE UNIQUE INDEX "TechnologyParameter_key_projectId_version_key" ON "TechnologyParameter"("key", "projectId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ParameterOption_parameterId_value_key" ON "ParameterOption"("parameterId", "value");

-- CreateIndex
CREATE INDEX "TechnologyParameterValue_projectTechnologyId_idx" ON "TechnologyParameterValue"("projectTechnologyId");

-- CreateIndex
CREATE UNIQUE INDEX "TechnologyParameterValue_technologyId_parameterId_scopeKey_key" ON "TechnologyParameterValue"("technologyId", "parameterId", "scopeKey");

-- CreateIndex
CREATE INDEX "TechnologySOPStatus_status_updatedAt_idx" ON "TechnologySOPStatus"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TechnologySOPStatus_technologyId_sopStageId_key" ON "TechnologySOPStatus"("technologyId", "sopStageId");

-- CreateIndex
CREATE INDEX "Report_reportType_dueDate_status_idx" ON "Report"("reportType", "dueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reportType_periodLabel_projectId_key" ON "Report"("reportType", "periodLabel", "projectId");

-- CreateIndex
CREATE INDEX "ReportSubmission_labId_status_idx" ON "ReportSubmission"("labId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReportSubmission_reportId_labId_key" ON "ReportSubmission"("reportId", "labId");

-- CreateIndex
CREATE INDEX "Query_targetLabId_status_createdAt_idx" ON "Query"("targetLabId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Query_queryType_status_idx" ON "Query"("queryType", "status");

-- CreateIndex
CREATE INDEX "QueryResponse_queryId_createdAt_idx" ON "QueryResponse"("queryId", "createdAt");

-- CreateIndex
CREATE INDEX "Note_targetLabId_active_createdAt_idx" ON "Note"("targetLabId", "active", "createdAt");

-- CreateIndex
CREATE INDEX "Evidence_entityType_entityId_idx" ON "Evidence"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Evidence_technologyId_idx" ON "Evidence"("technologyId");

-- CreateIndex
CREATE INDEX "Evidence_projectId_idx" ON "Evidence"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "RaciAssignment_activityKey_key" ON "RaciAssignment"("activityKey");

-- CreateIndex
CREATE INDEX "ExcelTemplate_active_effectiveFrom_idx" ON "ExcelTemplate"("active", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "ExcelTemplate_name_version_key" ON "ExcelTemplate"("name", "version");

-- CreateIndex
CREATE INDEX "SopDataRecord_recordType_labId_status_idx" ON "SopDataRecord"("recordType", "labId", "status");

-- CreateIndex
CREATE INDEX "SopDataRecord_projectId_technologyId_idx" ON "SopDataRecord"("projectId", "technologyId");

-- CreateIndex
CREATE INDEX "SopRecordHistory_sopDataRecordId_createdAt_idx" ON "SopRecordHistory"("sopDataRecordId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentAnalysis_documentId_createdAt_idx" ON "DocumentAnalysis"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentAnalysis_status_createdAt_idx" ON "DocumentAnalysis"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowPacket_referenceNo_key" ON "WorkflowPacket"("referenceNo");

-- CreateIndex
CREATE INDEX "WorkflowPacket_labId_status_createdAt_idx" ON "WorkflowPacket"("labId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowPacket_currentUnit_status_updatedAt_idx" ON "WorkflowPacket"("currentUnit", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "WorkflowPacket_technologyId_idx" ON "WorkflowPacket"("technologyId");

-- CreateIndex
CREATE INDEX "WorkflowDocument_documentId_idx" ON "WorkflowDocument"("documentId");

-- CreateIndex
CREATE INDEX "WorkflowStep_unitRole_status_updatedAt_idx" ON "WorkflowStep"("unitRole", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStep_packetId_sequence_key" ON "WorkflowStep"("packetId", "sequence");

-- CreateIndex
CREATE INDEX "WorkflowEvent_packetId_createdAt_idx" ON "WorkflowEvent"("packetId", "createdAt");

-- CreateIndex
CREATE INDEX "TechnologyRevisionRequest_labId_status_createdAt_idx" ON "TechnologyRevisionRequest"("labId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "TechnologyRevisionRequest_technologyId_status_idx" ON "TechnologyRevisionRequest"("technologyId", "status");
