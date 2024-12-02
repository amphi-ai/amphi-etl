// SFTPOptionsHandler.ts

export class SFTPOptionsHandler {
    public static handleSFTPSpecificOptions(config, connectionOptions): object {
      if (config.fileLocation === 'sftp') {
        const updatedConnectionOptions = {
          ...connectionOptions,
          hostname: config.sftpHostname,
          port: config.sftpPort || 22,
          username: config.sftpUsername,
        };
  
        if (config.sftpAuthMethod === 'password') {
          updatedConnectionOptions.password = config.sftpPassword;
        } else if (config.sftpAuthMethod === 'key') {
          updatedConnectionOptions.key_filename = config.sftpKeyFile;
        }
  
        return updatedConnectionOptions;
      }
  
      return connectionOptions;
    }
  
    public static getSFTPFields(): object[] {
      return [
        {
          type: 'input',
          label: 'Hostname',
          id: 'sftpHostname',
          placeholder: 'Enter SFTP server hostname',
          condition: { fileLocation: 'sftp' },
          required: true,
        },
        {
          type: 'inputNumber',
          label: 'Port',
          id: 'sftpPort',
          placeholder: 'Default: 22',
          condition: { fileLocation: 'sftp' },
          advanced: true,
        },
        {
          type: 'input',
          label: 'Username',
          id: 'sftpUsername',
          placeholder: 'Enter SFTP username',
          condition: { fileLocation: 'sftp' },
          required: true,
        },
        {
          type: 'select',
          label: 'Authentication Method',
          id: 'sftpAuthMethod',
          options: [
            { value: 'password', label: 'Password' },
            { value: 'key', label: 'Private Key File' },
          ],
          condition: { fileLocation: 'sftp' },
          required: true,
        },
        {
          type: 'input',
          label: 'Password',
          id: 'sftpPassword',
          placeholder: 'Enter password',
          inputType: 'password',
          condition: { fileLocation: 'sftp', sftpAuthMethod: 'password' },
          required: true,
        },
        {
          type: 'file',
          label: 'Private Key File',
          id: 'sftpKeyFile',
          placeholder: 'Select private key file',
          condition: { fileLocation: 'sftp', sftpAuthMethod: 'key' },
          required: true,
        },
      ];
    }
  }
  