import DatabaseModel from "../../../../../internal/model/database";
import { Column, Table, DatabaseSchema } from "./interfaces";

export type SQLDialect = 'mysql' | 'postgresql' | 'sqlserver' | 'oracle' | 'sqlite';

export interface SQLGenerationOptions {
    dialect: SQLDialect;
    includeIndexes?: boolean;
    includeComments?: boolean;
    foreignKeyActions?: {
        onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
        onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    };
}

export class SQLGenerationService {
    private readonly SQL_RESERVED_WORDS = new Set([
        'select', 'insert', 'update', 'delete', 'create', 'drop', 'alter', 'table',
        'where', 'from', 'join', 'inner', 'left', 'right', 'outer', 'on',
        'group', 'order', 'by', 'having', 'distinct', 'union', 'all',
        'and', 'or', 'not', 'in', 'exists', 'like', 'between', 'is', 'null',
        'as', 'case', 'when', 'then', 'else', 'end', 'if', 'while', 'for',
        'begin', 'commit', 'rollback', 'transaction', 'index', 'view', 'procedure',
        'function', 'trigger', 'constraint', 'primary', 'foreign', 'key', 'unique',
        'check', 'default', 'auto_increment', 'identity', 'sequence'
    ]);

    /**
     * Generate SQL statements for a database schema
     */
    public async generateSQL(databaseId: string, options: SQLGenerationOptions): Promise<string> {
        const database = await DatabaseModel.findById(databaseId);
        if (!database) {
            throw new Error("Database not found");
        }

        const schema: DatabaseSchema = {
            name: database.name,
            description: database.description,
            tables: database.tables || [],
            relationships: database.relationships || []
        };

        return this.generateSQLFromSchema(schema, options);
    }

    /**
     * Generate SQL from schema object
     */
    public generateSQLFromSchema(schema: DatabaseSchema, options: SQLGenerationOptions): string {
        const { dialect, includeIndexes = true, includeComments = true, foreignKeyActions } = options;

        let sql = '';

        // Add header comment
        if (includeComments) {
            sql += this.generateHeaderComment(schema, dialect);
        }

        // Generate CREATE TABLE statements
        const tableStatements: string[] = [];
        const indexStatements: string[] = [];
        const foreignKeyStatements: string[] = [];

        for (const table of schema.tables) {
            const tableSQL = this.generateCreateTable(table, dialect, foreignKeyActions);
            tableStatements.push(tableSQL);

            // Generate indexes
            if (includeIndexes) {
                const indexes = this.generateIndexes(table, dialect);
                indexStatements.push(...indexes);
            }

            // Generate foreign key constraints (if not inline)
            if (dialect === 'postgresql' || dialect === 'oracle') {
                const fks = this.generateForeignKeyConstraints(table, schema.tables, dialect, foreignKeyActions);
                foreignKeyStatements.push(...fks);
            }
        }

        // Combine all statements
        sql += tableStatements.join('\n\n');

        if (foreignKeyStatements.length > 0) {
            sql += '\n\n' + foreignKeyStatements.join('\n\n');
        }

        if (indexStatements.length > 0) {
            sql += '\n\n' + indexStatements.join('\n\n');
        }

        return sql;
    }

