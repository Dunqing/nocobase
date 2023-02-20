import {
  SchemaComponent,
  SchemaComponentOptions,
  SchemaInitializerContext,
  SchemaInitializerProvider,
} from '@nocobase/client';
import React, { useContext } from 'react';
import { generateNTemplate } from '../locale';
import { MapActionInitializers } from './MapActionInitializers';
import { MapBlock } from './MapBlock';
import { MapBlockDesigner } from './MapBlockDesigner';
import { MapBlockInitializer } from './MapBlockInitializer';
import { MapBlockProvider, useMapBlockProps } from './MapBlockProvider';

export const MapBlockOptions: React.FC = (props) => {
  const items = useContext(SchemaInitializerContext);
  const children = items.BlockInitializers.items[0].children;
  children.push({
    key: 'mapBlock',
    type: 'item',
    title: generateNTemplate('Map'),
    component: 'MapBlockInitializer',
  });

  return (
    <SchemaInitializerProvider initializers={{ MapActionInitializers }}>
      <SchemaComponentOptions
        scope={{ useMapBlockProps }}
        components={{ MapBlockInitializer, MapBlockDesigner, MapBlockProvider, MapBlock }}
      >
        {props.children}
      </SchemaComponentOptions>
    </SchemaInitializerProvider>
  );
};
