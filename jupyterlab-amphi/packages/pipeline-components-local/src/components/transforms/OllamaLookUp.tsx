import { ollamaIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class OllamaLookUp extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      maxToken: 256,
      temperature: 0.3,
      model: "llama3.2:3b",
      ollamaEndpoint: "http://localhost:11434",
      systemPrompt: "You are part of a Python data pipeline using Pandas. Your task is to generate responses for each row of a DataFrame. Just provide the response as short as possible, don't write any sentence."
    };
    const form = {
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
          type: "input",
          label: "Ollama Endpoint",
          id: "ollamaEndpoint",
          placeholder: "http://localhost:11434",
          connection: "Ollama",
          advanced: true
        },
        {
          type: "selectCustomizable",
          label: "Model",
          id: "model",
          tooltip: "Select an Ollama model. You must have access to it or pulled it locally. Check out: https://ollama.com/library",
          options: [
            { value: "llama3.2:1b", label: "llama3.2:1b" },
            { value: "llama3.2:3b", label: "llama3.2:3b" },
            { value: "gemma2:2b", label: "gemma2:2b" },
            { value: "gemma2:9b", label: "gemma2:9b" },
            { value: "qwen2.5:0.5b", label: "qwen2.5:0.5b" },
            { value: "qwen2.5:3b", label: "qwen2.5:3b" },
            { value: "mistral-small:22b", label: "mistral-small:22b" },
            { value: "mistral-nemo:12b", label: "mistral-nemo:12b" },
            { value: "phi3.5:3.8b", label: "phi3.5:3.8b" }
          ],
          advanced: true
        },
        {
          type: "input",
          label: "New column name",
          id: "newColumnName",
          placeholder: "Type new column name",
          advanced: true
        }
      ],
    };
    const description = "Use Ollama Lookup to prompt Ollama based on column values and create a new column with the response.";

    super("Ollama Prompt", "ollamaLookup", description, "pandas_df_processor", [], "transforms.AI Prompt", ollamaIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('ollama');
    return deps;
  }

  public provideImports(): string[] {
    return ["import pandas as pd", "from ollama import Client"];
  }

  public provideFunctions(): string[] {
    let functions = [];
    const code = `
def generate_ollama_response(
  row,  # The data row containing the values
  column_data,  # The list of column names to include in the prompt
  client, # Ollama client
  user_prompt,  # The initial user prompt text
  model  # The Ollama model to use
):
  # Create a dynamic prompt by including the user prompt and the corresponding data from the specified columns
  column_values = ', '.join([f"{col}: {row[col]}" for col in column_data])  # Construct column-value pairs
  dynamic_prompt = f"{user_prompt}: {column_values}"  # Combine user prompt with column values

  # Call Ollama's API to generate the response
  response = client.generate(
      model=model,  # Llama model used for response generation
      prompt=dynamic_prompt,  # Include system and user prompts
  )

  # Return the generated response's content
  return response['response']
`;
    functions.push(code);
    return functions;
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    // Extract the column names from the config object
    const columnNames = config.columns.map((col) => col.value);

    // Determine the column name to use
    const newColumnName = config.newColumnName && config.newColumnName.trim() ? config.newColumnName : `llama_${outputName}`;

    // Generate Python code to configure Ollama API and process data
    const code = `
# Ollama request parameters
${outputName}_client = Client(host='${config.ollamaEndpoint}')
${outputName}_user_prompt = "${config.prompt}"
${outputName}_model = "${config.model}"  # Model to use for generating responses

# Apply the function to generate output for each row
${inputName}['${newColumnName}'] = ${inputName}.apply(lambda row: generate_ollama_response(
  row, 
  ["${columnNames.join('", "')}"],
  ${outputName}_client,
  ${outputName}_user_prompt,
  ${outputName}_model
), axis=1)
${outputName} = ${inputName}  # Set the modified DataFrame to the output variable
`;
    return code;
  }
}
