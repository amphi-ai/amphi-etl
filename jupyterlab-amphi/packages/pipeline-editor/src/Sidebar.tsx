import React, { useState, useEffect, useMemo } from 'react';
import { Tree, Input, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { DirectoryTree } = Tree;
const { Search } = Input;

interface SidebarProps {
    componentService: {
        getComponents: () => any[];
    };
}

const Sidebar: React.FC<SidebarProps> = ({ componentService }) => {
    const [searchValue, setSearchValue] = useState('');
    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
    const [autoExpandParent, setAutoExpandParent] = useState(true);
    const [components, setComponents] = useState<any[]>([]);

    useEffect(() => {
        const fetchedComponents = componentService.getComponents();
        setComponents(fetchedComponents);
        console.log('Fetched components:', fetchedComponents);
    }, [componentService]);

    const onDragStart = (event: React.DragEvent, nodeType: string, config: any) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.setData('additionalData', config);
        event.dataTransfer.effectAllowed = 'move';
    };

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
        console.log('Categorized components:', result);
        return result;
    }, [components]);

    const getTreeData = () => {
        return Object.keys(categorizedComponents).map((category, index) => {
            const subCategories = Object.keys(categorizedComponents[category]);
            let children = [];

            subCategories.forEach((subCat, subIndex) => {
                if (subCat === '_') {
                    children.push(...categorizedComponents[category][subCat].map((component, childIndex) => ({
                        title: (
                            <span
                                draggable
                                className="palette-component"
                                onDragStart={(event) => onDragStart(event, component._id, component.getDefaultConfig ? component.getDefaultConfig() : '')}
                                key={`category-${index}-item-${childIndex}`}
                            >
                                {component._name}
                            </span>
                        ),
                        key: `category-${index}-item-${childIndex}`,
                        isLeaf: true,
                        icon: <span className="anticon"><component._icon.react height="14px" width="14px;" /></span>
                    })));
                } else {
                    children.push({
                        title: <span className="palette-component-category">{subCat.charAt(0).toUpperCase() + subCat.slice(1)}</span>,
                        key: `category-${index}-sub-${subIndex}`,
                        children: categorizedComponents[category][subCat].map((component, childIndex) => ({
                            title: (
                                <span
                                    draggable
                                    className="palette-component"
                                    onDragStart={(event) => onDragStart(event, component._id, component.getDefaultConfig ? component.getDefaultConfig() : '')}
                                    key={`category-${index}-sub-${subIndex}-item-${childIndex}`}
                                >
                                    {component._name}
                                </span>
                            ),
                            key: `category-${index}-sub-${subIndex}-item-${childIndex}`,
                            isLeaf: true,
                            icon: <span className="anticon"><component._icon.react height="14px" width="14px;" /></span>
                        }))
                    });
                }
            });

            return {
                title: <span className="palette-component-category">{category.charAt(0).toUpperCase() + category.slice(1)}</span>,
                key: `category-${index}`,
                children: children
            };
        });
    };

    const filterTree = (data: any[], searchValue: string) => {
        console.log('Filtering tree with search value:', searchValue);
        const filteredData = data
            .map((item) => {
                const newItem = { ...item };
                if (newItem.children) {
                    newItem.children = filterTree(newItem.children, searchValue);
                }
                if (
                    newItem.title.props.children.toLowerCase().includes(searchValue.toLowerCase()) ||
                    (newItem.children && newItem.children.length > 0)
                ) {
                    return newItem;
                }
                return null;
            })
            .filter(item => item !== null);
        console.log('Filtered data:', filteredData);
        return filteredData;
    };

    const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setSearchValue(value);
        setAutoExpandParent(true);
    };

    const treeData = useMemo(getTreeData, [categorizedComponents]);

    const filteredTreeData = useMemo(() => {
        if (searchValue && searchValue.trim()) {
            console.log("Filter applied:", searchValue);
            return filterTree(treeData, searchValue);
        } else {
            console.log("No filter applied");
            return treeData;
        }
    }, [searchValue, treeData]);

    useEffect(() => {
        const collectKeys = (data: any[]): React.Key[] => {
            return data.reduce((acc: React.Key[], item: any) => {
                // Add the current item's key to the accumulator array
                acc.push(item.key);
                
                // If the current item has children, recursively collect their keys
                if (item.children) {
                    acc.push(...collectKeys(item.children));
                }
                
                return acc; // Return the accumulated keys
            }, []);
        };
    
        // Collect keys based on the presence of a search value
        const keys = searchValue ? collectKeys(filteredTreeData) : Object.keys(categorizedComponents).map((category, index) => `category-${index}`);
        setExpandedKeys(keys); // Update the expanded keys state
    }, [searchValue, filteredTreeData, categorizedComponents]);

    const onExpand = (keys: React.Key[]) => {
        setExpandedKeys(keys);
        setAutoExpandParent(false);
    };

    return (
        <aside className="sidebar" title={'Components'} >
            <Space direction="vertical" style={{ marginTop: '10px', marginLeft: '10px', width: '90%', textAlign: 'center' }}>
                <Input
                    placeholder="Search components"
                    onChange={onSearch}
                    style={{ marginBottom: 8 }}
                    suffix={<SearchOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                />
            </Space>
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
