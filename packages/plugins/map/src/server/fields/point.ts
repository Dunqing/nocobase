import { BaseColumnFieldOptions, Field, FieldContext } from '@nocobase/database';
import { DataTypes } from 'sequelize';
import { isMysql, isPg, joinComma } from '../helpers';

// @ts-ignore
class Point extends DataTypes.ABSTRACT {
  key = 'Point';
}

export class PointField extends Field {
  constructor(options?: any, context?: FieldContext) {
    const { name } = options
    super(
      {
        get() {
          const value = this.getDataValue(name);
          if (isPg(context)) {
            return value ? [value.x, value.y] : null
          } else if (isMysql(context)) {
            return value?.coordinates
          } else {
            return value
          }
        },
        set(value) {
          if (isPg(context)) {
            value = joinComma(value)
          } else if (isMysql(context)) {
            value = {
              type: 'Point',
              coordinates: value
            }
          }
          this.setDataValue(name, value)
        },
        ...options,
      },
      context,
    );
  }

  get dataType() {
    if (isPg(this.context)) {
      return Point;
    } if (isMysql(this.context)) {
      return DataTypes.GEOMETRY('POINT');
    } else {
      return DataTypes.JSON;
    }
  }

}

export interface PointFieldOptions extends BaseColumnFieldOptions {
  type: 'point';
}
