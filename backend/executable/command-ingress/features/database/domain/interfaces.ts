export interface GenerateDatabasePayload {
    versionId: string;
    projectId: string;
    requirements: any[];
}

export interface TablePositionUpdate {
    tableName: string;
    position: { x: number; y: number };
}

export interface Column {
    name: string;
    type: string;
    length?: string;
    nullable: boolean;
    unique: boolean;
    is_primary_key: boolean;
    is_foreign_key: boolean;
    references?: string;
    default?: string;
    primary_key_order?: number | null;
}

export interface Table {
    name: string;
    description?: string;
    columns: Column[];
    position?: { x: number; y: number };
}

export interface Relationship {
    from_table: string;
    to_table: string;
    type: string;
}

export interface DatabaseSchema {
    name: string;
    description?: string;
    tables: Table[];
    relationships: Relationship[];
}