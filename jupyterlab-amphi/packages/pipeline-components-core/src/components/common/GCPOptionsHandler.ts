// GCSOptionsHandler.ts

export class GCSOptionsHandler {
    // Static method to handle GCS-specific options
    public static handleGCSOptions(config, storageOptions): object {
        if (config.fileLocation === 'gcs' && config.connectionMethod === 'storage_options') {
            return {
                ...storageOptions, // Preserve any manually added storageOptions
                service_account_file: config.gcsServiceAccountFilePath
            };
        }
        return storageOptions;
    }

    public static getGCSFields(): object[] {
        return [
            {
                type: "select",
                label: "Connection Method",
                id: "connectionMethod",
                options: [
                    { value: "env", label: "Default", tooltip: "This uses the default credentials set in the environment (like Application Default Credentials or gcloud config). If no credentials are found, " },
                    { value: "storage_options", label: "Service Account (storage_options)", tooltip: "Provide a service account directly via the storage_options parameter." }
                ],
                condition: { fileLocation: "gcs" },
                connection: "GCS",
                ignoreConnection: true,
                advanced: true
            },
            {
                type: "file",
                label: "Service Account Key",
                id: "gcsServiceAccountFilePath",
                placeholder: "Type file name",
                validation: "\\.(json)$",
                validationMessage: "This field expects a file with a .json extension such as your-service-account-file.json.",
                connection: "GCS",
                condition: { fileLocation: "gcs", connectionMethod: "storage_options" },
                advanced: true
            },
        ];
    }
}
