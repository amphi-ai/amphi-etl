import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { openAiIcon } from '../icons';

export class OpenAILookUp extends PipelineComponent<ComponentItem>() {

  public _name = "OpenAI Prompt";
  public _id = "openAiLookup";
  public _type = "pandas_df_processor";
  public _category = "AI";
  public _icon = openAiIcon;
  public _default = { maxToken: 256, temperature: 0.3, model: "gpt-3.5-turbo",
  systemPrompt: "You are part of a Python data pipeline using Pandas. Your task is to generate responses for each row of a DataFrame. Just provide the response as short as possible, don't write any sentence." };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "textarea",
        label: "Prompt",
        id: "prompt"
      },
      {
        type: "columns",
        label: "Columns",
        tooltip: "Columns data to send with Prompt",
        id: "columns"
      },
      {
        type: "textarea",
        label: "System Prompt",
        id: "systemPrompt",
        advanced: true
      },
      {
        type: "input",
        label: "API Token",
        id: "token",
        advanced: true
      },
      {
        type: "selectCustomizable",
        label: "Model",
        id: "model",
        options: [
          { value: "gpt-3.5-turbo", label: "gpt-3.5-turbo" },
          { value: "gpt-3.5-turbo-16k", label: "gpt-3.5-turbo-16k" },
          { value: "gpt-4-turbo", label: "gpt-4-turbo" },
          { value: "gpt-4o", label: "gpt-4o" }
        ],
        advanced: true
      },
      {
        type: "boolean",
        label: "JSON Mode",
        id: "jsonMode",
        advanced: true
      },
      {
        type: "inputNumber",
        label: "Max Token",
        id: "maxToken",
        min: 1,
        advanced: true
      },
      {
        type: "inputNumber",
        label: "Temperature",
        id: "temperature",
        min: 0,
        max: 1,
        advanced: true
      }
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
      type: OpenAILookUp.Type,
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
          name: OpenAILookUp.Name,
          ConfigForm: OpenAILookUp.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: OpenAILookUp.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport
        })}
      </>
    );
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "from openai import OpenAI"];
  }

  public provideFunctions({config}): string[] {
    let functions = [];
    const code = `
def generate_gpt_response(
  row,  # The data row containing the values
  column_data,  # The list of column names to include in the prompt
  client,  # OpenAI client for generating responses
  user_prompt,  # The initial user prompt text
  system_prompt,  # The system-level instruction
  model,  # The OpenAI model to use
  max_tokens,  # Maximum number of tokens for the response
  temperature  # Controls the variability of the response
):
  # Create a dynamic prompt by including the user prompt and the corresponding data from the specified columns
  column_values = ', '.join([f"{col}: {row[col]}" for col in column_data])  # Construct column-value pairs
  dynamic_prompt = f"{user_prompt}: {column_values}"  # Combine user prompt with column values
  
  # Set up the messages for the OpenAI API request
  messages = [
      {"role": "system", "content": system_prompt},  # System-level context
      {"role": "user", "content": dynamic_prompt},  # User prompt with dynamic content
  ]
  
  # Call OpenAI's ChatCompletion endpoint to generate the response
  response = client.chat.completions.create(
      model=model,  # GPT model used for response generation
      messages=messages,  # Include system and user prompts
      max_tokens=max_tokens,  # Maximum response length
      temperature=temperature  # Variability in response generation
  )
  
  # Return the generated response's content
  return response.choices[0].message.content
`;
    functions.push(code)
    return functions;
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    // Extract the column names from the config object
    const columnNames = config.columns.map((col) => col.value);
  
    // Generate Python code to configure OpenAI API and process data
    const code = `
# Set the OpenAI API key for authentication
${outputName}_client = OpenAI(
  # This is the default and can be omitted
  api_key="${config.token}"
)

# OpenAI request parameters
${outputName}_user_prompt = "${config.prompt}"
${outputName}_system_prompt = "${config.systemPrompt}"
${outputName}_model = "${config.model}"  # Model to use for generating responses
${outputName}_max_tokens = ${config.maxToken}  # Maximum number of tokens for the generated response
${outputName}_temperature = ${config.temperature}  # Response variability based on the specified temperature

# Apply the function to generate output for each row
${inputName}['gpt_${outputName}'] = ${inputName}.apply(lambda row: generate_gpt_response(
  row, 
  ["${columnNames.join('", "')}"], 
  ${outputName}_client,
  ${outputName}_user_prompt,
  ${outputName}_system_prompt, 
  ${outputName}_model, 
  ${outputName}_max_tokens, 
  ${outputName}_temperature
), axis=1)
${outputName} = ${inputName}  # Set the modified DataFrame to the output variable
`;
    return code;
  }
  
}
