import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { filterIcon } from '../icons';

export class EmailLogger extends PipelineComponent<ComponentItem>() {

  public _name = "Email Logger";
  public _id = "emailLogger";
  public _type = "logger";
  public _category = "other";
  public _icon = filterIcon;
  public _default = { smtpServer: "smtp.example.com", smtpPort: 587};
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "input",
        label: "Receiver Email",
        id: "receiverEmail",
        placeholder: "Receiver Email"
      },
      {
        type: "input",
        label: "Sender Email",
        id: "senderEmail",
        placeholder: "Sender Email",
        advanced: true
      },
      {
        type: "input",
        label: "Sender Password",
        id: "senderPassword",
        placeholder: "Receiver Email",
        advanced: true
      },
      {
        type: "input",
        label: "SMTP server",
        id: "smtpServer",
        placeholder: "smtp.example.com",
        advanced: true
      },
      {
        type: "input",
        label: "SMTP port",
        id: "smtpPort",
        placeholder: "587",
        advanced: true
      },
      {
        type: "input",
        label: "Subject",
        id: "emailSubject",
        placeholder: "Pipeline Failure",
        advanced: true
      },
      {
        type: "textarea",
        label: "Email Content",
        id: "emailContent",
        placeholder: "An error occurred in the script:\n\n{error_message}",
        advanced: true
      },
    ],
  };

  public static ConfigForm = ({ 
    nodeId, 
    data,
    context,
    componentService,
    manager,
    commands,
    store,
    setNodes
  }) => {
    const defaultConfig = this.Default; // Define your default config

    const handleSetDefaultConfig = useCallback(() => {
      setDefaultConfig({ nodeId, store, setNodes, defaultConfig });
    }, [nodeId, store, setNodes, defaultConfig]);
  
    useEffect(() => {
      handleSetDefaultConfig();
    }, [handleSetDefaultConfig]);
  
    const handleChange = useCallback((evtTargetValue: any, field: string) => {
      onChange({ evtTargetValue, field, nodeId, store, setNodes });
    }, [nodeId, store, setNodes]);

    return (
      <>
        {generateUIFormComponent({
          nodeId: nodeId,
          type: this.Type,
          name: this.Name,
          form: this.Form,
          data: data,
          context: context,
          componentService: componentService,
          manager: manager,
          commands: commands,
          handleChange: handleChange,
        })}
      </>
    );
  }

  public UIComponent({ id, data, context, componentService, manager, commands }) {

  const { setNodes, deleteElements, setViewport } = useReactFlow();
  const store = useStoreApi();

  const deleteNode = useCallback(() => {
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  const zoomSelector = createZoomSelector();
  const showContent = useStore(zoomSelector);
  
  const selector = (s) => ({
    nodeInternals: s.nodeInternals,
    edges: s.edges,
  });

  const { nodeInternals, edges } = useStore(selector);
  const nodeId = id;
  const internals = { nodeInternals, edges, nodeId }

  
  // Create the handle element
  const handleElement = React.createElement(renderHandle, {
    type: EmailLogger.Type,
    Handle: Handle, // Make sure Handle is imported or defined
    Position: Position, // Make sure Position is imported or defined
    internals: internals
  });
  
  return (
    <>
      {renderComponentUI({
        id: id,
        data: data,
        context: context,
        manager: manager,
        commands: commands,
        name: EmailLogger.Name,
        ConfigForm: EmailLogger.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
        Icon: EmailLogger.Icon,
        showContent: showContent,
        handle: handleElement,
        deleteNode: deleteNode,
        setViewport: setViewport
      })}
    </>
  );
  }

  public provideImports({config}): string[] {
    return ["import smtplib", "from email.mime.text import MIMEText", "from email.mime.multipart import MIMEMultipart"];
  }

  public provideFunctions({config}): string[] {
    let functions = [];
    const code = `
def send_email(error_message):
    sender_email = "${config.senderEmail}"
    receiver_email = "${config.receiverEmail}"
    password =

    message = MIMEMultipart("alternative")
    message["Subject"] = "Script Failure Notification"
    message["From"] = sender_email
    message["To"] = receiver_email

    text =  "${config.emailContent}"
    part1 = MIMEText(text, "plain")
    message.attach(part1)

    server = smtplib.SMTP('${config.smtpServer}', ${config.smtpPort})
    server.starttls()
    server.login(sender_email, password)
    server.sendmail(sender_email, receiver_email, message.as_string())
    server.quit()
    `;
    functions.push(code)
    return functions;
  }

  public generateComponentCode({config}): string {
    const code = `
# Send email
send_email(str(e))
`;
    return code;
  }

}