    /**
     * Generate CREATE TABLE statement
     */
    private generateCreateTable(table: Table, dialect: SQLDialect, foreignKeyActions?: SQLGenerationOptions['foreignKeyActions']): string {
        const tableName = this.escapeIdentifier(table.name, dialect);
        const columns: string[] = [];
        const constraints: string[] = [];

        // Process columns
        for (const column of table.columns) {
            const columnDef = this.generateColumnDefinition(column, dialect, foreignKeyActions);
            columns.push(`  ${columnDef}`);
        }

        // Generate PRIMARY KEY constraint
        const primaryKeys = table.columns.filter(col => col.is_primary_key);
        if (primaryKeys.length > 0) {
            const pkColumns = primaryKeys
                .sort((a, b) => (a.primary_key_order || 0) - (b.primary_key_order || 0))
                .map(col => this.escapeIdentifier(col.name, dialect))
                .join(', ');

            if (dialect === 'oracle') {
                constraints.push(`  CONSTRAINT PK_${table.name.toUpperCase()} PRIMARY KEY (${pkColumns})`);
            } else {
                constraints.push(`  PRIMARY KEY (${pkColumns})`);
            }
        }

        // Generate UNIQUE constraints
        const uniqueColumns = table.columns.filter(col => col.unique && !col.is_primary_key);
        for (const col of uniqueColumns) {
            const constraintName = this.generateConstraintName(table.name, col.name, 'UNIQUE', dialect);
            constraints.push(`  ${constraintName} UNIQUE (${this.escapeIdentifier(col.name, dialect)})`);
        }

        // Generate FOREIGN KEY constraints (inline for MySQL, SQL Server, SQLite)
        if (dialect === 'mysql' || dialect === 'sqlserver' || dialect === 'sqlite') {
            const foreignKeys = table.columns.filter(col => col.is_foreign_key && col.references);
            for (const fk of foreignKeys) {
                const referencedTable = this.findTableByName(fk.references!, [table]);
                if (referencedTable) {
                    const referencedPK = this.getPrimaryKeyColumn(referencedTable);
                    const fkSQL = this.generateForeignKeyConstraint(
                        table.name,
                        fk.name,
                        fk.references!,
                        referencedPK.name,
                        dialect,
                        foreignKeyActions
                    );
                    constraints.push(`  ${fkSQL}`);
                }
            }
        }

        // Combine columns and constraints
        const allDefinitions = [...columns, ...constraints];
        let sql = `CREATE TABLE ${tableName} (\n${allDefinitions.join(',\n')}\n)`;

        // Add table options based on dialect
        sql += this.generateTableOptions(table, dialect);

        return sql;
    }

    /**
     * Generate column definition
     */
    private generateColumnDefinition(column: Column, dialect: SQLDialect, foreignKeyActions?: SQLGenerationOptions['foreignKeyActions']): string {
        const columnName = this.escapeIdentifier(column.name, dialect);
        const dataType = this.mapDataType(column.type, dialect, column.length);

        let definition = `${columnName} ${dataType}`;

        // NOT NULL constraint
        if (!column.nullable) {
            definition += ' NOT NULL';
        }

        // AUTO_INCREMENT / IDENTITY
        if (column.is_primary_key && this.isIntegerType(column.type)) {
            if (dialect === 'mysql') {
                definition += ' AUTO_INCREMENT';
            } else if (dialect === 'sqlserver') {
                definition += ' IDENTITY(1,1)';
            } else if (dialect === 'postgresql') {
                // PostgreSQL uses SERIAL or sequences
                if (column.type === 'INT') {
                    definition = definition.replace('INT', 'SERIAL');
                } else if (column.type === 'BIGINT') {
                    definition = definition.replace('BIGINT', 'BIGSERIAL');
                }
            } else if (dialect === 'sqlite') {
                definition += ' PRIMARY KEY AUTOINCREMENT';
            }
        }

        // DEFAULT value
        if (column.default) {
            definition += ` DEFAULT ${this.formatDefaultValue(column.default, column.type, dialect)}`;
        }

        // UNIQUE constraint (inline, if not already in constraints)
        if (column.unique && !column.is_primary_key && dialect !== 'oracle') {
            definition += ' UNIQUE';
        }

        return definition;
    }

