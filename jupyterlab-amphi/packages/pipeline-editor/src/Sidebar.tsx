// Sidebar.tsx — support inline SVG icons without LabIcon

import React, { useState, useEffect, useMemo } from 'react';
import { Tree, Input, Space, Tooltip } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { DirectoryTree } = Tree;

interface SidebarProps {
  componentService: { getComponents: () => any[] };
}

const renderIcon = (icon: any) => {
  // Prefer LabIcon-like .react if present
  if (icon?.react) {
    const Icon = icon.react;
    return (
      <span className="anticon">
        <Icon height="14px" width="14px" />
      </span>
    );
  }
  // Fallback to inline SVG string
  if (icon?.svgstr) {
    return (
      <span
        className="anticon"
        style={{ display: 'inline-flex', lineHeight: 0, verticalAlign: 'middle' }}
        dangerouslySetInnerHTML={{
          __html: icon.svgstr.replace(
            '<svg',
            '<svg height="14" width="14"'
          )
        }}
      />
    );
  }
  return null;
};

const Sidebar: React.FC<SidebarProps> = ({ componentService }) => {
  const [searchValue, setSearchValue] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [components, setComponents] = useState<any[]>([]);

  useEffect(() => {
    const fetched = componentService.getComponents() ?? [];
    setComponents(Array.isArray(fetched) ? fetched : []);
  }, [componentService]);

  const onDragStart = (event: React.DragEvent, nodeType: string, config: any) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('additionalData', config);
    event.dataTransfer.effectAllowed = 'move';
  };

  const categorizedComponents = useMemo(() => {
    const result: Record<string, Record<string, any[]>> = {};
    components.forEach(component => {
      const key = String(component?._category ?? component?._type ?? 'uncategorized');
      const parts = key.split('.');
      const category = parts[0] || 'uncategorized';
      const subcategory = parts[1] || '_';
      if (!result[category]) result[category] = {};
      if (!result[category][subcategory]) result[category][subcategory] = [];
      result[category][subcategory].push(component);
    });
    return result;
  }, [components]);

  const getTreeData = () => {
    return Object.keys(categorizedComponents).map((category, index) => {
      const subCategories = Object.keys(categorizedComponents[category]);
      const children: any[] = [];

      subCategories.forEach((subCat, subIndex) => {
        if (subCat === '_') {
          children.push(
            ...categorizedComponents[category][subCat].map((component: any, childIndex: number) => ({
              title: (
                <Tooltip
                  placement="left"
                  title={component?._description ?? ''}
                  arrow
                  mouseEnterDelay={1}
                  mouseLeaveDelay={0}
                  align={{ offset: [-30, 0] }}
                  overlayInnerStyle={{ fontSize: '12px' }}
                >
                  <span
                    draggable
                    className="palette-component"
                    onDragStart={(event) =>
                      onDragStart(
                        event,
                        String(component?._id ?? ''),
                        component?._default ? JSON.stringify(component._default) : '{}'
                      )
                    }
                    key={`category-${index}-item-${childIndex}`}
                  >
                    {String(component?._name ?? 'Unnamed')}
                  </span>
                </Tooltip>
              ),
              key: `category-${index}-item-${childIndex}`,
              isLeaf: true,
              icon: renderIcon(component?._icon)
            }))
          );
        } else {
          children.push({
            title: <span className="palette-component-category">{subCat.charAt(0).toUpperCase() + subCat.slice(1)}</span>,
            key: `category-${index}-sub-${subIndex}`,
            children: categorizedComponents[category][subCat].map((component: any, childIndex: number) => ({
              title: (
                <Tooltip
                  placement="left"
                  title={component?._description ?? ''}
                  arrow
                  mouseEnterDelay={1}
                  mouseLeaveDelay={0}
                  align={{ offset: [-30, 0] }}
                  overlayInnerStyle={{ fontSize: '12px' }}
                >
                  <span
                    draggable
                    className="palette-component"
                    onDragStart={(event) =>
                      onDragStart(
                        event,
                        String(component?._id ?? ''),
                        component?._default ? JSON.stringify(component._default) : '{}'
                      )
                    }
                    key={`category-${index}-sub-${subIndex}-item-${childIndex}`}
                  >
                    {String(component?._name ?? 'Unnamed')}
                  </span>
                </Tooltip>
              ),
              key: `category-${index}-sub-${subIndex}-item-${childIndex}`,
              isLeaf: true,
              icon: renderIcon(component?._icon)
            }))
          });
        }
      });

      return {
        title: <span className="palette-component-category">{category.charAt(0).toUpperCase() + category.slice(1)}</span>,
        key: `category-${index}`,
        children
      };
    });
  };

  const filterTree = (data: any[], search: string) =>
    data
      .map((item) => {
        const next = { ...item };
        const text =
          typeof next.title?.props?.children === 'object'
            ? next.title.props.children?.props?.children ?? ''
            : next.title?.props?.children ?? '';
        if (next.children) next.children = filterTree(next.children, search);
        if (String(text).toLowerCase().includes(search.toLowerCase()) || (next.children && next.children.length > 0)) {
          return next;
        }
        return null;
      })
      .filter(Boolean);

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setSearchValue(value);
    setAutoExpandParent(true);
  };

  const treeData = useMemo(getTreeData, [categorizedComponents]);
  const filteredTreeData = useMemo(
    () => (searchValue.trim() ? filterTree(treeData, searchValue) : treeData),
    [searchValue, treeData]
  );

  useEffect(() => {
    const collect = (data: any[]): React.Key[] =>
      data.reduce((acc: React.Key[], it: any) => {
        acc.push(it.key);
        if (it.children) acc.push(...collect(it.children));
        return acc;
      }, []);
    const keys = searchValue
      ? collect(filteredTreeData)
      : Object.keys(categorizedComponents).map((_, i) => `category-${i}`);
    setExpandedKeys(keys);
  }, [searchValue, filteredTreeData, categorizedComponents]);

  const onExpand = (keys: React.Key[]) => {
    setExpandedKeys(keys);
    setAutoExpandParent(false);
  };

  return (
    <aside className="sidebar" title="Components">
      <div style={{ position: 'sticky', top: 0, zIndex: 999, backgroundColor: 'white' }}>
        <Space direction="vertical" style={{ marginTop: 10, marginLeft: 10, width: '90%', textAlign: 'center' }}>
          <Input
            placeholder="Search components"
            onChange={onSearch}
            style={{ marginBottom: 8 }}
            suffix={<SearchOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
          />
        </Space>
      </div>
      <DirectoryTree
        selectable={false}
        multiple
        blockNode
        autoExpandParent={autoExpandParent}
        expandedKeys={expandedKeys}
        onExpand={onExpand}
        treeData={filteredTreeData}
      />
    </aside>
  );
};

export default Sidebar;
