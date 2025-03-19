export class FileUtils {
  // Static method to generate file paths using glob for local files
  static getLocalFilePaths(filePath: string, outputName: string): string {
    return `
${outputName}_file_paths = glob.glob("${filePath}")
if not ${outputName}_file_paths:
    raise FileNotFoundError("No files found matching the pattern.")
`;
  }

  // Static method to generate file paths using s3fs for S3 files
  static getS3FilePaths(filePath: string, storageOptionsString: string, outputName: string): string {
    return `
${outputName}_fs = s3fs.S3FileSystem(**${storageOptionsString})
${outputName}_file_paths = ${outputName}_fs.glob("${filePath}")
if not ${outputName}_file_paths:
    raise FileNotFoundError("No files found matching the pattern.")
`;
  }

  // Static method to generate file paths using ftputil for FTP files
  static getFTPFilePaths(filePath: string, storageOptionsString: string, outputName: string): string {
    return `
${outputName}_fs = ftputil.FTPHost(**${storageOptionsString})
${outputName}_file_paths = ${outputName}_fs.glob("${filePath}")
if not ${outputName}_file_paths:
    raise FileNotFoundError("No files found matching the pattern.")
`;
  }

  // Static method to generate the concatenation code
  static generateConcatCode(outputName: string, readMethod: string, optionsString: string, isS3: boolean): string {
    const readFunction = isS3
      ? `pd.${readMethod}(${outputName}_fs.open(file, 'rb')${optionsString})`
      : `pd.${readMethod}(file${optionsString})`;

    return `
${outputName} = pd.concat([${readFunction} for file in ${outputName}_file_paths], ignore_index=True).convert_dtypes()
`;
  }

  static isWildcardInput(filePath: string): boolean {
    return filePath.includes('*');
  }

  
}