    /**
     * Generate FOREIGN KEY constraint
     */
    private generateForeignKeyConstraint(
        tableName: string,
        columnName: string,
        referencedTable: string,
        referencedColumn: string,
        dialect: SQLDialect,
        foreignKeyActions?: SQLGenerationOptions['foreignKeyActions']
    ): string {
        const constraintName = this.generateConstraintName(tableName, columnName, 'FK', dialect);
        const tableNameEscaped = this.escapeIdentifier(tableName, dialect);
        const columnNameEscaped = this.escapeIdentifier(columnName, dialect);
        const refTableEscaped = this.escapeIdentifier(referencedTable, dialect);
        const refColumnEscaped = this.escapeIdentifier(referencedColumn, dialect);

        let fkSQL = '';

        if (dialect === 'oracle') {
            fkSQL = `CONSTRAINT ${constraintName} FOREIGN KEY (${columnNameEscaped}) REFERENCES ${refTableEscaped}(${refColumnEscaped})`;
        } else {
            fkSQL = `FOREIGN KEY (${columnNameEscaped}) REFERENCES ${refTableEscaped}(${refColumnEscaped})`;
        }

        // Add ON DELETE and ON UPDATE actions
        const onDelete = foreignKeyActions?.onDelete || 'RESTRICT';
        const onUpdate = foreignKeyActions?.onUpdate || 'RESTRICT';

        if (dialect === 'sqlite') {
            // SQLite only supports RESTRICT, NO ACTION, SET NULL, CASCADE
            if (onDelete !== 'NO ACTION') {
                fkSQL += ` ON DELETE ${onDelete}`;
            }
            if (onUpdate !== 'NO ACTION') {
                fkSQL += ` ON UPDATE ${onUpdate}`;
            }
        } else {
            fkSQL += ` ON DELETE ${onDelete}`;
            fkSQL += ` ON UPDATE ${onUpdate}`;
        }

        return fkSQL;
    }

    /**
     * Generate FOREIGN KEY constraints separately (for PostgreSQL, Oracle)
     */
    private generateForeignKeyConstraints(
        table: Table,
        allTables: Table[],
        dialect: SQLDialect,
        foreignKeyActions?: SQLGenerationOptions['foreignKeyActions']
    ): string[] {
        const constraints: string[] = [];
        const foreignKeys = table.columns.filter(col => col.is_foreign_key && col.references);

        for (const fk of foreignKeys) {
            const referencedTable = this.findTableByName(fk.references!, allTables);
            if (referencedTable) {
                const referencedPK = this.getPrimaryKeyColumn(referencedTable);
                const constraintName = this.generateConstraintName(table.name, fk.name, 'FK', dialect);
                const tableNameEscaped = this.escapeIdentifier(table.name, dialect);
                const columnNameEscaped = this.escapeIdentifier(fk.name, dialect);
                const refTableEscaped = this.escapeIdentifier(fk.references!, dialect);
                const refColumnEscaped = this.escapeIdentifier(referencedPK.name, dialect);

                const onDelete = foreignKeyActions?.onDelete || 'RESTRICT';
                const onUpdate = foreignKeyActions?.onUpdate || 'RESTRICT';

                let sql = `ALTER TABLE ${tableNameEscaped} ADD CONSTRAINT ${constraintName} `;
                sql += `FOREIGN KEY (${columnNameEscaped}) REFERENCES ${refTableEscaped}(${refColumnEscaped})`;
                sql += ` ON DELETE ${onDelete} ON UPDATE ${onUpdate}`;

                constraints.push(sql);
            }
        }

        return constraints;
    }

    /**
     * Generate indexes
     */
    private generateIndexes(table: Table, dialect: SQLDialect): string[] {
        const indexes: string[] = [];

        // Index on foreign keys
        const foreignKeys = table.columns.filter(col => col.is_foreign_key);
        for (const fk of foreignKeys) {
            const indexName = this.generateIndexName(table.name, fk.name, dialect, 'IDX');
            const tableNameEscaped = this.escapeIdentifier(table.name, dialect);
            const columnNameEscaped = this.escapeIdentifier(fk.name, dialect);

            indexes.push(`CREATE INDEX ${indexName} ON ${tableNameEscaped}(${columnNameEscaped});`);
        }

        // Index on unique columns (if not primary key)
        const uniqueColumns = table.columns.filter(col => col.unique && !col.is_primary_key);
        for (const col of uniqueColumns) {
            const indexName = this.generateIndexName(table.name, col.name, dialect, 'UNIQUE');
            const tableNameEscaped = this.escapeIdentifier(table.name, dialect);
            const columnNameEscaped = this.escapeIdentifier(col.name, dialect);

            if (dialect === 'postgresql' || dialect === 'oracle') {
                indexes.push(`CREATE UNIQUE INDEX ${indexName} ON ${tableNameEscaped}(${columnNameEscaped});`);
            } else {
                indexes.push(`CREATE UNIQUE INDEX ${indexName} ON ${tableNameEscaped}(${columnNameEscaped});`);
            }
        }

        return indexes;
    }

