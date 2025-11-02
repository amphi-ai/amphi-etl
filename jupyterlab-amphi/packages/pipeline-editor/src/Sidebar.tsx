// Sidebar.tsx
/**
 * This file defines a Sidebar component that displays a searchable and collapsible list of components.
 * Users can drag and drop these components into a pipeline editor. The sidebar fetches components from a service,
 * categorizes them, and allows for refreshing the list.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Input, Space, Tooltip, Collapse, Button, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Notification } from '@jupyterlab/apputils';
import { refreshIcon } from './icons';

const { Panel } = Collapse;

interface SidebarProps {
  componentService: { getComponents: () => any[] | Promise<any[]> };
  onRefreshed?: (components: any[]) => void;
}

const renderIcon = (icon: any, size: number | string = 14) => {
  if (icon?.react) {
    const Icon = icon.react;
    return (
      <span className="anticon">
        <Icon height={typeof size === 'number' ? `${size}px` : size} width={typeof size === 'number' ? `${size}px` : size} />
      </span>
    );
  }
  if (icon?.svgstr) {
    return (
      <span
        className="anticon"
        style={{ display: 'inline-flex', lineHeight: 0, verticalAlign: 'middle' }}
        dangerouslySetInnerHTML={{
          __html: icon.svgstr.replace('<svg', `<svg height="${size}" width="${size}"`)
        }}
      />
    );
  }
  return null;
};

const Sidebar: React.FC<SidebarProps> = ({ componentService, onRefreshed }) => {
  const [searchValue, setSearchValue] = useState('');
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComponents = useCallback(
    async (opts?: { notify?: boolean }) => {
      const notify = !!opts?.notify;
      setLoading(true);
      try {
        const next = await Promise.resolve(componentService.getComponents());
        const list = Array.isArray(next) ? [...next] : [];
        setComponents(list);
        onRefreshed?.(list);

        if (notify) {
          Notification.success('Components refreshed', { autoClose: 3000 });
        }
      } catch (e: any) {
        if (notify) {
          Notification.error('Failed to refresh components', {
            actions: [{ label: 'Reload and try again', callback: () => location.reload() }],
            autoClose: 6000
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [componentService, onRefreshed]
  );

  useEffect(() => {
    fetchComponents({ notify: false });
  }, [fetchComponents]);

  const categorizedComponents = useMemo(() => {
    const result: Record<string, Record<string, any[]>> = {};
    components.forEach(component => {
      let [category, subcategory] = String(component._category || '').split('.');
      if (!category) category = 'uncategorized';
      if (!result[category]) {
        result[category] = {};
      }
      if (subcategory) {
        if (!result[category][subcategory]) {
          result[category][subcategory] = [];
        }
        result[category][subcategory].push(component);
      } else {
        if (!result[category]['_']) {
          result[category]['_'] = [];
        }
        result[category]['_'].push(component);
      }
    });
    return result;
  }, [components]);

  useEffect(() => {
    if (components.length > 0) {
      const categories = Object.keys(categorizedComponents);
      setActiveKeys(categories.map((_, index) => `category-${index}`));
    }
  }, [categorizedComponents, components.length]);

  const onDragStart = (event: React.DragEvent, nodeType: string, config: any) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('additionalData', config);
    event.dataTransfer.effectAllowed = 'move';
  };

  const renderComponentGrid = (items: any[], categoryKey: string) => {
    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px'
        }}
      >
        {items.map((component, index) => (
          <Tooltip
            key={`${categoryKey}-${index}`}
            title={component._description || component._name}
            placement="bottom"
            mouseEnterDelay={0.5}
            overlayInnerStyle={{ fontSize: '12px' }}
          >
            <div
              draggable
              className="palette-component-square"
              onDragStart={(event) => onDragStart(event, component._id, component._default ? JSON.stringify(component._default) : '{}')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 2px 6px 2px',
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                cursor: 'grab',
                backgroundColor: '#ffffff',
                width: '70px',
                height: '70px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F2F4F7';
                e.currentTarget.style.borderColor = '#778899';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#d9d9d9';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px', color: '#5E9B96' }}>
                {renderIcon(component?._icon, 30)}
              </div>
              <div
                style={{
                  fontSize: '10px',
                  textAlign: 'center',
                  lineHeight: '1.1',
                  color: '#595959',
                  fontWeight: '500',
                  wordBreak: 'break-word',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  maxWidth: '100%'
                }}
              >
                {component._name}
              </div>
            </div>
          </Tooltip>
        ))}
      </div>
    );
  };

  const renderCategoryContent = (category: string, categoryData: Record<string, any[]>) => {
    const subCategories = Object.keys(categoryData);

    if (subCategories.length === 1 && subCategories[0] === '_') {
      return renderComponentGrid(categoryData['_'], category);
    } else {
      return (
        <div>
          {subCategories.map((subCat, subIndex) => (
            <div key={`${category}-${subIndex}`} style={{ marginBottom: '16px' }}>
              {subCat !== '_' && (
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#8c8c8c',
                    marginBottom: '8px',
                    paddingLeft: '8px'
                  }}
                >
                  {subCat.charAt(0).toUpperCase() + subCat.slice(1)}
                </div>
              )}
              {renderComponentGrid(categoryData[subCat], `${category}-${subCat}`)}
            </div>
          ))}
        </div>
      );
    }
  };

  const filterComponents = (data: Record<string, Record<string, any[]>>, term: string) => {
    const filtered: Record<string, Record<string, any[]>> = {};

    Object.keys(data).forEach(category => {
      const categoryData = data[category];
      const filteredCategoryData: Record<string, any[]> = {};

      Object.keys(categoryData).forEach(subCategory => {
        const filteredItems = categoryData[subCategory].filter(component =>
          (component._name || '').toLowerCase().includes(term.toLowerCase()) ||
          (component._description || '').toLowerCase().includes(term.toLowerCase())
        );

        if (filteredItems.length > 0) {
          filteredCategoryData[subCategory] = filteredItems;
        }
      });

      if (Object.keys(filteredCategoryData).length > 0) {
        filtered[category] = filteredCategoryData;
      }
    });

    return filtered;
  };

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setSearchValue(value);
    if (value.trim()) {
      const allKeys = Object.keys(categorizedComponents).map((_, index) => `category-${index}`);
      setActiveKeys(allKeys);
    }
  };

  const filteredCategorizedComponents = useMemo(() => {
    if (searchValue && searchValue.trim()) {
      return filterComponents(categorizedComponents, searchValue);
    }
    return categorizedComponents;
  }, [searchValue, categorizedComponents]);

  const onCollapseChange = (keys: string | string[]) => {
    setActiveKeys(Array.isArray(keys) ? keys : [keys]);
  };

  return (
    <aside className="sidebar" title={'Components'} >
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 999,
          backgroundColor: 'white',
        }}
      >
        <Space direction="vertical" style={{ marginTop: '10px', marginLeft: '10px', width: '90%', textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              placeholder="Search components"
              onChange={onSearch}
              value={searchValue}
              style={{ marginBottom: 8, flex: 1 }}
              suffix={<SearchOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              allowClear
            />
            <Tooltip title="Refresh components">
              <Button
                aria-label="Refresh components"
                onClick={() => fetchComponents({ notify: true })}
                loading={loading}
                type="default"
                style={{ minWidth: 36 }}
                icon={renderIcon(refreshIcon, 16) as React.ReactNode}
              />
            </Tooltip>
          </div>
        </Space>
      </div>

      <div style={{ padding: '0 4px' }}>
        <Collapse
          activeKey={activeKeys}
          onChange={onCollapseChange}
          ghost
          size="small"
          style={{ backgroundColor: 'transparent' }}
          items={Object.keys(filteredCategorizedComponents).map((category, index) => ({
            key: `category-${index}`,
            label: (
              <span
                style={{
                  fontWeight: '600',
                  fontSize: '13px',
                  color: '#262626'
                }}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </span>
            ),
            children: renderCategoryContent(category, filteredCategorizedComponents[category]),
            style: {
              borderRadius: '6px',
              marginBottom: '4px',
              border: '1px solid #f0f0f0',
              paddingLeft: '6px',
              paddingRight: '6px'
            }
          }))}
        />
      </div>
    </aside>
  );
};

export default Sidebar;
