import { Filter } from 'adminjs';
import { Model, QueryBuilder, raw } from 'objection';

export const operators = {
  from: '>=',
  to: '<=',
  eq: '=',
  like: 'like',
};

const OPERATOR_SEPARATOR = '~';

const MATCHING_PATTERNS = {
  EQ: 'equals',
  NE: 'notEquals',
  CO: 'contains',
  EW: 'endsWith',
  SW: 'startsWith',
};

const OPERATORS = {
  AND: 'and',
  OR: 'or',
};

export const convertFilter = (
  qb: QueryBuilder<Model, Model[]>,
  originalFilter: Filter,
): QueryBuilder<Model, Model[]> => {
  if (!originalFilter) return qb;

  const { filters } = originalFilter;

  Object.values(filters).forEach((filter) => {
    const { path, value, property } = filter;

    if (['date', 'datetime'].includes(property.type())) {
      if (typeof value === 'object' && value.from && value.to) {
        qb.where(path, operators.from, value.from);
        qb.where(path, operators.to, value.to);
      } else if (typeof value === 'object' && value.from) {
        qb.where(path, operators.from, value.from);
      } else if (typeof value === 'object' && value.to) {
        qb.where(path, operators.to, value.to);
      }
    } else if (property.type() === 'string' && !!property.availableValues()) {
      qb.where(path, operators.eq, value as string);
    } else if (property.type() === 'string') {
      if (typeof value === 'object') {
        if (value[MATCHING_PATTERNS.SW]) {
          qb.where(raw('lower(??)', [path]), operators.like, `${String(value[MATCHING_PATTERNS.SW]).toLowerCase()}%`);
        } else if (value[MATCHING_PATTERNS.EW]) {
          qb.where(raw('lower(??)', [path]), operators.like, `%${String(value[MATCHING_PATTERNS.EW]).toLowerCase()}`);
        } else if (value[MATCHING_PATTERNS.EQ]) {
          qb.where(path, operators.eq, value[MATCHING_PATTERNS.EQ] as string);
        } else if (value[MATCHING_PATTERNS.NE]) {
          qb.whereNot(path, operators.eq, value[MATCHING_PATTERNS.NE] as string);
        } else {
          const orPrefix = `${OPERATORS.OR}${OPERATOR_SEPARATOR}`;
          if (value[`${orPrefix}${MATCHING_PATTERNS.SW}`]) {
            qb.orWhere(
              raw('lower(??)', [path]),
              operators.like,
              `${String(value[`${orPrefix}${MATCHING_PATTERNS.SW}`]).toLowerCase()}%`,
            );
          } else if (value[`${orPrefix}${MATCHING_PATTERNS.EW}`]) {
            qb.orWhere(
              raw('lower(??)', [path]),
              operators.like,
              `%${String(value[`${orPrefix}${MATCHING_PATTERNS.EW}`]).toLowerCase()}`,
            );
          } else if (value[`${orPrefix}${MATCHING_PATTERNS.EQ}`]) {
            qb.orWhere(path, operators.eq, value[`${orPrefix}${MATCHING_PATTERNS.EQ}`] as string);
          } else if (value[`${orPrefix}${MATCHING_PATTERNS.NE}`]) {
            qb.orWhereNot(path, operators.eq, value[`${orPrefix}${MATCHING_PATTERNS.NE}`] as string);
          } else if (value[OPERATORS.OR]) {
            qb.where(raw('lower(??)', [path]), operators.like, `%${String(value[OPERATORS.OR]).toLowerCase()}%`);
          }
        }
      } else {
        // Should be safe: https://github.com/knex/documentation/issues/73#issuecomment-572482153
        qb.where(raw('lower(??)', [path]), operators.like, `%${String(value).toLowerCase()}%`);
      }
    } else {
      qb.where(path, operators.eq, value as string);
    }
  });

  return qb;
};