    /**
     * Map data types to dialect-specific types
     */
    private mapDataType(originalType: string, dialect: SQLDialect, length?: string): string {
        const baseType = originalType.toUpperCase().split('(')[0];
        const lengthPart = length ? `(${length})` : '';

        const typeMap: Record<string, Record<SQLDialect, string>> = {
            'VARCHAR': {
                mysql: `VARCHAR${lengthPart || '(255)'}`,
                postgresql: `VARCHAR${lengthPart || ''}`,
                sqlserver: `VARCHAR${lengthPart || '(255)'}`,
                oracle: `VARCHAR2${lengthPart || '(255)'}`,
                sqlite: `TEXT`
            },
            'TEXT': {
                mysql: 'TEXT',
                postgresql: 'TEXT',
                sqlserver: 'NVARCHAR(MAX)',
                oracle: 'CLOB',
                sqlite: 'TEXT'
            },
            'INT': {
                mysql: 'INT',
                postgresql: 'INTEGER',
                sqlserver: 'INT',
                oracle: 'NUMBER(10)',
                sqlite: 'INTEGER'
            },
            'BIGINT': {
                mysql: 'BIGINT',
                postgresql: 'BIGINT',
                sqlserver: 'BIGINT',
                oracle: 'NUMBER(19)',
                sqlite: 'INTEGER'
            },
            'DECIMAL': {
                mysql: `DECIMAL${lengthPart || '(10,2)'}`,
                postgresql: `DECIMAL${lengthPart || '(10,2)'}`,
                sqlserver: `DECIMAL${lengthPart || '(10,2)'}`,
                oracle: `NUMBER${lengthPart || '(10,2)'}`,
                sqlite: `REAL`
            },
            'DATETIME': {
                mysql: 'DATETIME',
                postgresql: 'TIMESTAMP',
                sqlserver: 'DATETIME2',
                oracle: 'TIMESTAMP',
                sqlite: 'TEXT'
            },
            'DATE': {
                mysql: 'DATE',
                postgresql: 'DATE',
                sqlserver: 'DATE',
                oracle: 'DATE',
                sqlite: 'TEXT'
            },
            'TINYINT': {
                mysql: 'TINYINT(1)',
                postgresql: 'BOOLEAN',
                sqlserver: 'BIT',
                oracle: 'NUMBER(1)',
                sqlite: 'INTEGER'
            },
            'BOOLEAN': {
                mysql: 'TINYINT(1)',
                postgresql: 'BOOLEAN',
                sqlserver: 'BIT',
                oracle: 'NUMBER(1)',
                sqlite: 'INTEGER'
            }
        };

        return typeMap[baseType]?.[dialect] || originalType;
    }

    /**
     * Format default value based on dialect
     */
    private formatDefaultValue(defaultValue: string, columnType: string, dialect: SQLDialect): string {
        const lowerValue = defaultValue.toLowerCase().trim();

        // SQL functions
        if (['current_timestamp', 'now()', 'current_date', 'current_time'].includes(lowerValue)) {
            if (dialect === 'mysql') {
                return 'CURRENT_TIMESTAMP';
            } else if (dialect === 'postgresql') {
                return 'CURRENT_TIMESTAMP';
            } else if (dialect === 'sqlserver') {
                return 'GETDATE()';
            } else if (dialect === 'oracle') {
                return 'SYSTIMESTAMP';
            } else {
                return "datetime('now')";
            }
        }

        // NULL
        if (lowerValue === 'null') {
            return 'NULL';
        }

        // Boolean
        if (['true', 'false'].includes(lowerValue)) {
            if (dialect === 'postgresql') {
                return lowerValue.toUpperCase();
            } else if (dialect === 'mysql' || dialect === 'sqlite') {
                return lowerValue === 'true' ? '1' : '0';
            } else {
                return lowerValue === 'true' ? '1' : '0';
            }
        }

        // String types need quotes
        if (['VARCHAR', 'CHAR', 'TEXT'].some(t => columnType.toUpperCase().includes(t))) {
            if (!defaultValue.startsWith("'") && !defaultValue.endsWith("'")) {
                return `'${defaultValue.replace(/'/g, "''")}'`;
            }
        }

        return defaultValue;
    }

