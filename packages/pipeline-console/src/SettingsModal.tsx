import React, { useState, useEffect } from 'react';
import { Modal, Form } from 'antd';

const SettingsModal = ({
  name,
  nodeId,
  form,
  data,
  context,
  componentService,
  manager,
  commands,
  handleChange,
  advanced,
  modalOpen,
  setModalOpen
}) => {
  return (
    <Modal
      title={name}
      centered
      open={modalOpen}
      onOk={() => setModalOpen(false)}
      onCancel={() => setModalOpen(false)}
      width={800}
      footer={(_, { OkBtn }) => (
        <>
          <OkBtn />
        </>
      )}
    >
      <Form layout="vertical">
       
      </Form>
    </Modal>
  );
};


export default SettingsModal;
