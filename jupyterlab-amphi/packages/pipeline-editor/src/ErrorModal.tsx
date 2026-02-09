import React from 'react';
import ReactDOM from 'react-dom';
import { Modal, Button, ConfigProvider } from 'antd';

/**
 * Shows an error modal with detailed error information
 * @param error - The error object to display
 * @param context - Context about what operation failed
 */
export function showErrorModal(error: Error, context: string): void {
  const container = document.createElement('div');
  document.body.appendChild(container);

  function ErrorModal() {
    const handleClose = () => {
      ReactDOM.unmountComponentAtNode(container);
      container.remove();
    };

    return (
      <ConfigProvider theme={{ token: { colorPrimary: '#5F9B97' } }}>
        <Modal
          title="Code Generation Failed"
          visible
          footer={[
            <Button key="close" type="primary" onClick={handleClose}>
              Close
            </Button>
          ]}
          width="60%"
          onCancel={handleClose}
        >
          <div style={{ marginBottom: '16px' }}>
            <strong>Context:</strong> {context}
          </div>
          <div style={{ marginBottom: '16px' }}>
            <strong>Error Message:</strong>
          </div>
          <div style={{
            padding: '12px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {error.message}
          </div>
          {error.stack && (
            <>
              <div style={{ marginTop: '16px', marginBottom: '8px' }}>
                <strong>Stack Trace:</strong>
              </div>
              <div style={{
                padding: '12px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '11px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                {error.stack}
              </div>
            </>
          )}
        </Modal>
      </ConfigProvider>
    );
  }

  ReactDOM.render(<ErrorModal />, container);
}