    /**
     * Escape identifier based on dialect
     */
    private escapeIdentifier(identifier: string, dialect: SQLDialect): string {
        // Check if it's a reserved word
        if (this.SQL_RESERVED_WORDS.has(identifier.toLowerCase())) {
            console.warn(`⚠️ Identifier '${identifier}' is a SQL reserved word`);
        }

        switch (dialect) {
            case 'mysql':
                return `\`${identifier}\``;
            case 'sqlserver':
                return `[${identifier}]`;
            case 'postgresql':
            case 'oracle':
            case 'sqlite':
                return `"${identifier}"`;
            default:
                return identifier;
        }
    }

    /**
     * Generate constraint name
     */
    private generateConstraintName(tableName: string, columnName: string, type: string, dialect: SQLDialect): string {
        const prefix = type === 'FK' ? 'FK' : type === 'UNIQUE' ? 'UQ' : 'PK';
        const name = `${prefix}_${tableName}_${columnName}`.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

        // Oracle has 30 char limit
        if (dialect === 'oracle' && name.length > 30) {
            return name.substring(0, 30);
        }

        return name;
    }

    /**
     * Generate index name
     */
    private generateIndexName(tableName: string, columnName: string, dialect: SQLDialect, type: string | 'UNIQUE' = 'IDX'): string {
        const prefix = type === 'UNIQUE' ? 'UQ' : 'IDX';
        const name = `${prefix}_${tableName}_${columnName}`.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

        // Oracle has 30 char limit
        if (dialect === 'oracle' && name.length > 30) {
            return name.substring(0, 30);
        }

        return this.escapeIdentifier(name, dialect);
    }

    /**
     * Generate table options
     */
    private generateTableOptions(table: Table, dialect: SQLDialect): string {
        switch (dialect) {
            case 'mysql':
                return ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;';
            case 'postgresql':
            case 'oracle':
            case 'sqlserver':
            case 'sqlite':
                return ';';
            default:
                return ';';
        }
    }

    /**
     * Generate header comment
     */
    private generateHeaderComment(schema: DatabaseSchema, dialect: SQLDialect): string {
        const comment = `-- SQL Script Generated for ${schema.name}\n`;
        const dialectComment = `-- Dialect: ${dialect.toUpperCase()}\n`;
        const dateComment = `-- Generated: ${new Date().toISOString()}\n`;
        const description = schema.description ? `-- Description: ${schema.description}\n` : '';

        return `-- ============================================\n${comment}${dialectComment}${dateComment}${description}-- ============================================\n\n`;
    }

    /**
     * Helper methods
     */
    private isIntegerType(type: string): boolean {
        return ['INT', 'BIGINT', 'SMALLINT', 'TINYINT'].some(t => type.toUpperCase().includes(t));
    }

    private findTableByName(name: string, tables: Table[]): Table | undefined {
        return tables.find(t => t.name === name);
    }

    private getPrimaryKeyColumn(table: Table): Column {
        const primaryKeys = table.columns.filter(col => col.is_primary_key);
        if (primaryKeys.length === 0) {
            throw new Error(`Table ${table.name} has no primary key`);
        }
        // Return first PK (or sorted by order for composite)
        return primaryKeys.sort((a, b) => (a.primary_key_order || 0) - (b.primary_key_order || 0))[0];
    }
}

