import { useFieldSchema } from "@formily/react";
import { useMemo } from "react";
import { useCollection } from "../../../collection-manager";

export default function useServiceOptions(props) {
  const { action = 'list', service } = props
  const fieldSchema = useFieldSchema();
  console.log("🚀 ~ file: useServiceOptions.ts ~ line 8 ~ useServiceOptions ~ fieldSchema", fieldSchema)
  const { getField } = useCollection();
  const collectionField = useMemo(() => {
    return getField(fieldSchema.name);
  }, [fieldSchema.name]);

  return useMemo(() => {
    return {
      resource: collectionField.target,
      action,
      ...service,
    };
  }, [collectionField.target, action, service]);
}
