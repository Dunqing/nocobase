import { LoadingOutlined } from '@ant-design/icons';
import { ArrayCollapse, FormLayout } from '@formily/antd';
import { Field } from '@formily/core';
import { connect, ISchema, mapProps, mapReadPretty, useField, useFieldSchema } from '@formily/react';
import { isValid, toArr } from '@formily/shared';
import {
  GeneralSchemaDesigner,
  SchemaSettings,
  useCollection,
  useCollectionManager,
  useCompile,
  useDesignable,
  useFilterByTk,
  useFormBlockContext,
} from '@nocobase/client';
import type { SelectProps } from 'antd';
import { Select as AntdSelect } from 'antd';
import _ from 'lodash';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReadPretty } from './ReadPretty';
import { defaultFieldNames, getCurrentOptions } from './shared';

type Props = SelectProps<any, any> & { objectValue?: boolean; onChange?: (v: any) => void };

const isEmptyObject = (val: any) => !isValid(val) || (typeof val === 'object' && Object.keys(val).length === 0);

const ObjectSelect = (props: Props) => {
  const { value, options, onChange, fieldNames, mode, ...others } = props;
  const toValue = (v: any) => {
    if (isEmptyObject(v)) {
      return;
    }
    const values = toArr(v)
      .filter((item) => item)
      .map((val) => {
        return typeof val === 'object' ? val[fieldNames.value] : val;
      });
    const current = getCurrentOptions(values, options, fieldNames)?.map((val) => {
      return {
        label: val[fieldNames.label],
        value: val[fieldNames.value],
      };
    });
    if (['tags', 'multiple'].includes(mode)) {
      return current;
    }
    return current.shift();
  };
  return (
    <AntdSelect
      value={toValue(value)}
      allowClear
      labelInValue
      options={options}
      fieldNames={fieldNames}
      showSearch
      filterOption={(input, option) => (option?.[fieldNames.label || 'label'] ?? '').includes(input)}
      filterSort={(optionA, optionB) =>
        (optionA?.[fieldNames.label || 'label'] ?? '')
          .toLowerCase()
          .localeCompare((optionB?.[fieldNames.label || 'label'] ?? '').toLowerCase())
      }
      onChange={(changed) => {
        const current = getCurrentOptions(
          toArr(changed).map((v) => v.value),
          options,
          fieldNames,
        );
        if (['tags', 'multiple'].includes(mode)) {
          onChange(current);
        } else {
          onChange(current.shift());
        }
      }}
      mode={mode}
      {...others}
    />
  );
};

