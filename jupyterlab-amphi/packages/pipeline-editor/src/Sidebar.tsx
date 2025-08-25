import React, { useState, useEffect, useMemo } from 'react';
import { Input, Space, Tooltip, Collapse } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import posthog from 'posthog-js'
import { NONAME } from 'dns';

const { Panel } = Collapse;

interface SidebarProps {
    componentService: {
        getComponents: () => any[];
    };
}

const Sidebar: React.FC<SidebarProps> = ({ componentService }) => {
    const [searchValue, setSearchValue] = useState('');
    const [activeKeys, setActiveKeys] = useState<string[]>([]);
    const [components, setComponents] = useState<any[]>([]);

    useEffect(() => {
        const fetchedComponents = componentService.getComponents();
        setComponents(fetchedComponents);
    }, [componentService]);

    const categorizedComponents = useMemo(() => {
        const result: Record<string, Record<string, any[]>> = {};
        components.forEach(component => {
            let [category, subcategory] = component._category.split('.');
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

    // Set initial expanded state after components are categorized
    useEffect(() => {
        if (components.length > 0) {
            const categories = Object.keys(categorizedComponents);
            setActiveKeys(categories.map((_, index) => `category-${index}`));
        }
    }, [categorizedComponents]);

    const onDragStart = (event: React.DragEvent, nodeType: string, config: any) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.setData('additionalData', config);
        event.dataTransfer.effectAllowed = 'move';
    };



    const renderComponentGrid = (components: any[], categoryKey: string) => {
        return (
            <div 
                style={{ 
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    padding: '8px'
                }}
            >
                {components.map((component, index) => (
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
                                e.currentTarget.style.backgroundColor = '#f5f5f5';
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
                                <component._icon.react height="30px" width="30px" />
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
            // No subcategories, render components directly
            return renderComponentGrid(categoryData['_'], category);
        } else {
            // Has subcategories
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

    const filterComponents = (categorizedComponents: Record<string, Record<string, any[]>>, searchValue: string) => {
        const filtered: Record<string, Record<string, any[]>> = {};
        
        Object.keys(categorizedComponents).forEach(category => {
            const categoryData = categorizedComponents[category];
            const filteredCategoryData: Record<string, any[]> = {};
            
            Object.keys(categoryData).forEach(subCategory => {
                const filteredComponents = categoryData[subCategory].filter(component => 
                    component._name.toLowerCase().includes(searchValue.toLowerCase()) ||
                    (component._description && component._description.toLowerCase().includes(searchValue.toLowerCase()))
                );
                
                if (filteredComponents.length > 0) {
                    filteredCategoryData[subCategory] = filteredComponents;
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
        
        // If searching, expand all categories to show results
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
                    <Input
                        placeholder="Search components"
                        onChange={onSearch}
                        style={{ marginBottom: 8 }}
                        suffix={<SearchOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                    />
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