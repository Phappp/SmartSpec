import DatabaseModel from "../../../../../internal/model/database";
import { Column, Table } from "./interfaces";

export class TableValidationService {
    /**
     * VALIDATION: Kiểm tra ràng buộc SQL khi xóa/update table
     */
    public async validateTableModification(databaseId: string, tableName: string, action: 'delete' | 'update') {
        const database = await DatabaseModel.findById(databaseId);
        if (!database) throw new Error("Database not found");

        const table = database.tables.find(t => t.name === tableName);
        if (!table) throw new Error("Table not found");

        // Kiểm tra nếu có bảng khác đang reference đến table này (FOREIGN KEY constraints)
        if (action === 'delete') {
            const referencingTables = database.tables.filter(t =>
                t.columns.some(col =>
                    col.is_foreign_key && col.references === tableName
                )
            );

            if (referencingTables.length > 0) {
                const referencingTableNames = referencingTables.map(t => t.name);
                throw new Error(
                    `Cannot delete table '${tableName}' because it is referenced by: ${referencingTableNames.join(', ')}. ` +
                    `Please remove the foreign key constraints first.`
                );
            }
        }

        if (action === 'update') {
            // Kiểm tra nếu có FK đang reference đến bảng này
            const referencingTables = database.tables.filter(t =>
                t.columns.some(col =>
                    col.is_foreign_key && col.references === tableName
                )
            );

            if (referencingTables.length > 0) {
                console.warn(`⚠️ Table '${tableName}' is referenced by ${referencingTables.length} tables. PK changes may require FK updates.`);
            }
        }

        // Kiểm tra PRIMARY KEY constraints - UPDATED FOR COMPOSITE KEY
        const primaryKeys = table.columns.filter(col => col.is_primary_key);
        if (primaryKeys.length === 0) {
            throw new Error(`Table '${tableName}' must have at least one primary key`);
        }

        // Kiểm tra composite key constraints
        if (primaryKeys.length > 1) {
            const invalidPrimaryKeys = primaryKeys.filter(pk => pk.nullable);
            if (invalidPrimaryKeys.length > 0) {
                throw new Error(
                    `Composite primary key columns cannot be nullable: ` +
                    `${invalidPrimaryKeys.map(pk => pk.name).join(', ')}`
                );
            }

            // Kiểm tra primary_key_order
            const orders = primaryKeys.map(pk => pk.primary_key_order).filter(order => order !== null && order !== undefined);
            const uniqueOrders = Array.from(new Set(orders));
            if (uniqueOrders.length !== primaryKeys.length) {
                throw new Error(`Composite primary key must have unique primary_key_order values`);
            }
        }

        return { database, table, primaryKeys };
    }

    /**
     * VALIDATION: Kiểm tra tính hợp lệ của FOREIGN KEY
     */
    public async validateForeignKeyConstraint(
        databaseId: string,
        tableName: string,
        columnName: string,
        referencedTable: string,
        columnType: string
    ) {
        const database = await DatabaseModel.findById(databaseId);
        if (!database) throw new Error("Database not found");

        // 1. Kiểm tra referenced table có tồn tại
        const targetTable = database.tables.find(t => t.name === referencedTable);
        if (!targetTable) {
            throw new Error(`Referenced table '${referencedTable}' does not exist`);
        }

        // 2. Kiểm tra referenced table có PRIMARY KEY (single hoặc composite)
        const targetPrimaryKeys = targetTable.columns.filter(col => col.is_primary_key);
        if (targetPrimaryKeys.length === 0) {
            throw new Error(`Referenced table '${referencedTable}' has no primary key`);
        }

        // 3. Kiểm tra kiểu dữ liệu phải khớp với PRIMARY KEY của bảng được reference
        const matchingPrimaryKey = targetPrimaryKeys.find(pk =>
            columnType === pk.type
        );

        if (!matchingPrimaryKey) {
            throw new Error(
                `Foreign key type mismatch: Column '${columnName}' (${columnType}) must match ` +
                `one of the primary key types in '${referencedTable}' ` +
                `[${targetPrimaryKeys.map(pk => pk.type).join(', ')}]`
            );
        }

        // 4. Kiểm tra length/precision nếu có
        if (columnType === 'DECIMAL' || matchingPrimaryKey.type === 'DECIMAL') {
            const column = database.tables
                .find(t => t.name === tableName)
                ?.columns.find(c => c.name === columnName);

            if (column?.length !== matchingPrimaryKey.length) {
                console.warn(`DECIMAL precision/scale mismatch between foreign key and referenced primary key`);
            }
        }

        // 5. Kiểm tra circular reference
        if (tableName === referencedTable) {
            throw new Error(`Circular reference detected: Table '${tableName}' cannot reference itself`);
        }

        // 6. Cảnh báo đặc biệt cho composite key references
        if (targetPrimaryKeys.length > 1) {
            console.warn(`⚠️ Referenced table '${referencedTable}' has composite primary key. ` +
                `Ensure foreign key relationships are properly defined for all key columns.`);
        }

        return { targetTable, targetPrimaryKeys, matchingPrimaryKey };
    }

