import React, { useEffect, useMemo, useState } from 'react';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Select } from 'antd';
import { FieldDescriptor, Option } from '../configUtils';
import SelectColumn from './selectColumn';

interface ColumnOperation {
  leftColumn?: Option;
  operation: string;
  rightColumn?: Option;
}

interface ColumnOperationColumnProps {
  field: FieldDescriptor;
  handleChange: (values: any, fieldId: string) => void;
  initialValues?: ColumnOperation[];
  data?: any;
  context: any;
  componentService: any;
  commands: any;
  nodeId: string;
  advanced: boolean;
}

const DEFAULT_OPERATION: ColumnOperation = {
  leftColumn: undefined,
  operation: '=',
  rightColumn: undefined
};

const buildInitialConditions = (initialValues?: ColumnOperation[]): ColumnOperation[] => {
  if (!initialValues || initialValues.length === 0) {
    return [DEFAULT_OPERATION];
  }
  return initialValues.map(cond => ({
    leftColumn: cond?.leftColumn ?? undefined,
    operation: cond?.operation ?? '=',
    rightColumn: cond?.rightColumn ?? undefined
  }));
};

export const ColumnOperationColumn: React.FC<ColumnOperationColumnProps> = ({
  field,
  handleChange,
  initialValues,
  data,
  context,
  componentService,
  commands,
  nodeId,
  advanced
}) => {
  const [conditions, setConditions] = useState<ColumnOperation[]>(
    buildInitialConditions(initialValues)
  );

  const operationOptions = useMemo(
    () =>
      (field.options && field.options.length > 0
        ? field.options
        : [
            { value: '=', label: '=' },
            { value: '>', label: '>' },
            { value: '<', label: '<' },
            { value: '>=', label: '>=' },
            { value: '<=', label: '<=' }
          ]
      ).map(option => ({
        value: option.value,
        label: option.label
      })),
    [field.options]
  );

  const operatorControlFieldId = field.operatorControlFieldId || 'selectExecutionEngine';
  const operatorLockedValues = field.operatorLockedValues || ['pandas'];
  const operatorLockedWhenMissing = field.operatorLockedWhenMissing ?? true;
  const operatorControlValue = data?.[operatorControlFieldId];
  const isOperatorLocked =
    (operatorControlValue === undefined || operatorControlValue === null
      ? operatorLockedWhenMissing
      : false) || operatorLockedValues.includes(operatorControlValue);

  const updateConditions = (nextConditions: ColumnOperation[]) => {
    setConditions(nextConditions);
    handleChange(nextConditions, field.id);
  };

  const handleAddCondition = () => {
    updateConditions([...conditions, { ...DEFAULT_OPERATION }]);
  };

  const handleRemoveCondition = (index: number) => {
    if (conditions.length <= 1) {
      return;
    }
    const nextConditions = [...conditions];
    nextConditions.splice(index, 1);
    updateConditions(nextConditions);
  };

  const handleLeftColumnChange = (selection: any, index: number) => {
    const nextConditions = [...conditions];
    nextConditions[index] = {
      ...nextConditions[index],
      leftColumn: selection?.value
        ? { ...selection, label: selection.label ?? selection.value }
        : undefined
    };
    updateConditions(nextConditions);
  };

  const handleRightColumnChange = (selection: any, index: number) => {
    const nextConditions = [...conditions];
    nextConditions[index] = {
      ...nextConditions[index],
      rightColumn: selection?.value
        ? { ...selection, label: selection.label ?? selection.value }
        : undefined
    };
    updateConditions(nextConditions);
  };

  const handleOperationChange = (operation: string, index: number) => {
    const nextConditions = [...conditions];
    nextConditions[index] = { ...nextConditions[index], operation: operation || '=' };
    updateConditions(nextConditions);
  };

  useEffect(() => {
    if (!isOperatorLocked) {
      return;
    }
    const hasNonEquality = conditions.some(condition => (condition.operation || '=') !== '=');
    if (!hasNonEquality) {
      return;
    }
    updateConditions(
      conditions.map(condition => ({
        ...condition,
        operation: '='
      }))
    );
  }, [isOperatorLocked, conditions]);

  return (
    <Form.List name={field.id}>
      {() => (
        <>
          <Form.Item>
            {conditions.map((condition, index) => (
              <div
                key={`${field.id}-${index}`}
                style={{ display: 'flex', width: '100%', marginBottom: 8, gap: 8, alignItems: 'baseline' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <SelectColumn
                    field={{
                      ...field,
                      id: `${field.id}_leftColumn`,
                      placeholder: 'Left column',
                      inputNb: 1
                    }}
                    handleChange={value => handleLeftColumnChange(value, index)}
                    defaultValue={condition.leftColumn}
                    context={context}
                    componentService={componentService}
                    commands={commands}
                    nodeId={nodeId}
                    advanced={advanced}
                  />
                </div>

                <Select
                  size={advanced ? 'middle' : 'small'}
                  className="nodrag"
                  style={{ width: 72, minWidth: 72 }}
                  value={isOperatorLocked ? '=' : (condition.operation || '=')}
                  onChange={value => handleOperationChange(value, index)}
                  options={operationOptions}
                  disabled={isOperatorLocked}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <SelectColumn
                    field={{
                      ...field,
                      id: `${field.id}_rightColumn`,
                      placeholder: 'Right column',
                      inputNb: 2
                    }}
                    handleChange={value => handleRightColumnChange(value, index)}
                    defaultValue={condition.rightColumn}
                    context={context}
                    componentService={componentService}
                    commands={commands}
                    nodeId={nodeId}
                    advanced={advanced}
                  />
                </div>

                <MinusCircleOutlined
                  onClick={() => handleRemoveCondition(index)}
                  style={{ color: conditions.length > 1 ? undefined : '#d9d9d9' }}
                />
              </div>
            ))}
          </Form.Item>
          <Form.Item>
            <Button type="dashed" onClick={handleAddCondition} block icon={<PlusOutlined />}>
              Add {field.elementName ? field.elementName : 'condition'}
            </Button>
          </Form.Item>
        </>
      )}
    </Form.List>
  );
};

export default React.memo(ColumnOperationColumn);
