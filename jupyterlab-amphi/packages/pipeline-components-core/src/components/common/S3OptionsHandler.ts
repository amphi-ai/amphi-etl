// S3OptionsHandler.ts

export class S3OptionsHandler {
    // Static method to handle S3-specific options
    public static handleS3SpecificOptions(config, storageOptions): object {
      if (config.fileLocation === 's3' && config.connectionMethod === 'storage_options') {
        const updatedStorageOptions = {
          ...storageOptions, // Preserve any manually added storageOptions
          key: config.awsAccessKey,
          secret: config.awsSecretKey
        };
    
        if (config.useCustomEndpoint && config.customEndpoint == true) {
          updatedStorageOptions.client_kwargs = {
            ...updatedStorageOptions.client_kwargs, // Preserve any existing client_kwargs
            endpoint_url: config.customEndpoint
          };
        }
    
        return updatedStorageOptions;
      }
    
      return storageOptions;
    }

    public static getAWSFields(): object[] {
        return [
          {
            type: "select",
            label: "Connection Method",
            id: "connectionMethod",
            options: [
              { value: "env", label: "Environment Variables (Recommended)", tooltip: "Use AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY variables, using an Env. Variable File is recommended." },
              { value: "storage_options", label: "Pass directly (storage_options)", tooltip: "You can pass credentials using the storage_options parameter. Using Environment Variables for this method is also recommended." }
            ],
            condition: { fileLocation: "s3" },
            connection: "AWS",
            ignoreConnection: true,
            advanced: true
          },
          {
            type: "input",
            label: "Access Key",
            id: "awsAccessKey",
            placeholder: "Enter Access Key",
            inputType: "password",
            connection: "AWS",
            connectionVariableName: "AWS_ACCESS_KEY_ID",
            condition: { fileLocation: "s3", connectionMethod: "storage_options" },
            advanced: true
          },
          {
            type: "input",
            label: "Secret Key",
            id: "awsSecretKey",
            placeholder: "Enter Secret Key",
            inputType: "password",
            connection: "AWS",
            connectionVariableName: "AWS_SECRET_ACCESS_KEY",
            condition: { fileLocation: "s3", connectionMethod: "storage_options" },
            advanced: true
          },
          {
            type: "boolean",
            label: "Use Custom Endpoint",
            id: "useCustomEndpoint",
            placeholder: "Use custom endpoint to connecto Minio for example",
            connection: "AWS",
            condition: { fileLocation: "s3", connectionMethod: "storage_options" },
            advanced: true
          },
          {
            type: "input",
            label: "Custom Endpoint",
            id: "customEndpoint",
            tooltip: "Connect to a Different SE-Compatible File System (e.g., Minio) Using a Custom Endpoint",
            placeholder: "http://localhost:9000",
            connection: "AWS",
            condition: { fileLocation: "s3", connectionMethod: "storage_options", useCustomEndpoint: true },
            advanced: true
          },
        ];
      }
  }