import { Field } from '@formily/core';
import { useField, useFieldSchema } from '@formily/react';
import flat from 'flat';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlockRequestContext } from '../../../block-provider';
import { concatFilter, SharedFilterContext } from '../../../block-provider/SharedFilterProvider';
import { useCollection, useCollectionManager } from '../../../collection-manager';

export const useFilterOptions = (collectionName: string) => {
  const { getCollectionFields } = useCollectionManager();
  const fields = getCollectionFields(collectionName);
  return useFilterFieldOptions(fields);
};

export const useFilterFieldOptions = (fields) => {
  const fieldSchema = useFieldSchema();
  const nonfilterable = fieldSchema?.['x-component-props']?.nonfilterable || [];
  const { getCollectionFields, getInterface } = useCollectionManager();
  const field2option = (field, depth) => {
    if (nonfilterable.length && depth === 1 && nonfilterable.includes(field.name)) {
      return;
    }
    if (!field.interface) {
      return;
    }
    const fieldInterface = getInterface(field.interface);
    if (!fieldInterface.filterable) {
      return;
    }
    const { nested, children, operators } = fieldInterface.filterable;
    const option = {
      name: field.name,
      type: field.type,
      target: field.target,
      title: field?.uiSchema?.title || field.name,
      schema: field?.uiSchema,
      operators:
        operators?.filter?.((operator) => {
          return !operator?.visible || operator.visible(field);
        }) || [],
    };
    if (field.target && depth > 2) {
      return;
    }
    if (depth > 2) {
      return option;
    }
    if (children?.length) {
      option['children'] = children;
    }
    if (nested) {
      const targetFields = getCollectionFields(field.target);
      const options = getOptions(targetFields, depth + 1).filter(Boolean);
      option['children'] = option['children'] || [];
      option['children'].push(...options);
    }
    return option;
  };
  const getOptions = (fields, depth) => {
    const options = [];
    fields.forEach((field) => {
      const option = field2option(field, depth);
      if (option) {
        options.push(option);
      }
    });
    return options;
  };
  return getOptions(fields, 1);
};

const isEmpty = (obj) => {
  return (
    (Array.isArray(obj) && obj.length === 0) ||
    (obj && Object.keys(obj).length === 0 && Object.getPrototypeOf(obj) === Object.prototype)
  );
};

export const removeNullCondition = (filter) => {
  const items = flat(filter || {});
  const values = {};
  for (const key in items) {
    const value = items[key];
    if (value != null && !isEmpty(value)) {
      values[key] = value;
    }
  }
  return flat.unflatten(values);
};

export const useFilterActionProps = () => {
  const { name } = useCollection();
  const options = useFilterOptions(name);
  const { service, props } = useBlockRequestContext();
  return useFilterFieldProps({ options, service, params: props.params });
};

export const useFilterFieldProps = ({ options, service, params }) => {
  const { t } = useTranslation();
  const field = useField<Field>();
  const { sharedFilterStore, setSharedFilterStore, getFilterParams } = useContext(SharedFilterContext);
  return {
    options,
    onSubmit(values) {
      // filter parameter for the block
      const defaultFilter = removeNullCondition(params.filter);
      // filter parameter for the filter action
      const filter = removeNullCondition(values?.filter);

      const newSharedFilterStore = {
        ...sharedFilterStore,
        ActionBar: concatFilter(defaultFilter, filter),
      };

      setSharedFilterStore(newSharedFilterStore);

      const paramFilter = getFilterParams(newSharedFilterStore);

      service.run({ ...service.params?.[0], page: 1, filter: paramFilter });
      const items = filter?.$and || filter?.$or;
      if (items?.length) {
        field.title = t('{{count}} filter items', { count: items?.length || 0 });
      } else {
        field.title = t('Filter');
      }
    },
    onReset() {
      const filter = removeNullCondition(params.filter);
      service.run({ ...service.params?.[0], filter, page: 1 });
      field.title = t('Filter');
    },
  };
};
