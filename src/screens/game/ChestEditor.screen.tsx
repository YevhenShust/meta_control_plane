/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Form } from '@rjsf/antd';
import validator from '@rjsf/validator-ajv8';
//import uiSchema from '../../ui/Chest.ui.json';

export default function ChestEditorScreen({ params }: { params?: Record<string, string> }) {
  const chestSchema = {
    title: 'Chest',
    type: 'object',
    properties: {
      // Entity.json (allOf -> inline)
      Id: { type: 'string' },

      // ChestDescriptor.json
      Type: {
        type: 'string',
        enum: ['Common', 'Rare', 'Exotic', 'Epic'],
      },
      InteractDistance: { type: 'integer' },
      LockInteractTime: { type: 'string', format: 'TimeSpan', default: '00:00:00' },

      DropInfo: {
        type: 'object',
        properties: {
          Items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                LootTable: { type: 'string' },
                DropPercent: { type: 'integer' },
              },
            },
          },
          Currency: {
            type: 'object',
            properties: {
              Amount: {
                type: 'object',
                properties: {
                  Min: { type: 'integer' },
                  Max: { type: 'integer' },
                },
              },
              ExpiriencePercent: { type: 'integer' },
            },
          },
          CraftMaterials: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                LootTable: { type: 'string' },
                DropPercent: { type: 'integer' },
              },
            },
          },
        },
        required: ['Items', 'Currency', 'CraftMaterials'],
      },
    },
    required: ['Id', 'LockInteractTime', 'DropInfo'],
  } as const;

const uiFiles = import.meta.glob('/src/**/*.ui.json', { eager: true, import: 'default' }) as Record<string, any>;
const uiSchema = uiFiles['/src/Chest.ui.json'] ?? {};

  const [formData, setFormData] = useState<any>({});

  return (
    <div>
      <h3>Chest Editor</h3>
      <div style={{ marginBottom: 8 }}>
        Editing chest: <strong>{params?.entityId ?? 'new'}</strong>
      </div>
      <Form
        schema={chestSchema as any}
        uiSchema={uiSchema as any}
        formData={formData}
        validator={validator}
        onChange={({ formData }) => setFormData(formData)}
        onSubmit={({ formData }) => console.log('submit', formData)}
        onError={(errs) => console.warn('form errors', errs)}
      />
    </div>
  );
}
