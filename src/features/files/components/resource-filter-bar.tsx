import type { ResourceKind } from '../../../shared/api/generated/openapi';
import type { ResourceSortBy, ResourceSortDirection } from '../api/resource-api';

export interface ResourceFilterValues {
  kind?: ResourceKind;
  sortBy: ResourceSortBy;
  sortDirection: ResourceSortDirection;
  updatedFrom?: string;
  updatedTo?: string;
}

export interface ResourceFilterBarProps {
  onChange: (values: Partial<ResourceFilterValues>) => void;
  values: ResourceFilterValues;
}

export function ResourceFilterBar({
  onChange,
  values,
}: ResourceFilterBarProps): JSX.Element {
  return (
    <form
      data-testid="resource-filter-bar"
      aria-label="资源筛选"
      onSubmit={(event) => event.preventDefault()}
    >
      <label>
        资源类型
        <select
          aria-label="资源类型"
          name="resource-kind"
          value={values.kind ?? ''}
          onChange={(event) =>
            onChange({
              kind: event.target.value
                ? (event.target.value as ResourceKind)
                : undefined,
            })
          }
        >
          <option value="">全部类型</option>
          <option value="folder">文件夹</option>
          <option value="document">文档</option>
          <option value="file">文件</option>
        </select>
      </label>
      <label>
        更新时间起
        <input
          aria-label="更新时间起"
          name="updated-from"
          type="datetime-local"
          value={values.updatedFrom ?? ''}
          onChange={(event) =>
            onChange({ updatedFrom: event.target.value || undefined })
          }
        />
      </label>
      <label>
        更新时间止
        <input
          aria-label="更新时间止"
          name="updated-to"
          type="datetime-local"
          value={values.updatedTo ?? ''}
          onChange={(event) => onChange({ updatedTo: event.target.value || undefined })}
        />
      </label>
      <label>
        排序字段
        <select
          aria-label="排序字段"
          name="sort-by"
          value={values.sortBy}
          onChange={(event) =>
            onChange({ sortBy: event.target.value as ResourceSortBy })
          }
        >
          <option value="name">名称</option>
          <option value="updated_at">更新时间</option>
        </select>
      </label>
      <label>
        排序方向
        <select
          aria-label="排序方向"
          name="sort-direction"
          value={values.sortDirection}
          onChange={(event) =>
            onChange({ sortDirection: event.target.value as ResourceSortDirection })
          }
        >
          <option value="asc">升序</option>
          <option value="desc">降序</option>
        </select>
      </label>
    </form>
  );
}
