import { DatabaseCoreService } from "./DatabaseCoreService";
import { TableManagementService } from "./TableManagementService";
import { RelationshipService } from "./RelationshipService";
import { KeyManagementService } from "./KeyManagementService";
import { TableValidationService } from "./TableValidationService";
import { GenerateDatabasePayload, TablePositionUpdate } from "./interfaces";
import { VersionService } from "../../version/domain/service";
import { LogService } from "../../log/domain/service";
import {PreviewChangeDto} from "../../version/adapter/preview.dto";
import { ServiceResponse, ResponseStatus } from '../../../services/serviceResponse';
import version from "../../../../../internal/model/version";
import User from "../../../../../internal/model/user";

export class DatabaseService {
    private coreService: DatabaseCoreService;
    private tableService: TableManagementService;
    private relationshipService: RelationshipService;
    private keyService: KeyManagementService;
    private validationService: TableValidationService;
    private versionService: VersionService;
    private logService: LogService;

    constructor() {
        this.coreService = new DatabaseCoreService();
        this.tableService = new TableManagementService();
        this.relationshipService = new RelationshipService();
        this.keyService = new KeyManagementService();
        this.validationService = new TableValidationService();
        this.versionService = new VersionService();
        this.logService = new LogService();
    }

    // Database Core Methods
    public async generateSchemaFromRequirements(userId:string,payload: GenerateDatabasePayload) {
        return this.coreService.generateSchemaFromRequirements(userId,payload);
    }

    public async getDatabasesByVersion(versionId: string) {
        return this.coreService.getDatabasesByVersion(versionId);
    }

    public async getDatabaseById(databaseId: string) {
        return this.coreService.getDatabaseById(databaseId);
    }

    public async updateDatabase(userId:string, databaseId: string, updateData: any) {
        return this.coreService.updateDatabase(userId,databaseId, updateData);
    }

    public async deleteDatabase(userId:string,databaseId: string) {
        return this.coreService.deleteDatabase(userId,databaseId);
    }

    public async getDatabaseStats(databaseId: string) {
        return this.coreService.getDatabaseStats(databaseId);
    }

    public async exportDatabaseSQL(databaseId: string) {
        return this.coreService.exportDatabaseSQL(databaseId);
    }

    // Table Management Methods
    public async addTableToDatabase(userId:string,databaseId: string, tableData: any) {
        return this.tableService.addTableToDatabase(userId,databaseId, tableData);
    }

    public async updateTableInDatabase(userId:string, databaseId: string, tableName: string, tableData: any) {
        return this.tableService.updateTableInDatabase(userId, databaseId, tableName, tableData);
    }

    public async deleteTableFromDatabase(userId:string, databaseId: string, tableName: string) {
        return this.tableService.deleteTableFromDatabase(userId, databaseId, tableName);
    }

    public async updateTablePosition(databaseId: string, tableName: string, position: { x: number; y: number }) {
        return this.tableService.updateTablePosition(databaseId, tableName, position);
    }

    public async updateMultipleTablePositions(databaseId: string, positionUpdates: TablePositionUpdate[]) {
        return this.tableService.updateMultipleTablePositions(databaseId, positionUpdates);
    }

    // Relationship Methods
    public async getDatabaseWithReferences(databaseId: string) {
        return this.relationshipService.getDatabaseWithReferences(databaseId);
    }

    public async getTableRelationships(databaseId: string, tableName: string) {
        return this.relationshipService.getTableRelationships(databaseId, tableName);
    }

    public async getAvailableTablesForReferences(databaseId: string, excludeTable?: string) {
        return this.relationshipService.getAvailableTablesForReferences(databaseId, excludeTable);
    }

    // Key Management Methods
    public async getCompositeKeyInfo(databaseId: string, tableName: string) {
        return this.keyService.getCompositeKeyInfo(databaseId, tableName);
    }

    public async createCompositeKey(databaseId: string, tableName: string, columnNames: string[]) {
        return this.keyService.createCompositeKey(databaseId, tableName, columnNames);
    }

    public async convertToSingleKey(databaseId: string, tableName: string, primaryKeyColumnName: string) {
        return this.keyService.convertToSingleKey(databaseId, tableName, primaryKeyColumnName);
    }

    // Validation Methods (exposed for external use if needed)
    public async validateForeignKeyConstraint(
        databaseId: string,
        tableName: string,
        columnName: string,
        referencedTable: string,
        columnType: string
    ) {
        return this.validationService.validateForeignKeyConstraint(
            databaseId, tableName, columnName, referencedTable, columnType
        );
    }

    public validateTableStructure(tableData: any) {
        return this.validationService.validateTableStructure(tableData);
    }
}