    /**
     * VALIDATION: Kiểm tra tính duy nhất của tên bảng và cột
     */
    public validateTableStructure(tableData: Table) {
        // Kiểm tra tên bảng hợp lệ
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableData.name)) {
            throw new Error(`Invalid table name: '${tableData.name}'. Must start with letter or underscore and contain only alphanumeric characters and underscores.`);
        }

        // Kiểm tra độ dài tên bảng
        if (tableData.name.length > 64) {
            throw new Error(`Table name '${tableData.name}' exceeds 64 character limit`);
        }

        // Kiểm tra trùng tên cột trong cùng bảng
        const columnNames = tableData.columns.map((col: Column) => col.name.toLowerCase());
        const duplicateColumns = columnNames.filter((name: string, index: number) =>
            columnNames.indexOf(name) !== index
        );

        if (duplicateColumns.length > 0) {
            throw new Error(`Duplicate column names found: ${Array.from(new Set(duplicateColumns)).join(', ')}`);
        }

        // Kiểm tra mỗi bảng phải có ít nhất một cột
        if (!tableData.columns || tableData.columns.length === 0) {
            throw new Error("Table must have at least one column");
        }

        // VALIDATION PRIMARY KEY - UPDATED FOR COMPOSITE KEY
        const primaryKeyColumns = tableData.columns.filter((col: Column) => col.is_primary_key);

        // Kiểm tra có ít nhất một primary key
        if (primaryKeyColumns.length === 0) {
            throw new Error("Table must have at least one primary key column");
        }

        // Kiểm tra single primary key
        if (primaryKeyColumns.length === 1) {
            const primaryKey = primaryKeyColumns[0];
            if (primaryKey.nullable) {
                throw new Error("Primary key cannot be nullable");
            }
            // Đảm bảo primary_key_order = null cho single key
            primaryKey.primary_key_order = null;
        }

        // Kiểm tra composite primary key
        if (primaryKeyColumns.length > 1) {
            this.validateCompositePrimaryKey(tableData);
        }

        // VALIDATION: Kiểm tra DEFAULT values hợp lệ
        tableData.columns.forEach((column: Column) => {
            this.validateColumnStructure(column, primaryKeyColumns.length);
        });

        // VALIDATION: Cảnh báo performance
        this.validatePerformanceWarnings(tableData);
    }

    /**
     * VALIDATION: Kiểm tra composite primary key
     */
    private validateCompositePrimaryKey(tableData: Table) {
        const primaryKeyColumns = tableData.columns.filter((col: Column) => col.is_primary_key);

        console.log(`🔑 Composite primary key detected with ${primaryKeyColumns.length} columns`);

        // 1. Kiểm tra tất cả primary key columns phải có primary_key_order
        const columnsWithoutOrder = primaryKeyColumns.filter((col: Column) =>
            col.primary_key_order === null || col.primary_key_order === undefined
        );

        if (columnsWithoutOrder.length > 0) {
            throw new Error(
                `Composite primary key columns must have primary_key_order: ` +
                `${columnsWithoutOrder.map((col: Column) => col.name).join(', ')}`
            );
        }

        // 2. Kiểm tra primary_key_order là duy nhất và liên tục
        const orders = primaryKeyColumns
            .map((col: Column) => col.primary_key_order)
            .sort((a: number, b: number) => a - b);

        const uniqueOrders = Array.from(new Set(orders));
        if (uniqueOrders.length !== orders.length) {
            throw new Error("Duplicate primary_key_order values in composite key");
        }

        // 3. Kiểm tra orders bắt đầu từ 1 và liên tục
        for (let i = 0; i < orders.length; i++) {
            if (orders[i] !== i + 1) {
                throw new Error(
                    `Composite key orders must start from 1 and be consecutive. ` +
                    `Found: ${orders.join(', ')}`
                );
            }
        }

        // 4. Kiểm tra không có primary key nào là nullable
        const nullablePrimaryKeys = primaryKeyColumns.filter((col: Column) => col.nullable);
        if (nullablePrimaryKeys.length > 0) {
            throw new Error(
                `Primary key columns cannot be nullable: ` +
                `${nullablePrimaryKeys.map((col: Column) => col.name).join(', ')}`
            );
        }

        // 5. Cảnh báo về performance
        console.warn(`⚠️ Composite primary key may impact performance. Consider using surrogate key.`);

        // 6. Kiểm tra tên cột không trùng
        const columnNames = primaryKeyColumns.map(col => col.name.toLowerCase());
        const duplicateNames = columnNames.filter((name, index) => columnNames.indexOf(name) !== index);
        if (duplicateNames.length > 0) {
            throw new Error(`Duplicate column names in composite key: ${duplicateNames.join(', ')}`);
        }
    }

    /**
     * VALIDATION: Kiểm tra cấu trúc cột
     */
    private validateColumnStructure(column: Column, primaryKeyCount: number) {
        // Kiểm tra độ dài tên cột
        if (column.name.length > 64) {
            throw new Error(`Column name '${column.name}' exceeds 64 character limit`);
        }

        // Kiểm tra tên cột trùng với SQL keywords
        const sqlKeywords = ['select', 'insert', 'update', 'delete', 'where', 'group', 'order', 'table'];
        if (sqlKeywords.includes(column.name.toLowerCase())) {
            console.warn(`⚠️ Column name '${column.name}' is a SQL keyword - may cause issues in queries`);
        }

        // Kiểm tra DEFAULT values
        if (column.default) {
            // Kiểm tra DEFAULT không thể dùng với AUTO_INCREMENT
            if (column.is_primary_key && column.default.toLowerCase().includes('auto_increment')) {
                throw new Error(`Column '${column.name}' cannot have both DEFAULT and AUTO_INCREMENT`);
            }

            // Kiểm tra DEFAULT với kiểu dữ liệu
            if (column.type.includes('INT') && !this.isValidNumericDefault(column.default)) {
                throw new Error(`Invalid DEFAULT value '${column.default}' for numeric column '${column.name}'`);
            }

            if ((column.type === 'BOOLEAN' || column.type === 'TINYINT(1)') &&
                !['true', 'false', '1', '0', 'null'].includes(column.default.toLowerCase())) {
                throw new Error(`Invalid DEFAULT value '${column.default}' for boolean column '${column.name}'`);
            }
        }

        // Kiểm tra FOREIGN KEY constraints
        if (column.is_foreign_key) {
            if (!column.references) {
                throw new Error(`Foreign key column '${column.name}' must reference a table`);
            }
            if (column.nullable === false && !column.default) {
                console.warn(`Foreign key column '${column.name}' is NOT NULL but has no default value`);
            }
        }

        // Kiểm tra UNIQUE constraint
        if (column.unique && column.nullable) {
            console.warn(`UNIQUE constraint on nullable column '${column.name}' may behave differently across databases`);
        }

        // Kiểm tra kiểu dữ liệu và length
        this.validateColumnTypeAndLength(column);

        // Khuyến nghị naming convention
        this.validateNamingConventions(column, primaryKeyCount);
    }

    /**
     * VALIDATION: Kiểm tra kiểu dữ liệu và độ dài
     */
    private validateColumnTypeAndLength(column: Column) {
        if (column.length) {
            if (['TEXT', 'LONGTEXT', 'BLOB', 'LONGBLOB'].includes(column.type) && column.length) {
                throw new Error(`Data type '${column.type}' cannot have length specification`);
            }

            if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT'].includes(column.type)) {
                const length = parseInt(column.length);
                if (length && (length < 1 || length > 255)) {
                    throw new Error(`Invalid length ${column.length} for integer type '${column.type}'`);
                }
            }

            if (column.type === 'VARCHAR' || column.type === 'CHAR') {
                const length = parseInt(column.length);
                if (!length || length < 1 || length > 65535) {
                    throw new Error(`Invalid length ${column.length} for string type '${column.type}'`);
                }
            }

            // Kiểm tra DECIMAL precision/scale
            if (column.type === 'DECIMAL' && column.length) {
                const parts = column.length.split(',');
                if (parts.length !== 2) {
                    throw new Error(`DECIMAL requires format 'precision,scale'`);
                }
                const precision = parseInt(parts[0]);
                const scale = parseInt(parts[1]);
                if (precision < 1 || precision > 65 || scale < 0 || scale > 30 || scale > precision) {
                    throw new Error(`Invalid DECIMAL specification: ${column.length}`);
                }
            }
        }
    }

    /**
     * VALIDATION: Kiểm tra naming conventions
     */
    private validateNamingConventions(column: Column, primaryKeyCount: number) {
        if (column.is_primary_key && !column.name.toLowerCase().endsWith('_id') &&
            column.name.toLowerCase() !== 'id' && primaryKeyCount === 1) {
            console.warn(`💡 Consider naming primary key as 'id' or ending with '_id': ${column.name}`);
        }

        if (column.is_foreign_key && !column.name.toLowerCase().endsWith('_id')) {
            console.warn(`💡 Foreign key columns should typically end with '_id': ${column.name}`);
        }
    }

    /**
     * VALIDATION: Kiểm tra cảnh báo performance
     */
    private validatePerformanceWarnings(tableData: Table) {
        const indexedColumns = tableData.columns.filter((col: Column) =>
            col.is_primary_key || col.unique || col.is_foreign_key
        );

        if (indexedColumns.length > 10) {
            console.warn(`⚠️ Table '${tableData.name}' has ${indexedColumns.length} indexed columns - consider performance impact`);
        }

        // Cảnh báo về large text/BLOB columns
        const largeColumns = tableData.columns.filter((col: Column) =>
            ['TEXT', 'LONGTEXT', 'BLOB', 'LONGBLOB'].includes(col.type)
        );

        if (largeColumns.length > 3) {
            console.warn(`⚠️ Table '${tableData.name}' has ${largeColumns.length} large object columns - consider normalization`);
        }

        // VALIDATION: Logic nghiệp vụ cơ bản
        const hasTimestamps = tableData.columns.some((col: Column) =>
            ['created_at', 'updated_at'].includes(col.name.toLowerCase())
        );

        if (!hasTimestamps) {
            console.warn(`💡 Consider adding 'created_at' and 'updated_at' timestamp columns for audit trail`);
        }

        // Khuyến nghị soft delete
        const hasSoftDelete = tableData.columns.some((col: Column) =>
            col.name.toLowerCase() === 'deleted_at'
        );

        if (!hasSoftDelete) {
            console.warn(`💡 Consider adding 'deleted_at' column for soft delete functionality`);
        }
    }

    private isValidNumericDefault(value: string): boolean {
        if (value.toLowerCase() === 'null') return true;
        return !isNaN(Number(value)) ||
            ['current_timestamp', 'now()'].includes(value.toLowerCase());
    }
}