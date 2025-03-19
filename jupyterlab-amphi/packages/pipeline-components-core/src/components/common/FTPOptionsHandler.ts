// FTPOptionsHandler.ts

export class FTPOptionsHandler {
    // Static method to handle FTP-specific options
    public static handleFTPSpecificOptions(config, storageOptions): object {
        if (config.fileLocation === 'ftp') {
            const updatedStorageOptions = {
                ...storageOptions, // Preserve any manually added storageOptions
                username: config.ftpUsername,
                password: config.ftpPassword            
            };

            return updatedStorageOptions;
        }

        return storageOptions;
    }

    public static getFTPFields(): object[] {
        return [
            {
                type: "input",
                label: "Username",
                id: "ftpUsername",
                placeholder: "Enter FTP username",
                condition: { fileLocation: "ftp" },
                connection: "FTP",
                advanced: true
            },
            {
                type: "input",
                label: "Password",
                id: "ftpPassword",
                placeholder: "Enter FTP password",
                inputType: "password",
                condition: { fileLocation: "ftp" },
                connection: "FTP",
                advanced: true
            }
        ];
    }
}