export const InternalRemoteSelect = connect(
  (props: Props) => {
    console.log('🚀 ~ file: RemoteSelect.tsx ~ line 85 ~ props', props);
    const { objectValue, ...others } = props;
    if (objectValue) {
      return <ObjectSelect {...others} />;
    }

    const {} = useCollection();

    return (
      <AntdSelect
        showSearch
        filterOption={(input, option) => (option?.label ?? '').includes(input)}
        filterSort={(optionA, optionB) =>
          (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
        }
        allowClear
        {...others}
        value={others.value || undefined}
      />
    );
  },
  mapProps(
    {
      dataSource: 'options',
      loading: true,
    },
    (props, field) => {
      return {
        ...props,
        fieldNames: { ...defaultFieldNames, ...props.fieldNames },
        suffixIcon: field?.['loading'] || field?.['validating'] ? <LoadingOutlined /> : props.suffixIcon,
      };
    },
  ),
  mapReadPretty(ReadPretty),
);

interface RemoteSelectInterface {
  (props: any): React.ReactElement;
  Designer: React.FC;
}

const RemoteSelect = InternalRemoteSelect as unknown as RemoteSelectInterface;

RemoteSelect.Designer = (props) => {
  console.log('Designer');
  const { getCollectionFields, getInterface, getCollectionJoinField } = useCollectionManager();
  const { getField } = useCollection();
  const { form } = useFormBlockContext();
  const field = useField<Field>();
  const fieldSchema = useFieldSchema();
  const { t } = useTranslation();
  const { dn, refresh } = useDesignable();
  const compile = useCompile();
  const collectionField = getField(fieldSchema['name']) || getCollectionJoinField(fieldSchema['x-collection-field']);
  const interfaceConfig = getInterface(collectionField?.interface);
  const validateSchema = interfaceConfig?.['validateSchema']?.(fieldSchema);
  const originalTitle = collectionField?.uiSchema?.title;
  const targetFields = collectionField?.target ? getCollectionFields(collectionField.target) : [];
  const initialValue = {
    title: field.title === originalTitle ? undefined : field.title,
  };

  if (!field.readPretty) {
    initialValue['required'] = field.required;
  }

  const options = targetFields
    .filter((field) => !field?.target && field.type !== 'boolean')
    .map((field) => ({
      value: field?.name,
      label: compile(field?.uiSchema?.title) || field?.name,
    }));

  let readOnlyMode = 'editable';
  if (fieldSchema['x-disabled'] === true) {
    readOnlyMode = 'readonly';
  }
  if (fieldSchema['x-read-pretty'] === true) {
    readOnlyMode = 'read-pretty';
  }

  return (
    <GeneralSchemaDesigner>
      {collectionField && (
        <SchemaSettings.ModalItem
          key="edit-field-title"
          title={t('Edit field title')}
          schema={
            {
              type: 'object',
              title: t('Edit field title'),
              properties: {
                title: {
                  title: t('Field title'),
                  default: field?.title,
                  description: `${t('Original field title: ')}${collectionField?.uiSchema?.title}`,
                  'x-decorator': 'FormItem',
                  'x-component': 'Input',
                  'x-component-props': {},
                },
              },
            } as ISchema
          }
          onSubmit={({ title }) => {
            if (title) {
              field.title = title;
              fieldSchema.title = title;
              dn.emit('patch', {
                schema: {
                  'x-uid': fieldSchema['x-uid'],
                  title: fieldSchema.title,
                },
              });
            }
            dn.refresh();
          }}
        />
      )}
      {!field.readPretty && (
        <SchemaSettings.ModalItem
          key="edit-description"
          title={t('Edit description')}
          schema={
            {
              type: 'object',
              title: t('Edit description'),
              properties: {
                description: {
                  // title: t('Description'),
                  default: field?.description,
                  'x-decorator': 'FormItem',
                  'x-component': 'Input.TextArea',
                  'x-component-props': {},
                },
              },
            } as ISchema
          }
          onSubmit={({ description }) => {
            field.description = description;
            fieldSchema.description = description;
            dn.emit('patch', {
              schema: {
                'x-uid': fieldSchema['x-uid'],
                description: fieldSchema.description,
              },
            });
            dn.refresh();
          }}
        />
      )}
      {field.readPretty && (
        <SchemaSettings.ModalItem
          key="edit-tooltip"
          title={t('Edit tooltip')}
          schema={
            {
              type: 'object',
              title: t('Edit description'),
              properties: {
                tooltip: {
                  default: fieldSchema?.['x-decorator-props']?.tooltip,
                  'x-decorator': 'FormItem',
                  'x-component': 'Input.TextArea',
                  'x-component-props': {},
                },
              },
            } as ISchema
          }
          onSubmit={({ tooltip }) => {
            field.decoratorProps.tooltip = tooltip;
            fieldSchema['x-decorator-props'] = fieldSchema['x-decorator-props'] || {};
            fieldSchema['x-decorator-props']['tooltip'] = tooltip;
            dn.emit('patch', {
              schema: {
                'x-uid': fieldSchema['x-uid'],
                'x-decorator-props': fieldSchema['x-decorator-props'],
              },
            });
            dn.refresh();
          }}
        />
      )}
      {!field.readPretty && (
        <SchemaSettings.SwitchItem
          key="required"
          title={t('Required')}
          checked={fieldSchema.required as boolean}
          onChange={(required) => {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            field.required = required;
            fieldSchema['required'] = required;
            schema['required'] = required;
            dn.emit('patch', {
              schema,
            });
            refresh();
          }}
        />
      )}
      {form && !form?.readPretty && validateSchema && (
        <SchemaSettings.ModalItem
          title={t('Set validation rules')}
          components={{ ArrayCollapse, FormLayout }}
          schema={
            {
              type: 'object',
              title: t('Set validation rules'),
              properties: {
                rules: {
                  type: 'array',
                  default: fieldSchema?.['x-validator'],
                  'x-component': 'ArrayCollapse',
                  'x-decorator': 'FormItem',
                  'x-component-props': {
                    accordion: true,
                  },
                  maxItems: 3,
                  items: {
                    type: 'object',
                    'x-component': 'ArrayCollapse.CollapsePanel',
                    'x-component-props': {
                      header: '{{ t("Validation rule") }}',
                    },
                    properties: {
                      index: {
                        type: 'void',
                        'x-component': 'ArrayCollapse.Index',
                      },
                      layout: {
                        type: 'void',
                        'x-component': 'FormLayout',
                        'x-component-props': {
                          labelStyle: {
                            marginTop: '6px',
                          },
                          labelCol: 8,
                          wrapperCol: 16,
                        },
                        properties: {
                          ...validateSchema,
                          message: {
                            type: 'string',
                            title: '{{ t("Error message") }}',
                            'x-decorator': 'FormItem',
                            'x-component': 'Input.TextArea',
                            'x-component-props': {
                              autoSize: {
                                minRows: 2,
                                maxRows: 2,
                              },
                            },
                          },
                        },
                      },
                      remove: {
                        type: 'void',
                        'x-component': 'ArrayCollapse.Remove',
                      },
                      moveUp: {
                        type: 'void',
                        'x-component': 'ArrayCollapse.MoveUp',
                      },
                      moveDown: {
                        type: 'void',
                        'x-component': 'ArrayCollapse.MoveDown',
                      },
                    },
                  },
                  properties: {
                    add: {
                      type: 'void',
                      title: '{{ t("Add validation rule") }}',
                      'x-component': 'ArrayCollapse.Addition',
                      'x-reactions': {
                        dependencies: ['rules'],
                        fulfill: {
                          state: {
                            disabled: '{{$deps[0].length >= 3}}',
                          },
                        },
                      },
                    },
                  },
                },
              },
            } as ISchema
          }
          onSubmit={(v) => {
            const rules = [];
            for (const rule of v.rules) {
              rules.push(_.pickBy(rule, _.identity));
            }
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            // return;
            // if (['number'].includes(collectionField?.interface) && collectionField?.uiSchema?.['x-component-props']?.['stringMode'] === true) {
            //   rules['numberStringMode'] = true;
            // }
            if (['percent'].includes(collectionField?.interface)) {
              for (const rule of rules) {
                if (!!rule.maxValue || !!rule.minValue) {
                  rule['percentMode'] = true;
                }

                if (rule.percentFormat) {
                  rule['percentFormats'] = true;
                }
              }
            }
            const concatValidator = _.concat([], collectionField?.uiSchema?.['x-validator'] || [], rules);
            field.validator = concatValidator;
            fieldSchema['x-validator'] = rules;
            schema['x-validator'] = rules;
            dn.emit('patch', {
              schema,
            });
            refresh();
          }}
        />
      )}
      {form && !form?.readPretty && collectionField?.uiSchema?.type && (
        <SchemaSettings.ModalItem
          title={t('Set default value')}
          components={{ ArrayCollapse, FormLayout }}
          schema={
            {
              type: 'object',
              title: t('Set default value'),
              properties: {
                default: {
                  ...collectionField.uiSchema,
                  name: 'default',
                  title: t('Default value'),
                  'x-decorator': 'FormItem',
                  default: fieldSchema.default || collectionField.defaultValue,
                },
              },
            } as ISchema
          }
          onSubmit={(v) => {
            const schema: ISchema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            if (field.value !== v.default) {
              field.value = v.default;
            }
            fieldSchema.default = v.default;
            schema.default = v.default;
            dn.emit('patch', {
              schema,
            });
            refresh();
          }}
        />
      )}
      {form && ['m2o'].includes(collectionField?.interface) && (
        <SchemaSettings.SelectItem
          title={t('Field component')}
          options={[
            { label: t('Record picker'), value: 'RecordPicker' },
            { label: t('Subtable'), value: 'RemoteSelect' },
          ]}
          value={field?.componentProps.type}
          onChange={(type) => {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
            fieldSchema['x-component-props']['fieldNames'] = {
              type,
            };
            schema['x-component-props'] = fieldSchema['x-component-props'];
            dn.emit('patch', {
              schema,
            });
            dn.refresh();
          }}
        />
      )}
      {form &&
        !form?.readPretty &&
        collectionField?.interface !== 'o2m' &&
        fieldSchema?.['x-component-props']?.['pattern-disable'] != true && (
          <SchemaSettings.SelectItem
            key="pattern"
            title={t('Pattern')}
            options={[
              { label: t('Editable'), value: 'editable' },
              { label: t('Readonly'), value: 'readonly' },
              { label: t('Easy-reading'), value: 'read-pretty' },
            ]}
            value={readOnlyMode}
            onChange={(v) => {
              const schema: ISchema = {
                ['x-uid']: fieldSchema['x-uid'],
              };

              switch (v) {
                case 'readonly': {
                  fieldSchema['x-read-pretty'] = false;
                  fieldSchema['x-disabled'] = true;
                  schema['x-read-pretty'] = false;
                  schema['x-disabled'] = true;
                  field.readPretty = false;
                  field.disabled = true;
                  break;
                }
                case 'read-pretty': {
                  fieldSchema['x-read-pretty'] = true;
                  fieldSchema['x-disabled'] = false;
                  schema['x-read-pretty'] = true;
                  schema['x-disabled'] = false;
                  field.readPretty = true;
                  break;
                }
                default: {
                  fieldSchema['x-read-pretty'] = false;
                  fieldSchema['x-disabled'] = false;
                  schema['x-read-pretty'] = false;
                  schema['x-disabled'] = false;
                  field.readPretty = false;
                  field.disabled = false;
                  break;
                }
              }

              dn.emit('patch', {
                schema,
              });

              dn.refresh();
            }}
          />
        )}
      {collectionField?.target && fieldSchema['x-component'] === 'CollectionField' && (
        <SchemaSettings.SelectItem
          key="title-field"
          title={t('Title field')}
          options={options}
          value={field?.componentProps?.fieldNames?.label}
          onChange={(label) => {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            const fieldNames = {
              ...collectionField?.uiSchema?.['x-component-props']?.['fieldNames'],
              ...field.componentProps.fieldNames,
              label,
            };
            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
            fieldSchema['x-component-props']['fieldNames'] = fieldNames;
            schema['x-component-props'] = fieldSchema['x-component-props'];
            dn.emit('patch', {
              schema,
            });
            dn.refresh();
          }}
        />
      )}
      {collectionField && <SchemaSettings.Divider />}
      <SchemaSettings.Remove
        key="remove"
        removeParentsIfNoChildren
        confirm={{
          title: t('Delete field'),
        }}
        breakRemoveOn={{
          'x-component': 'Grid',
        }}
      />
    </GeneralSchemaDesigner>
  );
};

export default RemoteSelect;
