import React, { useState, useEffect } from 'react';
import { Flex, Splitter, Input, Dropdown, Checkbox, Divider, Space, Button } from 'antd';
import { DownOutlined, LoadingOutlined } from '@ant-design/icons';
import { wandIcon, openaiIcon, claudeIcon, mistralIcon } from '../icons';
import AceEditor from "react-ace";
import { RequestService } from '../RequestService';
import TextArea from 'antd/es/input/TextArea';

import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-sql";
import "ace-builds/src-noconflict/theme-xcode";
import "ace-builds/src-noconflict/ext-language_tools";

export const CodeTextarea = ({
  field,
  value,
  handleChange,
  advanced,
  context,
  commands,
  componentService,
  nodeId
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [loading, setLoading] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [sampleData, setSampleData] = useState(null);
  const [includeSample, setIncludeSample] = useState(true);
  const [copyStatus, setCopyStatus] = useState('idle');
  const [activeOpenKey, setActiveOpenKey] = useState(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (val) => {
    setInputValue(val);
    handleChange(val, field.id);
  };

  const retrieveSample = async () => {
    if (loading) return sampleData || '';
    // If aiDataSample is explicitly set to false, don't retrieve sample
    if (field.aiDataSample === false) return '';
    
    setLoading(true);
    return new Promise((resolve) => {
      RequestService.retrieveDataSample(
        context,
        (isLoading) => {
          setLoading(isLoading);
        },
        commands,
        (data) => {
          setSampleData(data);
          setLoading(false);
          resolve(data);
        },
        componentService,
        nodeId,
        0,
        true
      );
    });
  };

  const generatePrompt = (dataFromRetrieve) => {
    // Only include sample data if aiDataSample is not false and includeSample is true
    const shouldIncludeSample = field.aiDataSample !== false && includeSample && dataFromRetrieve;
    
    return `${field.aiInstructions || 'Generate '}
${shouldIncludeSample ? `<Sample Data>\n${dataFromRetrieve}\n</Sample Data>` : ''}

<User Instructions>
${instructions || 'No specific instructions provided'}
</User Instructions>`.trim();
  };

  const handleCopyPrompt = async () => {
    try {
      setCopyStatus('loading');
      const retrievedData = await retrieveSample();
      const prompt = generatePrompt(retrievedData);
      navigator.clipboard.writeText(prompt);
      console.log("Prompt copied to clipboard:", prompt);
      setCopyStatus('copied');
      setTimeout(() => {
        setCopyStatus('idle');
      }, 3000);
    } catch (error) {
      setCopyStatus('idle');
    }
  };

  const handleOpenAI = async (url, key) => {
    try {
      setActiveOpenKey(key);
      const retrievedData = await retrieveSample();
      const prompt = encodeURIComponent(generatePrompt(retrievedData));
      window.open(`${url}?q=${prompt}`, '_blank');
    } finally {
      setActiveOpenKey(null);
    }
  };

  const menuItems = [
    {
      key: '1',
      label: 'Open in ChatGPT',
      icon: activeOpenKey === '1' ? <LoadingOutlined /> : <openaiIcon.react />,
      className: "anticon",
      onClick: () => handleOpenAI('https://chat.openai.com', '1')
    },
    {
      key: '2',
      label: 'Open in Claude',
      icon: activeOpenKey === '2' ? <LoadingOutlined /> : <claudeIcon.react />,
      className: "anticon",
      onClick: () => handleOpenAI('https://claude.ai/new', '2')
    },
    {
      key: '3',
      label: 'Open in Mistral',
      icon: activeOpenKey === '3' ? <LoadingOutlined /> : <mistralIcon.react />,
      className: "anticon",
      onClick: () => handleOpenAI('https://chat.mistral.ai/chat', '3')
    },
  ];

  // Only show the sample data checkbox if aiDataSample is not explicitly false
  const showSampleCheckbox = field.aiDataSample !== false;

  return (
    <Flex style={{ height: field.height || 400 }}>
      <Splitter style={{ width: '100%' }}>
        <Splitter.Panel min="50%">
          <AceEditor
            width="100%"
            height="100%"
            placeholder={field.placeholder}
            mode={field.mode}
            theme="xcode"
            name={field.id}
            onChange={handleInputChange}
            fontSize={14}
            lineHeight={19}
            showPrintMargin
            showGutter
            highlightActiveLine
            value={inputValue}
            setOptions={{
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              enableSnippets: true,
              showLineNumbers: true,
              tabSize: 2,
            }}
          />
        </Splitter.Panel>
        {field.aiGeneration && (
          <Splitter.Panel min="20%" collapsible>
            <Divider>AI-Assisted Code Generation 🪄</Divider>

            {/* Prompt Examples */}
            {field.aiPromptExamples?.length > 0 && (
              <div style={{ padding: '0 16px 8px' }}>
                <div style={{ marginBottom: 8 }}>Copy a prompt for generating accurate code using the conversational AI tool of your choice.</div>
              </div>
            )}

            {/* TextArea with overlay */}
            <div style={{
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              padding: '8px 12px 0px 12px',
              background: '#fff',
              transition: 'all 0.2s',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
              boxSizing: 'border-box',
              overflow: 'hidden',
              marginLeft: 12,
            }}>
              <TextArea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                autoSize={{ minRows: 2, maxRows: 8 }}
                placeholder="Enter instructions here"
                bordered={false}
                style={{
                  resize: 'none',
                  boxShadow: 'none',
                  outline: 'none',
                  background: 'transparent'
                }}
              />

              <Space
                style={{
                  marginTop: 8,
                  padding: '8px 0',
                  width: '100%',
                  justifyContent: 'flex-end',
                  display: 'flex'
                }}
                size="middle"
              >
                {showSampleCheckbox && (
                  <Checkbox
                    checked={includeSample}
                    onChange={(e) => setIncludeSample(e.target.checked)}
                  >
                    Include data sample
                  </Checkbox>
                )}
                <Dropdown.Button
                  icon={<DownOutlined />}
                  loading={copyStatus === 'loading'}
                  menu={{ items: menuItems, style: { textAlign: 'left', width: '220px' } }}
                  onClick={handleCopyPrompt}
                  disabled={!instructions.trim()}
                >
                  {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'loading' ? 'Loading...' : 'Copy Prompt'}
                </Dropdown.Button>
              </Space>
            </div>
            <Space
              wrap
              style={{
                marginTop: 16,
                justifyContent: 'center',
                display: 'flex',
                maxWidth: '80%',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              {field.aiPromptExamples?.map((example, idx) => (
                <Button key={idx} size="small" onClick={() => setInstructions(example.value)}>
                  {example.label} <span style={{ color: '#43766C' }}>↑</span>
                </Button>
              ))}
            </Space>
          </Splitter.Panel>
        )}
      </Splitter>
    </Flex>
  );
};

export default CodeTextarea;
