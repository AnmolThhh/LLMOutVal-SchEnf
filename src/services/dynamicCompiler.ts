import {z} from "zod";

export interface FieldDefinition {
    type: 'string' | 'number' | 'boolean' ;
    description: string;
}

export interface SchemaBlueprint {
    [fieldName: string]: FieldDefinition;
}

export function generateDynamicSchema( blueprint : SchemaBlueprint) {
    const schemaShape: Record<string, any> = {};

    for (const [fieldName, fieldDef] of Object.entries(blueprint)) {
        if (fieldDef.type === 'string') schemaShape[fieldName] = z.string();
        if (fieldDef.type === 'number') schemaShape[fieldName] = z.number();
        if (fieldDef.type === 'boolean') schemaShape[fieldName] = z.boolean();

        schemaShape[fieldName] = schemaShape[fieldName].describe(fieldDef.description);
    }

    return z.object(schemaShape);
}